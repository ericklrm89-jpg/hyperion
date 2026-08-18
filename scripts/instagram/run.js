const { publishInstagramReel } = require('./publish');

const VIDEO_PATH = 'C:\\Users\\erick\\Downloads\\fairdraw_pt_instagram.mp4';
const CAPTION = 'Sorteios 100% transparentes com IA! 🎉🛡️\n\nO FairDraw usa Inteligência Artificial para garantir que cada sorteio seja justo e auditável.\n\n🌐 fairdrawapp.com\n#FairDraw #Sorteio #IA #Transparencia #Giveaway #Brasil #Fair #InteligenciaArtificial';

console.log('🎬 Iniciando publicador de Instagram desde la skill...');
publishInstagramReel(VIDEO_PATH, CAPTION)
  .then(res => {
    console.log('✅ Publicación de Reel completada exitosamente:', res);
  })
  .catch(err => {
    console.error('❌ Error al publicar en Instagram:', err);
  });
