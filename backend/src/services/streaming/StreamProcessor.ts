import { EventEmitter } from 'events';
import { getRedisClient, getRedisPubClient, getRedisSubClient } from '../../config/redis';
import { logger } from '../../utils/logger';
import { prisma } from '../../config/database';

export class StreamProcessor extends EventEmitter {
  private redis = getRedisClient();
  private pubClient = getRedisPubClient();
  private subClient = getRedisSubClient();
  private batchBuffer = new Map<string, any[]>();
  private processors = new Map<string, StreamHandler>();
  private readonly BATCH_SIZE = 100;
  private readonly BATCH_INTERVAL = 5000; // 5 seconds

  constructor() {
    super();
    this.startBatchProcessing();
  }
  /**
   * Publish event to stream
   */
  async publish(streamName: string, event: any) {
    try {
      // Add metadata
      const enrichedEvent = {
        ...event,
        timestamp: event.timestamp || Date.now(),
        streamId: `${streamName}-${Date.now()}-${Math.random()}`
      };

      // Publish to Redis stream
      await this.pubClient.publish(
        `stream:${streamName}`,
        JSON.stringify(enrichedEvent)
      );

      // Also add to Redis Stream for persistence
      await this.redis.xadd(
        `stream:${streamName}:log`,
        '*',
        'data',
        JSON.stringify(enrichedEvent)
      );

      // Emit local event
      this.emit(streamName, enrichedEvent);

    } catch (error) {
      logger.error('Failed to publish stream event', { streamName, error });
    }
  }

  /**
   * Handle incoming stream event
   */
  private handleStreamEvent(streamName: string, event: any) {
    const buffer = this.batchBuffer.get(streamName);
    if (buffer) {
      buffer.push(event);

      // Check if batch is ready
      const handler = this.processors.get(streamName);
      if (handler && buffer.length >= this.BATCH_SIZE) {
        this.processBatch(streamName, [...buffer]);
        buffer.length = 0; // Clear buffer
      }
    }
  }

  /**
   * Start periodic batch processing
   */
  private startBatchProcessing() {
    setInterval(() => {
      this.batchBuffer.forEach((buffer, streamName) => {
        if (buffer.length > 0) {
          this.processBatch(streamName, [...buffer]);
          buffer.length = 0;
        }
      });
    }, this.BATCH_INTERVAL);
  }

  /**
   * Process a batch of events
   */
  private async processBatch(streamName: string, events: any[]) {
    const handler = this.processors.get(streamName);
    if (!handler) return;

    try {
      const startTime = Date.now();

      await handler.process(events);

      const duration = Date.now() - startTime;
      logger.debug('Batch processed', {
        stream: streamName,
        count: events.length,
        duration: `${duration}ms`,
        throughput: `${(events.length / duration * 1000).toFixed(0)} events/sec`
      });

      // Update metrics
      await this.updateStreamMetrics(streamName, events.length, duration);

    } catch (error) {
      logger.error('Batch processing failed', { streamName, error });
    }
  }

  /**
   * Process impression events
   */
  private async processImpressions(events: any[]) {
    // Aggregate impressions by campaign
    const campaignImpressions = new Map<string, number>();

    events.forEach(event => {
      const count = campaignImpressions.get(event.campaignId) || 0;
      campaignImpressions.set(event.campaignId, count + 1);
    });

    // Batch update campaigns
    const updates = Array.from(campaignImpressions.entries()).map(
      ([campaignId, count]) =>
        prisma.campaign.update({
          where: { id: campaignId },
          data: {
            impressions: { increment: count }
          }
        })
    );

    await Promise.all(updates);

    // Update real-time dashboard
    await this.updateDashboard('impressions', events.length);
  }

  /**
   * Process click events
   */
  private async processClicks(events: any[]) {
    const campaignClicks = new Map<string, number>();

    events.forEach(event => {
      const count = campaignClicks.get(event.campaignId) || 0;
      campaignClicks.set(event.campaignId, count + 1);
    });

    const updates = Array.from(campaignClicks.entries()).map(
      ([campaignId, count]) =>
        prisma.campaign.update({
          where: { id: campaignId },
          data: {
            clicks: { increment: count }
          }
        })
    );

    await Promise.all(updates);

    // Calculate CTR in real-time
    for (const [campaignId] of campaignClicks) {
      await this.calculateCTR(campaignId);
    }

    await this.updateDashboard('clicks', events.length);
  }

