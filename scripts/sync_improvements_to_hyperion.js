const fs = require('fs');
const path = require('path');

const srcScratchDir = 'C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\scripts';
const targetHyperionDir = 'C:\\hyperion';
const targetScriptsDir = path.join(targetHyperionDir, 'scripts');

// Asegurar subdirectorios organizados en C:\hyperion\scripts
const dirsToCreate = [
  targetScriptsDir,
  path.join(targetScriptsDir, 'instagram'),
  path.join(targetScriptsDir, 'tiktok'),
  path.join(targetScriptsDir, 'facebook')
];

dirsToCreate.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Creada carpeta: ${dir}`);
  }
});

// Definir los scripts de producción mejorados a copiar
const filesToSync = [
  { src: 'instagram/clear_all_posts.js', dest: 'instagram/clear_all_posts.js' },
  { src: 'instagram/update_ig_profile_picture.js', dest: 'instagram/update_profile_picture.js' },
  { src: 'tiktok/clear_all_tiktok_videos.js', dest: 'tiktok/clear_all_videos.js' },
  { src: 'facebook/clear_all_fb_posts.js', dest: 'facebook/clear_all_posts.js' },
  { src: 'facebook/update_fb_profile_picture.js', dest: 'facebook/update_profile_picture.js' },
  { src: 'organize_hyperion_dir.js', dest: 'organize_workspace.js' }
];

filesToSync.forEach(item => {
  const srcPath = path.join(srcScratchDir, item.src);
  const destPath = path.join(targetScriptsDir, item.dest);
  
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
    console.log(`✅ Sincronizado: ${item.src} -> C:\\hyperion\\scripts\\${item.dest}`);
  } else {
    console.log(`⚠️ No se encontró archivo origen: ${srcPath}`);
  }
});

console.log('🎉 ¡Todas las mejoras de producción fueron instaladas e integradas en C:\\hyperion con éxito!');
