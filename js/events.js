// ============================================
// Events & Live Music — CRUD + AI extraction
// ============================================

var _events = [];
var _extractedEvents = null;

var DAY_ORDER = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

function nextDateForDay(dayName) {
  var target = DAY_ORDER.findIndex(function(d) { return d.toLowerCase() === dayName.toLowerCase().trim(); });
  if (target === -1) return null;
  var now = new Date();
  var diff = (target - now.getDay() + 7) % 7;
  var next = new Date(now);
  next.setDate(now.getDate() + diff);
  return next.toISOString().split('T')[0]; // YYYY-MM-DD
}

function loadEvents() {
  CC.dashboard.getEvents().then(function(data) {
    _events = data || [];
    renderEvents();
  });
}

function evTableRows(evts) {
  if (!evts.length) return '<tr><td colspan="5" style="color:var(--text-muted);font-size:13px;padding:10px;">None</td></tr>';
  return evts.map(function(ev) {
    var dateDisplay = '';
    if (ev.event_date) {
      var d = new Date(ev.event_date + 'T12:00:00');
      dateDisplay = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    }
    var time = [ev.start_time, ev.end_time].filter(Boolean).join(' – ');
    var detail = [ev.artist_name, ev.cover_charge, ev.description].filter(Boolean).join(' · ');
    var entityLabel = ev.entity ? (' <span style="font-size:11px;color:var(--text-muted);">@ ' + escEvHtml((ev.entity.name || '')) + '</span>') : '';
    return '<tr>'
      + '<td><strong>' + escEvHtml(ev.event_name || ev.artist_name || '') + '</strong>' + entityLabel + '</td>'
      + '<td>' + escEvHtml(dateDisplay) + '</td>'
      + '<td>' + escEvHtml(time) + '</td>'
      + '<td style="font-size:12px;color:var(--text-muted);">' + escEvHtml(detail) + '</td>'
      + '<td><div style="display:flex;gap:6px;">'
      + '<button class="btn btn-outline btn-sm" onclick="openEventModal(\'' + ev.id + '\')">Edit</button>'
      + '<button class="btn btn-danger btn-sm" onclick="deleteEvent(\'' + ev.id + '\')">Delete</button>'
      + '</div></td>'
      + '</tr>';
  }).join('');
}

function renderEvents() {
  var container = document.getElementById('events-list');
  if (!container) return;

  if (!_events.length) {
    container.innerHTML = '<p style="color:var(--text-muted);font-size:13px;">No events yet. Upload a flyer or add one manually.</p>';
    return;
  }

  var today = new Date(); today.setHours(0, 0, 0, 0);
  var todayStr = today.toISOString().split('T')[0];

  var todayEvts    = _events.filter(function(e) { return e.event_date === todayStr; });
  var upcomingEvts = _events.filter(function(e) { return e.event_date && e.event_date > todayStr; });
  var pastEvts     = _events.filter(function(e) { return e.event_date && e.event_date < todayStr; })
                            .sort(function(a, b) { return b.event_date.localeCompare(a.event_date); });
  var noDateEvts   = _events.filter(function(e) { return !e.event_date; });

  function section(title, color, evts, collapsed) {
    var id = 'ev-section-' + title.replace(/\s+/g, '-').toLowerCase();
    return '<div style="margin-bottom:18px;">'
      + '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;cursor:pointer;" onclick="var b=document.getElementById(\'' + id + '\');b.style.display=b.style.display===\'none\'?\'\':\' none\';">'
      + '<span style="font-size:13px;font-weight:700;color:' + color + ';">' + title + '</span>'
      + '<span style="font-size:12px;color:var(--text-muted);">(' + evts.length + ')</span>'
      + '<span style="font-size:11px;color:var(--text-muted);margin-left:auto;">▾ toggle</span>'
      + '</div>'
      + '<div id="' + id + '" style="display:' + (collapsed ? 'none' : '') + ';">'
      + '<div class="table-wrap"><table><thead><tr><th>Event</th><th>Date</th><th>Time</th><th>Details</th><th>Actions</th></tr></thead><tbody>'
      + evTableRows(evts)
      + '</tbody></table></div></div></div>';
  }

  var html = '';
  if (todayEvts.length)    html += section('📅 Today', 'var(--primary)', todayEvts, false);
  if (upcomingEvts.length) html += section('🔜 Upcoming', '#16a34a', upcomingEvts, false);
  if (noDateEvts.length)   html += section('📌 No Date', '#d97706', noDateEvts, false);
  if (pastEvts.length)     html += section('🕐 Past Events', 'var(--text-muted)', pastEvts, true);

  container.innerHTML = html;
}

