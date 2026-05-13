// ============================================
// Coupons & Promo Codes — create, manage,
// embed on website, SMS marketing campaigns
// ============================================

var COUPONS_STORAGE = 'beachside_coupons';
var CAMPAIGNS_STORAGE = 'beachside_campaigns';
var _coupons = [];
var _campaigns = [];
var _couponFilter = 'all';

async function loadCoupons() {
  var apiData = await CC.dashboard.getCoupons();
  if (apiData && Array.isArray(apiData)) {
    _coupons = apiData.map(function(c) {
      return {
        id: c.id, code: c.code || '', type: c.type || 'percentage', amount: c.amount || 0,
        minOrder: c.min_order || 0, maxUses: c.max_uses || -1, usedCount: c.uses_count || 0,
        expiry: c.expires_at ? c.expires_at.split('T')[0] : '', active: c.active !== false,
        createdAt: c.created_at || '', description: c.description || ''
      };
    });
  }

  renderCouponsPage();
}

function saveCoupons() { /* saved via CC.dashboard on each action */ }
function saveCampaigns() { /* saved via CC.dashboard on each action */ }

function renderCouponsPage() {
  renderCouponStats();
  renderCouponFilters();
  renderCouponList();
  renderSmsCampaigns();
  renderWebsiteEmbed();
}

// ---- Stats ----

function renderCouponStats() {
  var container = document.getElementById('coupon-stats');
  if (!container) return;

  var active = _coupons.filter(function(c) { return c.active; }).length;
  var totalUsed = _coupons.reduce(function(s, c) { return s + c.usedCount; }, 0);
  var campaigns = _campaigns.length;

  var html = '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;padding-bottom:20px;">';
  html += '<div style="text-align:center;"><div style="font-size:28px;font-weight:700;color:var(--text);">' + _coupons.length + '</div><div style="font-size:12px;color:var(--text-muted);">Total Coupons</div></div>';
  html += '<div style="text-align:center;"><div style="font-size:28px;font-weight:700;color:var(--primary);">' + active + '</div><div style="font-size:12px;color:var(--text-muted);">Active</div></div>';
  html += '<div style="text-align:center;"><div style="font-size:28px;font-weight:700;color:#f59e0b;">' + totalUsed + '</div><div style="font-size:12px;color:var(--text-muted);">Times Used</div></div>';
  html += '<div style="text-align:center;"><div style="font-size:28px;font-weight:700;color:#a855f7;">' + campaigns + '</div><div style="font-size:12px;color:var(--text-muted);">Campaigns</div></div>';
  html += '</div>';

  container.innerHTML = html;
}

// ---- Filters ----

function renderCouponFilters() {
  var container = document.getElementById('coupon-filters');
  if (!container) return;

  var html = '<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">';
  html += '<div style="display:flex;gap:6px;">';
  ['all','active','expired'].forEach(function(f) {
    html += '<button class="btn btn-sm ' + (_couponFilter === f ? 'btn-primary' : 'btn-outline') + '" onclick="filterCoupons(\'' + f + '\')">' + f.charAt(0).toUpperCase() + f.slice(1) + '</button>';
  });
  html += '</div>';
  html += '<div style="flex:1;"></div>';
  html += '<button class="btn btn-primary btn-sm" onclick="openCouponModal()">Create Coupon</button>';
  html += '</div>';

  container.innerHTML = html;
}

function filterCoupons(f) {
  _couponFilter = f;
  renderCouponFilters();
  renderCouponList();
}

// ---- Coupon List ----

