// ============================================
// Inventory — Beachside Circle Boats fleet
// ============================================

var _inventoryItems = [];
var _invIdCounter = 0;

// Beachside real fleet data — fallback
var _defaultInventory = [
  {
    id: 1,
    name: 'Single Seater Circle Boat',
    description: 'Solo cruiser. 57 lbs, portable, 35lb electric motor. Fits one adult up to 300 lbs. 70" diameter.',
    halfDayAM: 150, halfDayPM: 150, allDay: 225, deposit: 0, qty: 5,
    specs: '70" diameter | 57 lbs | 35lb 5-speed electric motor | Up to 300 lbs capacity',
    photos: []
  },
  {
    id: 2,
    name: 'Double Seater Circle Boat',
    description: 'Bring a friend. 65 lbs, extra-wide seats, enhanced stability. Fits two adults up to 450 lbs combined. 89" x 70".',
    halfDayAM: 200, halfDayPM: 200, allDay: 275, deposit: 0, qty: 3,
    specs: '89" x 70" | 65 lbs | 5-speed electric motor | Up to 450 lbs combined capacity',
    photos: []
  }
];

async function loadInventory() {
  // Try API first
  var apiData = await CC.dashboard.getFleetTypes();
  if (apiData && Array.isArray(apiData) && apiData.length > 0) {
    _inventoryItems = apiData.map(function(ft) {
      var s = (ft.specs && typeof ft.specs === 'object') ? ft.specs : {};
      return {
        id: ft.id,
        name: ft.name || '',
        description: ft.description || '',
        halfDayAM: s.halfDayAM || 0,
        halfDayPM: s.halfDayPM || 0,
        allDay: s.allDay || 0,
        deposit: s.deposit || 0,
        qty: s.qty || (Array.isArray(ft.fleet_items) ? ft.fleet_items.filter(function(fi) { return fi.condition !== 'retired'; }).length : 0),
        specs: s.specsText || '',
        photos: ft.image_url ? [ft.image_url] : [],
        _apiId: ft.id
      };
    });
    _invIdCounter = _inventoryItems.length;
  } else if (_inventoryItems.length === 0) {
    _inventoryItems = _defaultInventory.slice();
    _invIdCounter = 2;
  }

  renderInventory();
  renderOverviewTimeSlots();
  updateInventoryStats();
}

function renderInventory() {
  var grid = document.getElementById('inventory-grid');
  var emptyState = document.getElementById('inventory-empty');

  if (_inventoryItems.length === 0) {
    grid.innerHTML = '';
    emptyState.style.display = '';
    return;
  }

  emptyState.style.display = 'none';
  var html = '';

  _inventoryItems.forEach(function(item) {
    var color = item.id === 1 ? '#00ada8' : '#009590';
    var placeholderImg = 'data:image/svg+xml,' + encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">' +
      '<rect width="200" height="200" fill="' + color + '"/>' +
      '<text x="100" y="90" text-anchor="middle" fill="white" font-family="sans-serif" font-size="13" font-weight="bold">' + (item.name.substring(0, 22)) + '</text>' +
      '<text x="100" y="115" text-anchor="middle" fill="rgba(255,255,255,0.8)" font-family="sans-serif" font-size="12">Qty: ' + item.qty + '</text>' +
      '</svg>'
    );
    var imgSrc = (item.photos && item.photos.length > 0) ? item.photos[0] : placeholderImg;

    html += '<div class="grid-item" onclick="editInventoryItem(\'' + item.id + '\')">';
    html += '<img src="' + imgSrc + '" alt="' + escHtml(item.name) + '">';
    html += '<div class="item-info">';
    html += '<h4>' + escHtml(item.name) + '</h4>';
    html += '<p>Half Day: $' + Number(item.halfDayAM).toFixed(0) + ' | All Day: $' + Number(item.allDay).toFixed(0) + '</p>';
    html += '<p style="font-size:11px;color:var(--text-dim);">Qty: ' + item.qty + ' available</p>';
    html += '</div>';
    html += '</div>';
  });

  grid.innerHTML = html;
}

function renderOverviewTimeSlots() {
  var el = document.getElementById('overview-time-slots');
  if (!el) return;

  if (_inventoryItems.length === 0) {
    el.innerHTML = '<p style="color:var(--text-dim);padding:8px 0;">No fleet items configured.</p>';
    return;
  }

  var slotDefs = [
    { label: 'Half Day AM', time: '9:00 AM - 1:00 PM', key: 'halfDayAM' },
    { label: 'Half Day PM', time: '2:00 PM - 6:00 PM', key: 'halfDayPM' },
    { label: 'All Day', time: '9:00 AM - 6:00 PM', key: 'allDay' }
  ];

  var headers = '<tr><th>Slot</th><th>Time</th>';
  _inventoryItems.forEach(function(item) { headers += '<th>' + escHtml(item.name) + '</th>'; });
  headers += '</tr>';

  var rows = '';
  slotDefs.forEach(function(slot) {
    rows += '<tr><td>' + slot.label + '</td><td>' + slot.time + '</td>';
    _inventoryItems.forEach(function(item) {
      var price = item[slot.key];
      rows += '<td>' + (price ? '$' + Number(price).toFixed(0) : '—') + '</td>';
    });
    rows += '</tr>';
  });

  el.innerHTML = '<div class="table-wrap"><table><thead>' + headers + '</thead><tbody>' + rows + '</tbody></table></div>';
}

