import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import {
  initDatabase,
  getSettings,
  updateSetting,
  findBatch,
  getBatchWithEntries,
  listBatches,
  saveBatch,
  listEmployees,
  upsertEmployee,
  deleteEmployee,
  recordLetterDocument,
  getExportDir,
} from './database/db';
import { generateSalaryExcel } from './excel/generateSalaryExcel';
import { parseAndValidateSalaryExcel } from './excel/importSalaryExcel';
import { generateNeftLetterDocx } from './word/generateNeftLetter';
import { generateNeftLetterPdf } from './pdf/generateNeftPdf';
import { createBackup } from './backup';
import type { NeftLetterSettings, SalaryEntryInput } from '@shared/types';

const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    title: 'Sri Akshata Salary Manager',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
  }
}

app.whenReady().then(async () => {
  await initDatabase();
  registerIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

function registerIpcHandlers() {
  // ---------- Settings ----------
  ipcMain.handle('settings:get', () => getSettings());
  ipcMain.handle('settings:update', (_e, key: string, value: string) => {
    updateSetting(key as any, value);
    return getSettings();
  });

  // ---------- Salary batches ----------
  ipcMain.handle('salary:findBatch', (_e, month: string, year: number) =>
    getBatchWithEntries(month, year)
  );

  ipcMain.handle('salary:listBatches', () => listBatches());

  ipcMain.handle(
    'salary:saveBatch',
    (_e, month: string, year: number, entries: SalaryEntryInput[], overwrite: boolean) => {
      try {
        const batch = saveBatch(month, year, entries, overwrite);
        return { success: true, batch };
      } catch (err: any) {
        if (err.message?.includes('already exists')) {
          return { success: false, code: 'DUPLICATE', error: err.message };
        }
        return { success: false, code: 'ERROR', error: err.message ?? 'Failed to save salary data' };
      }
    }
  );

  ipcMain.handle(
    'salary:generateExcel',
    async (_e, month: string, year: number, entries: SalaryEntryInput[]) => {
      try {
        const settings = getSettings();
        const filePath = await generateSalaryExcel(month, year, entries, settings);
        return { success: true, filePath };
      } catch (err: any) {
        return { success: false, error: err.message ?? 'Failed to generate Excel file' };
      }
    }
  );

  ipcMain.handle('salary:importExcel', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      title: 'Import Salary Excel',
      filters: [{ name: 'Excel Files', extensions: ['xlsx'] }],
      properties: ['openFile'],
    });
    if (result.canceled || result.filePaths.length === 0) {
      return { canceled: true };
    }
    try {
      const validation = await parseAndValidateSalaryExcel(result.filePaths[0]);
      return { canceled: false, filePath: result.filePaths[0], validation };
    } catch (err: any) {
      return { canceled: false, error: err.message ?? 'Failed to read Excel file' };
    }
  });

  // ---------- Employees ----------
  ipcMain.handle('employees:list', () => listEmployees());
  ipcMain.handle('employees:upsert', (_e, employee: any) => upsertEmployee(employee));
  ipcMain.handle('employees:delete', (_e, id: number) => deleteEmployee(id));

  // ---------- NEFT letter ----------
  ipcMain.handle(
    'neft:generateWord',
    async (_e, letterSettings: NeftLetterSettings, entries: SalaryEntryInput[]) => {
      try {
        const appSettings = getSettings();
        const filePath = await generateNeftLetterDocx(letterSettings, entries, appSettings);
        const total = entries.reduce((s, e) => s + (Number(e.amount) || 0), 0);
        const batch = findBatch(letterSettings.month, letterSettings.year);
        recordLetterDocument({
          batchId: batch?.id ?? null,
          bankName: letterSettings.bankName,
          branch: letterSettings.branch,
          chgNo: letterSettings.chgNo,
          letterDate: letterSettings.letterDate,
          month: letterSettings.month,
          year: letterSettings.year,
          totalAmount: total,
          wordPath: filePath,
        });
        return { success: true, filePath };
      } catch (err: any) {
        return { success: false, error: err.message ?? 'Failed to generate Word letter' };
      }
    }
  );

  ipcMain.handle(
    'neft:generatePdf',
    async (_e, letterSettings: NeftLetterSettings, entries: SalaryEntryInput[]) => {
      try {
        const appSettings = getSettings();
        const filePath = await generateNeftLetterPdf(letterSettings, entries, appSettings);
        const total = entries.reduce((s, e) => s + (Number(e.amount) || 0), 0);
        const batch = findBatch(letterSettings.month, letterSettings.year);
        recordLetterDocument({
          batchId: batch?.id ?? null,
          bankName: letterSettings.bankName,
          branch: letterSettings.branch,
          chgNo: letterSettings.chgNo,
          letterDate: letterSettings.letterDate,
          month: letterSettings.month,
          year: letterSettings.year,
          totalAmount: total,
          pdfPath: filePath,
        });
        return { success: true, filePath };
      } catch (err: any) {
        return { success: false, error: err.message ?? 'Failed to generate PDF letter' };
      }
    }
  );

  ipcMain.handle('file:openPath', async (_e, filePath: string) => {
    const err = await shell.openPath(filePath);
    return { success: !err, error: err || undefined };
  });

  ipcMain.handle('file:openFolder', async (_e, kind: 'excel' | 'word' | 'pdf') => {
    const dir = getExportDir(kind);
    await shell.openPath(dir);
    return { success: true };
  });

  ipcMain.handle('file:print', async (_e, filePath: string) => {
    // Opens the OS "print" flow for the given file via the default handler.
    try {
      if (!fs.existsSync(filePath)) {
        return { success: false, error: 'File not found' };
      }
      await shell.openPath(filePath);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('backup:create', async () => {
    try {
      const backupPath = await createBackup();
      return { success: true, filePath: backupPath };
    } catch (err: any) {
      return { success: false, error: err.message ?? 'Backup failed' };
    }
  });
}
