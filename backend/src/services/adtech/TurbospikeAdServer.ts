import { getTurbospikeRepository } from '../../repositories/TurbospikeRepository';
import { logger } from '../../utils/logger';

/**
 * Turbospike-powered Ad Server
 * Ultra-low latency ad serving using Turbospike (Aerospike fork)
 *
 * Performance Targets:
 * - <5ms ad selection
 * - 10M+ requests per second
 * - Sub-millisecond data retrieval
 * - Real-time budget tracking
 * - Instant targeting evaluation
 */

export interface AdRequest {
  placementId: string;
  publisherId: string;
  siteId?: string;
  deviceType: string;
  country: string;
  region?: string;
  city?: string;
  userId?: string;
  userSegments?: string[];
  userInterests?: string[];
  ip?: string;
  userAgent?: string;
  referrer?: string;
}

export interface AdResponse {
  adId: string;
  campaignId: string;
  creativeId: string;
  impressionId: string;
  creative: {
    type: string;
    content: string;
    width: number;
    height: number;
    clickUrl: string;
    impressionTrackingUrl: string;
  };
  price: number;
  currency: string;
  responseTime: number;
}

export class TurbospikeAdServer {
  private static instance: TurbospikeAdServer;
  private repo = getTurbospikeRepository();

  private constructor() {}

  public static getInstance(): TurbospikeAdServer {
    if (!TurbospikeAdServer.instance) {
      TurbospikeAdServer.instance = new TurbospikeAdServer();
    }
    return TurbospikeAdServer.instance;
  }

  /**
   * Serve an ad - Ultra-fast ad selection
   */
  async serveAd(request: AdRequest): Promise<AdResponse | null> {
    const startTime = Date.now();

    try {
      // Step 1: Get or create user profile (sub-ms with Turbospike)
      let userProfile = null;
      if (request.userId) {
        userProfile = await this.repo.getUserProfile(request.userId);

        // Merge request segments with stored profile
        if (userProfile) {
          request.userSegments = [
            ...(request.userSegments || []),
            ...(userProfile.segments || []),
          ];
          request.userInterests = [
            ...(request.userInterests || []),
            ...(userProfile.interests || []),
          ];
        }
      }

      // Step 2: Find matching campaigns (using Turbospike secondary indexes)
      const eligibleCampaigns = await this.findEligibleCampaigns(request);

      if (eligibleCampaigns.length === 0) {
        logger.debug('No eligible campaigns found for request', request);
        return null;
      }

      // Step 3: Select best campaign (considering budget, targeting, bid price)
      const selectedCampaign = await this.selectBestCampaign(eligibleCampaigns, request);

      if (!selectedCampaign) {
        return null;
      }

      // Step 4: Track impression in Turbospike (async, non-blocking)
      const impressionId = await this.repo.trackImpression({
        campaignId: selectedCampaign.id,
        adId: selectedCampaign.adId,
        publisherId: request.publisherId,
        userId: request.userId,
        deviceType: request.deviceType,
        country: request.country,
        revenue: selectedCampaign.bidPrice,
      });

      // Step 5: Update budget tracking (atomic operation in Turbospike)
      await this.repo.updateCampaignBudget(
        selectedCampaign.id,
        selectedCampaign.bidPrice,
      );

      const responseTime = Date.now() - startTime;

      logger.info('Ad served successfully', {
        impressionId,
        campaignId: selectedCampaign.id,
        responseTime: `${responseTime}ms`,
      });

      return {
        adId: selectedCampaign.adId,
        campaignId: selectedCampaign.id,
        creativeId: selectedCampaign.creativeId,
        impressionId,
        creative: selectedCampaign.creative,
        price: selectedCampaign.bidPrice,
        currency: 'USD',
        responseTime,
      };
    } catch (error) {
      logger.error('Error serving ad:', error);
      return null;
    }
  }

