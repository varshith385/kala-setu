import { readdirSync } from 'fs';
import { execFileSync } from 'child_process';
import path from 'path';

const testDir = path.resolve('test');
const files = readdirSync(testDir).filter(f => f.endsWith('.ts') || f.endsWith('.js')).sort();

console.log(`Discovered ${files.length} test suites:`);
let passedCount = 0;
let failedCount = 0;

for (const file of files) {
  const fullPath = path.join(testDir, file);
  process.stdout.write(`- Running ${file}... `);
  const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  try {
    const out = execFileSync(npxCmd, ['tsx', fullPath], { encoding: 'utf-8', shell: true, stdio: ['ignore', 'pipe', 'pipe'] });
    console.log('OK');
    passedCount++;
  } catch (err) {
    console.log('FAILED');
    console.error(err.stdout || err.stderr || err.message);
    failedCount++;
  }
}

console.log(`\nResults: ${passedCount} suites passed, ${failedCount} suites failed.`);
if (failedCount > 0) {
  process.exit(1);
}
