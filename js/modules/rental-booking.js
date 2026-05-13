// ============================================
// Module: Rental / Charter Booking
// Copy + adapt this file for any booking-based business
// Change MODULE_CONFIG to match your business type
// Dashboard: manage fleet, time slots, pricing, add-ons, availability
// Public: 4-step booking checkout wired to Stripe or Square
// ============================================

var MODULE_CONFIG = {
  id: 'rental-booking',
  name: 'Rental Booking',
  icon: '🚤',
  section: 'Manage',
  publicSection: 'booking-charter',
  itemLabel: 'Fleet Type',        // "Fleet Type" | "Trip" | "Service" | "Table"
  itemLabelPlural: 'Fleet Types',
  slotLabel: 'Time Slot',         // "Time Slot" | "Departure Time" | "Appointment"
  itemIcon: '🚤',
  addOnLabel: 'Add-ons',
  priceLabel: 'Rental Price',
  bookingLabel: 'Rental'
};

CC.modules.register({
  id: MODULE_CONFIG.id,
  name: MODULE_CONFIG.name,
  icon: MODULE_CONFIG.icon,
  section: MODULE_CONFIG.section,
  publicSection: MODULE_CONFIG.publicSection,

  panel: function() {
    return rbBuildPanel();
  },

  init: function() {
    rbInit();
  }
});

// ── Panel HTML ──────────────────────────────
function rbBuildPanel() {
  return '<div id="rb-panel">' +
    '<div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">' +
      '<h3 style="margin:0;">' + MODULE_CONFIG.icon + ' ' + MODULE_CONFIG.name + '</h3>' +
      '<div style="flex:1;"></div>' +
      '<span id="rb-payment-status" style="font-size:12px;color:var(--text-muted);"></span>' +
    '</div>' +

    // Tabs
    '<div style="display:flex;border-bottom:1px solid var(--card-border);margin-bottom:24px;">' +
      rbTab('items', MODULE_CONFIG.itemLabelPlural) +
      rbTab('slots', 'Time Slots') +
      rbTab('pricing', 'Pricing') +
      rbTab('addons', MODULE_CONFIG.addOnLabel) +
      rbTab('availability', 'Availability') +
      rbTab('waivers', 'Waiver') +
      rbTab('bookings', 'Bookings') +
    '</div>' +

    // Tab panels
    '<div id="rb-pane-items">' +
      '<div id="rb-items-list"></div>' +
      '<button onclick="rbOpenItemModal(null)" class="btn btn-primary" style="margin-top:16px;">+ Add ' + MODULE_CONFIG.itemLabel + '</button>' +
    '</div>' +

    '<div id="rb-pane-slots" style="display:none">' +
      '<div id="rb-slots-list"></div>' +
      '<button onclick="rbOpenSlotModal(null)" class="btn btn-primary" style="margin-top:16px;">+ Add ' + MODULE_CONFIG.slotLabel + '</button>' +
    '</div>' +

    '<div id="rb-pane-pricing" style="display:none">' +
      '<div id="rb-pricing-grid"></div>' +
    '</div>' +

    '<div id="rb-pane-addons" style="display:none">' +
      '<div id="rb-addons-list"></div>' +
      '<button onclick="rbOpenAddonModal(null)" class="btn btn-primary" style="margin-top:16px;">+ Add ' + MODULE_CONFIG.addOnLabel.slice(0,-1) + '</button>' +
    '</div>' +

    '<div id="rb-pane-availability" style="display:none">' +
      '<div id="rb-avail-wrap"></div>' +
    '</div>' +

    '<div id="rb-pane-waivers" style="display:none">' +
      '<div id="rb-waiver-wrap"></div>' +
    '</div>' +

    '<div id="rb-pane-bookings" style="display:none">' +
      '<div id="rb-bookings-wrap"></div>' +
    '</div>' +

  '</div>';
}

function rbTab(id, label) {
  return '<div class="rb-tab' + (id==='items'?' rb-active':'') + '" data-pane="' + id + '" ' +
    'onclick="rbSwitchTab(this)" ' +
    'style="padding:10px 18px;font-size:14px;font-weight:600;cursor:pointer;' +
    'border-bottom:2px solid ' + (id==='items'?'var(--primary)':'transparent') + ';' +
    'color:' + (id==='items'?'var(--primary)':'var(--text-muted)') + ';">' +
    label + '</div>';
}

