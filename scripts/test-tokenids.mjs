#!/usr/bin/env node

/**
 * Minimal unit-style tests for token id extraction.
 *
 * Purpose: ensure we correctly handle Gamma returning clobTokenIds as
 * - array of tokenIds,
 * - JSON-encoded string,
 * - invalid string / malformed input.
 *
 * Run:
 *   node scripts/test-tokenids.mjs
 */

function normalizeClobTokenIds(clobTokenIds) {
  if (!clobTokenIds) return [];
  if (Array.isArray(clobTokenIds)) return clobTokenIds;
  if (typeof clobTokenIds === 'string') {
    try {
      const parsed = JSON.parse(clobTokenIds);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function extractTokenIds(market) {
  const tokenIds = normalizeClobTokenIds(market?.clobTokenIds);
  const yesTokenId = tokenIds[0] && typeof tokenIds[0] === 'string' && tokenIds[0].startsWith('0x') ? tokenIds[0] : null;
  const noTokenId = tokenIds[1] && typeof tokenIds[1] === 'string' && tokenIds[1].startsWith('0x') ? tokenIds[1] : null;
  return { tokenIds, yesTokenId, noTokenId };
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function run() {
  // Array input
  {
    const m = { clobTokenIds: ['0xabc', '0xdef'] };
    const r = extractTokenIds(m);
    assert(r.yesTokenId === '0xabc', 'array: yesTokenId mismatch');
    assert(r.noTokenId === '0xdef', 'array: noTokenId mismatch');
  }

  // JSON string input
  {
    const m = { clobTokenIds: JSON.stringify(['0x111', '0x222']) };
    const r = extractTokenIds(m);
    assert(r.yesTokenId === '0x111', 'json-string: yesTokenId mismatch');
    assert(r.noTokenId === '0x222', 'json-string: noTokenId mismatch');
  }

  // Invalid JSON string -> should not produce token ids
  {
    const m = { clobTokenIds: '[not json' };
    const r = extractTokenIds(m);
    assert(r.yesTokenId === null && r.noTokenId === null, 'invalid-string: expected null tokenIds');
  }

  // Wrong prefix -> should be null
  {
    const m = { clobTokenIds: ['[', ']'] };
    const r = extractTokenIds(m);
    assert(r.yesTokenId === null && r.noTokenId === null, 'bad-prefix: expected null tokenIds');
  }

  console.log('OK: tokenId extraction tests passed');
}

try {
  run();
} catch (e) {
  console.error('FAIL:', e.message);
  process.exit(1);
}
