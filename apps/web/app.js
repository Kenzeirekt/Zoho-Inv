const state = {
  page: "dashboard",
  viewMode: localStorage.getItem("stockwise-view-mode") || "simulator",
  role: localStorage.getItem("stockwise-role") || "manager",
  items: [],
  selectedItem: null,
  payments: [],
  searchQuery: "",
  statusFilter: "all",
  // Subcategories
  subcategories: {
    "Food & Beverage": ["Grains & Pulses", "Oils", "Sweeteners", "Beverages", "Cereal", "Spices", "Dairy & Bakery", "Snacks"],
    "Garden Supplies": ["Fertilizers & Soil", "Seeds & Bulbs", "Tools & Equipment", "Pest Control", "Pots & Planters"],
    "Housekeeping": ["Cleaning Agents", "Paper & Disposables", "Linens & Towels", "Waste Management"],
    "Maintenance": ["Electrical", "Plumbing", "Hardware & Tools", "Paints & Solvents"]
  },
  intakeCategory: "Food & Beverage",
  intakeSubcategory: "Grains & Pulses",
  intakeImage: null,
  showSubcatCreator: false,
  // Voice Recording state
  recording: {
    active: false,
    target: null,
    timer: 0,
    intervalId: null,
    recorder: null,
    chunks: []
  },
  aiAnalyzing: false,
  // 10-Point Comprehensive Mobile Test Suite
  testRunning: false,
  testResults: [
    { id: "health", title: "API Health & Connectivity", method: "GET", endpoint: "/health", status: "pending", desc: "Verifies backend server response and latency" },
    { id: "mobile_status", title: "Capacitor Mobile Parity", method: "GET", endpoint: "/api/mobile-status", status: "pending", desc: "Validates Capacitor 7 configuration and web bundle readiness" },
    { id: "fetch_items", title: "Fetch Inventory Items", method: "GET", endpoint: "/api/items", status: "pending", desc: "Retrieves items list and validates data schema" },
    { id: "subcategories_api", title: "Manager Subcategories API", method: "GET", endpoint: "/api/subcategories", status: "pending", desc: "Fetches and verifies category to subcategory dropdown mappings" },
    { id: "add_subcategory", title: "Add Custom Subcategory", method: "POST", endpoint: "/api/subcategories", status: "pending", desc: "Validates manager dynamic subcategory creation" },
    { id: "unicode_intake", title: "Unicode Intake with Photo", method: "POST", endpoint: "/api/items", status: "pending", desc: "Tests creating stock items with Bengali/Hindi Unicode text and image thumbnail" },
    { id: "unicode_search", title: "Unicode Search & Filtering", method: "GET", endpoint: "/api/items?search=...", status: "pending", desc: "Tests warehouse item search using native Unicode characters" },
    { id: "reconciliation", title: "Multi-Payment Reconciliation", method: "POST", endpoint: "/api/items/:id/reconciliation", status: "pending", desc: "Verifies invoice matching and split payment recording (UPI/Cash)" },
    { id: "verify_item", title: "Reconciliation State Check", method: "GET", endpoint: "/api/items/:id", status: "pending", desc: "Confirms item status transitioned to reconciled with invoice details" },
    { id: "ai_analyze_test", title: "AI Assistant Multimodal Readiness", method: "POST", endpoint: "/api/ai/analyze-image", status: "pending", desc: "Validates AI endpoint responsiveness and schema parsing" }
  ]
};

