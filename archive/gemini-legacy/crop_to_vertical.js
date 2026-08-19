const fs = require('fs');
const { PNG } = require('pngjs');

function cropTo916(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    fs.createReadStream(inputPath)
      .pipe(new PNG())
      .on('parsed', function () {
        const srcWidth = this.width;
        const srcHeight = this.height;

        // Calcular ancho para 9:16 basado en la altura
        const targetHeight = srcHeight;
        const targetWidth = Math.round(targetHeight * (9 / 16));

        if (targetWidth > srcWidth) {
          reject(new Error('La imagen de entrada es demasiado angosta para recortar a 9:16'));
          return;
        }

        const startX = Math.floor((srcWidth - targetWidth) / 2);
        const dst = new PNG({ width: targetWidth, height: targetHeight });

        for (let y = 0; y < targetHeight; y++) {
          for (let x = 0; x < targetWidth; x++) {
            const srcIdx = ((y * srcWidth) + (startX + x)) << 2;
            const dstIdx = ((y * targetWidth) + x) << 2;

            dst.data[dstIdx] = this.data[srcIdx];
            dst.data[dstIdx + 1] = this.data[srcIdx + 1];
            dst.data[dstIdx + 2] = this.data[srcIdx + 2];
            dst.data[dstIdx + 3] = this.data[srcIdx + 3];
          }
        }

        dst.pack()
          .pipe(fs.createWriteStream(outputPath))
          .on('finish', () => {
            console.log(`✅ Imagen recortada exitosamente a 9:16 (${targetWidth}x${targetHeight}): ${outputPath}`);
            resolve();
          })
          .on('error', reject);
      })
      .on('error', reject);
  });
}

// Permitir llamadas CLI
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.log('Uso: node crop_to_vertical.js <input.png> <output.png>');
    process.exit(1);
  }
  cropTo916(args[0], args[1]).catch(err => {
    console.error('❌ Error recortando imagen:', err.message);
    process.exit(1);
  });
}

module.exports = { cropTo916 };