// ── Init ────────────────────────────────────
var _rbItems = [];
var _rbSlots = [];
var _rbAddons = [];

async function rbInit() {
  await rbLoadItems();
  await rbLoadSlots();
  await rbLoadAddons();
  rbCheckPayment();
}

function rbSwitchTab(el) {
  document.querySelectorAll('.rb-tab').forEach(function(t) {
    t.style.borderBottomColor = 'transparent';
    t.style.color = 'var(--text-muted)';
  });
  el.style.borderBottomColor = 'var(--primary)';
  el.style.color = 'var(--primary)';

  document.querySelectorAll('[id^="rb-pane-"]').forEach(function(p) {
    p.style.display = 'none';
  });

  var pane = document.getElementById('rb-pane-' + el.dataset.pane);
  if (pane) pane.style.display = 'block';

  if (el.dataset.pane === 'pricing') rbRenderPricing();
  if (el.dataset.pane === 'availability') rbRenderAvailability();
  if (el.dataset.pane === 'waivers') rbRenderWaiver();
  if (el.dataset.pane === 'bookings') rbRenderBookings();
}

// ── Payment status ──────────────────────────
async function rbCheckPayment() {
  var token = CC.getToken();
  try {
    var r = await fetch(window.CC_API_BASE + '/api/stripe/status', { headers: { 'Authorization': 'Bearer ' + token } });
    var d = await r.json();
    var el = document.getElementById('rb-payment-status');
    if (el) {
      if (d.connected) {
        el.textContent = '💳 Stripe connected';
        el.style.color = 'var(--success)';
      } else {
        el.innerHTML = '⚠️ <a href="#" onclick="showPage(\'connections\');return false;" style="color:var(--warning);">Connect payment to accept bookings</a>';
      }
    }
  } catch(e) {}
}

// ── Fleet / Items ────────────────────────────
async function rbLoadItems() {
  var el = document.getElementById('rb-items-list');
  if (!el) return;
  try {
    var data = await CC.dashboard.getFleet();
    _rbItems = data || [];
  } catch(e) { _rbItems = []; }

  if (!_rbItems.length) {
    el.innerHTML = '<p style="color:var(--text-muted);padding:20px 0;">No ' + MODULE_CONFIG.itemLabelPlural.toLowerCase() + ' yet. Add your first one.</p>';
    return;
  }

  el.innerHTML = _rbItems.map(function(item) {
    return '<div style="background:var(--bg);border:1px solid var(--card-border);border-radius:10px;padding:16px;margin-bottom:12px;display:flex;align-items:center;gap:16px;">' +
      (item.image_url
        ? '<img src="' + esc(item.image_url) + '" style="width:70px;height:70px;object-fit:cover;border-radius:8px;flex-shrink:0;">'
        : '<div style="width:70px;height:70px;background:var(--card-border);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:28px;flex-shrink:0;">' + MODULE_CONFIG.itemIcon + '</div>') +
      '<div style="flex:1;">' +
        '<div style="font-size:15px;font-weight:700;margin-bottom:4px;">' + esc(item.name) + '</div>' +
        '<div style="font-size:13px;color:var(--text-muted);margin-bottom:4px;">' + esc(item.description || '') + '</div>' +
        (item.max_capacity ? '<div style="font-size:12px;color:var(--text-dim);">Max ' + item.max_capacity + ' guests</div>' : '') +
      '</div>' +
      '<div style="display:flex;gap:8px;">' +
        '<button onclick="rbOpenItemModal(\'' + item.id + '\')" class="btn btn-outline btn-sm">Edit</button>' +
        '<button onclick="rbDeleteItem(\'' + item.id + '\')" class="btn btn-sm" style="color:var(--danger);border-color:var(--danger);background:transparent;">Delete</button>' +
      '</div>' +
    '</div>';
  }).join('');
}

