const fs = require('fs');
const path = require('path');

const src = 'C:/hyperion/scratch/cashflow_engine/scripts/master_continuous_b2b_dispatcher.js';
const dst = 'C:/Users/erick/.gemini/antigravity-ide/scratch/cashflow_engine/scripts/master_continuous_b2b_dispatcher.js';

fs.mkdirSync(path.dirname(dst), { recursive: true });
fs.copyFileSync(src, dst);
console.log('Synchronized dispatcher script to IDE scratch space');
