import { prisma } from '../../config/database';
import { logger } from '../../utils/logger';
import { getRedisClient } from '../../config/redis';

/**
 * Predictive Analytics Engine
 * Forecasts campaign performance, budget pacing, and inventory demand
 * Uses time-series analysis and trend detection
 */
export class PredictiveAnalytics {
  private static instance: PredictiveAnalytics;
  private redis = getRedisClient();

  private constructor() {}

  static getInstance(): PredictiveAnalytics {
    if (!PredictiveAnalytics.instance) {
      PredictiveAnalytics.instance = new PredictiveAnalytics();
    }
    return PredictiveAnalytics.instance;
  }

  /**
   * Predict campaign performance for next N days
   */
  async predictCampaignPerformance(campaignId: string, days = 7) {
    try {
      // Get historical data
      const historicalData = await this.getCampaignTimeSeriesData(campaignId, 30);

      if (historicalData.length < 7) {
        throw new Error('Insufficient historical data for prediction');
      }

      // Extract metrics
      const impressions = historicalData.map((d) => d.impressions);
      const clicks = historicalData.map((d) => d.clicks);
      const conversions = historicalData.map((d) => d.conversions);
      const spend = historicalData.map((d) => d.spend);

      // Predict using exponential smoothing
      const predictions = {
        impressions: this.exponentialSmoothing(impressions, days, 0.3),
        clicks: this.exponentialSmoothing(clicks, days, 0.3),
        conversions: this.exponentialSmoothing(conversions, days, 0.3),
        spend: this.exponentialSmoothing(spend, days, 0.3),
      };

      // Calculate confidence intervals
      const confidence = this.calculateConfidenceIntervals(historicalData, predictions);

      // Detect trends
      const trends = this.detectTrends(historicalData);

      // Generate insights
      const insights = this.generateInsights(predictions, trends, historicalData);

      const result = {
        campaignId,
        predictions,
        confidence,
        trends,
        insights,
        generatedAt: new Date(),
      };

      // Cache predictions
      await this.redis.setex(`predictions:campaign:${campaignId}`, 3600, JSON.stringify(result));

      return result;
    } catch (error) {
      logger.error('Prediction failed', { campaignId, error });
      throw error;
    }
  }

