import { Router } from 'express';
import { CDP } from '../services/martech/CDP';
import { SegmentationEngine } from '../services/martech/SegmentationEngine';
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

export default router;
