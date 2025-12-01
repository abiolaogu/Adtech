import { ProgrammaticBuyingEngine } from '../programmatic/ProgrammaticBuyingEngine';
import { FraudDetectionEngine } from '../security/FraudDetectionEngine';
import { RedisService } from '../caching/RedisService';
import { PartnerService } from '../adtech/rtb/PartnerService';
import { prisma } from '../../config/database';
import { logger } from '../../utils/logger';

/**
 * Core Ad Server - Enterprise-Grade Ad Serving Engine
 */

interface AdRequest {
  requestId: string;
  timestamp: number;

  // Placement details
  placementId: string;
  publisherId: string;
  siteId: string;
  pageUrl: string;
  adUnitId: string;

  // Format requirements
  format: 'display' | 'video' | 'native' | 'audio';
  sizes: string[]; // e.g., ['300x250', '728x90']

  // User context
  userId?: string;
  ipAddress: string;
  userAgent: string;
  deviceType: 'mobile' | 'desktop' | 'tablet' | 'ctv';
  geo: {
    country: string;
    region?: string;
    city?: string;
  };

  // Targeting
  keywords?: string[];
  categories?: string[];

  // Header bidding
  headerBidding?: {
    enabled: boolean;
    timeout: number;
    bidders: string[];
  };
}

interface AdResponse {
  requestId: string;
  adId: string;
  creativeId: string;

  // Delivery
  impressionUrl: string;
  clickUrl: string;
  creative: {
    type: 'html' | 'image' | 'video' | 'native';
    content: string;
    width: number;
    height: number;
  };

  // Tracking
  trackingPixels: string[];
  viewabilityTrackers: string[];

  // Metadata
  campaignId: string;
  advertiserId: string;
  price: number; // CPM
  currency: string;
  dealId?: string;

  // Timing
  responseTime: number;
}

interface DirectCampaign {
  id: string;
  advertiserId: string;
  priority: number; // 1-10, higher = more important
  status: 'active' | 'paused' | 'completed';

  // Budget
  dailyBudget: number;
  totalBudget: number;
  spent: number;

  // Delivery
  startDate: Date;
  endDate: Date;
  impressionGoal: number;
  impressionsPaced: number;

  // Targeting
  targeting: {
    geo: string[];
    devices: string[];
    dayParting?: {
      days: number[];
      hours: number[];
    };
    keywords?: string[];
    placements?: string[];
  };

  // Creative
  creatives: Array<{
    id: string;
    format: string;
    content: string;
    size: string;
  }>;

  // Pricing
  cpm: number;
  guaranteedDelivery: boolean;
}

export class AdServer {
  private static instance: AdServer;
  private redisService: RedisService;
  private programmaticEngine: ProgrammaticBuyingEngine;
  private fraudDetection: FraudDetectionEngine;
  private partnerService: PartnerService;

  private constructor() {
    this.redisService = RedisService.getInstance();
    this.programmaticEngine = new ProgrammaticBuyingEngine();
    this.fraudDetection = FraudDetectionEngine.getInstance();
    this.partnerService = PartnerService.getInstance();
  }

  public static getInstance(): AdServer {
    if (!AdServer.instance) {
      AdServer.instance = new AdServer();
    }
    return AdServer.instance;
  }

