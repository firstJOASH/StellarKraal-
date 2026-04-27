/**
 * Lightweight in-memory store with soft delete support.
 * Provides audit trail for loans and collateral records.
 * Migration system is managed by db-migrate for schema versioning.
 * 
 * Note: This is an in-memory implementation for development.
 * In production, replace with actual database queries.
 */

export interface CollateralRecord {
  id: string;
  owner: string;
  animal_type: string;
  count: number;
  appraised_value: number;
  createdAt: string;
  deletedAt: string | null;
}

export interface LoanRecord {
  id: string;
  borrower: string;
  collateral_id: string;
  amount: number;
  createdAt: string;
  deletedAt: string | null;
}

// In-memory tables (replace with a real DB in production)
const collateralTable: Map<string, CollateralRecord> = new Map();
const loanTable: Map<string, LoanRecord> = new Map();

// ── Collateral ────────────────────────────────────────────────────────────────

export function insertCollateral(data: Omit<CollateralRecord, "createdAt" | "deletedAt">): CollateralRecord {
  const record: CollateralRecord = { ...data, createdAt: new Date().toISOString(), deletedAt: null };
  collateralTable.set(record.id, record);
  return record;
}

export function listCollateral(): CollateralRecord[] {
  return [...collateralTable.values()].filter((r) => r.deletedAt === null);
}

export function getCollateral(id: string): CollateralRecord | undefined {
  const r = collateralTable.get(id);
  return r && r.deletedAt === null ? r : undefined;
}

export function softDeleteCollateral(id: string): boolean {
  const r = collateralTable.get(id);
  if (!r || r.deletedAt !== null) return false;
  r.deletedAt = new Date().toISOString();
  return true;
}

export function restoreCollateral(id: string): boolean {
  const r = collateralTable.get(id);
  if (!r || r.deletedAt === null) return false;
  r.deletedAt = null;
  return true;
}

export function listDeletedCollateral(): CollateralRecord[] {
  return [...collateralTable.values()].filter((r) => r.deletedAt !== null);
}

// ── Loans ─────────────────────────────────────────────────────────────────────

export function insertLoan(data: Omit<LoanRecord, "createdAt" | "deletedAt">): LoanRecord {
  const record: LoanRecord = { ...data, createdAt: new Date().toISOString(), deletedAt: null };
  loanTable.set(record.id, record);
  return record;
}

export function listLoans(): LoanRecord[] {
  return [...loanTable.values()].filter((r) => r.deletedAt === null);
}

export function getLoan(id: string): LoanRecord | undefined {
  const r = loanTable.get(id);
  return r && r.deletedAt === null ? r : undefined;
}

export function softDeleteLoan(id: string): boolean {
  const r = loanTable.get(id);
  if (!r || r.deletedAt !== null) return false;
  r.deletedAt = new Date().toISOString();
  return true;
}

export function restoreLoan(id: string): boolean {
  const r = loanTable.get(id);
  if (!r || r.deletedAt === null) return false;
  r.deletedAt = null;
  return true;
}

export function listDeletedLoans(): LoanRecord[] {
  return [...loanTable.values()].filter((r) => r.deletedAt !== null);
}

// ── Migration exports ─────────────────────────────────────────────────────────

export { runMigrations, getMigrationStatus, rollbackMigration } from "./migrationRunner";
