#!/usr/bin/env node

import assert from 'node:assert/strict';
import { extractTokenIds } from './token-ids.mjs';

function run() {
  // Array input
  {
    const { yesTokenId, noTokenId, tokenIds } = extractTokenIds({ clobTokenIds: ['0xabc', '0xdef'] });
    assert.deepEqual(tokenIds, ['0xabc', '0xdef']);
    assert.equal(yesTokenId, '0xabc');
    assert.equal(noTokenId, '0xdef');
  }

  // JSON-string input
  {
    const { yesTokenId, noTokenId, tokenIds } = extractTokenIds({ clobTokenIds: '["0x111","0x222"]' });
    assert.deepEqual(tokenIds, ['0x111', '0x222']);
    assert.equal(yesTokenId, '0x111');
    assert.equal(noTokenId, '0x222');
  }

  // Invalid string input -> empty
  {
    const { yesTokenId, noTokenId, tokenIds } = extractTokenIds({ clobTokenIds: '[not json' });
    assert.deepEqual(tokenIds, []);
    assert.equal(yesTokenId, null);
    assert.equal(noTokenId, null);
  }

  // Wrong prefix -> null token ids but preserve tokenIds array
  {
    const { yesTokenId, noTokenId, tokenIds } = extractTokenIds({ clobTokenIds: ['[', '0xdef'] });
    assert.deepEqual(tokenIds, ['[', '0xdef']);
    assert.equal(yesTokenId, null);
    assert.equal(noTokenId, '0xdef');
  }

  console.log('OK: token id helper tests passed');
}

run();
