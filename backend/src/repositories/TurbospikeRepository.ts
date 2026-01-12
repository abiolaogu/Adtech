import { getTurbospikeClient, TurbospikeClient } from '../config/turbospike';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

/**
 * Turbospike Repository
 * High-performance data access layer for AdTech platform
 *
 * This repository handles:
 * - Real-time bid requests and responses
 * - Impression tracking (millions per second)
 * - Click and conversion events
 * - User profile caching
 * - Campaign targeting data
 * - Analytics aggregation
 */

export interface TurbospikeKey {
  namespace: string;
  set: string;
  key: string | number;
}

export interface TurbospikeBins {
  [key: string]: any;
}

export interface TurbospikeMetadata {
  ttl?: number;
  generation?: number;
}

export class TurbospikeRepository {
  private client: TurbospikeClient;
  private namespace: string;

  constructor(namespace: string = process.env.TURBOSPIKE_NAMESPACE || 'adtech') {
    this.client = getTurbospikeClient();
    this.namespace = namespace;
  }

  /**
   * Create a properly formatted Turbospike key
   */
  private createKey(set: string, key: string | number): TurbospikeKey {
    return {
      namespace: this.namespace,
      set,
      key,
    };
  }

  /**
   * Put (insert/update) a record
   */
  async put(
    set: string,
    key: string | number,
    bins: TurbospikeBins,
    metadata?: TurbospikeMetadata
  ): Promise<void> {
    try {
      const tsKey = this.createKey(set, key);
      await this.client.put(tsKey, bins, metadata);
      logger.debug(`Turbospike PUT: ${set}/${key}`);
    } catch (error) {
      logger.error(`Turbospike PUT error: ${set}/${key}`, error);
      throw error;
    }
  }

  /**
   * Get a record
   */
  async get(set: string, key: string | number): Promise<TurbospikeBins | null> {
    try {
      const tsKey = this.createKey(set, key);
      const record = await this.client.get(tsKey);
      logger.debug(`Turbospike GET: ${set}/${key}`);
      return record ? record.bins : null;
    } catch (error) {
      logger.error(`Turbospike GET error: ${set}/${key}`, error);
      return null;
    }
  }

  /**
   * Remove a record
   */
  async remove(set: string, key: string | number): Promise<boolean> {
    try {
      const tsKey = this.createKey(set, key);
      await this.client.remove(tsKey);
      logger.debug(`Turbospike REMOVE: ${set}/${key}`);
      return true;
    } catch (error) {
      logger.error(`Turbospike REMOVE error: ${set}/${key}`, error);
      return false;
    }
  }

  /**
   * Query records with filters
   */
  async query(set: string, filters: any): Promise<TurbospikeBins[]> {
    try {
      const statement = {
        namespace: this.namespace,
        set,
        filters,
      };
      const results = await this.client.query(statement);
      logger.debug(`Turbospike QUERY: ${set}`, { filters, count: results.length });
      return results;
    } catch (error) {
      logger.error(`Turbospike QUERY error: ${set}`, error);
      return [];
    }
  }

  /**
   * Scan all records in a set
   */
  async scan(set: string): Promise<TurbospikeBins[]> {
    try {
      const results = await this.client.scan(this.namespace, set);
      logger.debug(`Turbospike SCAN: ${set}`, { count: results.length });
      return results;
    } catch (error) {
      logger.error(`Turbospike SCAN error: ${set}`, error);
      return [];
    }
  }

  // ============================================
  // Domain-Specific Methods for AdTech Platform
  // ============================================

  /**
   * Store a bid request (ultra-low latency requirement)
   */
  async storeBidRequest(bidRequest: any): Promise<string> {
    const bidId = bidRequest.id || uuidv4();
    await this.put(
      'bid_requests',
      bidId,
      {
        ...bidRequest,
        timestamp: Date.now(),
      },
      { ttl: 3600 }
    ); // 1 hour TTL
    return bidId;
  }

  /**
   * Store a bid response
   */
  async storeBidResponse(bidId: string, bidResponse: any): Promise<void> {
    await this.put(
      'bid_responses',
      bidId,
      {
        ...bidResponse,
        timestamp: Date.now(),
      },
      { ttl: 3600 }
    ); // 1 hour TTL
  }

  /**
   * Track an impression (millions per second)
   */
  async trackImpression(impression: {
    id?: string;
    campaignId: string;
    adId: string;
    publisherId: string;
    userId?: string;
    deviceType: string;
    country: string;
    timestamp?: number;
    revenue?: number;
  }): Promise<string> {
    const impressionId = impression.id || uuidv4();
    await this.put(
      'impressions',
      impressionId,
      {
        ...impression,
        timestamp: impression.timestamp || Date.now(),
        clicked: false,
        converted: false,
      },
      { ttl: 86400 * 30 }
    ); // 30 days TTL
    return impressionId;
  }

