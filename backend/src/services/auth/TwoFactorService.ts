import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { logger } from '../../utils/logger';

export interface TwoFactorSecret {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

class TwoFactorService {
  /**
   * Generate a new 2FA secret and QR code
   */
  async generateSecret(email: string): Promise<TwoFactorSecret> {
    const secret = speakeasy.generateSecret({
      name: `AdTech Platform (${email})`,
      issuer: 'AdTech Platform',
      length: 32,
    });

    if (!secret.otpauth_url) {
      throw new Error('Failed to generate OTP auth URL');
    }

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    // Generate backup codes
    const backupCodes = this.generateBackupCodes(8);

    logger.info('2FA secret generated', { email });

    return {
      secret: secret.base32,
      qrCodeUrl,
      backupCodes,
    };
  }

  /**
   * Verify a TOTP token
   */
  verifyToken(secret: string, token: string): boolean {
    try {
      const verified = speakeasy.totp.verify({
        secret: secret,
        encoding: 'base32',
        token: token,
        window: 2, // Allow 2 time steps before/after for clock skew
      });

      return verified;
    } catch (error) {
      logger.error('Error verifying 2FA token', { error });
      return false;
    }
  }

  /**
   * Generate backup codes for 2FA recovery
   */
  private generateBackupCodes(count: number = 8): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      // Generate 8-character alphanumeric codes
      const code = this.generateRandomCode(8);
      codes.push(code);
    }
    return codes;
  }

  /**
   * Generate a random alphanumeric code
   */
  private generateRandomCode(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < length; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    // Format as XXXX-XXXX for readability
    return code.substring(0, 4) + '-' + code.substring(4);
  }

  /**
   * Verify a backup code (in a real implementation, these would be hashed and stored)
   */
  verifyBackupCode(storedCodes: string[], providedCode: string): boolean {
    return storedCodes.includes(providedCode.toUpperCase());
  }
}

export const twoFactorService = new TwoFactorService();
