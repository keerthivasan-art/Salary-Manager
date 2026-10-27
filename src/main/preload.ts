import { contextBridge, ipcRenderer } from 'electron';

const api = {
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    update: (key: string, value: string) => ipcRenderer.invoke('settings:update', key, value),
  },
  salary: {
    findBatch: (month: string, year: number) => ipcRenderer.invoke('salary:findBatch', month, year),
    listBatches: () => ipcRenderer.invoke('salary:listBatches'),
    saveBatch: (month: string, year: number, entries: any[], overwrite: boolean) =>
      ipcRenderer.invoke('salary:saveBatch', month, year, entries, overwrite),
    generateExcel: (month: string, year: number, entries: any[]) =>
      ipcRenderer.invoke('salary:generateExcel', month, year, entries),
    importExcel: () => ipcRenderer.invoke('salary:importExcel'),
  },
  employees: {
    list: () => ipcRenderer.invoke('employees:list'),
    upsert: (employee: any) => ipcRenderer.invoke('employees:upsert', employee),
    delete: (id: number) => ipcRenderer.invoke('employees:delete', id),
  },
  neft: {
    generateWord: (letterSettings: any, entries: any[]) =>
      ipcRenderer.invoke('neft:generateWord', letterSettings, entries),
    generatePdf: (letterSettings: any, entries: any[]) =>
      ipcRenderer.invoke('neft:generatePdf', letterSettings, entries),
  },
  file: {
    openPath: (filePath: string) => ipcRenderer.invoke('file:openPath', filePath),
    openFolder: (kind: 'excel' | 'word' | 'pdf') => ipcRenderer.invoke('file:openFolder', kind),
    print: (filePath: string) => ipcRenderer.invoke('file:print', filePath),
  },
  backup: {
    create: () => ipcRenderer.invoke('backup:create'),
  },
};

contextBridge.exposeInMainWorld('api', api);

export type PreloadApi = typeof api;
