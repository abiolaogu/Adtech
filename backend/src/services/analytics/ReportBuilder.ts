import { prisma } from '../../config/database';
import { logger } from '../../utils/logger';
import { Prisma } from '@prisma/client';

interface MetricAggregation {
  field: string;
  operation: 'count' | 'sum' | 'avg' | 'min' | 'max';
  alias?: string;
}

interface ReportQuery {
  dataSource: string;
  metrics: string[];
  dimensions: string[];
  filters?: any;
  groupBy?: string[];
  sortBy?: { field: string; order: 'asc' | 'desc' }[];
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

interface ReportResult {
  columns: string[];
  rows: any[];
  summary: {
    rowCount: number;
    executionTime: number;
  };
}

export class ReportBuilder {
  private static instance: ReportBuilder;

  private constructor() {}

  static getInstance(): ReportBuilder {
    if (!ReportBuilder.instance) {
      ReportBuilder.instance = new ReportBuilder();
    }
    return ReportBuilder.instance;
  }

  /**
   * Execute a custom report query
   */
  async executeReport(query: ReportQuery): Promise<ReportResult> {
    const startTime = Date.now();

    try {
      let data: any[] = [];

      switch (query.dataSource) {
        case 'CAMPAIGNS':
          data = await this.queryCampaigns(query);
          break;
        case 'IMPRESSIONS':
          data = await this.queryImpressions(query);
          break;
        case 'PUBLISHERS':
          data = await this.queryPublishers(query);
          break;
        case 'AUDIENCES':
          data = await this.queryAudiences(query);
          break;
        case 'CUSTOMERS':
          data = await this.queryCustomers(query);
          break;
        case 'INVENTORY':
          data = await this.queryInventory(query);
          break;
        default:
          throw new Error(`Unsupported data source: ${query.dataSource}`);
      }

      // Apply grouping and aggregation
      const processedData = this.processData(data, query);

      // Extract columns from the first row
      const columns = processedData.length > 0 ? Object.keys(processedData[0]) : [];

      const executionTime = Date.now() - startTime;

      return {
        columns,
        rows: processedData,
        summary: {
          rowCount: processedData.length,
          executionTime,
        },
      };
    } catch (error) {
      logger.error('Report execution failed', { error, query });
      throw error;
    }
  }

  /**
   * Query campaigns data
   */
  private async queryCampaigns(query: ReportQuery): Promise<any[]> {
    const whereClause: any = {};

    // Date range filter
    if (query.startDate || query.endDate) {
      whereClause.createdAt = {};
      if (query.startDate) whereClause.createdAt.gte = query.startDate;
      if (query.endDate) whereClause.createdAt.lte = query.endDate;
    }

    // Apply custom filters
    if (query.filters) {
      Object.assign(whereClause, query.filters);
    }

    const campaigns = await prisma.campaign.findMany({
      where: whereClause,
      include: {
        advertiser: true,
        user: { select: { name: true, email: true } },
      },
      take: query.limit || 1000,
    });

    return campaigns.map((c) => ({
      id: c.id,
      name: c.name,
      advertiser: c.advertiser.name,
      type: c.type,
      objective: c.objective,
      status: c.status,
      budget: c.budget,
      spent: c.spent,
      impressions: c.impressions,
      clicks: c.clicks,
      conversions: c.conversions,
      ctr: c.impressions > 0 ? (c.clicks / c.impressions) * 100 : 0,
      cvr: c.clicks > 0 ? (c.conversions / c.clicks) * 100 : 0,
      cpm: c.impressions > 0 ? (c.spent / c.impressions) * 1000 : 0,
      cpc: c.clicks > 0 ? c.spent / c.clicks : 0,
      cpa: c.conversions > 0 ? c.spent / c.conversions : 0,
      startDate: c.startDate,
      endDate: c.endDate,
      createdAt: c.createdAt,
      owner: c.user.name,
    }));
  }

