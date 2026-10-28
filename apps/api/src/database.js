// In-memory data store replacement for better-sqlite3 (Node.js runtime in AI Studio)
// Pre-seeded with initial inventory records and manager-managed subcategories

export const subcategoryStore = {
  "Food & Beverage": ["Grains & Pulses", "Oils", "Sweeteners", "Beverages", "Cereal", "Spices", "Dairy & Bakery", "Snacks"],
  "Garden Supplies": ["Fertilizers & Soil", "Seeds & Bulbs", "Tools & Equipment", "Pest Control", "Pots & Planters"],
  "Housekeeping": ["Cleaning Agents", "Paper & Disposables", "Linens & Towels", "Waste Management"],
  "Maintenance": ["Electrical", "Plumbing", "Hardware & Tools", "Paints & Solvents"]
};

const inventoryItems = [
  { id: "ITM-001", description: "Basmati Rice Premium (বাসমতী চাল)", category: "Food & Beverage", subcategory: "Grains & Pulses", quantity: 10, unit: "kg", location: "Main Warehouse", status: "pending", entered_at: "2026-09-16", created_by: "usr_manager", created_at: "2026-09-16T08:00:00.000Z" },
  { id: "ITM-002", description: "Sunflower Oil (সূর্যমুখী তেল)", category: "Food & Beverage", subcategory: "Oils", quantity: 5, unit: "L", location: "Main Warehouse", status: "pending", entered_at: "2026-09-15", created_by: "usr_manager", created_at: "2026-09-15T08:00:00.000Z" },
  { id: "ITM-003", description: "Masoor Dal (मसूर दाल)", category: "Food & Beverage", subcategory: "Grains & Pulses", quantity: 20, unit: "kg", location: "Main Warehouse", status: "pending", entered_at: "2026-09-14", created_by: "usr_manager", created_at: "2026-09-14T08:00:00.000Z" },
  { id: "ITM-004", description: "Sugar Refined (चीनी)", category: "Food & Beverage", subcategory: "Sweeteners", quantity: 25, unit: "kg", location: "Store Room A", status: "reconciled", entered_at: "2026-09-14", created_by: "usr_manager", created_at: "2026-09-14T07:30:00.000Z" },
  { id: "ITM-005", description: "Green Tea Leaves (সবুজ চা)", category: "Food & Beverage", subcategory: "Beverages", quantity: 2, unit: "kg", location: "Main Warehouse", status: "reconciled", entered_at: "2026-09-12", created_by: "usr_manager", created_at: "2026-09-12T08:00:00.000Z" },
  { id: "ITM-006", description: "Rolled Oats", category: "Food & Beverage", subcategory: "Cereal", quantity: 15, unit: "kg", location: "Store Room B", status: "pending", entered_at: "2026-09-12", created_by: "usr_manager", created_at: "2026-09-12T07:00:00.000Z" },
  { id: "ITM-007", description: "Turmeric Powder (हल्दी पाउडर)", category: "Food & Beverage", subcategory: "Spices", quantity: 5, unit: "kg", location: "Main Warehouse", status: "pending", entered_at: "2026-09-11", created_by: "usr_manager", created_at: "2026-09-11T08:00:00.000Z" }
];

const purchaseInvoices = [];
const payments = [];
const stockMovements = [];

