import { logger } from '../../utils/logger';

/**
 * Brand Safety Categories
 * Content categories that may be unsafe for brand association
 */
export enum BrandSafetyCategory {
  ADULT_CONTENT = 'ADULT_CONTENT',
  GAMBLING = 'GAMBLING',
  VIOLENCE = 'VIOLENCE',
  HATE_SPEECH = 'HATE_SPEECH',
  ILLEGAL_DRUGS = 'ILLEGAL_DRUGS',
  WEAPONS = 'WEAPONS',
  PROFANITY = 'PROFANITY',
  CONTROVERSIAL_POLITICS = 'CONTROVERSIAL_POLITICS',
  PIRACY = 'PIRACY',
  MALWARE = 'MALWARE',
}

/**
 * Risk levels for brand safety
 */
export enum RiskLevel {
  SAFE = 'SAFE',
  LOW_RISK = 'LOW_RISK',
  MEDIUM_RISK = 'MEDIUM_RISK',
  HIGH_RISK = 'HIGH_RISK',
  UNSAFE = 'UNSAFE',
}

/**
 * Brand safety check result
 */
export interface BrandSafetyResult {
  safe: boolean;
  riskLevel: RiskLevel;
  riskScore: number; // 0-100
  flaggedCategories: BrandSafetyCategory[];
  reasons: string[];
  recommendations: string[];
}

/**
 * Content to be checked for brand safety
 */
export interface ContentToCheck {
  url?: string;
  title?: string;
  description?: string;
  keywords?: string[];
  html?: string;
  domain?: string;
}

/**
 * Brand Safety Filter Service
 * Checks content for brand safety issues to protect advertiser brands
 */
export class BrandSafetyFilter {
  private static instance: BrandSafetyFilter;

  // Blocked keywords by category
  private readonly blockedKeywords: Map<BrandSafetyCategory, string[]> = new Map([
    [
      BrandSafetyCategory.ADULT_CONTENT,
      ['porn', 'xxx', 'adult', 'nsfw', 'explicit', 'sex', 'nude', 'naked', 'escort'],
    ],
    [
      BrandSafetyCategory.GAMBLING,
      ['casino', 'poker', 'betting', 'gambling', 'lottery', 'slots', 'jackpot', 'wager'],
    ],
    [
      BrandSafetyCategory.VIOLENCE,
      ['gore', 'murder', 'violent', 'terrorism', 'terrorist', 'shooting', 'massacre'],
    ],
    [
      BrandSafetyCategory.HATE_SPEECH,
      ['hate', 'racist', 'nazi', 'supremacist', 'bigot', 'discrimination'],
    ],
    [
      BrandSafetyCategory.ILLEGAL_DRUGS,
      ['cocaine', 'heroin', 'meth', 'drug dealer', 'illegal drugs', 'narcotics'],
    ],
    [
      BrandSafetyCategory.WEAPONS,
      ['gun sale', 'weapons', 'firearms', 'explosives', 'ammunition', 'assault rifle'],
    ],
    [BrandSafetyCategory.PROFANITY, ['fuck', 'shit', 'bitch', 'damn', 'hell']],
    [
      BrandSafetyCategory.CONTROVERSIAL_POLITICS,
      ['extremist', 'radical', 'conspiracy', 'propaganda'],
    ],
    [BrandSafetyCategory.PIRACY, ['torrent', 'pirate', 'cracked', 'warez', 'illegal download']],
    [BrandSafetyCategory.MALWARE, ['malware', 'virus', 'phishing', 'scam', 'fraud']],
  ]);

  // Suspicious TLDs that are often associated with unsafe content
  private readonly suspiciousTLDs = [
    '.adult',
    '.xxx',
    '.porn',
    '.sex',
    '.casino',
    '.bet',
    '.poker',
    '.download',
    '.top',
    '.xyz',
  ];

  // Trusted domains (whitelist)
  private readonly trustedDomains = [
    'google.com',
    'facebook.com',
    'twitter.com',
    'linkedin.com',
    'youtube.com',
    'amazon.com',
    'microsoft.com',
    'apple.com',
    'netflix.com',
    'wikipedia.org',
    'github.com',
    'stackoverflow.com',
    'reddit.com',
  ];

  private constructor() {
    logger.info('Brand Safety Filter initialized');
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): BrandSafetyFilter {
    if (!BrandSafetyFilter.instance) {
      BrandSafetyFilter.instance = new BrandSafetyFilter();
    }
    return BrandSafetyFilter.instance;
  }

