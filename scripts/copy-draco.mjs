// Menyalin decoder DRACO dari paket three ke public/draco agar pemuatan .glb terkompresi bekerja offline.
import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = resolve(root, 'node_modules/three/examples/jsm/libs/draco/gltf');
const dest = resolve(root, 'public/draco');

if (existsSync(src)) {
  mkdirSync(dest, { recursive: true });
  cpSync(src, dest, { recursive: true });
  console.log('[copy-draco] DRACO decoder disalin ke public/draco');
} else {
  console.warn('[copy-draco] Decoder DRACO tidak ditemukan, dilewati.');
}
