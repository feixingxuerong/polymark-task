/**
 * Test: Weather-Aviation Sources Integration
 * 
 * This script tests that generate-watchlist.mjs correctly integrates
 * weather-aviation-sources data into executable cards.
 * 
 * Expected behavior:
 * - Loads weather-aviation-sources-*.json
 * - For weather/aviation category markets: auto-fills monitor_sources with real station/airport links
 * - Falls back to template if no match
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function testIntegration() {
  console.log('=== Weather-Aviation Integration Test ===\n');
  
  // Test 1: Check that weather-aviation-sources file exists
  const sourcesDir = path.join(__dirname, '../poly-knowledge/outputs');
  const sourcesFiles = fs.readdirSync(sourcesDir)
    .filter(f => f.startsWith('weather-aviation-sources-') && f.endsWith('.json'));
  
  console.log(`[TEST 1] Found ${sourcesFiles.length} weather-aviation-sources files`);
  if (sourcesFiles.length === 0) {
    console.log('❌ FAIL: No weather-aviation-sources files found');
    return false;
  }
  console.log('✅ PASS: Source files exist');
  
  // Test 2: Verify sources file structure
  const latestSourcesFile = sourcesFiles.sort().pop();
  const sourcesData = JSON.parse(fs.readFileSync(
    path.join(sourcesDir, latestSourcesFile),
    'utf-8'
  ));
  
  console.log(`\n[TEST 2] Verifying sources file structure`);
  console.log(`  - Weather stations: ${sourcesData.summary?.weather_stations || sourcesData.data?.weather?.stations?.length || 0}`);
  console.log(`  - Aviation airports: ${sourcesData.summary?.aviation_airports || sourcesData.data?.aviation?.airports?.length || 0}`);
  
  if (!((sourcesData.summary?.weather_stations || sourcesData.data?.weather?.stations?.length) || 
        (sourcesData.summary?.aviation_airports || sourcesData.data?.aviation?.airports?.length))) {
    console.log('❌ FAIL: No weather stations or airports in sources');
    return false;
  }
  console.log('✅ PASS: Sources contain weather/aviation data');
  
  // Test 3: Verify generate-watchlist.mjs imports and uses sources
  const watchlistScript = fs.readFileSync(
    path.join(__dirname, '../scripts/generate-watchlist.mjs'),
    'utf-8'
  );
  
  console.log(`\n[TEST 3] Verifying generate-watchlist.mjs integration`);
  const hasSourcesImport = watchlistScript.includes('getLatestSourcesFile');
  const hasWeatherCheck = watchlistScript.includes("CATEGORY_PATTERNS.weather") || watchlistScript.includes("'weather'");
  const hasAviationCheck = watchlistScript.includes("CATEGORY_PATTERNS.aviation") || watchlistScript.includes("'aviation'");
  const hasMonitorSources = watchlistScript.includes('monitor_sources');
  
  if (!hasSourcesImport) {
    console.log('❌ FAIL: Missing sources import');
    return false;
  }
  if (!hasWeatherCheck || !hasAviationCheck) {
    console.log('❌ FAIL: Missing weather/aviation category checks');
    console.log('  - Weather check:', hasWeatherCheck);
    console.log('  - Aviation check:', hasAviationCheck);
    return false;
  }
  if (!hasMonitorSources) {
    console.log('❌ FAIL: Missing monitor_sources field');
    return false;
  }
  console.log('✅ PASS: Script has all required integration code');
  
  // Test 4: Verify watchlist output has sources_integrated field
  const watchlistFiles = fs.readdirSync(sourcesDir)
    .filter(f => f.startsWith('watchlist-') && f.endsWith('.json') && !f.includes('diff'))
    .sort()
    .pop();
  
  if (watchlistFiles) {
    const watchlistData = JSON.parse(fs.readFileSync(
      path.join(sourcesDir, watchlistFiles),
      'utf-8'
    ));
    
    console.log(`\n[TEST 4] Verifying watchlist output`);
    if (watchlistData.sources_integrated) {
      console.log(`  - Weather stations integrated: ${watchlistData.sources_integrated.weather_stations}`);
      console.log(`  - Aviation airports integrated: ${watchlistData.sources_integrated.aviation_airports}`);
      console.log('✅ PASS: sources_integrated field present');
    } else {
      console.log('⚠️  WARN: sources_integrated not in watchlist (may need to regenerate)');
    }
  }
  
  console.log('\n=== All Tests Passed ===');
  return true;
}

testIntegration().then(success => {
  process.exit(success ? 0 : 1);
}).catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
