const { Hyperion } = require('../dist');

async function testPlugAndPlay() {
  console.log('📌 PROBANDO HYPERION PLUG-AND-PLAY (Enfoque de Pestaña + Screenshot + Snapshot)...');

  // 1. Conexión y foco automático en 1 línea
  const h = await Hyperion.attachToTab('facebook.com');
  console.log('✅ Pestaña enfocada activamente en primer plano (Page.bringToFront).');

  // 2. Screenshot helper en 1 línea
  const imgBase64 = await h.captureScreenshot({ format: 'jpeg', quality: 50 });
  console.log(`📸 Captura de pantalla realizada exitosamente (${Math.round(imgBase64.length/1024)} KB base64).`);

  // 3. Snapshot comprimido en 1 línea
  const snapshot = await h.getSnapshot();
  console.log(`📊 Snapshot Comprimido Obtenido: Capa [ ${snapshot.activeLayer} ] (${snapshot.totalElements} elementos).`);

  await h.disconnect();
  console.log('🎉 Prueba Plug-and-Play de Hyperion completada con éxito absoluto!');
}

testPlugAndPlay().catch(console.error);
