const fs = require('fs');
const path = require('path');

const rootDir = 'C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent';

// Crear directorios si no existen
const dirs = ['archive_scripts', 'debug_screenshots', 'media'];
dirs.forEach(d => {
  const p = path.join(rootDir, d);
  if (!fs.existsSync(p)) {
    fs.mkdirSync(p);
  }
});

// Leer la raíz
fs.readdir(rootDir, (err, files) => {
  if (err) {
    console.error('Error reading root directory:', err);
    return;
  }

  files.forEach(file => {
    const fullPath = path.join(rootDir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isFile()) {
      const ext = path.extname(file).toLowerCase();

      // Mover capturas de pantalla a debug_screenshots/
      if (ext === '.png' || ext === '.jpg' || ext === '.jpeg') {
        const dest = path.join(rootDir, 'debug_screenshots', file);
        fs.renameSync(fullPath, dest);
        console.log(`Moviendo imagen: ${file} -> debug_screenshots/`);
      }
      
      // Mover archivos de video a media/
      else if (ext === '.mp4' || ext === '.ts') {
        const dest = path.join(rootDir, 'media', file);
        fs.renameSync(fullPath, dest);
        console.log(`Moviendo video: ${file} -> media/`);
      }

      // Mover scripts antiguos de la raíz a archive_scripts/
      else if (ext === '.js') {
        // Excluir archivos de configuración y scripts clave de ejecución en la raíz
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
                              file.startsWith('run-');
          if (isOldScript) {
            const dest = path.join(rootDir, 'archive_scripts', file);
            fs.renameSync(fullPath, dest);
            console.log(`Archivando script: ${file} -> archive_scripts/`);
          }
        }
      }
    }
  });

  console.log('🎉 ¡Organización del directorio completada con éxito!');
});
