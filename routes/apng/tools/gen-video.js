#!/usr/bin/env node
/**
 * pet-forge APNG tools - video generation script
 *
 * Usage:
 *   node gen-video.js <animation-key> --image reference/main-ref.png
 *   node gen-video.js <animation-key> --image selected.png --last-frame selected.png --api doubao
 *
 * Generated videos are saved to output/<animation-key>/.
 * Use chroma_key.py to convert downloaded videos into APNG files.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { doubaoGenerateVideo, downloadBuffer } from './lib/api.js';
import { buildChromaInvocation } from './lib/chroma-command.js';
import { ANIMATIONS, buildPrompt } from './prompts.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── CLI args ─────────────────────────────────────────────

const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('Usage: node gen-video.js <animation-name> --image <first-frame-image-path> [options]');
  console.log('\nOptions:');
  console.log('  --image <path>      the first-frame reference image (required, unless using --no-first-frame)');
  console.log('  --last-frame <path> the last-frame reference image (usually the same as --image for loop/return types)');
  console.log('  --api doubao        choose the API (the current public version only keeps doubao)');
  console.log('  --model <name>      override the default video model');
  console.log('  --ref-mode          use the image as a character reference, without anchoring the first frame');
  console.log('  --no-first-frame    don\'t set a first frame, only a last frame');
  console.log('  --no-chroma         skip the chroma_key post-processing step');
  process.exit(0);
}

function getArg(flag, defaultVal) {
  const idx = args.indexOf(flag);
  return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : defaultVal;
}

function imageDataUri(filePath) {
  const buf = fs.readFileSync(filePath);
  const ext = path.extname(filePath).slice(1) || 'png';
  return `data:image/${ext};base64,${buf.toString('base64')}`;
}

const animKey = args[0];
const imagePath = getArg('--image', null);
const apiChoice = getArg('--api', 'doubao');
const modelOpt = getArg('--model', null);
const lastFramePath = getArg('--last-frame', null);
const refMode = args.includes('--ref-mode');
const noFirstFrame = args.includes('--no-first-frame');
const skipChroma = args.includes('--no-chroma');

if (apiChoice !== 'doubao') {
  throw new Error('The current public version only keeps --api doubao');
}

if (!ANIMATIONS[animKey]) {
  console.error(`❌ Unknown animation: "${animKey}"`);
  process.exit(1);
}
const anim = ANIMATIONS[animKey];
if (!noFirstFrame && (!imagePath || !fs.existsSync(imagePath))) {
  console.error('❌ Please specify the first-frame image path with --image, or skip it with --no-first-frame');
  process.exit(1);
}
if (lastFramePath && !fs.existsSync(lastFramePath)) {
  console.error(`❌ Last-frame image not found: ${lastFramePath}`);
  process.exit(1);
}
if (noFirstFrame && !lastFramePath) {
  console.error('❌ --no-first-frame must be used together with --last-frame');
  process.exit(1);
}
if (anim.anchor === 'different' && !lastFramePath) {
  console.error('❌ A transition-type animation must specify a different last frame with --last-frame');
  process.exit(1);
}
if (
  anim.anchor === 'different' && !refMode && !noFirstFrame &&
  path.resolve(imagePath) === path.resolve(lastFramePath)
) {
  console.error('❌ A transition-type animation\'s --image and --last-frame must be different files');
  process.exit(1);
}
if (refMode && noFirstFrame) {
  console.error('❌ --ref-mode and --no-first-frame can\'t be used together');
  process.exit(1);
}

const prompt = buildPrompt(animKey);

// ── Output setup ─────────────────────────────────────────

const outDir = path.join(__dirname, 'output', animKey);

console.log(`\n🎬 Generating video: ${animKey} (${anim.name})`);
console.log(`   First-frame image: ${imagePath || '(none)'}`);
console.log('   API: doubao');
console.log(`   Output directory: ${outDir}\n`);

// ── Generate video ───────────────────────────────────────

const results = [];

console.log('── Doubao / Volcengine video generation ──\n');
try {
  let dataUri = !noFirstFrame && imagePath ? imageDataUri(imagePath) : null;
  let videoPrompt = prompt;
  const lastSrc = lastFramePath || (!refMode && !noFirstFrame && anim.anchor === 'same' ? imagePath : null);
  const lastFrameUri = lastSrc ? imageDataUri(lastSrc) : null;

  if (noFirstFrame) {
    dataUri = null;
    if (lastSrc) {
      console.log(`  Mode: last-frame anchoring only → ${lastSrc}`);
    }
  } else if (refMode) {
    videoPrompt = `[Image 1] is the character reference image. ${prompt}`;
    console.log('  Mode: reference image (first frame not anchored)');
    if (lastSrc) console.log(`  Last-frame anchor: ${lastSrc}`);
  } else {
    if (lastSrc) {
      console.log(`  First/last-frame anchor: ${lastSrc === imagePath ? 'first and last frame are the same' : lastSrc}`);
    }
  }

  const result = await doubaoGenerateVideo(videoPrompt, dataUri, {
    model: modelOpt || undefined,
    lastFrameUrl: lastFrameUri,
    asReference: refMode,
  });

  let videoUrl = null;
  if (result.video_url) {
    videoUrl = result.video_url;
  } else if (result.content && result.content.video_url) {
    videoUrl = result.content.video_url;
  } else if (result.content && Array.isArray(result.content)) {
    const videoItem = result.content.find(c => c.type === 'video_url' || c.type === 'video');
    if (videoItem) videoUrl = videoItem.video_url?.url || videoItem.url;
  } else if (result.data && result.data.video_url) {
    videoUrl = result.data.video_url;
  }

  if (videoUrl) {
    const videoPath = path.join(outDir, 'doubao-video.mp4');
    const buf = await downloadBuffer(videoUrl);
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(videoPath, buf);
    console.log(`  ✓ Video downloaded: ${videoPath}`);
    results.push(videoPath);
  } else {
    const jsonPath = path.join(outDir, 'doubao-video-raw.json');
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2));
    console.log(`  ⚠ No video URL found, saved the raw response instead: ${jsonPath}`);
    process.exitCode = 1;
  }
} catch (err) {
  console.error(`  ❌ Video generation failed: ${err.message}`);
  process.exitCode = 1;
}

// ── Chroma-key post-processing ───────────────────────────

if (!skipChroma && results.length > 0) {
  console.log('\n── chroma_key post-processing ──\n');
  const chromaScript = path.join(__dirname, 'chroma_key.py');

  if (!fs.existsSync(chromaScript)) {
    console.log('  ❌ chroma_key.py not found, can\'t complete post-processing');
    console.log('  Run manually: python chroma_key.py <video-path> <output.apng>');
    process.exitCode = 1;
  } else {
    const { spawnSync } = await import('child_process');
    for (const videoPath of results) {
      const apngPath = videoPath.replace('.mp4', '.apng');
      try {
        console.log(`  Processing: ${videoPath}`);
        const invocation = buildChromaInvocation({
          scriptPath: chromaScript,
          videoPath,
          apngPath,
          loop: anim.loop,
        });
        const processed = spawnSync(invocation.command, invocation.args, {
          stdio: 'inherit',
          cwd: __dirname,
        });
        if (processed.error || processed.status !== 0) {
          throw processed.error || new Error(`Exit code ${processed.status}`);
        }
        console.log(`  ✓ APNG: ${apngPath}`);
      } catch (err) {
        console.error(`  ❌ chroma_key failed: ${err.message}`);
        console.log(`  Run manually: python "${chromaScript}" "${videoPath}" "${apngPath}"`);
        process.exitCode = 1;
      }
    }
  }
}

// ── Summary ──────────────────────────────────────────────

console.log(`\n${'─'.repeat(50)}`);
if (results.length === 0) process.exitCode = 1;
console.log(`${process.exitCode ? '❌ Not complete' : '✅ Done'}! Generated ${results.length} video(s) total`);
results.forEach(f => console.log(`   ${f}`));
console.log('');
