import { prisma } from '../../config/database';
import { logger } from '../../utils/logger';
import { InventoryType, InventoryStatus } from '@prisma/client';

/**
 * Inventory Manager - Manages various types of inventory (email, movies, etc.)
 */
export class InventoryManager {
  private static instance: InventoryManager;

  private constructor() {}

  static getInstance(): InventoryManager {
    if (!InventoryManager.instance) {
      InventoryManager.instance = new InventoryManager();
    }
    return InventoryManager.instance;
  }

  /**
   * Create new inventory
   */
  async createInventory(data: {
    type: InventoryType;
    name: string;
    description?: string;
    publisherId: string;
    totalSlots: number;
    floorPrice?: number;
    metadata?: Record<string, any>;

    // Email-specific
    emailListSize?: number;
    emailSegments?: string[];

    // Movie/Content-specific
    contentType?: string;
    contentGenre?: string[];
    contentRating?: string;
  }) {
    try {
      const inventory = await prisma.inventory.create({
        data: {
          ...data,
          availableSlots: data.totalSlots,
          status: InventoryStatus.ACTIVE,
        },
      });

      logger.info('Inventory created', { inventoryId: inventory.id, type: data.type });

      // Create initial slots
      await this.generateSlots(inventory.id, data.totalSlots);

      return inventory;
    } catch (error) {
      logger.error('Failed to create inventory', { error });
      throw error;
    }
  }

  /**
   * Generate inventory slots for scheduling
   */
  async generateSlots(inventoryId: string, count: number, startDate?: Date) {
    const start = startDate || new Date();
    const slots = [];

    for (let i = 0; i < count; i++) {
      const slotTime = new Date(start.getTime() + i * 24 * 60 * 60 * 1000); // Daily slots
      slots.push({
        inventoryId,
        slotTime,
      });
    }

    await prisma.inventorySlot.createMany({
      data: slots,
    });

    logger.info('Inventory slots generated', { inventoryId, count });
  }

  /**
   * Reserve inventory slot
   */
  async reserveSlot(slotId: string, campaignId: string, price: number) {
    try {
      const slot = await prisma.inventorySlot.findUnique({
        where: { id: slotId },
      });

      if (!slot || slot.status !== 'AVAILABLE') {
        throw new Error('Slot not available');
      }

      await prisma.inventorySlot.update({
        where: { id: slotId },
        data: {
          status: 'RESERVED',
          reservedBy: campaignId,
          price,
        },
      });

      await prisma.inventory.update({
        where: { id: slot.inventoryId },
        data: {
          availableSlots: { decrement: 1 },
        },
      });

      logger.info('Slot reserved', { slotId, campaignId });
    } catch (error) {
      logger.error('Failed to reserve slot', { slotId, error });
      throw error;
    }
  }

  /**
   * Get available inventory by type
   */
  async getAvailableInventory(
    type: InventoryType,
    filters?: {
      minSlots?: number;
      maxPrice?: number;
      publisherId?: string;
    }
  ) {
    const where: any = {
      type,
      status: InventoryStatus.ACTIVE,
      availableSlots: filters?.minSlots ? { gte: filters.minSlots } : { gt: 0 },
    };

    if (filters?.maxPrice) {
      where.floorPrice = { lte: filters.maxPrice };
    }

    if (filters?.publisherId) {
      where.publisherId = filters.publisherId;
    }

    return await prisma.inventory.findMany({
      where,
      include: {
        publisher: true,
        slots: {
          where: { status: 'AVAILABLE' },
          take: 10,
        },
      },
    });
  }

