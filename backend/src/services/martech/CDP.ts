import { prisma } from '../../config/database';
import { logger } from '../../utils/logger';
import { v4 as uuidv4 } from 'uuid';

/**
 * Customer Data Platform (CDP)
 * Unifies customer data from multiple sources
 */
export class CDP {
  private static instance: CDP;

  private constructor() {}

  static getInstance(): CDP {
    if (!CDP.instance) {
      CDP.instance = new CDP();
    }
    return CDP.instance;
  }

  /**
   * Identify or create customer
   */
  async identify(data: {
    email?: string;
    phone?: string;
    externalId?: string;
    firstName?: string;
    lastName?: string;
    attributes?: Record<string, any>;
  }) {
    try {
      // Find existing customer by email, phone, or externalId
      let customer = await prisma.customer.findFirst({
        where: {
          OR: [
            data.email ? { email: data.email } : {},
            data.phone ? { phone: data.phone } : {},
            data.externalId ? { externalId: data.externalId } : {}
          ].filter(obj => Object.keys(obj).length > 0)
        }
      });

      if (customer) {
        // Update existing customer
        customer = await prisma.customer.update({
          where: { id: customer.id },
          data: {
            ...data,
            attributes: {
              ...(customer.attributes as object || {}),
              ...(data.attributes || {})
            },
            lastSeen: new Date()
          }
        });

        logger.debug('Customer updated', { customerId: customer.id });
      } else {
        // Create new customer
        customer = await prisma.customer.create({
          data: {
            ...data,
            firstSeen: new Date(),
            lastSeen: new Date()
          }
        });

        logger.info('New customer created', { customerId: customer.id });
      }

      return customer;
    } catch (error) {
      logger.error('Failed to identify customer', { error });
      throw error;
    }
  }

  /**
   * Track customer event
   */
  async track(params: {
    customerId?: string;
    email?: string;
    eventType: string;
    eventName: string;
    properties?: Record<string, any>;
    sessionId?: string;
    deviceType?: string;
    browser?: string;
    ipAddress?: string;
  }) {
    try {
      let customerId = params.customerId;

      // If no customerId, try to identify by email
      if (!customerId && params.email) {
        const customer = await this.identify({ email: params.email });
        customerId = customer.id;
      }

      if (!customerId) {
        throw new Error('Customer ID or email required');
      }

      const event = await prisma.customerEvent.create({
        data: {
          customerId,
          eventType: params.eventType,
          eventName: params.eventName,
          properties: params.properties || {},
          sessionId: params.sessionId,
          deviceType: params.deviceType,
          browser: params.browser,
          ipAddress: params.ipAddress
        }
      });

      // Update customer last seen
      await prisma.customer.update({
        where: { id: customerId },
        data: { lastSeen: new Date() }
      });

      logger.debug('Event tracked', {
        customerId,
        eventType: params.eventType,
        eventName: params.eventName
      });

      return event;
    } catch (error) {
      logger.error('Failed to track event', { error });
      throw error;
    }
  }

