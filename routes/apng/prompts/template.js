/**
 * pet-forge APNG route —— generic prompt template (25 deliverable states)
 * ─────────────────────────────────────────────────────────────
 * This is a template, not a finished product. The user must edit CHARACTER_PREFIX
 * to fit their own character.
 *
 * The state library contains 25 prompt entries; mini-peek can either be generated
 * on its own or clipped from another animation.
 * Character-specific description has been stripped out, leaving a generic skeleton +
 * loop / start-end-frame relationships that have been validated in practice.
 *
 * ─────────────────────────────────────────────────────────────
 * ⚠️ Start/end-frame relationship (affects gen-video.js command options), 3 kinds:
 *
 *   A. Loop (loop: true)
 *      start = end (the same reference image, usually the main reference)
 *      → <animation-name> --image X --last-frame X
 *
 *   B. One-shot · return type (loop: false, anchor: 'same')
 *      returns to the neutral pose once the action is done, start and end frames match
 *      → <animation-name> --image X --last-frame X
 *
 *   C. One-shot · transition type (loop: false, anchor: 'different')
 *      a transition between states, start and end frames are different poses
 *      → <animation-name> --image X --last-frame Y  (X != Y)
 *
 * See routes/apng/conventions/loop-and-anchoring.md for the detailed decision tree
 * ─────────────────────────────────────────────────────────────
 */

// ── 1. Character appearance description (the user must edit this) ────────────────────────
//
// Important: this description is shared across all states, and determines character
// consistency. The more specific it is, the more the AI-generated states will look
// like the same character.
//
// Should cover 6 dimensions:
// - Species / category (cat / robot / cloud creature ...)
// - Style anchor (chibi / kawaii / pixel-art / realistic ...)
// - Color / pattern (cream body with orange patches / metallic gray ...)
// - Main identifying features (big round eyes with white highlights / small triangle ears ...)
// - Outline / rendering style (thick dark outlines / cell-shaded / NO 3D rendering ...)
// - Background requirement (plain solid green #00B140 background)
//
export const CHARACTER_PREFIX = `[Write your character's appearance description here. Example:
A cute chibi/kawaii style {species} character with {outline features}, {body-shape features},
flat color fills, on a plain solid green (#00B140) background. The {species}
has {main color}, {main feature 1}, {main feature 2}, {expression feature}. The art style
is clean vector cartoon — NO pixel art, NO realistic rendering, NO 3D.
Consistent character design throughout, no color changes between frames.]`;

// ── 2. Green-screen background emphasis (usually doesn't need editing) ────────────────────────────
export const BG_SUFFIX = `The background must remain a uniform solid green (#00B140) throughout the entire video. No shadows, no objects, no gradients on the background.`;