  /**
   * Predict budget depletion date
   */
  async predictBudgetDepletion(campaignId: string) {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    const remainingBudget = campaign.budget - campaign.spent;
    if (remainingBudget <= 0) {
      return {
        depleted: true,
        daysRemaining: 0,
        depletionDate: new Date(),
      };
    }

    // Get historical spend rate
    const historicalData = await this.getCampaignTimeSeriesData(campaignId, 14);
    const avgDailySpend =
      historicalData.reduce((sum, d) => sum + d.spend, 0) / historicalData.length;

    if (avgDailySpend === 0) {
      return {
        depleted: false,
        daysRemaining: Infinity,
        depletionDate: null,
        avgDailySpend: 0,
      };
    }

    const daysRemaining = Math.ceil(remainingBudget / avgDailySpend);
    const depletionDate = new Date();
    depletionDate.setDate(depletionDate.getDate() + daysRemaining);

    // Predict if pacing adjustment needed
    const campaignDaysRemaining = campaign.endDate
      ? Math.ceil((new Date(campaign.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : daysRemaining;

    const pacingStatus = this.assessPacing(daysRemaining, campaignDaysRemaining);

    return {
      depleted: false,
      daysRemaining,
      depletionDate,
      avgDailySpend,
      remainingBudget,
      pacingStatus,
      recommendation: this.getPacingRecommendation(pacingStatus),
    };
  }

  /**
   * Forecast inventory demand
   */
  async forecastInventoryDemand(inventoryId: string, days = 30) {
    // Get historical booking data
    const slots = await prisma.inventorySlot.findMany({
      where: {
        inventoryId,
        slotTime: {
          gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // Last 90 days
        },
      },
      orderBy: { slotTime: 'asc' },
    });

    // Group by day
    const dailyBookings = this.groupByDay(slots);

    // Calculate booking rate trend
    const bookingRates = dailyBookings.map((d) => ({
      date: d.date,
      bookedRate: d.booked / (d.booked + d.available),
    }));

    // Forecast using linear regression
    const forecast = this.linearRegression(
      bookingRates.map((_, i) => i),
      bookingRates.map((d) => d.bookedRate),
      days
    );

    // Detect seasonality
    const seasonality = this.detectSeasonality(dailyBookings);

    return {
      inventoryId,
      forecast: forecast.map((rate, i) => ({
        day: i + 1,
        expectedBookingRate: Math.min(Math.max(rate, 0), 1),
        confidence: this.calculateForecastConfidence(i, bookingRates.length),
      })),
      seasonality,
      recommendations: this.getInventoryRecommendations(forecast, seasonality),
    };
  }

  /**
   * Predict customer lifetime value
   */
  async predictCustomerLTV(customerId: string, months = 12) {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        events: {
          where: {
            eventType: 'purchase',
          },
          orderBy: { timestamp: 'asc' },
        },
      },
    });

    if (!customer || customer.events.length === 0) {
      return {
        customerId,
        predictedLTV: 0,
        confidence: 'low',
      };
    }

    // Calculate historical metrics
    const purchases = customer.events;
    const totalRevenue = purchases.reduce((sum: number, e: any) => {
      const props = e.properties;
      return sum + (props?.value || 0);
    }, 0);

    const avgOrderValue = totalRevenue / purchases.length;
    const customerAgeDays = Math.ceil(
      (Date.now() - customer.firstSeen.getTime()) / (1000 * 60 * 60 * 24)
    );
    const purchaseFrequency = purchases.length / (customerAgeDays / 30); // per month

    // Predict future value using cohort analysis
    const predictedMonthlyRevenue = avgOrderValue * purchaseFrequency;
    const churnProbability = this.calculateChurnProbability(customer);
    const retentionRate = 1 - churnProbability;

    // Calculate LTV with retention decay
    let predictedLTV = 0;
    for (let month = 0; month < months; month++) {
      predictedLTV += predictedMonthlyRevenue * Math.pow(retentionRate, month);
    }

    return {
      customerId,
      predictedLTV: Math.round(predictedLTV * 100) / 100,
      avgOrderValue: Math.round(avgOrderValue * 100) / 100,
      purchaseFrequency: Math.round(purchaseFrequency * 100) / 100,
      churnProbability: Math.round(churnProbability * 100) / 100,
      confidence: this.getLTVConfidence(purchases.length, customerAgeDays),
      segment: this.getCustomerSegment(predictedLTV),
    };
  }

  /**
   * Exponential smoothing for time series prediction
   */
  private exponentialSmoothing(data: number[], periods: number, alpha: number): number[] {
    const predictions: number[] = [];
    let lastValue = data[data.length - 1];

    // Calculate trend
    const trend = (data[data.length - 1] - data[0]) / data.length;

    for (let i = 0; i < periods; i++) {
      lastValue = alpha * lastValue + (1 - alpha) * (lastValue + trend);
      predictions.push(Math.max(0, Math.round(lastValue)));
    }

    return predictions;
  }

  /**
   * Linear regression for trend forecasting
   */
  private linearRegression(x: number[], y: number[], forecastPeriods: number): number[] {
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const forecasts: number[] = [];
    for (let i = 0; i < forecastPeriods; i++) {
      forecasts.push(slope * (n + i) + intercept);
    }

    return forecasts;
  }

  /**
   * Calculate confidence intervals
   */
  private calculateConfidenceIntervals(historical: any[], predictions: any) {
    const variance = this.calculateVariance(historical.map((d) => d.impressions));
    const stdDev = Math.sqrt(variance);

    return {
      impressions: {
        lower: predictions.impressions.map((v: number) => Math.max(0, v - 1.96 * stdDev)),
        upper: predictions.impressions.map((v: number) => v + 1.96 * stdDev),
      },
      confidenceLevel: '95%',
    };
  }

