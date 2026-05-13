// My QR Codes — client-side dashboard (scoped to logged-in site)
// All API calls are automatically scoped to req.siteId by the backend.

const QRC = (() => {
  let _codes = [];
  let _editId = null;

  const API = () => window.CC_API_BASE || 'https://cybercheck-api-database.vercel.app';
  const token = () => localStorage.getItem('cc_token');

  function headers() {
    return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token()}` };
  }

  // ── Load & render ──────────────────────────────────────────────────────────

  async function load() {
    try {
      const r = await fetch(`${API()}/api/qr`, { headers: headers() });
      if (!r.ok) return;
      _codes = await r.json();
      renderStats();
      renderTable(_codes);
    } catch (e) {
      console.error('QRC load error', e);
    }
  }

  function renderStats() {
    const total  = _codes.length;
    const scans  = _codes.reduce((s, c) => s + (c.scan_count || 0), 0);
    const active = _codes.filter(c => c.active).length;
    // leads count comes from scans — we approximate from codes that have scan_count>0
    // real lead count would require a separate query; show placeholder unless loaded
    setEl('qrc-stat-total',  total);
    setEl('qrc-stat-scans',  scans);
    setEl('qrc-stat-active', active);
    setEl('qrc-stat-leads',  '—');
  }

  function renderTable(list) {
    const tbody = document.getElementById('qrc-table-body');
    if (!tbody) return;
    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="6" style="padding:24px;text-align:center;color:var(--text-muted);">No QR codes yet. Generate your first one above.</td></tr>';
      return;
    }
    tbody.innerHTML = list.map(c => {
      const typeMap = { card:'Business Card', table:'Table', menu:'Menu', ad:'Ad', event:'Event', location:'Location', general:'General' };
      const typeLbl = typeMap[c.type] || c.type;
      const badge   = c.active
        ? '<span style="color:#4ade80;font-size:11px;font-weight:600;">● Active</span>'
        : '<span style="color:#f87171;font-size:11px;font-weight:600;">● Off</span>';
      return `<tr style="border-bottom:1px solid var(--border);">
        <td style="padding:10px 8px;color:var(--text-muted);">#${c.seq_number || '—'}</td>
        <td style="padding:10px 8px;">
          <div style="font-weight:500;">${esc(c.label)}</div>
          ${c.location ? `<div style="font-size:11px;color:var(--text-muted);">${esc(c.location)}</div>` : ''}
        </td>
        <td style="padding:10px 8px;color:var(--text-muted);">${typeLbl}</td>
        <td style="padding:10px 8px;font-weight:600;">${c.scan_count || 0}</td>
        <td style="padding:10px 8px;">${badge}</td>
        <td style="padding:10px 8px;">
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            <button class="btn btn-outline btn-sm" onclick="QRC.viewScans('${c.id}','${esc(c.label)}')">Scans</button>
            <button class="btn btn-outline btn-sm" onclick="QRC.openEdit('${c.id}')">Edit</button>
            <button class="btn btn-outline btn-sm" onclick="QRC.copyUrl('${esc(c.scan_url)}')">Copy URL</button>
            <button class="btn btn-outline btn-sm" onclick="QRC.toggle('${c.id}',${!c.active})">${c.active ? 'Disable' : 'Enable'}</button>
          </div>
        </td>
      </tr>`;
    }).join('');
  }

  // ── Generate ───────────────────────────────────────────────────────────────

  async function generate() {
    const label    = val('qrc-label');
    const type     = val('qrc-type');
    const dest     = val('qrc-dest');
    const notes    = val('qrc-notes');
    const placement = val('qrc-placement');

    if (!label) { showToast('Label is required', 'error'); return; }

    try {
      const r = await fetch(`${API()}/api/qr`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ label, type, destination_url: dest || null, notes: notes || null, placement })
      });
      if (!r.ok) { showToast('Failed to generate', 'error'); return; }
      const code = await r.json();
      _codes.unshift(code);

      // Reset form
      setVal('qrc-label', '');
      setVal('qrc-dest', '');
      setVal('qrc-notes', '');

      renderStats();
      renderTable(_codes);
      showQRPreview(code);
      showToast(`Code #${code.seq_number} created!`, 'success');
    } catch (e) {
      showToast('Error generating code', 'error');
    }
  }

  function showQRPreview(code) {
    // Show QR image in a simple inline popup below the form
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(code.scan_url)}`;
    const existing = document.getElementById('qrc-preview-box');
    if (existing) existing.remove();

    const box = document.createElement('div');
    box.id = 'qrc-preview-box';
    box.style.cssText = 'background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:20px;text-align:center;margin-top:12px;';
    box.innerHTML = `
      <div style="font-weight:600;margin-bottom:12px;">#${code.seq_number} — ${esc(code.label)}</div>
      <img src="${qrUrl}" style="border-radius:8px;margin-bottom:12px;" alt="QR">
      <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;">
        <a href="${qrUrl.replace('180x180','400x400')}" download="qr_${code.seq_number}.png" class="btn btn-outline btn-sm">Download PNG</a>
        <button class="btn btn-outline btn-sm" onclick="QRC.copyUrl('${esc(code.scan_url)}')">Copy URL</button>
        <button class="btn btn-outline btn-sm" onclick="document.getElementById('qrc-preview-box').remove()">Close</button>
      </div>`;

    const genCard = document.querySelector('#page-qr-codes .card');
    if (genCard) genCard.appendChild(box);
  }

  // ── Edit ──────────────────────────────────────────────────────────────────

  function openEdit(id) {
    const c = _codes.find(x => x.id === id);
    if (!c) return;
    _editId = id;
    setVal('qrce-id',        c.id);
    setVal('qrce-label',     c.label);
    setVal('qrce-dest',      c.destination_url || '');
    setVal('qrce-notes',     c.location || c.notes || '');
    setVal('qrce-placement', c.placement || 'fixed');
    openModal('modal-qrc-edit');
  }

  async function saveEdit() {
    const id = val('qrce-id');
    const body = {
      label:           val('qrce-label'),
      destination_url: val('qrce-dest') || null,
      location:        val('qrce-notes') || null,
      placement:       val('qrce-placement'),
    };
    try {
      const r = await fetch(`${API()}/api/qr/${id}`, {
        method: 'PATCH', headers: headers(), body: JSON.stringify(body)
      });
      if (!r.ok) { showToast('Save failed', 'error'); return; }
      const updated = await r.json();
      _codes = _codes.map(c => c.id === id ? updated : c);
      renderTable(_codes);
      closeModal('modal-qrc-edit');
      showToast('Saved', 'success');
    } catch (e) {
      showToast('Error saving', 'error');
    }
  }

  // ── Toggle active ──────────────────────────────────────────────────────────

  async function toggle(id, newActive) {
    try {
      const r = await fetch(`${API()}/api/qr/${id}`, {
        method: 'PATCH', headers: headers(), body: JSON.stringify({ active: newActive })
      });
      if (!r.ok) return;
      const updated = await r.json();
      _codes = _codes.map(c => c.id === id ? updated : c);
      renderStats();
      renderTable(_codes);
    } catch (e) {}
  }

  // ── Scan history ──────────────────────────────────────────────────────────

  async function viewScans(id, label) {
    setEl('qrc-scan-modal-title', `Scans — ${label}`);
    const body = document.getElementById('qrc-scan-modal-body');
    body.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted);">Loading...</div>';
    openModal('modal-qrc-scans');

    try {
      const r = await fetch(`${API()}/api/qr/${id}/scans`, { headers: headers() });
      const scans = r.ok ? await r.json() : [];

      const code = _codes.find(c => c.id === id) || {};
      const qrUrl = code.scan_url
        ? `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(code.scan_url)}`
        : null;

      const leads = scans.filter(s => s.scanner_phone).length;
      const mob   = scans.length ? Math.round(scans.filter(s => s.device_type === 'mobile').length / scans.length * 100) : 0;

      body.innerHTML = `
        <div style="display:flex;gap:16px;padding:16px;flex-wrap:wrap;border-bottom:1px solid var(--border);">
          ${qrUrl ? `<div style="text-align:center;flex-shrink:0;">
            <img src="${qrUrl}" style="border-radius:8px;" alt="QR">
            <div style="margin-top:8px;display:flex;gap:6px;justify-content:center;">
              <a href="${qrUrl.replace('150x150','400x400')}" download="qr_${code.seq_number||id}.png" class="btn btn-outline btn-sm">Download</a>
              <button class="btn btn-outline btn-sm" onclick="QRC.copyUrl('${esc(code.scan_url)}')">Copy URL</button>
            </div>
          </div>` : ''}
          <div style="flex:1;min-width:180px;">
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:12px;">
              <div style="text-align:center;"><div style="font-size:22px;font-weight:700;">${scans.length}</div><div style="font-size:11px;color:var(--text-muted);">Total Scans</div></div>
              <div style="text-align:center;"><div style="font-size:22px;font-weight:700;color:#4ade80;">${leads}</div><div style="font-size:11px;color:var(--text-muted);">Phone Leads</div></div>
              <div style="text-align:center;"><div style="font-size:22px;font-weight:700;color:#f59e0b;">${mob}%</div><div style="font-size:11px;color:var(--text-muted);">Mobile</div></div>
            </div>
            ${code.location ? `<div style="font-size:12px;color:var(--text-muted);">📍 ${esc(code.location)}</div>` : ''}
            ${code.destination_url ? `<div style="font-size:12px;color:var(--text-muted);margin-top:4px;">→ ${esc(code.destination_url)}</div>` : ''}
          </div>
        </div>
        ${scans.length ? `
        <table style="width:100%;border-collapse:collapse;font-size:12px;">
          <thead><tr style="border-bottom:1px solid var(--border);">
            <th style="padding:8px;text-align:left;color:var(--text-muted);font-weight:500;">Time</th>
            <th style="padding:8px;text-align:left;color:var(--text-muted);font-weight:500;">Phone</th>
            <th style="padding:8px;text-align:left;color:var(--text-muted);font-weight:500;">Name</th>
            <th style="padding:8px;text-align:left;color:var(--text-muted);font-weight:500;">Device</th>
          </tr></thead>
          <tbody>${scans.map(s => `<tr style="border-bottom:1px solid var(--border);">
            <td style="padding:8px;">${fmtTime(s.scanned_at)}</td>
            <td style="padding:8px;color:${s.scanner_phone ? '#4ade80' : 'var(--text-muted)'};">${s.scanner_phone || '—'}</td>
            <td style="padding:8px;">${s.scanner_name || '—'}</td>
            <td style="padding:8px;">${s.device_type || '—'}</td>
          </tr>`).join('')}</tbody>
        </table>` : '<div style="padding:20px;text-align:center;color:var(--text-muted);">No scans yet.</div>'}`;
    } catch (e) {
      body.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted);">Failed to load scans.</div>';
    }
  }

  // ── Filter & Export ───────────────────────────────────────────────────────

  function filter() {
    const q = (val('qrc-search') || '').toLowerCase();
    renderTable(q ? _codes.filter(c =>
      (c.label || '').toLowerCase().includes(q) ||
      (c.type  || '').toLowerCase().includes(q) ||
      (c.location || '').toLowerCase().includes(q) ||
      String(c.seq_number || '').includes(q)
    ) : _codes);
  }

  function exportCSV() {
    if (!_codes.length) { showToast('No codes to export', 'error'); return; }
    const rows = [['#','Label','Type','Scan URL','Scans','Active','Location','Placement']];
    _codes.forEach(c => rows.push([
      c.seq_number, c.label, c.type, c.scan_url, c.scan_count,
      c.active ? 'Yes' : 'No', c.location || '', c.placement
    ]));
    const csv = rows.map(r => r.map(v => `"${String(v||'').replace(/"/g,'""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = 'my_qr_codes.csv';
    a.click();
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  function copyUrl(url) {
    navigator.clipboard.writeText(url).then(() => showToast('Copied!', 'success')).catch(() => {});
  }

  function fmtTime(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-US', { month:'short', day:'numeric', hour:'numeric', minute:'2-digit' });
  }

  function esc(s) {
    if (!s) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function val(id)      { const el = document.getElementById(id); return el ? el.value.trim() : ''; }
  function setVal(id,v) { const el = document.getElementById(id); if (el) el.value = v; }
  function setEl(id,v)  { const el = document.getElementById(id); if (el) el.textContent = v; }

  function openModal(id)  { const m = document.getElementById(id); if (m) m.classList.add('active'); }
  function closeModal(id) { const m = document.getElementById(id); if (m) m.classList.remove('active'); }

  function showToast(msg, type) {
    if (typeof window.showToast === 'function') { window.showToast(msg, type); return; }
    const c = document.getElementById('toast-container');
    if (!c) return;
    const t = document.createElement('div');
    t.className = `toast toast-${type || 'info'}`;
    t.textContent = msg;
    c.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  }

  // ── Page init hook ────────────────────────────────────────────────────────

  // Called when the nav item is clicked (page navigation system)
  function onPageShow() {
    load();
  }

  return { load, generate, openEdit, saveEdit, toggle, viewScans, filter, exportCSV, copyUrl, onPageShow };
})();

// Hook into the existing page navigation system
(function() {
  const orig = window.showPage || null;
  function patchNav() {
    // Watch for page-qr-codes becoming visible via the nav click handler
    document.querySelectorAll('[data-page="qr-codes"]').forEach(el => {
      el.addEventListener('click', () => setTimeout(QRC.load, 50));
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', patchNav);
  } else {
    patchNav();
  }
})();
