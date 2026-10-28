import cors from "cors";
import express from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { db } from "./database.js";

const app = express();
const port = Number(process.env.PORT || 4000);
app.use(cors());
app.use(express.json({ limit: "1mb" }));

const itemSchema = z.object({
  description: z.string().trim().min(1).max(200),
  category: z.string().trim().min(1).max(80),
  subcategory: z.string().trim().min(1).max(80),
  quantity: z.number().finite().nonnegative(),
  unit: z.string().trim().min(1).max(30),
  location: z.string().trim().min(1).max(100),
  enteredAt: z.string().date(),
  createdBy: z.string().trim().min(1).max(100)
});

const reconciliationSchema = z.object({
  invoiceNumber: z.string().trim().min(1).max(80),
  invoiceDate: z.string().date(),
  supplier: z.string().trim().min(1).max(120),
  purchaseMethod: z.string().trim().min(1).max(40),
  totalAmount: z.number().finite().nonnegative(),
  notes: z.string().trim().max(1000).optional(),
  status: z.enum(["pending", "reconciled"]),
  payments: z.array(z.object({
    paymentDate: z.string().date(),
    paymentMethod: z.string().trim().min(1).max(40),
    paymentSource: z.string().trim().min(1).max(100),
    amount: z.number().finite().positive(),
    transactionReference: z.string().trim().max(120).optional()
  })).max(50)
});

const mapItem = (item) => ({ ...item, enteredAt: item.entered_at, createdBy: item.created_by });

app.get("/health", (_req, res) => res.json({ ok: true }));

app.get("/api/items", (req, res) => {
  const query = String(req.query.search || "").trim();
  const status = req.query.status && req.query.status !== "all" ? String(req.query.status) : null;
  const category = req.query.category ? String(req.query.category) : null;
  const rows = db.prepare(`
    SELECT * FROM inventory_items
    WHERE (@query = '' OR description LIKE @like OR category LIKE @like OR location LIKE @like)
      AND (@status IS NULL OR status = @status)
      AND (@category IS NULL OR category = @category)
    ORDER BY created_at DESC
  `).all({ query, like: `%${query}%`, status, category });
  res.json(rows.map(mapItem));
});

app.get("/api/items/:id", (req, res) => {
  const item = db.prepare("SELECT * FROM inventory_items WHERE id = ?").get(req.params.id);
  if (!item) return res.status(404).json({ error: "Item not found" });
  const invoice = db.prepare("SELECT * FROM purchase_invoices WHERE item_id = ? ORDER BY created_at DESC LIMIT 1").get(req.params.id);
  const payments = invoice ? db.prepare("SELECT * FROM payments WHERE invoice_id = ? ORDER BY payment_date").all(invoice.id) : [];
  res.json({ item: mapItem(item), invoice, payments });
});

app.post("/api/items", (req, res) => {
  const parsed = itemSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid item", details: parsed.error.flatten() });
  const item = { id: `ITM-${randomUUID().slice(0, 8).toUpperCase()}`, ...parsed.data };
  db.prepare(`
    INSERT INTO inventory_items (id, description, category, subcategory, quantity, unit, location, status, entered_at, created_by)
    VALUES (@id, @description, @category, @subcategory, @quantity, @unit, @location, 'pending', @enteredAt, @createdBy)
  `).run(item);
  db.prepare("INSERT INTO stock_movements (id, item_id, quantity_delta, reason, created_by) VALUES (?, ?, ?, ?, ?)").run(randomUUID(), item.id, item.quantity, "initial intake", item.createdBy);
  res.status(201).json(item);
});

app.post("/api/items/:id/reconciliation", (req, res) => {
  const parsed = reconciliationSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid reconciliation", details: parsed.error.flatten() });
  const item = db.prepare("SELECT id, quantity, unit FROM inventory_items WHERE id = ?").get(req.params.id);
  if (!item) return res.status(404).json({ error: "Item not found" });
  const payload = parsed.data;
  const invoiceId = `INV-${randomUUID().slice(0, 8).toUpperCase()}`;
  const save = db.transaction(() => {
    db.prepare(`
      INSERT INTO purchase_invoices (id, item_id, invoice_number, invoice_date, supplier, purchase_method, total_amount, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(invoiceId, item.id, payload.invoiceNumber, payload.invoiceDate, payload.supplier, payload.purchaseMethod, payload.totalAmount, payload.notes || null);
    const payment = db.prepare(`
      INSERT INTO payments (id, invoice_id, payment_date, payment_method, payment_source, amount, transaction_reference)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    payload.payments.forEach((entry) => payment.run(randomUUID(), invoiceId, entry.paymentDate, entry.paymentMethod, entry.paymentSource, entry.amount, entry.transactionReference || null));
    db.prepare("UPDATE inventory_items SET status = ? WHERE id = ?").run(payload.status, item.id);
  });
  save();
  res.status(201).json({ itemId: item.id, invoiceId, status: payload.status });
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(port, () => console.log(`Stockwise API listening on http://localhost:${port}`));