  /**
   * Check content for brand safety issues
   */
  public async checkContent(content: ContentToCheck): Promise<BrandSafetyResult> {
    const flaggedCategories: BrandSafetyCategory[] = [];
    const reasons: string[] = [];
    let riskScore = 0;

    try {
      // Check domain first (if provided)
      if (content.domain) {
        const domainCheck = this.checkDomain(content.domain);
        if (!domainCheck.safe) {
          flaggedCategories.push(...domainCheck.categories);
          reasons.push(...domainCheck.reasons);
          riskScore += domainCheck.score;
        }
      }

      // Check URL (if provided)
      if (content.url) {
        const urlCheck = this.checkURL(content.url);
        if (!urlCheck.safe) {
          flaggedCategories.push(...urlCheck.categories);
          reasons.push(...urlCheck.reasons);
          riskScore += urlCheck.score;
        }
      }

      // Check text content
      const textContent = [
        content.title || '',
        content.description || '',
        ...(content.keywords || []),
      ].join(' ');

      if (textContent.trim()) {
        const textCheck = this.checkText(textContent);
        if (!textCheck.safe) {
          flaggedCategories.push(...textCheck.categories);
          reasons.push(...textCheck.reasons);
          riskScore += textCheck.score;
        }
      }

      // Check HTML content (if provided)
      if (content.html) {
        const htmlCheck = this.checkHTML(content.html);
        if (!htmlCheck.safe) {
          flaggedCategories.push(...htmlCheck.categories);
          reasons.push(...htmlCheck.reasons);
          riskScore += htmlCheck.score;
        }
      }

      // Deduplicate categories
      const uniqueCategories = Array.from(new Set(flaggedCategories));

      // Calculate final risk level
      const riskLevel = this.calculateRiskLevel(riskScore);
      const safe = riskLevel === RiskLevel.SAFE || riskLevel === RiskLevel.LOW_RISK;

      // Generate recommendations
      const recommendations = this.generateRecommendations(uniqueCategories, riskLevel);

      return {
        safe,
        riskLevel,
        riskScore: Math.min(riskScore, 100),
        flaggedCategories: uniqueCategories,
        reasons,
        recommendations,
      };
    } catch (error) {
      logger.error('Brand safety check error', { error, content });
      // On error, return safe to avoid blocking legitimate content
      return {
        safe: true,
        riskLevel: RiskLevel.SAFE,
        riskScore: 0,
        flaggedCategories: [],
        reasons: ['Error during safety check - defaulting to safe'],
        recommendations: [],
      };
    }
  }

  /**
   * Check domain for safety issues
   */
  private checkDomain(
    domain: string
  ): { safe: boolean; categories: BrandSafetyCategory[]; reasons: string[]; score: number } {
    const categories: BrandSafetyCategory[] = [];
    const reasons: string[] = [];
    let score = 0;

    const lowerDomain = domain.toLowerCase();

    // Check if domain is in trusted list
    const isTrusted = this.trustedDomains.some((trusted) => lowerDomain.includes(trusted));
    if (isTrusted) {
      return { safe: true, categories: [], reasons: [], score: 0 };
    }

    // Check for suspicious TLDs
    for (const tld of this.suspiciousTLDs) {
      if (lowerDomain.endsWith(tld)) {
        categories.push(BrandSafetyCategory.ADULT_CONTENT);
        reasons.push(`Suspicious TLD detected: ${tld}`);
        score += 30;
        break;
      }
    }

    // Check for blocked keywords in domain
    for (const [category, keywords] of this.blockedKeywords) {
      for (const keyword of keywords) {
        if (lowerDomain.includes(keyword.toLowerCase())) {
          categories.push(category);
          reasons.push(`Blocked keyword in domain: ${keyword}`);
          score += 25;
        }
      }
    }

    return {
      safe: categories.length === 0,
      categories,
      reasons,
      score,
    };
  }

  /**
   * Check URL for safety issues
   */
  private checkURL(
    url: string
  ): { safe: boolean; categories: BrandSafetyCategory[]; reasons: string[]; score: number } {
    const categories: BrandSafetyCategory[] = [];
    const reasons: string[] = [];
    let score = 0;

    const lowerURL = url.toLowerCase();

    // Check for IP addresses (often associated with suspicious content)
    const ipPattern = /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/;
    if (ipPattern.test(url)) {
      categories.push(BrandSafetyCategory.MALWARE);
      reasons.push('URL contains IP address instead of domain name');
      score += 20;
    }

    // Check for blocked keywords in URL path
    for (const [category, keywords] of this.blockedKeywords) {
      for (const keyword of keywords) {
        if (lowerURL.includes(keyword.toLowerCase())) {
          categories.push(category);
          reasons.push(`Blocked keyword in URL: ${keyword}`);
          score += 15;
        }
      }
    }

    return {
      safe: categories.length === 0,
      categories,
      reasons,
      score,
    };
  }

