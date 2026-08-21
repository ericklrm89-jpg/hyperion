const fs = require('fs');
const file = 'C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\cashflow_engine\\data\\agent_crm_database.json';
const data = JSON.parse(fs.readFileSync(file, 'utf8'));

const prospeccion = data.filter(d => d.stage === 'PROSPECCION' && d.email && d.clean_phone);
console.log('Total PROSPECCION leads with email and clean_phone:', prospeccion.length);

prospeccion.slice(0, 10).forEach((l, i) => {
  console.log(`[${i + 1}] ID: ${l.id} | Empresa: ${l.empresa || l.company} | Email: ${l.email} | Phone: ${l.clean_phone} | Ciudad: ${l.ciudad || l.location} | Industria: ${l.industry || l.sector}`);
});
