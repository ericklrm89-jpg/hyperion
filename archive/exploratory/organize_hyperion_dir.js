const fs = require('fs');
const path = require('path');

const targetDir = 'C:\\hyperion';

if (!fs.existsSync(targetDir)) {
  console.log(`❌ Target directory does not exist: ${targetDir}`);
  return;
}

// Crear carpetas organizadas
const subdirs = ['archive_scripts', 'debug_screenshots', 'media'];
subdirs.forEach(d => {
  const p = path.join(targetDir, d);
  if (!fs.existsSync(p)) {
    fs.mkdirSync(p, { recursive: true });
  }
});

// Leer el directorio
fs.readdir(targetDir, (err, files) => {
  if (err) {
    console.error('Error reading target directory:', err);
    return;
  }

  files.forEach(file => {
    const fullPath = path.join(targetDir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isFile()) {
      const ext = path.extname(file).toLowerCase();

      // Mover capturas de pantalla a debug_screenshots/
      if (ext === '.png' || ext === '.jpg' || ext === '.jpeg') {
        const dest = path.join(targetDir, 'debug_screenshots', file);
        fs.renameSync(fullPath, dest);
        console.log(`Moviendo imagen: ${file} -> debug_screenshots/`);
      }
      
      // Mover archivos de video a media/
      else if (ext === '.mp4' || ext === '.ts') {
        const dest = path.join(targetDir, 'media', file);
        fs.renameSync(fullPath, dest);
        console.log(`Moviendo video: ${file} -> media/`);
      }

      // Mover scripts antiguos de la raíz a archive_scripts/
      else if (ext === '.js') {
        const keepList = ['jest.config.js'];
        if (!keepList.includes(file)) {
          // Filtrar por patrones de pruebas o scripts viejos de la raíz
          const isOldScript = file.startsWith('instagram') || 
                              file.startsWith('whatsapp') || 
                              file.startsWith('facebook') || 
                              file.startsWith('test') || 
                              file.startsWith('hyperion') || 
                              file.startsWith('debug') ||
                              file.startsWith('go-') ||
                              file.startsWith('verify-') ||
                              file.startsWith('run-');
          if (isOldScript) {
            const dest = path.join(targetDir, 'archive_scripts', file);
            fs.renameSync(fullPath, dest);
            console.log(`Archivando script: ${file} -> archive_scripts/`);
          }
        }
      }
    }
  });

  console.log('🎉 ¡Organización del directorio C:\\hyperion completada con éxito!');
});
