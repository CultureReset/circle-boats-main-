// ============================================
// Digital Waivers — create/manage waiver templates,
// collect e-signatures, 3rd party integrations,
// send via SMS, require during booking
// ============================================

var WAIVERS_STORAGE = 'beachside_waivers';
var SIGNED_WAIVERS_STORAGE = 'beachside_signed_waivers';

var _waiverSettings = {
  requireOnBooking: true,
  sendViaSms: true,
  defaultWaiverId: 'w1',
  thirdParty: {
    docusign: false,
    hellosign: false,
    pandadoc: false
  }
};

var _waiverTemplates = [];
var _signedWaivers = [];

async function loadWaivers() {
  // Load signed waivers from Supabase
  var apiData = await CC.dashboard.getWaivers();
  if (apiData && Array.isArray(apiData) && apiData.length > 0) {
    _signedWaivers = apiData.map(function(w) {
      var sig = w.signature_data || '';
      var method = sig === 'checkbox-acknowledged' ? 'Checkout'
                 : sig ? 'Signature Link'
                 : '—';
      return {
        id: w.id,
        customerName: w.customer_name || '',
        customerEmail: w.customer_email || '',
        customerPhone: w.customer_phone || '',
        bookingId: w.booking_id || '',
        waiverId: w.waiver_template_id || 'w1',
        signedAt: w.signed_at || '',
        ipAddress: w.ip_address || '',
        signature: w.signature_data || '',
        method: method,
        status: w.signed_at ? 'signed' : 'pending'
      };
    });
  } else {
    // Fallback to localStorage cache
    try {
      var signedSaved = localStorage.getItem(SIGNED_WAIVERS_STORAGE);
      if (signedSaved) _signedWaivers = JSON.parse(signedSaved);
    } catch(e) {}
  }

  // Load waiver templates from localStorage (managed locally)
  try {
    var saved = localStorage.getItem(WAIVERS_STORAGE);
    if (saved) {
      var parsed = JSON.parse(saved);
      if (parsed.settings) _waiverSettings = parsed.settings;
      if (parsed.templates) _waiverTemplates = parsed.templates;
    }
  } catch(e) {}

  if (_waiverTemplates.length === 0) {
    _waiverTemplates = [{
      id: 'w1',
      name: 'Standard Rental Waiver',
      active: true,
      createdAt: '2026-01-15',
      sections: [
        { title: 'Assumption of Risk', content: 'I understand that circle boat rentals involve inherent risks including but not limited to: drowning, hypothermia, weather conditions, equipment failure, and collision with other watercraft. I voluntarily assume all risks associated with this activity.' },
        { title: 'Release of Liability', content: 'I hereby release, waive, and discharge Beachside Circle Boat Rentals and Sales LLC, its officers, employees, and agents from any and all liability, claims, demands, or causes of action arising out of my participation in circle boat rental activities.' },
        { title: 'Safety Rules', content: 'I agree to: wear a life jacket at all times while on the water, follow all posted safety guidelines, not operate the boat under the influence of alcohol or drugs, remain within designated boating areas, and return the boat in the same condition as received.' },
        { title: 'Damage Policy', content: 'I agree to be financially responsible for any damage to the rental equipment caused by negligence, misuse, or failure to follow safety guidelines. I understand a hold may be placed on my payment method to cover any damages.' },
        { title: 'Medical Acknowledgment', content: 'I certify that I am in good physical condition, can swim, and have no medical conditions that would prevent safe participation in water activities. I authorize emergency medical treatment if necessary.' }
      ]
    }];
    saveWaivers();
  }

  renderWaiversPage();
}

function saveWaivers() {
  try { localStorage.setItem(WAIVERS_STORAGE, JSON.stringify({ settings: _waiverSettings, templates: _waiverTemplates })); } catch(e) {}
}

function saveSignedWaivers() {
  try { localStorage.setItem(SIGNED_WAIVERS_STORAGE, JSON.stringify(_signedWaivers)); } catch(e) {}
}

