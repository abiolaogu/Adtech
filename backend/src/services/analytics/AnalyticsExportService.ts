import { prisma } from '../../config/database';
import { logger } from '../../utils/logger';

/**
 * Analytics Export Service - Export analytics data to CSV/Excel
 */
export class AnalyticsExportService {
  private static instance: AnalyticsExportService;

  private constructor() {}

  static getInstance(): AnalyticsExportService {
    if (!AnalyticsExportService.instance) {
      AnalyticsExportService.instance = new AnalyticsExportService();
    }
    return AnalyticsExportService.instance;
  }

  /**
   * Export campaign performance data to CSV
   */
  async exportCampaignPerformance(
    campaignId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<string> {
    try {
      const where: any = {};

      if (campaignId) {
        where.campaignId = campaignId;
      }

      if (startDate || endDate) {
        where.timestamp = {};
        if (startDate) where.timestamp.gte = startDate;
        if (endDate) where.timestamp.lte = endDate;
      }

      const impressions = await prisma.impression.findMany({
        where,
        include: {
          campaign: true,
        },
        orderBy: {
          timestamp: 'desc',
        },
      });

      // Group by campaign
      const campaignData = new Map<string, any>();

      for (const imp of impressions) {
        if (!imp.campaign) continue;

        const cid = imp.campaign.id;
        if (!campaignData.has(cid)) {
          campaignData.set(cid, {
            campaignId: cid,
            campaignName: imp.campaign.name,
            impressions: 0,
            clicks: 0,
            conversions: 0,
            revenue: 0,
            cost: 0,
          });
        }

        const data = campaignData.get(cid);
        data.impressions++;
        if (imp.clicked) data.clicks++;
        if (imp.converted) data.conversions++;
        data.revenue += imp.revenue || 0;
        data.cost += imp.cost || 0;
      }

      // Convert to CSV
      const csv = this.convertToCSV(
        Array.from(campaignData.values()),
        [
          'campaignId',
          'campaignName',
          'impressions',
          'clicks',
          'conversions',
          'revenue',
          'cost',
        ]
      );

      logger.info('Campaign performance exported', {
        campaignId,
        rows: campaignData.size,
      });

      return csv;
    } catch (error) {
      logger.error('Failed to export campaign performance', { error });
      throw error;
    }
  }

  /**
   * Export publisher revenue data to CSV
   */
  async exportPublisherRevenue(
    publisherId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<string> {
    try {
      const where: any = {
        slot: {
          inventory: {},
        },
      };

      if (publisherId) {
        where.slot.inventory.publisherId = publisherId;
      }

      if (startDate || endDate) {
        where.timestamp = {};
        if (startDate) where.timestamp.gte = startDate;
        if (endDate) where.timestamp.lte = endDate;
      }

      const impressions = await prisma.impression.findMany({
        where,
        include: {
          slot: {
            include: {
              inventory: {
                include: {
                  publisher: true,
                },
              },
            },
          },
        },
      });

      // Group by publisher
      const publisherData = new Map<string, any>();

      for (const imp of impressions) {
        if (!imp.slot?.inventory?.publisher) continue;

        const pub = imp.slot.inventory.publisher;
        if (!publisherData.has(pub.id)) {
          publisherData.set(pub.id, {
            publisherId: pub.id,
            publisherName: pub.name,
            impressions: 0,
            clicks: 0,
            revenue: 0,
            revenueShare: pub.revenueShare,
            earnings: 0,
          });
        }

        const data = publisherData.get(pub.id);
        data.impressions++;
        if (imp.clicked) data.clicks++;
        const revenue = imp.revenue || 0;
        data.revenue += revenue;
        data.earnings += revenue * pub.revenueShare;
      }

      // Convert to CSV
      const csv = this.convertToCSV(
        Array.from(publisherData.values()),
        [
          'publisherId',
          'publisherName',
          'impressions',
          'clicks',
          'revenue',
          'revenueShare',
          'earnings',
        ]
      );

      logger.info('Publisher revenue exported', {
        publisherId,
        rows: publisherData.size,
      });

      return csv;
    } catch (error) {
      logger.error('Failed to export publisher revenue', { error });
      throw error;
    }
  }

  /**
   * Export platform overview data to CSV
   */
  async exportPlatformOverview(startDate?: Date, endDate?: Date): Promise<string> {
    try {
      const where: any = {};

      if (startDate || endDate) {
        where.timestamp = {};
        if (startDate) where.timestamp.gte = startDate;
        if (endDate) where.timestamp.lte = endDate;
      }

      const [impressions, campaigns, publishers, advertisers] = await Promise.all([
        prisma.impression.findMany({ where }),
        prisma.campaign.count(),
        prisma.publisher.count(),
        prisma.advertiser.count(),
      ]);

      const totalImpressions = impressions.length;
      const totalClicks = impressions.filter((i) => i.clicked).length;
      const totalConversions = impressions.filter((i) => i.converted).length;
      const totalRevenue = impressions.reduce((sum, i) => sum + (i.revenue || 0), 0);
      const totalCost = impressions.reduce((sum, i) => sum + (i.cost || 0), 0);
      const avgCPM = totalImpressions > 0 ? (totalRevenue / totalImpressions) * 1000 : 0;
      const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
      const cvr = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;

      const data = [
        {
          metric: 'Total Campaigns',
          value: campaigns,
        },
        {
          metric: 'Total Publishers',
          value: publishers,
        },
        {
          metric: 'Total Advertisers',
          value: advertisers,
        },
        {
          metric: 'Total Impressions',
          value: totalImpressions,
        },
        {
          metric: 'Total Clicks',
          value: totalClicks,
        },
        {
          metric: 'Total Conversions',
          value: totalConversions,
        },
        {
          metric: 'Total Revenue (USD)',
          value: totalRevenue.toFixed(2),
        },
        {
          metric: 'Total Cost (USD)',
          value: totalCost.toFixed(2),
        },
        {
          metric: 'Average CPM (USD)',
          value: avgCPM.toFixed(2),
        },
        {
          metric: 'Click-Through Rate (%)',
          value: ctr.toFixed(2),
        },
        {
          metric: 'Conversion Rate (%)',
          value: cvr.toFixed(2),
        },
      ];

      const csv = this.convertToCSV(data, ['metric', 'value']);

      logger.info('Platform overview exported', {
        metrics: data.length,
      });

      return csv;
    } catch (error) {
      logger.error('Failed to export platform overview', { error });
      throw error;
    }
  }

  /**
   * Convert data to CSV format
   */
  private convertToCSV(data: any[], columns: string[]): string {
    if (data.length === 0) {
      return columns.join(',') + '\n';
    }

    // Header row
    const header = columns.join(',');

    // Data rows
    const rows = data.map((row) => {
      return columns
        .map((col) => {
          const value = row[col];
          // Escape values containing commas or quotes
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value ?? '';
        })
        .join(',');
    });

    return [header, ...rows].join('\n');
  }

  /**
   * Get export formats available
   */
  getAvailableFormats(): string[] {
    return ['csv', 'json'];
  }

  /**
   * Export data in JSON format
   */
  async exportJSON(type: string, params: any): Promise<any> {
    switch (type) {
      case 'campaign':
        const campaignCSV = await this.exportCampaignPerformance(
          params.campaignId,
          params.startDate,
          params.endDate
        );
        return this.csvToJSON(campaignCSV);

      case 'publisher':
        const publisherCSV = await this.exportPublisherRevenue(
          params.publisherId,
          params.startDate,
          params.endDate
        );
        return this.csvToJSON(publisherCSV);

      case 'overview':
        const overviewCSV = await this.exportPlatformOverview(params.startDate, params.endDate);
        return this.csvToJSON(overviewCSV);

      default:
        throw new Error(`Unknown export type: ${type}`);
    }
  }

  /**
   * Convert CSV to JSON
   */
  private csvToJSON(csv: string): any[] {
    const lines = csv.split('\n').filter((line) => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(',');
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      const obj: any = {};

      headers.forEach((header, index) => {
        obj[header] = values[index];
      });

      data.push(obj);
    }

    return data;
  }
}
