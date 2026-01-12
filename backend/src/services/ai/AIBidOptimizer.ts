import { prisma } from '../../config/database';
import { logger } from '../../utils/logger';
import { getRedisClient } from '../../config/redis';

/**
 * AI-Powered Bid Optimization Engine
 * Uses heuristic algorithms for predictive bidding and budget optimization
 */
export class AIBidOptimizer {
  private static instance: AIBidOptimizer;
  private redis = getRedisClient();

  private constructor() {}

  static getInstance(): AIBidOptimizer {
    if (!AIBidOptimizer.instance) {
      AIBidOptimizer.instance = new AIBidOptimizer();
    }
    return AIBidOptimizer.instance;
  }

  /**
   * Predict optimal bid using heuristic model
   * Considers: device, time, location, user behavior, historical performance
   */
  async predictOptimalBid(params: {
    campaignId: string;
    deviceType: string;
    hour: number;
    dayOfWeek: number;
    country: string;
    inventoryType: string;
    floorPrice: number;
    userEngagementScore?: number;
  }): Promise<number> {
    try {
      // Get campaign historical performance
      const campaignStats = await this.getCampaignStats(params.campaignId);

      // Calculate bid using rule-based logic
      const optimizedBid = this.ruleBasedBid(params, campaignStats);

      // Cache prediction for analytics
      await this.redis.setex(
        `bid:prediction:${params.campaignId}`,
        3600,
        JSON.stringify({ bid: optimizedBid, timestamp: Date.now() })
      );

      logger.debug('AI bid prediction', {
        campaignId: params.campaignId,
        predicted: optimizedBid,
      });

      return optimizedBid;
    } catch (error) {
      logger.error('AI bid prediction failed', { error });
      return params.floorPrice;
    }
  }

  /**
   * Get campaign statistics for optimization
   */
  private async getCampaignStats(campaignId: string) {
    const cached = await this.redis.get(`campaign:stats:${campaignId}`);
    if (cached) {
      return JSON.parse(cached);
    }

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      return this.getDefaultStats();
    }

    const stats = {
      avgCtr: campaign.impressions > 0 ? campaign.clicks / campaign.impressions : 0,
      avgConversionRate: campaign.clicks > 0 ? campaign.conversions / campaign.clicks : 0,
      avgCpm: campaign.impressions > 0 ? (campaign.spent / campaign.impressions) * 1000 : 0,
      budgetUtilization: campaign.spent / campaign.budget,
      maxBid: campaign.maxBid || 5,
      competitionLevel: 0.5,
    };

    await this.redis.setex(`campaign:stats:${campaignId}`, 300, JSON.stringify(stats));

    return stats;
  }

  /**
   * Rule-based bidding logic
   */
  private ruleBasedBid(params: any, stats: any): number {
    let bid = params.floorPrice * 1.1; // Start 10% above floor

    // Adjust for performance
    if (stats.avgCtr > 0.02) bid *= 1.2;
    if (stats.avgConversionRate > 0.05) bid *= 1.3;

    // Adjust for time
    if (params.hour >= 9 && params.hour <= 17) bid *= 1.1; // Business hours

    // Adjust for device
    if (params.deviceType === 'mobile') bid *= 1.15;

    // Adjust for user engagement
    if (params.userEngagementScore && params.userEngagementScore > 0.7) bid *= 1.2;

    // Cap at max bid
    return Math.min(bid, stats.maxBid || 10);
  }

  /**
   * Get default stats for new campaigns
   */
  private getDefaultStats() {
    return {
      avgCtr: 0.01,
      avgConversionRate: 0.02,
      avgCpm: 2.0,
      budgetUtilization: 0,
      maxBid: 5,
      competitionLevel: 0.5,
    };
  }

  /**
   * A/B test different bidding strategies
   */
  async runBidExperiment(params: {
    campaignId: string;
    strategies: string[];
    trafficSplit: number[];
  }) {
    // Randomly assign strategy based on traffic split
    const random = Math.random();
    let cumulative = 0;

    for (let i = 0; i < params.strategies.length; i++) {
      cumulative += params.trafficSplit[i];
      if (random <= cumulative) {
        await this.redis.hincrby(`experiment:${params.campaignId}`, params.strategies[i], 1);
        return params.strategies[i];
      }
    }

    return params.strategies[0];
  }
}