function renderWaiversPage() {
  renderWaiverStats();
  renderWaiverSettings();
  renderWaiverTemplates();
  renderSignedWaiversLog();
  renderThirdPartyIntegrations();
}

// ---- Stats ----

function renderWaiverStats() {
  var container = document.getElementById('waiver-stats');
  if (!container) return;

  var templates = _waiverTemplates.length;
  var signed = _signedWaivers.length;
  var thisMonth = _signedWaivers.filter(function(s) {
    return s.signedAt && s.signedAt.startsWith(new Date().toISOString().substring(0, 7));
  }).length;

  var html = '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;padding-bottom:20px;">';
  html += '<div style="text-align:center;"><div style="font-size:28px;font-weight:700;color:var(--text);">' + templates + '</div><div style="font-size:12px;color:var(--text-muted);">Templates</div></div>';
  html += '<div style="text-align:center;"><div style="font-size:28px;font-weight:700;color:var(--primary);">' + signed + '</div><div style="font-size:12px;color:var(--text-muted);">Total Signed</div></div>';
  html += '<div style="text-align:center;"><div style="font-size:28px;font-weight:700;color:#22c55e;">' + thisMonth + '</div><div style="font-size:12px;color:var(--text-muted);">This Month</div></div>';
  html += '</div>';

  container.innerHTML = html;
}

// ---- Settings ----

function renderWaiverSettings() {
  var container = document.getElementById('waiver-settings');
  if (!container) return;

  var html = '<div style="display:grid;gap:12px;">';

  var toggles = [
    { key: 'requireOnBooking', label: 'Require waiver when booking', desc: 'Customer must sign waiver before completing a booking on your website' },
    { key: 'sendViaSms', label: 'Send waiver via SMS', desc: 'Text a waiver link to customer after booking if they haven\'t signed yet' }
  ];

  toggles.forEach(function(t) {
    var checked = _waiverSettings[t.key] ? 'checked' : '';
    html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;background:var(--bg);border:1px solid var(--card-border);border-radius:var(--radius);">';
    html += '<div><strong style="font-size:13px;">' + t.label + '</strong><div style="font-size:12px;color:var(--text-dim);">' + t.desc + '</div></div>';
    html += '<label class="toggle"><input type="checkbox" ' + checked + ' onchange="toggleWaiverSetting(\'' + t.key + '\',this.checked)"><span class="toggle-slider"></span></label>';
    html += '</div>';
  });

  // Default template selector
  html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;background:var(--bg);border:1px solid var(--card-border);border-radius:var(--radius);">';
  html += '<div><strong style="font-size:13px;">Default Waiver Template</strong><div style="font-size:12px;color:var(--text-dim);">Which waiver to use for new bookings</div></div>';
  html += '<select onchange="setDefaultWaiver(this.value)" style="padding:8px 12px;background:var(--card-bg);border:1px solid var(--card-border);border-radius:var(--radius);color:var(--text);font-size:13px;">';
  _waiverTemplates.forEach(function(t) {
    html += '<option value="' + t.id + '"' + (_waiverSettings.defaultWaiverId === t.id ? ' selected' : '') + '>' + escHtml(t.name) + '</option>';
  });
  html += '</select>';
  html += '</div>';

  // Waiver document upload
  html += '<div style="display:flex;flex-direction:column;padding:14px 16px;background:var(--bg);border:1px solid var(--card-border);border-radius:var(--radius);">';
  html += '<div><strong style="font-size:13px;">📄 Waiver Document</strong><div style="font-size:12px;color:var(--text-dim);">Upload a PDF or Word document for customers to sign</div></div>';
  if (_waiverSettings.documentUrl) {
    html += '<div style="margin-top:12px;padding:12px;background:var(--card-bg);border-radius:6px;border:1px solid var(--card-border);display:flex;align-items:center;justify-content:space-between;">';
    html += '<div style="font-size:12px;color:var(--text);">✅ Document uploaded</div>';
    html += '<button class="btn btn-outline btn-sm" onclick="downloadWaiverDoc()">Download</button>';
    html += '</div>';
    html += '<button class="btn btn-danger btn-sm" style="margin-top:8px;" onclick="deleteWaiverDoc()">Remove Document</button>';
  } else {
    html += '<div style="margin-top:12px;display:flex;gap:8px;align-items:center;">';
    html += '<input type="file" id="waiver-doc-input" accept=".pdf,.doc,.docx,.txt" style="flex:1;padding:8px;background:var(--card-bg);border:1px solid var(--card-border);border-radius:6px;font-size:12px;color:var(--text);">';
    html += '<button class="btn btn-primary btn-sm" onclick="uploadWaiverDocument()">Upload</button>';
    html += '</div>';
    html += '<div id="waiver-upload-status" style="margin-top:8px;font-size:12px;color:var(--text-muted);"></div>';
  }
  html += '</div>';

  html += '</div>';
  container.innerHTML = html;
}

