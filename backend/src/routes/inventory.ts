import { Router } from 'express';
import { InventoryManager } from '../services/inventory/InventoryManager';
import { InventoryType } from '@prisma/client';

const router = Router();
const inventoryManager = InventoryManager.getInstance();

/**
 * Create inventory
 * POST /api/v1/inventory
 */
router.post('/', async (req, res, next) => {
  try {
    const inventory = await inventoryManager.createInventory(req.body);
    res.status(201).json(inventory);
  } catch (error) {
    next(error);
  }
});

/**
 * Get available inventory
 * GET /api/v1/inventory/available
 */
router.get('/available', async (req, res, next) => {
  try {
    const { type, minSlots, maxPrice, publisherId } = req.query;

    const inventory = await inventoryManager.getAvailableInventory(type as InventoryType, {
      minSlots: minSlots ? parseInt(minSlots as string) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice as string) : undefined,
      publisherId: publisherId as string,
    });

    res.json(inventory);
  } catch (error) {
    next(error);
  }
});

/**
 * Reserve inventory slot
 * POST /api/v1/inventory/reserve
 */
router.post('/reserve', async (req, res, next) => {
  try {
    const { slotId, campaignId, price } = req.body;

    if (!slotId || !campaignId || !price) {
      return res.status(400).json({
        error: 'Missing required parameters: slotId, campaignId, price',
      });
    }

    await inventoryManager.reserveSlot(slotId, campaignId, price);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

/**
 * Get inventory forecast
 * GET /api/v1/inventory/:id/forecast
 */
router.get('/:id/forecast', async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        error: 'Missing required parameters: startDate, endDate',
      });
    }

    const forecast = await inventoryManager.forecastAvailability(
      req.params.id,
      new Date(startDate as string),
      new Date(endDate as string)
    );

    res.json(forecast);
  } catch (error) {
    next(error);
  }
});

/**
 * Get yield optimization recommendations
 * GET /api/v1/inventory/:id/optimize-yield
 */
router.get('/:id/optimize-yield', async (req, res, next) => {
  try {
    const optimization = await inventoryManager.optimizeYield(req.params.id);
    res.json(optimization);
  } catch (error) {
    next(error);
  }
});

/**
 * Get inventory analytics
 * GET /api/v1/inventory/:id/analytics
 */
router.get('/:id/analytics', async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        error: 'Missing required parameters: startDate, endDate',
      });
    }

    const analytics = await inventoryManager.getInventoryAnalytics(
      req.params.id,
      new Date(startDate as string),
      new Date(endDate as string)
    );

    res.json(analytics);
  } catch (error) {
    next(error);
  }
});

export default router;