  /**
   * Main ad serving endpoint
   */
  async serveAd(request: AdRequest): Promise<AdResponse> {
    const startTime = Date.now();

    try {
      // 1. Validate request
      this.validateRequest(request);

      // 2. Fraud detection
      const fraudCheck = await this.fraudDetection.checkAdRequest({
        ipAddress: request.ipAddress,
        userAgent: request.userAgent,
        deviceId: request.userId,
        placementId: request.placementId,
        referrer: request.pageUrl
      });

      if (!fraudCheck.allowed) {
        throw new Error('Invalid traffic detected');
      }

      // 3. Try direct sales first (guaranteed campaigns)
      const directAd = await this.selectDirectCampaign(request);
      if (directAd) {
        return this.buildAdResponse(directAd, request, startTime);
      }

      // 4. Try header bidding if enabled
      if (request.headerBidding?.enabled) {
        const headerBidAd = await this.runHeaderBidding(request);
        if (headerBidAd) {
          return this.buildAdResponse(headerBidAd, request, startTime);
        }
      }

      // 5. Fall back to programmatic RTB
      const programmaticAd = await this.selectProgrammaticAd(request);
      if (programmaticAd) {
        return this.buildAdResponse(programmaticAd, request, startTime);
      }

      // 6. No fill - return house ad or passback
      return this.getHouseAd(request, startTime);

    } catch (error) {
      logger.error('Ad serving error:', error);
      throw error;
    }
  }

  /**
   * Select ad from direct sales campaigns
   */
  private async selectDirectCampaign(request: AdRequest): Promise<any> {
    // Get active campaigns from cache/DB
    const campaigns = await this.getActiveCampaigns();

    // Filter by targeting
    const eligible = campaigns.filter(campaign =>
      this.matchesTargeting(campaign, request) &&
      this.hasRemainingBudget(campaign) &&
      this.isWithinSchedule(campaign)
    );

    if (eligible.length === 0) return null;

    // Sort by priority
    eligible.sort((a, b) => b.priority - a.priority);

    // Apply pacing
    for (const campaign of eligible) {
      if (await this.shouldServeNow(campaign)) {
        // Select creative
        const creative = this.selectCreative(campaign, request);

        if (creative) {
          return {
            type: 'direct',
            campaign,
            creative,
            price: campaign.cpm
          };
        }
      }
    }

    return null;
  }

  /**
   * Run header bidding auction
   */
  private async runHeaderBidding(request: AdRequest): Promise<any> {
    const timeout = request.headerBidding!.timeout || 1000;

    // Get active SSP partners
    const partners = await prisma.partner.findMany({
      where: { type: 'SSP', active: true }
    });

    if (partners.length === 0) return null;

    // Call all bidders in parallel (simulated via PartnerService logic)
    // Note: PartnerService currently has requestBidFromDSP, we can adapt it or add requestBidFromSSP
    // For now, we'll simulate using a similar logic inline or add to PartnerService

    const bidPromises = partners.map((partner: any) =>
      this.simulateHeaderBid(partner, request, timeout)
    );

    const bids = await Promise.race([
      Promise.all(bidPromises),
      this.delay(timeout).then(() => [])
    ]);

    // Find highest bid
    const validBids = bids.filter((b: any) => b && b.price > 0);
    if (validBids.length === 0) return null;

    validBids.sort((a: any, b: any) => b.price - a.price);

    return {
      type: 'header_bidding',
      bidder: validBids[0].bidder,
      price: validBids[0].price,
      creative: validBids[0].creative
    };
  }

