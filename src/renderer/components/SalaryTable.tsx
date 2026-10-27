import React, { useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import type { SalaryEntryInput } from '@shared/types';
import { formatIndianCurrency } from '@shared/numberToWords';

interface SalaryTableProps {
  entries: SalaryEntryInput[];
  onUpdateRow: (index: number, patch: Partial<SalaryEntryInput>) => void;
  onDeleteRow: (index: number) => void;
  editable?: boolean;
}

export default function SalaryTable({
  entries,
  onUpdateRow,
  onDeleteRow,
  editable = true,
}: SalaryTableProps) {
  const [search, setSearch] = useState('');

  const filteredIndices = useMemo(() => {
    if (!search.trim()) return entries.map((_, i) => i);
    const q = search.trim().toLowerCase();
    return entries
      .map((e, i) => ({ e, i }))
      .filter(
        ({ e }) =>
          e.accountName.toLowerCase().includes(q) ||
          e.accountNumber.toLowerCase().includes(q) ||
          e.bankName.toLowerCase().includes(q) ||
          e.ifscCode.toLowerCase().includes(q)
      )
      .map(({ i }) => i);
  }, [entries, search]);

  const total = entries.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  return (
    <div>
      {editable && (
        <div className="mb-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, account no, bank, or IFSC..."
            className="w-full max-w-sm px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-pink-400 focus:ring-2 focus:ring-pink-100 outline-none"
          />
        </div>
      )}

      <div className="overflow-x-auto border border-gray-200 rounded-xl">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-pink-50 text-gray-600">
              <th className="px-3 py-2 text-center font-semibold w-14">SNO</th>
              <th className="px-3 py-2 text-left font-semibold">DATA</th>
              <th className="px-3 py-2 text-left font-semibold">A\C NO</th>
              <th className="px-3 py-2 text-left font-semibold">A\C NAME</th>
              <th className="px-3 py-2 text-left font-semibold">IFSC CODE</th>
              <th className="px-3 py-2 text-right font-semibold">AMOUNT</th>
              <th className="px-3 py-2 text-left font-semibold">BANK</th>
              {editable && <th className="px-3 py-2 w-10"></th>}
            </tr>
          </thead>
          <tbody>
            {filteredIndices.length === 0 && (
              <tr>
                <td colSpan={editable ? 8 : 7} className="text-center text-gray-400 py-8">
                  No salary entries yet.
                </td>
              </tr>
            )}
            {filteredIndices.map((idx) => {
              const e = entries[idx];
              return (
                <tr key={idx} className="border-t border-gray-100 hover:bg-pink-50/40">
                  <td className="px-3 py-1.5 text-center text-gray-500">{e.sno}</td>
                  <Cell
                    value={e.data}
                    editable={editable}
                    onChange={(v) => onUpdateRow(idx, { data: v })}
                  />
                  <Cell
                    value={e.accountNumber}
                    editable={editable}
                    onChange={(v) => onUpdateRow(idx, { accountNumber: v })}
                  />
                  <Cell
                    value={e.accountName}
                    editable={editable}
                    onChange={(v) => onUpdateRow(idx, { accountName: v })}
                  />
                  <Cell
                    value={e.ifscCode}
                    editable={editable}
                    onChange={(v) => onUpdateRow(idx, { ifscCode: v.toUpperCase() })}
                  />
                  <td className="px-3 py-1.5 text-right">
                    {editable ? (
                      <input
                        type="number"
                        value={e.amount || ''}
                        onChange={(ev) => onUpdateRow(idx, { amount: parseFloat(ev.target.value) || 0 })}
                        className="w-28 text-right bg-transparent outline-none rounded px-1 focus:bg-white focus:ring-2 focus:ring-pink-100"
                      />
                    ) : (
                      formatIndianCurrency(e.amount)
                    )}
                  </td>
                  <Cell
                    value={e.bankName}
                    editable={editable}
                    onChange={(v) => onUpdateRow(idx, { bankName: v })}
                  />
                  {editable && (
                    <td className="px-3 py-1.5 text-center">
                      <button
                        onClick={() => onDeleteRow(idx)}
                        className="text-gray-300 hover:text-red-500 transition"
                        title="Delete row"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold">
              <td colSpan={5} className="px-3 py-2 text-right text-gray-700">
                TOTAL
              </td>
              <td className="px-3 py-2 text-right text-gray-900">{formatIndianCurrency(total)}</td>
              <td colSpan={editable ? 2 : 1}></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function Cell({
  value,
  editable,
  onChange,
}: {
  value: string;
  editable: boolean;
  onChange: (v: string) => void;
}) {
  if (!editable) {
    return <td className="px-3 py-1.5 text-gray-700">{value}</td>;
  }
  return (
    <td className="px-3 py-1.5">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent outline-none rounded px-1 focus:bg-white focus:ring-2 focus:ring-pink-100"
      />
    </td>
  );
}
