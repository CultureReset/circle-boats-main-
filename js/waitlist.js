// ============================================
// Waitlist — when slots are full, customers join
// a waitlist and get SMS when spots open
// ============================================

var WAITLIST_STORAGE = 'beachside_waitlist';

var _waitlistSettings = {
  enabled: true,
  maxSize: 20,
  autoNotify: true,
  smsMessage: 'Great news, {{customer_name}}! A spot just opened up for {{date}} ({{time_slot}}) at Beachside Circle Boats. Book now before it\'s taken: {{booking_link}}\n\nReply REMOVE to leave the waitlist.'
};

var _waitlistEntries = [];

async function loadWaitlist() {
  var apiData = await CC.dashboard.getWaitlist();
  if (apiData) {
    if (apiData.settings && typeof apiData.settings === 'object' && apiData.settings.max_size !== undefined) {
      _waitlistSettings.enabled = apiData.settings.enabled !== false;
      _waitlistSettings.maxSize = apiData.settings.max_size || 20;
      _waitlistSettings.autoNotify = apiData.settings.auto_notify !== false;
      if (apiData.settings.sms_message) _waitlistSettings.smsMessage = apiData.settings.sms_message;
    }
    if (Array.isArray(apiData.entries)) {
      _waitlistEntries = apiData.entries.map(function(e) {
        return {
          id: e.id, name: e.customer_name || '', email: e.customer_email || '',
          phone: e.customer_phone || '', preferredDate: e.preferred_date || '',
          preferredSlot: e.preferred_slot || '', partySize: e.party_size || 1,
          status: e.status || 'waiting', addedAt: e.created_at || '',
          notifiedAt: e.notified_at || null, _apiId: e.id
        };
      });
      try { localStorage.setItem(WAITLIST_STORAGE, JSON.stringify({ settings: _waitlistSettings, entries: _waitlistEntries })); } catch(e) {}
    }
  } else {
    try {
      var saved = localStorage.getItem(WAITLIST_STORAGE);
      if (saved) {
        var parsed = JSON.parse(saved);
        if (parsed.settings) _waitlistSettings = parsed.settings;
        if (parsed.entries) _waitlistEntries = parsed.entries;
      }
    } catch(e) {}
  }
  renderWaitlistPage();
}

function saveWaitlist() {
  try { localStorage.setItem(WAITLIST_STORAGE, JSON.stringify({ settings: _waitlistSettings, entries: _waitlistEntries })); } catch(e) {}
}

function renderWaitlistPage() {
  renderWaitlistStats();
  renderWaitlistSettings();
  renderWaitlistEntries();
  renderWaitlistSmsTemplate();
}

// ---- Stats ----

function renderWaitlistStats() {
  var container = document.getElementById('waitlist-stats');
  if (!container) return;

  var waiting = _waitlistEntries.filter(function(e) { return e.status === 'waiting'; }).length;
  var notified = _waitlistEntries.filter(function(e) { return e.status === 'notified'; }).length;
  var booked = _waitlistEntries.filter(function(e) { return e.status === 'booked'; }).length;
  var removed = _waitlistEntries.filter(function(e) { return e.status === 'removed'; }).length;

  var html = '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;padding-bottom:20px;">';
  html += '<div style="text-align:center;"><div style="font-size:28px;font-weight:700;color:var(--text);">' + _waitlistEntries.length + '</div><div style="font-size:12px;color:var(--text-muted);">Total</div></div>';
  html += '<div style="text-align:center;"><div style="font-size:28px;font-weight:700;color:#f59e0b;">' + waiting + '</div><div style="font-size:12px;color:var(--text-muted);">Waiting</div></div>';
  html += '<div style="text-align:center;"><div style="font-size:28px;font-weight:700;color:#4DA6FF;">' + notified + '</div><div style="font-size:12px;color:var(--text-muted);">Notified</div></div>';
  html += '<div style="text-align:center;"><div style="font-size:28px;font-weight:700;color:#22c55e;">' + booked + '</div><div style="font-size:12px;color:var(--text-muted);">Converted</div></div>';
  html += '</div>';

  container.innerHTML = html;
}

