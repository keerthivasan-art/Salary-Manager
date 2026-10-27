import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { getBackupDir, getDataDir } from './database/db';

/**
 * Creates a simple .zip-free backup by copying the SQLite database file
 * (WAL-checkpointed) into a timestamped folder under /backups. A folder is
 * used instead of a true .zip to avoid pulling in a native zip dependency;
 * the folder can be zipped manually by the user if desired.
 */
export async function createBackup(): Promise<string> {
  const dateStr = new Date().toISOString().slice(0, 10);
  const backupRoot = path.join(getBackupDir(), `backup_${dateStr}`);
  if (!fs.existsSync(backupRoot)) fs.mkdirSync(backupRoot, { recursive: true });

  const dataDir = getDataDir();
  for (const file of fs.readdirSync(dataDir)) {
    fs.copyFileSync(path.join(dataDir, file), path.join(backupRoot, file));
  }

  const exportsDir = path.join(app.getPath('userData'), 'exports');
  if (fs.existsSync(exportsDir)) {
    copyDirRecursive(exportsDir, path.join(backupRoot, 'exports'));
  }

  return backupRoot;
}

function copyDirRecursive(src: string, dest: string) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