function toggleWaiverSetting(key, val) {
  _waiverSettings[key] = val;
  saveWaivers();
}

function setDefaultWaiver(id) {
  _waiverSettings.defaultWaiverId = id;
  saveWaivers();
  toast('Default waiver updated');
}

// ---- Templates ----

function renderWaiverTemplates() {
  var container = document.getElementById('waiver-templates');
  if (!container) return;

  var html = '';

  _waiverTemplates.forEach(function(t) {
    html += '<div style="padding:16px;background:var(--bg);border:1px solid var(--card-border);border-radius:var(--radius);margin-bottom:12px;">';

    html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">';
    html += '<div>';
    html += '<div style="font-size:16px;font-weight:700;color:var(--text);">' + escHtml(t.name) + '</div>';
    html += '<div style="font-size:12px;color:var(--text-muted);">Created ' + t.createdAt + ' | ' + t.sections.length + ' sections</div>';
    html += '</div>';
    html += '<div style="display:flex;gap:6px;">';
    html += '<button class="btn btn-outline btn-sm" onclick="previewWaiver(\'' + t.id + '\')">Preview</button>';
    html += '<button class="btn btn-outline btn-sm" onclick="editWaiverTemplate(\'' + t.id + '\')">Edit</button>';
    html += '</div>';
    html += '</div>';

    // Section list
    t.sections.forEach(function(s, idx) {
      html += '<div style="padding:10px 14px;background:var(--card-bg);border:1px solid var(--card-border);border-radius:var(--radius);margin-bottom:6px;">';
      html += '<div style="font-size:13px;font-weight:600;color:var(--text);">' + (idx + 1) + '. ' + escHtml(s.title) + '</div>';
      html += '<div style="font-size:12px;color:var(--text-muted);margin-top:4px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">' + escHtml(s.content) + '</div>';
      html += '</div>';
    });

    html += '</div>';
  });

  html += '<button class="btn btn-primary btn-sm" onclick="createWaiverTemplate()">Create New Template</button>';

  container.innerHTML = html;
}

function editWaiverTemplate(id) {
  var t = _waiverTemplates.find(function(x) { return x.id === id; });
  if (!t) return;

  var html = '<div style="padding:20px;max-height:70vh;overflow-y:auto;">';
  html += '<div class="form-group"><label>Waiver Name</label><input type="text" id="waiver-edit-name" value="' + escHtml(t.name) + '"></div>';

  html += '<div id="waiver-sections-editor">';
  t.sections.forEach(function(s, idx) {
    html += renderSectionEditor(idx, s);
  });
  html += '</div>';

  html += '<button class="btn btn-outline btn-sm" style="margin-top:8px;" onclick="addWaiverSection()">+ Add Section</button>';

  html += '<div style="display:flex;gap:10px;justify-content:flex-end;margin-top:20px;">';
  html += '<button class="btn btn-outline" onclick="closeModal(\'modal-waiver\')">Cancel</button>';
  html += '<button class="btn btn-primary" onclick="saveWaiverTemplate(\'' + id + '\')">Save Template</button>';
  html += '</div>';
  html += '</div>';

  document.getElementById('waiver-modal-title').textContent = 'Edit Waiver';
  document.getElementById('waiver-modal-body').innerHTML = html;
  openModal('modal-waiver');
}