// ---- Settings ----

function renderWaitlistSettings() {
  var container = document.getElementById('waitlist-settings');
  if (!container) return;

  var html = '<div style="display:grid;gap:12px;">';

  // Enable toggle
  html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;background:var(--bg);border:1px solid var(--card-border);border-radius:var(--radius);">';
  html += '<div><strong style="font-size:13px;">Enable Waitlist</strong><div style="font-size:12px;color:var(--text-dim);">When a time slot is fully booked, customers can join the waitlist</div></div>';
  html += '<label class="toggle"><input type="checkbox" ' + (_waitlistSettings.enabled ? 'checked' : '') + ' onchange="toggleWaitlistSetting(\'enabled\',this.checked)"><span class="toggle-slider"></span></label>';
  html += '</div>';

  // Auto-notify
  html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;background:var(--bg);border:1px solid var(--card-border);border-radius:var(--radius);">';
  html += '<div><strong style="font-size:13px;">Auto-notify via SMS</strong><div style="font-size:12px;color:var(--text-dim);">Automatically text waitlisted customers when a spot opens</div></div>';
  html += '<label class="toggle"><input type="checkbox" ' + (_waitlistSettings.autoNotify ? 'checked' : '') + ' onchange="toggleWaitlistSetting(\'autoNotify\',this.checked)"><span class="toggle-slider"></span></label>';
  html += '</div>';

  // Max size
  html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;background:var(--bg);border:1px solid var(--card-border);border-radius:var(--radius);">';
  html += '<div><strong style="font-size:13px;">Max Waitlist Size</strong><div style="font-size:12px;color:var(--text-dim);">Maximum number of people per time slot</div></div>';
  html += '<input type="number" value="' + _waitlistSettings.maxSize + '" min="1" max="100" style="width:80px;padding:8px;background:var(--bg);border:1px solid var(--card-border);border-radius:var(--radius);color:var(--text);font-size:14px;text-align:center;" onchange="updateWaitlistMax(this.value)">';
  html += '</div>';

  html += '</div>';
  container.innerHTML = html;
}

function toggleWaitlistSetting(key, val) {
  _waitlistSettings[key] = val;
  saveWaitlist();
}

function updateWaitlistMax(val) {
  _waitlistSettings.maxSize = parseInt(val) || 20;
  saveWaitlist();
}

// ---- Entries ----

function renderWaitlistEntries() {
  var container = document.getElementById('waitlist-entries');
  if (!container) return;

  var activeEntries = _waitlistEntries.filter(function(e) { return e.status === 'waiting' || e.status === 'notified'; });

  if (activeEntries.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted);">No one on the waitlist right now</div>';
    return;
  }

  var html = '<div class="table-wrap"><table><thead><tr>';
  html += '<th>#</th><th>Customer</th><th>Preferred Date</th><th>Time Slot</th><th>Boat</th><th>Party</th><th>Status</th><th>Actions</th>';
  html += '</tr></thead><tbody>';

  activeEntries.forEach(function(e, idx) {
    var statusBadge = e.status === 'notified' ?
      '<span class="badge badge-info">Notified</span>' :
      '<span class="badge badge-warning">Waiting</span>';

    html += '<tr>';
    html += '<td style="font-weight:700;color:var(--text-muted);">' + (idx + 1) + '</td>';
    html += '<td><div style="font-weight:600;">' + escHtml(e.name) + '</div><div style="font-size:11px;color:var(--text-muted);">' + escHtml(e.phone) + '</div></td>';
    html += '<td style="font-weight:600;">' + e.preferredDate + '</td>';
    html += '<td>' + escHtml(e.preferredSlot) + '</td>';
    html += '<td style="font-size:13px;">' + escHtml(e.boatType) + '</td>';
    html += '<td style="text-align:center;">' + e.partySize + '</td>';
    html += '<td>' + statusBadge + '</td>';
    html += '<td style="display:flex;gap:4px;">';
    if (e.status === 'waiting') {
      html += '<button class="btn btn-primary btn-sm" onclick="notifyWaitlistCustomer(\'' + e.id + '\')" title="Send SMS">Notify</button>';
    }
    html += '<button class="btn btn-outline btn-sm" onclick="convertWaitlistToBooking(\'' + e.id + '\')" title="Convert to booking">Book</button>';
    html += '<button class="btn btn-danger btn-sm" onclick="removeFromWaitlist(\'' + e.id + '\')">&times;</button>';
    html += '</td>';
    html += '</tr>';
  });

  html += '</tbody></table></div>';
  container.innerHTML = html;
}

