import { RTBEngine } from '../../../src/services/adtech/rtb/RTBEngine';
import { PartnerService } from '../../../src/services/adtech/rtb/PartnerService';
import { RedisService } from '../../../src/services/caching/RedisService';
import { TurbospikeService } from '../../../src/services/database/TurbospikeService';
import { prisma } from '../../../src/config/database';
import { BidRequest } from '../../../src/services/adtech/rtb/types';

// Mock dependencies
jest.mock('../../../src/services/adtech/rtb/PartnerService');
jest.mock('../../../src/services/caching/RedisService');
jest.mock('../../../src/services/database/TurbospikeService');
jest.mock('../../../src/config/database', () => ({
    prisma: {
        campaign: {
            findMany: jest.fn(),
        },
        bid: {
            create: jest.fn(),
        },
    },
}));

describe('RTBEngine', () => {
    let rtbEngine: RTBEngine;
    let mockPartnerService: jest.Mocked<PartnerService>;
    let mockRedisService: jest.Mocked<RedisService>;
    let mockTurbospikeService: jest.Mocked<TurbospikeService>;

    beforeAll(() => {
        // Setup mocks
        (RedisService.getInstance as jest.Mock).mockReturnValue({
            getOrSet: jest.fn(),
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
            increment: jest.fn(),
            expire: jest.fn(),
            sismember: jest.fn(),
        });

        (TurbospikeService.getInstance as jest.Mock).mockReturnValue({
            get: jest.fn(),
            put: jest.fn(),
            delete: jest.fn(),
        });

        (PartnerService.getInstance as jest.Mock).mockReturnValue({
            getActiveDSPs: jest.fn(),
            requestBidFromDSP: jest.fn(),
        });

        mockPartnerService = PartnerService.getInstance() as jest.Mocked<PartnerService>;
        mockRedisService = RedisService.getInstance() as jest.Mocked<RedisService>;
        mockTurbospikeService = TurbospikeService.getInstance() as jest.Mocked<TurbospikeService>;
        rtbEngine = RTBEngine.getInstance();
    });

    beforeEach(() => {
        jest.clearAllMocks();

        // Default mocks
        mockRedisService.getOrSet.mockImplementation(async (key: string, ttl: number, fn: () => Promise<any>) => fn());
        mockRedisService.get.mockResolvedValue(null);
        mockTurbospikeService.get.mockResolvedValue(null);
        mockPartnerService.getActiveDSPs.mockResolvedValue([]);
        (prisma.campaign.findMany as jest.Mock).mockResolvedValue([]);
    });

    const mockBidRequest: BidRequest = {
        requestId: 'req-123',
        placementId: 'place-123',
        publisherId: 'pub-123',
        inventoryType: 'banner',
        deviceType: 'mobile',
        country: 'US',
        floorPrice: 0.5,
        timestamp: new Date(),
        userId: 'user-123'
    };

    it('should enrich bid request with user profile from Turbospike', async () => {
        const mockProfile = { segments: 'sports,tech' };
        mockTurbospikeService.get.mockResolvedValue(mockProfile);

        await rtbEngine.runAuction(mockBidRequest);

        expect(mockTurbospikeService.get).toHaveBeenCalledWith('users', 'user-123');
    });

    it('should return no-fill if no campaigns or DSPs are available', async () => {
        const result = await rtbEngine.runAuction(mockBidRequest);

        expect(result.winningBid).toBeNull();
        expect(result.clearingPrice).toBe(0);
    });

    it('should run auction with internal campaigns', async () => {
        const mockCampaign = {
            id: 'camp-1',
            advertiserId: 'adv-1',
            budget: 1000,
            spent: 100,
            bidStrategy: 'CPM',
            maxBid: 2.0,
            targeting: { countries: ['US'] },
            creatives: [{ creativeId: 'cr-1' }]
        };

        (prisma.campaign.findMany as jest.Mock).mockResolvedValue([mockCampaign]);
        mockRedisService.getOrSet.mockImplementation(async (key: string, ttl: number, fn: () => Promise<any>) => {
            if (key.includes('spent')) return 100; // Mock spent
            return fn();
        });

        const result = await rtbEngine.runAuction(mockBidRequest);

        expect(result.winningBid).toBeDefined();
        expect(result.winningBid?.campaignId).toBe('camp-1');
        expect(result.winningBid?.bidPrice).toBeGreaterThanOrEqual(0.5);
    });

    it('should filter campaigns based on targeting', async () => {
        const mockCampaignUS = {
            id: 'camp-us',
            targeting: { countries: ['US'] },
            budget: 1000, spent: 0, bidStrategy: 'CPM', maxBid: 1, creatives: [{}]
        };
        const mockCampaignUK = {
            id: 'camp-uk',
            targeting: { countries: ['UK'] },
            budget: 1000, spent: 0, bidStrategy: 'CPM', maxBid: 1, creatives: [{}]
        };

        (prisma.campaign.findMany as jest.Mock).mockResolvedValue([mockCampaignUS, mockCampaignUK]);

        const result = await rtbEngine.runAuction(mockBidRequest); // Request is US

        // Should pick US campaign
        expect(result.winningBid?.campaignId).toBe('camp-us');
    });

    it('should respect budget limits', async () => {
        const mockCampaign = {
            id: 'camp-budget',
            budget: 100,
            spent: 100, // Budget exhausted
            bidStrategy: 'CPM', maxBid: 1, targeting: {}, creatives: [{}]
        };

        (prisma.campaign.findMany as jest.Mock).mockResolvedValue([mockCampaign]);
        mockRedisService.getOrSet.mockImplementation(async (key: string) => {
            if (key.includes('spent')) return 100;
            return null;
        });

        const result = await rtbEngine.runAuction(mockBidRequest);

        expect(result.winningBid).toBeNull();
    });

    it('should conduct second-price auction correctly', async () => {
        const camp1 = {
            id: 'c1',
            maxBid: 5.0,
            bidStrategy: 'CPM',
            budget: 1000,
            spent: 0,
            targeting: { countries: ['US'] },
            creatives: [{ creativeId: 'cr-1' }]
        };
        const camp2 = {
            id: 'c2',
            maxBid: 3.0,
            bidStrategy: 'CPM',
            budget: 1000,
            spent: 0,
            targeting: { countries: ['US'] },
            creatives: [{ creativeId: 'cr-2' }]
        };

        (prisma.campaign.findMany as jest.Mock).mockResolvedValue([camp1, camp2]);
        mockRedisService.getOrSet.mockImplementation(async (key: string, ttl: number, fn: () => Promise<any>) => {
            if (key.includes('spent')) return 0;
            return fn ? fn() : null;
        });

        const result = await rtbEngine.runAuction(mockBidRequest);

        expect(result.winningBid?.campaignId).toBe('c1'); // Highest bidder wins
        expect(result.clearingPrice).toBe(3.0); // Pays second price
    });

    it('should handle external DSP bids', async () => {
        const mockDSP = {
            id: 'dsp-1',
            endpoint: 'http://dsp.com',
            name: 'Mock DSP',
            type: 'DSP',
            apiKey: 'key-123',
            latencyMs: 100,
            winRate: 0.8,
            active: true,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        mockPartnerService.getActiveDSPs.mockResolvedValue([mockDSP as any]);

        mockPartnerService.requestBidFromDSP.mockResolvedValue({
            bidId: 'bid-dsp',
            campaignId: 'ext_camp',
            advertiserId: 'ext_adv',
            bidPrice: 1.5,
            creativeId: 'cr-ext'
        });

        const result = await rtbEngine.runAuction(mockBidRequest);

        expect(result.winningBid?.campaignId).toBe('ext_camp');
        expect(result.winningBid?.bidPrice).toBe(1.5);
    });
});
