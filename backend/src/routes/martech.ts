import { Router } from 'express';
import { CDP } from '../services/martech/CDP';
import { SegmentationEngine } from '../services/martech/SegmentationEngine';

const router = Router();
const cdp = CDP.getInstance();
const segmentation = SegmentationEngine.getInstance();

/**
 * CDP Routes
 */

// Identify customer
router.post('/identify', async (req, res, next) => {
  try {
    const customer = await cdp.identify(req.body);
    res.json(customer);
  } catch (error) {
    next(error);
  }
});

// Track event
router.post('/track', async (req, res, next) => {
  try {
    const event = await cdp.track(req.body);
    res.json(event);
  } catch (error) {
    next(error);
  }
});

// Get customer profile
router.get('/customers/:id/profile', async (req, res, next) => {
  try {
    const profile = await cdp.getProfile(req.params.id);
    res.json(profile);
  } catch (error) {
    next(error);
  }
});

// Merge customers
router.post('/customers/merge', async (req, res, next) => {
  try {
    const { primaryId, secondaryId } = req.body;

    if (!primaryId || !secondaryId) {
      return res.status(400).json({
        error: 'Missing required parameters: primaryId, secondaryId'
      });
    }

    const result = await cdp.mergeCustomers(primaryId, secondaryId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Export customer data (GDPR)
router.get('/customers/:id/export', async (req, res, next) => {
  try {
    const data = await cdp.exportCustomerData(req.params.id);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

// Delete customer data (GDPR)
router.delete('/customers/:id', async (req, res, next) => {
  try {
    const result = await cdp.deleteCustomerData(req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * Segmentation Routes
 */

// Create audience
router.post('/audiences', async (req, res, next) => {
  try {
    const audience = await segmentation.createAudience(req.body);
    res.status(201).json(audience);
  } catch (error) {
    next(error);
  }
});

// Build/rebuild segment
router.post('/audiences/:id/build', async (req, res, next) => {
  try {
    const size = await segmentation.buildSegment(req.params.id);
    res.json({ audienceId: req.params.id, size });
  } catch (error) {
    next(error);
  }
});

// Get audience members
router.get('/audiences/:id/members', async (req, res, next) => {
  try {
    const { limit = '100', offset = '0' } = req.query;

    const members = await segmentation.getAudienceMembers(
      req.params.id,
      parseInt(limit as string),
      parseInt(offset as string)
    );

    res.json(members);
  } catch (error) {
    next(error);
  }
});

// Check if customer is in audience
router.get('/audiences/:audienceId/members/:customerId', async (req, res, next) => {
  try {
    const isInAudience = await segmentation.isInAudience(
      req.params.customerId,
      req.params.audienceId
    );

    res.json({ isInAudience });
  } catch (error) {
    next(error);
  }
});

// Get customer's audiences
router.get('/customers/:id/audiences', async (req, res, next) => {
  try {
    const audiences = await segmentation.getCustomerAudiences(req.params.id);
    res.json(audiences);
  } catch (error) {
    next(error);
  }
});

// Refresh all audiences
router.post('/audiences/refresh-all', async (req, res, next) => {
  try {
    await segmentation.refreshAllAudiences();
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
