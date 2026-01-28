import { logger } from '../../utils/logger';

/**
 * Brand Safety Filter - Ensures ads meet brand safety standards
 */
export class BrandSafetyFilter {
  private static instance: BrandSafetyFilter;

  // Categories to block
  private blockedCategories = [
    'adult',
    'gambling',
    'violence',
    'hate-speech',
    'illegal-drugs',
    'weapons',
    'tobacco',
    'fake-news',
  ];

  // Keywords to flag
  private flaggedKeywords = [
    'casino',
    'poker',
    'bet',
    'xxx',
    'porn',
    'weapon',
    'gun',
    'violence',
    'hate',
    'fake news',
    'scam',
    'fraud',
  ];

  // Trusted advertiser domains
  private trustedDomains = new Set<string>();

  private constructor() {}

  static getInstance(): BrandSafetyFilter {
    if (!BrandSafetyFilter.instance) {
      BrandSafetyFilter.instance = new BrandSafetyFilter();
    }
    return BrandSafetyFilter.instance;
  }

  /**
   * Check if content is brand-safe
   */
  async checkContentSafety(content: {
    text?: string;
    clickUrl?: string;
    imageUrl?: string;
    category?: string;
    advertiserDomain?: string;
  }): Promise<{
    safe: boolean;
    violations: string[];
    riskScore: number;
  }> {
    const violations: string[] = [];
    let riskScore = 0;

    // Check category
    if (content.category && this.blockedCategories.includes(content.category.toLowerCase())) {
      violations.push(`Blocked category: ${content.category}`);
      riskScore += 50;
    }

    // Check text content
    if (content.text) {
      const foundKeywords = this.findFlaggedKeywords(content.text);
      if (foundKeywords.length > 0) {
        violations.push(`Flagged keywords: ${foundKeywords.join(', ')}`);
        riskScore += foundKeywords.length * 10;
      }
    }

    // Check URL safety
    if (content.clickUrl) {
      const urlRisk = this.checkUrlSafety(content.clickUrl);
      if (urlRisk.violations.length > 0) {
        violations.push(...urlRisk.violations);
        riskScore += urlRisk.riskScore;
      }
    }

    // Trusted domain bonus
    if (content.advertiserDomain && this.trustedDomains.has(content.advertiserDomain)) {
      riskScore = Math.max(0, riskScore - 20);
    }

    const safe = riskScore < 30 && violations.length === 0;

    logger.info('Brand safety check', {
      safe,
      riskScore,
      violations: violations.length,
    });

    return {
      safe,
      violations,
      riskScore: Math.min(100, riskScore),
    };
  }

  /**
   * Check creative for brand safety
   */
  async checkCreative(creative: {
    type: string;
    content: any;
    clickUrl?: string;
    htmlContent?: string;
  }): Promise<{
    safe: boolean;
    violations: string[];
    riskScore: number;
  }> {
    const violations: string[] = [];
    let riskScore = 0;

    // Check click URL
    if (creative.clickUrl) {
      const urlCheck = this.checkUrlSafety(creative.clickUrl);
      violations.push(...urlCheck.violations);
      riskScore += urlCheck.riskScore;
    }

    // Check HTML content
    if (creative.htmlContent) {
      const keywords = this.findFlaggedKeywords(creative.htmlContent);
      if (keywords.length > 0) {
        violations.push(`Flagged keywords in HTML: ${keywords.join(', ')}`);
        riskScore += keywords.length * 10;
      }

      // Check for suspicious scripts
      if (this.hasSuspiciousScripts(creative.htmlContent)) {
        violations.push('Suspicious scripts detected');
        riskScore += 30;
      }
    }

    // Check content object
    if (creative.content) {
      const contentText = JSON.stringify(creative.content);
      const keywords = this.findFlaggedKeywords(contentText);
      if (keywords.length > 0) {
        violations.push(`Flagged keywords in content: ${keywords.join(', ')}`);
        riskScore += keywords.length * 5;
      }
    }

    const safe = riskScore < 30 && violations.length === 0;

    return {
      safe,
      violations,
      riskScore: Math.min(100, riskScore),
    };
  }

  /**
   * Find flagged keywords in text
   */
  private findFlaggedKeywords(text: string): string[] {
    const found: string[] = [];
    const lowerText = text.toLowerCase();

    for (const keyword of this.flaggedKeywords) {
      if (lowerText.includes(keyword)) {
        found.push(keyword);
      }
    }

    return found;
  }

  /**
   * Check URL safety
   */
  private checkUrlSafety(url: string): {
    violations: string[];
    riskScore: number;
  } {
    const violations: string[] = [];
    let riskScore = 0;

    try {
      const parsedUrl = new URL(url);

      // Check for suspicious TLDs
      const suspiciousTlds = ['.xyz', '.tk', '.ml', '.ga', '.cf'];
      for (const tld of suspiciousTlds) {
        if (parsedUrl.hostname.endsWith(tld)) {
          violations.push(`Suspicious TLD: ${tld}`);
          riskScore += 20;
        }
      }

      // Check for IP addresses instead of domains
      if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(parsedUrl.hostname)) {
        violations.push('URL uses IP address instead of domain');
        riskScore += 15;
      }

      // Check for excessive subdomains
      const subdomains = parsedUrl.hostname.split('.');
      if (subdomains.length > 4) {
        violations.push('Excessive subdomains');
        riskScore += 10;
      }

      // Check URL path for keywords
      const keywords = this.findFlaggedKeywords(parsedUrl.pathname);
      if (keywords.length > 0) {
        violations.push(`Flagged keywords in URL: ${keywords.join(', ')}`);
        riskScore += keywords.length * 10;
      }
    } catch (error) {
      violations.push('Invalid URL format');
      riskScore += 40;
    }

    return { violations, riskScore };
  }

  /**
   * Check for suspicious scripts in HTML
   */
  private hasSuspiciousScripts(html: string): boolean {
    const suspiciousPatterns = [
      /eval\s*\(/i,
      /document\.write\s*\(/i,
      /innerHTML\s*=/i,
      /onclick\s*=/i,
      /onerror\s*=/i,
      /<iframe/i,
      /javascript:/i,
    ];

    return suspiciousPatterns.some((pattern) => pattern.test(html));
  }

  /**
   * Add trusted advertiser domain
   */
  addTrustedDomain(domain: string): void {
    this.trustedDomains.add(domain);
    logger.info('Trusted domain added', { domain });
  }

  /**
   * Remove trusted advertiser domain
   */
  removeTrustedDomain(domain: string): void {
    this.trustedDomains.delete(domain);
    logger.info('Trusted domain removed', { domain });
  }

  /**
   * Get brand safety statistics
   */
  getStatistics(): {
    blockedCategories: string[];
    flaggedKeywords: number;
    trustedDomains: number;
  } {
    return {
      blockedCategories: this.blockedCategories,
      flaggedKeywords: this.flaggedKeywords.length,
      trustedDomains: this.trustedDomains.size,
    };
  }
}