  /**
   * Simulate header bidder response
   */
  private async simulateHeaderBid(partner: any, request: AdRequest, timeout: number): Promise<any> {
    try {
      // Simulate latency
      await this.delay(Math.min(partner.latencyMs || 100, timeout));

      if (Math.random() > (partner.winRate || 0.5)) return null;

      return {
        bidder: partner.name,
        price: Math.random() * 5, // $0-$5 CPM
        creative: {
          type: 'html',
          content: `<div>Header Bid Ad from ${partner.name}</div>`,
          width: 300,
          height: 250
        }
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Select ad from programmatic marketplace
   */
  private async selectProgrammaticAd(request: AdRequest): Promise<any> {
    // Use programmatic buying engine
    const bidDecision = await this.programmaticEngine.makeBidDecision(
      {
        requestId: request.requestId,
        timestamp: request.timestamp,
        inventoryId: request.placementId,
        exchange: 'internal',
        publisherId: request.publisherId,
        domain: new URL(request.pageUrl).hostname,
        placementType: request.format,
        adSize: request.sizes[0],
        floorPrice: 0.5,
        userId: request.userId,
        deviceType: request.deviceType,
        os: 'unknown',
        geoCountry: request.geo.country,
        geoCity: request.geo.city,
        ipAddress: request.ipAddress,
        segments: [],
        interests: request.keywords || [],
        pageViews: 0,
        sessionDepth: 0,
        timeOnSite: 0,
        previousPurchases: 0
      },
      {
        campaignId: 'programmatic',
        advertiserId: 'rtb',
        dailyBudget: 10000,
        totalBudget: 100000,
        spentToday: 0,
        spentTotal: 0,
        targetAudience: [],
        creativeSizes: request.sizes,
        geoTargeting: [],
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }
    );

    if (!bidDecision.shouldBid) return null;

    return {
      type: 'programmatic',
      price: bidDecision.bidPrice,
      creative: {
        type: 'html',
        content: '<div>Programmatic Ad</div>',
        width: 300,
        height: 250
      }
    };
  }

  /**
   * Get house ad (default/fallback)
   */
  private getHouseAd(request: AdRequest, startTime: number): AdResponse {
    return {
      requestId: request.requestId,
      adId: 'house_ad',
      creativeId: 'house_creative',
      impressionUrl: '/track/impression/house',
      clickUrl: '/track/click/house',
      creative: {
        type: 'html',
        content: '<div>House Ad</div>',
        width: 300,
        height: 250
      },
      trackingPixels: [],
      viewabilityTrackers: [],
      campaignId: 'house',
      advertiserId: 'internal',
      price: 0,
      currency: 'USD',
      responseTime: Date.now() - startTime
    };
  }

  /**
   * Build ad response
   */
  private buildAdResponse(ad: any, request: AdRequest, startTime: number): AdResponse {
    const adId = `ad_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return {
      requestId: request.requestId,
      adId,
      creativeId: ad.creative?.id || 'creative_' + adId,
      impressionUrl: `/track/impression/${adId}`,
      clickUrl: `/track/click/${adId}`,
      creative: {
        type: ad.creative.type || 'html',
        content: ad.creative.content,
        width: ad.creative.width || 300,
        height: ad.creative.height || 250
      },
      trackingPixels: [
        `/pixel/view/${adId}`,
        `/pixel/viewability/${adId}`
      ],
      viewabilityTrackers: [
        `/viewability/start/${adId}`,
        `/viewability/complete/${adId}`
      ],
      campaignId: ad.campaign?.id || 'unknown',
      advertiserId: ad.campaign?.advertiserId || 'unknown',
      price: ad.price || 0,
      currency: 'USD',
      dealId: ad.dealId,
      responseTime: Date.now() - startTime
    };
  }

  /**
   * Track impression
   */
  async trackImpression(requestId: string, data?: {
    viewable: boolean;
    viewTime: number;
    clickthrough: boolean;
  }): Promise<void> {
    // Track in Redis
    await this.redisService.increment('metrics:impressions');

    if (data?.viewable) {
      await this.redisService.increment('metrics:viewable');
    }

    if (data?.clickthrough) {
      await this.redisService.increment('metrics:clicks');
    }

    // Update DB
    try {
      // Find impression by requestId (assuming requestId maps to bid.requestId or similar)
      // For now, we'll just log it as we might not have the mapping easily without a lookup
      logger.info(`Impression tracked for request ${requestId}`);
    } catch (error) {
      logger.error('Failed to track impression in DB', { requestId, error });
    }
  }

  /**
   * Track click
   */
  async trackClick(requestId: string): Promise<string | null> {
    await this.redisService.increment('metrics:clicks');
    logger.info(`Click tracked for request ${requestId}`);
    // In a real implementation, we would look up the click URL from the impression/creative
    // For now, return a placeholder or null
    return null;
  }

  /**
   * Track conversion
   */
  async trackConversion(requestId: string, value?: number): Promise<void> {
    await this.redisService.increment('metrics:conversions');
    if (value) {
      // Track revenue/value
    }
    logger.info(`Conversion tracked for request ${requestId}`, { value });
  }

  // Helper methods

  private validateRequest(request: AdRequest): void {
    if (!request.placementId) throw new Error('Missing placement ID');
    if (!request.format) throw new Error('Missing ad format');
    if (!request.sizes || request.sizes.length === 0) throw new Error('Missing ad sizes');
  }

  private async getActiveCampaigns(): Promise<DirectCampaign[]> {
    const cacheKey = 'campaigns:active:direct';

    return this.redisService.getOrSet(cacheKey, 60, async () => {
      const campaigns = await prisma.campaign.findMany({
        where: {
          status: 'ACTIVE',
          type: 'SPONSORED', // Assuming 'SPONSORED' maps to direct sales for now
          startDate: { lte: new Date() },
          OR: [
            { endDate: null },
            { endDate: { gte: new Date() } }
          ]
        },
        include: {
          creatives: {
            where: { active: true },
            include: { creative: true }
          }
        }
      });

      // Map to DirectCampaign interface
      return campaigns.map((c: any) => ({
        id: c.id,
        advertiserId: c.advertiserId,
        priority: 5, // Default priority
        status: 'active',
        dailyBudget: c.budget / 30, // Approx
        totalBudget: c.budget,
        spent: c.spent,
        startDate: c.startDate,
        endDate: c.endDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        impressionGoal: 1000000, // Default
        impressionsPaced: c.impressions,
        targeting: c.targeting as any,
        creatives: c.creatives.map((cc: any) => ({
          id: cc.creative.id,
          format: cc.creative.format,
          content: JSON.stringify(cc.creative.content),
          size: '300x250' // Default if not specified
        })),
        cpm: c.maxBid || 5.0,
        guaranteedDelivery: true
      }));
    });
  }

  private matchesTargeting(campaign: DirectCampaign, request: AdRequest): boolean {
    // Geo targeting
    if (campaign.targeting.geo && campaign.targeting.geo.length > 0) {
      if (!campaign.targeting.geo.includes(request.geo.country)) {
        return false;
      }
    }

    // Device targeting
    if (campaign.targeting.devices && campaign.targeting.devices.length > 0) {
      if (!campaign.targeting.devices.includes(request.deviceType)) {
        return false;
      }
    }

    return true;
  }

  private hasRemainingBudget(campaign: DirectCampaign): boolean {
    return campaign.spent < campaign.totalBudget;
  }

  private isWithinSchedule(campaign: DirectCampaign): boolean {
    const now = new Date();
    return now >= new Date(campaign.startDate) && now <= new Date(campaign.endDate);
  }

  private async shouldServeNow(campaign: DirectCampaign): Promise<boolean> {
    // Simple pacing: even distribution over time
    const start = new Date(campaign.startDate).getTime();
    const end = new Date(campaign.endDate).getTime();
    const totalDuration = end - start;
    const elapsed = Date.now() - start;
    const progress = elapsed / totalDuration;

    const targetImpressions = campaign.impressionGoal * progress;

    // Get real-time impression count from Redis
    const currentImpressions = await this.redisService.getOrSet(
      `campaign:${campaign.id}:impressions`,
      60,
      async () => campaign.impressionsPaced
    );

    const paceRatio = currentImpressions / targetImpressions;

    // Serve if we're behind pace
    return paceRatio < 1.1;
  }

  private selectCreative(campaign: DirectCampaign, request: AdRequest): any {
    // Find matching creative by size
    // Note: In a real app, we'd match exact sizes. Here we simplify.
    if (campaign.creatives.length > 0) {
      return campaign.creatives[0];
    }
    return null;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