function renderSectionEditor(idx, section) {
  var html = '<div class="waiver-section-block" style="padding:12px;background:var(--bg);border:1px solid var(--card-border);border-radius:var(--radius);margin-bottom:8px;">';
  html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">';
  html += '<strong style="font-size:13px;color:var(--text);">Section ' + (idx + 1) + '</strong>';
  html += '<button class="btn btn-danger btn-sm" onclick="removeWaiverSection(' + idx + ')" style="padding:2px 8px;">&times;</button>';
  html += '</div>';
  html += '<input type="text" class="waiver-section-title" value="' + escHtml(section.title) + '" placeholder="Section Title" style="margin-bottom:6px;">';
  html += '<textarea class="waiver-section-content" rows="3" placeholder="Section content...">' + escHtml(section.content) + '</textarea>';
  html += '</div>';
  return html;
}

function addWaiverSection() {
  var editor = document.getElementById('waiver-sections-editor');
  if (!editor) return;
  var count = editor.querySelectorAll('.waiver-section-block').length;
  var div = document.createElement('div');
  div.innerHTML = renderSectionEditor(count, { title: '', content: '' });
  editor.appendChild(div.firstChild);
}

function removeWaiverSection(idx) {
  var blocks = document.querySelectorAll('#waiver-sections-editor .waiver-section-block');
  if (blocks[idx]) blocks[idx].remove();
}

function saveWaiverTemplate(id) {
  var t = _waiverTemplates.find(function(x) { return x.id === id; });
  if (!t) return;

  t.name = document.getElementById('waiver-edit-name').value.trim() || t.name;
  t.sections = [];

  var blocks = document.querySelectorAll('#waiver-sections-editor .waiver-section-block');
  blocks.forEach(function(block) {
    var title = block.querySelector('.waiver-section-title').value.trim();
    var content = block.querySelector('.waiver-section-content').value.trim();
    if (title || content) t.sections.push({ title: title, content: content });
  });

  saveWaivers();
  closeModal('modal-waiver');
  renderWaiversPage();
  toast('Waiver template saved!', 'success');
}

function createWaiverTemplate() {
  var newTemplate = {
    id: 'w-' + Date.now(),
    name: 'New Waiver',
    active: true,
    createdAt: new Date().toISOString().split('T')[0],
    sections: [{ title: 'Terms & Conditions', content: '' }]
  };
  _waiverTemplates.push(newTemplate);
  saveWaivers();
  editWaiverTemplate(newTemplate.id);
}

