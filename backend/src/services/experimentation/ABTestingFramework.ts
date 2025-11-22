import { v4 as uuidv4 } from 'uuid';
import { getRedisClient } from '../../../config/redis';
import { prisma } from '../../../config/database';
import { logger } from '../../../utils/logger';

/**
 * Advanced A/B Testing Framework
 * Multi-armed bandit algorithm with Thompson Sampling
 * Statistically rigorous experimentation platform
 */
export class ABTestingFramework {
  private static instance: ABTestingFramework;
  private redis = getRedisClient();

  private constructor() {}

  static getInstance(): ABTestingFramework {
    if (!ABTestingFramework.instance) {
      ABTestingFramework.instance = new ABTestingFramework();
    }
    return ABTestingFramework.instance;
  }

  /**
   * Create new A/B test experiment
   */
  async createExperiment(params: {
    name: string;
    description: string;
    variants: ExperimentVariant[];
    targetMetric: string;
    trafficAllocation: number; // 0-1
    algorithm?: 'standard' | 'thompson' | 'epsilon-greedy';
  }) {
    const experimentId = uuidv4();

    const experiment: Experiment = {
      id: experimentId,
      name: params.name,
      description: params.description,
      variants: params.variants.map((v, i) => ({
        ...v,
        id: v.id || `variant-${i}`,
        allocation: v.allocation || 1 / params.variants.length
      })),
      targetMetric: params.targetMetric,
      trafficAllocation: params.trafficAllocation,
      algorithm: params.algorithm || 'thompson',
      status: 'draft',
      createdAt: new Date(),
      startedAt: null,
      endedAt: null,
      results: {
        totalSamples: 0,
        variantStats: {}
      }
    };

    // Store experiment
    await this.redis.setex(
      `experiment:${experimentId}`,
      86400 * 30, // 30 days
      JSON.stringify(experiment)
    );

    logger.info('Experiment created', { experimentId, name: params.name });

    return experiment;
  }

  /**
   * Assign user to experiment variant
   * Uses Thompson Sampling for optimal exploration/exploitation
   */
  async assignVariant(
    experimentId: string,
    userId: string,
    context?: Record<string, any>
  ): Promise<{ variantId: string; variant: any }> {
    const experiment = await this.getExperiment(experimentId);

    if (!experiment || experiment.status !== 'active') {
      // Return control if experiment not active
      return {
        variantId: 'control',
        variant: { control: true }
      };
    }

    // Check if user already assigned
    const existingAssignment = await this.getUserAssignment(experimentId, userId);
    if (existingAssignment) {
      return existingAssignment;
    }

    // Decide if user participates based on traffic allocation
    if (Math.random() > experiment.trafficAllocation) {
      return {
        variantId: 'control',
        variant: { control: true }
      };
    }

    // Select variant based on algorithm
    let variantId: string;
    switch (experiment.algorithm) {
      case 'thompson':
        variantId = await this.thompsonSampling(experiment);
        break;
      case 'epsilon-greedy':
        variantId = await this.epsilonGreedy(experiment, 0.1);
        break;
      default:
        variantId = this.uniformSampling(experiment);
    }

    const variant = experiment.variants.find(v => v.id === variantId);

    // Store assignment
    await this.storeAssignment(experimentId, userId, variantId);

    // Increment variant impressions
    await this.incrementMetric(experimentId, variantId, 'impressions');

    logger.debug('User assigned to variant', { experimentId, userId, variantId });

    return {
      variantId,
      variant: variant?.config || {}
    };
  }

  /**
   * Track conversion/goal for A/B test
   */
  async trackConversion(
    experimentId: string,
    userId: string,
    value?: number
  ) {
    const assignment = await this.getUserAssignment(experimentId, userId);
    if (!assignment) {
      logger.warn('No assignment found for conversion', { experimentId, userId });
      return;
    }

    // Increment conversion count
    await this.incrementMetric(experimentId, assignment.variantId, 'conversions', value);

    logger.debug('Conversion tracked', {
      experimentId,
      userId,
      variant: assignment.variantId,
      value
    });
  }

  /**
   * Thompson Sampling for multi-armed bandit
   */
  private async thompsonSampling(experiment: Experiment): Promise<string> {
    const samples: Array<{ variantId: string; sample: number }> = [];

    for (const variant of experiment.variants) {
      const stats = await this.getVariantStats(experiment.id, variant.id);

      // Beta distribution parameters
      const alpha = stats.conversions + 1;
      const beta = stats.impressions - stats.conversions + 1;

      // Sample from Beta distribution
      const sample = this.betaSample(alpha, beta);
      samples.push({ variantId: variant.id, sample });
    }

    // Select variant with highest sample
    samples.sort((a, b) => b.sample - a.sample);
    return samples[0].variantId;
  }