function escEvHtml(str) {
  var div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

// ── Add / Edit modal ──
function openEventModal(id) {
  document.getElementById('ev-form-id').value = '';
  document.getElementById('ev-form-name').value = '';
  document.getElementById('ev-form-date').value = '';
  document.getElementById('ev-form-start').value = '';
  document.getElementById('ev-form-end').value = '';
  document.getElementById('ev-form-cover').value = '';
  document.getElementById('ev-form-desc').value = '';

  if (id) {
    var ev = _events.find(function(e) { return String(e.id) === String(id); });
    if (ev) {
      document.getElementById('ev-form-id').value = ev.id;
      document.getElementById('ev-form-name').value = ev.event_name || '';
      document.getElementById('ev-form-date').value = ev.event_date || '';
      document.getElementById('ev-form-start').value = ev.start_time || '';
      document.getElementById('ev-form-end').value = ev.end_time || '';
      document.getElementById('ev-form-cover').value = ev.cover_charge || '';
      document.getElementById('ev-form-desc').value = ev.description || '';
    }
  }
  openModal('modal-event');
}

async function saveEvent() {
  var name = document.getElementById('ev-form-name').value.trim();
  if (!name) { toast('Event name required', 'error'); return; }

  var payload = {
    event_name:   name,
    event_date:   document.getElementById('ev-form-date').value || null,
    start_time:   document.getElementById('ev-form-start').value.trim() || null,
    end_time:     document.getElementById('ev-form-end').value.trim() || null,
    cover_charge: document.getElementById('ev-form-cover').value.trim() || null,
    description:  document.getElementById('ev-form-desc').value.trim() || null,
  };

  var existingId = document.getElementById('ev-form-id').value;
  try {
    var saved;
    if (existingId) {
      saved = await CC.dashboard.updateEvent(existingId, payload);
      var idx = _events.findIndex(function(e) { return String(e.id) === String(existingId); });
      if (idx !== -1 && saved) _events[idx] = saved;
    } else {
      saved = await CC.dashboard.createEvent(payload);
      if (saved) _events.push(saved);
    }
    closeModal('modal-event');
    renderEvents();
    toast(existingId ? 'Event updated' : 'Event added');
  } catch(e) { toast('Save failed', 'error'); }
}

async function deleteEvent(id) {
  if (!confirm('Delete this event?')) return;
  await CC.dashboard.deleteEvent(id);
  _events = _events.filter(function(e) { return String(e.id) !== String(id); });
  renderEvents();
  toast('Event deleted');
}

// ── AI Image extraction ──
function evPickFile() {
  document.getElementById('ev-file-input').click();
}

function evFileChanged(input) {
  var file = input.files[0];
  if (!file) return;
  CC.compressImage(file, 1280, 0.75).then(function(c) {
    evExtract(c.dataUrl, c.mimeType);
  }).catch(function() {
    var preview = document.getElementById('ev-extract-preview');
    if (preview) preview.innerHTML = '<p style="color:var(--danger);">Could not read image.</p>';
  });
}

async function evExtract(dataUrl, mimeType) {
  var btn = document.getElementById('ev-extract-btn');
  var preview = document.getElementById('ev-extract-preview');
  btn.disabled = true;
  btn.textContent = 'Scanning...';
  preview.innerHTML = '<p style="color:var(--text-muted);font-size:13px;">Extracting events from image…</p>';

  try {
    var token = null;
    var sbKey = Object.keys(localStorage).find(function(k) { return k.startsWith('sb-') && k.endsWith('-auth-token'); });
    if (sbKey) { try { var s = JSON.parse(localStorage.getItem(sbKey)); token = s && s.access_token ? s.access_token : null; } catch(e) {} }
    if (!token) token = localStorage.getItem('cc_token') || sessionStorage.getItem('cc_token');

    var res = await fetch(window.CC_API_BASE + '/api/dashboard/events/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ image_base64: dataUrl, mime_type: mimeType })
    });
    var data;
    try { data = await res.json(); }
    catch (_) { throw new Error('Server returned non-JSON (status ' + res.status + ')'); }
    if (!res.ok) throw new Error(data.error || 'Extract failed');

    _extractedEvents = data;
    evShowExtractPreview(data.items || []);
  } catch(err) {
    preview.innerHTML = '<p style="color:var(--danger);">' + err.message + '</p>';
  } finally {
    btn.disabled = false;
    btn.textContent = '📸 Scan Flyer / Schedule';
  }
}

