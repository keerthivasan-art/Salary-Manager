import initSqlJs, { Database as SqlJsDatabase, SqlValue } from 'sql.js';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import type {
  AppSettings,
  EmployeeRecord,
  SalaryBatch,
  SalaryBatchWithEntries,
  SalaryEntryInput,
  SalaryEntryRecord,
} from '@shared/types';

let db: SqlJsDatabase;
let dbFilePath: string;

export function getDataDir(): string {
  const dir = path.join(app.getPath('userData'), 'data');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function getExportDir(kind: 'excel' | 'word' | 'pdf'): string {
  const dir = path.join(app.getPath('userData'), 'exports', kind);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function getBackupDir(): string {
  const dir = path.join(app.getPath('userData'), 'backups');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function locateWasmFile(): string {
  // Packaged app: wasm is copied to resources/sql-wasm.wasm (see
  // build.extraResources in package.json). Dev mode: read straight out of
  // node_modules.
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'sql-wasm.wasm');
  }
  return path.join(app.getAppPath(), 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm');
}

export async function initDatabase(): Promise<void> {
  const SQL = await initSqlJs({
    locateFile: () => locateWasmFile(),
  });

  dbFilePath = path.join(getDataDir(), 'salary_manager.sqlite3');

  if (fs.existsSync(dbFilePath)) {
    const fileBuffer = fs.readFileSync(dbFilePath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_name TEXT NOT NULL,
      account_name TEXT NOT NULL,
      account_number TEXT NOT NULL,
      ifsc_code TEXT NOT NULL,
      bank_name TEXT NOT NULL,
      monthly_salary REAL NOT NULL DEFAULT 0,
      phone TEXT,
      joining_date TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS salary_batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      month TEXT NOT NULL,
      year INTEGER NOT NULL,
      total_amount REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(month, year)
    );

    CREATE TABLE IF NOT EXISTS salary_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_id INTEGER NOT NULL REFERENCES salary_batches(id) ON DELETE CASCADE,
      sno INTEGER NOT NULL,
      data TEXT,
      employee_name TEXT NOT NULL,
      account_name TEXT NOT NULL,
      account_number TEXT NOT NULL,
      ifsc_code TEXT NOT NULL,
      bank_name TEXT NOT NULL,
      amount REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS letter_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_id INTEGER REFERENCES salary_batches(id) ON DELETE SET NULL,
      bank_name TEXT NOT NULL,
      branch TEXT NOT NULL,
      chg_no TEXT,
      letter_date TEXT,
      month TEXT NOT NULL,
      year INTEGER NOT NULL,
      total_amount REAL NOT NULL DEFAULT 0,
      word_path TEXT,
      pdf_path TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  seedDefaultSettings();
  persist();
}

/** Writes the current in-memory sql.js database out to disk. Call after every mutation. */
function persist() {
  const data = db.export();
  fs.writeFileSync(dbFilePath, Buffer.from(data));
}

// ---------- Low-level query helpers (sql.js has a statement-based API, not
// the row-object convenience methods of better-sqlite3, so we wrap it here) ----------

function run(sql: string, params: SqlValue[] = []): void {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  stmt.step();
  stmt.free();
}

function queryAll(sql: string, params: SqlValue[] = []): Record<string, SqlValue>[] {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows: Record<string, SqlValue>[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

function queryOne(sql: string, params: SqlValue[] = []): Record<string, SqlValue> | undefined {
  return queryAll(sql, params)[0];
}

function lastInsertRowId(): number {
  const row = queryOne('SELECT last_insert_rowid() as id');
  return Number(row?.id ?? 0);
}

function withTransaction<T>(fn: () => T): T {
  db.run('BEGIN');
  try {
    const result = fn();
    db.run('COMMIT');
    persist();
    return result;
  } catch (err) {
    db.run('ROLLBACK');
    throw err;
  }
}

function seedDefaultSettings() {
  const defaults: AppSettings = {
    shopName: 'SRI AKSHATA SHOPPING CENTRE',
    address: 'Behind Thirumurugan Studio, Kovai Road, Annur, Tamil Nadu 641653',
    defaultBankName: 'HDFC Bank Limited',
    defaultBranch: 'Annur',
  };
  Object.entries(defaults).forEach(([key, value]) => {
    run('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)', [key, value]);
  });
}

export function getSettings(): AppSettings {
  const rows = queryAll('SELECT key, value FROM settings') as { key: string; value: string }[];
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    shopName: map.shopName,
    address: map.address,
    defaultBankName: map.defaultBankName,
    defaultBranch: map.defaultBranch,
  };
}

export function updateSetting(key: keyof AppSettings, value: string) {
  run(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    [key, value]
  );
  persist();
}

// ---------- Salary Batches ----------

export function findBatch(month: string, year: number): SalaryBatch | undefined {
  const row = queryOne('SELECT * FROM salary_batches WHERE month = ? AND year = ?', [month, year]);
  if (!row) return undefined;
  return mapBatch(row);
}

export function getBatchWithEntries(
  month: string,
  year: number
): SalaryBatchWithEntries | null {
  const batch = findBatch(month, year);
  if (!batch) return null;
  const entries = queryAll('SELECT * FROM salary_entries WHERE batch_id = ? ORDER BY sno ASC', [
    batch.id,
  ]);
  return { ...batch, entries: entries.map(mapEntry) };
}

export function listBatches(): SalaryBatch[] {
  const rows = queryAll('SELECT * FROM salary_batches ORDER BY year DESC, id DESC');
  return rows.map(mapBatch);
}

export function saveBatch(
  month: string,
  year: number,
  entries: SalaryEntryInput[],
  overwrite: boolean
): SalaryBatchWithEntries {
  const existing = findBatch(month, year);
  if (existing && !overwrite) {
    throw new Error(`Salary data for ${month} ${year} already exists.`);
  }

  const total = entries.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  withTransaction(() => {
    let batchId: number;
    if (existing) {
      run(`UPDATE salary_batches SET total_amount = ?, updated_at = datetime('now') WHERE id = ?`, [
        total,
        existing.id,
      ]);
      run('DELETE FROM salary_entries WHERE batch_id = ?', [existing.id]);
      batchId = existing.id;
    } else {
      run('INSERT INTO salary_batches (month, year, total_amount) VALUES (?, ?, ?)', [
        month,
        year,
        total,
      ]);
      batchId = lastInsertRowId();
    }

    entries.forEach((e, idx) => {
      run(
        `INSERT INTO salary_entries
          (batch_id, sno, data, employee_name, account_name, account_number, ifsc_code, bank_name, amount)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          batchId,
          e.sno || idx + 1,
          e.data ?? '',
          e.accountName, // snapshot: employee identified by account name shown in A\C NAME
          e.accountName,
          e.accountNumber,
          e.ifscCode,
          e.bankName,
          Number(e.amount) || 0,
        ]
      );
    });

    return batchId;
  });

  return (
    getBatchWithEntries(month, year) ??
    (() => {
      throw new Error('Failed to save salary batch');
    })()
  );
}

function mapBatch(row: Record<string, SqlValue>): SalaryBatch {
  return {
    id: Number(row.id),
    month: String(row.month),
    year: Number(row.year),
    totalAmount: Number(row.total_amount),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapEntry(row: Record<string, SqlValue>): SalaryEntryRecord {
  return {
    id: Number(row.id),
    batchId: Number(row.batch_id),
    sno: Number(row.sno),
    data: String(row.data ?? ''),
    accountName: String(row.account_name),
    accountNumber: String(row.account_number),
    ifscCode: String(row.ifsc_code),
    amount: Number(row.amount),
    bankName: String(row.bank_name),
  };
}

// ---------- Employees (managed inline from the Salary Excel page) ----------

export function listEmployees(): EmployeeRecord[] {
  const rows = queryAll("SELECT * FROM employees WHERE status != 'deleted' ORDER BY employee_name ASC");
  return rows.map(mapEmployee);
}

export function upsertEmployee(e: Partial<EmployeeRecord> & { employeeName: string }) {
  if (e.id) {
    run(
      `UPDATE employees SET employee_name=?, account_name=?, account_number=?, ifsc_code=?,
        bank_name=?, monthly_salary=?, phone=?, joining_date=?, status=?, notes=?, updated_at=datetime('now')
       WHERE id=?`,
      [
        e.employeeName,
        e.accountName ?? '',
        e.accountNumber ?? '',
        e.ifscCode ?? '',
        e.bankName ?? '',
        e.monthlySalary ?? 0,
        e.phone ?? null,
        e.joiningDate ?? null,
        e.status ?? 'active',
        e.notes ?? null,
        e.id,
      ]
    );
    persist();
    return e.id;
  }
  run(
    `INSERT INTO employees
      (employee_name, account_name, account_number, ifsc_code, bank_name, monthly_salary, phone, joining_date, status, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      e.employeeName,
      e.accountName ?? '',
      e.accountNumber ?? '',
      e.ifscCode ?? '',
      e.bankName ?? '',
      e.monthlySalary ?? 0,
      e.phone ?? null,
      e.joiningDate ?? null,
      e.status ?? 'active',
      e.notes ?? null,
    ]
  );
  const id = lastInsertRowId();
  persist();
  return id;
}

export function deleteEmployee(id: number) {
  run("UPDATE employees SET status='deleted', updated_at=datetime('now') WHERE id=?", [id]);
  persist();
}

function mapEmployee(row: Record<string, SqlValue>): EmployeeRecord {
  return {
    id: Number(row.id),
    employeeName: String(row.employee_name),
    accountName: String(row.account_name),
    accountNumber: String(row.account_number),
    ifscCode: String(row.ifsc_code),
    bankName: String(row.bank_name),
    monthlySalary: Number(row.monthly_salary),
    phone: row.phone ? String(row.phone) : undefined,
    joiningDate: row.joining_date ? String(row.joining_date) : undefined,
    status: row.status as 'active' | 'inactive',
    notes: row.notes ? String(row.notes) : undefined,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

// ---------- Letter documents ----------

export function recordLetterDocument(params: {
  batchId: number | null;
  bankName: string;
  branch: string;
  chgNo: string;
  letterDate: string;
  month: string;
  year: number;
  totalAmount: number;
  wordPath?: string;
  pdfPath?: string;
}) {
  run(
    `INSERT INTO letter_documents
      (batch_id, bank_name, branch, chg_no, letter_date, month, year, total_amount, word_path, pdf_path)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      params.batchId,
      params.bankName,
      params.branch,
      params.chgNo,
      params.letterDate,
      params.month,
      params.year,
      params.totalAmount,
      params.wordPath ?? null,
      params.pdfPath ?? null,
    ]
  );
  persist();
}