function rbOpenItemModal(id) {
  var item = id ? _rbItems.find(function(x){ return x.id === id; }) : null;
  rbShowModal('modal-rb-item', item ? 'Edit ' + MODULE_CONFIG.itemLabel : 'Add ' + MODULE_CONFIG.itemLabel,
    '<div style="display:grid;gap:14px;">' +
    field('Name', 'rb-item-name', 'text', item ? item.name : '', 'e.g. Single Seater') +
    field('Description', 'rb-item-desc', 'textarea', item ? item.description || '' : '', 'What\'s included, specs, details') +
    fieldRow(
      field('Max Guests', 'rb-item-cap', 'number', item ? item.max_capacity || '' : '', '6'),
      field('Base Price ($)', 'rb-item-price', 'number', item ? item.base_price || '' : '', '150')
    ) +
    field('Image URL', 'rb-item-img', 'text', item ? item.image_url || '' : '', 'https://...') +
    '<button onclick="rbSaveItem(\'' + (id||'') + '\')" class="btn btn-primary btn-full">Save ' + MODULE_CONFIG.itemLabel + '</button>' +
    '</div>'
  );
}

async function rbSaveItem(id) {
  var d = {
    name: val('rb-item-name'),
    description: val('rb-item-desc'),
    max_capacity: parseInt(val('rb-item-cap')) || null,
    base_price: parseFloat(val('rb-item-price')) || null,
    image_url: val('rb-item-img')
  };
  if (!d.name) { toast('Name is required', 'error'); return; }
  var token = CC.getToken();
  var url = window.CC_API_BASE + '/api/site/fleet' + (id ? '/' + id : '');
  var r = await fetch(url, { method: id ? 'PUT' : 'POST', headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(d) });
  var res = await r.json();
  if (res.error) { toast(res.error, 'error'); return; }
  rbCloseModal('modal-rb-item');
  toast(MODULE_CONFIG.itemLabel + ' saved', 'success');
  rbLoadItems();
}

async function rbDeleteItem(id) {
  if (!confirm('Delete this ' + MODULE_CONFIG.itemLabel.toLowerCase() + '?')) return;
  var token = CC.getToken();
  await fetch(window.CC_API_BASE + '/api/site/fleet/' + id, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + token } });
  toast('Deleted', 'success');
  rbLoadItems();
}

// ── Time Slots ──────────────────────────────
async function rbLoadSlots() {
  var el = document.getElementById('rb-slots-list');
  if (!el) return;
  try {
    var r = await fetch(window.CC_API_BASE + '/api/site/time-slots', { headers: { 'Authorization': 'Bearer ' + CC.getToken() } });
    _rbSlots = r.ok ? await r.json() : [];
  } catch(e) { _rbSlots = []; }

  if (!_rbSlots.length) {
    el.innerHTML = '<p style="color:var(--text-muted);padding:20px 0;">No time slots yet. Add Half Day, Full Day, etc.</p>';
    return;
  }

  el.innerHTML = _rbSlots.map(function(s) {
    return '<div style="background:var(--bg);border:1px solid var(--card-border);border-radius:10px;padding:14px;margin-bottom:10px;display:flex;align-items:center;gap:12px;">' +
      '<div style="flex:1;">' +
        '<div style="font-weight:600;">' + esc(s.name) + '</div>' +
        '<div style="font-size:12px;color:var(--text-muted);">' + (s.start_time||'') + ' – ' + (s.end_time||'') + '</div>' +
      '</div>' +
      '<button onclick="rbOpenSlotModal(\'' + s.id + '\')" class="btn btn-outline btn-sm">Edit</button>' +
      '<button onclick="rbDeleteSlot(\'' + s.id + '\')" class="btn btn-sm" style="color:var(--danger);border-color:var(--danger);background:transparent;">Delete</button>' +
    '</div>';
  }).join('');
}

function rbOpenSlotModal(id) {
  var s = id ? _rbSlots.find(function(x){ return x.id === id; }) : null;
  rbShowModal('modal-rb-slot', s ? 'Edit ' + MODULE_CONFIG.slotLabel : 'Add ' + MODULE_CONFIG.slotLabel,
    '<div style="display:grid;gap:14px;">' +
    field('Name', 'rb-slot-name', 'text', s ? s.name : '', 'e.g. Half Day AM') +
    fieldRow(
      field('Start Time', 'rb-slot-start', 'time', s ? s.start_time || '' : ''),
      field('End Time', 'rb-slot-end', 'time', s ? s.end_time || '' : '')
    ) +
    '<button onclick="rbSaveSlot(\'' + (id||'') + '\')" class="btn btn-primary btn-full">Save ' + MODULE_CONFIG.slotLabel + '</button>' +
    '</div>'
  );
}

