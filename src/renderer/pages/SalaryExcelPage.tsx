import React, { useEffect, useState } from 'react';
import { FilePlus2, FileSpreadsheet, FolderOpen, Plus, Trash2, Upload, X } from 'lucide-react';
import { useSalaryStore } from '../store/salaryStore';
import SalaryTable from '../components/SalaryTable';
import { MONTHS } from '@shared/types';
import { formatIndianCurrency } from '@shared/numberToWords';
import type { ImportValidationResult } from '@shared/types';

export default function SalaryExcelPage() {
  const {
    month, year, entries, loadedBatch,
    setMonth, setYear, addRow, updateRow, deleteRow, clearAll,
    loadFromBatch, total,
  } = useSalaryStore();

  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState(false);
  const [importResult, setImportResult] = useState<{
    filePath: string;
    validation: ImportValidationResult;
  } | null>(null);

  useEffect(() => {
    handleLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year]);

  async function handleLoad() {
    const batch = await window.api.salary.findBatch(month, year);
    loadFromBatch(batch);
  }

  async function saveEntries(overwrite: boolean) {
    setBusy('save');
    setMessage(null);
    const result = await window.api.salary.saveBatch(month, year, entries, overwrite);
    setBusy(null);
    if (!result.success) {
      if (result.code === 'DUPLICATE') {
        setDuplicateWarning(true);
      } else {
        setMessage({ type: 'error', text: result.error ?? 'Failed to save salary data.' });
      }
      return false;
    }
    loadFromBatch(result.batch);
    return true;
  }

  async function handleGenerateExcel() {
    if (entries.length === 0) {
      setMessage({ type: 'error', text: 'Add at least one salary entry before generating the Excel file.' });
      return;
    }
    const saved = await saveEntries(!!loadedBatch);
    if (!saved && !loadedBatch) return; // wait for duplicate resolution
    setBusy('excel');
    const result = await window.api.salary.generateExcel(month, year, entries);
    setBusy(null);
    if (result.success) {
      setMessage({ type: 'success', text: `Excel file generated: ${result.filePath}` });
    } else {
      setMessage({ type: 'error', text: result.error ?? 'Failed to generate Excel file.' });
    }
  }

  async function handleImport() {
    const result = await window.api.salary.importExcel();
    if (result.canceled) return;
    if (result.error) {
      setMessage({ type: 'error', text: result.error });
      return;
    }
    setImportResult({ filePath: result.filePath, validation: result.validation });
  }

  function confirmImport() {
    if (!importResult) return;
    const rows = importResult.validation.valid.map((r) => r.data!);
    useSalaryStore.getState().setEntries(rows);
    setImportResult(null);
    setMessage({ type: 'success', text: `Imported ${rows.length} valid row(s). Review and click Generate Excel to save.` });
  }

  async function openFolder() {
    await window.api.file.openFolder('excel');
  }

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div className="bg-white rounded-card shadow-soft border border-gray-100 p-5">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Salary Excel Sheet</h2>

        <div className="flex flex-wrap items-end gap-4 mb-5">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Salary Month</label>
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-pink-400 outline-none"
            >
              {MONTHS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Salary Year</label>
            <select
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value, 10))}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-pink-400 outline-none"
            >
              {yearOptions().map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <div className="flex-1" />

          <ActionButton icon={<Upload size={15} />} label="Import Excel" onClick={handleImport} variant="ghost" />
          <ActionButton icon={<FileSpreadsheet size={15} />} label="Preview" onClick={() => setShowPreview(true)} variant="ghost" disabled={entries.length === 0} />
          <ActionButton icon={<FolderOpen size={15} />} label="Open Folder" onClick={openFolder} variant="ghost" />
          <ActionButton
            icon={<FilePlus2 size={15} />}
            label={busy === 'excel' ? 'Generating...' : 'Generate Excel'}
            onClick={handleGenerateExcel}
            variant="primary"
            disabled={busy !== null}
          />
        </div>

        {message && (
          <div
            className={`mb-4 text-sm rounded-lg px-3 py-2 border ${
              message.type === 'success'
                ? 'bg-green-50 text-green-700 border-green-100'
                : 'bg-red-50 text-red-600 border-red-100'
            }`}
          >
            {message.text}
          </div>
        )}

        {entries.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 mb-4">No salary data available for {month} {year}.</p>
            <ActionButton icon={<Plus size={15} />} label="Add Salary Data" onClick={addRow} variant="primary" />
          </div>
        ) : (
          <>
            <SalaryTable entries={entries} onUpdateRow={updateRow} onDeleteRow={deleteRow} />
            <div className="flex gap-3 mt-4">
              <ActionButton icon={<Plus size={15} />} label="Add Row" onClick={addRow} variant="ghost" />
              <ActionButton icon={<Trash2 size={15} />} label="Clear All" onClick={clearAll} variant="danger" />
            </div>
          </>
        )}
      </div>

      {duplicateWarning && (
        <Modal onClose={() => setDuplicateWarning(false)} title="Salary Data Already Exists">
          <p className="text-sm text-gray-600 mb-4">
            Salary data for <span className="font-medium">{month} {year}</span> already exists.
          </p>
          <div className="flex gap-3">
            <ActionButton
              label="Open Existing"
              variant="ghost"
              onClick={async () => {
                setDuplicateWarning(false);
                await handleLoad();
              }}
            />
            <ActionButton
              label="Create New Anyway"
              variant="primary"
              onClick={async () => {
                setDuplicateWarning(false);
                await saveEntries(true);
              }}
            />
            <ActionButton label="Cancel" variant="ghost" onClick={() => setDuplicateWarning(false)} />
          </div>
        </Modal>
      )}

      {importResult && (
        <Modal onClose={() => setImportResult(null)} title="Import Preview" wide>
          <ImportPreview result={importResult.validation} />
          <div className="flex gap-3 mt-5">
            <ActionButton
              label={`Import ${importResult.validation.valid.length} Valid Row(s)`}
              variant="primary"
              onClick={confirmImport}
              disabled={importResult.validation.valid.length === 0}
            />
            <ActionButton label="Cancel" variant="ghost" onClick={() => setImportResult(null)} />
          </div>
        </Modal>
      )}

      {showPreview && (
        <Modal onClose={() => setShowPreview(false)} title={`Preview — Salary List of ${month} ${year}`} wide>
          <ExcelPreview month={month} year={year} entries={entries} />
          <div className="flex gap-3 mt-5">
            <ActionButton icon={<FilePlus2 size={15} />} label="Generate Excel" variant="primary" onClick={handleGenerateExcel} />
            <ActionButton label="Close Preview" variant="ghost" onClick={() => setShowPreview(false)} />
          </div>
        </Modal>
      )}
    </div>
  );
}

