const fs = require('fs');
const path = require('path');

function patchFile(filePath, patchFn, description) {
  try {
    if (!fs.existsSync(filePath)) {
      return false;
    }
    const content = fs.readFileSync(filePath, 'utf8');
    const patched = patchFn(content);
    if (patched !== content) {
      fs.writeFileSync(filePath, patched, 'utf8');
      console.log(`[patch-opennext] Patched ${description}`);
      return true;
    }
  } catch (err) {
    console.warn(`[patch-opennext] Failed to patch ${description}:`, err.message);
  }
  return false;
}

const rootDir = path.resolve(__dirname, '..');

// 1. Patch OpenNext Cloudflare CLI index.js to automatically include --dangerouslyUseUnsupportedNextVersion in argv
const cliIndexPath = path.join(rootDir, 'node_modules/@opennextjs/cloudflare/dist/cli/index.js');
patchFile(cliIndexPath, (content) => {
  if (content.includes('// PATCHED_UNSUPPORTED_NEXT')) return content;
  return content.replace(
    'const nodeProcess = process;',
    `const nodeProcess = process;
// PATCHED_UNSUPPORTED_NEXT
if (!nodeProcess.argv.includes('--dangerouslyUseUnsupportedNextVersion')) {
  nodeProcess.argv.push('--dangerouslyUseUnsupportedNextVersion');
}`
  );
}, '@opennextjs/cloudflare cli index.js');

// 2. Patch OpenNext Cloudflare build command options default
const buildCmdPath = path.join(rootDir, 'node_modules/@opennextjs/cloudflare/dist/cli/commands/build.js');
patchFile(buildCmdPath, (content) => {
  return content.replace(
    /(\.option\(\s*['"]dangerouslyUseUnsupportedNextVersion['"][\s\S]*?default:\s*)false/,
    '$1true'
  );
}, '@opennextjs/cloudflare build command options');

// 3. Patch OpenNext AWS helper checkNextVersionSupport
const awsHelperPath = path.join(rootDir, 'node_modules/@opennextjs/aws/dist/build/helper.js');
patchFile(awsHelperPath, (content) => {
  if (content.includes('allowUnsupportedNextVersion = true; // PATCHED')) return content;
  return content.replace(
    /function checkNextVersionSupport\s*\([\s\S]*?\)\s*\{/,
    (match) => `${match}\n    allowUnsupportedNextVersion = true; // PATCHED`
  );
}, '@opennextjs/aws helper checkNextVersionSupport');

console.log('[patch-opennext] Patch execution completed.');
