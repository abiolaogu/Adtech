import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AdServer } from '../services/adserver/AdServer';
import { BrandSafetyFilter } from '../services/security/BrandSafetyFilter';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import {
  authenticate,
  optionalAuth,
  authorize,
  AuthenticatedRequest,
} from '../middleware/auth';
import {
  validate,
  serveAdQuerySchema,
  trackConversionSchema,
  createCampaignSchema,
  updateCampaignSchema,
  campaignIdParamsSchema,
  bulkCampaignSchema,
  createCreativeSchema,
  createPublisherSchema,
  createPlacementSchema,
  uuidParamSchema,
} from '../middleware/validation';
import { adServingRateLimiter, deleteRateLimiter } from '../middleware/rateLimiter';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// ===== AD SERVING (Public/Optional Auth) =====

/**
 * Serve an ad
 * GET /api/v1/adtech/serve/ad
 * Public endpoint with optional auth for user tracking
 */
router.get(
  '/serve/ad',
  adServingRateLimiter,
  optionalAuth,
  validate(serveAdQuerySchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { placementId, publisherId, deviceType, country, userId } = req.query;

      const adServer = AdServer.getInstance();
      const result = await adServer.serveAd({
        requestId: uuidv4(),
        timestamp: Date.now(),
        placementId: placementId as string,
        publisherId: publisherId as string,
        siteId: 'unknown',
        pageUrl: req.get('referer') || 'http://example.com',
        adUnitId: 'default',
        format: 'display',
        sizes: ['300x250'],
        ipAddress: req.ip || '127.0.0.1',
        userAgent: req.headers['user-agent'] || 'unknown',
        deviceType: deviceType as 'mobile' | 'desktop' | 'tablet' | 'ctv',
        geo: {
          country: (country as string) || 'US',
        },
        userId: (userId as string) || req.user?.userId,
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Track impression
 * GET /api/v1/adtech/track/impression/:requestId
 * Public endpoint - called by browser pixels
 */
router.get('/track/impression/:requestId', adServingRateLimiter, async (req, res, next) => {
  try {
    const adServer = AdServer.getInstance();
    await adServer.trackImpression(req.params.requestId);

    // Return 1x1 transparent pixel
    const pixel = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );

    res.writeHead(200, {
      'Content-Type': 'image/png',
      'Content-Length': pixel.length,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    });
    res.end(pixel);
  } catch (error) {
    // Log but don't expose errors for pixel tracking
    logger.error('Impression tracking error', { requestId: req.params.requestId, error });
    // Still return pixel to avoid breaking page
    const pixel = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
    res.writeHead(200, { 'Content-Type': 'image/png', 'Content-Length': pixel.length });
    res.end(pixel);
  }
});

/**
 * Track click
 * GET /api/v1/adtech/track/click/:requestId
 * Public endpoint - called by browser redirects
 */
router.get('/track/click/:requestId', adServingRateLimiter, async (req, res, next) => {
  try {
    const adServer = AdServer.getInstance();
    const clickUrl = await adServer.trackClick(req.params.requestId);

    if (clickUrl) {
      res.redirect(302, clickUrl);
    } else {
      res.status(404).json({ error: 'Click URL not found' });
    }
  } catch (error) {
    logger.error('Click tracking error', { requestId: req.params.requestId, error });
    res.status(404).json({ error: 'Click tracking failed' });
  }
});

/**
 * Track conversion
 * POST /api/v1/adtech/track/conversion/:requestId
 * Public endpoint - called by conversion pixels
 */
router.post(
  '/track/conversion/:requestId',
  adServingRateLimiter,
  validate(trackConversionSchema),
  async (req, res, next) => {
    try {
      const { value } = req.body;
      const adServer = AdServer.getInstance();
      await adServer.trackConversion(req.params.requestId, value);
      res.json({ success: true });
    } catch (error) {
      logger.error('Conversion tracking error', { requestId: req.params.requestId, error });
      res.json({ success: false });
    }
  }
);

/**
 * Track viewability
 * POST /api/v1/adtech/track/viewability/:requestId
 * Public endpoint - tracks when ad becomes viewable (50%+ visible for 1+ seconds)
 */
router.post(
  '/track/viewability/:requestId',
  adServingRateLimiter,
  async (req, res, next) => {
    try {
      const { viewableTime, viewablePercentage } = req.body;
      const requestId = req.params.requestId;

      // Validate viewability metrics
      const time = parseInt(viewableTime) || 0;
      const percentage = parseInt(viewablePercentage) || 0;

      // MRC standard: 50% of pixels visible for at least 1 second (display) or 2 seconds (video)
      const isViewable = percentage >= 50 && time >= 1000; // 1000ms = 1 second

      // Record viewability event in the database
      await prisma.adRequest.update({
        where: { requestId },
        data: {
          viewable: isViewable,
          viewabilityTime: time,
          viewabilityPercentage: percentage,
        },
      });

      logger.info('Viewability tracked', {
        requestId,
        viewableTime: time,
        viewablePercentage: percentage,
        isViewable,
      });

      res.json({ success: true, viewable: isViewable });
    } catch (error) {
      logger.error('Viewability tracking error', { requestId: req.params.requestId, error });
      res.json({ success: false, viewable: false });
    }
  }
);

// ===== CAMPAIGN MANAGEMENT (Authenticated) =====

/**
 * List campaigns
 * GET /api/v1/adtech/campaigns
 */
router.get('/campaigns', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    // Filter by user's campaigns unless admin
    const whereClause = req.user?.role === 'ADMIN' ? {} : { userId: req.user?.userId };

    const campaigns = await prisma.campaign.findMany({
      where: whereClause,
      include: {
        advertiser: true,
        creatives: {
          include: { creative: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(campaigns);
  } catch (error) {
    next(error);
  }
});

/**
 * Get campaign by ID
 * GET /api/v1/adtech/campaigns/:id
 */
router.get(
  '/campaigns/:id',
  authenticate,
  validate(campaignIdParamsSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const campaign = await prisma.campaign.findUnique({
        where: { id: req.params.id },
        include: {
          advertiser: true,
          creatives: {
            include: { creative: true },
          },
          audiences: {
            include: { audience: true },
          },
        },
      });

      if (!campaign) {
        throw new AppError('Campaign not found', 404);
      }

      // Check ownership unless admin
      if (req.user?.role !== 'ADMIN' && campaign.userId !== req.user?.userId) {
        throw new AppError('Access denied', 403);
      }

      res.json(campaign);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Create campaign
 * POST /api/v1/adtech/campaigns
 */
router.post(
  '/campaigns',
  authenticate,
  authorize('ADMIN', 'ADVERTISER', 'USER'),
  validate(createCampaignSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const campaign = await prisma.campaign.create({
        data: {
          ...req.body,
          userId: req.user?.userId, // Override with authenticated user
          status: 'DRAFT',
        },
        include: {
          advertiser: true,
        },
      });

      logger.info('Campaign created', { campaignId: campaign.id, userId: req.user?.userId });
      res.status(201).json(campaign);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Update campaign
 * PUT /api/v1/adtech/campaigns/:id
 */
router.put(
  '/campaigns/:id',
  authenticate,
  validate(updateCampaignSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      // Check ownership
      const existing = await prisma.campaign.findUnique({
        where: { id: req.params.id },
      });

      if (!existing) {
        throw new AppError('Campaign not found', 404);
      }

      if (req.user?.role !== 'ADMIN' && existing.userId !== req.user?.userId) {
        throw new AppError('Access denied', 403);
      }

      const campaign = await prisma.campaign.update({
        where: { id: req.params.id },
        data: req.body,
        include: {
          advertiser: true,
        },
      });

      logger.info('Campaign updated', { campaignId: campaign.id, userId: req.user?.userId });
      res.json(campaign);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Delete campaign
 * DELETE /api/v1/adtech/campaigns/:id
 */
router.delete(
  '/campaigns/:id',
  authenticate,
  deleteRateLimiter,
  validate(campaignIdParamsSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      // Check ownership
      const existing = await prisma.campaign.findUnique({
        where: { id: req.params.id },
      });

      if (!existing) {
        throw new AppError('Campaign not found', 404);
      }

      if (req.user?.role !== 'ADMIN' && existing.userId !== req.user?.userId) {
        throw new AppError('Access denied', 403);
      }

      await prisma.campaign.delete({
        where: { id: req.params.id },
      });

      logger.info('Campaign deleted', { campaignId: req.params.id, userId: req.user?.userId });
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

// ===== CREATIVE MANAGEMENT (Authenticated) =====

/**
 * List creatives
 * GET /api/v1/adtech/creatives
 */
router.get('/creatives', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const creatives = await prisma.creative.findMany({
      include: { advertiser: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(creatives);
  } catch (error) {
    next(error);
  }
});

/**
 * Create creative
 * POST /api/v1/adtech/creatives
 */
router.post(
  '/creatives',
  authenticate,
  authorize('ADMIN', 'ADVERTISER', 'USER'),
  validate(createCreativeSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const creative = await prisma.creative.create({
        data: {
          ...req.body,
          status: 'PENDING',
        },
        include: {
          advertiser: true,
        },
      });

      logger.info('Creative created', { creativeId: creative.id, userId: req.user?.userId });
      res.status(201).json(creative);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Update creative
 * PUT /api/v1/adtech/creatives/:id
 */
router.put(
  '/creatives/:id',
  authenticate,
  validate(uuidParamSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const creative = await prisma.creative.update({
        where: { id: req.params.id },
        data: req.body,
        include: {
          advertiser: true,
        },
      });

      logger.info('Creative updated', { creativeId: creative.id, userId: req.user?.userId });
      res.json(creative);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Approve creative
 * POST /api/v1/adtech/creatives/:id/approve
 */
router.post(
  '/creatives/:id/approve',
  authenticate,
  authorize('ADMIN'),
  validate(uuidParamSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const creative = await prisma.creative.findUnique({
        where: { id: req.params.id },
      });

      if (!creative) {
        throw new AppError('Creative not found', 404);
      }

      if (creative.status !== 'PENDING') {
        throw new AppError('Creative is not pending approval', 400);
      }

      const updatedCreative = await prisma.creative.update({
        where: { id: req.params.id },
        data: { status: 'APPROVED' },
        include: { advertiser: true },
      });

      logger.info('Creative approved', {
        creativeId: creative.id,
        approvedBy: req.user?.userId,
      });

      res.json(updatedCreative);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Reject creative
 * POST /api/v1/adtech/creatives/:id/reject
 */
router.post(
  '/creatives/:id/reject',
  authenticate,
  authorize('ADMIN'),
  validate(uuidParamSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { reason } = req.body;

      const creative = await prisma.creative.findUnique({
        where: { id: req.params.id },
      });

      if (!creative) {
        throw new AppError('Creative not found', 404);
      }

      if (creative.status !== 'PENDING') {
        throw new AppError('Creative is not pending approval', 400);
      }

      const updatedCreative = await prisma.creative.update({
        where: { id: req.params.id },
        data: {
          status: 'REJECTED',
          content: {
            ...(creative.content as object),
            rejectionReason: reason || 'Content does not meet guidelines',
          },
        },
        include: { advertiser: true },
      });

      logger.info('Creative rejected', {
        creativeId: creative.id,
        rejectedBy: req.user?.userId,
        reason,
      });

      res.json(updatedCreative);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Clone campaign
 * POST /api/v1/adtech/campaigns/:id/clone
 */
router.post(
  '/campaigns/:id/clone',
  authenticate,
  validate(campaignIdParamsSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const original = await prisma.campaign.findUnique({
        where: { id: req.params.id },
        include: {
          creatives: true,
          inventories: true,
          audiences: true,
        },
      });

      if (!original) {
        throw new AppError('Campaign not found', 404);
      }

      // Check ownership unless admin
      if (req.user?.role !== 'ADMIN' && original.userId !== req.user?.userId) {
        throw new AppError('Access denied', 403);
      }

      // Create cloned campaign
      const cloned = await prisma.campaign.create({
        data: {
          name: `${original.name} (Copy)`,
          advertiserId: original.advertiserId,
          userId: req.user?.userId!,
          type: original.type,
          objective: original.objective,
          budget: original.budget,
          bidStrategy: original.bidStrategy,
          maxBid: original.maxBid,
          targeting: original.targeting,
          startDate: new Date(),
          endDate: original.endDate,
          status: 'DRAFT',
          creatives: {
            create: original.creatives.map((cc) => ({
              creativeId: cc.creativeId,
              weight: cc.weight,
              active: cc.active,
            })),
          },
          inventories: {
            create: original.inventories.map((ci) => ({
              inventoryId: ci.inventoryId,
            })),
          },
          audiences: {
            create: original.audiences.map((ca) => ({
              audienceId: ca.audienceId,
            })),
          },
        },
        include: {
          advertiser: true,
          creatives: {
            include: { creative: true },
          },
        },
      });

      logger.info('Campaign cloned', {
        originalId: original.id,
        clonedId: cloned.id,
        userId: req.user?.userId,
      });

      res.status(201).json(cloned);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Bulk campaign operations
 * POST /api/v1/adtech/campaigns/bulk
 * Supports: update, delete, pause, activate operations on multiple campaigns
 */
router.post(
  '/campaigns/bulk',
  authenticate,
  authorize('ADMIN', 'ADVERTISER', 'USER'),
  validate(bulkCampaignSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { operation, campaignIds, updates } = req.body;

      // Verify ownership of all campaigns unless admin
      if (req.user?.role !== 'ADMIN') {
        const campaigns = await prisma.campaign.findMany({
          where: { id: { in: campaignIds } },
          select: { id: true, userId: true },
        });

        const unauthorizedCampaigns = campaigns.filter(
          (c) => c.userId !== req.user?.userId
        );

        if (unauthorizedCampaigns.length > 0) {
          throw new AppError(
            `Access denied for campaign IDs: ${unauthorizedCampaigns.map((c) => c.id).join(', ')}`,
            403
          );
        }

        // Verify all requested campaigns exist
        if (campaigns.length !== campaignIds.length) {
          throw new AppError(
            `Some campaign IDs not found. Found ${campaigns.length} of ${campaignIds.length}`,
            404
          );
        }
      }

      let result: any = {};

      switch (operation) {
        case 'update':
          if (!updates || Object.keys(updates).length === 0) {
            throw new AppError('Updates object is required for update operation', 400);
          }

          result = await prisma.campaign.updateMany({
            where: { id: { in: campaignIds } },
            data: updates,
          });

          logger.info('Bulk campaign update', {
            userId: req.user?.userId,
            campaignIds,
            updates,
            count: result.count,
          });
          break;

        case 'delete':
          result = await prisma.campaign.deleteMany({
            where: { id: { in: campaignIds } },
          });

          logger.info('Bulk campaign delete', {
            userId: req.user?.userId,
            campaignIds,
            count: result.count,
          });
          break;

        case 'pause':
          result = await prisma.campaign.updateMany({
            where: { id: { in: campaignIds } },
            data: { status: 'PAUSED' },
          });

          logger.info('Bulk campaign pause', {
            userId: req.user?.userId,
            campaignIds,
            count: result.count,
          });
          break;

        case 'activate':
          result = await prisma.campaign.updateMany({
            where: { id: { in: campaignIds } },
            data: { status: 'ACTIVE' },
          });

          logger.info('Bulk campaign activate', {
            userId: req.user?.userId,
            campaignIds,
            count: result.count,
          });
          break;

        default:
          throw new AppError(`Invalid operation: ${operation}`, 400);
      }

      res.json({
        success: true,
        operation,
        affected: result.count,
        campaignIds,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ===== PUBLISHER MANAGEMENT (Admin/Publisher only) =====

/**
 * List publishers
 * GET /api/v1/adtech/publishers
 */
router.get(
  '/publishers',
  authenticate,
  authorize('ADMIN', 'PUBLISHER'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const publishers = await prisma.publisher.findMany({
        include: {
          placements: true,
          inventories: true,
        },
        orderBy: { createdAt: 'desc' },
      });
      res.json(publishers);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Create publisher
 * POST /api/v1/adtech/publishers
 */
router.post(
  '/publishers',
  authenticate,
  authorize('ADMIN'),
  validate(createPublisherSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const publisher = await prisma.publisher.create({
        data: req.body,
      });

      logger.info('Publisher created', { publisherId: publisher.id, userId: req.user?.userId });
      res.status(201).json(publisher);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Create ad placement
 * POST /api/v1/adtech/placements
 */
router.post(
  '/placements',
  authenticate,
  authorize('ADMIN', 'PUBLISHER'),
  validate(createPlacementSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const placement = await prisma.adPlacement.create({
        data: req.body,
      });

      logger.info('Placement created', { placementId: placement.id, userId: req.user?.userId });
      res.status(201).json(placement);
    } catch (error) {
      next(error);
    }
  }
);

// ===== BRAND SAFETY (Admin Only) =====

/**
 * Check content for brand safety
 * POST /api/v1/adtech/brand-safety/check
 * Admin only endpoint for manual brand safety checks
 */
router.post(
  '/brand-safety/check',
  authenticate,
  authorize('ADMIN'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { url, title, description, keywords, html, domain } = req.body;

      if (!url && !title && !description && !keywords && !html && !domain) {
        throw new AppError('At least one content field is required', 400);
      }

      const brandSafety = BrandSafetyFilter.getInstance();
      const result = await brandSafety.checkContent({
        url,
        title,
        description,
        keywords,
        html,
        domain,
      });

      logger.info('Brand safety check performed', {
        userId: req.user?.userId,
        safe: result.safe,
        riskLevel: result.riskLevel,
        url,
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