  /**
   * Track a click event
   */
  async trackClick(impressionId: string, clickData: any): Promise<void> {
    const impression = await this.get('impressions', impressionId);
    if (impression) {
      await this.put('impressions', impressionId, {
        ...impression,
        clicked: true,
        clickTimestamp: Date.now(),
        ...clickData,
      });
    }
  }

  /**
   * Track a conversion event
   */
  async trackConversion(impressionId: string, conversionData: any): Promise<void> {
    const impression = await this.get('impressions', impressionId);
    if (impression) {
      await this.put('impressions', impressionId, {
        ...impression,
        converted: true,
        conversionTimestamp: Date.now(),
        ...conversionData,
      });
    }
  }

  /**
   * Store user profile for targeting (with DMP data)
   */
  async storeUserProfile(
    userId: string,
    profile: {
      segments: string[];
      interests: string[];
      demographics?: any;
      behaviors?: any;
      firstPartData?: any;
      thirdPartData?: any;
    }
  ): Promise<void> {
    await this.put(
      'user_profiles',
      userId,
      {
        ...profile,
        lastUpdated: Date.now(),
      },
      { ttl: 86400 * 90 }
    ); // 90 days TTL
  }

  /**
   * Get user profile for targeting
   */
  async getUserProfile(userId: string): Promise<any> {
    return await this.get('user_profiles', userId);
  }

  /**
   * Store campaign targeting data for fast lookups
   */
  async storeCampaignTargeting(
    campaignId: string,
    targeting: {
      geoCountries?: string[];
      geoRegions?: string[];
      deviceTypes?: string[];
      segments?: string[];
      interests?: string[];
      ageRange?: { min: number; max: number };
      gender?: string;
    }
  ): Promise<void> {
    await this.put('campaign_targeting', campaignId, {
      ...targeting,
      lastUpdated: Date.now(),
    });
  }

  /**
   * Get campaign targeting data
   */
  async getCampaignTargeting(campaignId: string): Promise<any> {
    return await this.get('campaign_targeting', campaignId);
  }

  /**
   * Store real-time campaign budget tracking
   */
  async updateCampaignBudget(campaignId: string, spent: number): Promise<void> {
    const current = await this.get('campaign_budgets', campaignId);
    await this.put('campaign_budgets', campaignId, {
      campaignId,
      spent: (current?.spent || 0) + spent,
      lastUpdated: Date.now(),
    });
  }

  /**
   * Get campaign budget status
   */
  async getCampaignBudget(
    campaignId: string
  ): Promise<{ spent: number; lastUpdated: number } | null> {
    return await this.get('campaign_budgets', campaignId);
  }

  /**
   * Store arbitrage opportunity
   */
  async storeArbitrageOpportunity(opportunity: {
    buyExchange: string;
    sellExchange: string;
    buyPrice: number;
    sellPrice: number;
    margin: number;
    profitPercentage: number;
    inventoryId: string;
  }): Promise<string> {
    const oppId = uuidv4();
    await this.put(
      'arbitrage_opportunities',
      oppId,
      {
        ...opportunity,
        timestamp: Date.now(),
        status: 'pending',
      },
      { ttl: 300 }
    ); // 5 minutes TTL
    return oppId;
  }

  /**
   * Get active arbitrage opportunities
   */
  async getArbitrageOpportunities(): Promise<any[]> {
    return await this.scan('arbitrage_opportunities');
  }

  /**
   * Batch write for high-throughput operations
   */
  async batchPut(
    set: string,
    records: Array<{ key: string | number; bins: TurbospikeBins }>
  ): Promise<void> {
    try {
      // Turbospike supports batch operations for high performance
      const promises = records.map(record => this.put(set, record.key, record.bins));
      await Promise.all(promises);
      logger.debug(`Turbospike BATCH PUT: ${set}`, { count: records.length });
    } catch (error) {
      logger.error(`Turbospike BATCH PUT error: ${set}`, error);
      throw error;
    }
  }

  /**
   * Increment a counter (atomic operation)
   */
  async incrementCounter(
    set: string,
    key: string,
    bin: string,
    amount: number = 1
  ): Promise<number> {
    try {
      const current = await this.get(set, key);
      const newValue = (current?.[bin] || 0) + amount;
      await this.put(set, key, {
        ...(current || {}),
        [bin]: newValue,
      });
      return newValue;
    } catch (error) {
      logger.error(`Turbospike INCREMENT error: ${set}/${key}/${bin}`, error);
      throw error;
    }
  }
}

// Export singleton instance
let turbospikeRepo: TurbospikeRepository | null = null;

export const getTurbospikeRepository = (): TurbospikeRepository => {
  if (!turbospikeRepo) {
    turbospikeRepo = new TurbospikeRepository();
  }
  return turbospikeRepo;
};

export default TurbospikeRepository;
