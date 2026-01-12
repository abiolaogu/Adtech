import { Router } from 'express';
import { InventoryManager } from '../services/inventory/InventoryManager';
import { InventoryType } from '@prisma/client';
import { logger } from '../utils/logger';
import {
  authenticate,
  authorize,
  AuthenticatedRequest,
} from '../middleware/auth';
import {
  validate,
  createInventorySchema,
  reserveSlotSchema,
  inventoryQuerySchema,
  inventoryForecastSchema,
  uuidParamSchema,
} from '../middleware/validation';
import { AppError } from '../middleware/errorHandler';

const router = Router();
const inventoryManager = InventoryManager.getInstance();

/**
 * Create inventory
 * POST /api/v1/inventory
 * Requires admin or publisher role
 */
router.post(
  '/',
  authenticate,
  authorize('ADMIN', 'PUBLISHER'),
  validate(createInventorySchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const inventory = await inventoryManager.createInventory(req.body);

      logger.info('Inventory created', {
        inventoryId: inventory.id,
        type: inventory.type,
        userId: req.user?.userId,
      });

      res.status(201).json(inventory);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get available inventory
 * GET /api/v1/inventory/available
 * Authenticated users can view available inventory
 */
router.get(
  '/available',
  authenticate,
  validate(inventoryQuerySchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { type, minSlots, maxPrice, publisherId } = req.query;

      const inventory = await inventoryManager.getAvailableInventory(
        type as InventoryType | undefined,
        {
          minSlots: minSlots as number | undefined,
          maxPrice: maxPrice as number | undefined,
          publisherId: publisherId as string | undefined,
        }
      );

      res.json(inventory);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Reserve inventory slot
 * POST /api/v1/inventory/reserve
 * Requires advertiser or admin role
 */
router.post(
  '/reserve',
  authenticate,
  authorize('ADMIN', 'ADVERTISER', 'USER'),
  validate(reserveSlotSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { slotId, campaignId, price } = req.body;

      await inventoryManager.reserveSlot(slotId, campaignId, price);

      logger.info('Inventory slot reserved', {
        slotId,
        campaignId,
        price,
        userId: req.user?.userId,
      });

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get inventory by ID
 * GET /api/v1/inventory/:id
 * Authenticated users can view inventory details
 */
router.get(
  '/:id',
  authenticate,
  validate(uuidParamSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const inventory = await inventoryManager.getInventoryById(req.params.id);

      if (!inventory) {
        throw new AppError('Inventory not found', 404);
      }

      res.json(inventory);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get inventory forecast
 * GET /api/v1/inventory/:id/forecast
 * Authenticated users can view forecasts
 */
router.get(
  '/:id/forecast',
  authenticate,
  validate(inventoryForecastSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { startDate, endDate } = req.query;

      const forecast = await inventoryManager.forecastAvailability(
        req.params.id,
        new Date(startDate as string),
        new Date(endDate as string)
      );

      res.json(forecast);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get yield optimization recommendations
 * GET /api/v1/inventory/:id/optimize-yield
 * Requires admin or publisher role
 */
router.get(
  '/:id/optimize-yield',
  authenticate,
  authorize('ADMIN', 'PUBLISHER'),
  validate(uuidParamSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const optimization = await inventoryManager.optimizeYield(req.params.id);
      res.json(optimization);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get inventory analytics
 * GET /api/v1/inventory/:id/analytics
 * Requires admin or publisher role
 */
router.get(
  '/:id/analytics',
  authenticate,
  authorize('ADMIN', 'PUBLISHER'),
  validate(inventoryForecastSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { startDate, endDate } = req.query;

      const analytics = await inventoryManager.getInventoryAnalytics(
        req.params.id,
        new Date(startDate as string),
        new Date(endDate as string)
      );

      res.json(analytics);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Update inventory
 * PUT /api/v1/inventory/:id
 * Requires admin or publisher role
 */
router.put(
  '/:id',
  authenticate,
  authorize('ADMIN', 'PUBLISHER'),
  validate(uuidParamSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const inventory = await inventoryManager.updateInventory(req.params.id, req.body);

      logger.info('Inventory updated', {
        inventoryId: req.params.id,
        userId: req.user?.userId,
      });

      res.json(inventory);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Delete inventory
 * DELETE /api/v1/inventory/:id
 * Requires admin role only
 */
router.delete(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  validate(uuidParamSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      await inventoryManager.deleteInventory(req.params.id);

      logger.info('Inventory deleted', {
        inventoryId: req.params.id,
        userId: req.user?.userId,
      });

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

export default router;
