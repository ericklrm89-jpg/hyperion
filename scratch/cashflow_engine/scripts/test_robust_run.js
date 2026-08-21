const { dispatchRobustWhatsApp } = require('./whatsapp_robust_engine');

const testLead = {
  id: "EC-PYME-00003",
  company: "ALIMEC S.A. (Alimentos & Pastas)",
  contact_name: "Gerencia de Producción & Planta",
  sector: "Alimentos Procesados, Pastas & Harinas",
  phone: "+593998324464",
  clean_phone: "593998324464",
  location: "Quito, Pichincha",
  flyer: "nanoai_dimar_racks_flyer.jpg"
};

async function main() {
  console.log('Probando motor robusto de WhatsApp...');
  const result = await dispatchRobustWhatsApp(testLead);
  console.log('Resultado:', result);
}

main().catch(console.error);