function evShowExtractPreview(items) {
  var preview = document.getElementById('ev-extract-preview');
  if (!items.length) {
    preview.innerHTML = '<p style="color:var(--text-muted);">No events found in image.</p>';
    return;
  }

  var inpS = 'width:100%;padding:4px 6px;background:var(--bg);border:1px solid var(--card-border);border-radius:4px;color:var(--text);font-size:12px;box-sizing:border-box;';
  var html = '<div style="font-size:13px;font-weight:600;margin-bottom:8px;">Found ' + items.length + ' event(s) — review and import:</div>';
  html += '<div class="table-wrap"><table><thead><tr><th>Name</th><th>Day / Date</th><th>Time</th><th>Details</th><th style="width:36px;"></th></tr></thead><tbody>';
  items.forEach(function(item, i) {
    var dayDate = item.days || item.date || '';
    var time = item.time || (item.start_time ? item.start_time + (item.end_time ? ' – ' + item.end_time : '') : '');
    html += '<tr id="ev-ex-row-' + i + '">';
    html += '<td><input data-i="' + i + '" data-k="name" value="' + escEvHtml(item.name || '') + '" oninput="evUpdateExtracted(this)" style="' + inpS + 'font-weight:500;"></td>';
    html += '<td><input data-i="' + i + '" data-k="_dayDate" value="' + escEvHtml(dayDate) + '" oninput="evUpdateExtracted(this)" style="' + inpS + '"></td>';
    html += '<td><input data-i="' + i + '" data-k="_time" value="' + escEvHtml(time) + '" oninput="evUpdateExtracted(this)" style="' + inpS + '"></td>';
    html += '<td><input data-i="' + i + '" data-k="_details" value="' + escEvHtml(item.price_text || item.description || '') + '" oninput="evUpdateExtracted(this)" style="' + inpS + 'color:var(--text-muted);"></td>';
    html += '<td style="text-align:center;"><button onclick="evDeleteExtracted(' + i + ')" title="Remove" style="background:none;border:none;color:var(--danger);font-size:15px;cursor:pointer;padding:2px 6px;">✕</button></td>';
    html += '</tr>';
  });
  html += '</tbody></table></div>';
  html += '<button class="btn btn-primary" style="margin-top:12px;" id="ev-import-btn" onclick="evImport()">Import All Events</button>';
  preview.innerHTML = html;
}

function evUpdateExtracted(el) {
  if (!_extractedEvents || !_extractedEvents.items) return;
  var i = +el.dataset.i, k = el.dataset.k, v = el.value;
  var it = _extractedEvents.items[i];
  if (!it) return;
  if (k === '_dayDate') {
    if (/^\d{4}-\d{2}-\d{2}/.test(v)) { it.date = v; it.days = ''; }
    else { it.days = v; it.date = ''; }
  } else if (k === '_time') {
    it.time = v;
  } else if (k === '_details') {
    it.description = v;
  } else {
    it[k] = v;
  }
}

function evDeleteExtracted(i) {
  if (!_extractedEvents || !_extractedEvents.items) return;
  _extractedEvents.items.splice(i, 1);
  evShowExtractPreview(_extractedEvents.items);
}

// Wire to page router
if (typeof onPageLoad === 'function') onPageLoad('events', loadEvents);

async function evImport() {
  if (!_extractedEvents || !(_extractedEvents.items || []).length) return;
  var btn = document.getElementById('ev-import-btn');
  btn.disabled = true;
  btn.textContent = 'Importing…';

  var items = _extractedEvents.items || [];
  var saved = 0, failed = 0;

  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    // Compute event_date: if "days" is a weekday name, get next occurrence
    var eventDate = null;
    if (item.date && item.date.match(/\d{4}-\d{2}-\d{2}/)) {
      eventDate = item.date;
    } else if (item.days) {
      // Could be "Monday" or "Mon-Fri" etc; try each day
      var dayName = item.days.split(/[,\-\/]/)[0].trim();
      eventDate = nextDateForDay(dayName);
    }

    var payload = {
      event_name:   item.name || 'Event',
      event_date:   eventDate,
      start_time:   item.start_time || item.time || null,
      end_time:     item.end_time || null,
      cover_charge: item.price_text || null,
      description:  item.description || (item.days ? 'Every ' + item.days : null),
    };

    try {
      var created = await CC.dashboard.createEvent(payload);
      if (created) { _events.push(created); saved++; }
    } catch(e) { failed++; }
  }

  document.getElementById('ev-extract-preview').innerHTML = '';
  _extractedEvents = null;
  renderEvents();
  toast('Imported ' + saved + ' event(s)' + (failed ? ' (' + failed + ' failed)' : ''));
}
