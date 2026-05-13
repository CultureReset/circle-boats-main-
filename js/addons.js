// ============================================
// Addons — Beachside Circle Boats docks & extras
// ============================================

var _addons = [];
var _addonIdCounter = 0;
var _policies = {
  deposit: 0,
  cancelHours: 24,
  cancelFee: 0,
  lateFee: 25,
  agreement: 'All renters must be 18+ with valid ID. Life jackets are provided and must be worn at all times. No license required. Renters are responsible for any damage beyond normal wear. Weather cancellations receive full refund or reschedule. Boats must be returned by the end of the rental period. Late returns will be charged $25/hour.'
};

async function loadAddons() {
  try {
    var apiData = await CC.dashboard.getAddons();
    if (apiData && Array.isArray(apiData) && apiData.length > 0) {
      _addons = apiData.map(function(a) {
        return { id: a.id, name: a.name || '', description: a.description || '', price: a.price || 0, category: a.category || 'extra' };
      });
      _addonIdCounter = _addons.length;
    }
  } catch(e) {
    console.warn('Could not load addons from database:', e);
  }

  // Always show defaults if nothing loaded from DB
  if (_addons.length === 0) {
    _addons = [
      { id: 1, name: 'Mini Dock', description: '8\'4" x 44" platform for gear, yoga, sunbathing.', price: 50.00, category: 'dock' },
      { id: 2, name: 'X Dock', description: '5\' x 5\' floating dock, holds a 58-qt cooler.', price: 50.00, category: 'dock' },
      { id: 3, name: 'Doggie Dock', description: '5\'4" x 43" with weighted mesh ramp for pets.', price: 50.00, category: 'dock' }
    ];
    _addonIdCounter = 3;
  }

  renderAddons();
  loadPolicies();
}

function renderAddons() {
  var container = document.getElementById('addons-list');
  var emptyState = document.getElementById('addons-empty');

  if (_addons.length === 0) {
    container.innerHTML = '';
    emptyState.style.display = '';
    return;
  }

  emptyState.style.display = 'none';

  var docks = _addons.filter(function(a) { return a.category === 'dock'; });
  var extras = _addons.filter(function(a) { return a.category !== 'dock'; });

  var html = '';

  if (docks.length > 0) {
    html += '<h4 style="font-size:14px;color:var(--text-muted);margin-bottom:12px;text-transform:uppercase;letter-spacing:0.5px;">Towable Docks</h4>';
    html += '<p style="font-size:12px;color:var(--text-dim);margin-bottom:12px;">Rent 4+ boats and get a FREE dock for the day</p>';
    html += '<div class="table-wrap"><table><thead><tr><th>Dock</th><th>Price</th><th>Actions</th></tr></thead><tbody>';
    docks.forEach(function(a) {
      html += '<tr>';
      html += '<td><strong>' + escHtml(a.name) + '</strong>';
      if (a.description) html += '<br><span style="font-size:12px;color:var(--text-muted);">' + escHtml(a.description) + '</span>';
      html += '</td>';
      html += '<td>$' + Number(a.price).toFixed(2) + '/day</td>';
      html += '<td><div style="display:flex;gap:6px;">';
      html += '<button class="btn btn-outline btn-sm" onclick="editAddon(' + a.id + ')">Edit</button>';
      html += '<button class="btn btn-danger btn-sm" onclick="deleteAddon(' + a.id + ')">Delete</button>';
      html += '</div></td>';
      html += '</tr>';
    });
    html += '</tbody></table></div>';
  }

  if (extras.length > 0) {
    html += '<h4 style="font-size:14px;color:var(--text-muted);margin:24px 0 12px;text-transform:uppercase;letter-spacing:0.5px;">Accessories & Extras</h4>';
    html += '<div class="table-wrap"><table><thead><tr><th>Add-on</th><th>Price</th><th>Actions</th></tr></thead><tbody>';
    extras.forEach(function(a) {
      html += '<tr>';
      html += '<td><strong>' + escHtml(a.name) + '</strong>';
      if (a.description) html += '<br><span style="font-size:12px;color:var(--text-muted);">' + escHtml(a.description) + '</span>';
      html += '</td>';
      html += '<td>$' + Number(a.price).toFixed(2) + '</td>';
      html += '<td><div style="display:flex;gap:6px;">';
      html += '<button class="btn btn-outline btn-sm" onclick="editAddon(' + a.id + ')">Edit</button>';
      html += '<button class="btn btn-danger btn-sm" onclick="deleteAddon(' + a.id + ')">Delete</button>';
      html += '</div></td>';
      html += '</tr>';
    });
    html += '</tbody></table></div>';
  }

  container.innerHTML = html;
}

function openAddonModal(id) {
  document.getElementById('addon-form-name').value = '';
  document.getElementById('addon-form-desc').value = '';
  document.getElementById('addon-form-price').value = '';
  document.getElementById('addon-form-id').value = '';

  if (id) {
    var a = _addons.find(function(x) { return x.id === id; });
    if (a) {
      document.getElementById('addon-form-name').value = a.name;
      document.getElementById('addon-form-desc').value = a.description || '';
      document.getElementById('addon-form-price').value = a.price;
      document.getElementById('addon-form-id').value = a.id;
    }
  }

  openModal('modal-addon');
}

async function saveAddon() {
  var name = document.getElementById('addon-form-name').value.trim();
  if (!name) { toast('Name is required', 'error'); return; }

  var desc = document.getElementById('addon-form-desc').value.trim();
  var price = parseFloat(document.getElementById('addon-form-price').value) || 0;
  var id = document.getElementById('addon-form-id').value;

  var addonData = { name: name, description: desc, price: price, category: 'extra' };

  if (id) {
    await CC.dashboard.updateAddon(id, addonData);
    toast('Add-on saved to database');
  } else {
    await CC.dashboard.createAddon(addonData);
    toast('Add-on added to database');
  }

  await loadAddons();
  closeModal('modal-addon');
}

function editAddon(id) { openAddonModal(id); }

async function deleteAddon(id) {
  if (!confirm('Delete this add-on?')) return;
  await CC.dashboard.deleteAddon(id);
  await loadAddons();
  toast('Add-on deleted from database');
}

function loadPolicies() {
  document.getElementById('policy-deposit').value = _policies.deposit;
  document.getElementById('policy-cancel-hours').value = _policies.cancelHours;
  document.getElementById('policy-cancel-fee').value = _policies.cancelFee;
  document.getElementById('policy-late-fee').value = _policies.lateFee;
  document.getElementById('policy-agreement').value = _policies.agreement;
}

function savePolicies() {
  _policies.deposit = parseFloat(document.getElementById('policy-deposit').value) || 0;
  _policies.cancelHours = parseInt(document.getElementById('policy-cancel-hours').value) || 0;
  _policies.cancelFee = parseFloat(document.getElementById('policy-cancel-fee').value) || 0;
  _policies.lateFee = parseFloat(document.getElementById('policy-late-fee').value) || 0;
  _policies.agreement = document.getElementById('policy-agreement').value;
  toast('Policies saved successfully');
}

onPageLoad('addons', function() { loadAddons(); });
