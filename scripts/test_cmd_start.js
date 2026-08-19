const { exec } = require('child_process');
const http = require('http');

const chromeExe = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const userData = 'C:\\Users\\erick\\.hyperion\\chrome_profile';
const port = 9222;

const cmd = `start "" "${chromeExe}" --remote-debugging-port=${port} --user-data-dir="${userData}" --profile-directory="Default" --no-first-run --restore-last-session --no-sandbox --test-type`;

console.log('Executing start command with isolated profile...');
exec(cmd, { shell: 'cmd.exe' }, (err) => {
  if (err) console.error('Error starting:', err);
  else console.log('Process launched.');
});

setTimeout(() => {
  http.get(`http://127.0.0.1:${port}/json/version`, res => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => console.log('CDP IS CONNECTED! Browser:', JSON.parse(d).Browser));
  }).on('error', e => console.error('CDP ERR:', e.message));
}, 3000);