async function rbSaveSlot(id) {
  var d = { name: val('rb-slot-name'), start_time: val('rb-slot-start'), end_time: val('rb-slot-end') };
  if (!d.name) { toast('Name required', 'error'); return; }
  var token = CC.getToken();
  var url = window.CC_API_BASE + '/api/site/time-slots' + (id ? '/' + id : '');
  var r = await fetch(url, { method: id ? 'PUT' : 'POST', headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(d) });
  var res = await r.json();
  if (res.error) { toast(res.error, 'error'); return; }
  rbCloseModal('modal-rb-slot');
  toast(MODULE_CONFIG.slotLabel + ' saved', 'success');
  rbLoadSlots();
}

async function rbDeleteSlot(id) {
  if (!confirm('Delete this time slot?')) return;
  var token = CC.getToken();
  await fetch(window.CC_API_BASE + '/api/site/time-slots/' + id, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + token } });
  toast('Deleted', 'success');
  rbLoadSlots();
}

// ── Pricing Grid ────────────────────────────
async function rbRenderPricing() {
  var el = document.getElementById('rb-pricing-grid');
  if (!el) return;
  if (!_rbItems.length || !_rbSlots.length) {
    el.innerHTML = '<p style="color:var(--text-muted)">Add ' + MODULE_CONFIG.itemLabelPlural.toLowerCase() + ' and time slots first.</p>';
    return;
  }
  var token = CC.getToken();
  var r = await fetch(window.CC_API_BASE + '/api/site/pricing', { headers: { 'Authorization': 'Bearer ' + token } });
  var pricing = r.ok ? await r.json() : [];

  var html = '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;">' +
    '<thead><tr><th style="text-align:left;padding:10px;border-bottom:1px solid var(--card-border);">' + MODULE_CONFIG.itemLabel + '</th>' +
    _rbSlots.map(function(s){ return '<th style="padding:10px;border-bottom:1px solid var(--card-border);text-align:center;font-size:13px;">' + esc(s.name) + '</th>'; }).join('') +
    '</tr></thead><tbody>';

  _rbItems.forEach(function(item) {
    html += '<tr><td style="padding:10px;font-weight:600;font-size:13px;">' + esc(item.name) + '</td>';
    _rbSlots.forEach(function(slot) {
      var p = pricing.find(function(x){ return x.fleet_type_id === item.id && x.time_slot_id === slot.id; });
      html += '<td style="padding:8px;text-align:center;">' +
        '<div style="display:flex;align-items:center;justify-content:center;gap:4px;">' +
        '<span style="color:var(--text-muted);font-size:13px;">$</span>' +
        '<input type="number" value="' + (p ? p.price || '' : '') + '" ' +
        'onchange="rbSavePrice(\'' + item.id + '\',\'' + slot.id + '\',this.value)" ' +
        'style="width:80px;padding:6px;background:var(--bg);border:1px solid var(--card-border);border-radius:6px;color:var(--text);font-size:13px;text-align:center;">' +
        '</div></td>';
    });
    html += '</tr>';
  });

  html += '</tbody></table></div>';
  el.innerHTML = html;
}

async function rbSavePrice(itemId, slotId, price) {
  var token = CC.getToken();
  var r = await fetch(window.CC_API_BASE + '/api/site/pricing', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fleet_type_id: itemId, time_slot_id: slotId, price: parseFloat(price) || 0 })
  });
  var d = await r.json();
  if (!d.error) toast('Price saved', 'success');
}

// ── Add-ons ─────────────────────────────────
async function rbLoadAddons() {
  var el = document.getElementById('rb-addons-list');
  if (!el) return;
  try {
    var r = await fetch(window.CC_API_BASE + '/api/site/addons', { headers: { 'Authorization': 'Bearer ' + CC.getToken() } });
    _rbAddons = r.ok ? await r.json() : [];
  } catch(e) { _rbAddons = []; }

  if (!_rbAddons.length) {
    el.innerHTML = '<p style="color:var(--text-muted);padding:20px 0;">No add-ons yet. Add extras customers can purchase with their booking.</p>';
    return;
  }

  el.innerHTML = _rbAddons.map(function(a) {
    return '<div style="background:var(--bg);border:1px solid var(--card-border);border-radius:10px;padding:14px;margin-bottom:10px;display:flex;align-items:center;gap:12px;">' +
      '<span style="font-size:28px;">' + (a.icon || '📦') + '</span>' +
      '<div style="flex:1;">' +
        '<div style="font-weight:600;">' + esc(a.name) + '</div>' +
        '<div style="font-size:12px;color:var(--text-muted);">$' + (a.price || 0) + ' · ' + esc(a.per_unit || '') + '</div>' +
      '</div>' +
      '<button onclick="rbOpenAddonModal(\'' + a.id + '\')" class="btn btn-outline btn-sm">Edit</button>' +
      '<button onclick="rbDeleteAddon(\'' + a.id + '\')" class="btn btn-sm" style="color:var(--danger);border-color:var(--danger);background:transparent;">Delete</button>' +
    '</div>';
  }).join('');
}