  /**
   * Epsilon-Greedy algorithm
   */
  private async epsilonGreedy(experiment: Experiment, epsilon: number): Promise<string> {
    // Explore with probability epsilon
    if (Math.random() < epsilon) {
      return this.uniformSampling(experiment);
    }

    // Exploit: choose best performing variant
    const variantPerformance: Array<{ variantId: string; rate: number }> = [];

    for (const variant of experiment.variants) {
      const stats = await this.getVariantStats(experiment.id, variant.id);
      const rate = stats.impressions > 0 ? stats.conversions / stats.impressions : 0;
      variantPerformance.push({ variantId: variant.id, rate });
    }

    variantPerformance.sort((a, b) => b.rate - a.rate);
    return variantPerformance[0].variantId;
  }

  /**
   * Uniform random sampling
   */
  private uniformSampling(experiment: Experiment): string {
    const random = Math.random();
    let cumulative = 0;

    for (const variant of experiment.variants) {
      cumulative += variant.allocation;
      if (random <= cumulative) {
        return variant.id;
      }
    }

    return experiment.variants[0].id;
  }

  /**
   * Sample from Beta distribution (simplified Box-Muller)
   */
  private betaSample(alpha: number, beta: number): number {
    // Simplified beta sampling using gamma distribution
    const gammaAlpha = this.gammaSample(alpha);
    const gammaBeta = this.gammaSample(beta);
    return gammaAlpha / (gammaAlpha + gammaBeta);
  }

  /**
   * Sample from Gamma distribution
   */
  private gammaSample(shape: number): number {
    // Simplified gamma sampling
    if (shape < 1) {
      return this.gammaSample(shape + 1) * Math.pow(Math.random(), 1 / shape);
    }

    const d = shape - 1 / 3;
    const c = 1 / Math.sqrt(9 * d);

    while (true) {
      const x = this.normalSample();
      const v = Math.pow(1 + c * x, 3);

      if (v > 0) {
        const u = Math.random();
        if (u < 1 - 0.0331 * Math.pow(x, 4) || Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) {
          return d * v;
        }
      }
    }
  }

