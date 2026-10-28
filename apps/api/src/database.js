import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const defaultDatabasePath = resolve(dirname(fileURLToPath(import.meta.url)), "../data/stockwise.db");
const databasePath = resolve(process.env.STOCKWISE_DB_PATH || defaultDatabasePath);
mkdirSync(dirname(databasePath), { recursive: true });

export const db = new Database(databasePath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS inventory_items (
    id TEXT PRIMARY KEY,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    subcategory TEXT NOT NULL,
    quantity REAL NOT NULL CHECK (quantity >= 0),
    unit TEXT NOT NULL,
    location TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reconciled')),
    entered_at TEXT NOT NULL,
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS purchase_invoices (
    id TEXT PRIMARY KEY,
    item_id TEXT NOT NULL REFERENCES inventory_items(id),
    invoice_number TEXT NOT NULL,
    invoice_date TEXT NOT NULL,
    supplier TEXT NOT NULL,
    purchase_method TEXT NOT NULL,
    total_amount REAL NOT NULL CHECK (total_amount >= 0),
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    invoice_id TEXT NOT NULL REFERENCES purchase_invoices(id),
    payment_date TEXT NOT NULL,
    payment_method TEXT NOT NULL,
    payment_source TEXT NOT NULL,
    amount REAL NOT NULL CHECK (amount > 0),
    transaction_reference TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS stock_movements (
    id TEXT PRIMARY KEY,
    item_id TEXT NOT NULL REFERENCES inventory_items(id),
    quantity_delta REAL NOT NULL,
    reason TEXT NOT NULL,
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

const itemCount = db.prepare("SELECT COUNT(*) AS count FROM inventory_items").get().count;
if (itemCount === 0) {
  const insert = db.prepare(`
    INSERT INTO inventory_items
      (id, description, category, subcategory, quantity, unit, location, status, entered_at, created_by)
    VALUES (@id, @description, @category, @subcategory, @quantity, @unit, @location, @status, @enteredAt, @createdBy)
  `);
  const seed = db.transaction(() => [
    ["ITM-001", "Basmati Rice Premium", "Food & Beverage", "Grains & Pulses", 10, "kg", "Main Warehouse", "pending", "2026-09-16", "usr_manager"],
    ["ITM-002", "Sunflower Oil", "Food & Beverage", "Oils", 5, "L", "Main Warehouse", "pending", "2026-09-15", "usr_manager"],
    ["ITM-003", "Masoor Dal", "Food & Beverage", "Grains & Pulses", 20, "kg", "Main Warehouse", "pending", "2026-09-14", "usr_manager"],
    ["ITM-004", "Sugar (Refined)", "Food & Beverage", "Sweeteners", 25, "kg", "Store Room A", "reconciled", "2026-09-14", "usr_manager"],
    ["ITM-005", "Green Tea Leaves", "Food & Beverage", "Beverages", 2, "kg", "Main Warehouse", "reconciled", "2026-09-12", "usr_manager"],
    ["ITM-006", "Rolled Oats", "Food & Beverage", "Cereal", 15, "kg", "Store Room B", "pending", "2026-09-12", "usr_manager"],
    ["ITM-007", "Turmeric Powder", "Food & Beverage", "Spices", 5, "kg", "Main Warehouse", "pending", "2026-09-11", "usr_manager"]
  ].forEach(([id, description, category, subcategory, quantity, unit, location, status, enteredAt, createdBy]) => insert.run({ id, description, category, subcategory, quantity, unit, location, status, enteredAt, createdBy })));
  seed();
}
