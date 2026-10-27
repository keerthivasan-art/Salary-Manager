import path from 'path';
import fs from 'fs';
import { getExportDir } from '../database/db';
import { amountToIndianWordsCore, formatIndianCurrency } from '@shared/numberToWords';
import type { NeftLetterSettings, SalaryEntryInput, AppSettings } from '@shared/types';

// pdfmake ships CommonJS builds; require avoids ESM interop issues in the
// bundled Electron main process.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PdfPrinter = require('pdfmake');

// The standard 14 PDF fonts (Helvetica) require no external font files and
// therefore work fully offline with zero extra assets bundled.
const STANDARD_FONTS = {
  Helvetica: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique',
  },
};

/**
 * Generates the NEFT request letter as a PDF, mirroring the same content
 * and structure as the .docx produced by generateNeftLetterDocx, so the
 * two outputs match visually.
 */
export async function generateNeftLetterPdf(
  letterSettings: NeftLetterSettings,
  entries: SalaryEntryInput[],
  appSettings: AppSettings
): Promise<string> {
  const total = entries.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const totalWordsCore = amountToIndianWordsCore(total);

  const tableBody: any[] = [
    [
      { text: 'SNO', bold: true, alignment: 'center' },
      { text: 'DATA', bold: true },
      { text: 'A\\C NO', bold: true },
      { text: 'A\\C NAME', bold: true },
      { text: 'IFSC CODE', bold: true },
      { text: 'AMOUNT', bold: true, alignment: 'right' },
      { text: 'BANK', bold: true },
    ],
  ];

  entries.forEach((e, idx) => {
    tableBody.push([
      { text: String(e.sno ?? idx + 1), alignment: 'center' },
      { text: e.data ?? '' },
      { text: e.accountNumber },
      { text: e.accountName },
      { text: e.ifscCode },
      { text: Number(e.amount).toFixed(2), alignment: 'right' },
      { text: e.bankName },
    ]);
  });

  // TOTAL label in the IFSC CODE column, matching the reference letter.
  tableBody.push([
    { text: '' }, { text: '' }, { text: '' }, { text: '' },
    { text: 'TOTAL', bold: true },
    { text: total.toFixed(2), bold: true, alignment: 'right' },
    { text: '' },
  ]);

  const docDefinition: any = {
    pageSize: 'A4',
    pageMargins: [50, 50, 50, 50],
    defaultStyle: { font: 'Helvetica', fontSize: 10 },
    content: [
      { text: 'To', bold: true, margin: [0, 0, 0, 2] },
      { text: 'The Manager', margin: [0, 0, 0, 2] },
      { text: letterSettings.bankName, margin: [0, 0, 0, 2] },
      { text: letterSettings.branch, margin: [0, 0, 0, 10] },
      { text: 'Respected Sir,', bold: true, margin: [0, 0, 0, 10] },
      {
        text: `We request you to kindly do the below listed bulk NEFT via Chg No. ${letterSettings.chgNo} dated ${letterSettings.letterDate} for an amount of Rs. ${Math.round(total)} (in words: ${totalWordsCore} only).`,
        margin: [0, 0, 0, 10],
      },
      {
        table: {
          headerRows: 1,
          widths: ['6%', '15%', '19%', '22%', '16%', '12%', '10%'],
          body: tableBody,
        },
        layout: {
          hLineWidth: () => 0.75,
          vLineWidth: () => 0.75,
          hLineColor: () => '#000000',
          vLineColor: () => '#000000',
        },
        margin: [0, 0, 0, 16],
      },
      { text: `Total amount : ${formatIndianCurrency(total)}`, bold: true, margin: [0, 0, 0, 16] },
      { text: 'With regards', margin: [0, 0, 0, 16] },
      { text: 'For', margin: [0, 0, 0, 30] },
      { text: appSettings.shopName, bold: true },
    ],
  };

  const printer = new PdfPrinter(STANDARD_FONTS);
  const pdfDoc = printer.createPdfKitDocument(docDefinition);

  const fileName = `NEFT_Letter_${letterSettings.month}_${letterSettings.year}.pdf`;
  const filePath = path.join(getExportDir('pdf'), fileName);

  await new Promise<void>((resolve, reject) => {
    const stream = fs.createWriteStream(filePath);
    pdfDoc.pipe(stream);
    pdfDoc.end();
    stream.on('finish', () => resolve());
    stream.on('error', reject);
  });

  return filePath;
}