  /**
   * Check text content for safety issues
   */
  private checkText(
    text: string
  ): { safe: boolean; categories: BrandSafetyCategory[]; reasons: string[]; score: number } {
    const categories: BrandSafetyCategory[] = [];
    const reasons: string[] = [];
    let score = 0;

    const lowerText = text.toLowerCase();

    // Check for blocked keywords
    for (const [category, keywords] of this.blockedKeywords) {
      for (const keyword of keywords) {
        if (lowerText.includes(keyword.toLowerCase())) {
          categories.push(category);
          reasons.push(`Blocked keyword found: ${keyword}`);
          score += 10;
        }
      }
    }

    return {
      safe: categories.length === 0,
      categories,
      reasons,
      score,
    };
  }

  /**
   * Check HTML content for safety issues
   */
  private checkHTML(
    html: string
  ): { safe: boolean; categories: BrandSafetyCategory[]; reasons: string[]; score: number } {
    const categories: BrandSafetyCategory[] = [];
    const reasons: string[] = [];
    let score = 0;

    const lowerHTML = html.toLowerCase();

    // Check for suspicious scripts
    if (lowerHTML.includes('<script') && !lowerHTML.includes('google') && !lowerHTML.includes('analytics')) {
      categories.push(BrandSafetyCategory.MALWARE);
      reasons.push('Suspicious script tags detected');
      score += 15;
    }

    // Check for iframe injection (common in malicious content)
    if (lowerHTML.includes('<iframe')) {
      categories.push(BrandSafetyCategory.MALWARE);
      reasons.push('Iframe tags detected (potential security risk)');
      score += 10;
    }

    // Check for hidden content (often used for SEO spam)
    if (lowerHTML.includes('display:none') || lowerHTML.includes('visibility:hidden')) {
      reasons.push('Hidden content detected');
      score += 5;
    }

    return {
      safe: categories.length === 0,
      categories,
      reasons,
      score,
    };
  }

  /**
   * Calculate risk level based on risk score
   */
  private calculateRiskLevel(score: number): RiskLevel {
    if (score === 0) return RiskLevel.SAFE;
    if (score < 20) return RiskLevel.LOW_RISK;
    if (score < 40) return RiskLevel.MEDIUM_RISK;
    if (score < 60) return RiskLevel.HIGH_RISK;
    return RiskLevel.UNSAFE;
  }

  /**
   * Generate recommendations based on findings
   */
  private generateRecommendations(
    categories: BrandSafetyCategory[],
    riskLevel: RiskLevel
  ): string[] {
    const recommendations: string[] = [];

    if (riskLevel === RiskLevel.SAFE) {
      recommendations.push('Content passed all brand safety checks');
      return recommendations;
    }

    if (categories.includes(BrandSafetyCategory.ADULT_CONTENT)) {
      recommendations.push('Remove or block adult content to ensure brand safety');
    }

    if (categories.includes(BrandSafetyCategory.MALWARE)) {
      recommendations.push('Content may contain malicious elements - thorough review recommended');
    }

    if (categories.includes(BrandSafetyCategory.HATE_SPEECH)) {
      recommendations.push('Hate speech detected - immediate action required');
    }

    if (riskLevel === RiskLevel.HIGH_RISK || riskLevel === RiskLevel.UNSAFE) {
      recommendations.push('Block this content from ad serving to protect advertiser brands');
    } else if (riskLevel === RiskLevel.MEDIUM_RISK) {
      recommendations.push('Manual review recommended before serving ads on this content');
    } else {
      recommendations.push('Monitor this content for any changes in safety status');
    }

    return recommendations;
  }

  /**
   * Add custom trusted domain
   */
  public addTrustedDomain(domain: string): void {
    this.trustedDomains.push(domain.toLowerCase());
    logger.info('Added trusted domain', { domain });
  }

  /**
   * Remove trusted domain
   */
  public removeTrustedDomain(domain: string): void {
    const index = this.trustedDomains.indexOf(domain.toLowerCase());
    if (index > -1) {
      this.trustedDomains.splice(index, 1);
      logger.info('Removed trusted domain', { domain });
    }
  }

  /**
   * Add custom blocked keyword to a category
   */
  public addBlockedKeyword(category: BrandSafetyCategory, keyword: string): void {
    const keywords = this.blockedKeywords.get(category) || [];
    keywords.push(keyword.toLowerCase());
    this.blockedKeywords.set(category, keywords);
    logger.info('Added blocked keyword', { category, keyword });
  }
}