  /**
   * Sample from normal distribution
   */
  private normalSample(): number {
    // Box-Muller transform
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  /**
   * Get experiment results and statistical significance
   */
  async getExperimentResults(experimentId: string) {
    const experiment = await this.getExperiment(experimentId);
    if (!experiment) {
      throw new Error('Experiment not found');
    }

    // Get stats for all variants
    const variantResults = await Promise.all(
      experiment.variants.map(async (variant) => {
        const stats = await this.getVariantStats(experimentId, variant.id);
        const conversionRate = stats.impressions > 0 ? stats.conversions / stats.impressions : 0;
        const avgValue = stats.conversions > 0 ? stats.totalValue / stats.conversions : 0;

        return {
          variantId: variant.id,
          name: variant.name,
          impressions: stats.impressions,
          conversions: stats.conversions,
          conversionRate: (conversionRate * 100).toFixed(2) + '%',
          avgValue,
          confidence: this.calculateConfidence(stats.impressions)
        };
      })
    );

    // Calculate statistical significance
    const significance = await this.calculateStatisticalSignificance(experiment, variantResults);

    // Determine winner
    const winner = this.determineWinner(variantResults, significance);

    return {
      experiment: {
        id: experiment.id,
        name: experiment.name,
        status: experiment.status,
        startedAt: experiment.startedAt,
        duration: experiment.startedAt
          ? Math.ceil((Date.now() - experiment.startedAt.getTime()) / (1000 * 60 * 60 * 24))
          : 0
      },
      variants: variantResults,
      significance,
      winner,
      recommendation: this.getRecommendation(variantResults, significance, winner)
    };
  }

  /**
   * Calculate statistical significance using Z-test
   */
  private async calculateStatisticalSignificance(
    experiment: Experiment,
    results: any[]
  ): Promise<number> {
    if (results.length < 2) return 0;

    // Compare first two variants (control vs treatment)
    const control = results[0];
    const treatment = results[1];

    const p1 = control.conversions / control.impressions;
    const p2 = treatment.conversions / treatment.impressions;
    const n1 = control.impressions;
    const n2 = treatment.impressions;

    if (n1 === 0 || n2 === 0) return 0;

    // Pooled probability
    const p = (control.conversions + treatment.conversions) / (n1 + n2);

    // Standard error
    const se = Math.sqrt(p * (1 - p) * (1 / n1 + 1 / n2));

    if (se === 0) return 0;

    // Z-score
    const z = Math.abs(p1 - p2) / se;

    // Convert to p-value (two-tailed)
    const pValue = 2 * (1 - this.normalCDF(Math.abs(z)));

    // Significance level (1 - p-value)
    return (1 - pValue) * 100;
  }

  /**
   * Normal CDF approximation
   */
  private normalCDF(z: number): number {
    const t = 1 / (1 + 0.2316419 * Math.abs(z));
    const d = 0.3989423 * Math.exp(-z * z / 2);
    const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return z > 0 ? 1 - p : p;
  }

  /**
   * Determine experiment winner
   */
  private determineWinner(results: any[], significance: number): any {
    if (significance < 95) {
      return null; // Not statistically significant
    }

    // Find variant with highest conversion rate
    let winner = results[0];
    for (const result of results) {
      const currentRate = parseFloat(result.conversionRate);
      const winnerRate = parseFloat(winner.conversionRate);
      if (currentRate > winnerRate) {
        winner = result;
      }
    }

    return winner;
  }

  /**
   * Get experiment recommendation
   */
  private getRecommendation(results: any[], significance: number, winner: any): string {
    if (significance < 90) {
      return 'Continue test - not enough data for conclusion';
    }

    if (significance < 95) {
      return 'Approaching significance - continue for more confidence';
    }

    if (winner) {
      const improvement = (
        (parseFloat(winner.conversionRate) / parseFloat(results[0].conversionRate) - 1) *
        100
      ).toFixed(1);
      return `Deploy variant "${winner.name}" - ${improvement}% improvement with ${significance.toFixed(1)}% confidence`;
    }

    return 'No clear winner - variants performing similarly';
  }

  /**
   * Helper methods
   */
  private async getExperiment(experimentId: string): Promise<Experiment | null> {
    const data = await this.redis.get(`experiment:${experimentId}`);
    return data ? JSON.parse(data) : null;
  }

  private async getUserAssignment(
    experimentId: string,
    userId: string
  ): Promise<{ variantId: string; variant: any } | null> {
    const assignment = await this.redis.get(`assignment:${experimentId}:${userId}`);
    return assignment ? JSON.parse(assignment) : null;
  }

  private async storeAssignment(experimentId: string, userId: string, variantId: string) {
    await this.redis.setex(
      `assignment:${experimentId}:${userId}`,
      86400 * 30,
      JSON.stringify({ variantId, assignedAt: Date.now() })
    );
  }

  private async incrementMetric(
    experimentId: string,
    variantId: string,
    metric: string,
    value: number = 1
  ) {
    await this.redis.hincrby(`experiment:${experimentId}:${variantId}`, metric, Math.floor(value));

    if (metric === 'conversions' && value > 1) {
      await this.redis.hincrbyfloat(
        `experiment:${experimentId}:${variantId}`,
        'totalValue',
        value
      );
    }
  }

  private async getVariantStats(experimentId: string, variantId: string) {
    const stats = await this.redis.hgetall(`experiment:${experimentId}:${variantId}`);
    return {
      impressions: parseInt(stats.impressions || '0'),
      conversions: parseInt(stats.conversions || '0'),
      totalValue: parseFloat(stats.totalValue || '0')
    };
  }

  private calculateConfidence(sampleSize: number): string {
    if (sampleSize < 100) return 'Low';
    if (sampleSize < 1000) return 'Medium';
    return 'High';
  }

  /**
   * Start experiment
   */
  async startExperiment(experimentId: string) {
    const experiment = await this.getExperiment(experimentId);
    if (experiment) {
      experiment.status = 'active';
      experiment.startedAt = new Date();
      await this.redis.setex(`experiment:${experimentId}`, 86400 * 30, JSON.stringify(experiment));
      logger.info('Experiment started', { experimentId });
    }
  }

  /**
   * Stop experiment
   */
  async stopExperiment(experimentId: string) {
    const experiment = await this.getExperiment(experimentId);
    if (experiment) {
      experiment.status = 'completed';
      experiment.endedAt = new Date();
      await this.redis.setex(`experiment:${experimentId}`, 86400 * 30, JSON.stringify(experiment));
      logger.info('Experiment stopped', { experimentId });
    }
  }
}

interface Experiment {
  id: string;
  name: string;
  description: string;
  variants: ExperimentVariant[];
  targetMetric: string;
  trafficAllocation: number;
  algorithm: 'standard' | 'thompson' | 'epsilon-greedy';
  status: 'draft' | 'active' | 'paused' | 'completed';
  createdAt: Date;
  startedAt: Date | null;
  endedAt: Date | null;
  results: {
    totalSamples: number;
    variantStats: Record<string, any>;
  };
}

interface ExperimentVariant {
  id?: string;
  name: string;
  description?: string;
  allocation: number;
  config: Record<string, any>;
}
