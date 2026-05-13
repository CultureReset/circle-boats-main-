// ============================================
// Specials — Daily deals, drink specials, happy hour promos
// ============================================

var _specials = [];
var _extractedSpecials = null;
var _allDayLabels = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

function loadSpecials() {
  CC.dashboard.getSpecials().then(function(data) {
    _specials = data || [];
    renderSpecialsList();
  });
}

function renderSpecialsList() {
  var container = document.getElementById('specials-list');
  if (!container) return;

  if (!_specials.length) {
    container.innerHTML = '<p style="color:var(--text-muted);font-size:13px;">No specials yet. Upload a photo of your specials board or add one manually.</p>';
    return;
  }

  var html = '<div class="table-wrap"><table><thead><tr><th>Special</th><th>Deal</th><th>Days</th><th>Time</th><th>Actions</th></tr></thead><tbody>';
  _specials.forEach(function(s) {
    var time = [s.start_time, s.end_time].filter(Boolean).join(' – ');
    html += '<tr>';
    html += '<td><strong>' + escSpHtml(s.special_name || '') + '</strong>';
    if (s.description) html += '<br><span style="font-size:12px;color:var(--text-muted);">' + escSpHtml(s.description) + '</span>';
    html += '</td>';
    html += '<td style="color:var(--primary);font-weight:600;">' + escSpHtml(s.discount_text || '') + '</td>';
    html += '<td style="font-size:12px;">' + escSpHtml(s.days || '') + '</td>';
    html += '<td style="font-size:12px;white-space:nowrap;">' + escSpHtml(time) + '</td>';
    html += '<td><div style="display:flex;gap:6px;">';
    html += '<button class="btn btn-outline btn-sm" onclick="openSpecialModal(\'' + s.id + '\')">Edit</button>';
    html += '<button class="btn btn-danger btn-sm" onclick="deleteSpecial(\'' + s.id + '\')">Delete</button>';
    html += '</div></td>';
    html += '</tr>';
  });
  html += '</tbody></table></div>';
  container.innerHTML = html;
}

function escSpHtml(str) {
  var d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

// ── Day-of-week quick buttons ──
function spToggleDay(btn, day) {
  btn.classList.toggle('active');
  var selected = Array.from(document.querySelectorAll('#sp-day-btns .sp-day-btn.active')).map(function(b) { return b.dataset.day; });
  document.getElementById('sp-form-days').value = selected.join(', ');
}

function spSetDayBtns(daysStr) {
  var active = (daysStr || '').toLowerCase().split(/[,\s]+/).map(function(d) { return d.trim(); });
  document.querySelectorAll('#sp-day-btns .sp-day-btn').forEach(function(b) {
    b.classList.toggle('active', active.some(function(a) { return b.dataset.day.toLowerCase().startsWith(a.substring(0,3)); }));
  });
}

// ── Add / Edit modal ──
function openSpecialModal(id) {
  document.getElementById('sp-form-id').value = '';
  document.getElementById('sp-form-name').value = '';
  document.getElementById('sp-form-deal').value = '';
  document.getElementById('sp-form-desc').value = '';
  document.getElementById('sp-form-days').value = '';
  document.getElementById('sp-form-start').value = '';
  document.getElementById('sp-form-end').value = '';
  spSetDayBtns('');

  if (id) {
    var s = _specials.find(function(x) { return String(x.id) === String(id); });
    if (s) {
      document.getElementById('sp-form-id').value = s.id;
      document.getElementById('sp-form-name').value = s.special_name || '';
      document.getElementById('sp-form-deal').value = s.discount_text || '';
      document.getElementById('sp-form-desc').value = s.description || '';
      document.getElementById('sp-form-days').value = s.days || '';
      document.getElementById('sp-form-start').value = s.start_time || '';
      document.getElementById('sp-form-end').value = s.end_time || '';
      spSetDayBtns(s.days || '');
    }
  }
  openModal('modal-special');
}

async function saveSpecial() {
  var name = document.getElementById('sp-form-name').value.trim();
  if (!name) { toast('Special name required', 'error'); return; }

  var payload = {
    special_name:  name,
    discount_text: document.getElementById('sp-form-deal').value.trim() || null,
    description:   document.getElementById('sp-form-desc').value.trim() || null,
    days:          document.getElementById('sp-form-days').value.trim() || null,
    start_time:    document.getElementById('sp-form-start').value.trim() || null,
    end_time:      document.getElementById('sp-form-end').value.trim() || null,
  };

  var existingId = document.getElementById('sp-form-id').value;
  try {
    var saved;
    if (existingId) {
      saved = await CC.dashboard.updateSpecial(existingId, payload);
      var idx = _specials.findIndex(function(x) { return String(x.id) === String(existingId); });
      if (idx !== -1 && saved) _specials[idx] = saved;
    } else {
      saved = await CC.dashboard.createSpecial(payload);
      if (saved) _specials.push(saved);
    }
    closeModal('modal-special');
    renderSpecialsList();
    toast(existingId ? 'Special updated' : 'Special added');
  } catch(e) { toast('Save failed', 'error'); }
}

async function deleteSpecial(id) {
  if (!confirm('Delete this special?')) return;
  await CC.dashboard.deleteSpecial(id);
  _specials = _specials.filter(function(x) { return String(x.id) !== String(id); });
  renderSpecialsList();
  toast('Special deleted');
}

// ── AI Image extraction ──
function spPickFile() { document.getElementById('sp-file-input').click(); }

function spFileChanged(input) {
  var file = input.files[0];
  if (!file) return;
  CC.compressImage(file, 1280, 0.75).then(function(c) {
    spExtract(c.dataUrl, c.mimeType);
  }).catch(function() {
    var preview = document.getElementById('sp-extract-preview');
    if (preview) preview.innerHTML = '<p style="color:var(--danger);">Could not read image.</p>';
  });
}

async function spExtract(dataUrl, mimeType) {
  var btn = document.getElementById('sp-extract-btn');
  var preview = document.getElementById('sp-extract-preview');
  btn.disabled = true;
  btn.textContent = 'Scanning...';
  preview.innerHTML = '<p style="color:var(--text-muted);font-size:13px;">Extracting specials from image…</p>';

  try {
    var token = null;
    var sbKey = Object.keys(localStorage).find(function(k) { return k.startsWith('sb-') && k.endsWith('-auth-token'); });
    if (sbKey) { try { var s = JSON.parse(localStorage.getItem(sbKey)); token = s && s.access_token ? s.access_token : null; } catch(e) {} }
    if (!token) token = localStorage.getItem('cc_token') || sessionStorage.getItem('cc_token');

    var res = await fetch((window.CC_API_BASE || '') + '/api/dashboard/events/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ image_base64: dataUrl, mime_type: mimeType, extract_type: 'specials' })
    });
    var data;
    try { data = await res.json(); }
    catch (_) { throw new Error('Server returned non-JSON (status ' + res.status + ')'); }
    if (!res.ok) throw new Error(data.error || 'Extract failed');
    _extractedSpecials = data;
    spShowPreview(data.items || []);
  } catch(err) {
    preview.innerHTML = '<p style="color:var(--danger);">' + err.message + '</p>';
  } finally {
    btn.disabled = false;
    btn.textContent = '📸 Scan Specials Board';
  }
}

