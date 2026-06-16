import fs from 'node:fs';
import path from 'node:path';

const rootDir = path.resolve(__dirname, '..', '..');

function copyFile(source: string, target: string) {
  if (!fs.existsSync(source)) return;

  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

function copyDirectory(source: string, target: string) {
  if (!fs.existsSync(source)) return;

  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(sourcePath, targetPath);
    } else if (entry.isFile()) {
      copyFile(sourcePath, targetPath);
    }
  }
}

copyFile(
  path.join(rootDir, 'scripts', 'Handlers', 'items.txt'),
  path.join(rootDir, 'dist-runtime', 'scripts', 'Handlers', 'items.txt'),
);

copyDirectory(
  path.join(rootDir, 'scripts', 'enumerations'),
  path.join(rootDir, 'dist-runtime', 'scripts', 'enumerations'),
);

copyDirectory(
  path.join(rootDir, 'scripts', 'enumerations'),
  path.join(rootDir, 'dist-server', 'scripts', 'enumerations'),
);
