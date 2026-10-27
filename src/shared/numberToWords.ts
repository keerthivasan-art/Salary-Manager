const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen',
];

const TENS = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety',
];

function twoDigits(n: number): string {
  if (n === 0) return '';
  if (n < 20) return ONES[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return `${TENS[t]}${o ? ' ' + ONES[o] : ''}`;
}

function threeDigits(n: number): string {
  const h = Math.floor(n / 100);
  const rest = n % 100;
  const parts: string[] = [];
  if (h) parts.push(`${ONES[h]} Hundred`);
  if (rest) parts.push(twoDigits(rest));
  return parts.join(' ');
}

/**
 * Converts a non-negative rupee amount into Indian-English words
 * using the Thousand / Lakh / Crore numbering system, WITHOUT the
 * trailing "Only" — for embedding mid-sentence, e.g. in the NEFT
 * request paragraph: "...for an amount of Rs. 686600 (in words:
 * Six Lakh Eighty Six Thousand Six Hundred only)."
 */
export function amountToIndianWordsCore(amount: number): string {
  const rounded = Math.round(amount);
  if (rounded === 0) return 'Zero';

  let n = Math.abs(rounded);

  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  const lakh = Math.floor(n / 100000);
  n %= 100000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  const hundred = n;

  const segments: string[] = [];
  if (crore) segments.push(`${threeDigits(crore)} Crore`);
  if (lakh) segments.push(`${threeDigits(lakh)} Lakh`);
  if (thousand) segments.push(`${threeDigits(thousand)} Thousand`);
  if (hundred) segments.push(threeDigits(hundred));

  return segments.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
}

/**
 * Converts a non-negative rupee amount into Indian-English words
 * using the Thousand / Lakh / Crore numbering system, with a
 * trailing "Only" — for standalone display, e.g. the
 * "Amount in words" line.
 * e.g. 686600 -> "Six Lakh Eighty Six Thousand Six Hundred Only"
 */
export function amountToIndianWords(amount: number): string {
  return `${amountToIndianWordsCore(amount)} Only`;
}

/** Formats a number using Indian digit grouping, e.g. 686600 -> "6,86,600.00" */
export function formatIndianCurrency(amount: number): string {
  const fixed = amount.toFixed(2);
  const [intPart, decPart] = fixed.split('.');
  const negative = intPart.startsWith('-');
  const digits = negative ? intPart.slice(1) : intPart;

  let result: string;
  if (digits.length <= 3) {
    result = digits;
  } else {
    const last3 = digits.slice(-3);
    const rest = digits.slice(0, -3);
    const grouped = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    result = `${grouped},${last3}`;
  }
  return `${negative ? '-' : ''}${result}.${decPart}`;
}
