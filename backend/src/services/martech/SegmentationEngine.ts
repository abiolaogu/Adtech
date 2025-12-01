import { prisma } from '../../config/database';
import { logger } from '../../utils/logger';
import { AudienceStatus } from '@prisma/client';

/**
 * Segmentation Engine
 * Creates and manages customer audiences/segments
 */
export class SegmentationEngine {
  private static instance: SegmentationEngine;

  private constructor() {}

  static getInstance(): SegmentationEngine {
    if (!SegmentationEngine.instance) {
      SegmentationEngine.instance = new SegmentationEngine();
    }
    return SegmentationEngine.instance;
  }

  /**
   * Create audience segment with rules
   */
  async createAudience(data: {
    name: string;
    description?: string;
    userId: string;
    rules: SegmentRules;
  }) {
    try {
      const audience = await prisma.audience.create({
        data: {
          name: data.name,
          description: data.description,
          userId: data.userId,
          rules: data.rules as any,
          status: AudienceStatus.ACTIVE,
        },
      });

      logger.info('Audience created', { audienceId: audience.id });

      // Build the segment
      await this.buildSegment(audience.id);

      return audience;
    } catch (error) {
      logger.error('Failed to create audience', { error });
      throw error;
    }
  }

  /**
   * Build/rebuild segment by evaluating rules
   */
  async buildSegment(audienceId: string) {
    try {
      const audience = await prisma.audience.findUnique({
        where: { id: audienceId },
      });

      if (!audience) {
        throw new Error('Audience not found');
      }

      const rules = audience.rules as SegmentRules;

      // Clear existing segments
      await prisma.customerSegment.deleteMany({
        where: { audienceId },
      });

      // Find matching customers
      const customers = await this.findMatchingCustomers(rules);

      // Create segments
      if (customers.length > 0) {
        await prisma.customerSegment.createMany({
          data: customers.map((customerId) => ({
            audienceId,
            customerId,
          })),
        });
      }

      // Update audience size
      await prisma.audience.update({
        where: { id: audienceId },
        data: { size: customers.length },
      });

      logger.info('Segment built', {
        audienceId,
        size: customers.length,
      });

      return customers.length;
    } catch (error) {
      logger.error('Failed to build segment', { error });
      throw error;
    }
  }

  /**
   * Find customers matching segment rules
   */
  private async findMatchingCustomers(rules: SegmentRules): Promise<string[]> {
    const conditions: any[] = [];

    // Demographic filters
    if (rules.demographics) {
      if (rules.demographics.countries) {
        conditions.push({
          country: { in: rules.demographics.countries },
        });
      }
      if (rules.demographics.cities) {
        conditions.push({
          city: { in: rules.demographics.cities },
        });
      }
      if (rules.demographics.ageRange) {
        const today = new Date();
        const minDate = new Date(
          today.getFullYear() - rules.demographics.ageRange.max,
          today.getMonth(),
          today.getDate()
        );
        const maxDate = new Date(
          today.getFullYear() - rules.demographics.ageRange.min,
          today.getMonth(),
          today.getDate()
        );
        conditions.push({
          dateOfBirth: {
            gte: minDate,
            lte: maxDate,
          },
        });
      }
    }

    // Find base customers
    const customers = await prisma.customer.findMany({
      where: conditions.length > 0 ? { AND: conditions } : {},
      select: { id: true },
    });

    let customerIds = customers.map((c) => c.id);

    // Behavioral filters
    if (rules.behavioral && customerIds.length > 0) {
      customerIds = await this.filterByBehavior(customerIds, rules.behavioral);
    }

    // Custom attribute filters
    if (rules.attributes && customerIds.length > 0) {
      customerIds = await this.filterByAttributes(customerIds, rules.attributes);
    }

    return customerIds;
  }

  /**
   * Filter customers by behavioral rules
   */
  private async filterByBehavior(customerIds: string[], rules: BehavioralRules): Promise<string[]> {
    const matchingCustomers = new Set<string>(customerIds);

    if (rules.events) {
      for (const eventRule of rules.events) {
        const where: any = {
          customerId: { in: Array.from(matchingCustomers) },
          eventName: eventRule.eventName,
        };

        if (eventRule.timeframe) {
          const since = new Date();
          since.setDate(since.getDate() - eventRule.timeframe.days);
          where.timestamp = { gte: since };
        }

        const customers = await prisma.customerEvent.groupBy({
          by: ['customerId'],
          where,
          _count: { id: true },
          having: eventRule.count
            ? {
                id: {
                  [eventRule.count.operator]: eventRule.count.value,
                },
              }
            : undefined,
        });

        const eventCustomerIds = new Set(customers.map((c) => c.customerId));

        // Intersect with existing matching customers
        matchingCustomers.forEach((id) => {
          if (!eventCustomerIds.has(id)) {
            matchingCustomers.delete(id);
          }
        });
      }
    }

    return Array.from(matchingCustomers);
  }

  /**
   * Filter customers by custom attributes
   */
  private async filterByAttributes(
    customerIds: string[],
    attributes: Record<string, any>
  ): Promise<string[]> {
    const customers = await prisma.customer.findMany({
      where: { id: { in: customerIds } },
      select: { id: true, attributes: true },
    });

    return customers
      .filter((customer) => {
        const customerAttrs = (customer.attributes as Record<string, any>) || {};
        return Object.entries(attributes).every(([key, value]) => {
          return customerAttrs[key] === value;
        });
      })
      .map((c) => c.id);
  }

  /**
   * Get audience members
   */
  async getAudienceMembers(audienceId: string, limit = 100, offset = 0) {
    const segments = await prisma.customerSegment.findMany({
      where: { audienceId },
      include: {
        customer: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            country: true,
            city: true,
            attributes: true,
          },
        },
      },
      take: limit,
      skip: offset,
    });

    return segments.map((s) => s.customer);
  }

  /**
   * Check if customer belongs to audience
   */
  async isInAudience(customerId: string, audienceId: string): Promise<boolean> {
    const segment = await prisma.customerSegment.findUnique({
      where: {
        customerId_audienceId: {
          customerId,
          audienceId,
        },
      },
    });

    return !!segment;
  }

  /**
   * Get customer's audiences
   */
  async getCustomerAudiences(customerId: string) {
    return await prisma.customerSegment.findMany({
      where: { customerId },
      include: {
        audience: true,
      },
    });
  }

  /**
   * Refresh all audiences (scheduled job)
   */
  async refreshAllAudiences() {
    const audiences = await prisma.audience.findMany({
      where: { status: AudienceStatus.ACTIVE },
    });

    logger.info(`Refreshing ${audiences.length} audiences`);

    for (const audience of audiences) {
      try {
        await this.buildSegment(audience.id);
      } catch (error) {
        logger.error('Failed to refresh audience', {
          audienceId: audience.id,
          error,
        });
      }
    }
  }
}

// Types for segment rules
export interface SegmentRules {
  demographics?: {
    countries?: string[];
    cities?: string[];
    ageRange?: { min: number; max: number };
  };
  behavioral?: BehavioralRules;
  attributes?: Record<string, any>;
}

export interface BehavioralRules {
  events?: Array<{
    eventName: string;
    timeframe?: { days: number };
    count?: {
      operator: 'gt' | 'gte' | 'lt' | 'lte' | 'equals';
      value: number;
    };
  }>;
}
