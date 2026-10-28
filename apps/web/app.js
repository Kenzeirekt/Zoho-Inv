const state = {
  page: "dashboard",
  role: localStorage.getItem("stockwise-role") || "manager",
  items: [],
  selectedItem: null,
  payments: []
};

const app = document.querySelector("#app");
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]);
const money = (value) => `₹ ${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const visibleItems = () => state.role === "manager" ? state.items : state.items.filter((item) => item.category === "Food & Beverage");
const iconFor = (item) => item.icon || ({ "Grains & Pulses": "🌾", Oils: "🫗", Sweeteners: "🧂", Beverages: "🍵", Cereal: "🌰", Spices: "🟠" }[item.subcategory] || "📦");
const api = async (path, options = {}) => {
  const response = await fetch(`/api${path}`, { headers: { "Content-Type": "application/json" }, ...options });
  if (!response.ok) throw new Error((await response.json()).error || "Request failed");
  return response.json();
};
const showError = (error) => showToast(error.message || "Something went wrong");

function render() {
  const pending = visibleItems().filter((item) => item.status === "pending").length;
  const nav = [
    ["dashboard", "⌂", "Overview"],
    ["intake", "＋", "Inventory Intake"],
    ["selection", "☷", `Reconciliation (${pending})`]
  ];
  app.innerHTML = `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="brand"><div class="brand-mark">S</div><div><strong>Stockwise</strong><small>Inventory control</small></div></div>
        <nav class="nav">${nav.map(([page, icon, label]) => `<button class="${state.page === page ? "active" : ""}" data-page="${page}"><span class="nav-icon">${icon}</span><span>${label}</span></button>`).join("")}</nav>
        <div class="sidebar-footer"><div class="profile"><span class="avatar">${state.role === "manager" ? "AM" : "RG"}</span><span>${state.role === "manager" ? "Anirban Mukherjee" : "Riya Gardener"}</span></div><div>${state.role === "manager" ? "Manager access" : "Category user access"}</div></div>
      </aside>
      <main class="main">
        <header class="topbar"><div><div class="eyebrow">Inventory workspace</div><h1>${state.page === "dashboard" ? "Good morning, Anirban" : nav.find((item) => item[0] === state.page)?.[2] || "Reconciliation"}</h1></div><div class="top-actions"><select class="role-select" id="role-select"><option value="manager" ${state.role === "manager" ? "selected" : ""}>Manager view</option><option value="user" ${state.role === "user" ? "selected" : ""}>Category user view</option></select><button class="button primary" data-page="intake">＋ Add item</button><button class="mobile-menu" data-page="dashboard">☰</button></div></header>
        <section class="content">
          ${state.page === "dashboard" ? dashboardPage() : ""}
          ${state.page === "intake" ? intakePage() : ""}
          ${state.page === "selection" ? selectionPage() : ""}
          ${state.page === "reconciliation" ? reconciliationPage() : ""}
        </section>
      </main>
    </div>
    <div class="toast" id="toast"></div>`;
  bindEvents();
}

function dashboardPage() {
  const items = visibleItems();
  const pending = items.filter((item) => item.status === "pending").length;
  const categories = [...new Set(items.map((item) => item.category))].length;
  return `<div class="stats">
    <div class="stat-card"><span class="stat-label">Total inventory items</span><strong class="stat-value">${items.length}</strong><div class="stat-note">Across your workspace</div></div>
    <div class="stat-card"><span class="stat-label">Pending reconciliation</span><strong class="stat-value">${pending}</strong><div class="stat-note">Needs invoice details</div></div>
    <div class="stat-card"><span class="stat-label">Units in stock</span><strong class="stat-value">${items.reduce((sum, item) => sum + item.quantity, 0)}</strong><div class="stat-note">Current recorded quantity</div></div>
    <div class="stat-card"><span class="stat-label">Active categories</span><strong class="stat-value">${categories}</strong><div class="stat-note">${state.role === "manager" ? "Manager-wide visibility" : "Your assigned categories"}</div></div>
  </div>
  <div class="toolbar"><div><div class="eyebrow">Today</div><h2>Items needing attention</h2></div><button class="button secondary" data-page="selection">View all items →</button></div>
  <div class="panel">${items.filter((item) => item.status === "pending").slice(0, 5).map(itemRow).join("") || '<div class="empty">Everything is reconciled. Nice work.</div>'}</div>`;
}

function itemRow(item) {
  return `<div class="item-cell" style="padding: 13px 0; border-bottom: 1px solid #edf1f0; justify-content: space-between">
    <div style="display:flex;gap:12px;align-items:center"><div class="item-thumb">${iconFor(item)}</div><div><div class="item-name">${esc(item.description)}</div><div class="item-meta">${esc(item.category)} · ${esc(item.subcategory)} · ${esc(item.location)}</div></div></div>
    <button class="button secondary" data-reconcile="${item.id}">Reconcile →</button>
  </div>`;
}

function intakePage() {
  return `<div class="panel"><div class="detail-header"><div><h2>Add inventory item</h2><p>Capture the stock you received before matching it to an invoice.</p></div><span class="badge pending">Initial stock → pending reconciliation</span></div>
    <form id="intake-form"><div class="section-title">▦ Item details</div><div class="form-grid">
      <div class="field"><label>Date *</label><input name="entered" type="date" value="2026-09-16" required></div>
      <div class="field"><label>Entered by</label><input value="${state.role === "manager" ? "Anirban Mukherjee" : "Riya Gardener"}" disabled></div>
      <div class="field"><label>Category *</label><select name="category" required><option>Food & Beverage</option><option>Garden Supplies</option><option>Housekeeping</option><option>Maintenance</option></select></div>
      <div class="field"><label>Subcategory *</label><input name="subcategory" placeholder="e.g. Grains & Pulses" required></div>
      <div class="field full"><label>Description *</label><input name="description" placeholder="Product name or description" required></div>
      <div class="field full"><label>Special notes</label><textarea name="notes" placeholder="Enter any special notes (optional)"></textarea></div>
      <div class="field"><label>Quantity *</label><input name="quantity" type="number" min="0" step="0.01" placeholder="0" required></div>
      <div class="field"><label>Unit of measure *</label><select name="unit"><option>kg</option><option>L</option><option>packet</option><option>piece</option><option>box</option></select></div>
      <div class="field"><label>Pack dimension</label><input name="pack" placeholder="e.g. Packet"></div>
      <div class="field"><label>Location of entry *</label><select name="location"><option>Main Warehouse</option><option>Store Room A</option><option>Store Room B</option></select></div>
    </div><div class="form-actions"><button type="button" class="button secondary" data-page="dashboard">Cancel</button><button class="button primary">Save inventory item</button></div></form></div>`;
}

function selectionPage() {
  const items = visibleItems();
  return `<div class="toolbar"><div><div class="eyebrow">Inventory queue</div><h2>Select an item to reconcile</h2></div><button class="button primary" data-page="intake">＋ Add inventory item</button></div>
    <div class="panel"><div class="filters"><input class="search" id="item-search" placeholder="⌕  Search by item name, category, or location"><select id="status-filter"><option value="all">All statuses</option><option value="pending">Pending</option><option value="reconciled">Reconciled</option></select></div><div id="item-table" class="table-wrap" style="margin-top:17px">${itemTable(items)}</div></div>`;
}

function itemTable(items) {
  if (!items.length) return '<div class="empty">No items match your filters.</div>';
  return `<table><thead><tr><th>Item</th><th>Category</th><th>Stock</th><th>Location</th><th>Entered</th><th>Status</th><th></th></tr></thead><tbody>${items.map((item) => `<tr><td><div class="item-cell"><div class="item-thumb">${iconFor(item)}</div><div><div class="item-name">${esc(item.description)}</div><div class="item-meta">${item.id}</div></div></div></td><td>${esc(item.category)}<br><span class="item-meta">${esc(item.subcategory)}</span></td><td><strong>${item.quantity}</strong> ${item.unit}</td><td>${esc(item.location)}</td><td>${item.entered || item.enteredAt}</td><td><span class="badge ${item.status}">${item.status === "pending" ? "Pending" : "Reconciled"}</span></td><td><button class="button secondary" data-reconcile="${item.id}">Open</button></td></tr>`).join("")}</tbody></table>`;
}

function reconciliationPage() {
  const item = state.selectedItem;
  if (!item) return selectionPage();
  const subtotal = 1200, discount = 50, tax = 210, other = 40, total = subtotal - discount + tax + other;
  const paid = state.payments.reduce((sum, payment) => sum + payment.amount, 0);
  return `<div class="panel"><div class="detail-header"><div><h2>Reconcile ${esc(item.description)}</h2><p>${esc(item.category)} · ${esc(item.subcategory)} · Current stock ${item.quantity} ${item.unit}</p></div><button class="button secondary" data-page="selection">← Back to queue</button></div>
    <form id="reconcile-form"><div class="section-title blue">▣ Purchase / supplier details</div><div class="form-grid three">
      <div class="field"><label>Invoice date *</label><input type="date" value="2026-09-16" required></div><div class="field"><label>Invoice number *</label><input value="INV-2026-0916" required></div><div class="field"><label>Supplier / vendor *</label><select><option>Sharma Traders</option><option>Fresh Mart Suppliers</option></select></div>
      <div class="field"><label>Supplier contact</label><input value="+91 98765 43210"></div><div class="field"><label>Purchase location</label><input value="Kolkata"></div><div class="field"><label>Purchase method *</label><select><option>Local Market</option><option>Online</option><option>Direct supplier</option></select></div>
    </div><div class="section-title amber">▤ Financial details</div><div class="form-grid three">
      <div class="field"><label>Unit price (₹) *</label><input value="120.00" type="number"></div><div class="field"><label>Quantity *</label><input value="${item.quantity}" type="number"></div><div class="field"><label>Subtotal (₹)</label><input value="${subtotal.toFixed(2)}" disabled></div>
      <div class="field"><label>Discount (₹)</label><input value="${discount.toFixed(2)}"></div><div class="field"><label>Tax / GST (₹)</label><input value="${tax.toFixed(2)}"></div><div class="field"><label>Freight / other (₹)</label><input value="${other.toFixed(2)}"></div>
    </div><div class="financial-summary"><div class="money-card total"><small>Total invoice amount</small><strong>${money(total)}</strong></div><div class="money-card"><small>Total paid</small><strong>${money(paid)}</strong></div><div class="money-card outstanding"><small>Outstanding</small><strong>${money(Math.max(0, total - paid))}</strong></div></div>
    <div class="section-title purple"><span>₹</span> Payment details <button type="button" class="button secondary" style="margin-left:auto" id="add-payment">＋ Add payment</button></div><div class="payment-list">${state.payments.length ? state.payments.map((payment, index) => `<div class="payment-row"><span>${index + 1}. ${payment.date}</span><span>${payment.method}</span><span>${payment.source}</span><span>${money(payment.amount)}</span><button type="button" class="button danger" data-remove-payment="${index}">Remove</button></div>`).join("") : '<div class="empty" style="padding:18px">No payments added yet.</div>'}</div>
    <div class="section-title">✓ Reconciliation & stock update</div><div class="form-grid"><div class="field"><label>Quantity received *</label><input value="${item.quantity}" type="number"></div><div class="field"><label>Status *</label><select id="reconcile-status"><option value="reconciled">Verified / reconciled</option><option value="pending">Pending verification</option></select></div><div class="field full"><label>Additional notes</label><textarea placeholder="Quality, terms, discrepancies, or other notes"></textarea></div></div>
    <div class="form-actions"><button type="button" class="button secondary" data-page="selection">Cancel</button><button class="button primary">Save reconciliation</button></div></form></div>`;
}

function bindEvents() {
  document.querySelectorAll("[data-page]").forEach((button) => button.addEventListener("click", () => { state.page = button.dataset.page; render(); }));
  document.querySelectorAll("[data-reconcile]").forEach((button) => button.addEventListener("click", () => { state.selectedItem = state.items.find((item) => item.id === button.dataset.reconcile); state.payments = []; state.page = "reconciliation"; render(); }));
  document.querySelector("#role-select")?.addEventListener("change", (event) => { state.role = event.target.value; localStorage.setItem("stockwise-role", state.role); render(); });
  document.querySelector("#intake-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const data = Object.fromEntries(new FormData(event.target));
      const item = await api("/items", { method: "POST", body: JSON.stringify({ ...data, quantity: Number(data.quantity), createdBy: state.role === "manager" ? "usr_manager" : "usr_category_user", enteredAt: data.entered }) });
      state.items.unshift(item);
      state.page = "selection";
      render();
      showToast("Inventory item saved");
    } catch (error) { showError(error); }
  });
  document.querySelector("#reconcile-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const status = document.querySelector("#reconcile-status").value;
      await api(`/items/${state.selectedItem.id}/reconciliation`, {
        method: "POST",
        body: JSON.stringify({
          invoiceNumber: "INV-2026-0916",
          invoiceDate: "2026-09-16",
          supplier: "Sharma Traders",
          purchaseMethod: "Local Market",
          totalAmount: 1400,
          status,
          payments: state.payments.map((payment) => ({ paymentDate: "2026-09-16", paymentMethod: payment.method, paymentSource: payment.source, amount: payment.amount }))
        })
      });
      state.selectedItem.status = status;
      state.page = "selection";
      render();
      showToast(status === "reconciled" ? "Reconciliation saved" : "Saved as pending verification");
    } catch (error) { showError(error); }
  });
  document.querySelector("#add-payment")?.addEventListener("click", () => { state.payments.push({ date: "16 Sep 2026", method: state.payments.length ? "Cash" : "UPI", source: state.payments.length ? "Petty Cash" : "Business Bank A/c", amount: state.payments.length ? 100 : 1000 }); render(); });
  document.querySelectorAll("[data-remove-payment]").forEach((button) => button.addEventListener("click", () => { state.payments.splice(Number(button.dataset.removePayment), 1); render(); }));
  const refreshTable = () => { const query = document.querySelector("#item-search")?.value.toLowerCase() || ""; const status = document.querySelector("#status-filter")?.value || "all"; const filtered = visibleItems().filter((item) => `${item.description} ${item.category} ${item.location}`.toLowerCase().includes(query) && (status === "all" || item.status === status)); const table = document.querySelector("#item-table"); if (table) table.innerHTML = itemTable(filtered); bindEvents(); };
  document.querySelector("#item-search")?.addEventListener("input", refreshTable);
  document.querySelector("#status-filter")?.addEventListener("change", refreshTable);
}

function showToast(message) { const toast = document.querySelector("#toast"); if (!toast) return; toast.textContent = message; toast.classList.add("show"); setTimeout(() => toast.classList.remove("show"), 2600); }

api("/items").then((items) => {
  state.items = items;
  render();
}).catch((error) => {
  render();
  showError(new Error("API unavailable. Start the backend with `npm run dev`."));
  console.error(error);
});
