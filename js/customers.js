// ============================================
// Customer Database (CRM Lite)
// Extracts customers from bookings + reviews,
// allows manual add, search, filter, export
// ============================================

var CUSTOMERS_STORAGE = 'beachside_customers';
var _customers = [];
var _customerFilter = 'all';
var _customerSearch = '';
var _selectedCustomerId = null;

async function loadCustomers() {
  // Try API first
  var apiData = await CC.dashboard.getCustomers();
  if (apiData && Array.isArray(apiData) && apiData.length > 0) {
    _customers = apiData.map(function(c) {
      return {
        id: c.id,
        name: c.name || '',
        email: c.email || '',
        phone: c.phone || '',
        status: c.tier || c.status || 'customer',
        totalBookings: c.total_bookings || 0,
        totalSpent: c.total_spent || 0,
        lastBooking: c.last_visit || null,
        firstSeen: c.created_at || '',
        notes: c.notes || '',
        tags: c.tags || [],
        photo_url: c.photo_url || '',
        _apiId: c.id
      };
    });
  } else {
    // Fallback to localStorage / build from bookings
    try {
      var saved = localStorage.getItem(CUSTOMERS_STORAGE);
      if (saved) _customers = JSON.parse(saved);
    } catch(e) {}

    if (_customers.length === 0) {
      _customers = buildCustomerListFromBookings();
      saveCustomers();
    }
  }

  renderCustomersPage();
}

function saveCustomers() {
  try {
    localStorage.setItem(CUSTOMERS_STORAGE, JSON.stringify(_customers));
  } catch(e) {}
}

function buildCustomerListFromBookings() {
  var map = {};
  if (typeof _bookingsData !== 'undefined') {
    _bookingsData.forEach(function(b) {
      var key = (b.customerEmail || b.customerPhone || '').toLowerCase();
      if (!key) return;
      if (!map[key]) {
        map[key] = {
          id: 'cust-' + Date.now() + '-' + Math.random().toString(36).substr(2,5),
          name: b.customerName,
          email: b.customerEmail || '',
          phone: b.customerPhone || '',
          status: 'customer',
          totalBookings: 0,
          totalSpent: 0,
          lastBooking: null,
          firstSeen: b.date,
          notes: '',
          tags: [],
          photo_url: ''
        };
      }
      map[key].totalBookings++;
      map[key].totalSpent += (b.subtotal || 0);
      if (!map[key].lastBooking || b.date > map[key].lastBooking) {
        map[key].lastBooking = b.date;
      }
    });
  }

  var list = Object.values(map);

  // Determine status based on booking count
  list.forEach(function(c) {
    if (c.totalBookings >= 3) {
      c.status = 'vip';
      c.tags.push('Repeat Customer');
    } else if (c.totalBookings >= 1) {
      c.status = 'customer';
    }
  });

  // No demo leads — real leads come from the API

  return list;
}

function renderCustomersPage() {
  renderCustomerStats();
  renderCustomerFilters();
  renderCustomerList();
}

function renderCustomerStats() {
  var container = document.getElementById('customer-stats');
  if (!container) return;

  var total = _customers.length;
  var vips = _customers.filter(function(c) { return c.status === 'vip'; }).length;
  var leads = _customers.filter(function(c) { return c.status === 'lead'; }).length;
  var totalRev = _customers.reduce(function(s, c) { return s + c.totalSpent; }, 0);

  var html = '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;padding-bottom:20px;">';
  html += '<div style="text-align:center;"><div style="font-size:28px;font-weight:700;color:var(--text);">' + total + '</div><div style="font-size:12px;color:var(--text-muted);">Total Customers</div></div>';
  html += '<div style="text-align:center;"><div style="font-size:28px;font-weight:700;color:#a855f7;">' + vips + '</div><div style="font-size:12px;color:var(--text-muted);">VIP / Repeat</div></div>';
  html += '<div style="text-align:center;"><div style="font-size:28px;font-weight:700;color:#f59e0b;">' + leads + '</div><div style="font-size:12px;color:var(--text-muted);">Leads</div></div>';
  html += '<div style="text-align:center;"><div style="font-size:28px;font-weight:700;color:var(--primary);">$' + totalRev.toLocaleString() + '</div><div style="font-size:12px;color:var(--text-muted);">Lifetime Revenue</div></div>';
  html += '</div>';

  container.innerHTML = html;
}