const app = document.querySelector("#app");
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]);
const money = (value) => `₹ ${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const visibleItems = () => state.role === "manager" ? state.items : state.items.filter((item) => item.category === "Food & Beverage");

function renderItemThumbnail(item) {
  if (item.image) {
    return `<div class="item-thumb" style="overflow:hidden;padding:0;background:#e2e8f0"><img src="${item.image}" alt="Product" style="width:100%;height:100%;object-fit:cover;border-radius:10px" /></div>`;
  }
  const defaultEmoji = { "Grains & Pulses": "🌾", Oils: "🫗", Sweeteners: "🧂", Beverages: "🍵", Cereal: "🌰", Spices: "🟠", "Dairy & Bakery": "🥛", Snacks: "🍿" }[item.subcategory] || "📦";
  return `<div class="item-thumb">${defaultEmoji}</div>`;
}

const safeFetch = (typeof window !== "undefined" && window.fetch ? window.fetch : fetch).bind(window);

const api = async (path, options = {}) => {
  const response = await safeFetch(`/api${path}`, { headers: { "Content-Type": "application/json" }, ...options });
  if (!response.ok) {
    let errMsg = "Request failed";
    try {
      const errJson = await response.json();
      errMsg = errJson.error || errMsg;
    } catch (_) {}
    throw new Error(errMsg);
  }
  return response.json();
};

const showError = (error) => showToast(error.message || "Something went wrong");

function render() {
  const pendingCount = visibleItems().filter((item) => item.status === "pending").length;
  const passCount = state.testResults.filter((t) => t.status === "passed").length;

  app.innerHTML = `
    <!-- Top Simulator Control Header -->
    <header class="sim-top-nav">
      <div class="sim-brand">
        <div class="brand-mark" style="width:32px;height:32px;font-size:15px;border-width:1.5px">S</div>
        <div>
          <strong>Stockwise</strong>
          <small>Mobile subrepo · Capacitor 7</small>
        </div>
      </div>
      <div class="sim-controls">
        <div class="mode-toggle">
          <button id="toggle-sim" class="${state.viewMode === "simulator" ? "active" : ""}">📱 Mobile Simulator</button>
          <button id="toggle-resp" class="${state.viewMode === "responsive" ? "active" : ""}">💻 Responsive View</button>
        </div>
        <select class="role-select" id="role-select" style="min-height:34px;padding:5px 9px;font-size:12px">
          <option value="manager" ${state.role === "manager" ? "selected" : ""}>Manager View (Admin)</option>
          <option value="user" ${state.role === "user" ? "selected" : ""}>Category User</option>
        </select>
      </div>
    </header>

    ${state.viewMode === "simulator" ? renderSimulator(pendingCount) : renderResponsive(pendingCount)}
    <div class="toast" id="toast"></div>
  `;

  bindEvents();
}

function renderSimulator(pendingCount) {
  const pageTitle = {
    dashboard: "Overview",
    intake: "Stock Intake",
    selection: `Reconciliation (${pendingCount})`,
    reconciliation: "Reconcile Item"
  }[state.page] || "Overview";

  return `
    <div class="simulator-canvas">
      <div class="mobile-device-frame">
        <!-- Phone Status Bar -->
        <div class="phone-status-bar">
          <span id="phone-clock">9:41</span>
          <div class="phone-island">
            <span class="phone-island-camera"></span>
            <span class="phone-island-sensor"></span>
          </div>
          <div class="phone-status-icons">
            <span>5G</span>
            <span>●●●</span>
            <span>100%</span>
          </div>
        </div>

        <!-- Mobile App Bar Header -->
        <div class="mobile-topbar">
          <div class="mobile-topbar-title">
            ${state.page === "reconciliation" ? `<button type="button" class="button secondary" style="min-height:32px;padding:4px 8px;font-size:12px" data-page="selection">←</button>` : `<div class="brand-mark" style="width:28px;height:28px;font-size:13px;border-width:1.5px">S</div>`}
            <div>
              <div style="font-size:10px;opacity:0.8;font-weight:700;letter-spacing:0.5px;text-transform:uppercase">Stockwise Mobile</div>
              <h2>${pageTitle}</h2>
            </div>
          </div>
          <div class="mobile-topbar-actions">
            ${state.page !== "intake" ? `<button class="button secondary" style="min-height:32px;padding:4px 10px;font-size:11px" data-page="intake">＋ Add</button>` : ""}
          </div>
        </div>

        <!-- Phone Scrollable Screen -->
        <div class="phone-screen" id="phone-screen">
          <div class="mobile-content">
            ${renderCurrentPage()}
          </div>
        </div>

        <!-- Fixed Bottom Tab Bar -->
        <nav class="mobile-tab-bar">
          <button class="tab-item ${state.page === "dashboard" ? "active" : ""}" data-page="dashboard">
            <span class="tab-icon">⌂</span>
            <span class="tab-label">Home</span>
          </button>
          <button class="tab-item ${state.page === "intake" ? "active" : ""}" data-page="intake">
            <span class="tab-icon">＋</span>
            <span class="tab-label">Intake</span>
          </button>
          <button class="tab-item ${state.page === "selection" || state.page === "reconciliation" ? "active" : ""}" data-page="selection">
            <span class="tab-icon">☷</span>
            <span class="tab-label">Queue</span>
            ${pendingCount > 0 ? `<span class="tab-badge">${pendingCount}</span>` : ""}
          </button>
        </nav>

        <!-- Home Indicator Pill -->
        <div class="phone-home-indicator"></div>
      </div>
    </div>
  `;
}

function renderResponsive(pendingCount) {
  const nav = [
    ["dashboard", "⌂", "Overview"],
    ["intake", "＋", "Inventory Intake"],
    ["selection", "☷", `Reconciliation (${pendingCount})`]
  ];

  return `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="brand">
          <div class="brand-mark">S</div>
          <div>
            <strong>Stockwise</strong>
            <small>Inventory control</small>
          </div>
        </div>
        <nav class="nav">
          ${nav.map(([page, icon, label]) => `
            <button class="${state.page === page ? "active" : ""}" data-page="${page}">
              <span class="nav-icon">${icon}</span>
              <span>${label}</span>
            </button>
          `).join("")}
        </nav>
        <div class="sidebar-footer">
          <div class="profile">
            <span class="avatar">${state.role === "manager" ? "AM" : "RG"}</span>
            <span>${state.role === "manager" ? "Anirban Mukherjee" : "Riya Gardener"}</span>
          </div>
          <div>${state.role === "manager" ? "Manager access (Admin)" : "Category user access"}</div>
        </div>
      </aside>

      <main class="main">
        <header class="topbar">
          <div>
            <div class="eyebrow">Inventory workspace</div>
            <h1>${state.page === "dashboard" ? "Good morning, Anirban" : nav.find((item) => item[0] === state.page)?.[2] || "Reconciliation"}</h1>
          </div>
          <div class="top-actions">
            <button class="button primary" data-page="intake">＋ Add item</button>
          </div>
        </header>
        <section class="content">
          ${renderCurrentPage()}
        </section>
      </main>
    </div>
  `;
}

function renderCurrentPage() {
  switch (state.page) {
    case "dashboard": return dashboardPage();
    case "intake": return intakePage();
    case "selection": return selectionPage();
    case "reconciliation": return reconciliationPage();
    default: return dashboardPage();
  }
}

function dashboardPage() {
  const items = visibleItems();
  const pending = items.filter((item) => item.status === "pending").length;
  const categories = [...new Set(items.map((item) => item.category))].length;
  const totalUnits = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);

  return `
    <div class="stats">
      <div class="stat-card">
        <span class="stat-label">Total inventory</span>
        <strong class="stat-value">${items.length}</strong>
        <div class="stat-note">Across warehouse</div>
      </div>
      <div class="stat-card">
        <span class="stat-label">Pending reconciliation</span>
        <strong class="stat-value" style="color:#ad6810">${pending}</strong>
        <div class="stat-note">Needs invoice match</div>
      </div>
      <div class="stat-card">
        <span class="stat-label">Units in stock</span>
        <strong class="stat-value">${totalUnits.toLocaleString("en-IN")}</strong>
        <div class="stat-note">Current recorded qty</div>
      </div>
      <div class="stat-card">
        <span class="stat-label">Active categories</span>
        <strong class="stat-value">${categories}</strong>
        <div class="stat-note">${state.role === "manager" ? "Manager visibility" : "Category visibility"}</div>
      </div>
    </div>

    <div class="toolbar">
      <div>
        <div class="eyebrow">Attention Required</div>
        <h2>Items Needing Reconciliation</h2>
      </div>
      <button class="button secondary" data-page="selection">View all items →</button>
    </div>

    <div class="panel" style="padding:14px">
      ${items.filter((item) => item.status === "pending").slice(0, 6).map(mobileItemRow).join("") || '<div class="empty">All items are reconciled!</div>'}
    </div>
  `;
}

function mobileItemRow(item) {
  return `
    <div class="mobile-item-card">
      <div class="mobile-card-top">
        <div style="display:flex;gap:11px;align-items:center;min-width:0">
          ${renderItemThumbnail(item)}
          <div style="min-width:0">
            <div class="item-name" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(item.description)}</div>
            <div class="item-meta">${esc(item.category)} · ${esc(item.subcategory)} · ${esc(item.location)}</div>
          </div>
        </div>
        <span class="badge ${item.status}">${item.status === "pending" ? "Pending" : "Reconciled"}</span>
      </div>
      <div class="mobile-card-body">
        <div>
          <span style="font-size:11px;color:var(--muted);font-weight:600">Stock:</span>
          <strong style="font-size:14px;color:var(--ink)">${item.quantity} ${item.unit}</strong>
        </div>
        <button class="button ${item.status === "pending" ? "primary" : "secondary"}" style="min-height:34px;padding:5px 12px;font-size:12px" data-reconcile="${item.id}">
          ${item.status === "pending" ? "Reconcile →" : "View Invoice"}
        </button>
      </div>
    </div>
  `;
}

function intakePage() {
  const today = new Date().toISOString().split("T")[0];
  const activeSubs = state.subcategories[state.intakeCategory] || [];

  return `
    <div class="panel">
      <div class="detail-header">
        <div>
          <h2>Add Inventory Item</h2>
          <p>Capture received stock with photos, voice transcription & smart auto-fill.</p>
        </div>
        <span class="badge pending">Pending</span>
      </div>

      <!-- AI Smart Intake Assistant Banner -->
      <div class="ai-smart-banner" style="margin-top:14px">
        <div class="ai-smart-header">
          <strong>✨ AI Multimodal Intake Assistant</strong>
          <span style="font-size:10px;background:#c2e8da;color:#0e5a47;padding:2px 6px;border-radius:4px;font-weight:700">Gemini 3.8 Flash</span>
        </div>
        <div style="font-size:11.5px;color:#28564b">
          Speak in Bengali, Hindi, or English, or upload packaging photos to auto-populate all fields.
        </div>
        <div class="ai-smart-actions">
          <button type="button" class="button primary" id="ai-voice-all-btn" style="min-height:34px;padding:5px 11px;font-size:11.5px">
            🎙️ Speak Full Intake (AI Fill)
          </button>
          <button type="button" class="button secondary" id="trigger-camera-btn" style="min-height:34px;padding:5px 11px;font-size:11.5px">
            📷 Camera / Gallery Scan
          </button>
        </div>
        ${state.recording.active && state.recording.target === "whole_intake" ? `
          <div class="voice-recording-banner">
            <div style="display:flex;align-items:center;gap:7px">
              <span class="recording-pulse-dot"></span>
              <strong>Listening to full intake... (${state.recording.timer}s)</strong>
            </div>
            <button type="button" class="button primary" id="stop-voice-btn" style="min-height:28px;padding:2px 8px;font-size:11px;background:#dc2626">
              ⏹ Done / Process
            </button>
          </div>
        ` : ""}
      </div>

      <form id="intake-form">
        <!-- Image from Camera / Gallery Slot -->
        <div class="section-title">📷 Product Image (Camera / Gallery)</div>
        <input type="file" id="intake-file-input" accept="image/*" style="display:none" />
        
        <div class="image-upload-slot" id="upload-slot-area">
          ${state.intakeImage ? `
            <div class="image-upload-preview">
              <img src="${state.intakeImage}" alt="Captured item photo" />
            </div>
            <div class="image-upload-btn-row">
              <button type="button" class="button primary" id="ai-analyze-img-btn" style="min-height:32px;padding:4px 10px;font-size:11.5px" ${state.aiAnalyzing ? "disabled" : ""}>
                ${state.aiAnalyzing ? "⏳ Analyzing Image..." : "✨ AI Auto-Fill from Image"}
              </button>
              <button type="button" class="button secondary" id="reselect-image-btn" style="min-height:32px;padding:4px 10px;font-size:11.5px">
                Change Photo
              </button>
              <button type="button" class="button danger" id="remove-image-btn" style="min-height:32px;padding:4px 10px;font-size:11.5px">
                Remove
              </button>
            </div>
          ` : `
            <div style="font-size:26px;margin-bottom:4px">📸</div>
            <strong style="font-size:13px;display:block">Take Photo or Upload from Gallery</strong>
            <div style="font-size:11px;color:var(--muted);margin-top:2px">Tap here to capture packaging, carton label, or receipt</div>
          `}
        </div>

        <div class="section-title">▦ Item Details</div>
        <div class="form-grid">
          <div class="field">
            <label>Date Received *</label>
            <input name="entered" id="intake-date" type="date" value="${today}" required>
          </div>
          <div class="field">
            <label>Recorded By</label>
            <input value="${state.role === "manager" ? "Anirban Mukherjee (Manager / Admin)" : "Riya Gardener (Category User)"}" disabled style="background:#f8faf9">
          </div>

          <!-- Category Select -->
          <div class="field">
            <label>Category *</label>
            <select name="category" id="intake-category-select" required>
              <option value="Food & Beverage" ${state.intakeCategory === "Food & Beverage" ? "selected" : ""}>Food & Beverage</option>
              <option value="Garden Supplies" ${state.intakeCategory === "Garden Supplies" ? "selected" : ""}>Garden Supplies</option>
              <option value="Housekeeping" ${state.intakeCategory === "Housekeeping" ? "selected" : ""}>Housekeeping</option>
              <option value="Maintenance" ${state.intakeCategory === "Maintenance" ? "selected" : ""}>Maintenance</option>
            </select>
          </div>

          <!-- Subcategory Dropdown (Manager/Admin configurable) -->
          <div class="field">
            <div class="subcat-label-row">
              <label style="margin:0">Subcategory *</label>
              ${state.role === "manager" ? `
                <button type="button" class="subcat-manage-btn" id="toggle-subcat-creator">
                  ${state.showSubcatCreator ? "✕ Close" : "⚙ + Add Subcategory"}
                </button>
              ` : `<small style="color:var(--muted);font-size:10px">Admin configured</small>`}
            </div>
            <select name="subcategory" id="intake-subcategory-select" required>
              ${activeSubs.map((sub) => `<option value="${esc(sub)}" ${state.intakeSubcategory === sub ? "selected" : ""}>${esc(sub)}</option>`).join("")}
            </select>

            <!-- Inline Manager Subcategory Creator -->
            ${state.showSubcatCreator && state.role === "manager" ? `
              <div class="subcat-creator-box">
                <input id="new-subcat-input" placeholder="New subcategory name..." style="min-height:34px;padding:4px 8px;font-size:12px;flex:1" />
                <button type="button" class="button primary" id="save-new-subcat-btn" style="min-height:34px;padding:4px 10px;font-size:12px">Save</button>
              </div>
            ` : ""}
          </div>

          <!-- Description / Product Name in full Unicode with Voice Transcription -->
          <div class="field full">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px">
              <label style="margin:0">Description / Product Name (Supports Bengali, Hindi, English & Unicode) *</label>
              <span style="font-size:10.5px;color:var(--green);font-weight:700">🌐 Multilingual Unicode</span>
            </div>
            <div class="input-with-voice">
              <input name="description" id="intake-desc" placeholder="e.g. বাসমতী চাল, Sunflower Oil, मसूर दाल" required>
              <button type="button" class="mic-btn ${state.recording.active && state.recording.target === "description" ? "recording" : ""}" id="voice-desc-btn" title="Voice record description">
                ${state.recording.active && state.recording.target === "description" ? "⏹" : "🎙️"}
              </button>
            </div>
            ${state.recording.active && state.recording.target === "description" ? `
              <div class="voice-recording-banner">
                <div style="display:flex;align-items:center;gap:7px">
                  <span class="recording-pulse-dot"></span>
                  <strong>Recording product name... (${state.recording.timer}s)</strong>
                </div>
                <button type="button" class="button primary" id="stop-voice-btn" style="min-height:28px;padding:2px 8px;font-size:11px;background:#dc2626">
                  Stop & Transcribe
                </button>
              </div>
            ` : ""}
            <div class="unicode-chips">
              <span class="unicode-chip" data-fill="বাসমতী চাল (Basmati Rice)">🌾 বাসমতী চাল</span>
              <span class="unicode-chip" data-fill="সূর্যমুখী তেল (Sunflower Oil)">🫗 সূর্যমুখী তেল</span>
              <span class="unicode-chip" data-fill="मसूर दाल (Masoor Dal)">🌾 मसूर दाल</span>
              <span class="unicode-chip" data-fill="দার্জিলিং চা (Darjeeling Tea)">🍵 দার্জিলিং চা</span>
              <span class="unicode-chip" data-fill="हल्दी पाउडर (Turmeric Powder)">🟠 हल्दी पाउडर</span>
            </div>
          </div>

          <!-- Quantity with Touch Stepper -->
          <div class="field">
            <label>Quantity *</label>
            <input name="quantity" id="intake-qty-input" type="number" min="0.1" step="0.1" value="10" required>
            <div class="stepper-container">
              <button type="button" class="stepper-btn" data-step="-5">-5</button>
              <button type="button" class="stepper-btn" data-step="-1">-1</button>
              <button type="button" class="stepper-btn" data-step="+1">+1</button>
              <button type="button" class="stepper-btn" data-step="+5">+5</button>
            </div>
          </div>

          <!-- Unit of Measure -->
          <div class="field">
            <label>Unit of Measure *</label>
            <select name="unit" id="intake-unit">
              <option value="kg">kg</option>
              <option value="L">L</option>
              <option value="packet">packet</option>
              <option value="piece">piece</option>
              <option value="box">box</option>
            </select>
          </div>

          <!-- Warehouse Location -->
          <div class="field">
            <label>Warehouse Location *</label>
            <select name="location" id="intake-location">
              <option value="Main Warehouse">Main Warehouse</option>
              <option value="Store Room A">Store Room A</option>
              <option value="Store Room B">Store Room B</option>
              <option value="Cold Storage">Cold Storage</option>
            </select>
          </div>

          <!-- Pack Dimension -->
          <div class="field">
            <label>Pack Dimension</label>
            <input name="pack" id="intake-pack" placeholder="e.g. 5x2kg Packets">
          </div>

          <!-- Special Notes with Voice Transcription -->
          <div class="field full">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px">
              <label style="margin:0">Special Notes / Inspection Comments</label>
              <button type="button" class="mic-btn" id="voice-notes-btn" style="position:static;transform:none;width:auto;height:26px;padding:2px 8px;font-size:11px" title="Voice record notes">
                ${state.recording.active && state.recording.target === "notes" ? "⏹ Stop" : "🎙️ Dictate Notes"}
              </button>
            </div>
            <textarea name="notes" id="intake-notes" placeholder="Batch condition, quality seal check, vendor comments..."></textarea>
            ${state.recording.active && state.recording.target === "notes" ? `
              <div class="voice-recording-banner">
                <div style="display:flex;align-items:center;gap:7px">
                  <span class="recording-pulse-dot"></span>
                  <strong>Recording notes... (${state.recording.timer}s)</strong>
                </div>
                <button type="button" class="button primary" id="stop-voice-btn" style="min-height:28px;padding:2px 8px;font-size:11px;background:#dc2626">
                  Stop & Transcribe
                </button>
              </div>
            ` : ""}
          </div>
        </div>

        <div class="form-actions" style="margin-top:20px">
          <button type="button" class="button secondary" data-page="dashboard" style="flex:1">Cancel</button>
          <button type="submit" class="button primary" style="flex:2">Save Inventory Item</button>
        </div>
      </form>
    </div>
  `;
}

function selectionPage() {
  const items = visibleItems();
  const filtered = items.filter((item) => {
    const q = (state.searchQuery || "").toLowerCase();
    const matchesQuery = !q || item.description?.toLowerCase().includes(q) || item.category?.toLowerCase().includes(q) || item.location?.toLowerCase().includes(q);
    const matchesStatus = state.statusFilter === "all" || item.status === state.statusFilter;
    return matchesQuery && matchesStatus;
  });

  return `
    <div class="toolbar">
      <div>
        <div class="eyebrow">Inventory Queue</div>
        <h2>Select Item to Reconcile</h2>
      </div>
      <button class="button primary" data-page="intake">＋ Add Item</button>
    </div>

    <div class="panel" style="padding:15px">
      <div class="filters" style="margin-bottom:14px">
        <input class="search" id="item-search" placeholder="⌕ Search items, category, location (supports বাংলা/हिंदी)..." value="${esc(state.searchQuery)}">
        <select id="status-filter" style="width:auto;min-width:140px">
          <option value="all" ${state.statusFilter === "all" ? "selected" : ""}>All Statuses</option>
          <option value="pending" ${state.statusFilter === "pending" ? "selected" : ""}>Pending Only</option>
          <option value="reconciled" ${state.statusFilter === "reconciled" ? "selected" : ""}>Reconciled Only</option>
        </select>
      </div>

      <div id="item-list-container">
        ${filtered.length ? filtered.map(mobileItemRow).join("") : '<div class="empty">No inventory items match your search.</div>'}
      </div>
    </div>
  `;
}

function reconciliationPage() {
  const item = state.selectedItem;
  if (!item) return selectionPage();

  const unitPrice = 120.00;
  const subtotal = unitPrice * (item.quantity || 1);
  const discount = 50.00;
  const tax = Number((subtotal * 0.18).toFixed(2));
  const other = 30.00;
  const total = subtotal - discount + tax + other;

  if (!state.payments.length) {
    state.payments = [
      { date: "2026-09-16", method: "UPI", source: "Business Bank A/c", amount: Math.min(1000, total) }
    ];
  }

  const paid = state.payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const outstanding = Math.max(0, total - paid);

  return `
    <div class="panel">
      <div class="detail-header">
        <div style="display:flex;align-items:center;gap:12px">
          ${renderItemThumbnail(item)}
          <div>
            <h2>Reconcile ${esc(item.description)}</h2>
            <p>${esc(item.category)} · ${esc(item.subcategory)} · Current Stock: ${item.quantity} ${item.unit}</p>
          </div>
        </div>
        <button class="button secondary" data-page="selection">← Back to Queue</button>
      </div>

      <form id="reconcile-form" style="margin-top:14px">
        <div class="section-title blue">▣ Supplier & Invoice Details</div>
        <div class="form-grid">
          <div class="field">
            <label>Invoice Date *</label>
            <input id="inv-date" type="date" value="2026-09-16" required>
          </div>
          <div class="field">
            <label>Invoice Number *</label>
            <input id="inv-number" value="INV-2026-${item.id.replace(/[^0-9]/g, "").slice(0, 4) || "0916"}" required>
          </div>
          <div class="field">
            <label>Supplier / Vendor *</label>
            <select id="inv-supplier">
              <option>Sharma Traders Pvt Ltd</option>
              <option>Fresh Mart Wholesale</option>
              <option>National Agro Supplies</option>
            </select>
          </div>
          <div class="field">
            <label>Purchase Method *</label>
            <select id="inv-method">
              <option>Local Market</option>
              <option>Direct Supplier</option>
              <option>Online Marketplace</option>
            </select>
          </div>
        </div>

        <div class="section-title amber">▤ Financial Details</div>
        <div class="financial-summary">
          <div class="money-card total">
            <small>Total Invoice Amount</small>
            <strong>${money(total)}</strong>
          </div>
          <div class="money-card">
            <small>Total Paid</small>
            <strong>${money(paid)}</strong>
          </div>
          <div class="money-card outstanding">
            <small>Outstanding Balance</small>
            <strong>${money(outstanding)}</strong>
          </div>
        </div>

        <div class="section-title purple" style="justify-content:space-between">
          <span>₹ Payment Details</span>
          <button type="button" class="button secondary" style="min-height:30px;padding:3px 9px;font-size:11px" id="add-payment-btn">＋ Add Split Payment</button>
        </div>
        <div class="payment-list">
          ${state.payments.map((p, idx) => `
            <div class="payment-row">
              <span><strong>#${idx + 1}</strong> ${p.date}</span>
              <span>${p.method}</span>
              <span>${p.source}</span>
              <strong style="color:var(--green-dark)">${money(p.amount)}</strong>
              <button type="button" class="button danger" style="min-height:28px;padding:2px 7px;font-size:11px" data-remove-payment="${idx}">✕</button>
            </div>
          `).join("")}
        </div>

        <div class="section-title">✓ Reconciliation Status & Stock Match</div>
        <div class="form-grid">
          <div class="field">
            <label>Physical Quantity Verified *</label>
            <input value="${item.quantity}" type="number" step="0.1" required>
          </div>
          <div class="field">
            <label>Update Status to *</label>
            <select id="reconcile-status">
              <option value="reconciled" selected>Reconciled (Matched)</option>
              <option value="pending">Pending Further Verification</option>
            </select>
          </div>
          <div class="field full">
            <label>Reconciliation Notes (Optional)</label>
            <textarea id="reconcile-notes" placeholder="Invoice matches physical stock intake. Quality approved."></textarea>
          </div>
        </div>

        <div class="form-actions">
          <button type="button" class="button secondary" data-page="selection" style="flex:1">Cancel</button>
          <button type="submit" class="button primary" style="flex:2">Confirm & Save Reconciliation</button>
        </div>
      </form>
    </div>
  `;
}

function testsPage() {
  const total = state.testResults.length;
  const passed = state.testResults.filter((t) => t.status === "passed").length;
  const failed = state.testResults.filter((t) => t.status === "failed").length;

  return `
    <div class="toolbar">
      <div>
        <div class="eyebrow">Mobile Diagnostic Suite</div>
        <h2>Capacitor Mobile & AI Functional Tests</h2>
      </div>
      <button class="button primary" id="trigger-all-tests" ${state.testRunning ? "disabled" : ""}>
        ${state.testRunning ? "Running Suite..." : "▶ Run All Tests"}
      </button>
    </div>

    <div class="test-header-card">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <strong style="font-size:15px">Stockwise Mobile & AI Functional Verification</strong>
          <div style="font-size:12px;color:var(--muted);margin-top:2px">Validates Capacitor 7 Android config, Unicode storage, manager subcategories, split reconciliation, and AI endpoints.</div>
        </div>
      </div>
      <div class="test-stat-strip">
        <div class="test-stat-box">
          <strong>${total}</strong>
          <small>Total Tests</small>
        </div>
        <div class="test-stat-box pass">
          <strong>${passed}</strong>
          <small>Passed</small>
        </div>
        <div class="test-stat-box fail">
          <strong>${failed}</strong>
          <small>Failed</small>
        </div>
      </div>
    </div>

    <div class="test-list">
      ${state.testResults.map((t, idx) => `
        <div class="test-card ${t.status}">
          <div class="test-title-row">
            <div class="test-title-left">
              <span>${t.status === "passed" ? "✅" : t.status === "failed" ? "❌" : t.status === "running" ? "⏳" : "○"}</span>
              <span class="test-method-pill ${t.method.toLowerCase()}">${t.method}</span>
              <span>${idx + 1}. ${esc(t.title)}</span>
            </div>
            <div style="font-size:11px;color:var(--muted);font-weight:700">
              ${t.duration ? `${t.duration}` : t.status}
            </div>
          </div>
          <div style="font-size:12px;color:var(--muted);margin-top:5px">${esc(t.desc)}</div>
          ${t.details ? `
            <div class="test-detail-box">
              ${typeof t.details === "object" ? JSON.stringify(t.details, null, 2) : esc(t.details)}
            </div>
          ` : ""}
          ${t.error ? `<div class="test-detail-box" style="color:var(--danger);background:#fff1f3">${esc(t.error)}</div>` : ""}
        </div>
      `).join("")}
    </div>
  `;
}

// Media Audio Recording
async function startVoiceRecording(targetField) {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    state.recording.chunks = [];
    const mediaRecorder = new MediaRecorder(stream);
    state.recording.recorder = mediaRecorder;
    state.recording.active = true;
    state.recording.target = targetField;
    state.recording.timer = 0;

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) state.recording.chunks.push(e.data);
    };

    mediaRecorder.onstop = async () => {
      clearInterval(state.recording.intervalId);
      stream.getTracks().forEach((track) => track.stop());
      const audioBlob = new Blob(state.recording.chunks, { type: mediaRecorder.mimeType || "audio/webm" });
      await processRecordedAudio(audioBlob, targetField);
    };

    mediaRecorder.start();
    state.recording.intervalId = setInterval(() => {
      state.recording.timer += 1;
      render();
    }, 1000);
    render();
  } catch (err) {
    console.error("Microphone access error:", err);
    showToast("Microphone access denied or unavailable");
    state.recording.active = false;
    render();
  }
}

function stopVoiceRecording() {
  if (state.recording.recorder && state.recording.recorder.state !== "inactive") {
    state.recording.recorder.stop();
  }
  state.recording.active = false;
  clearInterval(state.recording.intervalId);
  render();
}

async function processRecordedAudio(audioBlob, targetField) {
  showToast("⏳ Transcribing audio with Gemini...");
  try {
    const reader = new FileReader();
    reader.readAsDataURL(audioBlob);
    reader.onloadend = async () => {
      const base64Audio = reader.result;
      if (targetField === "whole_intake") {
        const result = await api("/ai/analyze-voice", {
          method: "POST",
          body: JSON.stringify({ audioData: base64Audio, mimeType: audioBlob.type })
        });
        if (result.description) {
          const descInput = document.querySelector("#intake-desc");
          if (descInput) descInput.value = result.description;
        }
        if (result.category && state.subcategories[result.category]) {
          state.intakeCategory = result.category;
          const catSelect = document.querySelector("#intake-category-select");
          if (catSelect) catSelect.value = result.category;
        }
        if (result.subcategory) {
          state.intakeSubcategory = result.subcategory;
          const subSelect = document.querySelector("#intake-subcategory-select");
          if (subSelect) subSelect.value = result.subcategory;
        }
        if (result.quantity) {
          const qtyInput = document.querySelector("#intake-qty-input");
          if (qtyInput) qtyInput.value = result.quantity;
        }
        if (result.unit) {
          const unitSelect = document.querySelector("#intake-unit");
          if (unitSelect) unitSelect.value = result.unit;
        }
        if (result.location) {
          const locSelect = document.querySelector("#intake-location");
          if (locSelect) locSelect.value = result.location;
        }
        if (result.notes) {
          const notesText = document.querySelector("#intake-notes");
          if (notesText) notesText.value = result.notes;
        }
        showToast("✨ AI auto-populated intake fields from voice!");
        render();
      } else {
        const result = await api("/ai/transcribe-voice", {
          method: "POST",
          body: JSON.stringify({ audioData: base64Audio, mimeType: audioBlob.type })
        });
        if (targetField === "description") {
          const descInput = document.querySelector("#intake-desc");
          if (descInput) descInput.value = result.text || "";
        } else if (targetField === "notes") {
          const notesText = document.querySelector("#intake-notes");
          if (notesText) notesText.value = result.text || "";
        }
        showToast("✓ Voice transcribed");
        render();
      }
    };
  } catch (err) {
    showError(err);
  }
}

// AI Image Scanner
async function analyzeUploadedImage() {
  if (!state.intakeImage) return;
  state.aiAnalyzing = true;
  render();
  showToast("🔍 AI analyzing product packaging/label...");

  try {
    const result = await api("/ai/analyze-image", {
      method: "POST",
      body: JSON.stringify({ imageData: state.intakeImage, mimeType: "image/jpeg" })
    });

    if (result.description) {
      const descInput = document.querySelector("#intake-desc");
      if (descInput) descInput.value = result.description;
    }
    if (result.category && state.subcategories[result.category]) {
      state.intakeCategory = result.category;
      const catSelect = document.querySelector("#intake-category-select");
      if (catSelect) catSelect.value = result.category;
    }
    if (result.subcategory) {
      state.intakeSubcategory = result.subcategory;
      const subSelect = document.querySelector("#intake-subcategory-select");
      if (subSelect) subSelect.value = result.subcategory;
    }
    if (result.quantity) {
      const qtyInput = document.querySelector("#intake-qty-input");
      if (qtyInput) qtyInput.value = result.quantity;
    }
    if (result.unit) {
      const unitSelect = document.querySelector("#intake-unit");
      if (unitSelect) unitSelect.value = result.unit;
    }
    if (result.location) {
      const locSelect = document.querySelector("#intake-location");
      if (locSelect) locSelect.value = result.location;
    }
    if (result.notes) {
      const notesText = document.querySelector("#intake-notes");
      if (notesText) notesText.value = result.notes;
    }

    showToast("✨ AI auto-filled fields from image!");
  } catch (err) {
    showError(err);
  } finally {
    state.aiAnalyzing = false;
    render();
  }
}

async function runMobileTests() {
  if (state.testRunning) return;
  state.testRunning = true;
  state.page = "tests";
  render();

  const updateTest = (id, updates) => {
    const test = state.testResults.find((t) => t.id === id);
    if (test) Object.assign(test, updates);
    render();
  };

  try {
    // 1. Health
    updateTest("health", { status: "running" });
    const t1Start = performance.now();
    const healthRes = await fetch("/health");
    const healthJson = await healthRes.json();
    const t1Time = `${Math.round(performance.now() - t1Start)}ms`;
    if (healthRes.ok && healthJson.ok) {
      updateTest("health", { status: "passed", duration: t1Time, details: { status: "200 OK", body: healthJson } });
    } else {
      throw new Error("Health check failed");
    }

    // 2. Mobile Status
    updateTest("mobile_status", { status: "running" });
    const t2Start = performance.now();
    const mobRes = await fetch("/api/mobile-status");
    const mobJson = await mobRes.json();
    const t2Time = `${Math.round(performance.now() - t2Start)}ms`;
    if (mobRes.ok && mobJson.appId === "com.stockwise.inventory") {
      updateTest("mobile_status", { status: "passed", duration: t2Time, details: mobJson });
    } else {
      throw new Error("Capacitor configuration parity mismatch");
    }

    // 3. Fetch Items
    updateTest("fetch_items", { status: "running" });
    const t3Start = performance.now();
    const items = await api("/items");
    const t3Time = `${Math.round(performance.now() - t3Start)}ms`;
    if (Array.isArray(items) && items.length > 0) {
      state.items = items;
      updateTest("fetch_items", {
        status: "passed",
        duration: t3Time,
        details: { count: items.length, sampleItem: items[0].description, sampleId: items[0].id }
      });
    } else {
      throw new Error("No inventory items found");
    }

    // 4. Subcategories API
    updateTest("subcategories_api", { status: "running" });
    const t4Start = performance.now();
    const subcats = await api("/subcategories");
    const t4Time = `${Math.round(performance.now() - t4Start)}ms`;
    if (subcats && Array.isArray(subcats["Food & Beverage"])) {
      state.subcategories = subcats;
      updateTest("subcategories_api", {
        status: "passed",
        duration: t4Time,
        details: { categoriesLoaded: Object.keys(subcats).length, foodSubs: subcats["Food & Beverage"].length }
      });
    } else {
      throw new Error("Failed to load subcategories");
    }

    // 5. Add Custom Subcategory
    updateTest("add_subcategory", { status: "running" });
    const t5Start = performance.now();
    const testSubName = `Organic Millets (${Math.floor(Math.random() * 900 + 100)})`;
    const addSubRes = await api("/subcategories", {
      method: "POST",
      body: JSON.stringify({ category: "Food & Beverage", subcategory: testSubName })
    });
    const t5Time = `${Math.round(performance.now() - t5Start)}ms`;
    if (addSubRes && addSubRes.added === testSubName) {
      if (!state.subcategories["Food & Beverage"].includes(testSubName)) {
        state.subcategories["Food & Beverage"].push(testSubName);
      }
      updateTest("add_subcategory", {
        status: "passed",
        duration: t5Time,
        details: { addedSubcategory: testSubName, category: "Food & Beverage" }
      });
    } else {
      throw new Error("Failed to add custom subcategory");
    }

    // 6. Unicode Intake with Photo
    updateTest("unicode_intake", { status: "running" });
    const t6Start = performance.now();
    const testItemPayload = {
      description: `বাসমতী চাল প্রিমিয়াম (Basmati Rice #${Math.floor(Math.random() * 900 + 100)})`,
      category: "Food & Beverage",
      subcategory: "Grains & Pulses",
      quantity: 16,
      unit: "kg",
      location: "Main Warehouse",
      image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      notes: "প্যাকেজিং সিল ভালো আছে (Quality seal intact)",
      enteredAt: new Date().toISOString().split("T")[0],
      createdBy: "usr_manager"
    };
    const createdItem = await api("/items", {
      method: "POST",
      body: JSON.stringify(testItemPayload)
    });
    const t6Time = `${Math.round(performance.now() - t6Start)}ms`;
    if (createdItem && createdItem.id && createdItem.description.includes("বাসমতী")) {
      state.items.unshift(createdItem);
      updateTest("unicode_intake", {
        status: "passed",
        duration: t6Time,
        details: { id: createdItem.id, description: createdItem.description, hasImage: Boolean(createdItem.image) }
      });
    } else {
      throw new Error("Failed to create new Unicode item with image");
    }

    // 7. Unicode Search & Filtering
    updateTest("unicode_search", { status: "running" });
    const t7Start = performance.now();
    const filtered = await api("/items?search=বাসমতী");
    const t7Time = `${Math.round(performance.now() - t7Start)}ms`;
    if (Array.isArray(filtered) && filtered.length > 0) {
      updateTest("unicode_search", { status: "passed", duration: t7Time, details: { matchedQuery: "বাসমতী", results: filtered.length } });
    } else {
      throw new Error("Unicode search for 'বাসমতী' returned no results");
    }

    // 8. Reconciliation
    updateTest("reconciliation", { status: "running" });
    const t8Start = performance.now();
    const reconcilePayload = {
      invoiceNumber: `INV-TEST-${createdItem.id.slice(4)}`,
      invoiceDate: new Date().toISOString().split("T")[0],
      supplier: "Fresh Mart Wholesale",
      purchaseMethod: "Local Market",
      totalAmount: 1920,
      notes: "Unicode mobile automated verification invoice",
      status: "reconciled",
      payments: [
        { paymentDate: new Date().toISOString().split("T")[0], paymentMethod: "UPI", paymentSource: "Business Bank A/c", amount: 1200, transactionReference: "TXN-UPI-9941" },
        { paymentDate: new Date().toISOString().split("T")[0], paymentMethod: "Cash", paymentSource: "Petty Cash", amount: 720 }
      ]
    };
    const reconcileRes = await api(`/items/${createdItem.id}/reconciliation`, {
      method: "POST",
      body: JSON.stringify(reconcilePayload)
    });
    const t8Time = `${Math.round(performance.now() - t8Start)}ms`;
    if (reconcileRes && reconcileRes.status === "reconciled") {
      const matchInState = state.items.find((i) => i.id === createdItem.id);
      if (matchInState) matchInState.status = "reconciled";
      updateTest("reconciliation", {
        status: "passed",
        duration: t8Time,
        details: { invoiceId: reconcileRes.invoiceId, itemId: createdItem.id, status: reconcileRes.status, totalPaid: "₹ 1,920.00" }
      });
    } else {
      throw new Error("Reconciliation submission failed");
    }

    // 9. Final State & Audit Verification
    updateTest("verify_item", { status: "running" });
    const t9Start = performance.now();
    const itemDetail = await api(`/items/${createdItem.id}`);
    const t9Time = `${Math.round(performance.now() - t9Start)}ms`;
    if (itemDetail && itemDetail.item && itemDetail.item.status === "reconciled" && Array.isArray(itemDetail.payments) && itemDetail.payments.length === 2) {
      updateTest("verify_item", {
        status: "passed",
        duration: t9Time,
        details: { verifiedStatus: itemDetail.item.status, paymentsCount: itemDetail.payments.length, supplier: itemDetail.invoice.supplier }
      });
    } else {
      throw new Error("Item detail verification failed");
    }

    // 10. AI Endpoint Readiness
    updateTest("ai_analyze_test", { status: "running" });
    const t10Start = performance.now();
    const aiRes = await api("/ai/analyze-image", {
      method: "POST",
      body: JSON.stringify({
        imageData: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        mimeType: "image/png"
      })
    });
    const t10Time = `${Math.round(performance.now() - t10Start)}ms`;
    if (aiRes && aiRes.description) {
      updateTest("ai_analyze_test", {
        status: "passed",
        duration: t10Time,
        details: { parsedDescription: aiRes.description, category: aiRes.category, subcategory: aiRes.subcategory }
      });
    } else {
      throw new Error("AI analysis endpoint returned unexpected format");
    }

    showToast("All 10 tests passed successfully!");
  } catch (err) {
    console.error("Test failed:", err);
    showToast(`Test failed: ${err.message}`);
  } finally {
    state.testRunning = false;
    render();
  }
}

