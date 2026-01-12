import { Router } from 'express';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import {
  authenticate,
  authorize,
  AuthenticatedRequest,
} from '../middleware/auth';
import { validate, uuidParamSchema } from '../middleware/validation';
import { AppError } from '../middleware/errorHandler';
import { z } from 'zod';

const router = Router();

// Date range query schema
const dateRangeQuerySchema = {
  query: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  }),
};

// Combined campaign performance schema
const campaignPerformanceSchema = {
  params: z.object({
    id: z.string().uuid('Invalid campaign ID'),
  }),
  query: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  }),
};

// Combined publisher revenue schema
const publisherRevenueSchema = {
  params: z.object({
    id: z.string().uuid('Invalid publisher ID'),
  }),
  query: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  }),
};

/**
 * Platform overview
 * GET /api/v1/analytics/overview
 * Provides high-level platform statistics
 */
router.get(
  '/overview',
  authenticate,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const [
        totalCampaigns,
        activeCampaigns,
        totalPublishers,
        totalInventory,
        totalCustomers,
        recentImpressions,
      ] = await Promise.all([
        prisma.campaign.count(),
        prisma.campaign.count({ where: { status: 'ACTIVE' } }),
        prisma.publisher.count(),
        prisma.inventory.count(),
        prisma.customer.count(),
        prisma.impression.count({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
            },
          },
        }),
      ]);

      res.json({
        campaigns: {
          total: totalCampaigns,
          active: activeCampaigns,
        },
        publishers: totalPublishers,
        inventory: totalInventory,
        customers: totalCustomers,
        impressionsLast24h: recentImpressions,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Dashboard statistics
 * GET /api/v1/analytics/dashboard
 * Returns aggregated dashboard data
 */
router.get(
  '/dashboard',
  authenticate,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      // Get date range for last 30 days
      const endDate = new Date();
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      // Get aggregated metrics
      const impressions = await prisma.impression.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: {
          revenue: true,
          clicked: true,
          converted: true,
          createdAt: true,
        },
      });

      const totalSpend = impressions.reduce((sum, i) => sum + (i.revenue || 0), 0);
      const totalImpressions = impressions.length;
      const totalClicks = impressions.filter((i) => i.clicked).length;
      const totalConversions = impressions.filter((i) => i.converted).length;
      const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

      // Generate daily breakdown for charts
      const dailyData = new Map<string, { spend: number; revenue: number; impressions: number; clicks: number }>();

      impressions.forEach((imp) => {
        const date = imp.createdAt.toISOString().split('T')[0];
        const existing = dailyData.get(date) || { spend: 0, revenue: 0, impressions: 0, clicks: 0 };
        dailyData.set(date, {
          spend: existing.spend + (imp.revenue || 0) * 0.7, // Approximate spend
          revenue: existing.revenue + (imp.revenue || 0),
          impressions: existing.impressions + 1,
          clicks: existing.clicks + (imp.clicked ? 1 : 0),
        });
      });

      const revenueData = Array.from(dailyData.entries())
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-14); // Last 14 days

      const performanceData = revenueData.map((d) => ({
        date: d.date,
        impressions: d.impressions,
        clicks: d.clicks,
      }));

      res.json({
        totalSpend: Math.round(totalSpend * 100) / 100,
        totalImpressions,
        totalClicks,
        totalConversions,
        avgCtr: Math.round(avgCtr * 100) / 100,
        revenueData,
        performanceData,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Campaign performance analytics
 * GET /api/v1/analytics/campaigns/:id/performance
 */
router.get(
  '/campaigns/:id/performance',
  authenticate,
  validate(campaignPerformanceSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { startDate, endDate } = req.query;

      const campaign = await prisma.campaign.findUnique({
        where: { id: req.params.id },
        include: {
          advertiser: true,
        },
      });

      if (!campaign) {
        throw new AppError('Campaign not found', 404);
      }

      // Check access rights
      if (req.user?.role !== 'ADMIN' && campaign.userId !== req.user?.userId) {
        throw new AppError('Access denied', 403);
      }

      // Get impressions
      const impressions = await prisma.impression.findMany({
        where: {
          bid: {
            campaignId: req.params.id,
          },
          ...(startDate && endDate
            ? {
                createdAt: {
                  gte: new Date(startDate as string),
                  lte: new Date(endDate as string),
                },
              }
            : {}),
        },
      });

      const metrics = {
        impressions: impressions.length,
        views: impressions.filter((i) => i.viewed).length,
        clicks: impressions.filter((i) => i.clicked).length,
        conversions: impressions.filter((i) => i.converted).length,
        spend: impressions.reduce((sum, i) => sum + (i.revenue || 0), 0),
        ctr:
          impressions.length > 0
            ? (impressions.filter((i) => i.clicked).length / impressions.length) * 100
            : 0,
        cvr:
          impressions.filter((i) => i.clicked).length > 0
            ? (impressions.filter((i) => i.converted).length /
                impressions.filter((i) => i.clicked).length) *
              100
            : 0,
        avgCpm:
          impressions.length > 0
            ? (impressions.reduce((sum, i) => sum + (i.revenue || 0), 0) / impressions.length) * 1000
            : 0,
      };

      res.json({
        campaign,
        period: { startDate, endDate },
        metrics,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Publisher revenue analytics
 * GET /api/v1/analytics/publishers/:id/revenue
 */
router.get(
  '/publishers/:id/revenue',
  authenticate,
  authorize('ADMIN', 'PUBLISHER'),
  validate(publisherRevenueSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { startDate, endDate } = req.query;

      const publisher = await prisma.publisher.findUnique({
        where: { id: req.params.id },
      });

      if (!publisher) {
        throw new AppError('Publisher not found', 404);
      }

      const impressions = await prisma.impression.findMany({
        where: {
          placement: {
            publisherId: req.params.id,
          },
          ...(startDate && endDate
            ? {
                createdAt: {
                  gte: new Date(startDate as string),
                  lte: new Date(endDate as string),
                },
              }
            : {}),
        },
      });

      const metrics = {
        totalImpressions: impressions.length,
        totalRevenue: impressions.reduce((sum, i) => sum + (i.publisherRevenue || 0), 0),
        avgCpm:
          impressions.length > 0
            ? (impressions.reduce((sum, i) => sum + (i.publisherRevenue || 0), 0) /
                impressions.length) *
              1000
            : 0,
      };

      res.json({
        publisher,
        period: { startDate, endDate },
        metrics,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Real-time analytics
 * GET /api/v1/analytics/realtime
 * Returns real-time metrics from the last hour
 */
router.get(
  '/realtime',
  authenticate,
  authorize('ADMIN'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

      const [impressions, bids, activeCampaigns] = await Promise.all([
        prisma.impression.count({
          where: { createdAt: { gte: oneHourAgo } },
        }),
        prisma.bid.count({
          where: { timestamp: { gte: oneHourAgo } },
        }),
        prisma.campaign.count({
          where: { status: 'ACTIVE' },
        }),
      ]);

      res.json({
        period: 'last_hour',
        impressions,
        bids,
        bidWinRate: bids > 0 ? (impressions / bids) * 100 : 0,
        activeCampaigns,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Audience analytics
 * GET /api/v1/analytics/audiences/:id
 */
router.get(
  '/audiences/:id',
  authenticate,
  validate(uuidParamSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const audience = await prisma.audience.findUnique({
        where: { id: req.params.id },
        include: {
          _count: {
            select: { segments: true, campaigns: true },
          },
        },
      });

      if (!audience) {
        throw new AppError('Audience not found', 404);
      }

      // Check access rights
      if (req.user?.role !== 'ADMIN' && audience.userId !== req.user?.userId) {
        throw new AppError('Access denied', 403);
      }

      res.json({
        audience,
        memberCount: audience._count.segments,
        campaignCount: audience._count.campaigns,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