function openInventoryModal(id) {
  document.getElementById('inv-form-name').value = '';
  document.getElementById('inv-form-desc').value = '';
  document.getElementById('inv-form-half-am').value = '';
  document.getElementById('inv-form-half-pm').value = '';
  document.getElementById('inv-form-allday').value = '';
  document.getElementById('inv-form-deposit').value = '';
  document.getElementById('inv-form-qty').value = '1';
  document.getElementById('inv-form-specs').value = '';
  document.getElementById('inv-form-id').value = '';
  document.getElementById('inv-modal-title').textContent = 'Add Fleet Item';

  if (id) {
    var item = _inventoryItems.find(function(i) { return i.id === id; });
    if (item) {
      document.getElementById('inv-modal-title').textContent = 'Edit Fleet Item';
      document.getElementById('inv-form-name').value = item.name;
      document.getElementById('inv-form-desc').value = item.description || '';
      document.getElementById('inv-form-half-am').value = item.halfDayAM || '';
      document.getElementById('inv-form-half-pm').value = item.halfDayPM || '';
      document.getElementById('inv-form-allday').value = item.allDay || '';
      document.getElementById('inv-form-deposit').value = item.deposit || '';
      document.getElementById('inv-form-qty').value = item.qty || 1;
      document.getElementById('inv-form-specs').value = item.specs || '';
      document.getElementById('inv-form-id').value = item.id;
    }
  }

  openModal('modal-inventory');
}

function saveInventoryItem() {
  var name = document.getElementById('inv-form-name').value.trim();
  if (!name) { toast('Item name is required', 'error'); return; }

  var desc = document.getElementById('inv-form-desc').value.trim();
  var halfAM = parseFloat(document.getElementById('inv-form-half-am').value) || 0;
  var halfPM = parseFloat(document.getElementById('inv-form-half-pm').value) || 0;
  var allDay = parseFloat(document.getElementById('inv-form-allday').value) || 0;
  var deposit = parseFloat(document.getElementById('inv-form-deposit').value) || 0;
  var qty = parseInt(document.getElementById('inv-form-qty').value) || 1;
  var specs = document.getElementById('inv-form-specs').value.trim();

  var photos = [];
  var photoInput = document.getElementById('inv-form-photos');
  var id = document.getElementById('inv-form-id').value;

  if (photoInput.files && photoInput.files.length > 0) {
    toast('Uploading fleet photos...');
    uploadMultipleToSupabase(Array.from(photoInput.files), 'fleet').then(function(urls) {
      photos = urls;
      finishSaveInventory(id, name, desc, halfAM, halfPM, allDay, deposit, qty, specs, photos);
    });
  } else {
    if (id) {
      var existing = _inventoryItems.find(function(i) { return i.id == id; });
      photos = existing ? existing.photos : [];
    }
    finishSaveInventory(id, name, desc, halfAM, halfPM, allDay, deposit, qty, specs, photos);
  }
}

async function finishSaveInventory(id, name, desc, halfAM, halfPM, allDay, deposit, qty, specs, photos) {
  var fleetData = {
    name: name,
    description: desc,
    available: true,
    specs: { halfDayAM: halfAM, halfDayPM: halfPM, allDay: allDay, deposit: deposit, qty: qty, specsText: specs },
    image_url: (photos && photos.length > 0) ? photos[0] : null
  };

  if (id) {
    var result = await CC.dashboard.updateFleetType(id, fleetData);
    if (result) toast('Fleet item saved to database');
  } else {
    var result = await CC.dashboard.createFleetType(fleetData);
    if (result) toast('Fleet item added to database');
  }

  // Reload from DB
  await loadInventory();
  closeModal('modal-inventory');
  if (typeof loadAvailabilityItems === 'function') loadAvailabilityItems();
}

function editInventoryItem(id) { openInventoryModal(id); }

async function deleteInventoryItem(id) {
  if (!confirm('Delete this fleet item?')) return;
  await CC.dashboard.deleteFleetType(id);
  await loadInventory();
  toast('Fleet item deleted from database');
}

function updateInventoryStats() {
  var el = document.getElementById('stat-items');
  if (el) {
    var totalQty = _inventoryItems.reduce(function(sum, i) { return sum + i.qty; }, 0);
    el.textContent = totalQty;
  }
}

onPageLoad('inventory', loadInventory);
