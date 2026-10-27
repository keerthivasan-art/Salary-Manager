import { create } from 'zustand';
import type { SalaryEntryInput, SalaryBatchWithEntries, AppSettings } from '@shared/types';

interface SalaryState {
  month: string;
  year: number;
  entries: SalaryEntryInput[];
  loadedBatch: SalaryBatchWithEntries | null;
  settings: AppSettings | null;

  setMonth: (m: string) => void;
  setYear: (y: number) => void;
  setEntries: (entries: SalaryEntryInput[]) => void;
  addRow: () => void;
  updateRow: (index: number, patch: Partial<SalaryEntryInput>) => void;
  deleteRow: (index: number) => void;
  clearAll: () => void;
  loadFromBatch: (batch: SalaryBatchWithEntries | null) => void;
  loadSettings: () => Promise<void>;
  total: () => number;
}

function blankRow(sno: number): SalaryEntryInput {
  return {
    sno,
    data: new Date().toLocaleDateString('en-GB'), // DD/MM/YYYY, matches reference "DATA" usage (payment date)
    accountNumber: '',
    accountName: '',
    ifscCode: '',
    amount: 0,
    bankName: '',
  };
}

export const useSalaryStore = create<SalaryState>((set, get) => ({
  month: new Date().toLocaleString('en-US', { month: 'long' }),
  year: new Date().getFullYear(),
  entries: [],
  loadedBatch: null,
  settings: null,

  setMonth: (m) => set({ month: m }),
  setYear: (y) => set({ year: y }),
  setEntries: (entries) => set({ entries }),

  addRow: () =>
    set((s) => ({ entries: [...s.entries, blankRow(s.entries.length + 1)] })),

  updateRow: (index, patch) =>
    set((s) => ({
      entries: s.entries.map((e, i) => (i === index ? { ...e, ...patch } : e)),
    })),

  deleteRow: (index) =>
    set((s) => ({
      entries: s.entries
        .filter((_, i) => i !== index)
        .map((e, i) => ({ ...e, sno: i + 1 })),
    })),

  clearAll: () => set({ entries: [] }),

  loadFromBatch: (batch) =>
    set({
      loadedBatch: batch,
      entries: batch
        ? batch.entries.map((e) => ({
            sno: e.sno,
            data: e.data,
            accountNumber: e.accountNumber,
            accountName: e.accountName,
            ifscCode: e.ifscCode,
            amount: e.amount,
            bankName: e.bankName,
          }))
        : [],
    }),

  loadSettings: async () => {
    const settings = await window.api.settings.get();
    set({ settings });
  },

  total: () => get().entries.reduce((sum, e) => sum + (Number(e.amount) || 0), 0),
}));