function bindEvents() {
  document.querySelectorAll("[data-page]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.page = btn.dataset.page;
      render();
    });
  });

  document.querySelectorAll("[data-reconcile]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const found = state.items.find((item) => item.id === btn.dataset.reconcile);
      if (found) {
        state.selectedItem = found;
        state.payments = [];
        state.page = "reconciliation";
        render();
      }
    });
  });

  document.querySelector("#toggle-sim")?.addEventListener("click", () => {
    state.viewMode = "simulator";
    localStorage.setItem("stockwise-view-mode", "simulator");
    render();
  });
  document.querySelector("#toggle-resp")?.addEventListener("click", () => {
    state.viewMode = "responsive";
    localStorage.setItem("stockwise-view-mode", "responsive");
    render();
  });

  document.querySelector("#role-select")?.addEventListener("change", (e) => {
    state.role = e.target.value;
    localStorage.setItem("stockwise-role", state.role);
    render();
  });

  document.querySelector("#run-tests-btn")?.addEventListener("click", runMobileTests);
  document.querySelector("#trigger-all-tests")?.addEventListener("click", runMobileTests);

  // Steppers
  document.querySelectorAll("[data-step]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = document.querySelector("#intake-qty-input");
      if (input) {
        const delta = parseFloat(btn.dataset.step);
        const current = parseFloat(input.value) || 0;
        input.value = Math.max(0.1, Number((current + delta).toFixed(2)));
      }
    });
  });

  // Category select change -> update subcategory options
  const catSelect = document.querySelector("#intake-category-select");
  if (catSelect) {
    catSelect.addEventListener("change", (e) => {
      state.intakeCategory = e.target.value;
      const subs = state.subcategories[state.intakeCategory] || [];
      state.intakeSubcategory = subs[0] || "";
      render();
    });
  }

  // Manager subcategory toggle & creation
  document.querySelector("#toggle-subcat-creator")?.addEventListener("click", () => {
    state.showSubcatCreator = !state.showSubcatCreator;
    render();
  });

  document.querySelector("#save-new-subcat-btn")?.addEventListener("click", async () => {
    const input = document.querySelector("#new-subcat-input");
    const name = (input?.value || "").trim();
    if (!name) return showToast("Enter subcategory name");

    try {
      await api("/subcategories", {
        method: "POST",
        body: JSON.stringify({ category: state.intakeCategory, subcategory: name })
      });
      if (!state.subcategories[state.intakeCategory].includes(name)) {
        state.subcategories[state.intakeCategory].push(name);
      }
      state.intakeSubcategory = name;
      state.showSubcatCreator = false;
      render();
      showToast(`Added subcategory "${name}"`);
    } catch (err) {
      showError(err);
    }
  });

  // Image Upload & Camera Capture handlers
  const fileInput = document.querySelector("#intake-file-input");
  const uploadArea = document.querySelector("#upload-slot-area");
  const triggerCameraBtn = document.querySelector("#trigger-camera-btn");

  const openFilePicker = () => fileInput?.click();
  if (uploadArea && !state.intakeImage) {
    uploadArea.addEventListener("click", openFilePicker);
  }
  triggerCameraBtn?.addEventListener("click", openFilePicker);
  document.querySelector("#reselect-image-btn")?.addEventListener("click", openFilePicker);

  fileInput?.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        state.intakeImage = uploadEvent.target.result;
        render();
        showToast("Image loaded. Click 'AI Auto-Fill' to extract details.");
      };
      reader.readAsDataURL(file);
    }
  });

  document.querySelector("#remove-image-btn")?.addEventListener("click", () => {
    state.intakeImage = null;
    render();
  });

  document.querySelector("#ai-analyze-img-btn")?.addEventListener("click", analyzeUploadedImage);

  // Unicode chip quick-fills
  document.querySelectorAll(".unicode-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const input = document.querySelector("#intake-desc");
      if (input) {
        input.value = chip.dataset.fill;
        input.focus();
      }
    });
  });

  // Voice Recording handlers
  document.querySelector("#voice-desc-btn")?.addEventListener("click", () => {
    if (state.recording.active) stopVoiceRecording();
    else startVoiceRecording("description");
  });

  document.querySelector("#voice-notes-btn")?.addEventListener("click", () => {
    if (state.recording.active) stopVoiceRecording();
    else startVoiceRecording("notes");
  });

  document.querySelector("#ai-voice-all-btn")?.addEventListener("click", () => {
    if (state.recording.active) stopVoiceRecording();
    else startVoiceRecording("whole_intake");
  });

  document.querySelectorAll("#stop-voice-btn").forEach((btn) => {
    btn.addEventListener("click", stopVoiceRecording);
  });

  // Search & Filter
  const searchInput = document.querySelector("#item-search");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      state.searchQuery = e.target.value;
      const listContainer = document.querySelector("#item-list-container");
      if (listContainer) {
        const items = visibleItems();
        const filtered = items.filter((item) => {
          const q = (state.searchQuery || "").toLowerCase();
          const matchesQuery = !q || item.description?.toLowerCase().includes(q) || item.category?.toLowerCase().includes(q) || item.location?.toLowerCase().includes(q);
          const matchesStatus = state.statusFilter === "all" || item.status === state.statusFilter;
          return matchesQuery && matchesStatus;
        });
        listContainer.innerHTML = filtered.length ? filtered.map(mobileItemRow).join("") : '<div class="empty">No inventory items match your search.</div>';
        listContainer.querySelectorAll("[data-reconcile]").forEach((btn) => {
          btn.addEventListener("click", () => {
            const found = state.items.find((item) => item.id === btn.dataset.reconcile);
            if (found) {
              state.selectedItem = found;
              state.payments = [];
              state.page = "reconciliation";
              render();
            }
          });
        });
      }
    });
  }

  const statusFilterSelect = document.querySelector("#status-filter");
  if (statusFilterSelect) {
    statusFilterSelect.addEventListener("change", (e) => {
      state.statusFilter = e.target.value;
      render();
    });
  }

  // Intake Form Submit
  document.querySelector("#intake-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const data = Object.fromEntries(new FormData(e.target));
      const payload = {
        description: data.description,
        category: data.category,
        subcategory: data.subcategory,
        quantity: Number(data.quantity),
        unit: data.unit,
        location: data.location,
        enteredAt: data.entered,
        image: state.intakeImage || null,
        notes: data.notes || null,
        createdBy: state.role === "manager" ? "usr_manager" : "usr_category_user"
      };
      const created = await api("/items", { method: "POST", body: JSON.stringify(payload) });
      state.items.unshift(created);
      state.intakeImage = null;
      state.page = "selection";
      render();
      showToast("Inventory item saved to warehouse");
    } catch (err) {
      showError(err);
    }
  });

  // Reconcile Form Submit
  document.querySelector("#reconcile-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!state.selectedItem) return;
    try {
      const status = document.querySelector("#reconcile-status").value;
      const invDate = document.querySelector("#inv-date")?.value || "2026-09-16";
      const invNumber = document.querySelector("#inv-number")?.value || "INV-001";
      const supplier = document.querySelector("#inv-supplier")?.value || "Sharma Traders";
      const method = document.querySelector("#inv-method")?.value || "Local Market";
      const notes = document.querySelector("#reconcile-notes")?.value || "";

      await api(`/items/${state.selectedItem.id}/reconciliation`, {
        method: "POST",
        body: JSON.stringify({
          invoiceNumber: invNumber,
          invoiceDate: invDate,
          supplier,
          purchaseMethod: method,
          totalAmount: 1400,
          notes,
          status,
          payments: state.payments.map((p) => ({
            paymentDate: p.date,
            paymentMethod: p.method,
            paymentSource: p.source,
            amount: p.amount
          }))
        })
      });

      state.selectedItem.status = status;
      state.page = "selection";
      render();
      showToast(status === "reconciled" ? "Reconciliation completed" : "Saved as pending verification");
    } catch (err) {
      showError(err);
    }
  });

  document.querySelector("#add-payment-btn")?.addEventListener("click", () => {
    state.payments.push({
      date: "2026-09-16",
      method: state.payments.length ? "Cash" : "UPI",
      source: state.payments.length ? "Petty Cash" : "Business Bank A/c",
      amount: 200
    });
    render();
  });

  document.querySelectorAll("[data-remove-payment]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.removePayment);
      state.payments.splice(idx, 1);
      render();
    });
  });
}

function showToast(message) {
  const toast = document.querySelector("#toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3000);
}

// Initial Data Fetch
Promise.all([
  api("/items"),
  api("/subcategories").catch(() => null)
]).then(([items, subs]) => {
  state.items = items;
  if (subs) state.subcategories = subs;
  render();
}).catch((err) => {
  console.error("Initial load error:", err);
  render();
  showToast("API connection error. Ensure server is active.");
});
