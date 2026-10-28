(function(){const a=document.createElement("link").relList;if(a&&a.supports&&a.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))n(i);new MutationObserver(i=>{for(const r of i)if(r.type==="childList")for(const d of r.addedNodes)d.tagName==="LINK"&&d.rel==="modulepreload"&&n(d)}).observe(document,{childList:!0,subtree:!0});function o(i){const r={};return i.integrity&&(r.integrity=i.integrity),i.referrerPolicy&&(r.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?r.credentials="include":i.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function n(i){if(i.ep)return;i.ep=!0;const r=o(i);fetch(i.href,r)}})();const e={page:"dashboard",viewMode:localStorage.getItem("stockwise-view-mode")||"simulator",role:localStorage.getItem("stockwise-role")||"manager",items:[],selectedItem:null,payments:[],searchQuery:"",statusFilter:"all",subcategories:{"Food & Beverage":["Grains & Pulses","Oils","Sweeteners","Beverages","Cereal","Spices","Dairy & Bakery","Snacks"],"Garden Supplies":["Fertilizers & Soil","Seeds & Bulbs","Tools & Equipment","Pest Control","Pots & Planters"],Housekeeping:["Cleaning Agents","Paper & Disposables","Linens & Towels","Waste Management"],Maintenance:["Electrical","Plumbing","Hardware & Tools","Paints & Solvents"]},intakeCategory:"Food & Beverage",intakeSubcategory:"Grains & Pulses",intakeImage:null,showSubcatCreator:!1,recording:{active:!1,target:null,timer:0,intervalId:null,recorder:null,chunks:[]},aiAnalyzing:!1,testRunning:!1,testResults:[{id:"health",title:"API Health & Connectivity",method:"GET",endpoint:"/health",status:"pending",desc:"Verifies backend server response and latency"},{id:"mobile_status",title:"Capacitor Mobile Parity",method:"GET",endpoint:"/api/mobile-status",status:"pending",desc:"Validates Capacitor 7 configuration and web bundle readiness"},{id:"fetch_items",title:"Fetch Inventory Items",method:"GET",endpoint:"/api/items",status:"pending",desc:"Retrieves items list and validates data schema"},{id:"filter_search",title:"Search & Status Filtering",method:"GET",endpoint:"/api/items?search=Rice",status:"pending",desc:"Tests warehouse item search and status filtering logic"},{id:"intake_item",title:"Mobile Inventory Intake",method:"POST",endpoint:"/api/items",status:"pending",desc:"Tests mobile stock receipt recording with location and quantity"},{id:"reconciliation",title:"Multi-Payment Reconciliation",method:"POST",endpoint:"/api/items/:id/reconciliation",status:"pending",desc:"Verifies invoice matching and split payment recording (UPI/Cash)"},{id:"verify_item",title:"Reconciliation State Check",method:"GET",endpoint:"/api/items/:id",status:"pending",desc:"Confirms item status transitioned to reconciled with invoice details"}]},Y=document.querySelector("#app"),b=t=>String(t??"").replace(/[&<>"']/g,a=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"})[a]),B=t=>`₹ ${Number(t||0).toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2})}`,G=()=>e.role==="manager"?e.items:e.items.filter(t=>t.category==="Food & Beverage");function J(t){return t.image?`<div class="item-thumb" style="overflow:hidden;padding:0;background:#e2e8f0"><img src="${t.image}" alt="Product" style="width:100%;height:100%;object-fit:cover;border-radius:10px" /></div>`:`<div class="item-thumb">${{"Grains & Pulses":"🌾",Oils:"🫗",Sweeteners:"🧂",Beverages:"🍵",Cereal:"🌰",Spices:"🟠","Dairy & Bakery":"🥛",Snacks:"🍿"}[t.subcategory]||"📦"}</div>`}const f=async(t,a={})=>{const o=await fetch(`/api${t}`,{headers:{"Content-Type":"application/json"},...a});if(!o.ok){let n="Request failed";try{n=(await o.json()).error||n}catch{}throw new Error(n)}return o.json()},q=t=>g(t.message||"Something went wrong");function l(){const t=G().filter(o=>o.status==="pending").length,a=e.testResults.filter(o=>o.status==="passed").length;Y.innerHTML=`
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
          <button id="toggle-sim" class="${e.viewMode==="simulator"?"active":""}">📱 Mobile Simulator</button>
          <button id="toggle-resp" class="${e.viewMode==="responsive"?"active":""}">💻 Responsive View</button>
        </div>
        <select class="role-select" id="role-select" style="min-height:34px;padding:5px 9px;font-size:12px">
          <option value="manager" ${e.role==="manager"?"selected":""}>Manager View (Admin)</option>
          <option value="user" ${e.role==="user"?"selected":""}>Category User</option>
        </select>
        <button class="button primary" id="run-tests-btn" style="min-height:34px;padding:6px 12px;font-size:12px">
          ${e.testRunning?"⏳ Running...":"▶ Run Mobile Tests"}
        </button>
      </div>
    </header>

    ${e.viewMode==="simulator"?Z(t,a):ee(t,a)}
    <div class="toast" id="toast"></div>
  `,oe()}function Z(t,a){const o={dashboard:"Overview",intake:"Stock Intake",selection:`Reconciliation (${t})`,reconciliation:"Reconcile Item",tests:"Mobile Test Suite"}[e.page]||"Overview";return`
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
            ${e.page==="reconciliation"?'<button type="button" class="button secondary" style="min-height:32px;padding:4px 8px;font-size:12px" data-page="selection">←</button>':'<div class="brand-mark" style="width:28px;height:28px;font-size:13px;border-width:1.5px">S</div>'}
            <div>
              <div style="font-size:10px;opacity:0.8;font-weight:700;letter-spacing:0.5px;text-transform:uppercase">Stockwise Mobile</div>
              <h2>${o}</h2>
            </div>
          </div>
          <div class="mobile-topbar-actions">
            ${e.page!=="intake"?'<button class="button secondary" style="min-height:32px;padding:4px 10px;font-size:11px" data-page="intake">＋ Add</button>':""}
          </div>
        </div>

        <!-- Phone Scrollable Screen -->
        <div class="phone-screen" id="phone-screen">
          <div class="mobile-content">
            ${W()}
          </div>
        </div>

        <!-- Fixed Bottom Tab Bar -->
        <nav class="mobile-tab-bar">
          <button class="tab-item ${e.page==="dashboard"?"active":""}" data-page="dashboard">
            <span class="tab-icon">⌂</span>
            <span class="tab-label">Home</span>
          </button>
          <button class="tab-item ${e.page==="intake"?"active":""}" data-page="intake">
            <span class="tab-icon">＋</span>
            <span class="tab-label">Intake</span>
          </button>
          <button class="tab-item ${e.page==="selection"||e.page==="reconciliation"?"active":""}" data-page="selection">
            <span class="tab-icon">☷</span>
            <span class="tab-label">Queue</span>
            ${t>0?`<span class="tab-badge">${t}</span>`:""}
          </button>
          <button class="tab-item ${e.page==="tests"?"active":""}" data-page="tests">
            <span class="tab-icon">✓</span>
            <span class="tab-label">Tests</span>
            ${a>0?`<span class="tab-badge success">${a}/7</span>`:""}
          </button>
        </nav>

        <!-- Home Indicator Pill -->
        <div class="phone-home-indicator"></div>
      </div>
    </div>
  `}function ee(t,a){var n;const o=[["dashboard","⌂","Overview"],["intake","＋","Inventory Intake"],["selection","☷",`Reconciliation (${t})`],["tests","✓",`Mobile Test Suite (${a}/7)`]];return`
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
          ${o.map(([i,r,d])=>`
            <button class="${e.page===i?"active":""}" data-page="${i}">
              <span class="nav-icon">${r}</span>
              <span>${d}</span>
            </button>
          `).join("")}
        </nav>
        <div class="sidebar-footer">
          <div class="profile">
            <span class="avatar">${e.role==="manager"?"AM":"RG"}</span>
            <span>${e.role==="manager"?"Anirban Mukherjee":"Riya Gardener"}</span>
          </div>
          <div>${e.role==="manager"?"Manager access (Admin)":"Category user access"}</div>
        </div>
      </aside>

      <main class="main">
        <header class="topbar">
          <div>
            <div class="eyebrow">Inventory workspace</div>
            <h1>${e.page==="dashboard"?"Good morning, Anirban":((n=o.find(i=>i[0]===e.page))==null?void 0:n[2])||"Reconciliation"}</h1>
          </div>
          <div class="top-actions">
            <button class="button primary" data-page="intake">＋ Add item</button>
            <button class="button secondary" data-page="tests">✓ Run Tests</button>
          </div>
        </header>
        <section class="content">
          ${W()}
        </section>
      </main>
    </div>
  `}function W(){switch(e.page){case"dashboard":return H();case"intake":return te();case"selection":return K();case"reconciliation":return ae();case"tests":return ie();default:return H()}}function H(){const t=G(),a=t.filter(i=>i.status==="pending").length,o=[...new Set(t.map(i=>i.category))].length,n=t.reduce((i,r)=>i+Number(r.quantity||0),0);return`
    <div class="stats">
      <div class="stat-card">
        <span class="stat-label">Total inventory</span>
        <strong class="stat-value">${t.length}</strong>
        <div class="stat-note">Across warehouse</div>
      </div>
      <div class="stat-card">
        <span class="stat-label">Pending reconciliation</span>
        <strong class="stat-value" style="color:#ad6810">${a}</strong>
        <div class="stat-note">Needs invoice match</div>
      </div>
      <div class="stat-card">
        <span class="stat-label">Units in stock</span>
        <strong class="stat-value">${n.toLocaleString("en-IN")}</strong>
        <div class="stat-note">Current recorded qty</div>
      </div>
      <div class="stat-card">
        <span class="stat-label">Active categories</span>
        <strong class="stat-value">${o}</strong>
        <div class="stat-note">${e.role==="manager"?"Manager visibility":"Category visibility"}</div>
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
      ${t.filter(i=>i.status==="pending").slice(0,6).map(V).join("")||'<div class="empty">All items are reconciled!</div>'}
    </div>
  `}function V(t){return`
    <div class="mobile-item-card">
      <div class="mobile-card-top">
        <div style="display:flex;gap:11px;align-items:center;min-width:0">
          ${J(t)}
          <div style="min-width:0">
            <div class="item-name" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${b(t.description)}</div>
            <div class="item-meta">${b(t.category)} · ${b(t.subcategory)} · ${b(t.location)}</div>
          </div>
        </div>
        <span class="badge ${t.status}">${t.status==="pending"?"Pending":"Reconciled"}</span>
      </div>
      <div class="mobile-card-body">
        <div>
          <span style="font-size:11px;color:var(--muted);font-weight:600">Stock:</span>
          <strong style="font-size:14px;color:var(--ink)">${t.quantity} ${t.unit}</strong>
        </div>
        <button class="button ${t.status==="pending"?"primary":"secondary"}" style="min-height:34px;padding:5px 12px;font-size:12px" data-reconcile="${t.id}">
          ${t.status==="pending"?"Reconcile →":"View Invoice"}
        </button>
      </div>
    </div>
  `}function te(){const t=new Date().toISOString().split("T")[0],a=e.subcategories[e.intakeCategory]||[];return`
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
        ${e.recording.active&&e.recording.target==="whole_intake"?`
          <div class="voice-recording-banner">
            <div style="display:flex;align-items:center;gap:7px">
              <span class="recording-pulse-dot"></span>
              <strong>Listening to full intake... (${e.recording.timer}s)</strong>
            </div>
            <button type="button" class="button primary" id="stop-voice-btn" style="min-height:28px;padding:2px 8px;font-size:11px;background:#dc2626">
              ⏹ Done / Process
            </button>
          </div>
        `:""}
      </div>

      <form id="intake-form">
        <!-- Image from Camera / Gallery Slot -->
        <div class="section-title">📷 Product Image (Camera / Gallery)</div>
        <input type="file" id="intake-file-input" accept="image/*" style="display:none" />
        
        <div class="image-upload-slot" id="upload-slot-area">
          ${e.intakeImage?`
            <div class="image-upload-preview">
              <img src="${e.intakeImage}" alt="Captured item photo" />
            </div>
            <div class="image-upload-btn-row">
              <button type="button" class="button primary" id="ai-analyze-img-btn" style="min-height:32px;padding:4px 10px;font-size:11.5px" ${e.aiAnalyzing?"disabled":""}>
                ${e.aiAnalyzing?"⏳ Analyzing Image...":"✨ AI Auto-Fill from Image"}
              </button>
              <button type="button" class="button secondary" id="reselect-image-btn" style="min-height:32px;padding:4px 10px;font-size:11.5px">
                Change Photo
              </button>
              <button type="button" class="button danger" id="remove-image-btn" style="min-height:32px;padding:4px 10px;font-size:11.5px">
                Remove
              </button>
            </div>
          `:`
            <div style="font-size:26px;margin-bottom:4px">📸</div>
            <strong style="font-size:13px;display:block">Take Photo or Upload from Gallery</strong>
            <div style="font-size:11px;color:var(--muted);margin-top:2px">Tap here to capture packaging, carton label, or receipt</div>
          `}
        </div>

        <div class="section-title">▦ Item Details</div>
        <div class="form-grid">
          <div class="field">
            <label>Date Received *</label>
            <input name="entered" id="intake-date" type="date" value="${t}" required>
          </div>
          <div class="field">
            <label>Recorded By</label>
            <input value="${e.role==="manager"?"Anirban Mukherjee (Manager / Admin)":"Riya Gardener (Category User)"}" disabled style="background:#f8faf9">
          </div>

          <!-- Category Select -->
          <div class="field">
            <label>Category *</label>
            <select name="category" id="intake-category-select" required>
              <option value="Food & Beverage" ${e.intakeCategory==="Food & Beverage"?"selected":""}>Food & Beverage</option>
              <option value="Garden Supplies" ${e.intakeCategory==="Garden Supplies"?"selected":""}>Garden Supplies</option>
              <option value="Housekeeping" ${e.intakeCategory==="Housekeeping"?"selected":""}>Housekeeping</option>
              <option value="Maintenance" ${e.intakeCategory==="Maintenance"?"selected":""}>Maintenance</option>
            </select>
          </div>

          <!-- Subcategory Dropdown (Manager/Admin configurable) -->
          <div class="field">
            <div class="subcat-label-row">
              <label style="margin:0">Subcategory *</label>
              ${e.role==="manager"?`
                <button type="button" class="subcat-manage-btn" id="toggle-subcat-creator">
                  ${e.showSubcatCreator?"✕ Close":"⚙ + Add Subcategory"}
                </button>
              `:'<small style="color:var(--muted);font-size:10px">Admin configured</small>'}
            </div>
            <select name="subcategory" id="intake-subcategory-select" required>
              ${a.map(o=>`<option value="${b(o)}" ${e.intakeSubcategory===o?"selected":""}>${b(o)}</option>`).join("")}
            </select>

            <!-- Inline Manager Subcategory Creator -->
            ${e.showSubcatCreator&&e.role==="manager"?`
              <div class="subcat-creator-box">
                <input id="new-subcat-input" placeholder="New subcategory name..." style="min-height:34px;padding:4px 8px;font-size:12px;flex:1" />
                <button type="button" class="button primary" id="save-new-subcat-btn" style="min-height:34px;padding:4px 10px;font-size:12px">Save</button>
              </div>
            `:""}
          </div>

          <!-- Description / Product Name in full Unicode with Voice Transcription -->
          <div class="field full">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px">
              <label style="margin:0">Description / Product Name (Supports Bengali, Hindi, English & Unicode) *</label>
              <span style="font-size:10.5px;color:var(--green);font-weight:700">🌐 Multilingual Unicode</span>
            </div>
            <div class="input-with-voice">
              <input name="description" id="intake-desc" placeholder="e.g. বাসমতী চাল, Sunflower Oil, मसूर दाल" required>
              <button type="button" class="mic-btn ${e.recording.active&&e.recording.target==="description"?"recording":""}" id="voice-desc-btn" title="Voice record description">
                ${e.recording.active&&e.recording.target==="description"?"⏹":"🎙️"}
              </button>
            </div>
            ${e.recording.active&&e.recording.target==="description"?`
              <div class="voice-recording-banner">
                <div style="display:flex;align-items:center;gap:7px">
                  <span class="recording-pulse-dot"></span>
                  <strong>Recording product name... (${e.recording.timer}s)</strong>
                </div>
                <button type="button" class="button primary" id="stop-voice-btn" style="min-height:28px;padding:2px 8px;font-size:11px;background:#dc2626">
                  Stop & Transcribe
                </button>
              </div>
            `:""}
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
                ${e.recording.active&&e.recording.target==="notes"?"⏹ Stop":"🎙️ Dictate Notes"}
              </button>
            </div>
            <textarea name="notes" id="intake-notes" placeholder="Batch condition, quality seal check, vendor comments..."></textarea>
            ${e.recording.active&&e.recording.target==="notes"?`
              <div class="voice-recording-banner">
                <div style="display:flex;align-items:center;gap:7px">
                  <span class="recording-pulse-dot"></span>
                  <strong>Recording notes... (${e.recording.timer}s)</strong>
                </div>
                <button type="button" class="button primary" id="stop-voice-btn" style="min-height:28px;padding:2px 8px;font-size:11px;background:#dc2626">
                  Stop & Transcribe
                </button>
              </div>
            `:""}
          </div>
        </div>

        <div class="form-actions" style="margin-top:20px">
          <button type="button" class="button secondary" data-page="dashboard" style="flex:1">Cancel</button>
          <button type="submit" class="button primary" style="flex:2">Save Inventory Item</button>
        </div>
      </form>
    </div>
  `}function K(){const a=G().filter(o=>{var d,h,w;const n=(e.searchQuery||"").toLowerCase(),i=!n||((d=o.description)==null?void 0:d.toLowerCase().includes(n))||((h=o.category)==null?void 0:h.toLowerCase().includes(n))||((w=o.location)==null?void 0:w.toLowerCase().includes(n)),r=e.statusFilter==="all"||o.status===e.statusFilter;return i&&r});return`
    <div class="toolbar">
      <div>
        <div class="eyebrow">Inventory Queue</div>
        <h2>Select Item to Reconcile</h2>
      </div>
      <button class="button primary" data-page="intake">＋ Add Item</button>
    </div>

    <div class="panel" style="padding:15px">
      <div class="filters" style="margin-bottom:14px">
        <input class="search" id="item-search" placeholder="⌕ Search items, category, location (supports বাংলা/हिंदी)..." value="${b(e.searchQuery)}">
        <select id="status-filter" style="width:auto;min-width:140px">
          <option value="all" ${e.statusFilter==="all"?"selected":""}>All Statuses</option>
          <option value="pending" ${e.statusFilter==="pending"?"selected":""}>Pending Only</option>
          <option value="reconciled" ${e.statusFilter==="reconciled"?"selected":""}>Reconciled Only</option>
        </select>
      </div>

      <div id="item-list-container">
        ${a.length?a.map(V).join(""):'<div class="empty">No inventory items match your search.</div>'}
      </div>
    </div>
  `}function ae(){const t=e.selectedItem;if(!t)return K();const o=120*(t.quantity||1),n=50,i=Number((o*.18).toFixed(2)),d=o-n+i+30;e.payments.length||(e.payments=[{date:"2026-09-16",method:"UPI",source:"Business Bank A/c",amount:Math.min(1e3,d)}]);const h=e.payments.reduce((S,v)=>S+Number(v.amount||0),0),w=Math.max(0,d-h);return`
    <div class="panel">
      <div class="detail-header">
        <div style="display:flex;align-items:center;gap:12px">
          ${J(t)}
          <div>
            <h2>Reconcile ${b(t.description)}</h2>
            <p>${b(t.category)} · ${b(t.subcategory)} · Current Stock: ${t.quantity} ${t.unit}</p>
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
            <input id="inv-number" value="INV-2026-${t.id.replace(/[^0-9]/g,"").slice(0,4)||"0916"}" required>
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
            <strong>${B(d)}</strong>
          </div>
          <div class="money-card">
            <small>Total Paid</small>
            <strong>${B(h)}</strong>
          </div>
          <div class="money-card outstanding">
            <small>Outstanding Balance</small>
            <strong>${B(w)}</strong>
          </div>
        </div>

        <div class="section-title purple" style="justify-content:space-between">
          <span>₹ Payment Details</span>
          <button type="button" class="button secondary" style="min-height:30px;padding:3px 9px;font-size:11px" id="add-payment-btn">＋ Add Split Payment</button>
        </div>
        <div class="payment-list">
          ${e.payments.map((S,v)=>`
            <div class="payment-row">
              <span><strong>#${v+1}</strong> ${S.date}</span>
              <span>${S.method}</span>
              <span>${S.source}</span>
              <strong style="color:var(--green-dark)">${B(S.amount)}</strong>
              <button type="button" class="button danger" style="min-height:28px;padding:2px 7px;font-size:11px" data-remove-payment="${v}">✕</button>
            </div>
          `).join("")}
        </div>

        <div class="section-title">✓ Reconciliation Status & Stock Match</div>
        <div class="form-grid">
          <div class="field">
            <label>Physical Quantity Verified *</label>
            <input value="${t.quantity}" type="number" step="0.1" required>
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
  `}function ie(){const t=e.testResults.length,a=e.testResults.filter(n=>n.status==="passed").length,o=e.testResults.filter(n=>n.status==="failed").length;return`
    <div class="toolbar">
      <div>
        <div class="eyebrow">Mobile Diagnostic Suite</div>
        <h2>Capacitor Mobile Functional Tests</h2>
      </div>
      <button class="button primary" id="trigger-all-tests" ${e.testRunning?"disabled":""}>
        ${e.testRunning?"Running Suite...":"▶ Run All Tests"}
      </button>
    </div>

    <div class="test-header-card">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <strong style="font-size:15px">Stockwise Mobile Subrepo Diagnostic</strong>
          <div style="font-size:12px;color:var(--muted);margin-top:2px">Validates Capacitor 7 Android endpoints, database CRUD, and reconciliation workflows.</div>
        </div>
      </div>
      <div class="test-stat-strip">
        <div class="test-stat-box">
          <strong>${t}</strong>
          <small>Total Tests</small>
        </div>
        <div class="test-stat-box pass">
          <strong>${a}</strong>
          <small>Passed</small>
        </div>
        <div class="test-stat-box fail">
          <strong>${o}</strong>
          <small>Failed</small>
        </div>
      </div>
    </div>

    <div class="test-list">
      ${e.testResults.map((n,i)=>`
        <div class="test-card ${n.status}">
          <div class="test-title-row">
            <div class="test-title-left">
              <span>${n.status==="passed"?"✅":n.status==="failed"?"❌":n.status==="running"?"⏳":"○"}</span>
              <span class="test-method-pill ${n.method.toLowerCase()}">${n.method}</span>
              <span>${i+1}. ${b(n.title)}</span>
            </div>
            <div style="font-size:11px;color:var(--muted);font-weight:700">
              ${n.duration?`${n.duration}`:n.status}
            </div>
          </div>
          <div style="font-size:12px;color:var(--muted);margin-top:5px">${b(n.desc)}</div>
          ${n.details?`
            <div class="test-detail-box">
              ${typeof n.details=="object"?JSON.stringify(n.details,null,2):b(n.details)}
            </div>
          `:""}
          ${n.error?`<div class="test-detail-box" style="color:var(--danger);background:#fff1f3">${b(n.error)}</div>`:""}
        </div>
      `).join("")}
    </div>
  `}async function U(t){try{const a=await navigator.mediaDevices.getUserMedia({audio:!0});e.recording.chunks=[];const o=new MediaRecorder(a);e.recording.recorder=o,e.recording.active=!0,e.recording.target=t,e.recording.timer=0,o.ondataavailable=n=>{n.data.size>0&&e.recording.chunks.push(n.data)},o.onstop=async()=>{clearInterval(e.recording.intervalId),a.getTracks().forEach(i=>i.stop());const n=new Blob(e.recording.chunks,{type:o.mimeType||"audio/webm"});await ne(n,t)},o.start(),e.recording.intervalId=setInterval(()=>{e.recording.timer+=1,l()},1e3),l()}catch(a){console.error("Microphone access error:",a),g("Microphone access denied or unavailable"),e.recording.active=!1,l()}}function j(){e.recording.recorder&&e.recording.recorder.state!=="inactive"&&e.recording.recorder.stop(),e.recording.active=!1,clearInterval(e.recording.intervalId),l()}async function ne(t,a){g("⏳ Transcribing audio with Gemini...");try{const o=new FileReader;o.readAsDataURL(t),o.onloadend=async()=>{const n=o.result;if(a==="whole_intake"){const i=await f("/ai/analyze-voice",{method:"POST",body:JSON.stringify({audioData:n,mimeType:t.type})});if(i.description){const r=document.querySelector("#intake-desc");r&&(r.value=i.description)}if(i.category&&e.subcategories[i.category]){e.intakeCategory=i.category;const r=document.querySelector("#intake-category-select");r&&(r.value=i.category)}if(i.subcategory){e.intakeSubcategory=i.subcategory;const r=document.querySelector("#intake-subcategory-select");r&&(r.value=i.subcategory)}if(i.quantity){const r=document.querySelector("#intake-qty-input");r&&(r.value=i.quantity)}if(i.unit){const r=document.querySelector("#intake-unit");r&&(r.value=i.unit)}if(i.location){const r=document.querySelector("#intake-location");r&&(r.value=i.location)}if(i.notes){const r=document.querySelector("#intake-notes");r&&(r.value=i.notes)}g("✨ AI auto-populated intake fields from voice!"),l()}else{const i=await f("/ai/transcribe-voice",{method:"POST",body:JSON.stringify({audioData:n,mimeType:t.type})});if(a==="description"){const r=document.querySelector("#intake-desc");r&&(r.value=i.text||"")}else if(a==="notes"){const r=document.querySelector("#intake-notes");r&&(r.value=i.text||"")}g("✓ Voice transcribed"),l()}}}catch(o){q(o)}}async function se(){if(e.intakeImage){e.aiAnalyzing=!0,l(),g("🔍 AI analyzing product packaging/label...");try{const t=await f("/ai/analyze-image",{method:"POST",body:JSON.stringify({imageData:e.intakeImage,mimeType:"image/jpeg"})});if(t.description){const a=document.querySelector("#intake-desc");a&&(a.value=t.description)}if(t.category&&e.subcategories[t.category]){e.intakeCategory=t.category;const a=document.querySelector("#intake-category-select");a&&(a.value=t.category)}if(t.subcategory){e.intakeSubcategory=t.subcategory;const a=document.querySelector("#intake-subcategory-select");a&&(a.value=t.subcategory)}if(t.quantity){const a=document.querySelector("#intake-qty-input");a&&(a.value=t.quantity)}if(t.unit){const a=document.querySelector("#intake-unit");a&&(a.value=t.unit)}if(t.location){const a=document.querySelector("#intake-location");a&&(a.value=t.location)}if(t.notes){const a=document.querySelector("#intake-notes");a&&(a.value=t.notes)}g("✨ AI auto-filled fields from image!")}catch(t){q(t)}finally{e.aiAnalyzing=!1,l()}}}async function Q(){if(e.testRunning)return;e.testRunning=!0,e.page="tests",l();const t=(a,o)=>{const n=e.testResults.find(i=>i.id===a);n&&Object.assign(n,o),l()};try{t("health",{status:"running"});const a=performance.now(),o=await fetch("/health"),n=await o.json(),i=`${Math.round(performance.now()-a)}ms`;if(o.ok&&n.ok)t("health",{status:"passed",duration:i,details:{status:"200 OK",body:n}});else throw new Error("Health check failed");t("mobile_status",{status:"running"});const r=performance.now(),d=await fetch("/api/mobile-status"),h=await d.json(),w=`${Math.round(performance.now()-r)}ms`;if(d.ok&&h.appId==="com.stockwise.inventory")t("mobile_status",{status:"passed",duration:w,details:h});else throw new Error("Capacitor configuration parity mismatch");t("fetch_items",{status:"running"});const S=performance.now(),v=await f("/items"),T=`${Math.round(performance.now()-S)}ms`;if(Array.isArray(v)&&v.length>0)e.items=v,t("fetch_items",{status:"passed",duration:T,details:{count:v.length,sampleItem:v[0].description,sampleId:v[0].id}});else throw new Error("No inventory items found");t("filter_search",{status:"running"});const M=performance.now(),I=await f("/items?search=Rice"),A=`${Math.round(performance.now()-M)}ms`;if(Array.isArray(I)&&I.some(u=>u.description.toLowerCase().includes("rice")))t("filter_search",{status:"passed",duration:A,details:{matchedQuery:"Rice",results:I.length}});else throw new Error("Search filter for 'Rice' returned no matching results");t("intake_item",{status:"running"});const P=performance.now(),C={description:`বাসমতী চাল Premium (${Math.floor(Math.random()*900+100)})`,category:"Food & Beverage",subcategory:"Grains & Pulses",quantity:12,unit:"kg",location:"Main Warehouse",enteredAt:new Date().toISOString().split("T")[0],createdBy:"usr_manager"},m=await f("/items",{method:"POST",body:JSON.stringify(C)}),R=`${Math.round(performance.now()-P)}ms`;if(m&&m.id&&m.status==="pending")e.items.unshift(m),t("intake_item",{status:"passed",duration:R,details:{id:m.id,description:m.description,status:m.status}});else throw new Error("Failed to create new item via mobile intake endpoint");t("reconciliation",{status:"running"});const E=performance.now(),L={invoiceNumber:`INV-TEST-${m.id.slice(4)}`,invoiceDate:new Date().toISOString().split("T")[0],supplier:"Fresh Mart Wholesale",purchaseMethod:"Local Market",totalAmount:1440,notes:"Mobile automated verification invoice",status:"reconciled",payments:[{paymentDate:new Date().toISOString().split("T")[0],paymentMethod:"UPI",paymentSource:"Business Bank A/c",amount:1e3,transactionReference:"TXN-UPI-9941"},{paymentDate:new Date().toISOString().split("T")[0],paymentMethod:"Cash",paymentSource:"Petty Cash",amount:440}]},$=await f(`/items/${m.id}/reconciliation`,{method:"POST",body:JSON.stringify(L)}),z=`${Math.round(performance.now()-E)}ms`;if($&&$.status==="reconciled"){const u=e.items.find(y=>y.id===m.id);u&&(u.status="reconciled"),t("reconciliation",{status:"passed",duration:z,details:{invoiceId:$.invoiceId,itemId:m.id,status:$.status,totalPaid:"₹ 1,440.00"}})}else throw new Error("Reconciliation submission failed");t("verify_item",{status:"running"});const c=performance.now(),s=await f(`/items/${m.id}`),p=`${Math.round(performance.now()-c)}ms`;if(s&&s.item&&s.item.status==="reconciled"&&Array.isArray(s.payments)&&s.payments.length===2)t("verify_item",{status:"passed",duration:p,details:{verifiedStatus:s.item.status,paymentsCount:s.payments.length,supplier:s.invoice.supplier}});else throw new Error("Item detail verification failed");g("All 7 mobile tests passed successfully!")}catch(a){console.error("Test failed:",a),g(`Test failed: ${a.message}`)}finally{e.testRunning=!1,l()}}function oe(){var h,w,S,v,T,M,I,A,P,C,m,R,E,L,$,z;document.querySelectorAll("[data-page]").forEach(c=>{c.addEventListener("click",()=>{e.page=c.dataset.page,l()})}),document.querySelectorAll("[data-reconcile]").forEach(c=>{c.addEventListener("click",()=>{const s=e.items.find(p=>p.id===c.dataset.reconcile);s&&(e.selectedItem=s,e.payments=[],e.page="reconciliation",l())})}),(h=document.querySelector("#toggle-sim"))==null||h.addEventListener("click",()=>{e.viewMode="simulator",localStorage.setItem("stockwise-view-mode","simulator"),l()}),(w=document.querySelector("#toggle-resp"))==null||w.addEventListener("click",()=>{e.viewMode="responsive",localStorage.setItem("stockwise-view-mode","responsive"),l()}),(S=document.querySelector("#role-select"))==null||S.addEventListener("change",c=>{e.role=c.target.value,localStorage.setItem("stockwise-role",e.role),l()}),(v=document.querySelector("#run-tests-btn"))==null||v.addEventListener("click",Q),(T=document.querySelector("#trigger-all-tests"))==null||T.addEventListener("click",Q),document.querySelectorAll("[data-step]").forEach(c=>{c.addEventListener("click",()=>{const s=document.querySelector("#intake-qty-input");if(s){const p=parseFloat(c.dataset.step),u=parseFloat(s.value)||0;s.value=Math.max(.1,Number((u+p).toFixed(2)))}})});const t=document.querySelector("#intake-category-select");t&&t.addEventListener("change",c=>{e.intakeCategory=c.target.value;const s=e.subcategories[e.intakeCategory]||[];e.intakeSubcategory=s[0]||"",l()}),(M=document.querySelector("#toggle-subcat-creator"))==null||M.addEventListener("click",()=>{e.showSubcatCreator=!e.showSubcatCreator,l()}),(I=document.querySelector("#save-new-subcat-btn"))==null||I.addEventListener("click",async()=>{const c=document.querySelector("#new-subcat-input"),s=((c==null?void 0:c.value)||"").trim();if(!s)return g("Enter subcategory name");try{await f("/subcategories",{method:"POST",body:JSON.stringify({category:e.intakeCategory,subcategory:s})}),e.subcategories[e.intakeCategory].includes(s)||e.subcategories[e.intakeCategory].push(s),e.intakeSubcategory=s,e.showSubcatCreator=!1,l(),g(`Added subcategory "${s}"`)}catch(p){q(p)}});const a=document.querySelector("#intake-file-input"),o=document.querySelector("#upload-slot-area"),n=document.querySelector("#trigger-camera-btn"),i=()=>a==null?void 0:a.click();o&&!e.intakeImage&&o.addEventListener("click",i),n==null||n.addEventListener("click",i),(A=document.querySelector("#reselect-image-btn"))==null||A.addEventListener("click",i),a==null||a.addEventListener("change",c=>{var p;const s=(p=c.target.files)==null?void 0:p[0];if(s){const u=new FileReader;u.onload=y=>{e.intakeImage=y.target.result,l(),g("Image loaded. Click 'AI Auto-Fill' to extract details.")},u.readAsDataURL(s)}}),(P=document.querySelector("#remove-image-btn"))==null||P.addEventListener("click",()=>{e.intakeImage=null,l()}),(C=document.querySelector("#ai-analyze-img-btn"))==null||C.addEventListener("click",se),document.querySelectorAll(".unicode-chip").forEach(c=>{c.addEventListener("click",()=>{const s=document.querySelector("#intake-desc");s&&(s.value=c.dataset.fill,s.focus())})}),(m=document.querySelector("#voice-desc-btn"))==null||m.addEventListener("click",()=>{e.recording.active?j():U("description")}),(R=document.querySelector("#voice-notes-btn"))==null||R.addEventListener("click",()=>{e.recording.active?j():U("notes")}),(E=document.querySelector("#ai-voice-all-btn"))==null||E.addEventListener("click",()=>{e.recording.active?j():U("whole_intake")}),document.querySelectorAll("#stop-voice-btn").forEach(c=>{c.addEventListener("click",j)});const r=document.querySelector("#item-search");r&&r.addEventListener("input",c=>{e.searchQuery=c.target.value;const s=document.querySelector("#item-list-container");if(s){const u=G().filter(y=>{var D,O,N;const k=(e.searchQuery||"").toLowerCase(),x=!k||((D=y.description)==null?void 0:D.toLowerCase().includes(k))||((O=y.category)==null?void 0:O.toLowerCase().includes(k))||((N=y.location)==null?void 0:N.toLowerCase().includes(k)),_=e.statusFilter==="all"||y.status===e.statusFilter;return x&&_});s.innerHTML=u.length?u.map(V).join(""):'<div class="empty">No inventory items match your search.</div>',s.querySelectorAll("[data-reconcile]").forEach(y=>{y.addEventListener("click",()=>{const k=e.items.find(x=>x.id===y.dataset.reconcile);k&&(e.selectedItem=k,e.payments=[],e.page="reconciliation",l())})})}});const d=document.querySelector("#status-filter");d&&d.addEventListener("change",c=>{e.statusFilter=c.target.value,l()}),(L=document.querySelector("#intake-form"))==null||L.addEventListener("submit",async c=>{c.preventDefault();try{const s=Object.fromEntries(new FormData(c.target)),p={description:s.description,category:s.category,subcategory:s.subcategory,quantity:Number(s.quantity),unit:s.unit,location:s.location,enteredAt:s.entered,image:e.intakeImage||null,notes:s.notes||null,createdBy:e.role==="manager"?"usr_manager":"usr_category_user"},u=await f("/items",{method:"POST",body:JSON.stringify(p)});e.items.unshift(u),e.intakeImage=null,e.page="selection",l(),g("Inventory item saved to warehouse")}catch(s){q(s)}}),($=document.querySelector("#reconcile-form"))==null||$.addEventListener("submit",async c=>{var s,p,u,y,k;if(c.preventDefault(),!!e.selectedItem)try{const x=document.querySelector("#reconcile-status").value,_=((s=document.querySelector("#inv-date"))==null?void 0:s.value)||"2026-09-16",D=((p=document.querySelector("#inv-number"))==null?void 0:p.value)||"INV-001",O=((u=document.querySelector("#inv-supplier"))==null?void 0:u.value)||"Sharma Traders",N=((y=document.querySelector("#inv-method"))==null?void 0:y.value)||"Local Market",X=((k=document.querySelector("#reconcile-notes"))==null?void 0:k.value)||"";await f(`/items/${e.selectedItem.id}/reconciliation`,{method:"POST",body:JSON.stringify({invoiceNumber:D,invoiceDate:_,supplier:O,purchaseMethod:N,totalAmount:1400,notes:X,status:x,payments:e.payments.map(F=>({paymentDate:F.date,paymentMethod:F.method,paymentSource:F.source,amount:F.amount}))})}),e.selectedItem.status=x,e.page="selection",l(),g(x==="reconciled"?"Reconciliation completed":"Saved as pending verification")}catch(x){q(x)}}),(z=document.querySelector("#add-payment-btn"))==null||z.addEventListener("click",()=>{e.payments.push({date:"2026-09-16",method:e.payments.length?"Cash":"UPI",source:e.payments.length?"Petty Cash":"Business Bank A/c",amount:200}),l()}),document.querySelectorAll("[data-remove-payment]").forEach(c=>{c.addEventListener("click",()=>{const s=Number(c.dataset.removePayment);e.payments.splice(s,1),l()})})}function g(t){const a=document.querySelector("#toast");a&&(a.textContent=t,a.classList.add("show"),setTimeout(()=>a.classList.remove("show"),3e3))}Promise.all([f("/items"),f("/subcategories").catch(()=>null)]).then(([t,a])=>{e.items=t,a&&(e.subcategories=a),l()}).catch(t=>{console.error("Initial load error:",t),l(),g("API connection error. Ensure server is active.")});
