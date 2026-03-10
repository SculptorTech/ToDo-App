import * as Crypto from 'expo-crypto';

const SALT = 'your-app-specific-salt-string-change-this'; // Add a secret salt from your .env

export const PasswordUtil = {
  /**
   * Hash a password using SHA-256 with a salt
   */
  hashPassword: async (password) => {
    // Combine password with salt
    const saltedPassword = password + SALT;
    
    // Hash using SHA-256
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      saltedPassword
    );
    
    return hash;
  },

  /**
   * Compare a plain password with a stored hash
   */
  comparePassword: async (plainPassword, storedHash) => {
    const hash = await PasswordUtil.hashPassword(plainPassword);
    return hash === storedHash;
  },

  /**
   * Generate a random token (for sessions, etc.)
   */
  generateToken: async () => {
    const randomBytes = await Crypto.getRandomBytesAsync(32);
    return Array.from(randomBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
};