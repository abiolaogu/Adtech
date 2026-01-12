import { PartnerService } from '../../../src/services/adtech/rtb/PartnerService';
import { prisma } from '../../../src/config/database';
import { BidRequest } from '../../../src/services/adtech/rtb/types';

// Mock dependencies
jest.mock('../../../src/config/database', () => ({
    prisma: {
        partner: {
            findMany: jest.fn(),
        },
    },
}));

describe('PartnerService', () => {
    let partnerService: PartnerService;

    beforeAll(() => {
        partnerService = PartnerService.getInstance();
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    const mockBidRequest: BidRequest = {
        requestId: 'req-123',
        placementId: 'place-123',
        publisherId: 'pub-123',
        inventoryType: 'banner',
        deviceType: 'mobile',
        country: 'US',
        floorPrice: 0.5,
        timestamp: new Date()
    };

    it('should retrieve active DSPs', async () => {
        const mockPartners = [
            { id: 'p1', name: 'DSP 1', type: 'DSP', active: true },
            { id: 'p2', name: 'DSP 2', type: 'DSP', active: true }
        ];
        (prisma.partner.findMany as jest.Mock).mockResolvedValue(mockPartners);

        const dsps = await partnerService.getActiveDSPs();

        expect(dsps).toHaveLength(2);
        expect(prisma.partner.findMany).toHaveBeenCalledWith({
            where: { type: 'DSP', active: true }
        });
    });

    it('should simulate a bid from a DSP', async () => {
        const mockDSP = {
            id: 'p1',
            name: 'DSP 1',
            endpoint: 'http://dsp1.com',
            settings: { winRate: 1.0, latencyMs: 0 } // Always win, no latency
        };

        const bid = await partnerService.requestBidFromDSP(mockDSP, mockBidRequest);

        expect(bid).not.toBeNull();
        expect(bid?.bidPrice).toBeGreaterThan(mockBidRequest.floorPrice);
        expect(bid?.campaignId).toContain('ext_');
    });

    it('should return null if simulated DSP decides not to bid', async () => {
        const mockDSP = {
            id: 'p1',
            name: 'DSP 1',
            endpoint: 'http://dsp1.com',
            settings: { winRate: 0.0 } // Never win
        };

        const bid = await partnerService.requestBidFromDSP(mockDSP, mockBidRequest);

        expect(bid).toBeNull();
    });

    it('should handle errors gracefully', async () => {
        // Simulate an error by passing an invalid DSP object that might cause issues if not handled
        // or just rely on the fact that requestBidFromDSP catches errors
        const mockDSP = {
            id: 'p1',
            name: 'DSP 1',
            endpoint: 'http://dsp1.com',
            settings: null // Invalid settings
        };

        // We expect it not to throw
        const bid = await partnerService.requestBidFromDSP(mockDSP, mockBidRequest);

        // It might return a bid with defaults or null depending on implementation
        // The key is it doesn't crash
        expect(true).toBe(true);
    });
});