  /**
   * Query impressions data
   */
  private async queryImpressions(query: ReportQuery): Promise<any[]> {
    const whereClause: any = {};

    // Date range filter
    if (query.startDate || query.endDate) {
      whereClause.createdAt = {};
      if (query.startDate) whereClause.createdAt.gte = query.startDate;
      if (query.endDate) whereClause.createdAt.lte = query.endDate;
    }

    // Apply custom filters
    if (query.filters) {
      Object.assign(whereClause, query.filters);
    }

    const impressions = await prisma.impression.findMany({
      where: whereClause,
      include: {
        bid: {
          include: {
            campaign: {
              include: { advertiser: true },
            },
          },
        },
        placement: {
          include: { publisher: true },
        },
      },
      take: query.limit || 10000,
    });

    return impressions.map((i) => ({
      id: i.id,
      campaign: i.bid.campaign.name,
      campaignId: i.bid.campaign.id,
      advertiser: i.bid.campaign.advertiser.name,
      publisher: i.placement.publisher.name,
      publisherId: i.placement.publisher.id,
      placement: i.placement.name,
      served: i.served,
      viewed: i.viewed,
      clicked: i.clicked,
      converted: i.converted,
      revenue: i.revenue || 0,
      publisherRevenue: i.publisherRevenue || 0,
      date: i.createdAt.toISOString().split('T')[0],
      hour: i.createdAt.getHours(),
      dayOfWeek: i.createdAt.toLocaleDateString('en-US', { weekday: 'long' }),
      createdAt: i.createdAt,
    }));
  }

  /**
   * Query publishers data
   */
  private async queryPublishers(query: ReportQuery): Promise<any[]> {
    const whereClause: any = {};

    if (query.filters) {
      Object.assign(whereClause, query.filters);
    }

    const publishers = await prisma.publisher.findMany({
      where: whereClause,
      include: {
        _count: {
          select: { inventories: true, placements: true },
        },
      },
    });

    // Get revenue data for each publisher
    const publishersWithRevenue = await Promise.all(
      publishers.map(async (p) => {
        const impressions = await prisma.impression.findMany({
          where: {
            placement: { publisherId: p.id },
            ...(query.startDate || query.endDate
              ? {
                  createdAt: {
                    ...(query.startDate && { gte: query.startDate }),
                    ...(query.endDate && { lte: query.endDate }),
                  },
                }
              : {}),
          },
        });

        const totalRevenue = impressions.reduce((sum, i) => sum + (i.publisherRevenue || 0), 0);
        const totalImpressions = impressions.length;

        return {
          id: p.id,
          name: p.name,
          domain: p.domain,
          status: p.status,
          revenueShare: p.revenueShare,
          inventoryCount: p._count.inventories,
          placementCount: p._count.placements,
          impressions: totalImpressions,
          revenue: totalRevenue,
          avgCpm: totalImpressions > 0 ? (totalRevenue / totalImpressions) * 1000 : 0,
          createdAt: p.createdAt,
        };
      })
    );

    return publishersWithRevenue;
  }

  /**
   * Query audiences data
   */
  private async queryAudiences(query: ReportQuery): Promise<any[]> {
    const whereClause: any = {};

    if (query.filters) {
      Object.assign(whereClause, query.filters);
    }

    const audiences = await prisma.audience.findMany({
      where: whereClause,
      include: {
        user: { select: { name: true } },
        _count: {
          select: { segments: true, campaigns: true },
        },
      },
    });

    return audiences.map((a) => ({
      id: a.id,
      name: a.name,
      description: a.description,
      status: a.status,
      size: a.size,
      memberCount: a._count.segments,
      campaignCount: a._count.campaigns,
      owner: a.user.name,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    }));
  }

  /**
   * Query customers data
   */
  private async queryCustomers(query: ReportQuery): Promise<any[]> {
    const whereClause: any = {};

    // Date range filter
    if (query.startDate || query.endDate) {
      whereClause.createdAt = {};
      if (query.startDate) whereClause.createdAt.gte = query.startDate;
      if (query.endDate) whereClause.createdAt.lte = query.endDate;
    }

    if (query.filters) {
      Object.assign(whereClause, query.filters);
    }

    const customers = await prisma.customer.findMany({
      where: whereClause,
      include: {
        _count: {
          select: { events: true, segments: true },
        },
      },
      take: query.limit || 1000,
    });

    return customers.map((c) => ({
      id: c.id,
      email: c.email,
      firstName: c.firstName,
      lastName: c.lastName,
      country: c.country,
      city: c.city,
      eventCount: c._count.events,
      segmentCount: c._count.segments,
      emailConsent: c.emailConsent,
      smsConsent: c.smsConsent,
      firstSeen: c.firstSeen,
      lastSeen: c.lastSeen,
      createdAt: c.createdAt,
    }));
  }

