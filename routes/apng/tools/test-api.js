#!/usr/bin/env node
/**
 * pet-forge APNG tools - API connectivity test
 *
 * Usage: node test-api.js
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, '.env') });

const DOUBAO_KEY = process.env.DOUBAO_API_KEY;
const DOUBAO_BASE = process.env.DOUBAO_BASE_URL;
let connected = false;

console.log('\n🔍 pet-forge APNG tools — API connectivity test\n');

console.log('Doubao / Volcengine API');
if (!DOUBAO_KEY || !DOUBAO_BASE) {
  if (!DOUBAO_KEY) console.log('   ❌ DOUBAO_API_KEY is not set');
  if (!DOUBAO_BASE) console.log('   ❌ DOUBAO_BASE_URL is not set');
  console.log('');
} else {
  console.log(`   Key: ${DOUBAO_KEY.slice(0, 8)}...${DOUBAO_KEY.slice(-4)}`);
  console.log(`   URL: ${DOUBAO_BASE}`);
  try {
    const res = await fetch(`${DOUBAO_BASE}/models`, {
      headers: { 'Authorization': `Bearer ${DOUBAO_KEY}` },
    });
    if (res.ok) {
      console.log('   ✅ Connected successfully!');
      connected = true;
    } else if (res.status === 404) {
      console.log('   ✅ Network reachable (the /models endpoint isn\'t available, which is expected)');
      connected = true;
    } else {
      const text = await res.text();
      console.log(`   ❌ HTTP ${res.status}: ${text.slice(0, 200)}`);
    }
  } catch (err) {
    console.log(`   ❌ Connection failed: ${err.message}`);
  }
  console.log('');
}

console.log('─'.repeat(50));
console.log('Test complete. Once connected, you can run gen-images.js / gen-video.js.\n');
process.exitCode = connected ? 0 : 1;
