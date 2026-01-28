import { prisma } from '../../config/database';
import { logger } from '../../utils/logger';
import { CreativeStatus } from '@prisma/client';

/**
 * Creative Management Service - Handles creative approval workflow
 */
export class CreativeManagementService {
  private static instance: CreativeManagementService;

  private constructor() {}

  static getInstance(): CreativeManagementService {
    if (!CreativeManagementService.instance) {
      CreativeManagementService.instance = new CreativeManagementService();
    }
    return CreativeManagementService.instance;
  }

  /**
   * Approve a creative
   */
  async approveCreative(
    creativeId: string,
    reviewedBy: string,
    notes?: string
  ): Promise<any> {
    try {
      const creative = await prisma.creative.findUnique({
        where: { id: creativeId },
        include: { advertiser: true },
      });

      if (!creative) {
        throw new Error('Creative not found');
      }

      if (creative.status === CreativeStatus.APPROVED) {
        throw new Error('Creative is already approved');
      }

      const updatedCreative = await prisma.creative.update({
        where: { id: creativeId },
        data: {
          status: CreativeStatus.APPROVED,
          updatedAt: new Date(),
        },
      });

      logger.info('Creative approved', {
        creativeId,
        reviewedBy,
        advertiserId: creative.advertiserId,
      });

      return {
        ...updatedCreative,
        reviewedBy,
        reviewedAt: new Date(),
        reviewNotes: notes,
      };
    } catch (error) {
      logger.error('Failed to approve creative', { creativeId, error });
      throw error;
    }
  }

  /**
   * Reject a creative
   */
  async rejectCreative(
    creativeId: string,
    reviewedBy: string,
    reason: string
  ): Promise<any> {
    try {
      const creative = await prisma.creative.findUnique({
        where: { id: creativeId },
        include: { advertiser: true },
      });

      if (!creative) {
        throw new Error('Creative not found');
      }

      if (creative.status === CreativeStatus.REJECTED) {
        throw new Error('Creative is already rejected');
      }

      const updatedCreative = await prisma.creative.update({
        where: { id: creativeId },
        data: {
          status: CreativeStatus.REJECTED,
          updatedAt: new Date(),
        },
      });

      logger.info('Creative rejected', {
        creativeId,
        reviewedBy,
        reason,
        advertiserId: creative.advertiserId,
      });

      return {
        ...updatedCreative,
        reviewedBy,
        reviewedAt: new Date(),
        rejectionReason: reason,
      };
    } catch (error) {
      logger.error('Failed to reject creative', { creativeId, error });
      throw error;
    }
  }

  /**
   * Get creatives pending approval
   */
  async getPendingCreatives(limit = 50, offset = 0): Promise<any> {
    try {
      const [creatives, total] = await Promise.all([
        prisma.creative.findMany({
          where: {
            status: CreativeStatus.PENDING,
          },
          include: {
            advertiser: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
          take: limit,
          skip: offset,
        }),
        prisma.creative.count({
          where: {
            status: CreativeStatus.PENDING,
          },
        }),
      ]);

      return {
        creatives,
        total,
        limit,
        offset,
      };
    } catch (error) {
      logger.error('Failed to get pending creatives', { error });
      throw error;
    }
  }

  /**
   * Get creative by ID with full details
   */
  async getCreative(creativeId: string): Promise<any> {
    try {
      const creative = await prisma.creative.findUnique({
        where: { id: creativeId },
        include: {
          advertiser: true,
          campaigns: {
            include: {
              campaign: true,
            },
          },
        },
      });

      if (!creative) {
        throw new Error('Creative not found');
      }

      return creative;
    } catch (error) {
      logger.error('Failed to get creative', { creativeId, error });
      throw error;
    }
  }
}
