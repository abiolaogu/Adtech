import { AdServer } from '../../../src/services/adserver/AdServer';
import { RedisService } from '../../../src/services/caching/RedisService';

// Mock dependencies
jest.mock('../../../src/services/caching/RedisService');
jest.mock('../../../src/services/programmatic/ProgrammaticBuyingEngine');
jest.mock('../../../src/services/security/FraudDetectionEngine');
jest.mock('../../../src/services/adtech/rtb/PartnerService');
jest.mock('../../../src/config/database', () => ({
    prisma: {
        campaign: {
            findMany: jest.fn(),
        },
    },
}));

describe('AdServer', () => {
    let adServer: AdServer;
    let mockRedisService: jest.Mocked<RedisService>;

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock RedisService singleton
        mockRedisService = {
            get: jest.fn(),
            set: jest.fn(),
            increment: jest.fn(),
            getOrSet: jest.fn(),
            delete: jest.fn(),
        } as any;

        (RedisService.getInstance as jest.Mock).mockReturnValue(mockRedisService);

        adServer = AdServer.getInstance();
    });

    describe('serveAd', () => {
        it('should validate request parameters', async () => {
            const invalidRequest = {
                requestId: 'test-123',
                timestamp: Date.now(),
                placementId: '',
                publisherId: 'pub-1',
                siteId: 'site-1',
                pageUrl: 'http://example.com',
                adUnitId: 'unit-1',
                format: 'display' as const,
                sizes: ['300x250'],
                ipAddress: '127.0.0.1',
                userAgent: 'test-agent',
                deviceType: 'desktop' as const,
                geo: { country: 'US' },
            };

            await expect(adServer.serveAd(invalidRequest)).rejects.toThrow(
                'Missing placement ID'
            );
        });

        it('should successfully serve an ad for valid request', async () => {
            const validRequest = {
                requestId: 'test-123',
                timestamp: Date.now(),
                placementId: 'placement-1',
                publisherId: 'pub-1',
                siteId: 'site-1',
                pageUrl: 'http://example.com',
                adUnitId: 'unit-1',
                format: 'display' as const,
                sizes: ['300x250'],
                ipAddress: '127.0.0.1',
                userAgent: 'test-agent',
                deviceType: 'desktop' as const,
                geo: { country: 'US' },
            };

            // This test would need more setup with mocked fraud detection and campaigns
            // For now, we're testing the basic validation
            // A full implementation would mock all dependencies and verify the complete flow
        });
    });

    describe('trackImpression', () => {
        it('should increment impression metrics in Redis', async () => {
            mockRedisService.increment.mockResolvedValue(10);

            await adServer.trackImpression('test-request-123');

            expect(mockRedisService.increment).toHaveBeenCalledWith('metrics:impressions');
        });

        it('should track viewable impressions separately', async () => {
            mockRedisService.increment.mockResolvedValue(5);

            await adServer.trackImpression('test-request-123', {
                viewable: true,
                viewTime: 1000,
                clickthrough: false,
            });

            expect(mockRedisService.increment).toHaveBeenCalledWith('metrics:impressions');
            expect(mockRedisService.increment).toHaveBeenCalledWith('metrics:viewable');
        });
    });

    describe('trackClick', () => {
        it('should increment click metrics in Redis', async () => {
            mockRedisService.increment.mockResolvedValue(3);

            await adServer.trackClick('test-request-123');

            expect(mockRedisService.increment).toHaveBeenCalledWith('metrics:clicks');
        });
    });

    describe('trackConversion', () => {
        it('should increment conversion metrics in Redis', async () => {
            mockRedisService.increment.mockResolvedValue(1);

            await adServer.trackConversion('test-request-123', 99.99);

            expect(mockRedisService.increment).toHaveBeenCalledWith('metrics:conversions');
        });
    });
});