function notifyWaitlistCustomer(id) {
  var e = _waitlistEntries.find(function(x) { return x.id === id; });
  if (!e) return;
  var notifiedAt = new Date().toISOString();
  CC.dashboard.updateWaitlistEntry(id, { status: 'notified', notified_at: notifiedAt }).then(function() {
    e.status = 'notified';
    e.notifiedAt = notifiedAt;
    renderWaitlistPage();
    toast('SMS sent to ' + e.name + '!', 'success');
  });
}

function convertWaitlistToBooking(id) {
  var e = _waitlistEntries.find(function(x) { return x.id === id; });
  if (!e || !confirm('Convert ' + e.name + ' to a confirmed booking?')) return;
  CC.dashboard.updateWaitlistEntry(id, { status: 'booked' }).then(function() {
    e.status = 'booked';
    renderWaitlistPage();
    toast(e.name + ' converted to booking!', 'success');
  });
}

function removeFromWaitlist(id) {
  var e = _waitlistEntries.find(function(x) { return x.id === id; });
  if (!e || !confirm('Remove ' + e.name + ' from the waitlist?')) return;
  CC.dashboard.deleteWaitlistEntry(id).then(function() {
    _waitlistEntries = _waitlistEntries.filter(function(x) { return x.id !== id; });
    renderWaitlistPage();
    toast('Removed from waitlist');
  });
}

// ---- SMS Template ----

function renderWaitlistSmsTemplate() {
  var container = document.getElementById('waitlist-sms-template');
  if (!container) return;

  var html = '';
  html += '<textarea id="waitlist-sms-editor" rows="5" style="width:100%;padding:10px 14px;background:var(--bg);border:1px solid var(--card-border);border-radius:var(--radius);color:var(--text);font-size:13px;font-family:\'SF Mono\',\'Fira Code\',monospace;resize:vertical;line-height:1.6;">' + escHtml(_waitlistSettings.smsMessage) + '</textarea>';
  html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-top:8px;">';
  html += '<span style="font-size:11px;color:var(--text-dim);">Tokens: {{customer_name}}, {{date}}, {{time_slot}}, {{booking_link}}</span>';
  html += '<button class="btn btn-primary btn-sm" onclick="saveWaitlistSms()">Save Template</button>';
  html += '</div>';

  container.innerHTML = html;
}

function saveWaitlistSms() {
  var el = document.getElementById('waitlist-sms-editor');
  if (el) _waitlistSettings.smsMessage = el.value;
  CC.dashboard.updateWaitlistSettings({
    enabled: _waitlistSettings.enabled,
    max_size: _waitlistSettings.maxSize,
    auto_notify: _waitlistSettings.autoNotify,
    sms_message: _waitlistSettings.smsMessage
  }).then(function() { toast('Waitlist SMS template saved'); });
}

if (typeof escHtml === 'undefined') {
  function escHtml(str) { var d = document.createElement('div'); d.textContent = str || ''; return d.innerHTML; }
}

onPageLoad('waitlist', loadWaitlist);