  /**
   * Query inventory data
   */
  private async queryInventory(query: ReportQuery): Promise<any[]> {
    const whereClause: any = {};

    if (query.filters) {
      Object.assign(whereClause, query.filters);
    }

    const inventories = await prisma.inventory.findMany({
      where: whereClause,
      include: {
        publisher: { select: { name: true } },
        _count: {
          select: { slots: true, campaigns: true },
        },
      },
    });

    return inventories.map((inv) => ({
      id: inv.id,
      name: inv.name,
      type: inv.type,
      publisher: inv.publisher.name,
      publisherId: inv.publisherId,
      status: inv.status,
      totalSlots: inv.totalSlots,
      availableSlots: inv.availableSlots,
      utilization: inv.totalSlots > 0 ? ((inv.totalSlots - inv.availableSlots) / inv.totalSlots) * 100 : 0,
      floorPrice: inv.floorPrice,
      currency: inv.currency,
      slotCount: inv._count.slots,
      campaignCount: inv._count.campaigns,
      createdAt: inv.createdAt,
    }));
  }

  /**
   * Process data with grouping and aggregation
   */
  private processData(data: any[], query: ReportQuery): any[] {
    // Select only requested dimensions and metrics
    let result = data;

    // Filter by dimensions if specified
    if (query.dimensions && query.dimensions.length > 0) {
      result = data.map((row) => {
        const filteredRow: any = {};

        // Include dimensions
        query.dimensions.forEach((dim) => {
          if (row[dim] !== undefined) {
            filteredRow[dim] = row[dim];
          }
        });

        // Include metrics
        query.metrics.forEach((metric) => {
          if (row[metric] !== undefined) {
            filteredRow[metric] = row[metric];
          }
        });

        return filteredRow;
      });
    }

    // Group by if specified
    if (query.groupBy && query.groupBy.length > 0) {
      result = this.groupData(result, query.groupBy, query.metrics);
    }

    // Sort if specified
    if (query.sortBy && query.sortBy.length > 0) {
      query.sortBy.forEach((sort) => {
        result.sort((a, b) => {
          const aVal = a[sort.field];
          const bVal = b[sort.field];
          if (sort.order === 'asc') {
            return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
          } else {
            return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
          }
        });
      });
    }

    return result;
  }

  /**
   * Group data by specified fields
   */
  private groupData(data: any[], groupBy: string[], metrics: string[]): any[] {
    const groups = new Map<string, any>();

    data.forEach((row) => {
      // Create group key
      const key = groupBy.map((field) => row[field]).join('|');

      if (!groups.has(key)) {
        const groupRow: any = {};

        // Set dimension values
        groupBy.forEach((field) => {
          groupRow[field] = row[field];
        });

        // Initialize metrics
        metrics.forEach((metric) => {
          groupRow[metric] = 0;
          groupRow[`${metric}_count`] = 0;
        });

        groups.set(key, groupRow);
      }

      const group = groups.get(key);

      // Aggregate metrics
      metrics.forEach((metric) => {
        if (row[metric] !== undefined && row[metric] !== null) {
          if (typeof row[metric] === 'number') {
            group[metric] += row[metric];
            group[`${metric}_count`] += 1;
          }
        }
      });
    });

    // Convert map to array and calculate averages
    return Array.from(groups.values()).map((group) => {
      metrics.forEach((metric) => {
        if (group[`${metric}_count`] > 0) {
          group[`${metric}_avg`] = group[metric] / group[`${metric}_count`];
        }
      });
      return group;
    });
  }

  /**
   * Convert date range preset to actual dates
   */
  static getDateRangeFromPreset(preset: string): { startDate: Date; endDate: Date } {
    const now = new Date();
    const endDate = new Date();
    let startDate = new Date();

    switch (preset) {
      case 'TODAY':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'YESTERDAY':
        startDate.setDate(now.getDate() - 1);
        startDate.setHours(0, 0, 0, 0);
        endDate.setDate(now.getDate() - 1);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'LAST_7_DAYS':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'LAST_30_DAYS':
        startDate.setDate(now.getDate() - 30);
        break;
      case 'THIS_MONTH':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'LAST_MONTH':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate.setDate(0); // Last day of previous month
        break;
      case 'THIS_YEAR':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case 'LAST_YEAR':
        startDate = new Date(now.getFullYear() - 1, 0, 1);
        endDate.setFullYear(now.getFullYear() - 1, 11, 31);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    return { startDate, endDate };
  }

  /**
   * Convert report result to CSV format
   */
  static convertToCSV(result: ReportResult): string {
    if (result.rows.length === 0) {
      return '';
    }

    const headers = result.columns.join(',');
    const rows = result.rows.map((row) =>
      result.columns
        .map((col) => {
          const value = row[col];
          // Escape commas and quotes
          const escaped = String(value).replace(/"/g, '""');
          return `"${escaped}"`;
        })
        .join(',')
    );

    return [headers, ...rows].join('\n');
  }
}
