import request from 'supertest';
import { app } from '../../../src/index';

describe('Auth API Integration Tests', () => {
    describe('POST /api/v1/auth/register', () => {
        it('should register a new user successfully', async () => {
            const userData = {
                email: `test-${Date.now()}@example.com`,
                password: 'SecurePassword123!',
                name: 'Test User',
                role: 'ADVERTISER',
                organizationId: 'test-org-123',
            };

            const response = await request(app)
                .post('/api/v1/auth/register')
                .send(userData)
                .expect(201);

            expect(response.body).toHaveProperty('user');
            expect(response.body).toHaveProperty('token');
            expect(response.body.user.email).toBe(userData.email);
        });

        it('should return 400 for missing required fields', async () => {
            const response = await request(app)
                .post('/api/v1/auth/register')
                .send({ email: 'test@example.com' })
                .expect(400);

            expect(response.body).toHaveProperty('error');
        });

        it('should return 400 for duplicate email', async () => {
            const userData = {
                email: 'duplicate@example.com',
                password: 'SecurePassword123!',
                name: 'Test User',
                role: 'ADVERTISER',
                organizationId: 'test-org-123',
            };

            // First registration
            await request(app).post('/api/v1/auth/register').send(userData);

            // Duplicate registration
            const response = await request(app)
                .post('/api/v1/auth/register')
                .send(userData)
                .expect(400);

            expect(response.body.error).toContain('already exists');
        });
    });

    describe('POST /api/v1/auth/login', () => {
        const testUser = {
            email: `login-test-${Date.now()}@example.com`,
            password: 'SecurePassword123!',
            name: 'Login Test User',
            role: 'ADVERTISER',
            organizationId: 'test-org-123',
        };

        beforeAll(async () => {
            // Create test user
            await request(app).post('/api/v1/auth/register').send(testUser);
        });

        it('should login successfully with valid credentials', async () => {
            const response = await request(app)
                .post('/api/v1/auth/login')
                .send({
                    email: testUser.email,
                    password: testUser.password,
                })
                .expect(200);

            expect(response.body).toHaveProperty('user');
            expect(response.body).toHaveProperty('token');
            expect(response.body.user.email).toBe(testUser.email);
        });

        it('should return 401 for invalid password', async () => {
            const response = await request(app)
                .post('/api/v1/auth/login')
                .send({
                    email: testUser.email,
                    password: 'WrongPassword123!',
                })
                .expect(401);

            expect(response.body.error).toContain('Invalid credentials');
        });

        it('should return 401 for non-existent user', async () => {
            const response = await request(app)
                .post('/api/v1/auth/login')
                .send({
                    email: 'nonexistent@example.com',
                    password: 'Password123!',
                })
                .expect(401);

            expect(response.body.error).toContain('Invalid credentials');
        });
    });

    describe('GET /api/v1/auth/me', () => {
        let authToken: string;
        const testUser = {
            email: `me-test-${Date.now()}@example.com`,
            password: 'SecurePassword123!',
            name: 'Me Test User',
            role: 'ADVERTISER',
            organizationId: 'test-org-123',
        };

        beforeAll(async () => {
            // Register and login to get token
            const registerResponse = await request(app)
                .post('/api/v1/auth/register')
                .send(testUser);

            authToken = registerResponse.body.token;
        });

        it('should return current user with valid token', async () => {
            const response = await request(app)
                .get('/api/v1/auth/me')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.email).toBe(testUser.email);
            expect(response.body).toHaveProperty('organization');
        });

        it('should return 401 without token', async () => {
            await request(app).get('/api/v1/auth/me').expect(401);
        });

        it('should return 401 with invalid token', async () => {
            await request(app)
                .get('/api/v1/auth/me')
                .set('Authorization', 'Bearer invalid-token')
                .expect(401);
        });
    });
});
