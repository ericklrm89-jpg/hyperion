const fs = require('fs');
const path = require('path');

const LOCK_FILE = 'C:\\FairDraw\\moneyprinter\\Backend\\obscura_profiles\\default_profile\\SingletonLock';

if (fs.existsSync(LOCK_FILE)) {
  console.log('⚠️ SingletonLock detectado. Eliminando para desbloquear Chrome...');
  try {
    fs.unlinkSync(LOCK_FILE);
    console.log('✅ SingletonLock eliminado con éxito.');
  } catch(e) {
    console.log('❌ Error al eliminar SingletonLock:', e.message);
  }
} else {
  console.log('ℹ️ No se detectó SingletonLock en el perfil.');
}
