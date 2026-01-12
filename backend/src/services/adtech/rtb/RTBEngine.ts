import { Server as SocketServer } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../../utils/logger';
import { prisma } from '../../../config/database';
import { BidRequest, BidResponse, AuctionResult } from './types';
import { PartnerService } from './PartnerService';
import { RedisService } from '../../caching/RedisService';
import { TurbospikeService } from '../../database/TurbospikeService';

/**
 * RTB Engine - Handles real-time bidding auctions
 * Inspired by OpenX's Demand Fusion technology
 */
export class RTBEngine {
  private static instance: RTBEngine;
  private io?: SocketServer;
  private redisService = RedisService.getInstance();
  private partnerService = PartnerService.getInstance();
  private turbospikeService = TurbospikeService.getInstance();
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

    try {
      // 1. Enrich request with user data from Turbospike (High-Performance KV)
      let userProfile = null;
      if (bidRequest.userId) {
        userProfile = await this.turbospikeService.get('users', bidRequest.userId);
        if (userProfile) {
          logger.debug(
            `Enriched bid request with Turbospike profile for user ${bidRequest.userId}`
          );
          bidRequest.user = { ...bidRequest.user, ...userProfile };
        }
      }

      logger.debug('Starting RTB auction', { auctionId, placementId: bidRequest.placementId });

      // 1. Find eligible internal campaigns
      const internalCampaigns = await this.findEligibleCampaigns(bidRequest);

      // 2. Get active external DSPs
      const externalDSPs = await this.partnerService.getActiveDSPs();

      if (internalCampaigns.length === 0 && externalDSPs.length === 0) {
        logger.debug('No eligible campaigns or DSPs found', { auctionId });
        return this.createNoFillResult(auctionId, bidRequest);
      }

      // 3. Request bids from Internal Campaigns and External DSPs
      const internalBidPromises = internalCampaigns.map((campaign) =>
        this.requestInternalBid(campaign, bidRequest, auctionId)
      );

      const externalBidPromises = externalDSPs.map((dsp: any) =>
        this.partnerService.requestBidFromDSP(dsp, bidRequest)
      );

      // 4. Wait for bids with timeout
      const allPromises = [...internalBidPromises, ...externalBidPromises];

      const results = (await Promise.race([
        Promise.allSettled(allPromises),
        this.timeout(this.RTB_TIMEOUT),
      ])) as PromiseSettledResult<BidResponse | null>[];

      const validBids = results
        .filter(
          (result): result is PromiseFulfilledResult<BidResponse> =>
            result.status === 'fulfilled' && result.value !== null && result.value.bidPrice > 0
        )
        .map((result) => result.value);

      if (validBids.length === 0) {
        logger.debug('No valid bids received', { auctionId });
        return this.createNoFillResult(auctionId, bidRequest);
      }

      // 5. Run second-price auction (highest bidder wins, pays second-highest price)
      const auctionResult = this.runSecondPriceAuction(
        validBids,
        bidRequest.floorPrice,
        auctionId,
        bidRequest
      );

      // 6. Store auction results
      await this.storeAuctionResult(auctionResult);

      // 7. Emit real-time auction events
      this.emitAuctionEvent(auctionResult);

      const duration = Date.now() - startTime;
      logger.info('Auction completed', {
        auctionId,
        winner: auctionResult.winningBid?.campaignId,
        price: auctionResult.clearingPrice,
        duration: `${duration}ms`,
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

    // Cache key for active campaigns
    const cacheKey = 'campaigns:active:rtb';

    // Try to get from cache first, or fetch from DB
    const campaigns = await this.redisService.getOrSet(cacheKey, 60, async () => {
      return prisma.campaign.findMany({
        where: {
          status: 'ACTIVE',
          startDate: { lte: now },
          OR: [{ endDate: null }, { endDate: { gte: now } }],
        },
        include: {
          advertiser: true,
          creatives: {
            where: { active: true },
            include: { creative: true },
          },
        },
      });
    });

    // Filter by targeting rules and budget
    // Note: Budget check should ideally be done with Redis counters for real-time accuracy
    const eligibleCampaigns = [];

    for (const campaign of campaigns) {
      if (this.matchesTargeting(campaign, bidRequest)) {
        // Check real-time budget
        const spent = await this.redisService.getOrSet(
          `campaign:${campaign.id}:spent`,
          300,
          async () => campaign.spent
        );
        if (spent < campaign.budget) {
          eligibleCampaigns.push(campaign);
        }
      }
    }

    return eligibleCampaigns;
  }

  /**
   * Check if bid request matches campaign targeting
   */
  private matchesTargeting(campaign: any, bidRequest: BidRequest): boolean {
    const targeting = campaign.targeting;

    // Device targeting
    if (
      targeting.devices &&
      targeting.devices.length > 0 &&
      !targeting.devices.includes(bidRequest.deviceType)
    ) {
      return false;
    }

    // Geo targeting
    if (
      targeting.countries &&
      targeting.countries.length > 0 &&
      !targeting.countries.includes(bidRequest.country)
    ) {
      return false;
    }

    // Inventory type targeting
    if (
      targeting.inventoryTypes &&
      targeting.inventoryTypes.length > 0 &&
      !targeting.inventoryTypes.includes(bidRequest.inventoryType)
    ) {
      return false;
    }

    return true;
  }

  /**
   * Request bid from an internal campaign
   */
  private async requestInternalBid(
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
      bidPrice: parseFloat(Math.max(bidPrice, bidRequest.floorPrice).toFixed(2)),
      creativeId: campaign.creatives[0]?.creativeId,
      metadata: {
        bidStrategy: campaign.bidStrategy,
        originalBid: campaign.maxBid,
        pacingFactor,
      },
    };
  }

  /**
   * Calculate pacing factor to spread budget over campaign duration
   */
  private async calculatePacingFactor(campaign: any): Promise<number> {
    const now = Date.now();
    const start = new Date(campaign.startDate).getTime();
    const end = campaign.endDate
      ? new Date(campaign.endDate).getTime()
      : now + 30 * 24 * 60 * 60 * 1000;

    const totalDuration = end - start;
    const elapsed = now - start;
    const progress = elapsed / totalDuration;

    // Get real-time spend from Redis
    const currentSpend = await this.redisService.getOrSet(
      `campaign:${campaign.id}:spent`,
      60,
      async () => campaign.spent
    );
    const spendProgress = currentSpend / campaign.budget;

    // If spending too fast, reduce pacing
    if (spendProgress > progress + 0.05) {
      return 0.1; // Slow down significantly
    }

    // If spending too slow, increase pacing
    if (spendProgress < progress - 0.05) {
      return 1.2; // Boost slightly
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
      timestamp: new Date(),
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
      timestamp: new Date(),
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
          deviceType: result.bidRequest.deviceType,
        },
      });

      // Update campaign pending spend in Redis
      // This is "pending" until the impression is actually confirmed
      if (!result.winningBid.campaignId.startsWith('ext_')) {
        await this.redisService.incrementHash(
          `campaign:${result.winningBid.campaignId}:stats`,
          'pendingSpend',
          result.clearingPrice
        );
      }
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
      campaignId: result.winningBid?.campaignId,
    });
  }

  /**
   * Timeout helper
   */
  private timeout(ms: number): Promise<never[]> {
    return new Promise((resolve) => setTimeout(() => resolve([]), ms));
  }
}
