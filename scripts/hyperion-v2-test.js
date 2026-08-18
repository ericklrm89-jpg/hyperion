const { HyperionDaemon } = require('../dist/agent/daemon');
const { PortalPopoverDetector } = require('../dist/layers/portal_detector');
const { TokenEconomyCompactor } = require('../dist/layers/token_economy');

async function testHyperionV2() {
  console.log('🚀 PROBANDO HYPERION ENGINE v2.0 (Daemon + Portal Detector + Token Compactor)...');

  const daemon = new HyperionDaemon(9222);
  await daemon.start();

  console.log('📌 Obteniendo conexión de pestaña desde el Daemon (Facebook)...');
  const cxn = await daemon.getActiveTabCxn('facebook.com');

  // 1. Detección de portales y popovers
  console.log('🔍 Escaneando portales y submenús activos en Facebook...');
  const portalDetector = new PortalPopoverDetector(cxn);
  const portalScan = await portalDetector.scan();

  console.log(`🎯 Estado de Portales: Popover Activo: ${portalScan.hasActivePopover} | Contenedor: [ ${portalScan.containerType} ]`);
  if (portalScan.items.length > 0) {
    console.log('📋 Elementos en Submenú/Portal:', portalScan.items.map(i => `"${i.text}" @(${i.x},${i.y})`).join(', '));
  }

  // 2. Compresión de Economía de Tokens
  const rawSnapshotStr = await cxn.evaluate('window.__hyData()');
  const rawSnapshot = JSON.parse(rawSnapshotStr?.value || '{}');

  const compressed = TokenEconomyCompactor.compress(rawSnapshot);

  console.log('\n==========================================================');
  console.log('📉 SNAPSHOT COMPRIMIDO POR TOKEN ECONOMY COMPACTOR');
  console.log('==========================================================\n');
  console.log(compressed.markdown);

  await daemon.stop();
  console.log('✨ Prueba de Hyperion Engine v2.0 completada exitosamente.');
}

testHyperionV2().catch(console.error);
