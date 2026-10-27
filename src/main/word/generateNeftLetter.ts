import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
} from 'docx';
import fs from 'fs';
import path from 'path';
import { getExportDir } from '../database/db';
import { amountToIndianWordsCore, formatIndianCurrency } from '@shared/numberToWords';
import type { NeftLetterSettings, SalaryEntryInput, AppSettings } from '@shared/types';

const CELL_BORDER = {
  top: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
  left: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
  right: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
};

// Column widths (in DXA twips) copied from the reference document's table grid.
const COL_WIDTHS = [630, 1250, 1991, 2232, 1628, 1190, 2530];
const HEADERS = ['SNO', 'DATA', 'A\\C NO', 'A\\C NAME ', 'IFSC CODE', 'AMOUNT', 'BANK'];

function headerCell(text: string, width: number): TableCell {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    borders: CELL_BORDER,
    children: [new Paragraph({ children: [new TextRun({ text })] })],
  });
}

function bodyCell(
  text: string,
  width: number,
  align: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.LEFT
): TableCell {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    borders: CELL_BORDER,
    children: [new Paragraph({ alignment: align, children: [new TextRun(text)] })],
  });
}

/**
 * Generates the NEFT request letter as a .docx file, reproducing the
 * structure and exact wording of the uploaded reference document
 * (Letter_of_August.docx):
 *   To
 *   The Manager
 *   <Bank Name>
 *   <Branch>
 *   Respected Sir,
 *   We request you to kindly do the below listed bulk NEFT via Chg No.
 *   <chgNo> dated <date> for an amount of Rs. <amount> (in words: <words> only).
 *   [table: SNO | DATA | A\C NO | A\C NAME | IFSC CODE | AMOUNT | BANK]
 *   [blank rows]
 *   Total amount : <amount>
 *   With regards
 *   For
 * A thin border is added around every table cell (the source file had no
 * borders defined at all, which prints as invisible gridlines — borders
 * are added here so the printed letter is legible, per the requirement
 * that generated documents be genuinely print-ready).
 */
export async function generateNeftLetterDocx(
  letterSettings: NeftLetterSettings,
  entries: SalaryEntryInput[],
  appSettings: AppSettings
): Promise<string> {
  const total = entries.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const totalWordsCore = amountToIndianWordsCore(total);

  const headerRow = new TableRow({
    tableHeader: true,
    children: HEADERS.map((h, i) => headerCell(h, COL_WIDTHS[i])),
  });

  const dataRows = entries.map(
    (e, idx) =>
      new TableRow({
        children: [
          bodyCell(String(e.sno ?? idx + 1), COL_WIDTHS[0], AlignmentType.CENTER),
          bodyCell(e.data ?? '', COL_WIDTHS[1]),
          bodyCell(e.accountNumber, COL_WIDTHS[2]),
          bodyCell(e.accountName, COL_WIDTHS[3]),
          bodyCell(e.ifscCode, COL_WIDTHS[4]),
          bodyCell(Number(e.amount).toFixed(2), COL_WIDTHS[5], AlignmentType.RIGHT),
          bodyCell(e.bankName, COL_WIDTHS[6]),
        ],
      })
  );

  // TOTAL label sits in the IFSC CODE column, matching the reference exactly.
  const totalRow = new TableRow({
    children: [
      bodyCell('', COL_WIDTHS[0]),
      bodyCell('', COL_WIDTHS[1]),
      bodyCell('', COL_WIDTHS[2]),
      bodyCell('', COL_WIDTHS[3]),
      bodyCell('TOTAL', COL_WIDTHS[4]),
      bodyCell(total.toFixed(2), COL_WIDTHS[5], AlignmentType.RIGHT),
      bodyCell('', COL_WIDTHS[6]),
    ],
  });

  const table = new Table({
    width: { size: COL_WIDTHS.reduce((a, b) => a + b, 0), type: WidthType.DXA },
    rows: [headerRow, ...dataRows, totalRow],
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 }, // A4 in twips
            margin: { top: 1000, bottom: 1000, left: 1000, right: 1000 },
          },
        },
        children: [
          new Paragraph({ children: [new TextRun({ text: 'To', bold: true })] }),
          new Paragraph({ children: [new TextRun('The Manager')] }),
          new Paragraph({ children: [new TextRun(letterSettings.bankName)] }),
          new Paragraph({ children: [new TextRun(letterSettings.branch)] }),
          new Paragraph({ text: '' }),
          new Paragraph({ children: [new TextRun({ text: 'Respected Sir,', bold: true })] }),
          new Paragraph({ text: '' }),
          new Paragraph({
            children: [
              new TextRun(
                `We request you to kindly do the below listed bulk NEFT via Chg No. ${letterSettings.chgNo} dated ${letterSettings.letterDate} for an amount of Rs. ${Math.round(total)} (in words: ${totalWordsCore} only).`
              ),
            ],
          }),
          new Paragraph({ text: '' }),
          table,
          new Paragraph({ text: '' }),
          new Paragraph({ text: '' }),
          new Paragraph({
            children: [
              new TextRun({ text: `Total amount : ${formatIndianCurrency(total)}`, bold: true }),
            ],
          }),
          new Paragraph({ text: '' }),
          new Paragraph({ children: [new TextRun('With regards')] }),
          new Paragraph({ text: '' }),
          new Paragraph({ children: [new TextRun('For')] }),
          new Paragraph({ text: '' }),
          new Paragraph({ text: '' }),
          new Paragraph({ children: [new TextRun({ text: appSettings.shopName, bold: true })] }),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  const fileName = `NEFT_Letter_${letterSettings.month}_${letterSettings.year}.docx`;
  const filePath = path.join(getExportDir('word'), fileName);
  fs.writeFileSync(filePath, buffer);
  return filePath;
}
