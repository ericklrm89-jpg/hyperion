const fs = require('fs');

const crmFile = 'C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\cashflow_engine\\data\\agent_crm_database.json';
const consFile = 'C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\cashflow_engine\\data\\consolidated_outreach_database.json';

const crm = JSON.parse(fs.readFileSync(crmFile, 'utf8'));
const cons = JSON.parse(fs.readFileSync(consFile, 'utf8'));

console.log('CRM leads with email:', crm.filter(d => d.email).length);
console.log('Consolidated leads with email:', cons.filter(d => d.email).length);

const allValid = cons.filter(d => d.email && (d.phone || d.clean_phone));
console.log('Total verified leads from consolidated database:', allValid.length);
allValid.forEach((l, i) => {
  console.log(`[#${i + 1}] ${l.id} - ${l.company} | Email: ${l.email} | Phone: ${l.phone || l.clean_phone} | Industry: ${l.industry}`);
});
