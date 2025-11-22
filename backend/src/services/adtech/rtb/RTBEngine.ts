import { Server as SocketServer } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { getRedisClient } from '../../../config/redis';
import { logger } from '../../../utils/logger';
import { prisma } from '../../../config/database';
import { BidRequest, BidResponse, AuctionResult } from './types';

/**
 * RTB Engine - Handles real-time bidding auctions
 * Inspired by OpenX's Demand Fusion technology
 */
export class RTBEngine {
  private static instance: RTBEngine;
  private io?: SocketServer;
  private redis = getRedisClient();
  private readonly RTB_TIMEOUT = parseInt(process.env.RTB_TIMEOUT_MS || '100');

  private constructor() {}

  static getInstance(): RTBEngine {
    if (!RTBEngine.instance) {
      RTBEngine.instance = new RTBEngine();
    }
    return RTBEngine.instance;
  }

  async initialize(io: SocketServer): Promise<void> {
    this.io = io;
    logger.info('RTB Engine initialized');
  }

  /**
   * Main RTB auction handler
   * Runs a real-time auction for an ad placement
   */
  async runAuction(bidRequest: BidRequest): Promise<AuctionResult> {
    const auctionId = uuidv4();
    const startTime = Date.now();

    logger.debug('Starting RTB auction', { auctionId, placementId: bidRequest.placementId });

    try {
      // 1. Find eligible campaigns
      const eligibleCampaigns = await this.findEligibleCampaigns(bidRequest);

      if (eligibleCampaigns.length === 0) {
        logger.debug('No eligible campaigns found', { auctionId });
        return this.createNoFillResult(auctionId, bidRequest);
      }

      // 2. Request bids from DSPs (demand-side platforms)
      const bidPromises = eligibleCampaigns.map(campaign =>
        this.requestBid(campaign, bidRequest, auctionId)
      );

      // 3. Wait for bids with timeout
      const bids = await Promise.race([
        Promise.allSettled(bidPromises),
        this.timeout(this.RTB_TIMEOUT)
      ]) as PromiseSettledResult<BidResponse>[];

      const validBids = bids
        .filter((result): result is PromiseFulfilledResult<BidResponse> =>
          result.status === 'fulfilled' && result.value.bidPrice > 0
        )
        .map(result => result.value);

      if (validBids.length === 0) {
        logger.debug('No valid bids received', { auctionId });
        return this.createNoFillResult(auctionId, bidRequest);
      }

      // 4. Run second-price auction (highest bidder wins, pays second-highest price)
      const auctionResult = this.runSecondPriceAuction(
        validBids,
        bidRequest.floorPrice,
        auctionId,
        bidRequest
      );

      // 5. Store auction results
      await this.storeAuctionResult(auctionResult);

      // 6. Emit real-time auction events
      this.emitAuctionEvent(auctionResult);

      const duration = Date.now() - startTime;
      logger.info('Auction completed', {
        auctionId,
        winner: auctionResult.winningBid?.campaignId,
        price: auctionResult.clearingPrice,
        duration: `${duration}ms`
      });

      return auctionResult;

    } catch (error) {
      logger.error('Auction failed', { auctionId, error });
      return this.createNoFillResult(auctionId, bidRequest);
    }
  }

  /**
   * Find campaigns eligible for this bid request
   */
  private async findEligibleCampaigns(bidRequest: BidRequest) {
    const now = new Date();

    const campaigns = await prisma.campaign.findMany({
      where: {
        status: 'ACTIVE',
        startDate: { lte: now },
        OR: [
          { endDate: null },
          { endDate: { gte: now } }
        ],
        spent: {
          lt: prisma.campaign.fields.budget
        }
      },
      include: {
        advertiser: true,
        creatives: {
          where: { active: true },
          include: { creative: true }
        }
      }
    });

    // Filter by targeting rules
    return campaigns.filter(campaign =>
      this.matchesTargeting(campaign, bidRequest)
    );
  }

  /**
   * Check if bid request matches campaign targeting
   */
  private matchesTargeting(campaign: any, bidRequest: BidRequest): boolean {
    const targeting = campaign.targeting as any;

    // Device targeting
    if (targeting.devices && !targeting.devices.includes(bidRequest.deviceType)) {
      return false;
    }

    // Geo targeting
    if (targeting.countries && !targeting.countries.includes(bidRequest.country)) {
      return false;
    }

    // Inventory type targeting
    if (targeting.inventoryTypes && !targeting.inventoryTypes.includes(bidRequest.inventoryType)) {
      return false;
    }

    return true;
  }

