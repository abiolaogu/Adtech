# Authentication Features Setup Guide

This guide covers the setup and usage of the new authentication features added to the AdTech Platform:
- Two-Factor Authentication (2FA)
- Email Verification
- Password Reset via Email

## Table of Contents
- [Installation](#installation)
- [Database Migration](#database-migration)
- [Environment Configuration](#environment-configuration)
- [Feature Overview](#feature-overview)
- [API Endpoints](#api-endpoints)
- [Testing](#testing)
- [Security Considerations](#security-considerations)

---

## Installation

### 1. Install Required NPM Packages

```bash
cd backend
npm install speakeasy qrcode nodemailer
npm install --save-dev @types/speakeasy @types/qrcode @types/nodemailer
```

### 2. Generate Prisma Client

After installing packages, regenerate the Prisma client to include the new database fields:

```bash
npx prisma generate
```

---

## Database Migration

The database schema has been updated with new fields for authentication features. Run the migration to update your database:

### Create and Apply Migration

```bash
cd backend
npx prisma migrate dev --name add_auth_features
```

### New Database Fields Added to User Model

```prisma
// Email Verification
emailVerified Boolean  @default(false)
emailVerificationToken String?  @unique
emailVerificationExpiresAt DateTime?

// Two-Factor Authentication
twoFactorEnabled Boolean  @default(false)
twoFactorSecret  String?

// Password Reset
passwordResetToken String?  @unique
passwordResetExpiresAt DateTime?
```

### For Production Deployment

```bash
npx prisma migrate deploy
```

---

## Environment Configuration

Add the following environment variables to your `.env` file:

### Email Service Configuration (Required for Email Features)

```bash
# SMTP Configuration
SMTP_HOST=smtp.gmail.com              # Your SMTP server
SMTP_PORT=587                          # SMTP port (587 for TLS, 465 for SSL)
SMTP_USER=your-email@gmail.com        # SMTP username
SMTP_PASS=your-app-password           # SMTP password or app-specific password
SMTP_FROM=noreply@yourdomain.com      # From email address
SMTP_FROM_NAME=AdTech Platform        # From name

# Application URL (for email links)
APP_URL=http://localhost:3000         # Frontend URL for verification/reset links
```

### Email Provider Examples

#### Gmail Setup
1. Enable 2-Step Verification in your Google Account
2. Generate an App Password: https://myaccount.google.com/apppasswords
3. Use the app password in `SMTP_PASS`

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-char-app-password
```

#### SendGrid Setup
```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
```

#### AWS SES Setup
```bash
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=your-aws-smtp-username
SMTP_PASS=your-aws-smtp-password
```

### Note on Email Service
- Email features are **optional** and will gracefully degrade if not configured
- The platform will log warnings if email service is not available
- Users can still register and log in, but won't receive verification emails

---

## Feature Overview

### 1. Two-Factor Authentication (2FA)

2FA adds an extra layer of security using Time-based One-Time Passwords (TOTP).

**Features:**
- TOTP-based authentication (compatible with Google Authenticator, Authy, etc.)
- QR code generation for easy setup
- Backup codes for account recovery
- Password verification required to disable 2FA

**Workflow:**
1. User initiates 2FA setup via `/api/v1/auth/2fa/setup`
2. System generates secret and QR code
3. User scans QR code with authenticator app
4. User verifies with 6-digit code via `/api/v1/auth/2fa/verify`
5. 2FA is enabled and confirmation email is sent
6. Future logins require 2FA code after password verification

### 2. Email Verification

Email verification ensures users own the email addresses they register with.

**Features:**
- Automatic verification email on registration
- 24-hour token expiration
- Resend verification email capability
- Beautiful HTML email templates

**Workflow:**
1. User registers an account
2. Verification email sent automatically with token
3. User clicks verification link
4. Email is verified and `emailVerified` flag is set to `true`

### 3. Password Reset

Secure password reset flow with time-limited tokens.

**Features:**
- Token-based password reset
- 1-hour token expiration
- Rate limiting to prevent abuse
- User enumeration protection
- Email notification

**Workflow:**
1. User requests password reset via `/api/v1/auth/forgot-password`
2. If email exists, reset email is sent with token
3. User clicks reset link and enters new password
4. Password is updated and reset token is cleared

---

## API Endpoints

### Two-Factor Authentication

#### 1. Setup 2FA
```http
POST /api/v1/auth/2fa/setup
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "secret": "JBSWY3DPEHPK3PXP",
  "qrCodeUrl": "data:image/png;base64,...",
  "backupCodes": [
    "ABCD-1234",
    "EFGH-5678",
    ...
  ],
  "message": "Scan the QR code with your authenticator app and verify with a code to enable 2FA"
}
```

#### 2. Verify and Enable 2FA
```http
POST /api/v1/auth/2fa/verify
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "token": "123456"
}
```

**Response:**
```json
{
  "message": "2FA enabled successfully",
  "twoFactorEnabled": true
}
```

#### 3. Disable 2FA
```http
POST /api/v1/auth/2fa/disable
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "password": "user-password"
}
```

**Response:**
```json
{
  "message": "2FA disabled successfully"
}
```

#### 4. Verify 2FA During Login
```http
POST /api/v1/auth/2fa/verify-login
Content-Type: application/json

{
  "email": "user@example.com",
  "token": "123456"
}
```

**Response:**
```json
{
  "user": { ... },
  "token": "jwt-token"
}
```

### Email Verification

#### 1. Send Verification Email
```http
POST /api/v1/auth/send-verification-email
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "message": "Verification email sent. Please check your inbox."
}
```

#### 2. Verify Email
```http
GET /api/v1/auth/verify-email/:token
```

**Response:**
```json
{
  "message": "Email verified successfully"
}
```

### Password Reset

#### 1. Request Password Reset
```http
POST /api/v1/auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "message": "If an account exists with this email, a password reset link has been sent."
}
```

#### 2. Reset Password
```http
POST /api/v1/auth/reset-password/:token
Content-Type: application/json

{
  "newPassword": "new-secure-password"
}
```

**Response:**
```json
{
  "message": "Password reset successfully. You can now log in with your new password."
}
```

### Modified Login Endpoint

The login endpoint now checks for 2FA:

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password"
}
```

**Response (2FA Not Enabled):**
```json
{
  "user": { ... },
  "token": "jwt-token"
}
```

**Response (2FA Enabled):**
```json
{
  "require2FA": true,
  "message": "Two-factor authentication is required. Please provide your 2FA code.",
  "email": "user@example.com"
}
```

---

## Testing

### Test 2FA Flow

```bash
# 1. Register a user
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123",
    "name": "Test User"
  }'

# Save the token from response

# 2. Setup 2FA
curl -X POST http://localhost:8000/api/v1/auth/2fa/setup \
  -H "Authorization: Bearer <token>"

# Scan the QR code with Google Authenticator

# 3. Verify 2FA with code from authenticator
curl -X POST http://localhost:8000/api/v1/auth/2fa/verify \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"token": "123456"}'

# 4. Test login with 2FA
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123"
  }'

# Should return require2FA: true

# 5. Complete login with 2FA code
curl -X POST http://localhost:8000/api/v1/auth/2fa/verify-login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "token": "123456"
  }'
```

### Test Email Verification

```bash
# After registration, check database for verification token
# Then verify:
curl -X GET http://localhost:8000/api/v1/auth/verify-email/<token>

# Or resend verification email:
curl -X POST http://localhost:8000/api/v1/auth/send-verification-email \
  -H "Authorization: Bearer <token>"
```

### Test Password Reset

```bash
# 1. Request password reset
curl -X POST http://localhost:8000/api/v1/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'

# Check email for reset link, extract token

# 2. Reset password
curl -X POST http://localhost:8000/api/v1/auth/reset-password/<token> \
  -H "Content-Type: application/json" \
  -d '{"newPassword": "NewSecurePass123"}'
```

---

## Security Considerations

### Token Security
- **Email Verification Token**: 32 bytes random hex (256-bit), 24-hour expiration
- **Password Reset Token**: 32 bytes random hex (256-bit), 1-hour expiration
- All tokens are stored as unique values in the database
- Tokens are cleared after successful use

### 2FA Security
- **Secret Generation**: 32-character base32 secret
- **Token Validation**: 6-digit TOTP with 2-step window for clock skew
- **Backup Codes**: 8 random alphanumeric codes for recovery
- Password required to disable 2FA

### Rate Limiting
- Auth endpoints protected with rate limiting
- Prevents brute force attacks
- Configured via `authRateLimiter` middleware

### User Enumeration Protection
- Generic error messages for login failures
- Password reset always returns success message
- No indication of whether email exists

### Password Requirements
- Minimum 8 characters
- Hashed with bcrypt (cost factor 12)
- Passwords never logged or exposed in responses

### Email Security
- HTML emails with proper escaping
- Links expire after specified time
- Clear security warnings in emails
- HTTPS recommended for production

---

## Troubleshooting

### Email Service Not Working

**Check logs:**
```bash
tail -f logs/app.log | grep -i email
```

**Common issues:**
1. **Invalid SMTP credentials**: Verify SMTP_USER and SMTP_PASS
2. **Blocked port**: Ensure port 587 (or 465) is not blocked by firewall
3. **App password required**: Gmail requires app-specific passwords
4. **Missing environment variables**: Check all SMTP_* variables are set

### 2FA Issues

**"Invalid verification code" error:**
- Ensure time synchronization on server and client device
- Verify secret was correctly stored in database
- Check for clock skew (window is set to 2 steps)

**Lost authenticator device:**
- Use backup codes provided during setup
- Future: Implement backup code verification endpoint

### Database Migration Failures

If migration fails, you can manually add fields:

```sql
ALTER TABLE "User"
ADD COLUMN "emailVerified" BOOLEAN DEFAULT false,
ADD COLUMN "emailVerificationToken" TEXT,
ADD COLUMN "emailVerificationExpiresAt" TIMESTAMP,
ADD COLUMN "twoFactorEnabled" BOOLEAN DEFAULT false,
ADD COLUMN "twoFactorSecret" TEXT,
ADD COLUMN "passwordResetToken" TEXT,
ADD COLUMN "passwordResetExpiresAt" TIMESTAMP;

CREATE UNIQUE INDEX "User_emailVerificationToken_key" ON "User"("emailVerificationToken");
CREATE UNIQUE INDEX "User_passwordResetToken_key" ON "User"("passwordResetToken");
```

---

## Production Deployment Checklist

- [ ] Install required npm packages
- [ ] Run database migration
- [ ] Configure SMTP settings with production email service
- [ ] Set APP_URL to production frontend URL
- [ ] Enable HTTPS for all endpoints
- [ ] Test email delivery in production environment
- [ ] Configure rate limiting appropriately
- [ ] Set up monitoring for failed email deliveries
- [ ] Document 2FA recovery process for users
- [ ] Train support team on password reset process

---

## Future Enhancements

Potential improvements for future versions:

1. **Backup Codes Storage**: Store hashed backup codes in database
2. **Backup Code Verification**: Add endpoint to verify backup codes during login
3. **SMS 2FA**: Alternative to TOTP via SMS
4. **Social Login**: OAuth2 integration (Google, GitHub, Facebook)
5. **Session Management**: Track active sessions and allow remote logout
6. **Security Events Log**: Audit log for auth-related events
7. **Account Lock**: Temporary lock after multiple failed login attempts
8. **Password Strength Meter**: Client-side password strength indicator
9. **Magic Link Login**: Passwordless authentication via email
10. **Hardware Key Support**: FIDO2/WebAuthn support

---

## Support

For issues or questions:
- Check logs: `backend/logs/`
- Review Prisma schema: `backend/prisma/schema.prisma`
- Check service implementations:
  - Email: `backend/src/services/email/EmailService.ts`
  - 2FA: `backend/src/services/auth/TwoFactorService.ts`
- Review API routes: `backend/src/routes/auth.ts`

---

**Last Updated**: 2026-01-29
**Version**: 1.0.0
**Completion**: 90% (Core features implemented)