function renderCustomerFilters() {
  var container = document.getElementById('customer-filters');
  if (!container) return;

  var filters = [
    { key: 'all', label: 'All' },
    { key: 'customer', label: 'Customers' },
    { key: 'vip', label: 'VIP' },
    { key: 'lead', label: 'Leads' },
    { key: 'inactive', label: 'Inactive' }
  ];

  var html = '<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">';

  // Filter buttons
  html += '<div style="display:flex;gap:6px;">';
  filters.forEach(function(f) {
    var active = _customerFilter === f.key ? 'btn-primary' : 'btn-outline';
    html += '<button class="btn btn-sm ' + active + '" onclick="filterCustomers(\'' + f.key + '\')">' + f.label + '</button>';
  });
  html += '</div>';

  // Search
  html += '<div style="flex:1;min-width:200px;">';
  html += '<input type="text" placeholder="Search name, email, phone..." value="' + escHtml(_customerSearch) + '" oninput="searchCustomers(this.value)" style="width:100%;padding:8px 12px;background:var(--bg);border:1px solid var(--card-border);border-radius:var(--radius);color:var(--text);font-size:13px;">';
  html += '</div>';

  // Actions
  html += '<div style="display:flex;gap:6px;">';
  html += '<button class="btn btn-outline btn-sm" onclick="exportCustomersCsv()">Export CSV</button>';
  html += '<button class="btn btn-outline btn-sm" onclick="openScanCardModal()" title="Snap or upload a business card">Scan Card</button>';
  html += '<button class="btn btn-primary btn-sm" onclick="openAddCustomerModal()">Add Customer</button>';
  html += '</div>';

  html += '</div>';
  container.innerHTML = html;
}

function filterCustomers(filter) {
  _customerFilter = filter;
  renderCustomerFilters();
  renderCustomerList();
}

function searchCustomers(query) {
  _customerSearch = query.toLowerCase().trim();
  renderCustomerList();
}

function renderCustomerList() {
  var container = document.getElementById('customer-list');
  if (!container) return;

  var filtered = _customers;

  // Apply filter
  if (_customerFilter !== 'all') {
    filtered = filtered.filter(function(c) { return c.status === _customerFilter; });
  }

  // Apply search
  if (_customerSearch) {
    filtered = filtered.filter(function(c) {
      return (c.name || '').toLowerCase().indexOf(_customerSearch) >= 0 ||
             (c.email || '').toLowerCase().indexOf(_customerSearch) >= 0 ||
             (c.phone || '').indexOf(_customerSearch) >= 0;
    });
  }

  if (filtered.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted);">No customers found</div>';
    return;
  }

  var html = '<div class="table-wrap"><table><thead><tr>';
  html += '<th>Customer</th><th>Status</th><th>Bookings</th><th>Spent</th><th>Last Booking</th><th>Tags</th><th></th>';
  html += '</tr></thead><tbody>';

  filtered.forEach(function(c) {
    var statusBadge = c.status === 'vip' ? '<span class="badge" style="background:rgba(168,85,247,0.1);color:#a855f7;">VIP</span>' :
                      c.status === 'lead' ? '<span class="badge badge-warning">Lead</span>' :
                      c.status === 'inactive' ? '<span class="badge" style="background:rgba(107,114,128,0.1);color:#6b7280;">Inactive</span>' :
                      '<span class="badge badge-success">Customer</span>';

    html += '<tr>';
    html += '<td>';
    html += '<div style="display:flex;align-items:center;gap:10px;">';
    if (c.photo_url) {
      html += '<img src="' + escHtml(c.photo_url) + '" style="width:36px;height:36px;border-radius:50%;object-fit:cover;flex-shrink:0;" onerror="this.style.display=\'none\'">';
    } else {
      html += '<div style="width:36px;height:36px;border-radius:50%;background:var(--primary);color:white;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;flex-shrink:0;">' + (c.name || '?').charAt(0).toUpperCase() + '</div>';
    }
    html += '<div><div style="font-weight:600;font-size:14px;">' + escHtml(c.name) + '</div>';
    html += '<div style="font-size:12px;color:var(--text-muted);">' + escHtml(c.email || c.phone) + '</div></div>';
    html += '</div></td>';
    var waiverBadge = c.waiver_signed ? '<span class="badge badge-success" style="margin-left:6px;">✓ Waiver</span>' : '<span class="badge" style="background:rgba(239,68,68,0.1);color:#ef4444;margin-left:6px;">No Waiver</span>';
    html += '<td>' + statusBadge + waiverBadge + '</td>';
    html += '<td style="font-weight:600;">' + c.totalBookings + '</td>';
    html += '<td style="font-weight:600;">$' + (c.totalSpent || 0).toLocaleString() + '</td>';
    html += '<td style="font-size:13px;color:var(--text-muted);">' + (c.lastBooking || '—') + '</td>';
    html += '<td>';
    (c.tags || []).forEach(function(tag) {
      html += '<span style="display:inline-block;padding:2px 8px;background:var(--bg);border:1px solid var(--card-border);border-radius:10px;font-size:11px;color:var(--text-muted);margin-right:4px;">' + escHtml(tag) + '</span>';
    });
    html += '</td>';
    html += '<td><button class="btn btn-outline btn-sm" onclick="viewCustomerDetail(\'' + c.id + '\')">View</button></td>';
    html += '</tr>';
  });

  html += '</tbody></table></div>';
  container.innerHTML = html;
}

