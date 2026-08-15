/**
 * pet-forge APNG tools - API client
 *
 * Provides a Doubao / Volcengine example API for image and video generation.
 * All async video tasks are polled until completion.
 */

import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, '..', '.env') });

// ── API config ───────────────────────────────────────────

const DOUBAO_KEY = process.env.DOUBAO_API_KEY;
const DOUBAO_BASE = process.env.DOUBAO_BASE_URL;
const DOUBAO_IMAGE_MODEL = process.env.DOUBAO_IMAGE_MODEL || 'doubao-seedream-5-0-260128';
const DOUBAO_VIDEO_MODEL = process.env.DOUBAO_VIDEO_MODEL || 'doubao-seedance-1-5-pro-251215';

// ── Utility helpers ──────────────────────────────────────

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function checkKey(name, key) {
  if (!key) throw new Error(`${name} is not set, please check your .env file`);
}

/**
 * Download URL content as a Buffer.
 */
async function downloadBuffer(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status} ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

/**
 * Save a base64 string or image URL to a local file.
 */
async function saveImage(data, outputPath) {
  if (data.startsWith('http')) {
    const buf = await downloadBuffer(data);
    fs.writeFileSync(outputPath, buf);
  } else {
    const buf = Buffer.from(data, 'base64');
    fs.writeFileSync(outputPath, buf);
  }
  console.log(`  ✓ Saved: ${outputPath}`);
}

// ── Doubao / Volcengine API ──────────────────────────────

/**
 * Generate an image.
 *
 * @param {string} prompt - Image prompt.
 * @param {object} [opts]
 * @param {string} [opts.model] - Model name.
 * @param {number} [opts.n] - Number of images.
 * @param {string} [opts.size] - Output size.
 * @returns {Promise<object>} OpenAI-style response { data: [{ url, b64_json }] }
 */
export async function doubaoGenerateImage(prompt, opts = {}) {
  checkKey('DOUBAO_API_KEY', DOUBAO_KEY);

  const body = {
    model: opts.model || DOUBAO_IMAGE_MODEL,
    prompt,
    n: opts.n || 1,
    size: opts.size || '1920x1920',
  };

  const res = await fetch(`${DOUBAO_BASE}/images/generations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DOUBAO_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Doubao image generation failed: ${res.status} — ${text}`);
  }

  return res.json();
}

/**
 * Generate a video.
 *
 * @param {string} prompt - Video prompt.
 * @param {string} [refImageUrl] - First-frame image URL or base64 data URI.
 * @param {object} [opts]
 * @param {string} [opts.model] - Model name.
 * @param {string} [opts.lastFrameUrl] - Last-frame image URL or base64 data URI.
 * @param {boolean} [opts.asReference] - Use image as a reference instead of first-frame anchor.
 * @returns {Promise<object>} Completed task result.
 */
export async function doubaoGenerateVideo(prompt, refImageUrl, opts = {}) {
  checkKey('DOUBAO_API_KEY', DOUBAO_KEY);

  const content = [{ type: 'text', text: prompt }];

  if (refImageUrl) {
    content.push({
      type: 'image_url',
      image_url: { url: refImageUrl },
      role: opts.asReference ? 'reference_image' : 'first_frame',
    });
  }

  if (opts.lastFrameUrl) {
    content.push({
      type: 'image_url',
      image_url: { url: opts.lastFrameUrl },
      role: 'last_frame',
    });
  }

  const body = {
    model: opts.model || DOUBAO_VIDEO_MODEL,
    content,
    // Volcengine Ark Seedance's official watermark-removal parameter (a top-level
    // body field, not a --watermark prompt flag). Watermarked by default → defaults
    // to false here so generation comes out watermark-free; pass { watermark: true }
    // to restore it.
    watermark: opts.watermark === true,
  };

  const res = await fetch(`${DOUBAO_BASE}/contents/generations/tasks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DOUBAO_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Doubao video generation failed: ${res.status} — ${text}`);
  }

  const task = await res.json();
  const taskId = task.id || task.task_id;
  console.log(`  Doubao video task created: id=${taskId}, polling...`);
  return pollDoubaoTask(taskId);
}

/**
 * Poll an async video generation task.
 */
async function pollDoubaoTask(taskId, maxAttempts = 120, interval = 5000) {
  for (let i = 0; i < maxAttempts; i++) {
    await sleep(interval);

    const res = await fetch(`${DOUBAO_BASE}/contents/generations/tasks/${taskId}`, {
      headers: { 'Authorization': `Bearer ${DOUBAO_KEY}` },
    });

    if (!res.ok) {
      console.log(`  Poll #${i + 1}: HTTP ${res.status}, still waiting...`);
      continue;
    }

    const result = await res.json();
    const status = result.status || '';

    if (status === 'succeeded' || status === 'completed') {
      console.log('  ✓ Task complete!');
      return result;
    }
    if (status === 'failed' || status === 'error') {
      throw new Error(`Task failed: ${JSON.stringify(result)}`);
    }

    console.log(`  Poll #${i + 1}: ${status}`);
  }
  throw new Error(`Task timed out (waited ${maxAttempts * interval / 1000}s)`);
}

export { downloadBuffer, saveImage, sleep };
