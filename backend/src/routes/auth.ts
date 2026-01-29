import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { validate, registerSchema, loginSchema } from '../middleware/validation';
import { authRateLimiter } from '../middleware/rateLimiter';
import { authenticate, AuthenticatedRequest, getJWTSecretForSigning, getJWTExpiresIn } from '../middleware/auth';
import { logger } from '../utils/logger';
import { twoFactorService } from '../services/auth/TwoFactorService';
import { emailService } from '../services/email/EmailService';

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

      // Generate email verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Create user
      const user = await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          password: hashedPassword,
          name,
          organizationId,
          role: 'USER',
          emailVerificationToken: verificationToken,
          emailVerificationExpiresAt: verificationExpiresAt,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          organizationId: true,
          emailVerified: true,
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

      // Send verification email (don't block registration if it fails)
      emailService.sendVerificationEmail(email, verificationToken, name).catch((error) => {
        logger.error('Failed to send verification email during registration', { userId: user.id, error });
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
        message: emailService.isEnabled()
          ? 'Registration successful! Please check your email to verify your account.'
          : 'Registration successful!',
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

      // Check if 2FA is enabled
      if (user.twoFactorEnabled) {
        logger.info('2FA required for login', { userId: user.id });
        return res.json({
          require2FA: true,
          message: 'Two-factor authentication is required. Please provide your 2FA code.',
          email: user.email,
        });
      }

      // Generate token
      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        getJWTSecretForSigning(),
        { expiresIn: getJWTExpiresIn() }
      );

      // Remove password from response
      const { password: _, twoFactorSecret: __, ...userWithoutPassword } = user;

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

// ===== TWO-FACTOR AUTHENTICATION =====

/**
 * Setup 2FA - Generate secret and QR code
 * POST /api/v1/auth/2fa/setup
 */
router.post('/2fa/setup', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (user.twoFactorEnabled) {
      throw new AppError('Two-factor authentication is already enabled', 400);
    }

    // Generate 2FA secret
    const { secret, qrCodeUrl, backupCodes } = await twoFactorService.generateSecret(user.email);

    // Store secret temporarily (not enabled yet until verified)
    await prisma.user.update({
      where: { id: user.id },
      data: { twoFactorSecret: secret },
    });

    logger.info('2FA setup initiated', { userId: user.id });

    res.json({
      secret,
      qrCodeUrl,
      backupCodes,
      message: 'Scan the QR code with your authenticator app and verify with a code to enable 2FA',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Verify and enable 2FA
 * POST /api/v1/auth/2fa/verify
 */
router.post('/2fa/verify', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const { token } = req.body;

    if (!token || token.length !== 6) {
      throw new AppError('Valid 6-digit token is required', 400);
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (user.twoFactorEnabled) {
      throw new AppError('Two-factor authentication is already enabled', 400);
    }

    if (!user.twoFactorSecret) {
      throw new AppError('2FA setup not initiated. Call /api/v1/auth/2fa/setup first', 400);
    }

    // Verify token
    const isValid = twoFactorService.verifyToken(user.twoFactorSecret, token);

    if (!isValid) {
      throw new AppError('Invalid verification code', 401);
    }

    // Enable 2FA
    await prisma.user.update({
      where: { id: user.id },
      data: { twoFactorEnabled: true },
    });

    // Send confirmation email
    await emailService.send2FASetupEmail(user.email, user.name);

    logger.info('2FA enabled successfully', { userId: user.id });

    res.json({
      message: '2FA enabled successfully',
      twoFactorEnabled: true,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Disable 2FA
 * POST /api/v1/auth/2fa/disable
 */
router.post('/2fa/disable', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const { password } = req.body;

    if (!password) {
      throw new AppError('Password is required to disable 2FA', 400);
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (!user.twoFactorEnabled) {
      throw new AppError('Two-factor authentication is not enabled', 400);
    }

    // Verify password before disabling 2FA
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      throw new AppError('Invalid password', 401);
    }

    // Disable 2FA
    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
      },
    });

    logger.info('2FA disabled', { userId: user.id });

    res.json({ message: '2FA disabled successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * Verify 2FA token during login
 * POST /api/v1/auth/2fa/verify-login
 */
router.post('/2fa/verify-login', async (req, res, next) => {
  try {
    const { email, token } = req.body;

    if (!email || !token) {
      throw new AppError('Email and token are required', 400);
    }

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
      throw new AppError('Invalid credentials', 401);
    }

    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new AppError('2FA not enabled for this user', 400);
    }

    // Verify token
    const isValid = twoFactorService.verifyToken(user.twoFactorSecret, token);

    if (!isValid) {
      logger.warn('Failed 2FA verification', { email: email.toLowerCase() });
      throw new AppError('Invalid verification code', 401);
    }

    // Generate JWT token
    const jwtToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      getJWTSecretForSigning(),
      { expiresIn: getJWTExpiresIn() }
    );

    // Remove password from response
    const { password: _, twoFactorSecret: __, ...userWithoutSensitiveData } = user;

    logger.info('2FA verification successful', { userId: user.id });

    res.json({
      user: userWithoutSensitiveData,
      token: jwtToken,
    });
  } catch (error) {
    next(error);
  }
});

// ===== EMAIL VERIFICATION =====

/**
 * Send verification email
 * POST /api/v1/auth/send-verification-email
 */
router.post('/send-verification-email', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (user.emailVerified) {
      throw new AppError('Email already verified', 400);
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationToken: verificationToken,
        emailVerificationExpiresAt: expiresAt,
      },
    });

    // Send verification email
    const emailSent = await emailService.sendVerificationEmail(user.email, verificationToken, user.name);

    if (!emailSent) {
      throw new AppError('Failed to send verification email. Email service may not be configured.', 500);
    }

    logger.info('Verification email sent', { userId: user.id });

    res.json({ message: 'Verification email sent. Please check your inbox.' });
  } catch (error) {
    next(error);
  }
});

/**
 * Verify email with token
 * GET /api/v1/auth/verify-email/:token
 */
router.get('/verify-email/:token', async (req, res, next) => {
  try {
    const { token } = req.params;

    if (!token) {
      throw new AppError('Verification token is required', 400);
    }

    const user = await prisma.user.findUnique({
      where: { emailVerificationToken: token },
    });

    if (!user) {
      throw new AppError('Invalid or expired verification token', 400);
    }

    if (user.emailVerified) {
      return res.json({ message: 'Email already verified' });
    }

    if (!user.emailVerificationExpiresAt || user.emailVerificationExpiresAt < new Date()) {
      throw new AppError('Verification token has expired', 400);
    }

    // Verify email
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpiresAt: null,
      },
    });

    logger.info('Email verified successfully', { userId: user.id });

    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    next(error);
  }
});

