import request from 'supertest';
import { app } from '../../../src/index';
import { prisma } from '../../../src/config/database';
import { RedisService } from '../../../src/services/caching/RedisService';

// Mock Redis to avoid connection issues during tests
jest.mock('../../../src/services/caching/RedisService');
(RedisService.getInstance as jest.Mock).mockReturnValue({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(true),
    del: jest.fn().mockResolvedValue(true),
    getOrSet: jest.fn().mockImplementation((key, ttl, fn) => fn()),
});

// Mock Auth Middleware to bypass login
jest.mock('../../../src/middleware/auth', () => ({
    authenticate: (req: any, res: any, next: any) => {
        req.user = { id: 'user-123', role: 'ADVERTISER' };
        next();
    },
    authorize: (...roles: string[]) => (req: any, res: any, next: any) => next()
}));

describe('Campaign API', () => {
    let createdCampaignId: string;

    beforeAll(async () => {
        // Clean up DB
        await prisma.campaign.deleteMany({ where: { name: 'Test Campaign' } });
    });

    afterAll(async () => {
        await prisma.campaign.deleteMany({ where: { name: 'Test Campaign' } });
        await prisma.$disconnect();
    });

    it('should create a new campaign', async () => {
        const res = await request(app)
            .post('/api/adtech/campaigns')
            .send({
                name: 'Test Campaign',
                budget: 1000,
                bidStrategy: 'CPM',
                maxBid: 2.5,
                startDate: new Date().toISOString(),
                targeting: { countries: ['US'] }
            });

        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('id');
        expect(res.body.name).toBe('Test Campaign');
        createdCampaignId = res.body.id;
    });

    it('should get all campaigns', async () => {
        const res = await request(app)
            .get('/api/adtech/campaigns');

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.some((c: any) => c.id === createdCampaignId)).toBe(true);
    });

    it('should get a single campaign', async () => {
        const res = await request(app)
            .get(`/api/adtech/campaigns/${createdCampaignId}`);

        expect(res.status).toBe(200);
        expect(res.body.id).toBe(createdCampaignId);
    });

    it('should update a campaign', async () => {
        const res = await request(app)
            .put(`/api/adtech/campaigns/${createdCampaignId}`)
            .send({
                budget: 2000,
                status: 'PAUSED'
            });

        expect(res.status).toBe(200);
        expect(res.body.budget).toBe(2000);
        expect(res.body.status).toBe('PAUSED');
    });

    it('should delete a campaign', async () => {
        const res = await request(app)
            .delete(`/api/adtech/campaigns/${createdCampaignId}`);

        expect(res.status).toBe(200); // Or 204 depending on implementation

        // Verify it's gone
        const check = await request(app)
            .get(`/api/adtech/campaigns/${createdCampaignId}`);

        expect(check.status).toBe(404);
    });
});
