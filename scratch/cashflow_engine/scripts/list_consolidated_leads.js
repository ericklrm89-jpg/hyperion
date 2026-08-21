const fs = require('fs');
const file = 'C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\cashflow_engine\\data\\consolidated_outreach_database.json';
const data = JSON.parse(fs.readFileSync(file, 'utf8'));

console.log('Total companies in consolidated_outreach_database:', data.length);
data.forEach((c, idx) => {
  console.log(`[${idx + 1}] ID: ${c.id} | Company: ${c.company} | Email: ${c.email} | Phone: ${c.phone} | Status: ${c.status}`);
});