  /**
   * Forecast inventory availability
   */
  async forecastAvailability(inventoryId: string, startDate: Date, endDate: Date) {
    const slots = await prisma.inventorySlot.findMany({
      where: {
        inventoryId,
        slotTime: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const total = slots.length;
    const available = slots.filter((s: any) => s.status === 'AVAILABLE').length;
    const reserved = slots.filter((s: any) => s.status === 'RESERVED').length;
    const sold = slots.filter((s: any) => s.status === 'SOLD').length;

    return {
      total,
      available,
      reserved,
      sold,
      availabilityRate: total > 0 ? (available / total) * 100 : 0,
      forecast: this.calculateForecast(slots),
    };
  }

  /**
   * Calculate inventory forecast using simple moving average
   */
  private calculateForecast(slots: any[]) {
    // Simple forecast based on recent booking trends
    const recentBookings = slots.filter((s) => s.status === 'SOLD').slice(-7); // Last 7 days

    const bookingRate = recentBookings.length / 7;

    return {
      estimatedDailyBookings: bookingRate,
      estimatedWeeklyBookings: bookingRate * 7,
      estimatedMonthlyBookings: bookingRate * 30,
    };
  }

  /**
   * Optimize inventory yield (price optimization)
   */
  async optimizeYield(inventoryId: string) {
    const inventory = await prisma.inventory.findUnique({
      where: { id: inventoryId },
      include: {
        slots: {
          where: {
            status: 'SOLD',
            price: { not: null },
          },
          orderBy: { slotTime: 'desc' },
          take: 30, // Last 30 sold slots
        },
      },
    });

    if (!inventory || inventory.slots.length === 0) {
      return { currentFloorPrice: inventory?.floorPrice || 0, recommendedFloorPrice: 0 };
    }

    // Calculate average sold price
    const avgPrice =
      inventory.slots.reduce((sum: number, slot: any) => sum + (slot.price || 0), 0) /
      inventory.slots.length;

    // Calculate utilization rate
    const utilizationRate =
      (inventory.totalSlots - inventory.availableSlots) / inventory.totalSlots;

    // Price optimization logic
    let recommendedPrice = avgPrice;

    if (utilizationRate > 0.8) {
      // High demand - increase price
      recommendedPrice = avgPrice * 1.2;
    } else if (utilizationRate < 0.4) {
      // Low demand - decrease price
      recommendedPrice = avgPrice * 0.8;
    }

    logger.info('Yield optimization calculated', {
      inventoryId,
      currentFloorPrice: inventory.floorPrice,
      recommendedFloorPrice: recommendedPrice,
      utilizationRate,
    });

    return {
      currentFloorPrice: inventory.floorPrice,
      recommendedFloorPrice: Math.round(recommendedPrice * 100) / 100,
      avgSoldPrice: Math.round(avgPrice * 100) / 100,
      utilizationRate: Math.round(utilizationRate * 100),
    };
  }

  /**
   * Get inventory analytics
   */
  async getInventoryAnalytics(inventoryId: string, startDate: Date, endDate: Date) {
    const [inventory, slots, impressions] = await Promise.all([
      prisma.inventory.findUnique({
        where: { id: inventoryId },
        include: { publisher: true },
      }),
      prisma.inventorySlot.findMany({
        where: {
          inventoryId,
          slotTime: { gte: startDate, lte: endDate },
        },
      }),
      prisma.impression.findMany({
        where: {
          slot: {
            inventoryId,
            slotTime: { gte: startDate, lte: endDate },
          },
        },
      }),
    ]);

    const totalRevenue = impressions.reduce(
      (sum: number, imp: { revenue: number | null }) => sum + (imp.revenue || 0),
      0
    );
    const totalImpressions = impressions.length;
    const totalClicks = impressions.filter((imp: { clicked: boolean }) => imp.clicked).length;
    const avgCPM = totalImpressions > 0 ? (totalRevenue / totalImpressions) * 1000 : 0;
    const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

    return {
      inventory,
      period: { startDate, endDate },
      metrics: {
        totalSlots: slots.length,
        soldSlots: slots.filter((s: { status: string }) => s.status === 'SOLD').length,
        availableSlots: slots.filter((s: { status: string }) => s.status === 'AVAILABLE').length,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalImpressions,
        totalClicks,
        avgCPM: Math.round(avgCPM * 100) / 100,
        ctr: Math.round(ctr * 100) / 100,
        fillRate:
          slots.length > 0
            ? (slots.filter((s: { status: string }) => s.status === 'SOLD').length / slots.length) *
              100
            : 0,
      },
    };
  }
}