  /**
   * Request bid from a campaign (DSP simulation)
   */
  private async requestBid(
    campaign: any,
    bidRequest: BidRequest,
    auctionId: string
  ): Promise<BidResponse> {
    // Calculate bid based on strategy
    let bidPrice = 0;

    switch (campaign.bidStrategy) {
      case 'CPM':
        bidPrice = campaign.maxBid || 0;
        break;
      case 'CPC':
        // Estimate CPM from CPC based on expected CTR
        const estimatedCTR = 0.01; // 1% CTR assumption
        bidPrice = (campaign.maxBid || 0) * estimatedCTR * 1000;
        break;
      case 'FIXED':
        bidPrice = campaign.maxBid || 0;
        break;
      default:
        bidPrice = bidRequest.floorPrice;
    }

    // Apply pacing to prevent budget exhaustion
    const pacingFactor = await this.calculatePacingFactor(campaign);
    bidPrice *= pacingFactor;

    return {
      bidId: uuidv4(),
      campaignId: campaign.id,
      advertiserId: campaign.advertiserId,
      bidPrice: Math.max(bidPrice, bidRequest.floorPrice),
      creativeId: campaign.creatives[0]?.creativeId,
      metadata: {
        bidStrategy: campaign.bidStrategy,
        originalBid: campaign.maxBid
      }
    };
  }

  /**
   * Calculate pacing factor to spread budget over campaign duration
   */
  private async calculatePacingFactor(campaign: any): Promise<number> {
    const now = Date.now();
    const start = new Date(campaign.startDate).getTime();
    const end = campaign.endDate ? new Date(campaign.endDate).getTime() : now + 30 * 24 * 60 * 60 * 1000;

    const totalDuration = end - start;
    const elapsed = now - start;
    const progress = elapsed / totalDuration;

    const spendProgress = campaign.spent / campaign.budget;

    // If spending too fast, reduce pacing
    if (spendProgress > progress + 0.1) {
      return 0.5;
    }

    // If spending too slow, increase pacing
    if (spendProgress < progress - 0.1) {
      return 1.5;
    }

    return 1.0;
  }

  /**
   * Run second-price auction (Vickrey auction)
   */
  private runSecondPriceAuction(
    bids: BidResponse[],
    floorPrice: number,
    auctionId: string,
    bidRequest: BidRequest
  ): AuctionResult {
    // Sort bids by price descending
    const sortedBids = [...bids].sort((a, b) => b.bidPrice - a.bidPrice);

    const winningBid = sortedBids[0];
    const secondPrice = sortedBids.length > 1 ? sortedBids[1].bidPrice : floorPrice;
    const clearingPrice = Math.max(secondPrice, floorPrice);

    return {
      auctionId,
      winningBid,
      clearingPrice,
      allBids: bids,
      bidRequest,
      timestamp: new Date()
    };
  }

  /**
   * Create no-fill result when no bids are available
   */
  private createNoFillResult(auctionId: string, bidRequest: BidRequest): AuctionResult {
    return {
      auctionId,
      winningBid: null,
      clearingPrice: 0,
      allBids: [],
      bidRequest,
      timestamp: new Date()
    };
  }

  /**
   * Store auction result in database
   */
  private async storeAuctionResult(result: AuctionResult): Promise<void> {
    if (!result.winningBid) return;

    try {
      await prisma.bid.create({
        data: {
          requestId: result.auctionId,
          campaignId: result.winningBid.campaignId,
          placementId: result.bidRequest.placementId,
          bidPrice: result.winningBid.bidPrice,
          floorPrice: result.bidRequest.floorPrice,
          won: true,
          userContext: result.bidRequest.userContext || {},
          deviceType: result.bidRequest.deviceType
        }
      });

      // Update campaign spent (will be finalized on impression)
      await this.redis.hincrby(
        `campaign:${result.winningBid.campaignId}:stats`,
        'pendingSpend',
        Math.round(result.clearingPrice * 100)
      );
    } catch (error) {
      logger.error('Failed to store auction result', { error });
    }
  }

  /**
   * Emit real-time auction events via WebSocket
   */
  private emitAuctionEvent(result: AuctionResult): void {
    if (!this.io) return;

    this.io.emit('auction:completed', {
      auctionId: result.auctionId,
      won: !!result.winningBid,
      price: result.clearingPrice,
      campaignId: result.winningBid?.campaignId
    });
  }

  /**
   * Timeout helper
   */
  private timeout(ms: number): Promise<never[]> {
    return new Promise(resolve => setTimeout(() => resolve([]), ms));
  }
}
