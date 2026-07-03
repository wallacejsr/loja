import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function encodeBase32(buffer: Buffer) {
  let bits = 0;
  let value = 0;
  let output = '';

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

function decodeBase32(value: string) {
  const normalized = value.toUpperCase().replace(/=+$/g, '').replace(/[^A-Z2-7]/g, '');
  let bits = 0;
  let accumulator = 0;
  const bytes: number[] = [];

  for (const character of normalized) {
    const index = BASE32_ALPHABET.indexOf(character);
    if (index < 0) continue;

    accumulator = (accumulator << 5) | index;
    bits += 5;

    if (bits >= 8) {
      bytes.push((accumulator >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

function hotp(secret: Buffer, counter: number) {
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac('sha1', secret).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binaryCode = ((hmac[offset] & 0x7f) << 24)
    | ((hmac[offset + 1] & 0xff) << 16)
    | ((hmac[offset + 2] & 0xff) << 8)
    | (hmac[offset + 3] & 0xff);
  return String(binaryCode % 1_000_000).padStart(6, '0');
}

export function generateTotpSecret() {
  return encodeBase32(randomBytes(20));
}

export function buildTotpProvisioningUri(secret: string, email: string, issuer: string) {
  const label = encodeURIComponent(`${issuer}:${email}`);
  const query = new URLSearchParams({
    secret,
    issuer,
    algorithm: 'SHA1',
    digits: '6',
    period: '30',
  });
  return `otpauth://totp/${label}?${query.toString()}`;
}

export function verifyTotpCode(secret: string, code: string, windowSize = 1) {
  const normalizedCode = code.replace(/\D/g, '').slice(0, 6);
  if (normalizedCode.length !== 6) {
    return false;
  }

  const secretBuffer = decodeBase32(secret);
  const currentCounter = Math.floor(Date.now() / 30_000);
  const codeBuffer = Buffer.from(normalizedCode);

  for (let offset = -windowSize; offset <= windowSize; offset += 1) {
    const expected = hotp(secretBuffer, currentCounter + offset);
    const expectedBuffer = Buffer.from(expected);

    if (expectedBuffer.length === codeBuffer.length && timingSafeEqual(expectedBuffer, codeBuffer)) {
      return true;
    }
  }

  return false;
}