  /**
   * Detect trends in time series data
   */
  private detectTrends(data: any[]) {
    const values = data.map((d) => d.impressions);
    const trend = (values[values.length - 1] - values[0]) / values.length;

    return {
      direction: trend > 0 ? 'increasing' : trend < 0 ? 'decreasing' : 'stable',
      strength: Math.abs(trend) > 100 ? 'strong' : Math.abs(trend) > 10 ? 'moderate' : 'weak',
      trend: trend,
    };
  }

  /**
   * Generate actionable insights
   */
  private generateInsights(predictions: any, trends: any, historical: any[]): string[] {
    const insights: string[] = [];

    if (trends.direction === 'increasing' && trends.strength === 'strong') {
      insights.push(
        '📈 Campaign momentum is strong. Consider increasing budget to capitalize on growth.'
      );
    }

    if (trends.direction === 'decreasing') {
      insights.push('📉 Performance declining. Review targeting and creatives for optimization.');
    }

    const avgCTR =
      historical.reduce((sum, d) => sum + d.clicks / d.impressions, 0) / historical.length;
    if (avgCTR < 0.01) {
      insights.push('⚠️ CTR below industry average. A/B test new creatives.');
    }

    return insights;
  }

  /**
   * Helper methods
   */
  private async getCampaignTimeSeriesData(campaignId: string, days: number) {
    // Simplified - in production, query from data warehouse
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) return [];

    // Mock time series data (in production, aggregate from impressions table)
    const data = [];
    for (let i = days; i >= 0; i--) {
      data.push({
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
        impressions: Math.floor(campaign.impressions / days),
        clicks: Math.floor(campaign.clicks / days),
        conversions: Math.floor(campaign.conversions / days),
        spend: campaign.spent / days,
      });
    }
    return data;
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  }

  private assessPacing(budgetDays: number, campaignDays: number): string {
    const ratio = budgetDays / campaignDays;
    if (ratio < 0.8) return 'overpacing';
    if (ratio > 1.2) return 'underpacing';
    return 'on-track';
  }

  private getPacingRecommendation(status: string): string {
    switch (status) {
      case 'overpacing':
        return 'Reduce daily spend to avoid budget exhaustion';
      case 'underpacing':
        return 'Increase daily spend to fully utilize budget';
      default:
        return 'Pacing is optimal';
    }
  }

  private groupByDay(slots: any[]) {
    const grouped = new Map();
    slots.forEach((slot) => {
      const day = slot.slotTime.toISOString().split('T')[0];
      if (!grouped.has(day)) {
        grouped.set(day, { date: day, booked: 0, available: 0 });
      }
      const data = grouped.get(day);
      if (slot.status === 'SOLD') data.booked++;
      else data.available++;
    });
    return Array.from(grouped.values());
  }

  private detectSeasonality(data: any[]): string {
    // Simplified seasonality detection
    return 'weekday-focused';
  }

  private getInventoryRecommendations(forecast: number[], seasonality: string): string[] {
    return [
      'Optimize pricing based on demand forecast',
      'Adjust inventory allocation for peak periods',
    ];
  }

  private calculateChurnProbability(customer: any): number {
    const daysSinceLastEvent = Math.ceil(
      (Date.now() - customer.lastSeen.getTime()) / (1000 * 60 * 60 * 24)
    );
    return Math.min(daysSinceLastEvent / 90, 0.9);
  }

  private getLTVConfidence(purchases: number, ageDays: number): string {
    if (purchases >= 10 && ageDays >= 180) return 'high';
    if (purchases >= 5 && ageDays >= 90) return 'medium';
    return 'low';
  }

  private getCustomerSegment(ltv: number): string {
    if (ltv > 1000) return 'VIP';
    if (ltv > 500) return 'High-Value';
    if (ltv > 100) return 'Medium-Value';
    return 'Low-Value';
  }

  private calculateForecastConfidence(period: number, dataPoints: number): number {
    return Math.max(0.5, 1 - period / dataPoints);
  }
}
