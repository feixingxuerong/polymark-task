/**
 * token-ids.mjs
 * Helpers to normalize / validate CLOB token ids from Gamma API.
 *
 * Gamma may return `clobTokenIds` either as an array OR as a JSON-encoded string.
 */

export function normalizeClobTokenIds(clobTokenIds) {
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

export function extractTokenIds(market) {
  const tokenIds = normalizeClobTokenIds(market?.clobTokenIds);
  const yesTokenId = typeof tokenIds[0] === 'string' && tokenIds[0].startsWith('0x') ? tokenIds[0] : null;
  const noTokenId = typeof tokenIds[1] === 'string' && tokenIds[1].startsWith('0x') ? tokenIds[1] : null;
  return { tokenIds, yesTokenId, noTokenId };
}
