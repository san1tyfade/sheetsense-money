import { extractSheetId } from './sheetService';
import { AppError, IEP } from './infrastructure/ErrorHandler';

/**
 * Sheetsense Encrypted Vault Protocol (EVP)
 * Provides cryptographic primitives for End-to-End Encryption.
 */

const KDF_ITERATIONS = 100000;
const AES_ALGO = 'AES-GCM';
const KEY_LEN = 256;

/**
 * Robust Base64 Utilities
 * Prevents RangeError: Maximum call stack size exceeded on large datasets.
 */
export const bytesToBase64 = (bytes: Uint8Array): string => {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
};

const base64ToBytes = (base64: string): Uint8Array => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
};

/**
 * Normalizes a spreadsheet ID to ensure signature consistency.
 */
const normalizeId = (id?: string): string => {
    if (!id) return '';
    return extractSheetId(id).trim();
};

/**
 * Deterministically stringifies an object.
 */
const internalCanonical = (obj: any): string => {
    if (obj === null || typeof obj !== 'object') {
        return JSON.stringify(obj);
    }
    if (Array.isArray(obj)) {
        return '[' + obj.map(item => internalCanonical(item)).join(',') + ']';
    }
    const keys = Object.keys(obj).sort();
    return '{' + keys.map(key => `${JSON.stringify(key)}:${internalCanonical(obj[key])}`).join(',') + '}';
};

const canonicalStringify = (obj: any): string => {
    const purified = JSON.parse(JSON.stringify(obj));
    return internalCanonical(purified);
};

/**
 * PBKDF2 Key Derivation
 */
const deriveKey = async (password: string, salt: Uint8Array): Promise<CryptoKey> => {
    const encoder = new TextEncoder();
    const baseKey = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        'PBKDF2',
        false,
        ['deriveKey']
    );

    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt,
            iterations: KDF_ITERATIONS,
            hash: 'SHA-256'
        },
        baseKey,
        { name: AES_ALGO, length: KEY_LEN },
        false,
        ['encrypt', 'decrypt']
    );
};

/**
 * High-level Vault Encryption
 */
export const encryptVault = async (data: string, seed: string, saltBase64: string): Promise<{ ciphertext: string; iv: string }> => {
    try {
        const encoder = new TextEncoder();
        const salt = base64ToBytes(saltBase64);
        const key = await deriveKey(seed, salt);
        const iv = crypto.getRandomValues(new Uint8Array(12));

        const encrypted = await crypto.subtle.encrypt(
            { name: AES_ALGO, iv },
            key,
            encoder.encode(data)
        );

        return {
            ciphertext: bytesToBase64(new Uint8Array(encrypted)),
            iv: bytesToBase64(iv)
        };
    } catch (e) {
        throw new AppError(IEP.DMN.EVP_KEY_FAIL, "Encryption protocol failure.", 'CRITICAL', e);
    }
};

/**
 * High-level Vault Decryption
 */
export const decryptVault = async (ciphertextBase64: string, seed: string, saltBase64: string, ivBase64: string): Promise<string> => {
    try {
        const decoder = new TextDecoder();
        const salt = base64ToBytes(saltBase64);
        const iv = base64ToBytes(ivBase64);
        const ciphertext = base64ToBytes(ciphertextBase64);

        const key = await deriveKey(seed, salt);

        const decrypted = await crypto.subtle.decrypt(
            { name: AES_ALGO, iv },
            key,
            ciphertext
        );

        return decoder.decode(decrypted);
    } catch (e) {
        throw new AppError(IEP.DMN.EVP_DECRYPT_FAIL, "Decryption failure: Identity mismatch or data corruption.", 'CRITICAL', e);
    }
};

/**
 * Integrity Signature (Still used for the header part of the envelope)
 */
export const generateSignature = async (payload: object, salt: string, sheetId?: string): Promise<string> => {
    const canonicalPayload = canonicalStringify(payload);
    const dataToHash = canonicalPayload + salt + normalizeId(sheetId);
    const encoder = new TextEncoder();
    const data = encoder.encode(dataToHash);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export const verifyIntegrity = async (payload: object, signature: string, salt: string, sheetId?: string): Promise<boolean> => {
    const calculated = await generateSignature(payload, salt, sheetId);
    return calculated === signature;
};

const LOCAL_SALT_KEY = 'fintrack_local_vault_salt';
export const getVaultSalt = async (userSub?: string): Promise<string> => {
    if (userSub) return userSub;
    const existing = localStorage.getItem(LOCAL_SALT_KEY);
    if (existing) return existing;
    const newSalt = crypto.randomUUID();
    localStorage.setItem(LOCAL_SALT_KEY, newSalt);
    return newSalt;
};