// ── 3. Full state library (25 deliverable states, categorized per the general state mapping) ────
//
// Field reference:
//   loop      — whether it loops (true / false)
//   anchor    — 'same' (start=end) / 'different' (start≠end, transition type only)
//   duration  — reference duration (seconds)
//   refKey    — which reference image to use (main = main reference image / a custom key)
//   lastKey   — the last-frame reference image key, for transition-type states
//   prompt    — the action description (excludes CHARACTER_PREFIX and BG_SUFFIX, which get
//               concatenated automatically)
//   notes     — QA checkpoints
//
// ▼ 25 deliverable states, grouped by purpose ▼
//
export const ANIMATIONS = {

  // ─── core states (the core loops — this group is where most of the "feel" of a desktop pet comes from) ─────────
  // this whole group is type A: loop=true, start=end

  'idle-dozing': {
    name: 'idle breathing',
    loop: true,
    anchor: 'same',
    duration: 5,
    refKey: 'main',
    prompt: `The character is in its standard pose, completely still. The ONLY movement is very gentle breathing — body slowly and subtly rises and falls. Does NOT move head, change angle, shift position, or close eyes. Eyes stay open. Extremely minimal movement. Seamless loop animation, very calm. DO NOT inflate or balloon any extending parts. DO NOT rotate or shift the camera angle.`,
    notes: 'an extremely minimal micro-motion loop, breathing only, no eye-closing or head-turning',
  },

  'idle-living': {
    name: 'idle small motion',
    loop: true,
    anchor: 'same',
    duration: 5,
    refKey: 'main',
    prompt: `The character is in standard pose, casually doing a small grooming/idle motion (adapt to your character: licking a paw / grooming an antenna / wiping the lens), then pauses with content expression, then repeats. Relaxed and cozy throughout. Seamless loop — the last frame connects perfectly back to the first frame. Body stays in place.`,
    notes: 'a small-motion loop — keep the motion simple, or the start/end frames won\'t line up',
  },

  'thinking': {
    name: 'thinking',
    loop: true,
    anchor: 'same',
    duration: 3,
    refKey: 'main',
    prompt: `The character is in a thinking pose — head slightly tilted, one hand/paw raised toward chin (or your character's equivalent gesture). A small question mark (?) floats above its head. Tail/extension sways gently. Occasional blink. Seamless loop, contemplative mood.`,
    notes: 'if the question-mark effect doesn\'t generate well, add it by hand in post',
  },

  'working-typing': {
    name: 'working - typing',
    loop: true,
    anchor: 'same',
    duration: 3,
    refKey: 'main',
    prompt: `The character is rapidly tapping its hands/paws up and down as if typing on an invisible keyboard. The hands alternate left-right in a fast rhythmic pattern. Focused, slightly intense expression. Tail sways gently. Seamless loop animation — the last frame connects perfectly back to the first frame. Body stays in place, only the typing parts move.`,
    notes: 'left/right hands alternate rhythmically, don\'t let the body sway too much, seamless start/end frames',
  },

  'working-building': {
    name: 'working - building/screwing',
    loop: true,
    anchor: 'same',
    duration: 5,
    refKey: 'building',
    prompt: `The character is operating a tool (screwdriver / hammer / your character's tool) on a workpiece. Performs the operation with focused, determined expression, then repositions, then repeats. Tail sways slightly. Seamless loop animation. Body stays in place. NO hands, NO fingers visible (use your character's natural manipulators).`,
    notes: 'holding a tool + a focused expression + a smooth loop seam',
  },

  'working-juggling': {
    name: 'working - playing/juggling',
    loop: true,
    anchor: 'same',
    duration: 5,
    refKey: 'juggling',
    prompt: `The character holds a small object (yarn ball / orb / your character's prop) with its hands/paws. Plays with it (bats / juggles / spins), maybe falls back briefly, then returns to the EXACT starting pose holding the object. Seamless loop animation — the last frame connects perfectly back to the first frame.`,
    notes: 'the motion needs to return to the starting pose holding the object, or it won\'t loop seamlessly',
  },

  'working-conducting': {
    name: 'working - conducting',
    loop: true,
    anchor: 'same',
    duration: 5,
    refKey: 'main',
    prompt: `The character has a proud, smug expression. Its tail/baton/extending part raised high and sways rhythmically left-right-left like a conductor's baton, keeping a steady tempo. Small musical notes float nearby. Head bobs slightly in rhythm. Seamless loop — the last frame connects perfectly back to the first frame. Body stays in place, only the extending part sways.`,
    notes: 'the tail/antenna sways left-right like a conductor\'s baton, a smug expression',
  },

  'working-sweeping': {
    name: 'working - wiping/sweeping',
    loop: true,
    anchor: 'same',
    duration: 5,
    refKey: 'sweeping',
    prompt: `The character is using one hand/paw to wipe a surface (table / floor / cloth), moving left and right in a steady wiping motion. Cheerful, diligent expression. Tail sways gently. Seamless loop — the last frame connects perfectly back to the first frame. The character stays in place, only the wiping part moves.`,
    notes: 'left-right wiping motion + a happy expression + a loop',
  },

  'working-carrying': {
    name: 'working - carrying',
    loop: true,
    anchor: 'same',
    duration: 5,
    refKey: 'carrying',
    prompt: `The character is carrying a small object (fish / box / your character's item) walking proudly. Walks left a few steps, turns around, walks right a few steps, returns to starting position. Happy, proud expression with squinted eyes throughout. Tail raised high, sways as it walks. Seamless loop — the last frame connects perfectly back to the first frame.`,
    notes: 'carrying/holding an object while walking left-right + a proud expression + a loop',
  },

  // ─── reaction states (triggered by user interaction) ──────────────────────

  'react-drag': {
    name: 'being dragged',
    loop: true,
    anchor: 'same',
    duration: 3,
    refKey: 'react-drag',
    prompt: `The character is floating in the air as if being dragged by an invisible force. NO hands visible. Looks thrilled and excited — eyes wide and sparkling, big happy grin, ears/extensions perked forward. Limbs spread out like airplane wings. Tail streams behind like a flag. Body sways and bounces slightly as if riding a rollercoaster. Seamless loop animation. Fun and energetic. DO NOT draw any hands or fingers.`,
    notes: 'no hands, an excited floating/flying pose, loops',
  },

  'react-poke': {
    name: 'reaction to being poked (one-shot · return type)',
    loop: false,
    anchor: 'same',
    duration: 2.5,
    refKey: 'main',
    prompt: `The character flinches and leans to one side with a surprised expression — eyes wide, ears perked. Raises one hand/paw as if startled. Then settles back to the EXACT original pose. 2.5 seconds, cute and slightly startled. NO hands, NO fingers visible — character reacts as if touched by an invisible force. The ending pose must match the starting pose EXACTLY.`,
    notes: 'a surprised lean + raised hand → back to the original pose, start/end frames must match exactly',
  },

  // ─── notification / completion (one-shot · return type) ────────────

  'happy': {
    name: 'task complete',
    loop: false,
    anchor: 'same',
    duration: 4,
    refKey: 'main',
    prompt: `The character suddenly perks up with joy — eyes squinting into happy crescents (^^), tail/extending part standing straight up wagging enthusiastically. Small sparkles or flower petals float around. Maybe a small celebratory wiggle or tiny hop in place. Pure contentment expression. Then settles back to the normal pose. 4 seconds, cheerful and lively.`,
    notes: 'one-shot, must end back at the standard idle pose',
  },

  'notification': {
    name: 'notification/alert',
    loop: false,
    anchor: 'same',
    duration: 2.5,
    refKey: 'main',
    prompt: `The character suddenly becomes alert — ears/extensions perk up and rotate forward, pupils dilate slightly, body tenses into slight crouch. A yellow exclamation mark (!) appears above its head. Holds the alert pose briefly, then relaxes back to normal sitting pose. 2.5 seconds total.`,
    notes: 'ears perk up and rotate + pupils dilate + body crouches slightly, ends back at neutral',
  },

  'error': {
    name: 'X-eyes, fainted',
    loop: true,
    anchor: 'same',
    duration: 5,
    refKey: 'error',
    prompt: `The character is lying on its side, knocked out with X-shaped eyes and tongue sticking out slightly. Body has very gentle breathing motion — slow subtle rise and fall. Small puff clouds and sparkle stars float and drift above its head. Stays in same lying position the entire time. Seamless loop, calm and slow. DO NOT inflate or balloon any extending parts. DO NOT move the body position.`,
    notes: 'lying still with X-eyes + faint breathing + puffs/stars above the head, loops',
  },

  // ─── idle decorations (one-shot · return type, triggered after a long idle) ─────────

  'idle-yawn': {
    name: 'yawning (decoration)',
    loop: false,
    anchor: 'same',
    duration: 3,
    refKey: 'main',
    prompt: `The character is in standard pose. Slowly opens its mouth very wide in a big yawn — tongue curling, eyes squeezing shut. Then closes mouth, does a small head shake, returns to original pose with eyes open. Smooth animation, 3 seconds total. Stays in place, only head and mouth move significantly. Body breathes gently. Return to the EXACT starting pose at the end.`,
    notes: 'a decorative animation, triggered after a long idle, start/end must match exactly',
  },

  'idle-look': {
    name: 'looking around (decoration)',
    loop: false,
    anchor: 'same',
    duration: 6.5,
    refKey: 'main',
    prompt: `The character looks around curiously. Head turns slowly to the left, pauses, then turns to the right, pauses, then returns to center facing forward. Body stays in place, only head moves. Ears twitch occasionally. Curious and calm expression. 6.5 seconds total.`,
    notes: 'head turns left → pauses → turns right → pauses → returns to center, body doesn\'t move, a decorative animation',
  },

  // ─── the sleeping chain (a mix of types A/B/C) ──────────────────────

  'sleeping': {
    name: 'sleeping loop',
    loop: true,
    anchor: 'same',
    duration: 5,
    refKey: 'sleep-final',
    prompt: `The character is in sleeping pose (curled / lying / your character's sleep posture). Tail/blanket wraps around. Eyes fully closed. The only movement is gentle breathing — body slowly rises and falls. A small "Zzz" sleep bubble floats up occasionally. Seamless loop, very calm and slow. Minimal movement, cozy atmosphere.`,
    notes: 'curled into a ball or lying on its back + breathing + a Zzz bubble (can be added by hand in post), loops',
  },

  'collapse-sleep': {
    name: 'quickly falling asleep (one-shot · transition type)',
    loop: false,
    anchor: 'different',
    duration: 0.8,
    refKey: 'main',
    lastKey: 'sleep-final',
    prompt: `The character slowly topples over to one side — body tilting, eyes closing, then curling up into a sleeping ball. Very quick transition, 0.8 seconds. End pose is the curled-up sleeping position.`,
    notes: 'sitting → tips over sideways → curls up, start≠end, a transition animation',
  },

  'wake': {
    name: 'waking up and stretching (one-shot · transition type)',
    loop: false,
    anchor: 'different',
    duration: 1.5,
    refKey: 'sleep-final',
    lastKey: 'main',
    prompt: `The character transitions from curled-up sleeping position to sitting upright. Uncurls, stretches forward in a long stretch, arches its back, then sits up straight with eyes open and alert. Quick but fluid motion, 1.5 seconds total. End pose matches the standard sitting/idle position EXACTLY.`,
    notes: 'stretches and arches its back + the final pose must align exactly with idle, a transition animation',
  },

  // ─── mini mode (a shrunk-down dock/tray mode, 6 states) ─────────────

  'mini-idle': {
    name: 'mini idle',
    loop: true,
    anchor: 'same',
    duration: 5,
    refKey: 'mini',
    prompt: `The character is in a relaxed lying / sideways / curled pose (DIFFERENT from main idle, this is the mini-mode pose). Calm and content expression. Gentle breathing — body slowly rises and falls. Slow blinks. Slightly turns head to look to one side, then slowly back to center. Very gentle movement. Seamless loop, very calm. DO NOT change pose. Body stays in same lying position throughout.`,
    notes: 'mini mode ≠ a shrunk-down idle, it\'s a different pose',
  },

  'mini-enter': {
    name: 'mini entrance (one-shot · transition type)',
    loop: false,
    anchor: 'different',
    duration: 3,
    refKey: 'offscreen-left',
    lastKey: 'mini',
    prompt: `The character runs playfully from off-screen, then flops down and rolls into the mini-idle pose. Quick and energetic run, then a cute tumble onto the mini pose. Happy and playful expression throughout.`,
    notes: 'runs in from off-screen → flops down into the mini-idle position, start≠end',
  },

  'mini-peek': {
    name: 'mini peek (clipped or standalone)',
    loop: false,
    anchor: 'same',
    duration: 2,
    refKey: 'mini',
    prompt: `The character (in mini pose) peeks out and waves briefly, then settles back to mini-idle pose. Cute brief reaction. End pose matches mini-idle EXACTLY.`,
    notes: 'can be clipped from another animation, or generated standalone',
  },

  'mini-alert': {
    name: 'mini notification',
    loop: true,
    anchor: 'same',
    duration: 3,
    refKey: 'mini',
    prompt: `The character is in mini pose. A red exclamation mark (!) pops up beside, bouncing and flashing. Eyes widen with surprised expression, ears perk. Body stays in same mini pose, only eyes react and exclamation animates. Seamless loop animation.`,
    notes: 'mini pose + a popping exclamation mark + surprise, loops',
  },

  'mini-happy': {
    name: 'mini completion celebration',
    loop: true,
    anchor: 'same',
    duration: 3,
    refKey: 'mini',
    prompt: `The character is in mini pose. Small sparkles, stars and flower petals float and pop around. Very happy expression — eyes squinted into happy crescents (^^), content and proud. Body stays in same mini pose, only sparkle effects animate and tail wags slightly. Seamless loop animation.`,
    notes: 'mini pose + floating sparkles/flowers + squinty happy eyes, loops',
  },

  'mini-sleep': {
    name: 'mini dormant',
    loop: true,
    anchor: 'same',
    duration: 5,
    refKey: 'mini',
    prompt: `The character is in mini pose, eyes CLOSED, sleeping deeply. Eyes must stay CLOSED entire time. The only movement is very gentle breathing — body slowly rises and falls. Small "Zzz" text floats up and fades, repeating in loop. Very calm and cozy. Seamless loop. DO NOT open eyes. DO NOT change camera angle.`,
    notes: 'mini pose, eyes closed, sleeping + breathing + Zzz, a minimal loop',
  },
};

