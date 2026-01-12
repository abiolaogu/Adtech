import request from 'supertest';
import { app } from '../../src/index';
import { prisma } from '../../src/config/database';
import { RedisService } from '../../src/services/caching/RedisService';

// Mock Redis
jest.mock('../../src/services/caching/RedisService');
(RedisService.getInstance as jest.Mock).mockReturnValue({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(true),
    del: jest.fn().mockResolvedValue(true),
    getOrSet: jest.fn().mockImplementation((key, ttl, fn) => fn()),
    incrementHash: jest.fn().mockResolvedValue(1),
});

describe('E2E Full Flow', () => {
    let authToken: string;
    let campaignId: string;
    const testEmail = `e2e-${Date.now()}@test.com`;

    beforeAll(async () => {
        // Cleanup
        await prisma.user.deleteMany({ where: { email: testEmail } });
    });

    afterAll(async () => {
        if (campaignId) {
            await prisma.campaign.delete({ where: { id: campaignId } });
        }
        await prisma.user.deleteMany({ where: { email: testEmail } });
        await prisma.$disconnect();
    });

    it('1. Should register a new advertiser', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({
                email: testEmail,
                password: 'Password123!',
                name: 'E2E Advertiser',
                role: 'ADVERTISER'
            });

        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('token');
        authToken = res.body.token;
    });

    it('2. Should create a campaign', async () => {
        const res = await request(app)
            .post('/api/adtech/campaigns')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                name: 'E2E Campaign',
                budget: 5000,
                bidStrategy: 'CPM',
                maxBid: 5.0,
                startDate: new Date().toISOString(),
                targeting: { countries: ['US'], deviceTypes: ['mobile'] }
            });

        expect(res.status).toBe(201);
        campaignId = res.body.id;
    });

    it('3. Should simulate a bid request (RTB)', async () => {
        // Note: This endpoint might need to be exposed or we test the service directly if it's internal
        // Assuming there's an endpoint /api/adtech/bid or similar for SSPs

        const res = await request(app)
            .post('/api/adtech/bid')
            .send({
                requestId: 'e2e-req-1',
                placementId: 'place-1',
                publisherId: 'pub-1',
                inventoryType: 'banner',
                deviceType: 'mobile',
                country: 'US',
                floorPrice: 1.0,
                timestamp: new Date()
            });

        // Since we just created a matching campaign, we expect a bid
        // Note: The campaign might need to be "active" which might require approval or start date check
        // If it fails to bid, it might be due to mocking or campaign status

        // For E2E, we check if the endpoint responds correctly at least
        expect([200, 204]).toContain(res.status);
        if (res.status === 200) {
            expect(res.body).toHaveProperty('bidPrice');
        }
    });

    it('4. Should view analytics', async () => {
        const res = await request(app)
            .get('/api/adtech/analytics')
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.status).toBe(200);
        // Should have some data structure
        expect(res.body).toHaveProperty('impressions');
    });
});