  /**
   * Find eligible campaigns based on targeting
   */
  private async findEligibleCampaigns(request: AdRequest): Promise<any[]> {
    // This would query Turbospike using secondary indexes
    // For now, return mock data - replace with actual Turbospike queries

    const campaigns = await this.repo.scan('campaign_targeting');

    return campaigns.filter((campaign: any) => {
      // Geo targeting
      if (campaign.geoCountries && !campaign.geoCountries.includes(request.country)) {
        return false;
      }

      // Device targeting
      if (campaign.deviceTypes && !campaign.deviceTypes.includes(request.deviceType)) {
        return false;
      }

      // Segment targeting
      if (campaign.segments && request.userSegments) {
        const hasMatchingSegment = campaign.segments.some((seg: string) =>
          request.userSegments?.includes(seg),
        );
        if (!hasMatchingSegment) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Select the best campaign based on multiple factors
   */
  private async selectBestCampaign(campaigns: any[], request: AdRequest): Promise<any | null> {
    // Score each campaign
    const scoredCampaigns = await Promise.all(
      campaigns.map(async (campaign) => {
        let score = 0;

        // Factor 1: Bid price (40% weight)
        score += (campaign.bidPrice || 1) * 0.4;

        // Factor 2: Targeting match quality (30% weight)
        const targetingScore = this.calculateTargetingScore(campaign, request);
        score += targetingScore * 0.3;

        // Factor 3: Budget availability (20% weight)
        const budgetStatus = await this.repo.getCampaignBudget(campaign.id);
        const budgetScore =
          budgetStatus && campaign.totalBudget
            ? Math.max(0, 1 - budgetStatus.spent / campaign.totalBudget)
            : 1;
        score += budgetScore * 0.2;

        // Factor 4: Campaign performance (CTR) (10% weight)
        const perfScore = campaign.ctr || 0.01;
        score += perfScore * 0.1;

        return { ...campaign, score };
      }),
    );

    // Sort by score and return best
    scoredCampaigns.sort((a, b) => b.score - a.score);
    return scoredCampaigns[0] || null;
  }

  /**
   * Calculate how well the campaign targeting matches the request
   */
  private calculateTargetingScore(campaign: any, request: AdRequest): number {
    let score = 0;
    let factors = 0;

    // Geo match
    if (campaign.geoCountries?.includes(request.country)) {
      score += 1;
    }
    factors++;

    // Device match
    if (campaign.deviceTypes?.includes(request.deviceType)) {
      score += 1;
    }
    factors++;

    // Segment match
    if (campaign.segments && request.userSegments) {
      const matchingSegments = campaign.segments.filter((seg: string) =>
        request.userSegments?.includes(seg),
      );
      score += matchingSegments.length / campaign.segments.length;
      factors++;
    }

    // Interest match
    if (campaign.interests && request.userInterests) {
      const matchingInterests = campaign.interests.filter((int: string) =>
        request.userInterests?.includes(int),
      );
      score += matchingInterests.length / campaign.interests.length;
      factors++;
    }

    return factors > 0 ? score / factors : 0;
  }

  /**
   * Track a click event
   */
  async trackClick(impressionId: string, clickData?: any): Promise<void> {
    await this.repo.trackClick(impressionId, clickData || {});
    logger.info('Click tracked', { impressionId });
  }

  /**
   * Track a conversion event
   */
  async trackConversion(impressionId: string, conversionData: any): Promise<void> {
    await this.repo.trackConversion(impressionId, conversionData);
    logger.info('Conversion tracked', { impressionId, value: conversionData.value });
  }

  /**
   * Get campaign performance metrics (real-time from Turbospike)
   */
  async getCampaignMetrics(campaignId: string): Promise<any> {
    const impressions = await this.repo.query('impressions', {
      campaignId,
    });

    const clicks = impressions.filter((imp: any) => imp.clicked);
    const conversions = impressions.filter((imp: any) => imp.converted);

    return {
      impressions: impressions.length,
      clicks: clicks.length,
      conversions: conversions.length,
      ctr: impressions.length > 0 ? clicks.length / impressions.length : 0,
      cvr: clicks.length > 0 ? conversions.length / clicks.length : 0,
      revenue: impressions.reduce((sum: number, imp: any) => sum + (imp.revenue || 0), 0),
    };
  }
}

export default TurbospikeAdServer;
