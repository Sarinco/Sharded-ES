import { pbkdf2, randomBytes } from 'crypto';

const SALT_LENGTH = 16; // 16 bytes (128 bits) for the salt
const ITERATIONS = 10000; // Number of iterations for PBKDF2
const KEY_LENGTH = 64; // Length of the derived key (64 bytes = 512 bits)
const DIGEST = 'sha512'; // Hash function for PBKDF2

export function generateSalt(): Buffer {
    return randomBytes(SALT_LENGTH);
}

// Hash a password with a salt
export function hashPassword(password: string, salt: Buffer): Promise<string> {
    return new Promise((resolve, reject) => {
        pbkdf2(password, salt, ITERATIONS, KEY_LENGTH, DIGEST, (err, derivedKey) => {
            if (err) reject(err);
            else resolve(derivedKey.toString('hex'));
        });
    });
}

// Verify a password against a stored hash
export function verifyPassword(password: string, salt: string, storedHash: string): Promise<boolean> {
    return new Promise((resolve, reject) => {

        pbkdf2(password, Buffer.from(salt, 'hex'), ITERATIONS, KEY_LENGTH, DIGEST, (err, derivedKey) => {
            if (err) reject(err);
            else resolve(storedHash === derivedKey.toString('hex'));
        });
    });
}