function yearOptions(): number[] {
  const current = new Date().getFullYear();
  const years: number[] = [];
  for (let y = current - 2; y <= current + 3; y++) years.push(y);
  return years;
}

function ExcelPreview({
  month, year, entries,
}: { month: string; year: number; entries: any[] }) {
  const total = entries.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  return (
    <div className="border border-gray-200 rounded-xl p-6 bg-white font-serif">
      <div className="text-center mb-1 font-semibold">SRI AKSHATA SHOPPING CENTRE - ANNUR</div>
      <div className="text-center mb-4 font-semibold">SALARY LIST OF {month.toUpperCase()}</div>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            {['SNO', 'DATA', 'A\\C NO', 'A\\C NAME', 'IFSC CODE', 'AMOUNT', 'BANK'].map((h) => (
              <th key={h} className="border border-gray-400 px-2 py-1 text-xs">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {entries.map((e, i) => (
            <tr key={i}>
              <td className="border border-gray-400 px-2 py-1 text-center">{e.sno}</td>
              <td className="border border-gray-400 px-2 py-1">{e.data}</td>
              <td className="border border-gray-400 px-2 py-1">{e.accountNumber}</td>
              <td className="border border-gray-400 px-2 py-1">{e.accountName}</td>
              <td className="border border-gray-400 px-2 py-1">{e.ifscCode}</td>
              <td className="border border-gray-400 px-2 py-1 text-right">{Number(e.amount).toFixed(2)}</td>
              <td className="border border-gray-400 px-2 py-1">{e.bankName}</td>
            </tr>
          ))}
          <tr>
            <td colSpan={4} className="border border-gray-400"></td>
            <td className="border border-gray-400 px-2 py-1 font-semibold text-right">TOTAL</td>
            <td className="border border-gray-400 px-2 py-1 font-semibold text-right">{total.toFixed(2)}</td>
            <td className="border border-gray-400"></td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function ImportPreview({ result }: { result: ImportValidationResult }) {
  return (
    <div className="space-y-4 max-h-[60vh] overflow-y-auto">
      <div className="text-sm text-gray-600">
        <span className="text-green-600 font-medium">{result.valid.length} valid</span>
        {'  •  '}
        <span className="text-red-600 font-medium">{result.invalid.length} invalid</span>
        {'  •  '}
        <span className="text-amber-600 font-medium">{result.duplicates.length} duplicate</span>
      </div>
      {[...result.invalid, ...result.duplicates].length > 0 && (
        <div className="border border-red-100 bg-red-50 rounded-lg p-3">
          <div className="text-xs font-semibold text-red-700 mb-2">Rows requiring attention</div>
          <ul className="text-xs text-red-600 space-y-1">
            {[...result.invalid, ...result.duplicates].map((r, i) => (
              <li key={i}>
                Row {r.rowNumber}: {r.errors.join(', ')}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-gray-50">
            <tr>
              {['SNO', 'DATA', 'A\\C NO', 'A\\C NAME', 'IFSC', 'AMOUNT', 'BANK'].map((h) => (
                <th key={h} className="px-2 py-1.5 text-left font-medium text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.valid.map((r, i) => (
              <tr key={i} className="border-t border-gray-100">
                <td className="px-2 py-1">{r.data?.sno}</td>
                <td className="px-2 py-1">{r.data?.data}</td>
                <td className="px-2 py-1">{r.data?.accountNumber}</td>
                <td className="px-2 py-1">{r.data?.accountName}</td>
                <td className="px-2 py-1">{r.data?.ifscCode}</td>
                <td className="px-2 py-1 text-right">{r.data?.amount.toFixed(2)}</td>
                <td className="px-2 py-1">{r.data?.bankName}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Modal({
  title, children, onClose, wide,
}: { title: string; children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-card shadow-card p-6 w-full ${wide ? 'max-w-4xl' : 'max-w-md'}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-800">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ActionButton({
  icon, label, onClick, variant = 'ghost', disabled,
}: {
  icon?: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'ghost' | 'danger';
  disabled?: boolean;
}) {
  const base = 'inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed';
  const variants = {
    primary: 'bg-pink-500 hover:bg-pink-600 text-white shadow-soft',
    ghost: 'bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200',
    danger: 'bg-red-50 hover:bg-red-100 text-red-600 border border-red-100',
  };
  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${variants[variant]}`}>
      {icon}
      {label}
    </button>
  );
}
