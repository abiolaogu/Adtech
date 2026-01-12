import request from 'supertest';
import app from '../../src/app';
import { PrismaClient } from '@prisma/client';

/**
 * End-to-End Tests for Campaign Management
 *
 * Tests complete campaign lifecycle:
 * 1. User authentication
 * 2. Campaign creation
 * 3. Creative upload
 * 4. Campaign activation
 * 5. Ad serving
 * 6. Performance tracking
 * 7. Reporting
 */

const prisma = new PrismaClient();

describe('Campaign E2E Tests', () => {
  let authToken: string;
  let userId: string;
  let campaignId: string;
  let creativeId: string;

  beforeAll(async () => {
    // Clean test database
    await prisma.$executeRaw`TRUNCATE TABLE "User", "Campaign", "Creative" CASCADE`;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Authentication', () => {
    it('should register a new user', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'SecurePass123!',
          name: 'Test User',
        })
        .expect(201);

      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe('test@example.com');
      userId = response.body.user.id;
    });

    it('should login and receive auth token', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'SecurePass123!',
        })
        .expect(200);

      expect(response.body).toHaveProperty('token');
      authToken = response.body.token;
    });

    it('should reject invalid credentials', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword',
        })
        .expect(401);
    });
  });

  describe('Campaign Creation', () => {
    it('should create a new campaign', async () => {
      const response = await request(app)
        .post('/api/campaigns')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Campaign',
          objective: 'conversions',
          totalBudget: 10000,
          dailyBudget: 500,
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          targeting: {
            geo: ['US', 'CA'],
            age: { min: 25, max: 45 },
            interests: ['technology', 'finance'],
          },
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('Test Campaign');
      expect(response.body.status).toBe('DRAFT');
      campaignId = response.body.id;
    });

    it('should retrieve campaign details', async () => {
      const response = await request(app)
        .get(`/api/campaigns/${campaignId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.id).toBe(campaignId);
      expect(response.body.name).toBe('Test Campaign');
    });

    it('should update campaign', async () => {
      const response = await request(app)
        .patch(`/api/campaigns/${campaignId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          dailyBudget: 750,
        })
        .expect(200);

      expect(response.body.dailyBudget).toBe(750);
    });
  });

  describe('Creative Management', () => {
    it('should upload creative', async () => {
      const response = await request(app)
        .post('/api/creatives')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Banner',
          format: 'display',
          size: '300x250',
          content: '<div>Test Ad</div>',
          clickUrl: 'https://example.com',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      creativeId = response.body.id;
    });

    it('should associate creative with campaign', async () => {
      await request(app)
        .post(`/api/campaigns/${campaignId}/creatives`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          creativeId,
        })
        .expect(201);
    });
  });

  describe('Campaign Activation', () => {
    it('should activate campaign', async () => {
      const response = await request(app)
        .post(`/api/campaigns/${campaignId}/activate`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.status).toBe('ACTIVE');
    });

    it('should not activate campaign without creative', async () => {
      // Create campaign without creative
      const noCreaiveResponse = await request(app)
        .post('/api/campaigns')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'No Creative Campaign',
          objective: 'traffic',
          totalBudget: 1000,
          startDate: new Date().toISOString(),
        })
        .expect(201);

      await request(app)
        .post(`/api/campaigns/${noCreaiveResponse.body.id}/activate`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });
  });

  describe('Ad Serving', () => {
    it('should serve ad from active campaign', async () => {
      const response = await request(app)
        .post('/api/ad/serve')
        .send({
          placementId: 'test_placement',
          publisherId: 'test_publisher',
          format: 'display',
          sizes: ['300x250'],
          pageUrl: 'https://example.com/page',
          deviceType: 'desktop',
          geo: {
            country: 'US',
          },
        })
        .expect(200);

      expect(response.body).toHaveProperty('adId');
      expect(response.body).toHaveProperty('creative');
      expect(response.body).toHaveProperty('impressionUrl');
    });

    it('should track impression', async () => {
      const serveResponse = await request(app)
        .post('/api/ad/serve')
        .send({
          placementId: 'test_placement',
          publisherId: 'test_publisher',
          format: 'display',
          sizes: ['300x250'],
          pageUrl: 'https://example.com',
          deviceType: 'desktop',
          geo: { country: 'US' },
        });

      const adId = serveResponse.body.adId;

      await request(app)
        .post(`/api/track/impression/${adId}`)
        .send({
          viewable: true,
          viewTime: 5000,
        })
        .expect(200);
    });

    it('should track click', async () => {
      const serveResponse = await request(app)
        .post('/api/ad/serve')
        .send({
          placementId: 'test_placement',
          publisherId: 'test_publisher',
          format: 'display',
          sizes: ['300x250'],
          pageUrl: 'https://example.com',
          deviceType: 'desktop',
          geo: { country: 'US' },
        });

      const adId = serveResponse.body.adId;

      await request(app).post(`/api/track/click/${adId}`).expect(200);
    });
  });

  describe('Performance Reporting', () => {
    it('should get campaign performance', async () => {
      const response = await request(app)
        .get(`/api/campaigns/${campaignId}/performance`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString(),
        })
        .expect(200);

      expect(response.body).toHaveProperty('impressions');
      expect(response.body).toHaveProperty('clicks');
      expect(response.body).toHaveProperty('ctr');
      expect(response.body).toHaveProperty('spend');
    });

    it('should generate report', async () => {
      const response = await request(app)
        .post('/api/reports')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Campaign Performance Report',
          type: 'campaign_performance',
          dateRange: {
            start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            end: new Date().toISOString(),
          },
          dimensions: ['campaign', 'date'],
          metrics: ['impressions', 'clicks', 'ctr', 'spend', 'conversions'],
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('downloadUrl');
    });
  });

  describe('Campaign Pause/Resume', () => {
    it('should pause campaign', async () => {
      const response = await request(app)
        .post(`/api/campaigns/${campaignId}/pause`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.status).toBe('PAUSED');
    });

    it('should not serve ads from paused campaign', async () => {
      const response = await request(app)
        .post('/api/ad/serve')
        .send({
          placementId: 'test_placement',
          publisherId: 'test_publisher',
          format: 'display',
          sizes: ['300x250'],
          pageUrl: 'https://example.com',
          deviceType: 'desktop',
          geo: { country: 'US' },
        })
        .expect(200);

      // Should not serve the paused campaign
      expect(response.body.campaignId).not.toBe(campaignId);
    });

    it('should resume campaign', async () => {
      const response = await request(app)
        .post(`/api/campaigns/${campaignId}/resume`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.status).toBe('ACTIVE');
    });
  });

  describe('Budget Management', () => {
    it('should pause campaign when budget exhausted', async () => {
      // Update campaign to low budget
      await request(app)
        .patch(`/api/campaigns/${campaignId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          totalBudget: 1, // $1
          spent: 1, // Exhausted
        });

      const response = await request(app)
        .get(`/api/campaigns/${campaignId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.status).toBe('PAUSED');
    });
  });

  describe('Data Validation', () => {
    it('should reject campaign with invalid budget', async () => {
      await request(app)
        .post('/api/campaigns')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Invalid Campaign',
          objective: 'conversions',
          totalBudget: -100, // Negative budget
          startDate: new Date().toISOString(),
        })
        .expect(400);
    });

    it('should reject campaign with past start date', async () => {
      await request(app)
        .post('/api/campaigns')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Past Campaign',
          objective: 'traffic',
          totalBudget: 1000,
          startDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .expect(400);
    });
  });

  describe('Authorization', () => {
    it('should not allow unauthorized access', async () => {
      await request(app).get(`/api/campaigns/${campaignId}`).expect(401);
    });

    it('should not allow access to other users campaigns', async () => {
      // Create another user
      await request(app).post('/api/auth/register').send({
        email: 'other@example.com',
        password: 'SecurePass123!',
        name: 'Other User',
      });

      const otherLoginResponse = await request(app).post('/api/auth/login').send({
        email: 'other@example.com',
        password: 'SecurePass123!',
      });

      const otherToken = otherLoginResponse.body.token;

      await request(app)
        .get(`/api/campaigns/${campaignId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(403);
    });
  });
});
