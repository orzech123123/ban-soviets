const { spawn } = require('child_process');
const child = spawn('ls', );
// use child.stdout.setEncoding('utf8'); if you want text chunks
child.stdout.on('data', (chunk) => {
  // data from the standard output is here as buffers
});
// since these are streams, you can pipe them elsewhere
child.stderr.pipe(process.stdout);
child.on('close', (code) => {
  console.log(`child process exited with code ${code}`);
});