export const db = {
  pragma: () => {},
  exec: () => {},
  transaction: (fn) => (...args) => fn(...args),
  prepare: (sql) => {
    const cleanSql = sql.replace(/\s+/g, " ").trim();

    // SELECT COUNT(*) AS count FROM inventory_items
    if (cleanSql.includes("COUNT(*) AS count FROM inventory_items")) {
      return {
        get: () => ({ count: inventoryItems.length })
      };
    }

    // SELECT * FROM inventory_items WHERE (@query = '' OR ...)
    if (cleanSql.includes("SELECT * FROM inventory_items") && cleanSql.includes("@query")) {
      return {
        all: (params = {}) => {
          const q = (params.query || "").toLowerCase();
          const status = params.status;
          const category = params.category;

          return inventoryItems
            .filter((item) => {
              if (q) {
                const matchDesc = item.description?.toLowerCase().includes(q);
                const matchCat = item.category?.toLowerCase().includes(q);
                const matchLoc = item.location?.toLowerCase().includes(q);
                if (!matchDesc && !matchCat && !matchLoc) return false;
              }
              if (status && item.status !== status) return false;
              if (category && item.category !== category) return false;
              return true;
            })
            .sort((a, b) => new Date(b.created_at || b.entered_at) - new Date(a.created_at || a.entered_at));
        }
      };
    }

    // SELECT id, quantity, unit FROM inventory_items WHERE id = ?
    // or SELECT * FROM inventory_items WHERE id = ?
    if (cleanSql.includes("FROM inventory_items WHERE id = ?")) {
      return {
        get: (id) => inventoryItems.find((item) => item.id === id) || null
      };
    }

    // SELECT * FROM purchase_invoices WHERE item_id = ? ORDER BY created_at DESC LIMIT 1
    if (cleanSql.includes("FROM purchase_invoices WHERE item_id = ?")) {
      return {
        get: (itemId) => {
          const matched = purchaseInvoices.filter((inv) => inv.item_id === itemId);
          if (!matched.length) return null;
          return matched[matched.length - 1];
        }
      };
    }

    // SELECT * FROM payments WHERE invoice_id = ? ORDER BY payment_date
    if (cleanSql.includes("FROM payments WHERE invoice_id = ?")) {
      return {
        all: (invoiceId) => payments.filter((p) => p.invoice_id === invoiceId)
      };
    }

    // INSERT INTO inventory_items ...
    if (cleanSql.startsWith("INSERT INTO inventory_items")) {
      return {
        run: (params) => {
          const row = {
            id: params.id,
            description: params.description,
            category: params.category,
            subcategory: params.subcategory,
            quantity: params.quantity,
            unit: params.unit,
            location: params.location,
            status: params.status || "pending",
            image: params.image || null,
            notes: params.notes || null,
            entered_at: params.enteredAt || params.entered_at,
            created_by: params.createdBy || params.created_by,
            created_at: new Date().toISOString()
          };
          inventoryItems.unshift(row);
          return { changes: 1 };
        }
      };
    }

    // INSERT INTO stock_movements ... VALUES (?, ?, ?, ?, ?)
    if (cleanSql.startsWith("INSERT INTO stock_movements")) {
      return {
        run: (id, itemId, quantityDelta, reason, createdBy) => {
          stockMovements.push({ id, item_id: itemId, quantity_delta: quantityDelta, reason, created_by: createdBy, created_at: new Date().toISOString() });
          return { changes: 1 };
        }
      };
    }

    // INSERT INTO purchase_invoices ... VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    if (cleanSql.startsWith("INSERT INTO purchase_invoices")) {
      return {
        run: (id, itemId, invoiceNumber, invoiceDate, supplier, purchaseMethod, totalAmount, notes) => {
          purchaseInvoices.push({
            id,
            item_id: itemId,
            invoice_number: invoiceNumber,
            invoice_date: invoiceDate,
            supplier,
            purchase_method: purchaseMethod,
            total_amount: totalAmount,
            notes,
            created_at: new Date().toISOString()
          });
          return { changes: 1 };
        }
      };
    }

    // INSERT INTO payments ... VALUES (?, ?, ?, ?, ?, ?, ?)
    if (cleanSql.startsWith("INSERT INTO payments")) {
      return {
        run: (id, invoiceId, paymentDate, paymentMethod, paymentSource, amount, transactionReference) => {
          payments.push({
            id,
            invoice_id: invoiceId,
            payment_date: paymentDate,
            payment_method: paymentMethod,
            payment_source: paymentSource,
            amount,
            transaction_reference: transactionReference,
            created_at: new Date().toISOString()
          });
          return { changes: 1 };
        }
      };
    }

    // UPDATE inventory_items SET status = ? WHERE id = ?
    if (cleanSql.startsWith("UPDATE inventory_items SET status = ? WHERE id = ?")) {
      return {
        run: (status, itemId) => {
          const item = inventoryItems.find((i) => i.id === itemId);
          if (item) {
            item.status = status;
          }
          return { changes: item ? 1 : 0 };
        }
      };
    }

    return {
      get: () => null,
      all: () => [],
      run: () => ({ changes: 0 })
    };
  }
};