function rbOpenAddonModal(id) {
  var a = id ? _rbAddons.find(function(x){ return x.id === id; }) : null;
  rbShowModal('modal-rb-addon', a ? 'Edit Add-on' : 'Add Add-on',
    '<div style="display:grid;gap:14px;">' +
    field('Name', 'rb-addon-name', 'text', a ? a.name : '', 'e.g. Cooler Pack') +
    field('Description', 'rb-addon-desc', 'text', a ? a.description || '' : '', 'What\'s included') +
    fieldRow(
      field('Price ($)', 'rb-addon-price', 'number', a ? a.price || '' : '', '25'),
      field('Icon (emoji)', 'rb-addon-icon', 'text', a ? a.icon || '' : '', '🧊')
    ) +
    field('Per Unit Label', 'rb-addon-unit', 'text', a ? a.per_unit || '' : '', 'per day') +
    '<button onclick="rbSaveAddon(\'' + (id||'') + '\')" class="btn btn-primary btn-full">Save Add-on</button>' +
    '</div>'
  );
}

async function rbSaveAddon(id) {
  var d = {
    name: val('rb-addon-name'),
    description: val('rb-addon-desc'),
    price: parseFloat(val('rb-addon-price')) || 0,
    icon: val('rb-addon-icon'),
    per_unit: val('rb-addon-unit')
  };
  if (!d.name) { toast('Name required', 'error'); return; }
  var token = CC.getToken();
  var url = window.CC_API_BASE + '/api/site/addons' + (id ? '/' + id : '');
  var r = await fetch(url, { method: id ? 'PUT' : 'POST', headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(d) });
  var res = await r.json();
  if (res.error) { toast(res.error, 'error'); return; }
  rbCloseModal('modal-rb-addon');
  toast('Add-on saved', 'success');
  rbLoadAddons();
}

async function rbDeleteAddon(id) {
  if (!confirm('Delete this add-on?')) return;
  var token = CC.getToken();
  await fetch(window.CC_API_BASE + '/api/site/addons/' + id, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + token } });
  toast('Deleted', 'success');
  rbLoadAddons();
}

// ── Availability ────────────────────────────
function rbRenderAvailability() {
  var el = document.getElementById('rb-avail-wrap');
  if (!el) return;
  el.innerHTML = '<div id="availability-calendar-container"></div>';
  if (typeof loadAvailabilityItems === 'function') loadAvailabilityItems();
}

// ── Waiver ──────────────────────────────────
async function rbRenderWaiver() {
  var el = document.getElementById('rb-waiver-wrap');
  if (!el) return;
  var token = CC.getToken();
  var r = await fetch(window.CC_API_BASE + '/api/site/waivers/template', { headers: { 'Authorization': 'Bearer ' + token } });
  var d = r.ok ? await r.json() : {};

  el.innerHTML =
    '<div style="margin-bottom:20px;">' +
      '<label style="display:flex;align-items:center;gap:10px;font-size:14px;cursor:pointer;">' +
        '<input type="checkbox" id="rb-waiver-required" ' + (d.waiver_required ? 'checked' : '') + ' style="width:16px;height:16px;">' +
        '<span>Require customers to sign a waiver before booking</span>' +
      '</label>' +
    '</div>' +
    '<div>' +
      '<label style="display:block;font-size:12px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;">Waiver Text</label>' +
      '<textarea id="rb-waiver-text" rows="12" style="width:100%;padding:12px;background:var(--bg);border:1px solid var(--card-border);border-radius:8px;color:var(--text);font-size:13px;line-height:1.6;resize:vertical;" placeholder="Enter your waiver / liability agreement text here...">' + esc(d.waiver_text || '') + '</textarea>' +
    '</div>' +
    '<button onclick="rbSaveWaiver()" class="btn btn-primary" style="margin-top:16px;">Save Waiver</button>' +
    '<div style="margin-top:20px;padding-top:20px;border-top:1px solid var(--card-border);">' +
      '<div style="font-size:13px;font-weight:600;margin-bottom:8px;">Signed Waivers</div>' +
      '<div id="rb-signed-waivers" style="color:var(--text-muted);font-size:13px;">Loading...</div>' +
    '</div>';

  rbLoadSignedWaivers();
}

