#!/usr/bin/env node

/**
 * Minimal unit-style test for tokenId helpers used by generate-watchlist.mjs.
 *
 * Goal: ensure we correctly handle Gamma returning clobTokenIds as:
 * - array
 * - JSON-encoded string
 * - invalid string
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
  // Case 1: array
  {
    const m = { clobTokenIds: ['0xaaa', '0xbbb'] };
    const r = extractTokenIds(m);
    assert(r.yesTokenId === '0xaaa', 'array: yesTokenId mismatch');
    assert(r.noTokenId === '0xbbb', 'array: noTokenId mismatch');
    assert(r.tokenIds.length === 2, 'array: tokenIds length mismatch');
  }

  // Case 2: JSON string
  {
    const m = { clobTokenIds: '["0xaaa","0xbbb"]' };
    const r = extractTokenIds(m);
    assert(r.yesTokenId === '0xaaa', 'json string: yesTokenId mismatch');
    assert(r.noTokenId === '0xbbb', 'json string: noTokenId mismatch');
    assert(r.tokenIds.length === 2, 'json string: tokenIds length mismatch');
  }

  // Case 3: invalid string => no calls should be made (null ids)
  {
    const m = { clobTokenIds: '[not-json' };
    const r = extractTokenIds(m);
    assert(r.yesTokenId === null, 'invalid string: yesTokenId should be null');
    assert(r.noTokenId === null, 'invalid string: noTokenId should be null');
    assert(Array.isArray(r.tokenIds) && r.tokenIds.length === 0, 'invalid string: tokenIds should be empty array');
  }

  // Case 4: JSON string but not array
  {
    const m = { clobTokenIds: '{"a":1}' };
    const r = extractTokenIds(m);
    assert(r.yesTokenId === null && r.noTokenId === null, 'json object: ids should be null');
    assert(r.tokenIds.length === 0, 'json object: tokenIds should be empty');
  }

  console.log('OK: tokenId helper tests passed');
}

run();