function previewWaiver(id) {
  var t = _waiverTemplates.find(function(x) { return x.id === id; });
  if (!t) return;

  var html = '<div style="padding:24px;max-height:70vh;overflow-y:auto;">';
  html += '<div style="text-align:center;margin-bottom:24px;">';
  html += '<h2 style="font-size:20px;color:var(--text);margin-bottom:6px;">' + escHtml(t.name) + '</h2>';
  html += '<p style="font-size:13px;color:var(--text-muted);">Beachside Circle Boat Rentals and Sales LLC</p>';
  html += '</div>';

  t.sections.forEach(function(s, idx) {
    html += '<div style="margin-bottom:20px;">';
    html += '<h4 style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:6px;">' + (idx + 1) + '. ' + escHtml(s.title) + '</h4>';
    html += '<p style="font-size:13px;color:var(--text-muted);line-height:1.6;">' + escHtml(s.content) + '</p>';
    html += '</div>';
  });

  // Signature area preview
  html += '<div style="border-top:2px solid var(--card-border);padding-top:20px;margin-top:24px;">';
  html += '<div style="display:flex;gap:20px;">';
  html += '<div style="flex:1;"><label style="font-size:12px;color:var(--text-muted);display:block;margin-bottom:4px;">Full Name</label><div style="height:36px;border-bottom:1px solid var(--card-border);"></div></div>';
  html += '<div style="flex:1;"><label style="font-size:12px;color:var(--text-muted);display:block;margin-bottom:4px;">Date</label><div style="height:36px;border-bottom:1px solid var(--card-border);"></div></div>';
  html += '</div>';
  html += '<div style="margin-top:16px;"><label style="font-size:12px;color:var(--text-muted);display:block;margin-bottom:4px;">Signature</label>';
  html += '<div style="height:80px;border:2px dashed var(--card-border);border-radius:var(--radius);display:flex;align-items:center;justify-content:center;color:var(--text-dim);font-size:13px;">Canvas e-signature area</div>';
  html += '</div>';
  html += '<div style="margin-top:12px;"><label style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--text);cursor:pointer;"><input type="checkbox"> I agree to the terms and conditions above</label></div>';
  html += '</div>';

  html += '</div>';

  document.getElementById('waiver-modal-title').textContent = 'Waiver Preview';
  document.getElementById('waiver-modal-body').innerHTML = html;
  openModal('modal-waiver');
}

// ---- Signed Waivers Log ----

function renderSignedWaiversLog() {
  var container = document.getElementById('signed-waivers');
  if (!container) return;

  if (_signedWaivers.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text-muted);">No waivers yet</div>';
    return;
  }

  var html = '<div class="table-wrap"><table><thead><tr>';
  html += '<th>Customer</th><th>Waiver</th><th>Status</th><th>Signed</th><th>Method</th><th>Booking</th>';
  html += '</tr></thead><tbody>';

  _signedWaivers.forEach(function(s) {
    var template = _waiverTemplates.find(function(t) { return t.id === s.waiverId; });
    var signedDate = s.signedAt ? new Date(s.signedAt).toLocaleString() : '—';
    var isSigned = s.status === 'signed';
    var statusBadge = isSigned
      ? '<span class="badge badge-success">Signed</span>'
      : '<span class="badge badge-warning">Pending</span>';

    html += '<tr>';
    html += '<td><div style="font-weight:600;">' + escHtml(s.customerName) + '</div><div style="font-size:11px;color:var(--text-muted);">' + escHtml(s.customerEmail) + '</div></td>';
    html += '<td style="font-size:13px;">' + escHtml(template ? template.name : 'Standard Rental Waiver') + '</td>';
    html += '<td>' + statusBadge + '</td>';
    html += '<td style="font-size:13px;">' + signedDate + '</td>';
    html += '<td><span class="badge ' + (isSigned ? 'badge-success' : 'badge-warning') + '">' + escHtml(s.method || '—') + '</span></td>';
    html += '<td style="font-family:\'SF Mono\',monospace;font-size:12px;">' + (s.bookingId || '—') + '</td>';
    html += '</tr>';
  });

  html += '</tbody></table></div>';
  container.innerHTML = html;
}

// ---- 3rd Party Integrations ----

