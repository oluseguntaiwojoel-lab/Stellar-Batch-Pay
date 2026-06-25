import { describe, expect, test } from 'vitest';
import { verifyWebhookSignature } from '../lib/webhooks';
import crypto from 'crypto';

describe('verifyWebhookSignature (#332)', () => {
  const payload = JSON.stringify({ event: 'batch.created', data: {} });
  const secret = 'test-secret-key';

  // Generate a valid signature
  const validSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  test('accepts valid signature', () => {
    const result = verifyWebhookSignature(payload, secret, validSignature);
    expect(result).toBe(true);
  });

  test('rejects invalid signature (wrong payload)', () => {
    const wrongPayload = JSON.stringify({ event: 'batch.updated', data: {} });
    const result = verifyWebhookSignature(wrongPayload, secret, validSignature);
    expect(result).toBe(false);
  });

  test('rejects invalid signature (wrong secret)', () => {
    const wrongSecret = 'wrong-secret';
    const result = verifyWebhookSignature(payload, wrongSecret, validSignature);
    expect(result).toBe(false);
  });

  // #332: Test malformed signatures without throwing
  test('rejects empty signature gracefully without throwing', () => {
    expect(() => {
      verifyWebhookSignature(payload, secret, '');
    }).not.toThrow();

    const result = verifyWebhookSignature(payload, secret, '');
    expect(result).toBe(false);
  });

  test('rejects null/undefined signature gracefully', () => {
    expect(() => {
      verifyWebhookSignature(payload, secret, null as any);
    }).not.toThrow();

    const result = verifyWebhookSignature(payload, secret, null as any);
    expect(result).toBe(false);
  });

  test('rejects odd-length hex string (malformed)', () => {
    // Odd-length hex is invalid (not a multiple of 2)
    const oddHex = validSignature.slice(0, -1); // Remove last char
    expect(() => {
      verifyWebhookSignature(payload, secret, oddHex);
    }).not.toThrow();

    const result = verifyWebhookSignature(payload, secret, oddHex);
    expect(result).toBe(false);
  });

  test('rejects non-hex characters gracefully', () => {
    const nonHex = 'GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG';
    expect(() => {
      verifyWebhookSignature(payload, secret, nonHex);
    }).not.toThrow();

    const result = verifyWebhookSignature(payload, secret, nonHex);
    expect(result).toBe(false);
  });

  test('rejects wrong-length valid hex (too short)', () => {
    const shortHex = '0000000000000000'; // Valid hex but wrong length
    expect(() => {
      verifyWebhookSignature(payload, secret, shortHex);
    }).not.toThrow();

    const result = verifyWebhookSignature(payload, secret, shortHex);
    expect(result).toBe(false);
  });

  test('rejects truncated signature (length mismatch)', () => {
    const truncated = validSignature.slice(0, 16); // Half length
    expect(() => {
      verifyWebhookSignature(payload, secret, truncated);
    }).not.toThrow();

    const result = verifyWebhookSignature(payload, secret, truncated);
    expect(result).toBe(false);
  });

  test('case-insensitive hex comparison works', () => {
    // Convert valid hex to uppercase
    const upperHex = validSignature.toUpperCase();
    const result = verifyWebhookSignature(payload, secret, upperHex);
    expect(result).toBe(true);
  });

  test('mixed case hex signature works', () => {
    const mixedCase = validSignature
      .split('')
      .map((c, i) => (i % 2 === 0 ? c.toUpperCase() : c))
      .join('');
    const result = verifyWebhookSignature(payload, secret, mixedCase);
    expect(result).toBe(true);
  });
});
