import { spawn } from 'node:child_process';
import { copyFile, mkdir } from 'node:fs/promises';
import { watch } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const distDir = resolve(root, 'dist');
const manifestSrc = resolve(root, 'manifest.json');
const manifestDest = resolve(distDir, 'manifest.json');
const viteBin = resolve(root, 'node_modules', 'vite', 'bin', 'vite.js');

async function syncManifest() {
  await mkdir(distDir, { recursive: true });
  await copyFile(manifestSrc, manifestDest);
  console.log('[watch] synced manifest.json -> dist/manifest.json');
}

await syncManifest();

const manifestWatcher = watch(manifestSrc, async () => {
  try {
    await syncManifest();
  } catch (error) {
    console.error('[watch] failed to sync manifest:', error);
  }
});

const child = spawn(process.execPath, [viteBin, 'build', '--watch', '--emptyOutDir=false'], {
  stdio: 'inherit'
});

function shutdown(code = 0) {
  manifestWatcher.close();

  if (!child.killed) {
    child.kill('SIGINT');
  }

  process.exit(code);
}

child.on('exit', (code) => {
  manifestWatcher.close();
  process.exit(code ?? 0);
});

child.on('error', (error) => {
  manifestWatcher.close();
  console.error('[watch] failed to start vite watcher:', error);
  process.exit(1);
});

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