  /**
   * Process conversion events
   */
  private async processConversions(events: any[]) {
    const campaignConversions = new Map<string, { count: number; value: number }>();

    events.forEach(event => {
      const existing = campaignConversions.get(event.campaignId) || { count: 0, value: 0 };
      campaignConversions.set(event.campaignId, {
        count: existing.count + 1,
        value: existing.value + (event.value || 0)
      });
    });

    const updates = Array.from(campaignConversions.entries()).map(
      ([campaignId, data]) =>
        prisma.campaign.update({
          where: { id: campaignId },
          data: {
            conversions: { increment: data.count }
          }
        })
    );

    await Promise.all(updates);

    await this.updateDashboard('conversions', events.length);
  }

  /**
   * Process bid events
   */
  private async processBids(events: any[]) {
    // Store bid analytics
    const bidMetrics = {
      total: events.length,
      won: events.filter(e => e.won).length,
      avgBid: events.reduce((sum, e) => sum + e.bidPrice, 0) / events.length,
      avgFloor: events.reduce((sum, e) => sum + e.floorPrice, 0) / events.length
    };

    await this.redis.setex(
      'metrics:bids:realtime',
      60,
      JSON.stringify(bidMetrics)
    );
  }

  /**
   * Process user behavior events
   */
  private async processUserEvents(events: any[]) {
    // Group by customer
    const customerEvents = new Map<string, any[]>();

    events.forEach(event => {
      const existing = customerEvents.get(event.customerId) || [];
      existing.push(event);
      customerEvents.set(event.customerId, existing);
    });

    // Update customer profiles in batch
    const updates = Array.from(customerEvents.entries()).map(
      async ([customerId, customerEventList]) => {
        await prisma.customer.update({
          where: { id: customerId },
          data: {
            lastSeen: new Date()
          }
        });

        // Store events
        await prisma.customerEvent.createMany({
          data: customerEventList.map(e => ({
            customerId,
            eventType: e.eventType,
            eventName: e.eventName,
            properties: e.properties,
            timestamp: new Date(e.timestamp)
          }))
        });
      }
    );

    await Promise.all(updates);
  }

  /**
   * Calculate CTR for campaign
   */
  private async calculateCTR(campaignId: string) {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { impressions: true, clicks: true }
    });

    if (campaign && campaign.impressions > 0) {
      const ctr = (campaign.clicks / campaign.impressions) * 100;
      await this.redis.setex(
        `campaign:${campaignId}:ctr`,
        300,
        ctr.toFixed(4)
      );
    }
  }

  /**
   * Update real-time dashboard
   */
  private async updateDashboard(metric: string, count: number) {
    const key = `dashboard:${metric}:today`;
    await this.redis.incrby(key, count);
    await this.redis.expire(key, 86400); // 24 hours
  }

  /**
   * Update stream processing metrics
   */
  private async updateStreamMetrics(
    streamName: string,
    count: number,
    duration: number
  ) {
    const key = `stream:metrics:${streamName}`;
    const metrics = {
      lastBatchSize: count,
      lastBatchDuration: duration,
      throughput: (count / duration) * 1000,
      timestamp: Date.now()
    };

    await this.redis.setex(key, 300, JSON.stringify(metrics));
  }

  /**
   * Get stream processing stats
   */
  async getStreamStats() {
    const streams = Array.from(this.processors.keys());
    const stats = await Promise.all(
      streams.map(async (stream) => {
        const metricsJson = await this.redis.get(`stream:metrics:${stream}`);
        const metrics = metricsJson ? JSON.parse(metricsJson) : null;

        // Get stream length
        const streamLength = await this.redis.xlen(`stream:${stream}:log`);

        return {
          stream,
          length: streamLength,
          metrics
        };
      })
    );

    return stats;
  }

  /**
   * Replay stream from specific point
   */
  async replayStream(streamName: string, fromId = '0', count = 100) {
    const entries = await this.redis.xread(
      'COUNT',
      count,
      'STREAMS',
      `stream:${streamName}:log`,
      fromId
    );

    if (entries) {
      const events = entries[0][1].map((entry: any) => {
        return JSON.parse(entry[1][1]);
      });

      const handler = this.processors.get(streamName);
      if (handler) {
        await handler.process(events);
      }

      return events.length;
    }

    return 0;
  }
}

interface StreamHandler {
  process: (events: any[]) => Promise<void>;
  aggregation: 'time-window' | 'count' | 'session';
  windowSize: number;
}