function viewCustomerDetail(id) {
  var c = _customers.find(function(x) { return x.id === id; });
  if (!c) return;
  _selectedCustomerId = id;

  // Find their bookings
  var bookings = [];
  if (typeof _bookingsData !== 'undefined') {
    bookings = _bookingsData.filter(function(b) {
      return (b.customerEmail && b.customerEmail.toLowerCase() === (c.email || '').toLowerCase()) ||
             (b.customerPhone && b.customerPhone === c.phone);
    });
  }

  // Find their reviews
  var reviews = [];
  if (typeof _reviewsData !== 'undefined') {
    reviews = _reviewsData.filter(function(r) {
      return (r.email && r.email.toLowerCase() === (c.email || '').toLowerCase());
    });
  }

  var html = '<div style="padding:20px;">';

  // Customer header
  html += '<div style="display:flex;align-items:center;gap:16px;margin-bottom:24px;">';
  html += '<div style="position:relative;width:56px;height:56px;flex-shrink:0;cursor:pointer;" onclick="document.getElementById(\'cust-photo-input-' + c.id + '\').click()" title="Upload or snap a photo">';
  if (c.photo_url) {
    html += '<img id="cust-photo-' + c.id + '" src="' + escHtml(c.photo_url) + '" style="width:56px;height:56px;border-radius:50%;object-fit:cover;" onerror="this.outerHTML=\'<div id=\\\"cust-photo-' + c.id + '\\\" style=\\\"width:56px;height:56px;border-radius:50%;background:var(--primary);color:white;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:24px;\\\">' + (c.name || '?').charAt(0).toUpperCase() + '</div>\'">';
  } else {
    html += '<div id="cust-photo-' + c.id + '" style="width:56px;height:56px;border-radius:50%;background:var(--primary);color:white;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:24px;">' + (c.name || '?').charAt(0).toUpperCase() + '</div>';
  }
  html += '<div style="position:absolute;bottom:0;right:0;width:18px;height:18px;background:var(--primary);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;color:white;line-height:1;">+</div>';
  html += '<input type="file" id="cust-photo-input-' + c.id + '" accept="image/*" capture="environment" style="display:none;" onchange="uploadCustomerPhoto(\'' + c.id + '\',this)">';
  html += '</div>';
  html += '<div style="flex:1;">';
  html += '<div style="font-size:20px;font-weight:700;color:var(--text);">' + escHtml(c.name) + '</div>';
  html += '<div style="font-size:13px;color:var(--text-muted);">' + escHtml(c.email) + (c.phone ? ' | ' + escHtml(c.phone) : '') + '</div>';
  html += '</div>';
  var statusLabel = c.status === 'vip' ? 'VIP' : c.status === 'lead' ? 'Lead' : c.status === 'inactive' ? 'Inactive' : 'Customer';
  html += '<select onchange="updateCustomerStatus(\'' + c.id + '\',this.value)" style="padding:8px 12px;background:var(--bg);border:1px solid var(--card-border);border-radius:var(--radius);color:var(--text);font-size:13px;">';
  ['customer','vip','lead','inactive'].forEach(function(s) {
    html += '<option value="' + s + '"' + (c.status === s ? ' selected' : '') + '>' + s.charAt(0).toUpperCase() + s.slice(1) + '</option>';
  });
  html += '</select>';
  html += '</div>';

  // Stats row
  html += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px;">';
  html += '<div style="text-align:center;padding:16px;background:var(--bg);border-radius:var(--radius);"><div style="font-size:24px;font-weight:700;color:var(--text);">' + c.totalBookings + '</div><div style="font-size:11px;color:var(--text-muted);">Bookings</div></div>';
  html += '<div style="text-align:center;padding:16px;background:var(--bg);border-radius:var(--radius);"><div style="font-size:24px;font-weight:700;color:var(--primary);">$' + (c.totalSpent || 0).toLocaleString() + '</div><div style="font-size:11px;color:var(--text-muted);">Total Spent</div></div>';
  html += '<div style="text-align:center;padding:16px;background:var(--bg);border-radius:var(--radius);"><div style="font-size:24px;font-weight:700;color:var(--text);">' + reviews.length + '</div><div style="font-size:11px;color:var(--text-muted);">Reviews</div></div>';
  html += '<div style="text-align:center;padding:16px;background:var(--bg);border-radius:var(--radius);"><div style="font-size:14px;font-weight:600;color:var(--text-muted);">' + (c.firstSeen || '—') + '</div><div style="font-size:11px;color:var(--text-muted);">First Seen</div></div>';
  html += '</div>';

  // Notes
  html += '<div style="margin-bottom:24px;">';
  html += '<label style="font-size:13px;font-weight:600;color:var(--text);display:block;margin-bottom:6px;">Notes</label>';
  html += '<textarea id="customer-notes-' + c.id + '" rows="2" style="width:100%;padding:10px;background:var(--bg);border:1px solid var(--card-border);border-radius:var(--radius);color:var(--text);font-size:13px;resize:vertical;">' + escHtml(c.notes || '') + '</textarea>';
  html += '<button class="btn btn-outline btn-sm" style="margin-top:6px;" onclick="saveCustomerNotes(\'' + c.id + '\')">Save Notes</button>';
  html += '</div>';

  // Booking history
  if (bookings.length > 0) {
    html += '<div style="margin-bottom:16px;">';
    html += '<h4 style="font-size:15px;margin-bottom:10px;color:var(--text);">Booking History</h4>';
    bookings.forEach(function(b) {
      var badgeClass = b.status === 'confirmed' ? 'badge-success' : b.status === 'pending' ? 'badge-warning' : b.status === 'completed' ? 'badge-info' : 'badge-danger';
      html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:var(--bg);border:1px solid var(--card-border);border-radius:var(--radius);margin-bottom:6px;cursor:pointer;" onclick="closeModal(\'modal-customer\');viewBookingDetail(\'' + b.id + '\')">';
      html += '<div><strong style="font-size:13px;">' + escHtml(b.date) + '</strong> — ' + escHtml(b.timeSlot) + '</div>';
      html += '<div style="display:flex;align-items:center;gap:10px;"><span style="font-weight:600;">$' + (b.subtotal || 0) + '</span><span class="badge ' + badgeClass + '">' + b.status + '</span></div>';
      html += '</div>';
    });
    html += '</div>';
  }

  // Tags
  html += '<div>';
  html += '<h4 style="font-size:15px;margin-bottom:8px;color:var(--text);">Tags</h4>';
  html += '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;">';
  (c.tags || []).forEach(function(tag, idx) {
    html += '<span style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;background:var(--bg);border:1px solid var(--card-border);border-radius:12px;font-size:12px;color:var(--text);">' + escHtml(tag) + ' <span style="cursor:pointer;color:var(--text-dim);" onclick="removeCustomerTag(\'' + c.id + '\',' + idx + ')">&times;</span></span>';
  });
  html += '</div>';
  html += '<div style="display:flex;gap:6px;">';
  html += '<input type="text" id="new-tag-input" placeholder="Add tag..." style="flex:1;padding:6px 10px;background:var(--bg);border:1px solid var(--card-border);border-radius:var(--radius);color:var(--text);font-size:12px;" onkeydown="if(event.key===\'Enter\')addCustomerTag(\'' + c.id + '\')">';
  html += '<button class="btn btn-outline btn-sm" onclick="addCustomerTag(\'' + c.id + '\')">Add</button>';
  html += '</div>';
  html += '</div>';

  html += '</div>';

  document.getElementById('customer-modal-title').textContent = c.name;
  document.getElementById('customer-detail-body').innerHTML = html;
  openModal('modal-customer');
}

function updateCustomerStatus(id, status) {
  var c = _customers.find(function(x) { return x.id === id; });
  if (c) {
    c.status = status;
    saveCustomers();
    renderCustomerStats();
    renderCustomerList();
    toast('Status updated to ' + status);
  }
}

function saveCustomerNotes(id) {
  var c = _customers.find(function(x) { return x.id === id; });
  var el = document.getElementById('customer-notes-' + id);
  if (c && el) {
    c.notes = el.value;
    saveCustomers();
    toast('Notes saved');
  }
}

function addCustomerTag(id) {
  var c = _customers.find(function(x) { return x.id === id; });
  var input = document.getElementById('new-tag-input');
  if (!c || !input) return;
  var tag = input.value.trim();
  if (!tag) return;
  if (!c.tags) c.tags = [];
  c.tags.push(tag);
  saveCustomers();
  viewCustomerDetail(id);
}

function removeCustomerTag(id, idx) {
  var c = _customers.find(function(x) { return x.id === id; });
  if (c && c.tags) {
    c.tags.splice(idx, 1);
    saveCustomers();
    viewCustomerDetail(id);
  }
}

function openAddCustomerModal() {
  var html = '<div style="padding:20px;">';
  html += '<div class="form-row"><div class="form-group"><label>Name</label><input type="text" id="new-cust-name"></div><div class="form-group"><label>Email</label><input type="email" id="new-cust-email"></div></div>';
  html += '<div class="form-row"><div class="form-group"><label>Phone</label><input type="tel" id="new-cust-phone"></div><div class="form-group"><label>Status</label><select id="new-cust-status"><option value="lead">Lead</option><option value="customer">Customer</option><option value="vip">VIP</option></select></div></div>';
  html += '<div class="form-group"><label>Notes</label><textarea id="new-cust-notes" rows="2"></textarea></div>';
  html += '<div style="display:flex;gap:10px;justify-content:flex-end;">';
  html += '<button class="btn btn-outline" onclick="closeModal(\'modal-customer\')">Cancel</button>';
  html += '<button class="btn btn-primary" onclick="saveNewCustomer()">Save Customer</button>';
  html += '</div>';
  html += '</div>';

  document.getElementById('customer-modal-title').textContent = 'Add Customer';
  document.getElementById('customer-detail-body').innerHTML = html;
  openModal('modal-customer');
}

async function saveNewCustomer() {
  var name = document.getElementById('new-cust-name').value.trim();
  var email = document.getElementById('new-cust-email').value.trim();
  var phone = document.getElementById('new-cust-phone').value.trim();
  var status = document.getElementById('new-cust-status').value;
  var notes = document.getElementById('new-cust-notes').value.trim();

  if (!name) { toast('Name is required', 'error'); return; }

  var newCust = {
    id: 'cust-' + Date.now(),
    name: name,
    email: email,
    phone: phone,
    status: status,
    totalBookings: 0,
    totalSpent: 0,
    lastBooking: null,
    firstSeen: new Date().toISOString().split('T')[0],
    notes: notes,
    tags: [],
    photo_url: ''
  };

  // Push to API
  var apiResult = await CC.dashboard.createCustomer({
    name: name, email: email, phone: phone, notes: notes, tier: status
  });
  if (apiResult && apiResult.id) {
    newCust.id = apiResult.id;
    newCust._apiId = apiResult.id;
  }

  _customers.push(newCust);
  saveCustomers();
  closeModal('modal-customer');
  renderCustomersPage();
  toast('Customer added!', 'success');
}

function exportCustomersCsv() {
  var headers = ['Name','Email','Phone','Status','Bookings','Total Spent','Last Booking','Tags'];
  var rows = _customers.map(function(c) {
    return [
      c.name, c.email, c.phone, c.status,
      c.totalBookings, '$' + (c.totalSpent || 0),
      c.lastBooking || '', (c.tags || []).join('; ')
    ].map(function(v) { return '"' + String(v).replace(/"/g, '""') + '"'; }).join(',');
  });

  var csv = headers.join(',') + '\n' + rows.join('\n');
  var blob = new Blob([csv], { type: 'text/csv' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'customers-' + new Date().toISOString().split('T')[0] + '.csv';
  a.click();
  URL.revokeObjectURL(url);
  toast('CSV exported!');
}

function openScanCardModal() {
  var html = '<div style="padding:20px;text-align:center;">';
  html += '<p style="color:var(--text-muted);font-size:13px;margin:0 0 16px;">Snap or upload a business card — AI will read the name, email, phone, company, and more.</p>';
  html += '<label style="display:inline-flex;align-items:center;gap:8px;padding:12px 24px;background:var(--primary);color:white;border-radius:var(--radius);cursor:pointer;font-size:14px;font-weight:600;">';
  html += '<span>Choose Photo / Take Photo</span>';
  html += '<input type="file" accept="image/*" capture="environment" style="display:none;" onchange="runCardScan(this)">';
  html += '</label>';
  html += '<div id="card-scan-status" style="margin-top:16px;font-size:13px;color:var(--text-muted);"></div>';
  html += '</div>';

  document.getElementById('customer-modal-title').textContent = 'Scan Business Card';
  document.getElementById('customer-detail-body').innerHTML = html;
  openModal('modal-customer');
}

async function runCardScan(input) {
  if (!input || !input.files || !input.files[0]) return;
  var file = input.files[0];
  var status = document.getElementById('card-scan-status');
  if (status) status.textContent = 'Reading card...';

  // Convert to base64
  var base64 = await new Promise(function(resolve) {
    var reader = new FileReader();
    reader.onload = function(e) {
      resolve(e.target.result.split(',')[1]);
    };
    reader.readAsDataURL(file);
  });

  try {
    var API = window.CC_API_BASE || '';
    var token = window.CC && CC.getToken ? CC.getToken() : localStorage.getItem('cc_token');
    var res = await fetch(API + '/api/dashboard/contacts/scan-card', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': 'Bearer ' + token } : {})
      },
      body: JSON.stringify({ image_base64: base64, mime_type: file.type || 'image/jpeg' })
    });

    var data = await res.json();
    if (!res.ok) { toast(data.error || 'Scan failed', 'error'); if (status) status.textContent = ''; return; }

    closeModal('modal-customer');
    openAddCustomerModal();

    // Pre-fill the form with extracted data
    setTimeout(function() {
      var fields = {
        'new-cust-name':  data.name,
        'new-cust-email': data.email,
        'new-cust-phone': data.phone,
        'new-cust-notes': [data.title, data.company, data.website, data.address, data.phone2, data.notes]
          .filter(Boolean).join('\n')
      };
      Object.keys(fields).forEach(function(id) {
        var el = document.getElementById(id);
        if (el && fields[id]) el.value = fields[id];
      });
      document.getElementById('customer-modal-title').textContent = 'New Contact from Card';
      toast('Card read — review and save!', 'success');
    }, 50);

  } catch (err) {
    toast('Scan error — check connection', 'error');
    if (status) status.textContent = '';
  }
}

async function uploadCustomerPhoto(id, input) {
  var c = _customers.find(function(x) { return x.id === id; });
  if (!c || !input || !input.files || !input.files[0]) return;

  toast('Uploading photo...');
  var url = await uploadToSupabase(input.files[0], 'customers');
  if (!url) return;

  c.photo_url = url;
  saveCustomers();

  if (c._apiId) {
    CC.dashboard.updateCustomer(c._apiId, { photo_url: url });
  }

  // Swap the avatar in the open modal without closing it
  var photoEl = document.getElementById('cust-photo-' + id);
  if (photoEl) {
    var img = document.createElement('img');
    img.id = 'cust-photo-' + id;
    img.src = url;
    img.style.cssText = 'width:56px;height:56px;border-radius:50%;object-fit:cover;';
    photoEl.parentNode.replaceChild(img, photoEl);
  }

  renderCustomerList();
  toast('Photo saved!', 'success');
}

if (typeof escHtml === 'undefined') {
  function escHtml(str) {
    var div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }
}

onPageLoad('customers', loadCustomers);
