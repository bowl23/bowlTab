import { copyFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
const distDir = resolve(root, 'dist');

await mkdir(distDir, { recursive: true });
await copyFile(resolve(root, 'manifest.json'), resolve(distDir, 'manifest.json'));

console.log('Copied manifest.json to dist');
