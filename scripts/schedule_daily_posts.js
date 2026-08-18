/**
 * HYPERION v11 — Daily Multi-Platform & Multi-Language Social Media Scheduler
 * 
 * Schedule Matrix:
 * 🌅 Morning (09:00 AM): English Reel/Video Post across Instagram, TikTok, Facebook.
 * ☀️ Midday (01:00 PM): Portuguese Reel/Video Post across Instagram, TikTok, Facebook.
 * 🌇 Evening (05:00 PM): Spanish Reel/Video Post across Instagram, TikTok, Facebook.
 */
const { execSync } = require('child_process');
const path = require('path');

function runScript(scriptPath) {
  console.log(`\n🚀 [HYPERION SCHEDULER] Running ${scriptPath}...`);
  try {
    const out = execSync(`node "${scriptPath}"`, { cwd: 'C:\\hyperion', encoding: 'utf8', timeout: 300000 });
    console.log(out);
  } catch (err) {
    console.error(`❌ Error executing ${scriptPath}:`, err.message);
  }
}

const mode = (process.argv[2] || 'morning').toLowerCase();

if (mode === 'morning' || mode === 'en') {
  console.log('════════════════════════════════════════════');
  console.log('🌅 HYPERION MORNING ROUTINE — ENGLISH CONTENT');
  console.log('════════════════════════════════════════════');
  // 1. Instagram English Reel
  runScript(path.join(__dirname, 'instagram', 'publish_reel_en.js'));
  // 2. TikTok English Video
  runScript(path.join(__dirname, 'tiktok', 'publish_video_en.js'));
  // 3. Facebook English Video/Reel
  runScript(path.join(__dirname, 'facebook', 'publish_video.js'));

} else if (mode === 'midday' || mode === 'pt' || mode === 'portuguese') {
  console.log('════════════════════════════════════════════');
  console.log('☀️ HYPERION MIDDAY ROUTINE — PORTUGUESE CONTENT');
  console.log('════════════════════════════════════════════');
  // 1. Instagram Portuguese Reel
  runScript(path.join(__dirname, 'instagram', 'publish_reel_pt.js'));
  // 2. TikTok Portuguese Video
  runScript(path.join(__dirname, 'tiktok', 'publish_video_pt.js'));
  // 3. Facebook Portuguese Video/Reel
  runScript(path.join(__dirname, 'facebook', 'publish_reel_pt.js'));

} else if (mode === 'afternoon' || mode === 'evening' || mode === 'es' || mode === 'spanish') {
  console.log('════════════════════════════════════════════');
  console.log('🌇 HYPERION EVENING ROUTINE — SPANISH CONTENT');
  console.log('════════════════════════════════════════════');
  // 1. Instagram Spanish Reel
  runScript(path.join(__dirname, 'instagram', 'publish_reel_es.js'));
  // 2. TikTok Spanish Video
  runScript(path.join(__dirname, 'tiktok', 'publish_video_es.js'));
  // 3. Facebook Spanish Video/Reel
  runScript(path.join(__dirname, 'facebook', 'publish_video_es.js'));
}

console.log('✅ Multi-language schedule execution completed.');
