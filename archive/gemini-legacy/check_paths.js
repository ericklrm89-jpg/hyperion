const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PROFILE_PATH = 'C:\\FairDraw\\moneyprinter\\Backend\\obscura_profiles\\default_profile';

console.log('Chrome existe:', fs.existsSync(CHROME_PATH));
console.log('Perfil existe:', fs.existsSync(PROFILE_PATH));
