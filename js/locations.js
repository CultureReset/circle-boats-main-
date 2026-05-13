// ============================================
// Locations — pickup/launch points per business
// ============================================

var _locations = [];

async function loadLocations() {
  try {
    var data = await CC.dashboard.getLocations();
    if (data && data.length > 0) {
      _locations = data;
    } else {
      // Migrate from localStorage if first load
      try {
        var saved = localStorage.getItem('beachside_locations');
        if (saved) {
          var parsed = JSON.parse(saved);
          for (var i = 0; i < parsed.length; i++) {
            var created = await CC.dashboard.createLocation({ name: parsed[i].name, address: parsed[i].address });
            if (created) _locations.push(created);
          }
          localStorage.removeItem('beachside_locations');
        }
      } catch(e) {}
    }
  } catch(e) {
    console.error('Failed to load locations:', e);
  }
  renderLocations();
}

function renderLocations() {
  var container = document.getElementById('locations-list');
  var emptyState = document.getElementById('locations-empty');
  if (!container) return;

  if (_locations.length === 0) {
    container.innerHTML = '';
    if (emptyState) emptyState.style.display = '';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';
  var html = '<div class="table-wrap"><table><thead><tr><th>Location</th><th>Address</th><th>Actions</th></tr></thead><tbody>';

  _locations.forEach(function(loc) {
    html += '<tr>';
    html += '<td><strong>' + escHtml(loc.name) + '</strong>' + (loc.is_primary ? ' <span class="badge badge-success" style="font-size:10px;">Primary</span>' : '') + '</td>';
    html += '<td style="color:var(--text-muted);">' + escHtml(loc.address || '') + '</td>';
    html += '<td><div style="display:flex;gap:6px;">';
    html += '<button class="btn btn-outline btn-sm" onclick="editLocation(\'' + loc.id + '\')">Edit</button>';
    html += '<button class="btn btn-danger btn-sm" onclick="deleteLocation(\'' + loc.id + '\')">Delete</button>';
    html += '</div></td>';
    html += '</tr>';
  });

  html += '</tbody></table></div>';
  container.innerHTML = html;
}

function openLocationModal(id) {
  document.getElementById('loc-form-name').value = '';
  document.getElementById('loc-form-address').value = '';
  document.getElementById('loc-form-id').value = '';

  if (id) {
    var loc = _locations.find(function(l) { return l.id === id; });
    if (loc) {
      document.getElementById('loc-form-name').value = loc.name || '';
      document.getElementById('loc-form-address').value = loc.address || '';
      document.getElementById('loc-form-id').value = loc.id;
    }
  }
  openModal('modal-location');
}

async function saveLocation() {
  var name = document.getElementById('loc-form-name').value.trim();
  if (!name) { toast('Location name is required', 'error'); return; }

  var address = document.getElementById('loc-form-address').value.trim();
  var id = document.getElementById('loc-form-id').value;

  try {
    if (id) {
      var updated = await CC.dashboard.updateLocation(id, { name: name, address: address });
      if (updated) {
        var idx = _locations.findIndex(function(l) { return l.id === id; });
        if (idx >= 0) _locations[idx] = updated;
      }
      toast('Location updated');
    } else {
      var created = await CC.dashboard.createLocation({ name: name, address: address });
      if (created) _locations.push(created);
      toast('Location added');
    }
  } catch(e) {
    toast('Failed to save location', 'error');
    return;
  }

  closeModal('modal-location');
  renderLocations();
}

function editLocation(id) { openLocationModal(id); }

async function deleteLocation(id) {
  if (!confirm('Delete this location?')) return;
  try {
    await CC.dashboard.deleteLocation(id);
    _locations = _locations.filter(function(l) { return l.id !== id; });
    renderLocations();
    toast('Location deleted');
  } catch(e) {
    toast('Failed to delete location', 'error');
  }
}

if (typeof escHtml === 'undefined') {
  function escHtml(str) { var d = document.createElement('div'); d.textContent = str || ''; return d.innerHTML; }
}

onPageLoad('locations', loadLocations);