  /**
   * Get customer profile with enriched data
   */
  async getProfile(customerId: string) {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        events: {
          orderBy: { timestamp: 'desc' },
          take: 50
        },
        segments: {
          include: {
            audience: true
          }
        },
        journeys: {
          include: {
            journey: true
          }
        }
      }
    });

    if (!customer) {
      throw new Error('Customer not found');
    }

    // Calculate customer metrics
    const metrics = await this.calculateCustomerMetrics(customerId);

    return {
      ...customer,
      metrics
    };
  }

  /**
   * Calculate customer lifetime metrics
   */
  private async calculateCustomerMetrics(customerId: string) {
    const events = await prisma.customerEvent.findMany({
      where: { customerId }
    });

    const purchases = events.filter(e => e.eventType === 'purchase');
    const totalRevenue = purchases.reduce((sum, e) => {
      const props = e.properties as any;
      return sum + (props?.value || 0);
    }, 0);

    const avgSessionDuration = this.calculateAvgSessionDuration(events);
    const engagementScore = this.calculateEngagementScore(events);

    return {
      totalEvents: events.length,
      totalPurchases: purchases.length,
      totalRevenue,
      avgOrderValue: purchases.length > 0 ? totalRevenue / purchases.length : 0,
      avgSessionDuration,
      engagementScore
    };
  }

  /**
   * Calculate average session duration
   */
  private calculateAvgSessionDuration(events: any[]): number {
    const sessions = new Map<string, Date[]>();

    events.forEach(event => {
      if (event.sessionId) {
        if (!sessions.has(event.sessionId)) {
          sessions.set(event.sessionId, []);
        }
        sessions.get(event.sessionId)!.push(event.timestamp);
      }
    });

    let totalDuration = 0;
    let sessionCount = 0;

    sessions.forEach(timestamps => {
      if (timestamps.length > 1) {
        timestamps.sort((a, b) => a.getTime() - b.getTime());
        const duration = timestamps[timestamps.length - 1].getTime() - timestamps[0].getTime();
        totalDuration += duration;
        sessionCount++;
      }
    });

    return sessionCount > 0 ? totalDuration / sessionCount / 1000 : 0; // in seconds
  }

  /**
   * Calculate engagement score (0-100)
   */
  private calculateEngagementScore(events: any[]): number {
    const daysSinceFirstEvent = events.length > 0
      ? (Date.now() - events[events.length - 1].timestamp.getTime()) / (1000 * 60 * 60 * 24)
      : 0;

    if (daysSinceFirstEvent === 0) return 0;

    const eventsPerDay = events.length / daysSinceFirstEvent;
    const uniqueEventTypes = new Set(events.map(e => e.eventType)).size;

    // Simple scoring algorithm
    const frequencyScore = Math.min(eventsPerDay * 10, 50);
    const diversityScore = Math.min(uniqueEventTypes * 5, 30);
    const recencyScore = events.length > 0 && events[0].timestamp.getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000 ? 20 : 0;

    return Math.min(frequencyScore + diversityScore + recencyScore, 100);
  }

  /**
   * Merge duplicate customers
   */
  async mergeCustomers(primaryId: string, secondaryId: string) {
    try {
      const [primary, secondary] = await Promise.all([
        prisma.customer.findUnique({ where: { id: primaryId } }),
        prisma.customer.findUnique({ where: { id: secondaryId } })
      ]);

      if (!primary || !secondary) {
        throw new Error('Customer not found');
      }

      // Merge events
      await prisma.customerEvent.updateMany({
        where: { customerId: secondaryId },
        data: { customerId: primaryId }
      });

      // Merge segments
      await prisma.customerSegment.updateMany({
        where: { customerId: secondaryId },
        data: { customerId: primaryId }
      });

      // Merge attributes
      await prisma.customer.update({
        where: { id: primaryId },
        data: {
          attributes: {
            ...(primary.attributes as object || {}),
            ...(secondary.attributes as object || {})
          },
          firstSeen: primary.firstSeen < secondary.firstSeen ? primary.firstSeen : secondary.firstSeen
        }
      });

      // Delete secondary customer
      await prisma.customer.delete({
        where: { id: secondaryId }
      });

      logger.info('Customers merged', { primaryId, secondaryId });

      return await this.getProfile(primaryId);
    } catch (error) {
      logger.error('Failed to merge customers', { error });
      throw error;
    }
  }

  /**
   * Export customer data (GDPR compliance)
   */
  async exportCustomerData(customerId: string) {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        events: true,
        segments: {
          include: { audience: true }
        },
        journeys: {
          include: { journey: true }
        }
      }
    });

    if (!customer) {
      throw new Error('Customer not found');
    }

    return {
      exportDate: new Date(),
      customer: {
        id: customer.id,
        email: customer.email,
        phone: customer.phone,
        firstName: customer.firstName,
        lastName: customer.lastName,
        attributes: customer.attributes,
        createdAt: customer.createdAt
      },
      events: customer.events,
      segments: customer.segments,
      journeys: customer.journeys
    };
  }

  /**
   * Delete customer data (GDPR right to be forgotten)
   */
  async deleteCustomerData(customerId: string) {
    try {
      // Delete all related data
      await prisma.customerEvent.deleteMany({
        where: { customerId }
      });

      await prisma.customerSegment.deleteMany({
        where: { customerId }
      });

      await prisma.customerJourney.deleteMany({
        where: { customerId }
      });

      await prisma.customer.delete({
        where: { id: customerId }
      });

      logger.info('Customer data deleted', { customerId });

      return { success: true, customerId };
    } catch (error) {
      logger.error('Failed to delete customer data', { error });
      throw error;
    }
  }
}
