/**
 * HYPERION MASTER CONTROL CENTER RUNTIME BRIDGE
 * Executes the compiled modular MultiSessionOrchestrator with full CLI interaction.
 */
const path = require('path');

try {
  const { MultiSessionOrchestrator } = require('../dist/session/MultiSessionOrchestrator');
  const orchestrator = new MultiSessionOrchestrator();
  orchestrator.start().catch(err => {
    console.error('❌ Error en ejecución del Orquestador Maestro:', err);
    console.log('\nPresiona Enter para salir...');
    const rl = require('readline').createInterface({ input: process.stdin, output: process.stdout });
    rl.question('', () => process.exit(1));
  });
} catch (err) {
  console.error('❌ Error al cargar módulos de Hyperion (requiere compilar con npm run build):', err);
  console.log('\nPresiona Enter para salir...');
  const rl = require('readline').createInterface({ input: process.stdin, output: process.stdout });
  rl.question('', () => process.exit(1));
}