function renderCouponList() {
  var container = document.getElementById('coupon-list');
  if (!container) return;

  var now = new Date().toISOString().split('T')[0];
  var filtered = _coupons;

  if (_couponFilter === 'active') {
    filtered = filtered.filter(function(c) { return c.active && (!c.expiry || c.expiry >= now); });
  } else if (_couponFilter === 'expired') {
    filtered = filtered.filter(function(c) { return !c.active || (c.expiry && c.expiry < now); });
  }

  if (filtered.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted);">No coupons found</div>';
    return;
  }

  var html = '';
  filtered.forEach(function(c) {
    var isExpired = c.expiry && c.expiry < now;
    var isMaxed = c.maxUses > 0 && c.usedCount >= c.maxUses;
    var statusBadge = (!c.active || isExpired || isMaxed) ?
      '<span class="badge badge-danger">' + (isExpired ? 'Expired' : isMaxed ? 'Maxed Out' : 'Disabled') + '</span>' :
      '<span class="badge badge-success">Active</span>';

    html += '<div style="display:flex;align-items:center;gap:16px;padding:16px;background:var(--bg);border:1px solid var(--card-border);border-radius:var(--radius);margin-bottom:8px;">';

    // Code badge
    html += '<div style="min-width:140px;padding:10px 16px;background:var(--card-bg);border:2px dashed var(--primary);border-radius:var(--radius);text-align:center;">';
    html += '<div style="font-size:18px;font-weight:800;font-family:\'SF Mono\',\'Fira Code\',monospace;color:var(--primary);letter-spacing:1px;">' + escHtml(c.code) + '</div>';
    html += '<div style="font-size:12px;color:var(--text-muted);margin-top:2px;">' + (c.type === 'percent' ? c.amount + '% off' : '$' + c.amount + ' off') + '</div>';
    html += '</div>';

    // Details
    html += '<div style="flex:1;">';
    html += '<div style="font-size:14px;font-weight:600;color:var(--text);">' + escHtml(c.description || c.code) + '</div>';
    html += '<div style="font-size:12px;color:var(--text-muted);margin-top:4px;">';
    html += 'Min order: $' + (c.minOrder || 0);
    if (c.expiry) html += ' | Expires: ' + c.expiry;
    if (c.maxUses > 0) html += ' | Max uses: ' + c.maxUses;
    html += '</div>';
    html += '</div>';

    // Usage
    html += '<div style="text-align:center;min-width:80px;">';
    html += '<div style="font-size:22px;font-weight:700;color:var(--text);">' + c.usedCount + '</div>';
    html += '<div style="font-size:11px;color:var(--text-muted);">used' + (c.maxUses > 0 ? '/' + c.maxUses : '') + '</div>';
    html += '</div>';

    // Status + actions
    html += '<div style="display:flex;align-items:center;gap:8px;">';
    html += statusBadge;
    html += '<button class="btn btn-outline btn-sm" onclick="toggleCoupon(\'' + c.id + '\')" title="' + (c.active ? 'Disable' : 'Enable') + '">' + (c.active ? 'Disable' : 'Enable') + '</button>';
    html += '<button class="btn btn-outline btn-sm" onclick="copyCouponCode(\'' + escHtml(c.code) + '\')" title="Copy code">Copy</button>';
    html += '<button class="btn btn-danger btn-sm" onclick="deleteCoupon(\'' + c.id + '\')" title="Delete">&times;</button>';
    html += '</div>';

    html += '</div>';
  });

  container.innerHTML = html;
}

async function toggleCoupon(id) {
  var c = _coupons.find(function(x) { return x.id === id; });
  if (c) {
    c.active = !c.active;
    await CC.dashboard.updateCoupon(id, { active: c.active });
    renderCouponsPage();
    toast(c.active ? 'Coupon enabled' : 'Coupon disabled');
  }
}

async function deleteCoupon(id) {
  if (!confirm('Delete this coupon?')) return;
  await CC.dashboard.deleteCoupon(id);
  await loadCoupons();
  toast('Coupon deleted from database');
}

function copyCouponCode(code) {
  navigator.clipboard.writeText(code);
  toast('Copied: ' + code);
}

// ---- Create / Edit Coupon ----

