// Read the password through stdin only. Never pass it as a CLI argument or log it.
import { randomBytes } from 'node:crypto';
import { hashPassword } from './admin-server.mjs';
let input = '';
if (process.stdin.isTTY) {
  process.stdin.setRawMode(true);
  process.stdout.write('READY\n');
  input = await new Promise(resolve => process.stdin.on('data', chunk => {
    input += chunk.toString();
    if (input.includes('\n')) { process.stdin.pause(); resolve(input.trim()); }
  }));
} else {
  for await (const chunk of process.stdin) input += chunk;
}
let password;
try { ({ password } = JSON.parse(input)); } catch { throw new Error('Invalid input.'); }
if (typeof password !== 'string' || password.length < 12) throw new Error('A password of at least 12 characters is required.');
process.stdout.write(JSON.stringify({ ADMIN_USERNAME: 'admin', ADMIN_PASSWORD_HASH: await hashPassword(password), ADMIN_SESSION_SECRET: randomBytes(32).toString('hex'), ADMIN_ORIGIN: 'https://codeflow-studios-production.up.railway.app' }));