// ===== PASSWORD RESET =====

/**
 * Request password reset
 * POST /api/v1/auth/forgot-password
 */
router.post('/forgot-password', authRateLimiter, async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      throw new AppError('Email is required', 400);
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Always return success message to prevent user enumeration
    const successMessage = 'If an account exists with this email, a password reset link has been sent.';

    if (!user) {
      logger.info('Password reset requested for non-existent email', { email: email.toLowerCase() });
      return res.json({ message: successMessage });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpiresAt: expiresAt,
      },
    });

    // Send reset email
    const emailSent = await emailService.sendPasswordResetEmail(user.email, resetToken, user.name);

    if (!emailSent) {
      logger.error('Failed to send password reset email', { userId: user.id });
      // Still return success to prevent user enumeration
    } else {
      logger.info('Password reset email sent', { userId: user.id });
    }

    res.json({ message: successMessage });
  } catch (error) {
    next(error);
  }
});

/**
 * Reset password with token
 * POST /api/v1/auth/reset-password/:token
 */
router.post('/reset-password/:token', authRateLimiter, async (req, res, next) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    if (!token) {
      throw new AppError('Reset token is required', 400);
    }

    if (!newPassword || newPassword.length < 8) {
      throw new AppError('Password must be at least 8 characters', 400);
    }

    const user = await prisma.user.findUnique({
      where: { passwordResetToken: token },
    });

    if (!user) {
      throw new AppError('Invalid or expired reset token', 400);
    }

    if (!user.passwordResetExpiresAt || user.passwordResetExpiresAt < new Date()) {
      throw new AppError('Reset token has expired', 400);
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpiresAt: null,
      },
    });

    logger.info('Password reset successfully', { userId: user.id });

    res.json({ message: 'Password reset successfully. You can now log in with your new password.' });
  } catch (error) {
    next(error);
  }
});

export default router;