function openCouponModal(id) {
  var c = id ? _coupons.find(function(x) { return x.id === id; }) : null;

  var html = '<div style="padding:20px;">';
  html += '<div class="form-row"><div class="form-group"><label>Coupon Code</label><input type="text" id="coupon-code" value="' + escHtml(c ? c.code : '') + '" placeholder="SUMMER25" style="text-transform:uppercase;font-weight:700;letter-spacing:1px;"></div>';
  html += '<div class="form-group"><label>Discount Type</label><select id="coupon-type"><option value="percent"' + (c && c.type === 'percent' ? ' selected' : '') + '>Percentage (%)</option><option value="fixed"' + (c && c.type === 'fixed' ? ' selected' : '') + '>Fixed Amount ($)</option></select></div></div>';
  html += '<div class="form-row"><div class="form-group"><label>Amount</label><input type="number" id="coupon-amount" value="' + (c ? c.amount : '') + '" min="0" step="1" placeholder="20"></div>';
  html += '<div class="form-group"><label>Minimum Order ($)</label><input type="number" id="coupon-min" value="' + (c ? c.minOrder : '0') + '" min="0" step="1"></div></div>';
  html += '<div class="form-row"><div class="form-group"><label>Expiry Date</label><input type="date" id="coupon-expiry" value="' + (c ? c.expiry : '') + '"></div>';
  html += '<div class="form-group"><label>Max Uses (0 = unlimited)</label><input type="number" id="coupon-max" value="' + (c ? (c.maxUses === -1 ? 0 : c.maxUses) : '0') + '" min="0"></div></div>';
  html += '<div class="form-group"><label>Description</label><input type="text" id="coupon-desc" value="' + escHtml(c ? c.description : '') + '" placeholder="Short description..."></div>';
  html += '<div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px;">';
  html += '<button class="btn btn-outline" onclick="closeModal(\'modal-coupon\')">Cancel</button>';
  html += '<button class="btn btn-primary" onclick="saveCoupon(\'' + (id || '') + '\')">Save Coupon</button>';
  html += '</div></div>';

  document.getElementById('coupon-modal-title').textContent = c ? 'Edit Coupon' : 'Create Coupon';
  document.getElementById('coupon-modal-body').innerHTML = html;
  openModal('modal-coupon');
}

async function saveCoupon(existingId) {
  var code = (document.getElementById('coupon-code').value || '').toUpperCase().trim().replace(/\s+/g, '');
  var type = document.getElementById('coupon-type').value;
  var amount = parseFloat(document.getElementById('coupon-amount').value) || 0;
  var minOrder = parseFloat(document.getElementById('coupon-min').value) || 0;
  var expiry = document.getElementById('coupon-expiry').value || '';
  var maxUses = parseInt(document.getElementById('coupon-max').value) || 0;
  var desc = document.getElementById('coupon-desc').value.trim();

  if (!code) { toast('Coupon code is required', 'error'); return; }
  if (amount <= 0) { toast('Amount must be greater than 0', 'error'); return; }

  var couponData = {
    code: code, type: type, amount: amount, min_order: minOrder,
    max_uses: maxUses <= 0 ? null : maxUses,
    expires_at: expiry ? expiry + 'T23:59:59Z' : null,
    description: desc, active: true
  };

  if (existingId) {
    await CC.dashboard.updateCoupon(existingId, couponData);
  } else {
    await CC.dashboard.createCoupon(couponData);
  }

  await loadCoupons();
  closeModal('modal-coupon');
  toast('Coupon saved to database!', 'success');
}

// ---- Website Embed ----

