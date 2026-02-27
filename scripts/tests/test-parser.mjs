/**
 * test-parser.mjs
 * 测试用例 for parse-resolution-rules.mjs
 */

import { parseRules, runTests } from '../parse-resolution-rules.mjs';

async function manualTest() {
  console.log('=== Manual Test Cases ===\n');
  
  const cases = [
    {
      name: 'Case 1: Snowfall at Central Park',
      rules: 'Snowfall measured at Central Park weather station by NOAA.',
      question: 'Will it snow in New York City on February 28, 2026?'
    },
    {
      name: 'Case 2: Temperature at DFW',
      rules: 'Temperature measured at Dallas/Fort Worth International Airport (KDFW) at 3pm local time.',
      question: 'Will temperature exceed 100°F in Dallas on July 15, 2026 at 3pm CDT?'
    },
    {
      name: 'Case 3: Precipitation threshold',
      rules: '≥1 inch snowfall at Central Park (KNYC)',
      question: ''
    },
    {
      name: 'Case 4: Hurricane',
      rules: 'Hurricane data from NOAA National Hurricane Center.',
      question: 'Will there be a Category 3+ hurricane making landfall in Miami in 2026?'
    },
    {
      name: 'Case 5: London rain',
      rules: 'Precipitation measured at London Heathrow (LHR).',
      question: 'Will it rain in London on March 15, 2026?'
    },
    {
      name: 'Case 6: Tokyo temperature',
      rules: 'Temperature measured at Tokyo (Ootemachi) - JMA station.',
      question: 'Will Tokyo exceed 40°C in summer 2026?'
    }
  ];

  for (const c of cases) {
    console.log(`\n--- ${c.name} ---`);
    console.log(`Rules: ${c.rules}`);
    if (c.question) console.log(`Question: ${c.question}`);
    
    const result = await parseRules(c.rules, c.question);
    
    console.log('Parsed:');
    console.log(`  Station: ${JSON.stringify(result.station)}`);
    console.log(`  Time Window: ${JSON.stringify(result.time_window)}`);
    console.log(`  Metric: ${JSON.stringify(result.metric)}`);
    console.log(`  Threshold: ${JSON.stringify(result.threshold)}`);
    console.log(`  Source: ${JSON.stringify(result.resolution_source)}`);
    console.log(`  Overall Confidence: ${result.overall_confidence}`);
  }
}

manualTest().then(() => console.log('\n=== Tests Complete ==='));
