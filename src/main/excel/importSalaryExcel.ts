import ExcelJS from 'exceljs';
import type { ImportValidationResult, ImportValidationRow, SalaryEntryInput } from '@shared/types';

const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/i;

export async function parseAndValidateSalaryExcel(
  filePath: string
): Promise<ImportValidationResult> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const sheet = workbook.worksheets[0];

  // Locate the header row by searching for "SNO" in column A within the first 10 rows.
  let headerRowNumber = -1;
  for (let r = 1; r <= Math.min(10, sheet.rowCount); r++) {
    const val = String(sheet.getRow(r).getCell(1).value ?? '').trim().toUpperCase();
    if (val === 'SNO') {
      headerRowNumber = r;
      break;
    }
  }
  if (headerRowNumber === -1) {
    throw new Error(
      'Could not find the salary table header (SNO, DATA, A\\C NO, A\\C NAME, IFSC CODE, AMOUNT, BANK) in this file.'
    );
  }

  const valid: ImportValidationRow[] = [];
  const invalid: ImportValidationRow[] = [];
  const duplicates: ImportValidationRow[] = [];
  const seenAccountNumbers = new Set<string>();

  let sno = 1;
  for (let r = headerRowNumber + 1; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const c1 = row.getCell(1).value;
    const dataCell = row.getCell(2).value;
    const accNo = String(row.getCell(3).value ?? '').trim();
    const accName = String(row.getCell(4).value ?? '').trim();
    const ifsc = String(row.getCell(5).value ?? '').trim();
    const amountRaw = row.getCell(6).value;
    const bank = String(row.getCell(7).value ?? '').trim();

    const isBlankRow = !accNo && !accName && !ifsc && !amountRaw && !bank;
    if (isBlankRow) continue;

    // Stop at a TOTAL row
    const c1Str = String(c1 ?? '').trim().toUpperCase();
    if (c1Str === 'TOTAL') break;

    const errors: string[] = [];
    const amount = typeof amountRaw === 'number' ? amountRaw : parseFloat(String(amountRaw ?? ''));

    if (!accNo) errors.push('Missing account number');
    if (!accName) errors.push('Missing account name');
    if (!ifsc) {
      errors.push('Missing IFSC code');
    } else if (!IFSC_REGEX.test(ifsc)) {
      errors.push('Invalid IFSC code format');
    }
    if (!bank) errors.push('Missing bank name');
    if (isNaN(amount) || amount <= 0) errors.push('Invalid amount');

    const entry: SalaryEntryInput = {
      sno: sno++,
      data: String(dataCell ?? ''),
      accountNumber: accNo,
      accountName: accName,
      ifscCode: ifsc.toUpperCase(),
      amount: isNaN(amount) ? 0 : amount,
      bankName: bank,
    };

    const rowResult: ImportValidationRow = { rowNumber: r, data: entry, errors };

    if (accNo && seenAccountNumbers.has(accNo)) {
      duplicates.push({ ...rowResult, errors: [...errors, 'Duplicate account number in file'] });
      continue;
    }
    if (accNo) seenAccountNumbers.add(accNo);

    if (errors.length > 0) {
      invalid.push(rowResult);
    } else {
      valid.push(rowResult);
    }
  }

  return { valid, invalid, duplicates };
}