function renderThirdPartyIntegrations() {
  var container = document.getElementById('waiver-integrations');
  if (!container) return;

  var providers = [
    { key: 'docusign', name: 'DocuSign', desc: 'Enterprise-grade e-signatures. Use your existing DocuSign account for legally binding waivers.', color: '#ffcc00', icon: 'D' },
    { key: 'hellosign', name: 'Dropbox Sign (HelloSign)', desc: 'Simple and secure e-signatures. Integrates with Dropbox for document storage.', color: '#00b4d8', icon: 'H' },
    { key: 'pandadoc', name: 'PandaDoc', desc: 'Document automation with e-signatures. Great for custom waiver workflows.', color: '#4caf50', icon: 'P' }
  ];

  var html = '<p style="font-size:13px;color:var(--text-muted);margin-bottom:16px;">Connect a 3rd-party e-signature provider for legally binding waivers. You can use our built-in system OR a 3rd-party — your choice.</p>';

  html += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;">';

  providers.forEach(function(p) {
    var connected = _waiverSettings.thirdParty[p.key];
    html += '<div style="padding:20px;background:var(--bg);border:2px solid ' + (connected ? 'var(--primary)' : 'var(--card-border)') + ';border-radius:var(--radius-lg);text-align:center;">';
    html += '<div style="width:48px;height:48px;border-radius:50%;background:' + p.color + ';color:white;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:22px;margin:0 auto 12px;">' + p.icon + '</div>';
    html += '<div style="font-size:15px;font-weight:700;color:var(--text);margin-bottom:6px;">' + p.name + '</div>';
    html += '<div style="font-size:12px;color:var(--text-muted);margin-bottom:12px;line-height:1.4;">' + p.desc + '</div>';

    if (connected) {
      html += '<button class="btn btn-outline btn-sm" style="width:100%;" onclick="disconnectWaiverProvider(\'' + p.key + '\')">Disconnect</button>';
    } else {
      html += '<button class="btn btn-primary btn-sm" style="width:100%;" onclick="connectWaiverProvider(\'' + p.key + '\')">Connect</button>';
    }

    html += '</div>';
  });

  html += '</div>';

  html += '<p style="font-size:11px;color:var(--text-dim);margin-top:12px;">In production, connecting redirects to the provider\'s OAuth flow. Waivers signed through 3rd parties are logged automatically.</p>';

  container.innerHTML = html;
}

function connectWaiverProvider(key) {
  _waiverSettings.thirdParty[key] = true;
  saveWaivers();
  renderThirdPartyIntegrations();
  toast('Connected! In production this opens OAuth flow.');
}

function disconnectWaiverProvider(key) {
  _waiverSettings.thirdParty[key] = false;
  saveWaivers();
  renderThirdPartyIntegrations();
  toast('Disconnected');
}

// ---- Waiver Document Upload ----

async function uploadWaiverDocument() {
  var fileInput = document.getElementById('waiver-doc-input');
  var file = fileInput.files[0];
  if (!file) {
    toast('Please select a file', 'error');
    return;
  }

  var statusDiv = document.getElementById('waiver-upload-status');
  statusDiv.textContent = '⏳ Uploading...';

  try {
    var siteId = CC.getSiteId ? CC.getSiteId() : 'default';
    var ext = file.name.split('.').pop();
    var fileName = 'waivers/' + siteId + '/waiver-doc-' + Date.now() + '.' + ext;

    var { data, error } = await supabase.storage
      .from('documents')
      .upload(fileName, file, { upsert: true, contentType: file.type });

    if (error) throw error;

    var { data: urlData } = supabase.storage.from('documents').getPublicUrl(fileName);
    var publicUrl = urlData.publicUrl;

    _waiverSettings.documentUrl = publicUrl;
    _waiverSettings.documentName = file.name;
    saveWaivers();

    statusDiv.textContent = '✅ Document uploaded!';
    setTimeout(function() { renderWaiverSettings(); }, 1000);
  } catch(e) {
    statusDiv.textContent = '❌ Error: ' + (e.message || 'Upload failed');
  }
}

function downloadWaiverDoc() {
  if (_waiverSettings.documentUrl) {
    window.open(_waiverSettings.documentUrl, '_blank');
  }
}

function deleteWaiverDoc() {
  if (confirm('Delete the waiver document?')) {
    _waiverSettings.documentUrl = null;
    _waiverSettings.documentName = null;
    saveWaivers();

    toast('Document deleted');
    renderWaiverSettings();
  }
}

if (typeof escHtml === 'undefined') {
  function escHtml(str) { var d = document.createElement('div'); d.textContent = str || ''; return d.innerHTML; }
}

onPageLoad('waivers', loadWaivers);