function renderWebsiteEmbed() {
  var container = document.getElementById('coupon-embed');
  if (!container) return;

  var activeCoupons = _coupons.filter(function(c) { return c.active; });
  if (activeCoupons.length === 0) {
    container.innerHTML = '<p style="color:var(--text-muted);font-size:13px;">Create an active coupon first to generate a website banner.</p>';
    return;
  }

  var html = '';
  html += '<p style="font-size:13px;color:var(--text-muted);margin-bottom:12px;">Add a promo banner to your website. Select a coupon to generate the embed code.</p>';

  html += '<div style="display:flex;gap:10px;margin-bottom:16px;align-items:flex-end;">';
  html += '<div class="form-group" style="flex:1;margin-bottom:0;"><label>Coupon</label><select id="embed-coupon-select">';
  activeCoupons.forEach(function(c) {
    html += '<option value="' + c.id + '">' + c.code + ' (' + (c.type === 'percent' ? c.amount + '%' : '$' + c.amount) + ' off)</option>';
  });
  html += '</select></div>';
  html += '<button class="btn btn-primary btn-sm" onclick="generateEmbedCode()">Generate</button>';
  html += '</div>';

  html += '<div id="embed-code-output"></div>';

  // Preview
  html += '<div style="margin-top:16px;">';
  html += '<label style="font-size:12px;color:var(--text-muted);display:block;margin-bottom:6px;">Preview</label>';
  html += '<div style="padding:16px 24px;background:linear-gradient(135deg,var(--primary),#4DA6FF);border-radius:var(--radius);text-align:center;">';
  html += '<div style="color:white;font-size:18px;font-weight:700;">Use code <span style="border:2px dashed rgba(255,255,255,0.5);padding:4px 12px;border-radius:6px;letter-spacing:2px;">' + activeCoupons[0].code + '</span> for ' + (activeCoupons[0].type === 'percent' ? activeCoupons[0].amount + '%' : '$' + activeCoupons[0].amount) + ' off!</div>';
  html += '</div>';
  html += '</div>';

  container.innerHTML = html;
}

function generateEmbedCode() {
  var sel = document.getElementById('embed-coupon-select');
  var c = _coupons.find(function(x) { return x.id === sel.value; });
  if (!c) return;

  var discount = c.type === 'percent' ? c.amount + '%' : '$' + c.amount;
  var code = '<div style="padding:16px 24px;background:linear-gradient(135deg,#00ada8,#4DA6FF);border-radius:12px;text-align:center;margin:20px 0;">\n  <div style="color:white;font-size:18px;font-weight:700;">Use code <span style="border:2px dashed rgba(255,255,255,0.5);padding:4px 12px;border-radius:6px;letter-spacing:2px;">' + c.code + '</span> for ' + discount + ' off!</div>\n</div>';

  var output = document.getElementById('embed-code-output');
  if (output) {
    output.innerHTML = '<label style="font-size:12px;color:var(--text-muted);display:block;margin-bottom:4px;">Copy this HTML into your site editor</label><textarea rows="4" readonly onclick="this.select();navigator.clipboard.writeText(this.value);toast(\'Embed code copied!\')" style="width:100%;padding:10px;background:var(--bg);border:1px solid var(--card-border);border-radius:var(--radius);color:var(--text);font-size:12px;font-family:\'SF Mono\',monospace;">' + escHtml(code) + '</textarea>';
  }
}

// ---- SMS Marketing Campaigns ----

