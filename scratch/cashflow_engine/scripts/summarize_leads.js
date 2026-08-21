const fs = require('fs');
const file = 'C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\cashflow_engine\\data\\master_leads_database.json';

const data = JSON.parse(fs.readFileSync(file, 'utf8'));
const niches = {};
data.forEach(d => {
  niches[d.niche] = (niches[d.niche] || 0) + 1;
});
console.log('Total leads:', data.length);
console.log('Niches:', niches);
console.log('Sample Lead 0:', data[0]);