async function rbSaveWaiver() {
  var token = CC.getToken();
  var r = await fetch(window.CC_API_BASE + '/api/site/waivers/template', {
    method: 'PUT',
    headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ waiver_text: val('rb-waiver-text'), waiver_required: document.getElementById('rb-waiver-required').checked })
  });
  var d = await r.json();
  if (d.error) { toast(d.error, 'error'); return; }
  toast('Waiver saved', 'success');
}

async function rbLoadSignedWaivers() {
  var el = document.getElementById('rb-signed-waivers');
  if (!el) return;
  var token = CC.getToken();
  var r = await fetch(window.CC_API_BASE + '/api/site/waivers/signed', { headers: { 'Authorization': 'Bearer ' + token } });
  var waivers = r.ok ? await r.json() : [];
  if (!waivers.length) { el.textContent = 'No signed waivers yet.'; return; }
  el.innerHTML = waivers.map(function(w) {
    return '<div style="padding:10px 0;border-bottom:1px solid var(--card-border);display:flex;align-items:center;gap:12px;">' +
      '<div style="flex:1;"><div style="font-size:13px;font-weight:600;">' + esc(w.customer_name || 'Guest') + '</div>' +
      '<div style="font-size:11px;color:var(--text-muted);">' + (w.signed_at ? new Date(w.signed_at).toLocaleDateString() : '') + '</div></div>' +
      '<span style="font-size:11px;color:var(--success);">✓ Signed</span>' +
    '</div>';
  }).join('');
}

// ── Bookings List ────────────────────────────
function rbRenderBookings() {
  var el = document.getElementById('rb-bookings-wrap');
  if (!el) return;
  el.innerHTML = '<div id="bookings-stats"></div><div id="bookings-filters"></div><div id="bookings-table"></div>';
  if (typeof loadBookings === 'function') loadBookings();
}

// ── Modal helpers ────────────────────────────
function rbShowModal(id, title, body) {
  var existing = document.getElementById(id);
  if (existing) existing.remove();
  var m = document.createElement('div');
  m.id = id;
  m.className = 'modal open';
  m.innerHTML =
    '<div class="modal-overlay" onclick="rbCloseModal(\'' + id + '\')"></div>' +
    '<div class="modal-box">' +
      '<div class="modal-header">' +
        '<h3 class="modal-title">' + title + '</h3>' +
        '<button onclick="rbCloseModal(\'' + id + '\')" class="modal-close">✕</button>' +
      '</div>' +
      '<div class="modal-body">' + body + '</div>' +
    '</div>';
  document.body.appendChild(m);
}

function rbCloseModal(id) {
  var m = document.getElementById(id);
  if (m) m.remove();
}

// ── Form field helpers ───────────────────────
function field(label, id, type, value, placeholder) {
  if (type === 'textarea') {
    return '<div><label style="display:block;font-size:12px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;">' + label + '</label>' +
      '<textarea id="' + id + '" style="width:100%;padding:10px 12px;background:var(--bg);border:1px solid var(--card-border);border-radius:8px;color:var(--text);font-size:14px;resize:vertical;min-height:72px;" placeholder="' + (placeholder||'') + '">' + (value||'') + '</textarea></div>';
  }
  return '<div><label style="display:block;font-size:12px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;">' + label + '</label>' +
    '<input id="' + id + '" type="' + type + '" value="' + esc(value||'') + '" placeholder="' + esc(placeholder||'') + '" ' +
    'style="width:100%;padding:10px 12px;background:var(--bg);border:1px solid var(--card-border);border-radius:8px;color:var(--text);font-size:14px;"></div>';
}

function fieldRow() {
  return '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">' + Array.from(arguments).join('') + '</div>';
}

function val(id) {
  var el = document.getElementById(id);
  return el ? el.value.trim() : '';
}

function esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