function renderSmsCampaigns() {
  var container = document.getElementById('sms-campaigns');
  if (!container) return;

  var html = '';

  // Compose new campaign
  html += '<div style="padding:20px;background:var(--bg);border:1px solid var(--card-border);border-radius:var(--radius);margin-bottom:16px;">';
  html += '<h4 style="font-size:15px;margin-bottom:12px;color:var(--text);">Send SMS Campaign</h4>';

  html += '<div class="form-row">';
  html += '<div class="form-group"><label>Audience</label><select id="campaign-audience">';
  html += '<option value="all">All Customers</option>';
  html += '<option value="vip">VIP / Repeat Customers</option>';
  html += '<option value="leads">Leads Only</option>';
  html += '<option value="inactive">Inactive Customers</option>';
  html += '</select></div>';

  html += '<div class="form-group"><label>Include Coupon</label><select id="campaign-coupon"><option value="">None</option>';
  _coupons.filter(function(c) { return c.active; }).forEach(function(c) {
    html += '<option value="' + c.code + '">' + c.code + ' (' + (c.type === 'percent' ? c.amount + '%' : '$' + c.amount) + ' off)</option>';
  });
  html += '</select></div>';
  html += '</div>';

  html += '<div class="form-group"><label>Message</label>';
  html += '<textarea id="campaign-message" rows="4" placeholder="Hey {{customer_name}}! Book your circle boat this weekend..." style="width:100%;padding:10px;background:var(--card-bg);border:1px solid var(--card-border);border-radius:var(--radius);color:var(--text);font-size:13px;resize:vertical;"></textarea>';
  html += '<div style="font-size:11px;color:var(--text-dim);margin-top:4px;">Use {{customer_name}} for personalization. Coupon code will be appended automatically.</div>';
  html += '</div>';

  html += '<div style="display:flex;align-items:center;gap:12px;">';
  html += '<button class="btn btn-primary" onclick="sendSmsCampaign()">Send Campaign</button>';
  html += '<button class="btn btn-outline btn-sm" onclick="previewSmsCampaign()">Preview</button>';
  html += '</div>';

  html += '</div>';

  // Campaign history
  if (_campaigns.length > 0) {
    html += '<h4 style="font-size:15px;margin-bottom:10px;color:var(--text);">Campaign History</h4>';
    _campaigns.forEach(function(camp) {
      html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:var(--bg);border:1px solid var(--card-border);border-radius:var(--radius);margin-bottom:6px;">';
      html += '<div>';
      html += '<div style="font-size:13px;font-weight:600;color:var(--text);">' + escHtml(camp.audience) + ' — ' + escHtml(camp.coupon || 'No coupon') + '</div>';
      html += '<div style="font-size:12px;color:var(--text-muted);">' + camp.sentAt + ' | ' + camp.recipientCount + ' recipients</div>';
      html += '</div>';
      html += '<span class="badge badge-success">Sent</span>';
      html += '</div>';
    });
  }

  container.innerHTML = html;
}

function previewSmsCampaign() {
  var msg = document.getElementById('campaign-message').value || '';
  var coupon = document.getElementById('campaign-coupon').value;
  var preview = msg.replace(/\{\{customer_name\}\}/g, 'John');
  if (coupon) preview += '\n\nUse code ' + coupon + ' at checkout!';
  toast('SMS Preview: ' + preview);
}

function sendSmsCampaign() {
  var audience = document.getElementById('campaign-audience').value;
  var coupon = document.getElementById('campaign-coupon').value;
  var message = document.getElementById('campaign-message').value.trim();

  if (!message) { toast('Message is required', 'error'); return; }
  if (!confirm('Send this SMS campaign to ' + audience + ' customers?')) return;

  var token = localStorage.getItem('cc_token') || localStorage.getItem('auth_token');
  fetch('/api/dashboard/sms/campaign', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    },
    body: JSON.stringify({
      audience: audience,
      coupon_code: coupon,
      message: message
    })
  })
  .then(function(r) { return r.json(); })
  .then(function(data) {
    if (data.error) { toast(data.error, 'error'); return; }
    toast('Campaign sent to ' + data.recipient_count + ' customers!', 'success');
    document.getElementById('campaign-message').value = '';
    loadCampaignsFromApi();
  })
  .catch(function(err) { toast('Failed: ' + err.message, 'error'); });
}

function loadCampaignsFromApi() {
  var token = localStorage.getItem('cc_token') || localStorage.getItem('auth_token');
  if (!token) return;
  fetch('/api/dashboard/sms/campaigns', {
    headers: { 'Authorization': 'Bearer ' + token }
  })
  .then(function(r) { return r.json(); })
  .then(function(campaigns) {
    _campaigns = (campaigns || []).map(function(c) {
      return {
        id: c.id,
        audience: c.audience,
        coupon: c.coupon_code,
        message: c.message,
        recipientCount: c.recipient_count,
        sentAt: c.created_at ? c.created_at.split('T')[0] : ''
      };
    });
    saveCampaigns();
    renderSmsCampaigns();
  })
  .catch(function() { renderSmsCampaigns(); });
}

if (typeof escHtml === 'undefined') {
  function escHtml(str) { var d = document.createElement('div'); d.textContent = str || ''; return d.innerHTML; }
}

onPageLoad('coupons', loadCoupons);
