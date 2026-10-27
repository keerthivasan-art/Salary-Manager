import React, { useEffect, useState } from 'react';
import { FileDown, FileText, Printer, X } from 'lucide-react';
import { useSalaryStore } from '../store/salaryStore';
import { MONTHS } from '@shared/types';
import { amountToIndianWords, amountToIndianWordsCore, formatIndianCurrency } from '@shared/numberToWords';
import type { NeftLetterSettings } from '@shared/types';

function todayDDMMYYYY(): string {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

export default function BankNeftLetterPage() {
  const { month, year, entries, setMonth, setYear, loadFromBatch, settings, loadSettings } = useSalaryStore();

  const [bankName, setBankName] = useState('HDFC Bank Limited');
  const [branch, setBranch] = useState('Annur');
  const [chgNo, setChgNo] = useState('');
  const [letterDate, setLetterDate] = useState(todayDDMMYYYY());
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [lastGeneratedPath, setLastGeneratedPath] = useState<string | null>(null);

  useEffect(() => {
    if (!settings) loadSettings();
  }, []);

  useEffect(() => {
    if (settings) {
      setBankName(settings.defaultBankName);
      setBranch(settings.defaultBranch);
    }
  }, [settings]);

  useEffect(() => {
    (async () => {
      const batch = await window.api.salary.findBatch(month, year);
      loadFromBatch(batch);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year]);

  const total = entries.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const totalWords = amountToIndianWords(total);

  function buildSettings(): NeftLetterSettings {
    return { bankName, branch, chgNo, letterDate, month, year };
  }

  async function handleGenerateWord() {
    if (entries.length === 0) {
      setMessage({ type: 'error', text: 'Create or load salary data first to generate the NEFT letter.' });
      return;
    }
    setBusy('word');
    const result = await window.api.neft.generateWord(buildSettings(), entries);
    setBusy(null);
    if (result.success) {
      setLastGeneratedPath(result.filePath);
      setMessage({ type: 'success', text: `Word letter generated: ${result.filePath}` });
    } else {
      setMessage({ type: 'error', text: result.error ?? 'Failed to generate Word letter.' });
    }
  }

  async function handleGeneratePdf() {
    if (entries.length === 0) {
      setMessage({ type: 'error', text: 'Create or load salary data first to generate the NEFT letter.' });
      return;
    }
    setBusy('pdf');
    const result = await window.api.neft.generatePdf(buildSettings(), entries);
    setBusy(null);
    if (result.success) {
      setLastGeneratedPath(result.filePath);
      setMessage({ type: 'success', text: `PDF letter generated: ${result.filePath}` });
    } else {
      setMessage({ type: 'error', text: result.error ?? 'Failed to generate PDF letter.' });
    }
  }

  async function handlePrint() {
    if (!lastGeneratedPath) {
      setMessage({ type: 'error', text: 'Generate the Word or PDF letter first, then print it.' });
      return;
    }
    await window.api.file.print(lastGeneratedPath);
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="bg-white rounded-card shadow-soft border border-gray-100 p-5">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Bank NEFT Letter</h2>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-5">
          <Field label="Bank Name">
            <input value={bankName} onChange={(e) => setBankName(e.target.value)} className="input" />
          </Field>
          <Field label="Branch">
            <input value={branch} onChange={(e) => setBranch(e.target.value)} className="input" />
          </Field>
          <Field label="Chg No.">
            <input value={chgNo} onChange={(e) => setChgNo(e.target.value)} placeholder="e.g. 001039" className="input" />
          </Field>
          <Field label="Letter Date">
            <input
              type="text"
              value={letterDate}
              onChange={(e) => setLetterDate(e.target.value)}
              placeholder="DD/MM/YYYY"
              className="input"
            />
          </Field>
          <Field label="Salary Month">
            <select value={month} onChange={(e) => setMonth(e.target.value)} className="input">
              {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </Field>
          <Field label="Salary Year">
            <select value={year} onChange={(e) => setYear(parseInt(e.target.value, 10))} className="input">
              {yearOptions().map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </Field>
        </div>

        {entries.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            Create or load salary data first to generate the NEFT letter.
          </div>
        ) : (
          <div className="bg-pink-50/60 border border-pink-100 rounded-xl p-4 mb-5 space-y-1">
            <div className="text-sm text-gray-600">{entries.length} employee(s) loaded from {month} {year} salary data.</div>
            <div className="text-sm font-semibold text-gray-800">
              Total amount: {formatIndianCurrency(total)}
            </div>
            <div className="text-sm text-gray-600">Amount in words: {totalWords}</div>
          </div>
        )}

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

        <div className="flex flex-wrap gap-3">
          <Btn label="Preview" onClick={() => setShowPreview(true)} disabled={entries.length === 0} />
          <Btn label={busy === 'word' ? 'Generating...' : 'Generate Word'} icon={<FileText size={15} />} onClick={handleGenerateWord} primary disabled={busy !== null} />
          <Btn label={busy === 'pdf' ? 'Generating...' : 'Generate PDF'} icon={<FileDown size={15} />} onClick={handleGeneratePdf} primary disabled={busy !== null} />
          <Btn label="Print Letter" icon={<Printer size={15} />} onClick={handlePrint} />
        </div>
      </div>

      {showPreview && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-card shadow-card p-6 w-full max-w-3xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-800">NEFT Letter Preview</h3>
              <button onClick={() => setShowPreview(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <LetterPreview
              bankName={bankName}
              branch={branch}
              chgNo={chgNo}
              letterDate={letterDate}
              entries={entries}
              total={total}
              totalWordsCore={amountToIndianWordsCore(total)}
            />
            <div className="flex gap-3 mt-5">
              <Btn label="Generate Word" icon={<FileText size={15} />} onClick={handleGenerateWord} primary />
              <Btn label="Close Preview" onClick={() => setShowPreview(false)} />
            </div>
          </div>
        </div>
      )}

      <style>{`.input { padding: 0.5rem 0.75rem; border-radius: 0.5rem; border: 1px solid #e5e7eb; font-size: 0.875rem; outline: none; width: 100%; } .input:focus { border-color: #f76089; box-shadow: 0 0 0 3px rgba(247,96,137,0.12); }`}</style>
    </div>
  );
}

function yearOptions(): number[] {
  const current = new Date().getFullYear();
  const years: number[] = [];
  for (let y = current - 2; y <= current + 3; y++) years.push(y);
  return years;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}

function Btn({
  label, icon, onClick, primary, disabled,
}: { label: string; icon?: React.ReactNode; onClick: () => void; primary?: boolean; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${
        primary
          ? 'bg-pink-500 hover:bg-pink-600 text-white shadow-soft'
          : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function LetterPreview({
  bankName, branch, chgNo, letterDate, entries, total, totalWordsCore,
}: {
  bankName: string; branch: string; chgNo: string; letterDate: string;
  entries: any[]; total: number; totalWordsCore: string;
}) {
  return (
    <div className="border border-gray-200 rounded-xl p-8 bg-white text-sm font-serif leading-relaxed">
      <p className="font-semibold">To</p>
      <p>The Manager</p>
      <p>{bankName}</p>
      <p className="mb-4">{branch}</p>
      <p className="font-semibold mb-4">Respected Sir,</p>
      <p className="mb-4">
        We request you to kindly do the below listed bulk NEFT via Chg No. {chgNo || '__________'} dated{' '}
        {letterDate} for an amount of Rs. {Math.round(total)} (in words: {totalWordsCore} only).
      </p>
      <table className="w-full border-collapse mb-4">
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
            <td className="border border-gray-400 px-2 py-1 font-semibold">TOTAL</td>
            <td className="border border-gray-400 px-2 py-1 font-semibold text-right">{total.toFixed(2)}</td>
            <td className="border border-gray-400"></td>
          </tr>
        </tbody>
      </table>
      <p className="font-semibold mb-4">Total amount : {formatIndianCurrency(total)}</p>
      <p className="mb-4">With regards</p>
      <p>For</p>
    </div>
  );
}
