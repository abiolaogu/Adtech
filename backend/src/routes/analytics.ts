import { Router } from 'express';
import { prisma } from '../config/database';

const router = Router();

/**
 * Campaign performance analytics
 * GET /api/v1/analytics/campaigns/:id/performance
 */
router.get('/campaigns/:id/performance', async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const campaign = await prisma.campaign.findUnique({
      where: { id: req.params.id },
      include: {
        advertiser: true
      }
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Get impressions
    const impressions = await prisma.impression.findMany({
      where: {
        bid: {
          campaignId: req.params.id
        },
        ...(startDate && endDate ? {
          createdAt: {
            gte: new Date(startDate as string),
            lte: new Date(endDate as string)
          }
        } : {})
      }
    });

    const metrics = {
      impressions: impressions.length,
      views: impressions.filter(i => i.viewed).length,
      clicks: impressions.filter(i => i.clicked).length,
      conversions: impressions.filter(i => i.converted).length,
      spend: impressions.reduce((sum, i) => sum + (i.revenue || 0), 0),
      ctr: impressions.length > 0 ? (impressions.filter(i => i.clicked).length / impressions.length) * 100 : 0,
      cvr: impressions.filter(i => i.clicked).length > 0
        ? (impressions.filter(i => i.converted).length / impressions.filter(i => i.clicked).length) * 100
        : 0,
      avgCpm: impressions.length > 0
        ? (impressions.reduce((sum, i) => sum + (i.revenue || 0), 0) / impressions.length) * 1000
        : 0
    };

    res.json({
      campaign,
      period: { startDate, endDate },
      metrics
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Publisher revenue analytics
 * GET /api/v1/analytics/publishers/:id/revenue
 */
router.get('/publishers/:id/revenue', async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const publisher = await prisma.publisher.findUnique({
      where: { id: req.params.id }
    });

    if (!publisher) {
      return res.status(404).json({ error: 'Publisher not found' });
    }

    const impressions = await prisma.impression.findMany({
      where: {
        placement: {
          publisherId: req.params.id
        },
        ...(startDate && endDate ? {
          createdAt: {
            gte: new Date(startDate as string),
            lte: new Date(endDate as string)
          }
        } : {})
      }
    });

    const metrics = {
      totalImpressions: impressions.length,
      totalRevenue: impressions.reduce((sum, i) => sum + (i.publisherRevenue || 0), 0),
      avgCpm: impressions.length > 0
        ? (impressions.reduce((sum, i) => sum + (i.publisherRevenue || 0), 0) / impressions.length) * 1000
        : 0
    };

    res.json({
      publisher,
      period: { startDate, endDate },
      metrics
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Platform overview
 * GET /api/v1/analytics/overview
 */
router.get('/overview', async (req, res, next) => {
  try {
    const [
      totalCampaigns,
      activeCampaigns,
      totalPublishers,
      totalInventory,
      totalCustomers,
      recentImpressions
    ] = await Promise.all([
      prisma.campaign.count(),
      prisma.campaign.count({ where: { status: 'ACTIVE' } }),
      prisma.publisher.count(),
      prisma.inventory.count(),
      prisma.customer.count(),
      prisma.impression.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        }
      })
    ]);

    res.json({
      campaigns: {
        total: totalCampaigns,
        active: activeCampaigns
      },
      publishers: totalPublishers,
      inventory: totalInventory,
      customers: totalCustomers,
      impressionsLast24h: recentImpressions
    });
  } catch (error) {
    next(error);
  }
});

export default router;
