import ExcelJS from 'exceljs';
import path from 'path';
import { getExportDir } from '../database/db';
import type { SalaryEntryInput, AppSettings } from '@shared/types';

const HEADERS = ['SNO', 'DATA', 'A\\C NO', 'A\\C NAME ', 'IFSC CODE', 'AMOUNT', 'BANK'];
// Column widths copied from the reference workbook (A is left at default width).
const COL_WIDTHS: (number | undefined)[] = [undefined, 21.44, 25.33, 30.89, 21.33, 28.44, 32.88];

const HEADING_FONT = { name: 'Calibri', size: 18 };
const TABLE_FONT = { name: 'Calibri', size: 16 };

/**
 * Generates the monthly salary Excel sheet, reproducing the layout of the
 * reference file uploaded for this project (salarylistofaug.xlsx):
 *  - Row 2/3: shop name + "SALARY LIST OF <MONTH>" headings in column D,
 *    plain (no merge, no fill, no bold), 18pt.
 *  - Row 4: spacer.
 *  - Row 5: table header (SNO, DATA, A\C NO, A\C NAME, IFSC CODE, AMOUNT, BANK).
 *  - Data rows with thin borders around every cell, 16pt.
 *  - TOTAL label in the IFSC CODE column, SUM formula in the AMOUNT column.
 * (Note: the reference used the "Aptos" font family shipped with newer
 * Office versions; Calibri is used here as a universally-available
 * equivalent so the file opens identically on any Windows PC.)
 */
export async function generateSalaryExcel(
  month: string,
  year: number,
  entries: SalaryEntryInput[],
  settings: AppSettings
): Promise<string> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = settings.shopName;
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Sheet1', {
    pageSetup: {
      orientation: 'portrait',
      margins: {
        left: 0.7, right: 0.7, top: 0.75, bottom: 0.75, header: 0.3, footer: 0.3,
      },
    },
  });

  COL_WIDTHS.forEach((w, i) => {
    if (w !== undefined) sheet.getColumn(i + 1).width = w;
  });

  // Headings — placed in column D, no merge, matching the reference exactly.
  const heading1 = sheet.getCell('D2');
  heading1.value = `${settings.shopName} - ANNUR `;
  heading1.font = HEADING_FONT;
  sheet.getRow(2).height = 23.4;

  const heading2 = sheet.getCell('D3');
  heading2.value = `SALARY LIST OF ${month.toUpperCase()}`;
  heading2.font = HEADING_FONT;
  sheet.getRow(3).height = 23.4;

  // Row 4 left blank as a spacer (matches reference).

  // Table header — row 5
  const headerRowIndex = 5;
  const headerRow = sheet.getRow(headerRowIndex);
  HEADERS.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.font = TABLE_FONT;
    cell.border = thinBorder();
  });
  headerRow.height = 21;

  // Data rows
  let rowIndex = headerRowIndex + 1;
  entries.forEach((e, idx) => {
    const row = sheet.getRow(rowIndex);
    const values = [
      e.sno ?? idx + 1,
      e.data ?? '',
      e.accountNumber,
      e.accountName,
      e.ifscCode,
      Number(e.amount) || 0,
      e.bankName,
    ];
    values.forEach((v, colIdx) => {
      const cell = row.getCell(colIdx + 1);
      cell.value = v;
      cell.font = TABLE_FONT;
      cell.border = thinBorder();
      if (colIdx === 5) {
        cell.numFmt = '0.00';
      }
    });
    row.height = 21;
    rowIndex += 1;
  });

  // TOTAL row: label in the IFSC CODE column (col 5), SUM formula in AMOUNT (col 6).
  const totalRow = sheet.getRow(rowIndex);
  const firstDataRow = headerRowIndex + 1;
  const lastDataRow = rowIndex - 1;

  const totalLabelCell = totalRow.getCell(5);
  totalLabelCell.value = 'TOTAL';
  totalLabelCell.font = { ...TABLE_FONT, size: 18 };
  totalLabelCell.border = thinBorder();

  const totalAmountCell = totalRow.getCell(6);
  if (entries.length > 0) {
    totalAmountCell.value = { formula: `SUM(F${firstDataRow}:F${lastDataRow})` } as any;
  } else {
    totalAmountCell.value = 0;
  }
  totalAmountCell.numFmt = '0.00';
  totalAmountCell.font = { ...TABLE_FONT, size: 18 };
  totalAmountCell.border = thinBorder();

  totalRow.getCell(1).border = thinBorder();
  totalRow.getCell(2).border = thinBorder();
  totalRow.getCell(3).border = thinBorder();
  totalRow.getCell(4).border = thinBorder();
  totalRow.getCell(7).border = thinBorder();
  totalRow.height = 54.6;

  const fileName = `Salary_List_${month}_${year}.xlsx`;
  const filePath = path.join(getExportDir('excel'), fileName);
  await workbook.xlsx.writeFile(filePath);
  return filePath;
}

function thinBorder(): Partial<ExcelJS.Borders> {
  const style: ExcelJS.BorderStyle = 'thin';
  return {
    top: { style },
    left: { style },
    bottom: { style },
    right: { style },
  };
}
