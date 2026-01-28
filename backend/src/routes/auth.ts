import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { validate, registerSchema, loginSchema } from '../middleware/validation';
import { authRateLimiter } from '../middleware/rateLimiter';
import { authenticate, AuthenticatedRequest, getJWTSecretForSigning, getJWTExpiresIn } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

/**
 * Register
 * POST /api/v1/auth/register
 */
router.post(
  '/register',
  authRateLimiter,
  validate(registerSchema),
  async (req, res, next) => {
    try {
      const { email, password, name, organizationName } = req.body;

      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (existingUser) {
        throw new AppError('An account with this email already exists', 400);
      }

      // Hash password with higher cost factor for security
      const hashedPassword = await bcrypt.hash(password, 12);

      // Create organization if provided
      let organizationId = undefined;
      if (organizationName) {
        const domain = email.split('@')[1];

        // Check if organization with this domain exists
        const existingOrg = await prisma.organization.findUnique({
          where: { domain },
        });

        if (existingOrg) {
          organizationId = existingOrg.id;
        } else {
          const organization = await prisma.organization.create({
            data: {
              name: organizationName,
              domain,
            },
          });
          organizationId = organization.id;
        }
      }

      // Create user
      const user = await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          password: hashedPassword,
          name,
          organizationId,
          role: 'USER',
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          organizationId: true,
          organization: {
            select: {
              id: true,
              name: true,
              domain: true,
            },
          },
          createdAt: true,
        },
      });

      // Generate token
      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        getJWTSecretForSigning(),
        { expiresIn: getJWTExpiresIn() }
      );

      logger.info('User registered successfully', { userId: user.id, email: user.email });

      res.status(201).json({
        user,
        token,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Login
 * POST /api/v1/auth/login
 */
router.post(
  '/login',
  authRateLimiter,
  validate(loginSchema),
  async (req, res, next) => {
    try {
      const { email, password } = req.body;

      // Find user (case-insensitive email)
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              domain: true,
            },
          },
        },
      });

      if (!user) {
        // Use generic message to prevent user enumeration
        throw new AppError('Invalid email or password', 401);
      }

      // Check password
      const isValidPassword = await bcrypt.compare(password, user.password);

      if (!isValidPassword) {
        logger.warn('Failed login attempt', { email: email.toLowerCase() });
        // Use generic message to prevent user enumeration
        throw new AppError('Invalid email or password', 401);
      }

      // Generate token
      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        getJWTSecretForSigning(),
        { expiresIn: getJWTExpiresIn() }
      );

      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;

      logger.info('User logged in successfully', { userId: user.id });

      res.json({
        user: userWithoutPassword,
        token,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get current user
 * GET /api/v1/auth/me
 */
router.get('/me', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        organizationId: true,
        organization: {
          select: {
            id: true,
            name: true,
            domain: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
});

/**
 * Refresh token
 * POST /api/v1/auth/refresh
 */
router.post('/refresh', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    // Verify user still exists
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Generate new token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      getJWTSecretForSigning(),
      { expiresIn: getJWTExpiresIn() }
    );

    res.json({ token });
  } catch (error) {
    next(error);
  }
});

/**
 * Logout
 * POST /api/v1/auth/logout
 * Note: With JWT, logout is primarily client-side (remove token from storage)
 * This endpoint logs the logout event for audit purposes
 */
router.post('/logout', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    logger.info('User logged out', { userId: req.user.userId, email: req.user.email });

    res.json({
      message: 'Logged out successfully',
      note: 'Please remove the JWT token from client storage',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Change password
 * POST /api/v1/auth/change-password
 */
router.post('/change-password', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw new AppError('Current password and new password are required', 400);
    }

    if (newPassword.length < 8) {
      throw new AppError('New password must be at least 8 characters', 400);
    }

    // Get user with password
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);

    if (!isValidPassword) {
      throw new AppError('Current password is incorrect', 401);
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    logger.info('Password changed successfully', { userId: user.id });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