function spShowPreview(items) {
  var preview = document.getElementById('sp-extract-preview');
  if (!items.length) { preview.innerHTML = '<p style="color:var(--text-muted);">No specials found.</p>'; return; }

  var inpS = 'width:100%;padding:4px 6px;background:var(--bg);border:1px solid var(--card-border);border-radius:4px;color:var(--text);font-size:12px;box-sizing:border-box;';
  var html = '<div style="font-size:13px;font-weight:600;margin-bottom:8px;">Found ' + items.length + ' special(s) — edit, remove, then import:</div>';
  html += '<div class="table-wrap"><table><thead><tr><th>Name</th><th>Deal</th><th>Days</th><th>Time</th><th style="width:36px;"></th></tr></thead><tbody>';
  items.forEach(function(item, i) {
    var time = item.start_time ? item.start_time + (item.end_time ? ' – ' + item.end_time : '') : (item.time || '');
    html += '<tr>';
    html += '<td><input data-i="' + i + '" data-k="name" value="' + escSpHtml(item.name || '') + '" oninput="spUpdateExtracted(this)" style="' + inpS + 'font-weight:500;"></td>';
    html += '<td><input data-i="' + i + '" data-k="_deal" value="' + escSpHtml(item.price_text || item.description || '') + '" oninput="spUpdateExtracted(this)" style="' + inpS + '"></td>';
    html += '<td><input data-i="' + i + '" data-k="_days" value="' + escSpHtml(item.days || item.date || '') + '" oninput="spUpdateExtracted(this)" style="' + inpS + '"></td>';
    html += '<td><input data-i="' + i + '" data-k="_time" value="' + escSpHtml(time) + '" oninput="spUpdateExtracted(this)" style="' + inpS + '"></td>';
    html += '<td style="text-align:center;"><button onclick="spDeleteExtracted(' + i + ')" title="Remove" style="background:none;border:none;color:var(--danger);font-size:15px;cursor:pointer;padding:2px 6px;">✕</button></td>';
    html += '</tr>';
  });
  html += '</tbody></table></div>';
  html += '<button class="btn btn-primary" style="margin-top:12px;" id="sp-import-btn" onclick="spImport()">Import All Specials</button>';
  preview.innerHTML = html;
}

function spUpdateExtracted(el) {
  if (!_extractedSpecials || !_extractedSpecials.items) return;
  var i = +el.dataset.i, k = el.dataset.k, v = el.value;
  var it = _extractedSpecials.items[i];
  if (!it) return;
  if (k === '_deal') it.price_text = v;
  else if (k === '_days') {
    if (/^\d{4}-\d{2}-\d{2}/.test(v)) { it.date = v; it.days = ''; }
    else { it.days = v; it.date = ''; }
  }
  else if (k === '_time') it.time = v;
  else it[k] = v;
}

function spDeleteExtracted(i) {
  if (!_extractedSpecials || !_extractedSpecials.items) return;
  _extractedSpecials.items.splice(i, 1);
  spShowPreview(_extractedSpecials.items);
}

async function spImport() {
  if (!_extractedSpecials || !(_extractedSpecials.items || []).length) return;
  var btn = document.getElementById('sp-import-btn');
  btn.disabled = true; btn.textContent = 'Importing…';
  var items = _extractedSpecials.items || [];
  var saved = 0, failed = 0;
  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    var payload = {
      special_name:  item.name || 'Special',
      discount_text: item.price_text || null,
      description:   item.description || null,
      days:          item.days || item.date || null,
      start_time:    item.start_time || item.time || null,
      end_time:      item.end_time || null,
    };
    try { var c = await CC.dashboard.createSpecial(payload); if (c) { _specials.push(c); saved++; } } catch(e) { failed++; }
  }
  document.getElementById('sp-extract-preview').innerHTML = '';
  _extractedSpecials = null;
  renderSpecialsList();
  toast('Imported ' + saved + ' special(s)' + (failed ? ' (' + failed + ' failed)' : ''));
}

onPageLoad('specials', loadSpecials);
