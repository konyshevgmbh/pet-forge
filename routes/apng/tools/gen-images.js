#!/usr/bin/env node
/**
 * pet-forge APNG tools - image generation script
 *
 * Usage:
 *   node gen-images.js <animation-key>
 *   node gen-images.js --prompt "..." --output reference/main-ref.png
 *   node gen-images.js <animation-key> --count 3
 *   node gen-images.js --list
 *
 * Generated files are saved to output/<animation-key>/ by default.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { doubaoGenerateImage, saveImage } from './lib/api.js';
import { buildPrompt, listAnimations, ANIMATIONS } from './prompts.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── CLI args ─────────────────────────────────────────────

const args = process.argv.slice(2);

function getArg(flag, defaultVal) {
  const idx = args.indexOf(flag);
  return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : defaultVal;
}

if (args.includes('--list') || args.includes('-l')) {
  listAnimations();
  process.exit(0);
}

if (args.length === 0) {
  console.log('Usage: node gen-images.js <animation-name> [options]');
  console.log('       node gen-images.js --prompt "..." --output reference/main-ref.png');
  console.log('       node gen-images.js --list    list all available animations');
  console.log('\nOptions:');
  console.log('  --api doubao      choose the API (the current public version only keeps doubao)');
  console.log('  --count <n>       how many to generate (default 1)');
  console.log('  --model <name>    override the default image model');
  process.exit(0);
}

function assertSupportedApi(apiChoice) {
  if (apiChoice !== 'doubao') {
    throw new Error('The current public version only keeps --api doubao');
  }
}

async function saveFirstImageResult(result, outputPath) {
  if (result.data && Array.isArray(result.data)) {
    for (const item of result.data) {
      const imgData = item.url || item.b64_json;
      if (imgData) {
        fs.mkdirSync(path.dirname(path.resolve(outputPath)), { recursive: true });
        await saveImage(imgData, outputPath);
        return outputPath;
      }
    }
  }
  const jsonPath = outputPath.replace(/\.[^.]+$/, '') + '-raw.json';
  fs.mkdirSync(path.dirname(path.resolve(jsonPath)), { recursive: true });
  fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2));
  console.log(`  ⚠ No image data found, saved the raw response instead: ${jsonPath}`);
  return null;
}

const apiChoice = getArg('--api', 'doubao');
assertSupportedApi(apiChoice);

const modelOpt = getArg('--model', null);
const directPrompt = getArg('--prompt', null);
if (directPrompt) {
  const outputPath = getArg('--output', 'reference/main-ref.png');

  console.log(`\n🎨 Generating reference image: ${outputPath}`);
  console.log('   API: doubao\n');

  try {
    const result = await doubaoGenerateImage(directPrompt, {
      model: modelOpt || undefined,
    });
    const saved = await saveFirstImageResult(result, outputPath);
    if (!saved) process.exit(1);
    console.log(`\n✅ Done: ${saved}\n`);
    process.exit(0);
  } catch (err) {
    console.error(`  ❌ Image generation failed: ${err.message}`);
    process.exit(1);
  }
}

const animKey = args[0];
if (!ANIMATIONS[animKey]) {
  console.error(`❌ Unknown animation: "${animKey}"`);
  listAnimations();
  process.exit(1);
}

const count = parseInt(getArg('--count', '1'), 10);
if (!Number.isInteger(count) || count < 1) {
  throw new Error('--count must be a positive integer');
}

// ── Output setup ─────────────────────────────────────────

const outDir = path.join(__dirname, 'output', animKey);

const prompt = buildPrompt(animKey);
const anim = ANIMATIONS[animKey];

console.log(`\n🎨 Generating images: ${animKey} (${anim.name})`);
console.log(`   API: doubao, count ${count}`);
console.log(`   Output directory: ${outDir}\n`);

// ── Generate ─────────────────────────────────────────────

const results = [];
let failures = 0;

console.log('── Doubao / Volcengine image generation ──');
for (let i = 0; i < count; i++) {
  try {
    const tag = `doubao-${String(i + 1).padStart(2, '0')}`;
    console.log(`\n  [${tag}] generating...`);
    const result = await doubaoGenerateImage(prompt, {
      model: modelOpt || undefined,
    });

    let savedThisAttempt = 0;
    if (result.data && Array.isArray(result.data)) {
      for (let j = 0; j < result.data.length; j++) {
        const item = result.data[j];
        const filename = `${tag}-${j + 1}.png`;
        const outPath = path.join(outDir, filename);
        const imgData = item.url || item.b64_json;
        if (imgData) {
          fs.mkdirSync(outDir, { recursive: true });
          await saveImage(imgData, outPath);
          results.push(outPath);
          savedThisAttempt++;
        }
      }
    }
    if (savedThisAttempt === 0) {
      const jsonPath = path.join(outDir, `${tag}-raw.json`);
      fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2));
      console.log(`  ⚠ No image data found, saved the raw response instead: ${jsonPath}`);
      failures++;
    }
  } catch (err) {
    console.error(`  ❌ Image generation failed: ${err.message}`);
    failures++;
  }
}

// ── Summary ──────────────────────────────────────────────

console.log(`\n${'─'.repeat(50)}`);
if (failures || results.length === 0) process.exitCode = 1;
console.log(`${process.exitCode ? '❌ Not complete' : '✅ Done'}! Generated ${results.length} image(s) total:`);
results.forEach(f => console.log(`   ${f}`));
if (results.length) {
  console.log(`\nGo pick the one you like from ${outDir}, then generate the video with gen-video.js.\n`);
}
