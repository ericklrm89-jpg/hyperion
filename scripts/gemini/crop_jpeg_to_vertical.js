const fs = require('fs');
const jpeg = require('jpeg-js');

function cropJpegTo916(inputPath, outputPath) {
  try {
    const rawData = fs.readFileSync(inputPath);
    const decoded = jpeg.decode(rawData, { useTArray: true });

    const srcWidth = decoded.width;
    const srcHeight = decoded.height;

    // Calcular dimensiones de destino para 9:16
    const targetHeight = srcHeight;
    const targetWidth = Math.round(targetHeight * (9 / 16));

    if (targetWidth > srcWidth) {
      throw new Error(`La imagen de entrada es demasiado angosta (${srcWidth}x${srcHeight}) para recortar a 9:16 vertical`);
    }

    const startX = Math.floor((srcWidth - targetWidth) / 2);
    
    // Crear buffer para la imagen recortada
    const dstBuffer = Buffer.alloc(targetWidth * targetHeight * 4);

    for (let y = 0; y < targetHeight; y++) {
      for (let x = 0; x < targetWidth; x++) {
        const srcIdx = ((y * srcWidth) + (startX + x)) * 4;
        const dstIdx = ((y * targetWidth) + x) * 4;

        dstBuffer[dstIdx] = decoded.data[srcIdx];       // R
        dstBuffer[dstIdx + 1] = decoded.data[srcIdx + 1]; // G
        dstBuffer[dstIdx + 2] = decoded.data[srcIdx + 2]; // B
        dstBuffer[dstIdx + 3] = decoded.data[srcIdx + 3]; // A
      }
    }

    const rawCrop = {
      data: dstBuffer,
      width: targetWidth,
      height: targetHeight
    };

    const encoded = jpeg.encode(rawCrop, 90); // Calidad 90
    fs.writeFileSync(outputPath, encoded.data);
    console.log(`✅ JPEG recortado exitosamente a 9:16 vertical (${targetWidth}x${targetHeight}): ${outputPath}`);
  } catch (e) {
    console.error('❌ Error recortando JPEG:', e.message);
    throw e;
  }
}

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.log('Uso: node crop_jpeg_to_vertical.js <input.png/jpg> <output.jpg>');
    process.exit(1);
  }
  try {
    cropJpegTo916(args[0], args[1]);
  } catch(e) {
    process.exit(1);
  }
}

module.exports = { cropJpegTo916 };
