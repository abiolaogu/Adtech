import { prisma } from '../../../config/database';
import { logger } from '../../../utils/logger';
import { BidRequest, BidResponse } from './types';
import { v4 as uuidv4 } from 'uuid';

export class PartnerService {
  private static instance: PartnerService;

  private constructor() {}

  static getInstance(): PartnerService {
    if (!PartnerService.instance) {
      PartnerService.instance = new PartnerService();
    }
    return PartnerService.instance;
  }

  /**
   * Get all active DSP partners
   */
  async getActiveDSPs() {
    return prisma.partner.findMany({
      where: {
        type: 'DSP',
        active: true,
      },
    });
  }

  /**
   * Simulate a bid request to an external DSP
   */
  async requestBidFromDSP(partner: any, bidRequest: BidRequest): Promise<BidResponse | null> {
    const startTime = Date.now();

    try {
      // Simulate network latency
      await new Promise((resolve) => setTimeout(resolve, partner.latencyMs));

      // Simulate win/loss based on winRate
      if (Math.random() > partner.winRate) {
        return null; // No bid
      }

      // Simulate bid price (random between floor price and 2x floor price)
      const bidPrice = bidRequest.floorPrice + Math.random() * bidRequest.floorPrice;

      return {
        bidId: uuidv4(),
        campaignId: `ext_${partner.id}`,
        advertiserId: `ext_adv_${partner.id}`,
        bidPrice: parseFloat(bidPrice.toFixed(2)),
        creativeId: `ext_creative_${uuidv4()}`,
        metadata: {
          partnerId: partner.id,
          partnerName: partner.name,
          latency: Date.now() - startTime,
        },
      };
    } catch (error) {
      logger.error(`Error requesting bid from DSP ${partner.name}:`, error);
      return null;
    }
  }
}
