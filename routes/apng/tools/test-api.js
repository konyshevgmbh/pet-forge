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

console.log('\n🔍 pet-forge APNG tools — API 连通性测试\n');

console.log('Doubao / Volcengine API');
if (!DOUBAO_KEY || !DOUBAO_BASE) {
  if (!DOUBAO_KEY) console.log('   ❌ DOUBAO_API_KEY 未设置');
  if (!DOUBAO_BASE) console.log('   ❌ DOUBAO_BASE_URL 未设置');
  console.log('');
} else {
  console.log(`   Key: ${DOUBAO_KEY.slice(0, 8)}...${DOUBAO_KEY.slice(-4)}`);
  console.log(`   URL: ${DOUBAO_BASE}`);
  try {
    const res = await fetch(`${DOUBAO_BASE}/models`, {
      headers: { 'Authorization': `Bearer ${DOUBAO_KEY}` },
    });
    if (res.ok) {
      console.log('   ✅ 连通成功!');
      connected = true;
    } else if (res.status === 404) {
      console.log('   ✅ 网络连通（/models 端点不可用，属正常）');
      connected = true;
    } else {
      const text = await res.text();
      console.log(`   ❌ HTTP ${res.status}: ${text.slice(0, 200)}`);
    }
  } catch (err) {
    console.log(`   ❌ 连接失败: ${err.message}`);
  }
  console.log('');
}

console.log('─'.repeat(50));
console.log('测试完成。连通后即可运行 gen-images.js / gen-video.js。\n');
process.exitCode = connected ? 0 : 1;