// ── 4. The concatenation function (builds the final prompt to send to the API) ────────────────────
export function buildFullPrompt(animationKey) {
  const anim = ANIMATIONS[animationKey];
  if (!anim) {
    const keys = Object.keys(ANIMATIONS).join(', ');
    throw new Error(`Unknown animation: "${animationKey}". Options: ${keys}`);
  }
  return `${CHARACTER_PREFIX}\n\n${anim.prompt}\n\n${BG_SUFFIX}`;
}

// ── 5. Lists all animations (grouped by start/end-frame relationship) ──────────────────────
export function listAnimations() {
  console.log('\n════════ State library (' + Object.keys(ANIMATIONS).length + ' deliverable states total) ════════\n');

  const groupA = []; // loop
  const groupB = []; // one-shot · return type
  const groupC = []; // one-shot · transition type

  for (const [key, anim] of Object.entries(ANIMATIONS)) {
    const line = `  ${key.padEnd(20)} ${anim.name.padEnd(20)} ${anim.duration}s`;
    if (anim.loop) groupA.push(line);
    else if (anim.anchor === 'same') groupB.push(line);
    else groupC.push(line);
  }

  console.log('─── A. Loop animations (loop:true, start=end) ───');
  groupA.forEach(l => console.log(l));
  console.log(`\n─── B. One-shot · return type (loop:false, start=end) ───`);
  groupB.forEach(l => console.log(l));
  console.log(`\n─── C. One-shot · transition type (loop:false, start≠end) ───`);
  groupC.forEach(l => console.log(l));
  console.log('');
}

// ── 6. Builds a gen-video.js command (automatically picks options based on anchor type) ─────
export function buildGenVideoCommand(animationKey, refImagePaths) {
  const anim = ANIMATIONS[animationKey];
  if (!anim) throw new Error(`Unknown animation: ${animationKey}`);

  const refPath = refImagePaths[anim.refKey];
  if (!refPath) throw new Error(`refKey "${anim.refKey}" has no matching path`);

  const parts = [
    'node gen-video.js',
    animationKey,
    `--image ${refPath}`,
    '--api doubao',
  ];

  // Key part: decide what to use for --last-frame based on anchor
  if (anim.anchor === 'same') {
    // Type A (loop) and type B (return type) both have start=end
    parts.push(`--last-frame ${refPath}`);
  } else {
    // Type C (transition) has start≠end, use the last frame specified by lastKey
    const lastPath = refImagePaths[anim.lastKey];
    if (!lastPath) throw new Error(`lastKey "${anim.lastKey}" has no matching path`);
    parts.push(`--last-frame ${lastPath}`);
  }

  parts.push(`--no-chroma`);
  return parts.join(' \\\n  ');
}
