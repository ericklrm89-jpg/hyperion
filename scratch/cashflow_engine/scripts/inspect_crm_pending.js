const fs = require('fs');
const file = 'C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\cashflow_engine\\data\\agent_crm_database.json';
const data = JSON.parse(fs.readFileSync(file, 'utf8'));

console.log('Total records in agent_crm_database:', data.length);
const stages = {};
data.forEach(d => {
  stages[d.stage || d.status] = (stages[d.stage || d.status] || 0) + 1;
});
console.log('Stages breakdown:', stages);

const pending = data.filter(d => !d.status || d.status.includes('PENDIENTE') || d.stage === 'PROSPECCION' || d.stage === 'CALIFICADO');
console.log('Total pending leads to contact:', pending.length);
console.log('Sample 3 pending leads:', JSON.stringify(pending.slice(0, 3), null, 2));
