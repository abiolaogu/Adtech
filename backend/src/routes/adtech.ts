import { Router } from 'express';
import { AdServer } from '../services/adtech/adserver/AdServer';
import { prisma } from '../config/database';

const router = Router();
const adServer = AdServer.getInstance();

/**
 * Serve an ad
 * GET /api/v1/serve/ad
 */
router.get('/serve/ad', async (req, res, next) => {
  try {
    const { placementId, publisherId, deviceType, country, userId } = req.query;

    if (!placementId || !publisherId || !deviceType) {
      return res.status(400).json({
        error: 'Missing required parameters: placementId, publisherId, deviceType',
      });
    }

    const result = await adServer.serveAd({
      placementId: placementId as string,
      publisherId: publisherId as string,
      deviceType: deviceType as string,
      country: country as string,
      userContext: userId ? { userId } : undefined,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * Track impression
 * GET /api/v1/track/impression/:requestId
 */
router.get('/track/impression/:requestId', async (req, res, next) => {
  try {
    await adServer.trackImpression(req.params.requestId);

    // Return 1x1 transparent pixel
    const pixel = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );

    res.writeHead(200, {
      'Content-Type': 'image/png',
      'Content-Length': pixel.length,
    });
    res.end(pixel);
  } catch (error) {
    next(error);
  }
});

/**
 * Track click
 * GET /api/v1/track/click/:requestId
 */
router.get('/track/click/:requestId', async (req, res, next) => {
  try {
    const clickUrl = await adServer.trackClick(req.params.requestId);

    if (clickUrl) {
      res.redirect(302, clickUrl);
    } else {
      res.status(404).json({ error: 'Click URL not found' });
    }
  } catch (error) {
    next(error);
  }
});

/**
 * Track conversion
 * POST /api/v1/track/conversion/:requestId
 */
router.post('/track/conversion/:requestId', async (req, res, next) => {
  try {
    const { value } = req.body;
    await adServer.trackConversion(req.params.requestId, value);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

/**
 * Campaign Management
 */

// List campaigns
router.get('/campaigns', async (req, res, next) => {
  try {
    const campaigns = await prisma.campaign.findMany({
      include: {
        advertiser: true,
        creatives: {
          include: { creative: true },
        },
      },
    });
    res.json(campaigns);
  } catch (error) {
    next(error);
  }
});

// Get campaign
router.get('/campaigns/:id', async (req, res, next) => {
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
      return res.status(404).json({ error: 'Campaign not found' });
    }

    res.json(campaign);
  } catch (error) {
    next(error);
  }
});

// Create campaign
router.post('/campaigns', async (req, res, next) => {
  try {
    const campaign = await prisma.campaign.create({
      data: {
        ...req.body,
        status: 'DRAFT',
      },
    });
    res.status(201).json(campaign);
  } catch (error) {
    next(error);
  }
});

// Update campaign
router.put('/campaigns/:id', async (req, res, next) => {
  try {
    const campaign = await prisma.campaign.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(campaign);
  } catch (error) {
    next(error);
  }
});

// Delete campaign
router.delete('/campaigns/:id', async (req, res, next) => {
  try {
    await prisma.campaign.delete({
      where: { id: req.params.id },
    });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

/**
 * Creative Management
 */

// List creatives
router.get('/creatives', async (req, res, next) => {
  try {
    const creatives = await prisma.creative.findMany({
      include: { advertiser: true },
    });
    res.json(creatives);
  } catch (error) {
    next(error);
  }
});

// Create creative
router.post('/creatives', async (req, res, next) => {
  try {
    const creative = await prisma.creative.create({
      data: {
        ...req.body,
        status: 'PENDING',
      },
    });
    res.status(201).json(creative);
  } catch (error) {
    next(error);
  }
});

// Update creative
router.put('/creatives/:id', async (req, res, next) => {
  try {
    const creative = await prisma.creative.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(creative);
  } catch (error) {
    next(error);
  }
});

/**
 * Publisher & Ad Placement Management
 */

// List publishers
router.get('/publishers', async (req, res, next) => {
  try {
    const publishers = await prisma.publisher.findMany({
      include: {
        placements: true,
        inventories: true,
      },
    });
    res.json(publishers);
  } catch (error) {
    next(error);
  }
});

// Create publisher
router.post('/publishers', async (req, res, next) => {
  try {
    const publisher = await prisma.publisher.create({
      data: req.body,
    });
    res.status(201).json(publisher);
  } catch (error) {
    next(error);
  }
});

// Create ad placement
router.post('/placements', async (req, res, next) => {
  try {
    const placement = await prisma.adPlacement.create({
      data: req.body,
    });
    res.status(201).json(placement);
  } catch (error) {
    next(error);
  }
});

export default router;
