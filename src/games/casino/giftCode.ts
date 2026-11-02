// -----------------------------------------------
// CHIP GIFT CODES
// -----------------------------------------------
// A code carries 80 bits: amount (30) | nonce (30) | check (20), scrambled by a 4-round
// Feistel network keyed with SECRET. Without a server this only stops typos and guessing:
// anyone reading the bundle can mint codes, which is fine between friends.

const SECRET = 'eloise-wonderland/chips/v1';
const NONCE_BITS = 30n;
const CHECK_BITS = 20n;
const HALF_BITS = 40n;
const ROUNDS = 4;

/** Crockford base32: no I, L, O or U, so a code read aloud cannot be misread. */
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const CODE_LENGTH = 16;

export const MAX_GIFT = 2 ** 30 - 1;

export interface GiftCode {
  amount: number;
  /** Unique per code: a device remembers the nonces it has already redeemed. */
  nonce: number;
}

export function encodeGift(gift: GiftCode): string {
  const payload = (BigInt(gift.amount) << NONCE_BITS) | BigInt(gift.nonce);
  const plain = (payload << CHECK_BITS) | checkOf(payload);
  return format(toBase32(scramble(plain)));
}

/** The gift a code carries, or null when the code is mistyped or invented. */
export function decodeGift(code: string): GiftCode | null {
  const clean = normalize(code);
  if (clean.length !== CODE_LENGTH) return null;
  const plain = unscramble(fromBase32(clean));
  const payload = plain >> CHECK_BITS;
  if ((plain & mask(CHECK_BITS)) !== checkOf(payload)) return null;
  const amount = Number(payload >> NONCE_BITS);
  if (amount === 0) return null;
  return { amount, nonce: Number(payload & mask(NONCE_BITS)) };
}

export function randomNonce(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0] & (2 ** 30 - 1);
}

function checkOf(payload: bigint): bigint {
  return BigInt(hash32(`${SECRET}|check|${payload}`)) & mask(CHECK_BITS);
}

// -----------------------------------------------
// FEISTEL NETWORK
// -----------------------------------------------

function scramble(value: bigint): bigint {
  let left = value >> HALF_BITS;
  let right = value & mask(HALF_BITS);
  for (let round = 0; round < ROUNDS; round++) [left, right] = [right, left ^ roundKey(right, round)];
  return (left << HALF_BITS) | right;
}

function unscramble(value: bigint): bigint {
  let left = value >> HALF_BITS;
  let right = value & mask(HALF_BITS);
  for (let round = ROUNDS - 1; round >= 0; round--) [left, right] = [right ^ roundKey(left, round), left];
  return (left << HALF_BITS) | right;
}

/** 40 pseudo-random bits from one half and the round number. */
function roundKey(half: bigint, round: number): bigint {
  const high = BigInt(hash32(`${SECRET}|${round}|a|${half}`));
  const low = BigInt(hash32(`${SECRET}|${round}|b|${half}`));
  return ((high << 32n) | low) & mask(HALF_BITS);
}

/** FNV-1a, then a final avalanche so close inputs give unrelated outputs. */
function hash32(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 0x01000193);
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x85ebca6b);
  hash ^= hash >>> 13;
  return hash >>> 0;
}

function mask(bits: bigint): bigint {
  return (1n << bits) - 1n;
}

// -----------------------------------------------
// TEXT FORM
// -----------------------------------------------

function toBase32(value: bigint): string {
  let text = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    text = ALPHABET[Number(value & 31n)] + text;
    value >>= 5n;
  }
  return text;
}

function fromBase32(text: string): bigint {
  let value = 0n;
  for (const char of text) value = (value << 5n) | BigInt(ALPHABET.indexOf(char));
  return value;
}

/** Upper case, no separators, and the letters people confuse mapped to their digit. */
function normalize(code: string): string {
  return code
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, '')
    .replace(/O/g, '0')
    .replace(/[IL]/g, '1')
    .replace(/U/g, 'V');
}

function format(text: string): string {
  return text.match(/.{4}/g)!.join('-');
}
