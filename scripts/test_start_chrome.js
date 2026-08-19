const { exec, execSync } = require('child_process');
const http = require('http');

try { execSync('taskkill /f /im chrome.exe 2>nul'); } catch(e){}

const chromeExe = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const userData = 'C:\\Users\\erick\\AppData\\Local\\Google\\Chrome\\User Data';
const fullCmd = `start "" "${chromeExe}" --remote-debugging-port=9222 --user-data-dir="${userData}" --profile-directory="Default" --no-first-run --restore-last-session https://mail.google.com`;

console.log('Dispatching Chrome start...');
exec(fullCmd, { shell: 'cmd.exe' }, (err) => {
  if (err) console.error('Error starting:', err);
});

setTimeout(() => {
  http.get('http://127.0.0.1:9222/json/version', res => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => console.log('CDP SUCCESS! Browser:', JSON.parse(d).Browser));
  }).on('error', e => console.error('CDP Error:', e.message));
}, 3000);
