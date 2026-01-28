import { Router } from 'express';
import { CDP } from '../services/martech/CDP';
import { SegmentationEngine } from '../services/martech/SegmentationEngine';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import {
  authenticate,
  authorize,
  AuthenticatedRequest,
} from '../middleware/auth';
import {
  validate,
  identifyCustomerSchema,
  trackEventSchema,
  createAudienceSchema,
  mergeCustomersSchema,
  audienceMembersQuerySchema,
  uuidParamSchema,
} from '../middleware/validation';
import { exportRateLimiter, deleteRateLimiter } from '../middleware/rateLimiter';
import { AppError } from '../middleware/errorHandler';

const router = Router();
const cdp = CDP.getInstance();
const segmentation = SegmentationEngine.getInstance();

// ===== CDP ROUTES =====

/**
 * Identify customer
 * POST /api/v1/martech/identify
 * Creates or updates a customer profile
 */
router.post(
  '/identify',
  authenticate,
  validate(identifyCustomerSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const customer = await cdp.identify(req.body);

      logger.info('Customer identified', {
        customerId: customer.id,
        userId: req.user?.userId,
      });

      res.json(customer);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Track event
 * POST /api/v1/martech/track
 * Records a customer event
 */
router.post(
  '/track',
  authenticate,
  validate(trackEventSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const event = await cdp.track(req.body);

      logger.debug('Event tracked', {
        eventId: event.id,
        customerId: req.body.customerId,
        eventType: req.body.eventType,
      });

      res.json(event);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get customer profile
 * GET /api/v1/martech/customers/:id/profile
 */
router.get(
  '/customers/:id/profile',
  authenticate,
  validate(uuidParamSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const profile = await cdp.getProfile(req.params.id);

      if (!profile) {
        throw new AppError('Customer not found', 404);
      }

      res.json(profile);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Merge customers
 * POST /api/v1/martech/customers/merge
 * Merges two customer profiles
 */
router.post(
  '/customers/merge',
  authenticate,
  authorize('ADMIN'),
  validate(mergeCustomersSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { primaryId, secondaryId } = req.body;

      const result = await cdp.mergeCustomers(primaryId, secondaryId);

      logger.info('Customers merged', {
        primaryId,
        secondaryId,
        userId: req.user?.userId,
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Export customer data (GDPR)
 * GET /api/v1/martech/customers/:id/export
 * Rate limited to prevent abuse
 */
router.get(
  '/customers/:id/export',
  authenticate,
  exportRateLimiter,
  validate(uuidParamSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const data = await cdp.exportCustomerData(req.params.id);

      logger.info('Customer data exported (GDPR)', {
        customerId: req.params.id,
        userId: req.user?.userId,
      });

      res.json(data);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Delete customer data (GDPR)
 * DELETE /api/v1/martech/customers/:id
 * Requires admin authorization
 */
router.delete(
  '/customers/:id',
  authenticate,
  authorize('ADMIN'),
  deleteRateLimiter,
  validate(uuidParamSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const result = await cdp.deleteCustomerData(req.params.id);

      logger.info('Customer data deleted (GDPR)', {
        customerId: req.params.id,
        userId: req.user?.userId,
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// ===== SEGMENTATION ROUTES =====

/**
 * Create audience
 * POST /api/v1/martech/audiences
 */
router.post(
  '/audiences',
  authenticate,
  validate(createAudienceSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const audience = await segmentation.createAudience({
        ...req.body,
        userId: req.user?.userId, // Override with authenticated user
      });

      logger.info('Audience created', {
        audienceId: audience.id,
        userId: req.user?.userId,
      });

      res.status(201).json(audience);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get audience by ID
 * GET /api/v1/martech/audiences/:id
 */
router.get(
  '/audiences/:id',
  authenticate,
  validate(uuidParamSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const audience = await segmentation.getAudienceById(req.params.id);

      if (!audience) {
        throw new AppError('Audience not found', 404);
      }

      // Check ownership unless admin
      if (req.user?.role !== 'ADMIN' && audience.userId !== req.user?.userId) {
        throw new AppError('Access denied', 403);
      }

      res.json(audience);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Build/rebuild segment
 * POST /api/v1/martech/audiences/:id/build
 */
router.post(
  '/audiences/:id/build',
  authenticate,
  validate(uuidParamSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const size = await segmentation.buildSegment(req.params.id);

      logger.info('Audience segment built', {
        audienceId: req.params.id,
        size,
        userId: req.user?.userId,
      });

      res.json({ audienceId: req.params.id, size });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get audience members
 * GET /api/v1/martech/audiences/:id/members
 */
router.get(
  '/audiences/:id/members',
  authenticate,
  validate(audienceMembersQuerySchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { limit, offset } = req.query;

      const members = await segmentation.getAudienceMembers(
        req.params.id,
        limit as number,
        offset as number
      );

      res.json(members);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Check if customer is in audience
 * GET /api/v1/martech/audiences/:audienceId/members/:customerId
 */
router.get(
  '/audiences/:audienceId/members/:customerId',
  authenticate,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const isInAudience = await segmentation.isInAudience(
        req.params.customerId,
        req.params.audienceId
      );

      res.json({ isInAudience });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get customer's audiences
 * GET /api/v1/martech/customers/:id/audiences
 */
router.get(
  '/customers/:id/audiences',
  authenticate,
  validate(uuidParamSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const audiences = await segmentation.getCustomerAudiences(req.params.id);
      res.json(audiences);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Refresh all audiences
 * POST /api/v1/martech/audiences/refresh-all
 * Requires admin authorization - heavy operation
 */
router.post(
  '/audiences/refresh-all',
  authenticate,
  authorize('ADMIN'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      await segmentation.refreshAllAudiences();

      logger.info('All audiences refreshed', {
        userId: req.user?.userId,
      });

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Delete audience
 * DELETE /api/v1/martech/audiences/:id
 */
router.delete(
  '/audiences/:id',
  authenticate,
  deleteRateLimiter,
  validate(uuidParamSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      // Check if audience exists and user has permission
      const audience = await segmentation.getAudienceById(req.params.id);

      if (!audience) {
        throw new AppError('Audience not found', 404);
      }

      if (req.user?.role !== 'ADMIN' && audience.userId !== req.user?.userId) {
        throw new AppError('Access denied', 403);
      }

      await segmentation.deleteAudience(req.params.id);

      logger.info('Audience deleted', {
        audienceId: req.params.id,
        userId: req.user?.userId,
      });

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Create lookalike audience
 * POST /api/v1/martech/audiences/:id/lookalike
 * Creates a new audience based on similar characteristics to the source audience
 */
router.post(
  '/audiences/:id/lookalike',
  authenticate,
  validate(uuidParamSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { name, similarityThreshold = 0.8, targetSize } = req.body;

      if (!name) {
        throw new AppError('Lookalike audience name is required', 400);
      }

      if (similarityThreshold < 0 || similarityThreshold > 1) {
        throw new AppError('Similarity threshold must be between 0 and 1', 400);
      }

      // Get source audience
      const sourceAudience = await segmentation.getAudienceById(req.params.id);

      if (!sourceAudience) {
        throw new AppError('Source audience not found', 404);
      }

      // Check ownership unless admin
      if (req.user?.role !== 'ADMIN' && sourceAudience.userId !== req.user?.userId) {
        throw new AppError('Access denied', 403);
      }

      // Get source audience members to analyze characteristics
      const sourceMembers = await segmentation.getAudienceMembers(req.params.id, 1000, 0);

      if (sourceMembers.length === 0) {
        throw new AppError('Source audience has no members to analyze', 400);
      }

      // Analyze common characteristics from source audience
      const characteristics = await analyzeAudienceCharacteristics(sourceMembers);

      // Create lookalike rules based on characteristics
      const lookalikeRules = {
        type: 'LOOKALIKE',
        sourceAudienceId: req.params.id,
        similarityThreshold,
        characteristics,
        targetSize: targetSize || sourceMembers.length * 10, // Default 10x expansion
      };

      // Create the lookalike audience
      const lookalikeAudience = await segmentation.createAudience({
        name,
        description: `Lookalike audience based on "${sourceAudience.name}" with ${similarityThreshold * 100}% similarity`,
        userId: req.user?.userId!,
        rules: lookalikeRules,
      });

      // Build the segment to populate it
      const size = await segmentation.buildSegment(lookalikeAudience.id);

      logger.info('Lookalike audience created', {
        sourceAudienceId: req.params.id,
        lookalikeAudienceId: lookalikeAudience.id,
        size,
        similarityThreshold,
        userId: req.user?.userId,
      });

      res.status(201).json({
        ...lookalikeAudience,
        size,
        sourceAudience: {
          id: sourceAudience.id,
          name: sourceAudience.name,
          size: sourceMembers.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get customer journey
 * GET /api/v1/martech/customers/:id/journey
 * Returns the chronological journey of customer events and touchpoints
 */
router.get(
  '/customers/:id/journey',
  authenticate,
  validate(uuidParamSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { startDate, endDate, eventTypes } = req.query;

      // Get customer profile
      const customer = await cdp.getProfile(req.params.id);

      if (!customer) {
        throw new AppError('Customer not found', 404);
      }

      // Build date filter
      const dateFilter: any = {};
      if (startDate) {
        dateFilter.gte = new Date(startDate as string);
      }
      if (endDate) {
        dateFilter.lte = new Date(endDate as string);
      }

      // Build event type filter
      const eventTypeFilter = eventTypes
        ? { in: (eventTypes as string).split(',') }
        : undefined;

      // Get all events for this customer
      const events = await prisma.customerEvent.findMany({
        where: {
          customerId: req.params.id,
          ...(Object.keys(dateFilter).length > 0 ? { timestamp: dateFilter } : {}),
          ...(eventTypeFilter ? { eventType: eventTypeFilter } : {}),
        },
        orderBy: { timestamp: 'asc' },
        select: {
          id: true,
          eventType: true,
          eventName: true,
          properties: true,
          timestamp: true,
          sessionId: true,
          deviceType: true,
          browser: true,
        },
      });

      // Get campaign interactions (impressions, clicks, conversions)
      const impressions = await prisma.impression.findMany({
        where: {
          request: {
            userId: req.params.id,
          },
          ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}),
        },
        include: {
          bid: {
            include: {
              campaign: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      // Combine and sort all touchpoints chronologically
      const journey = [
        ...events.map((e) => ({
          type: 'event',
          timestamp: e.timestamp,
          eventType: e.eventType,
          eventName: e.eventName,
          properties: e.properties,
          sessionId: e.sessionId,
          deviceType: e.deviceType,
          browser: e.browser,
        })),
        ...impressions.map((i) => ({
          type: 'impression',
          timestamp: i.servedAt || i.createdAt,
          campaign: i.bid.campaign,
          served: i.served,
          viewed: i.viewed,
          clicked: i.clicked,
          converted: i.converted,
          clickedAt: i.clickedAt,
          convertedAt: i.convertedAt,
          revenue: i.revenue,
        })),
      ].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      // Calculate journey metrics
      const metrics = {
        totalTouchpoints: journey.length,
        events: events.length,
        impressions: impressions.length,
        clicks: impressions.filter((i) => i.clicked).length,
        conversions: impressions.filter((i) => i.converted).length,
        uniqueSessions: new Set(events.map((e) => e.sessionId).filter(Boolean)).size,
        devices: new Set(events.map((e) => e.deviceType).filter(Boolean)),
        dateRange: {
          start: journey[0]?.timestamp,
          end: journey[journey.length - 1]?.timestamp,
        },
      };

      logger.info('Customer journey retrieved', {
        customerId: req.params.id,
        touchpoints: journey.length,
        userId: req.user?.userId,
      });

      res.json({
        customer: {
          id: customer.id,
          email: customer.email,
          firstName: customer.firstName,
          lastName: customer.lastName,
        },
        journey,
        metrics,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Helper function to analyze audience characteristics
 * Used by lookalike audience creation
 */
async function analyzeAudienceCharacteristics(members: any[]): Promise<any> {
  const characteristics: any = {
    commonAttributes: {},
    frequentTags: {},
    behaviorPatterns: {},
  };

  // Aggregate common attributes
  const attributeFrequency: Record<string, Record<string, number>> = {};

  for (const member of members) {
    const attributes = member.attributes || {};

    for (const [key, value] of Object.entries(attributes)) {
      if (!attributeFrequency[key]) {
        attributeFrequency[key] = {};
      }

      const valueStr = String(value);
      attributeFrequency[key][valueStr] = (attributeFrequency[key][valueStr] || 0) + 1;
    }
  }

  // Find most common attribute values (>50% occurrence)
  for (const [attr, values] of Object.entries(attributeFrequency)) {
    const sortedValues = Object.entries(values)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5); // Top 5 values

    const threshold = members.length * 0.3; // At least 30% occurrence
    const commonValues = sortedValues
      .filter(([, count]) => count >= threshold)
      .map(([value, count]) => ({
        value,
        frequency: count / members.length,
      }));

    if (commonValues.length > 0) {
      characteristics.commonAttributes[attr] = commonValues;
    }
  }

  return characteristics;
}

export default router;
