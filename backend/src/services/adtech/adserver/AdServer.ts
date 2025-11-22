import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../../../config/database';
import { logger } from '../../../utils/logger';
import { RTBEngine } from '../rtb/RTBEngine';
import { BidRequest } from '../rtb/types';

/**
 * Ad Server - Handles ad serving and impression tracking
 */
export class AdServer {
  private static instance: AdServer;
  private rtbEngine = RTBEngine.getInstance();

  private constructor() {}

  static getInstance(): AdServer {
    if (!AdServer.instance) {
      AdServer.instance = new AdServer();
    }
    return AdServer.instance;
  }

  /**
   * Serve an ad for a given placement
   */
  async serveAd(params: {
    placementId: string;
    publisherId: string;
    deviceType: string;
    country?: string;
    userContext?: Record<string, any>;
  }) {
    const requestId = uuidv4();
    logger.debug('Ad request received', { requestId, ...params });

    try {
      // 1. Validate placement
      const placement = await prisma.adPlacement.findUnique({
        where: { id: params.placementId },
        include: { publisher: true }
      });

      if (!placement || !placement.active) {
        throw new Error('Invalid or inactive placement');
      }

      // 2. Build bid request
      const bidRequest: BidRequest = {
        requestId,
        placementId: params.placementId,
        publisherId: params.publisherId,
        inventoryType: placement.type,
        deviceType: params.deviceType,
        country: params.country || 'US',
        floorPrice: 0.5, // Default floor price in CPM
        userContext: params.userContext,
        timestamp: new Date()
      };

      // 3. Run RTB auction
      const auctionResult = await this.rtbEngine.runAuction(bidRequest);

      if (!auctionResult.winningBid) {
        logger.debug('No fill for ad request', { requestId });
        return {
          requestId,
          filled: false,
          reason: 'NO_ELIGIBLE_ADS'
        };
      }

      // 4. Fetch creative
      const creative = await prisma.creative.findUnique({
        where: { id: auctionResult.winningBid.creativeId }
      });

      if (!creative) {
        throw new Error('Creative not found');
      }

      // 5. Create impression record
      const bid = await prisma.bid.findFirst({
        where: {
          requestId: auctionResult.auctionId,
          campaignId: auctionResult.winningBid.campaignId
        }
      });

      if (bid) {
        await prisma.impression.create({
          data: {
            bidId: bid.id,
            placementId: params.placementId,
            served: true,
            servedAt: new Date(),
            revenue: auctionResult.clearingPrice,
            publisherRevenue: auctionResult.clearingPrice * placement.publisher.revenueShare
          }
        });
      }

      // 6. Track impression pixel URL
      const impressionTrackingUrl = `${process.env.API_URL}/api/v1/track/impression/${requestId}`;
      const clickTrackingUrl = `${process.env.API_URL}/api/v1/track/click/${requestId}`;

      logger.info('Ad served successfully', {
        requestId,
        campaignId: auctionResult.winningBid.campaignId,
        price: auctionResult.clearingPrice
      });

      return {
        requestId,
        filled: true,
        creative: {
          id: creative.id,
          type: creative.type,
          format: creative.format,
          content: creative.content,
          imageUrl: creative.imageUrl,
          videoUrl: creative.videoUrl,
          htmlContent: creative.htmlContent,
          clickUrl: creative.clickUrl
        },
        tracking: {
          impressionUrl: impressionTrackingUrl,
          clickUrl: clickTrackingUrl
        },
        price: auctionResult.clearingPrice
      };

    } catch (error) {
      logger.error('Ad serving failed', { requestId, error });
      return {
        requestId,
        filled: false,
        reason: 'INTERNAL_ERROR'
      };
    }
  }

  /**
   * Track impression view
   */
  async trackImpression(requestId: string) {
    try {
      const impression = await prisma.impression.findFirst({
        where: {
          bid: {
            requestId
          }
        },
        include: {
          bid: {
            include: {
              campaign: true
            }
          }
        }
      });

      if (!impression) {
        logger.warn('Impression not found for tracking', { requestId });
        return;
      }

      // Update impression
      await prisma.impression.update({
        where: { id: impression.id },
        data: {
          viewed: true,
          viewedAt: new Date()
        }
      });

      // Update campaign stats
      await prisma.campaign.update({
        where: { id: impression.bid.campaignId },
        data: {
          impressions: { increment: 1 },
          spent: { increment: impression.revenue || 0 }
        }
      });

      logger.debug('Impression tracked', { requestId });
    } catch (error) {
      logger.error('Failed to track impression', { requestId, error });
    }
  }

  /**
   * Track click
   */
  async trackClick(requestId: string) {
    try {
      const impression = await prisma.impression.findFirst({
        where: {
          bid: {
            requestId
          }
        },
        include: {
          bid: {
            include: {
              campaign: true
            }
          }
        }
      });

      if (!impression) {
        logger.warn('Impression not found for click tracking', { requestId });
        return null;
      }

      // Update impression
      await prisma.impression.update({
        where: { id: impression.id },
        data: {
          clicked: true,
          clickedAt: new Date()
        }
      });

      // Update campaign stats
      await prisma.campaign.update({
        where: { id: impression.bid.campaignId },
        data: {
          clicks: { increment: 1 }
        }
      });

      // Fetch creative for click URL
      const creative = await prisma.creative.findFirst({
        where: {
          campaigns: {
            some: {
              campaignId: impression.bid.campaignId
            }
          }
        }
      });

      logger.debug('Click tracked', { requestId });

      return creative?.clickUrl || null;
    } catch (error) {
      logger.error('Failed to track click', { requestId, error });
      return null;
    }
  }

  /**
   * Track conversion
   */
  async trackConversion(requestId: string, conversionValue?: number) {
    try {
      const impression = await prisma.impression.findFirst({
        where: {
          bid: {
            requestId
          }
        }
      });

      if (!impression) {
        logger.warn('Impression not found for conversion tracking', { requestId });
        return;
      }

      await prisma.impression.update({
        where: { id: impression.id },
        data: {
          converted: true,
          convertedAt: new Date()
        }
      });

      await prisma.campaign.update({
        where: { id: impression.bid.campaignId },
        data: {
          conversions: { increment: 1 }
        }
      });

      logger.info('Conversion tracked', { requestId, value: conversionValue });
    } catch (error) {
      logger.error('Failed to track conversion', { requestId, error });
    }
  }
}
