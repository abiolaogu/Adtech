import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../utils/logger';
import { RedisService } from '../caching/RedisService';
import { KdbService } from '../database/KdbService';

interface CheckResult {
  suspicious: boolean;
  score: number;
  reason?: string;
}

interface FraudCheckResult {
  allowed: boolean;
  fraudScore: number;
  reasons: string[];
}

export class FraudDetectionEngine {
  private static instance: FraudDetectionEngine;
  private redisService: RedisService;
  private kdbService: KdbService;
  private readonly CLICK_VELOCITY_THRESHOLD = 50; // clicks per minute

  private constructor() {
    this.redisService = RedisService.getInstance();
    this.kdbService = KdbService.getInstance();
  }

  static getInstance(): FraudDetectionEngine {
    if (!FraudDetectionEngine.instance) {
      FraudDetectionEngine.instance = new FraudDetectionEngine();
    }
    return FraudDetectionEngine.instance;
  }

  /**
   * Comprehensive fraud check for ad requests
   */
  async checkAdRequest(params: {
    ipAddress: string;
    userAgent: string;
    deviceId?: string;
    sessionId?: string;
    placementId: string;
    referrer?: string;
    requestId?: string;
  }): Promise<FraudCheckResult> {
    const checks = await Promise.all([
      this.checkIPReputation(params.ipAddress),
      this.checkClickVelocity(params.ipAddress, params.deviceId),
      this.checkBotIPDatabase(params.ipAddress),
    ]);

    let fraudScore = 0;
    const reasons: string[] = [];

    checks.forEach((check) => {
      if (check.suspicious) {
        fraudScore += check.score;
        if (check.reason) reasons.push(check.reason);
      }
    });

    // Normalize score
    fraudScore = Math.min(fraudScore, 1);
    const allowed = fraudScore < 0.8;

    // Log fraud attempt
    if (!allowed) {
      logger.warn('Fraud detected', {
        requestId: params.requestId,
        ip: params.ipAddress,
        score: fraudScore,
        reasons,
      });
    }

    // Update IP reputation if fraud detected
    if (fraudScore > 0.5) {
      await this.updateIPReputation(params.ipAddress, fraudScore);
    }

    return { allowed, fraudScore, reasons };
  }

  /**
   * Check IP reputation using blacklists and historical data
   */
  private async checkIPReputation(ipAddress: string): Promise<CheckResult> {
    const key = `ip:reputation:${ipAddress}`;
    const reputation = await this.redisService.get(key);

    if (reputation) {
      const score = parseFloat(reputation);
      if (score > 0.7) {
        return {
          suspicious: true,
          score: score,
          reason: 'Known fraudulent IP',
        };
      }
    }

    return { suspicious: false, score: 0 };
  }

  private async updateIPReputation(ip: string, score: number) {
    const key = `ip:reputation:${ip}`;
    await this.redisService.set(key, score.toString(), 86400 * 7); // Store for 7 days
  }

  public async analyze(request: any): Promise<{ isFraud: boolean; reason?: string }> {
    try {
      // 1. Log event to kdb+ for real-time analytics
      await this.kdbService.logEvent('requests', {
        requestId: request.requestId,
        ip: request.ipAddress,
        ua: request.userAgent,
        publisherId: request.publisherId,
        timestamp: Date.now(),
      });

      // 2. Check basic Redis-based rules (IP blacklists, rate limits)
      const isBlacklisted = await this.checkBlacklists(request.ipAddress);
      if (isBlacklisted) {
        return { isFraud: true, reason: 'IP_BLACKLISTED' };
      }

      // 3. Advanced kdb+ Analysis (Real-time pattern detection)
      // Query kdb+ for rapid-fire clicks from this IP
      const kdbResult = await this.kdbService.executeQuery(
        'select count i by ip from requests where ip = $1 and time > (now - 1000)',
        [request.ipAddress]
      );

      if (kdbResult.success && kdbResult.data && kdbResult.data[request.ipAddress] > 50) {
        logger.warn(`Fraud detected by kdb+: Rapid fire requests from ${request.ipAddress}`);
        return { isFraud: true, reason: 'RAPID_FIRE_KDB_DETECTED' };
      }

      return { isFraud: false };
    } catch (error) {
      logger.error('Error in fraud detection:', error);
      // Fail open to avoid blocking legitimate traffic on error
      return { isFraud: false };
    }
  }

  /**
   * Check against known bot IPs (simplified - in production use external API)
   */
  private async checkBotIPDatabase(ipAddress: string): Promise<CheckResult> {
    // Simulated check
    const isKnownBot = await this.redisService.sismember('fraud:bot_ips', ipAddress);
    if (isKnownBot) {
      return {
        suspicious: true,
        score: 0.9,
        reason: 'IP in bot database',
      };
    }
    return { suspicious: false, score: 0 };
  }

  /**
   * Detect rapid clicking patterns (click fraud)
   */
  private async checkClickVelocity(ipAddress: string, deviceId?: string): Promise<CheckResult> {
    const identifier = deviceId || ipAddress;
    const key = `clicks:${identifier}`;

    // Increment click counter
    const clicks = await this.redisService.increment(key);
    if (clicks === 1) {
      await this.redisService.expire(key, 60); // 1 minute window
    }

    if (clicks > this.CLICK_VELOCITY_THRESHOLD) {
      return {
        suspicious: true,
        score: Math.min(clicks / this.CLICK_VELOCITY_THRESHOLD, 1),
        reason: `Abnormal click velocity: ${clicks} clicks/min`,
      };
    }

    return { suspicious: false, score: 0 };
  }

  /**
   * Check if IP is in blacklist
   */
  private async checkBlacklists(ipAddress: string): Promise<boolean> {
    const isBlacklisted = await this.redisService.sismember('fraud:ip_blacklist', ipAddress);
    return !!isBlacklisted;
  }
}
