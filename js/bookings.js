// ============================================
// Bookings Manager
// ============================================
//
// FLOW:
// 1. Customer books on website → booking saved → SMS sent to customer + owner
// 2. Business owner sees all bookings here in a table
// 3. Can view details, confirm, cancel, reschedule
// 4. After trip date passes → auto-sends review request SMS
// 5. Customer gets one-time review link via SMS
//
// SMS TO CUSTOMER:
//   "Hi {{name}}! Your booking is confirmed. View details: https://cybercheck.app/b/{{token}}"
//   They can reply to this SMS to contact the business
//
// SMS TO OWNER:
//   "NEW BOOKING! {{name}} booked {{boats}} for {{date}}. Details: ..."

var BOOKINGS_STORAGE = 'beachside_bookings';

var _bookings = [];

// No demo bookings — real bookings come from the API
var _demoBookings = [];

// ---- Filters ----
var _bookingFilter = 'all'; // all | pending | confirmed | completed | cancelled
var _bookingSearch = '';

// ---- Auto-refresh / polling ----
var _bookingPollInterval = null;
var _bookingLastRefresh = null;
var BOOKING_POLL_MS = 30000; // 30 seconds

function startBookingPolling() {
  stopBookingPolling();
  _bookingPollInterval = setInterval(async function() {
    var prevPending = _bookings.filter(function(b) { return b.status === 'pending'; }).length;
    var prevIdSet = _bookings.map(function(b) { return String(b.id); });
    var prevIds = prevIdSet.join(',');
    await loadBookingsQuiet();
    var newPending = _bookings.filter(function(b) { return b.status === 'pending'; }).length;
    var newIds = _bookings.map(function(b) { return b.id; }).join(',');
    if (newIds !== prevIds) {
      if (newPending > prevPending) {
        var diff = newPending - prevPending;
        showBookingBadge(newPending);
        toast('🔔 ' + diff + ' new booking' + (diff > 1 ? 's' : '') + ' received!', 'success');
        playNotificationSound();
        var newBookings = _bookings.filter(function(b) {
          return b.status === 'pending' && prevIdSet.indexOf(String(b.id)) === -1;
        });
        if (typeof sendOwnerWhatsApp === 'function' && newBookings.length > 0) {
          newBookings.forEach(function(b) {
            sendOwnerWhatsApp(typeof formatWhatsAppBookingMsg === 'function' ? formatWhatsAppBookingMsg(b) : 'NEW BOOKING from ' + (b.customerName || 'customer') + ' on ' + (b.date || ''));
          });
        }
      }
    }
    updateRefreshIndicator();
  }, BOOKING_POLL_MS);
}

function stopBookingPolling() {
  if (_bookingPollInterval) { clearInterval(_bookingPollInterval); _bookingPollInterval = null; }
}

async function loadBookingsQuiet() {
  var apiData = await CC.dashboard.getBookings();
  if (apiData && Array.isArray(apiData)) {
    _bookings = mapApiBookings(apiData);
    renderBookingsStats();
    renderBookingsTable();
  }
  _bookingLastRefresh = new Date();
}

function mapApiBookings(apiData) {
  return apiData.map(function(b) {
    return {
      id: b.id || b.booking_id,
      customerName: b.customer_name || '',
      customerEmail: b.customer_email || '',
      customerPhone: b.customer_phone || '',
      date: b.booking_date || '',
      timeSlot: (b.rental_time_slots && b.rental_time_slots.name) || b.booking_time || '',
      boats: (function() {
        if (Array.isArray(b.boats) && b.boats.length > 0) {
          return b.boats.map(function(bt) { return { type: bt.type || bt.name || 'Boat', qty: bt.qty || 1 }; });
        }
        if (b.fleet_type_id) return [{ type: (b.fleet_types && b.fleet_types.name) || 'Boat', qty: b.qty || 1 }];
        return [];
      }()),
      guests: b.party_size || 1,
      addons: (function() {
        var raw = b.addons;
        if (!raw) return [];
        if (typeof raw === 'string') { try { raw = JSON.parse(raw); } catch(e) { return [raw]; } }
        if (!Array.isArray(raw)) return [];
        return raw.map(function(a) { return typeof a === 'string' ? a : (a.name || ''); }).filter(Boolean);
      }()),
      subtotal: b.subtotal || 0,
      platformFee: (b.total || 0) - (b.subtotal || 0),
      total: b.total || 0,
      deposit: b.deposit || 0,
      balanceDue: (b.total || 0) - (b.deposit || 0),
      status: b.status || 'pending',
      paymentStatus: b.payment_status || 'unpaid',
      stripePaymentId: b.payment_id || '',
      notes: b.notes || '',
      createdAt: b.created_at || '',
      smsDelivered: b.sms_delivered || false,
      reviewRequested: b.review_requested || false,
      bookingToken: b.booking_token || '',
      source: b.payment_provider || 'direct',  // wix | direct | ai | phone
      _apiId: b.id
    };
  });
}

function updateRefreshIndicator() {
  var el = document.getElementById('bookings-refresh-time');
  if (!el || !_bookingLastRefresh) return;
  var secs = Math.round((new Date() - _bookingLastRefresh) / 1000);
  el.textContent = secs < 5 ? 'Just now' : secs + 's ago';
}

function showBookingBadge(count) {
  var navItem = document.querySelector('[data-page="bookings"]');
  if (!navItem) return;
  var existing = navItem.querySelector('.booking-badge');
  if (existing) existing.remove();
  if (count > 0) {
    var badge = document.createElement('span');
    badge.className = 'booking-badge';
    badge.textContent = count;
    badge.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;background:#ef4444;color:white;border-radius:50%;width:18px;height:18px;font-size:11px;font-weight:700;margin-left:6px;flex-shrink:0;';
    navItem.style.display = 'flex';
    navItem.style.alignItems = 'center';
    navItem.appendChild(badge);
  }
}

function playNotificationSound() {
  try {
    var ctx = new (window.AudioContext || window.webkitAudioContext)();
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(520, ctx.currentTime);
    osc.frequency.setValueAtTime(660, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  } catch(e) {}
}

async function loadBookings() {
  var apiData = await CC.dashboard.getBookings();
  if (apiData && Array.isArray(apiData) && apiData.length > 0) {
    _bookings = mapApiBookings(apiData);
  } else {
    try {
      var saved = localStorage.getItem(BOOKINGS_STORAGE);
      _bookings = saved ? JSON.parse(saved) : _demoBookings.slice();
    } catch(e) {
      _bookings = _demoBookings.slice();
    }
  }

  _bookingLastRefresh = new Date();
  renderBookingsStats();
  renderBookingsFilters();
  renderBookingsRefreshBar();
  renderBookingsTable();

  // Show pending badge on nav
  var pending = _bookings.filter(function(b) { return b.status === 'pending'; }).length;
  if (pending > 0) showBookingBadge(pending);

  // Start polling for new bookings
  startBookingPolling();

  // Load declined bookings separately
  loadDeclinedBookings();
}

async function loadDeclinedBookings() {
  try {
    const token = CC.auth?.getToken ? CC.auth.getToken() : (localStorage.getItem('cc_token') || sessionStorage.getItem('cc_token'));
    const res = await fetch('https://cybercheck-api-database.vercel.app/api/dashboard/declined-bookings', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const data = await res.json();
    renderDeclinedBookings(data || []);
  } catch(e) {
    renderDeclinedBookings([]);
  }
}

function renderDeclinedBookings(declined) {
  var container = document.getElementById('declined-bookings-section');
  if (!container) return;

  if (declined.length === 0) {
    container.style.display = 'none';
    return;
  }

  container.style.display = '';
  container.innerHTML = `
    <div style="margin-top:32px;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
        <h3 style="font-size:16px;font-weight:700;color:var(--text);">Declined Payments</h3>
        <span style="background:#fef2f2;color:#ef4444;border:1px solid #fecaca;border-radius:20px;font-size:12px;font-weight:600;padding:2px 10px;">${declined.length}</span>
        <span style="font-size:12px;color:var(--text-muted);">— good for retargeting ads</span>
      </div>
      <div style="overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr style="border-bottom:1px solid var(--card-border);color:var(--text-muted);text-align:left;">
              <th style="padding:8px 12px;font-weight:600;">Customer</th>
              <th style="padding:8px 12px;font-weight:600;">Phone</th>
              <th style="padding:8px 12px;font-weight:600;">Email</th>
              <th style="padding:8px 12px;font-weight:600;">Date</th>
              <th style="padding:8px 12px;font-weight:600;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${declined.map(function(b) {
              return `<tr style="border-bottom:1px solid var(--card-border);">
                <td style="padding:10px 12px;font-weight:600;">${b.customer_name || '—'}</td>
                <td style="padding:10px 12px;">${b.customer_phone || '—'}</td>
                <td style="padding:10px 12px;">${b.customer_email || '—'}</td>
                <td style="padding:10px 12px;">${b.booking_date || '—'}</td>
                <td style="padding:10px 12px;color:#ef4444;font-weight:600;">$${(b.total || 0).toFixed(2)} <span style="font-size:11px;background:#fef2f2;color:#ef4444;border-radius:4px;padding:2px 6px;">declined</span></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
}

function saveBookings() {
  try {
    localStorage.setItem(BOOKINGS_STORAGE, JSON.stringify(_bookings));
  } catch(e) {}
}

// ---- Stats ----

function renderBookingsStats() {
  var container = document.getElementById('bookings-stats');
  if (!container) return;

  var today = new Date().toISOString().split('T')[0];
  var upcoming = _bookings.filter(function(b) { return b.date >= today && b.status !== 'cancelled'; });
  var todayBookings = _bookings.filter(function(b) { return b.date === today && b.status !== 'cancelled'; });
  var totalRevenue = _bookings.filter(function(b) { return b.status !== 'cancelled' && b.paymentStatus === 'paid'; })
    .reduce(function(sum, b) { return sum + (parseFloat(b.total) || 0); }, 0);
  var pending = _bookings.filter(function(b) { return b.status === 'pending'; });

  var html = '';
  html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:16px;">';

  html += buildStatCard('Today', todayBookings.length, 'bookings', '#00ada8');
  html += buildStatCard('Upcoming', upcoming.length, 'scheduled', '#4DA6FF');
  html += buildStatCard('Revenue', '$' + totalRevenue.toFixed(2), 'total booked', '#22c55e');
  html += buildStatCard('Pending', pending.length, 'needs confirmation', pending.length > 0 ? '#f59e0b' : '#6B7280');

  html += '</div>';
  container.innerHTML = html;
}

function buildStatCard(label, value, sub, color) {
  var html = '';
  html += '<div style="padding:20px;background:var(--bg);border:1px solid var(--card-border);border-radius:var(--radius);text-align:center;">';
  html += '<div style="font-size:28px;font-weight:800;color:' + color + ';">' + value + '</div>';
  html += '<div style="font-size:13px;font-weight:600;color:var(--text);margin-top:4px;">' + label + '</div>';
  html += '<div style="font-size:11px;color:var(--text-dim);">' + sub + '</div>';
  html += '</div>';
  return html;
}

// ---- Refresh bar ----

function renderBookingsRefreshBar() {
  var container = document.getElementById('bookings-refresh-bar');
  if (!container) return;
  container.innerHTML =
    '<div style="display:flex;align-items:center;gap:8px;font-size:12px;color:var(--text-dim);">' +
    '<span style="width:7px;height:7px;border-radius:50%;background:#22c55e;display:inline-block;animation:pulse 2s infinite;"></span>' +
    'Live — refreshes every 30s &nbsp;·&nbsp; Last updated: <span id="bookings-refresh-time">Just now</span>' +
    '&nbsp;<button onclick="loadBookings()" style="border:none;background:none;cursor:pointer;font-size:12px;color:var(--primary);padding:0;text-decoration:underline;">Refresh now</button>' +
    '</div>';
  // Start the tick
  setInterval(updateRefreshIndicator, 5000);
}

// ---- Filters ----

function renderBookingsFilters() {
  var container = document.getElementById('bookings-filters');
  if (!container) return;

  var filters = [
    { key: 'all', label: 'All Bookings' },
    { key: 'pending', label: 'Pending' },
    { key: 'confirmed', label: 'Confirmed' },
    { key: 'completed', label: 'Completed' },
    { key: 'cancelled', label: 'Cancelled' }
  ];

  var html = '';
  html += '<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">';

  html += '<div style="display:flex;gap:4px;background:var(--bg);padding:4px;border-radius:var(--radius);border:1px solid var(--card-border);">';
  filters.forEach(function(f) {
    var active = _bookingFilter === f.key;
    html += '<button onclick="filterBookings(\'' + f.key + '\')" style="padding:8px 14px;border:none;border-radius:6px;font-size:13px;font-weight:' + (active ? '600' : '400') + ';cursor:pointer;background:' + (active ? 'var(--primary)' : 'transparent') + ';color:' + (active ? 'white' : 'var(--text-muted)') + ';transition:all 0.2s;">' + f.label + '</button>';
  });
  html += '</div>';

  html += '<div style="flex:1;"></div>';

  html += '<input type="text" placeholder="Search by name, email, ID..." style="min-width:240px;padding:8px 14px;font-size:13px;" oninput="searchBookings(this.value)" value="' + escHtml(_bookingSearch) + '">';

  html += '</div>';
  container.innerHTML = html;
}

function filterBookings(filter) {
  _bookingFilter = filter;
  renderBookingsFilters();
  renderBookingsTable();
}

function searchBookings(query) {
  _bookingSearch = query.toLowerCase().trim();
  renderBookingsTable();
}

// ---- Bookings Table ----

function renderBookingsTable() {
  var container = document.getElementById('bookings-table');
  if (!container) return;

  var filtered = _bookings.filter(function(b) {
    if (_bookingFilter !== 'all' && b.status !== _bookingFilter) return false;
    if (_bookingSearch) {
      var s = _bookingSearch;
      return b.customerName.toLowerCase().indexOf(s) >= 0 ||
             b.customerEmail.toLowerCase().indexOf(s) >= 0 ||
             b.id.toLowerCase().indexOf(s) >= 0 ||
             b.customerPhone.indexOf(s) >= 0;
    }
    return true;
  });

  // Sort: paid first, unpaid pushed to bottom; then by status, then by date
  filtered.sort(function(a, b) {
    var aPaid = a.paymentStatus === 'paid' || a.paymentStatus === 'deposit_paid' ? 0 : 1;
    var bPaid = b.paymentStatus === 'paid' || b.paymentStatus === 'deposit_paid' ? 0 : 1;
    if (aPaid !== bPaid) return aPaid - bPaid;
    var statusOrder = { pending: 0, confirmed: 1, completed: 2, cancelled: 3 };
    if (statusOrder[a.status] !== statusOrder[b.status]) return statusOrder[a.status] - statusOrder[b.status];
    return a.date > b.date ? 1 : -1;
  });

  if (filtered.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-dim);">No bookings found.</div>';
    return;
  }

  var html = '<div class="table-wrap"><table>';
  html += '<thead><tr>';
  html += '<th>ID</th><th>Customer</th><th>Date</th><th>Time Slot</th><th>Boats</th><th>Guests</th><th>Total</th><th>Status</th><th>Payment</th><th>Source</th><th>Actions</th>';
  html += '</tr></thead><tbody>';

  var seenUnpaidDivider = false;
  filtered.forEach(function(b) {
    var statusBadge = getStatusBadge(b.status);
    var payBadge = getPaymentBadge(b.paymentStatus);
    var boatSummary = b.boats.map(function(bt) { return bt.qty + 'x ' + bt.type.replace(' Circle Boat', ''); }).join(', ');
    var dateFormatted = formatBookingDate(b.date);
    var isUnpaid = b.paymentStatus !== 'paid' && b.paymentStatus !== 'deposit_paid';

    if (isUnpaid && !seenUnpaidDivider) {
      seenUnpaidDivider = true;
      html += '<tr><td colspan="11" style="padding:14px 12px;background:#fef3c7;border-top:2px solid #f59e0b;border-bottom:2px solid #f59e0b;font-size:12px;font-weight:600;color:#92400e;">';
      html += '&#9888;&#65039; Awaiting / Failed Payment — these bookings have NOT been paid and are not counted in revenue';
      html += '</td></tr>';
    }

    var rowStyle = isUnpaid
      ? 'cursor:pointer;background:rgba(254,243,199,0.4);border-left:3px solid #f59e0b;opacity:0.85;'
      : 'cursor:pointer;';
    html += '<tr style="' + rowStyle + '" onclick="viewBookingDetail(\'' + b.id + '\')">';
    html += '<td style="font-family:\'SF Mono\',monospace;font-size:12px;color:var(--text-dim);">' + b.id + '</td>';
    html += '<td><strong>' + escHtml(b.customerName) + '</strong><br><span style="font-size:11px;color:var(--text-dim);">' + escHtml(b.customerEmail) + '</span></td>';
    html += '<td>' + dateFormatted + '</td>';
    html += '<td style="font-size:12px;">' + escHtml(b.timeSlot) + '</td>';
    html += '<td style="font-size:12px;">' + escHtml(boatSummary) + '</td>';
    html += '<td style="text-align:center;">' + b.guests + '</td>';
    html += '<td style="font-weight:600;">$' + b.total.toFixed(2) + '</td>';
    html += '<td>' + statusBadge + '</td>';
    html += '<td>' + payBadge + '</td>';
    html += '<td>' + getSourceBadge(b.source) + '</td>';
    html += '<td style="white-space:nowrap;">';
    if (b.status === 'pending') {
      html += '<button class="btn btn-primary btn-sm" onclick="event.stopPropagation();confirmBooking(\'' + b.id + '\')">Confirm</button> ';
    }
    if (b.status === 'confirmed') {
      html += '<button class="btn btn-outline btn-sm" onclick="event.stopPropagation();completeBooking(\'' + b.id + '\')">Complete</button> ';
    }
    if (b.status !== 'cancelled' && b.status !== 'completed') {
      html += '<button class="btn btn-outline btn-sm" onclick="event.stopPropagation();cancelBooking(\'' + b.id + '\')" style="color:var(--danger);">Cancel</button>';
    }
    if (b.status === 'completed' && !b.reviewRequested) {
      html += '<button class="btn btn-outline btn-sm" onclick="event.stopPropagation();sendReviewRequest(\'' + b.id + '\')" style="color:#a855f7;">Send Review</button>';
    }
    if (b.status !== 'cancelled') {
      html += ' <button class="btn btn-outline btn-sm" onclick="event.stopPropagation();resendConfirmation(\'' + b.id + '\')" style="color:#0ea5e9;border-color:#0ea5e9;" title="Resend SMS + Email confirmation to customer">&#128232; Resend</button>';
      html += ' <button class="btn btn-outline btn-sm" onclick="event.stopPropagation();sendWaiverLink(\'' + b.id + '\')" style="color:#f59e0b;border-color:#f59e0b;" title="Send waiver link to customer">&#9997; Waiver</button>';
    }
    html += '</td>';
    html += '</tr>';
  });

  html += '</tbody></table></div>';
  container.innerHTML = html;
}

function getStatusBadge(status) {
  var map = {
    pending: '<span class="badge badge-warning">Pending</span>',
    confirmed: '<span class="badge badge-info">Confirmed</span>',
    completed: '<span class="badge badge-success">Completed</span>',
    cancelled: '<span class="badge" style="background:rgba(239,68,68,0.1);color:#ef4444;">Cancelled</span>',
    'no-show': '<span class="badge" style="background:rgba(107,114,128,0.1);color:#6B7280;">No-show</span>'
  };
  return map[status] || status;
}

function getPaymentBadge(status) {
  var map = {
    unpaid: '<span class="badge" style="background:rgba(239,68,68,0.1);color:#ef4444;">Unpaid</span>',
    deposit_paid: '<span class="badge badge-warning">Deposit</span>',
    paid: '<span class="badge badge-success">Paid</span>',
    refunded: '<span class="badge" style="background:rgba(107,114,128,0.1);color:#6B7280;">Refunded</span>'
  };
  return map[status] || status;
}

function getSourceBadge(source) {
  var map = {
    wix:    '<span class="badge" style="background:rgba(0,100,220,0.1);color:#0064dc;">Wix</span>',
    direct: '<span class="badge" style="background:rgba(0,173,168,0.1);color:#00ada8;">Direct</span>',
    ai:     '<span class="badge" style="background:rgba(168,85,247,0.1);color:#a855f7;">AI</span>',
    phone:  '<span class="badge" style="background:rgba(245,158,11,0.1);color:#d97706;">Phone</span>',
    stripe: '<span class="badge" style="background:rgba(0,173,168,0.1);color:#00ada8;">Direct</span>'
  };
  return map[source] || '<span class="badge" style="background:rgba(107,114,128,0.1);color:#6b7280;">' + (source || 'Direct') + '</span>';
}

function formatBookingDate(dateStr) {
  var d = new Date(dateStr + 'T00:00:00');
  var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  return days[d.getDay()] + ', ' + months[d.getMonth()] + ' ' + d.getDate();
}

// ---- Booking Actions ----

async function confirmBooking(id) {
  var b = _bookings.find(function(x) { return x.id === id; });
  if (!b) return;
  b.status = 'confirmed';
  saveBookings();
  var apiId = b._apiId || id;
  await CC.dashboard.updateBooking(apiId, { status: 'confirmed' });
  renderBookingsStats();
  renderBookingsTable();
  toast('Booking ' + id + ' confirmed! SMS sent to ' + b.customerName);
  if (typeof sendOwnerWhatsApp === 'function') {
    var boats = (b.boats || []).map(function(bt) { return bt.qty + 'x ' + bt.type; }).join(', ') || 'Boat';
    sendOwnerWhatsApp('BOOKING CONFIRMED\nCustomer: ' + b.customerName + '\nPhone: ' + (b.customerPhone || '') + '\nDate: ' + b.date + '\nTime: ' + (b.timeSlot || '') + '\nBoats: ' + boats + '\nTotal: $' + (b.total || '0'));
  }
}

async function completeBooking(id) {
  var b = _bookings.find(function(x) { return x.id === id; });
  if (!b) return;
  b.status = 'completed';
  b.paymentStatus = 'paid';
  b.balanceDue = 0;
  saveBookings();
  var apiId = b._apiId || id;
  await CC.dashboard.updateBooking(apiId, { status: 'completed', payment_status: 'paid' });
  renderBookingsStats();
  renderBookingsTable();
  toast('Booking ' + id + ' marked complete!');
}

async function cancelBooking(id) {
  var b = _bookings.find(function(x) { return x.id === id; });
  if (!b) return;

  var hasPaid = b.paymentStatus === 'paid' || b.paymentStatus === 'deposit_paid';
  var hasPaymentId = !!(b.stripePaymentId);
  var confirmMsg = 'Cancel booking ' + id + ' for ' + b.customerName + '?';
  if (hasPaid && hasPaymentId) {
    confirmMsg += '\n\nA Stripe refund will be processed automatically.';
  } else if (hasPaid && !hasPaymentId) {
    confirmMsg += '\n\nNote: No Stripe payment ID found — you may need to issue the refund manually in your Stripe dashboard.';
  } else {
    confirmMsg += '\nA cancellation SMS will be sent.';
  }
  if (!confirm(confirmMsg)) return;

  var refundAmount = null;
  if (hasPaid && hasPaymentId) {
    var amtStr = prompt(
      'Refund amount for ' + b.customerName + '?\n' +
      'Total paid: $' + Number(b.total).toFixed(2) + '\n\n' +
      'Enter amount to refund (e.g. ' + Number(b.total).toFixed(2) + '), or leave blank for full refund:',
      Number(b.total).toFixed(2)
    );
    if (amtStr === null) return; // user cancelled prompt
    var parsed = parseFloat(amtStr);
    refundAmount = (!isNaN(parsed) && parsed > 0 && parsed < b.total) ? Math.round(parsed * 100) : null; // null = full refund
  }

  var apiId = b._apiId || id;

  // Issue Stripe refund if payment exists
  if (hasPaid && hasPaymentId) {
    try {
      var token = CC.getToken ? CC.getToken() : null;
      var body = { payment_intent_id: b.stripePaymentId, booking_id: apiId };
      if (refundAmount) body.amount = refundAmount;
      var res = await fetch((window.CC_API_BASE || '') + '/api/stripe/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify(body)
      });
      var result = await res.json();
      if (!res.ok) {
        toast('Stripe refund failed: ' + (result.error || result.message || 'Unknown error'), 'error');
        return; // don't cancel booking if refund failed
      }
    } catch(e) {
      toast('Refund request failed: ' + e.message, 'error');
      return;
    }
  }

  // Update booking in DB after refund confirmed (or if no payment to refund)
  b.status = 'cancelled';
  b.paymentStatus = hasPaid ? 'refunded' : b.paymentStatus;
  saveBookings();
  await CC.dashboard.updateBooking(apiId, { status: 'cancelled', payment_status: b.paymentStatus });
  renderBookingsStats();
  renderBookingsTable();

  if (hasPaid && hasPaymentId) {
    var refLabel = refundAmount ? '$' + (refundAmount / 100).toFixed(2) : 'full $' + Number(b.total).toFixed(2);
    toast('Booking cancelled. Stripe refund of ' + refLabel + ' initiated!', 'success');
  } else {
    toast('Booking cancelled.' + (hasPaid ? ' Issue refund manually in Stripe dashboard.' : ''));
  }
  if (typeof sendOwnerWhatsApp === 'function') {
    var waMsg = 'BOOKING CANCELLED\nCustomer: ' + b.customerName + '\nPhone: ' + (b.customerPhone || '') + '\nDate: ' + b.date;
    if (hasPaid) waMsg += '\nRefund initiated via Square';
    sendOwnerWhatsApp(waMsg);
  }
}

function sendReviewRequest(id) {
  var b = _bookings.find(function(x) { return x.id === id; });
  if (!b) return;
  b.reviewRequested = true;
  saveBookings();
  renderBookingsTable();
  // In production: Twilio sends SMS with one-time review link
  // "Hi {{name}}! Thanks for your trip with Beachside Circle Boats! We'd love your feedback: https://cybercheck.app/review/{{token}}"
  toast('Review request SMS sent to ' + b.customerName + '!', 'success');
}

// ---- Booking Detail Modal ----

function viewBookingDetail(id) {
  var b = _bookings.find(function(x) { return x.id === id; });
  if (!b) return;

  var modal = document.getElementById('modal-booking');
  if (!modal) return;

  document.getElementById('booking-modal-title').textContent = 'Booking ' + b.id;

  var body = document.getElementById('booking-detail-body');
  var html = '';

  // Status bar
  html += '<div style="display:flex;align-items:center;gap:12px;padding:16px;background:var(--bg);border-radius:var(--radius);margin-bottom:20px;">';
  html += getStatusBadge(b.status) + ' ' + getPaymentBadge(b.paymentStatus);
  html += '<div style="flex:1;"></div>';
  html += '<span style="font-size:12px;color:var(--text-dim);">Booked ' + new Date(b.createdAt).toLocaleDateString() + '</span>';
  html += '</div>';

  // Customer info
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;">';

  html += '<div style="padding:16px;background:var(--bg);border:1px solid var(--card-border);border-radius:var(--radius);">';
  html += '<div style="font-size:11px;color:var(--text-dim);text-transform:uppercase;margin-bottom:8px;">Customer</div>';
  html += '<div style="font-size:16px;font-weight:700;color:var(--text);">' + escHtml(b.customerName) + '</div>';
  html += '<div style="font-size:13px;color:var(--text-muted);margin-top:4px;">' + escHtml(b.customerEmail) + '</div>';
  html += '<div style="font-size:13px;color:var(--text-muted);">' + escHtml(b.customerPhone) + '</div>';
  html += '</div>';

  html += '<div style="padding:16px;background:var(--bg);border:1px solid var(--card-border);border-radius:var(--radius);">';
  html += '<div style="font-size:11px;color:var(--text-dim);text-transform:uppercase;margin-bottom:8px;">Trip Details</div>';
  html += '<div style="font-size:16px;font-weight:700;color:var(--text);">' + formatBookingDate(b.date) + '</div>';
  html += '<div style="font-size:13px;color:var(--text-muted);margin-top:4px;">' + escHtml(b.timeSlot) + '</div>';
  html += '<div style="font-size:13px;color:var(--text-muted);">' + b.guests + ' guest' + (b.guests !== 1 ? 's' : '') + '</div>';
  html += '</div>';

  html += '</div>';

  // Boats
  html += '<div style="margin-bottom:20px;">';
  html += '<div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:8px;">Boats</div>';
  b.boats.forEach(function(bt) {
    html += '<div style="display:flex;align-items:center;gap:8px;padding:10px 14px;background:var(--bg);border:1px solid var(--card-border);border-radius:var(--radius);margin-bottom:6px;">';
    html += '<span style="font-size:14px;">' + bt.qty + 'x</span>';
    html += '<span style="font-size:14px;font-weight:500;color:var(--text);">' + escHtml(bt.type) + '</span>';
    html += '</div>';
  });
  html += '</div>';

  // Add-ons
  if (b.addons.length > 0) {
    html += '<div style="margin-bottom:20px;">';
    html += '<div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:8px;">Add-ons</div>';
    html += '<div style="display:flex;flex-wrap:wrap;gap:6px;">';
    b.addons.forEach(function(a) {
      html += '<span style="padding:6px 12px;background:rgba(0,173,168,0.1);color:var(--primary);border-radius:20px;font-size:12px;font-weight:500;">' + escHtml(a) + '</span>';
    });
    html += '</div></div>';
  }

  // Notes
  if (b.notes) {
    html += '<div style="margin-bottom:20px;">';
    html += '<div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:8px;">Notes</div>';
    html += '<div style="padding:12px;background:var(--bg);border:1px solid var(--card-border);border-radius:var(--radius);font-size:13px;color:var(--text-muted);font-style:italic;">' + escHtml(b.notes) + '</div>';
    html += '</div>';
  }

  // Payment breakdown
  html += '<div style="padding:16px;background:var(--bg);border:1px solid var(--card-border);border-radius:var(--radius);margin-bottom:20px;">';
  html += '<div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:12px;">Payment</div>';
  html += '<div style="display:flex;justify-content:space-between;font-size:13px;color:var(--text-muted);margin-bottom:6px;"><span>Subtotal</span><span>$' + b.subtotal.toFixed(2) + '</span></div>';
  html += '<div style="display:flex;justify-content:space-between;font-size:13px;color:var(--text-muted);margin-bottom:6px;"><span>Platform Fee</span><span>$' + b.platformFee.toFixed(2) + '</span></div>';
  html += '<div style="display:flex;justify-content:space-between;font-size:15px;font-weight:700;color:var(--text);padding-top:8px;border-top:1px solid var(--card-border);"><span>Total</span><span>$' + b.total.toFixed(2) + '</span></div>';
  if (b.deposit > 0) {
    html += '<div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-dim);margin-top:6px;"><span>Deposit Paid</span><span>$' + b.deposit.toFixed(2) + '</span></div>';
  }
  if (b.balanceDue > 0) {
    html += '<div style="display:flex;justify-content:space-between;font-size:13px;color:var(--warning);font-weight:600;margin-top:4px;"><span>Balance Due</span><span>$' + b.balanceDue.toFixed(2) + '</span></div>';
  }
  html += '</div>';

  // SMS / Comms status
  html += '<div style="padding:16px;background:var(--bg);border:1px solid var(--card-border);border-radius:var(--radius);margin-bottom:20px;">';
  html += '<div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:10px;">Communications</div>';
  html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">';
  html += b.smsDelivered ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>' : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/></svg>';
  html += '<span style="font-size:13px;color:var(--text-muted);">Booking confirmation SMS ' + (b.smsDelivered ? 'delivered' : 'pending') + '</span>';
  html += '</div>';
  html += '<div style="display:flex;align-items:center;gap:8px;">';
  html += b.reviewRequested ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>' : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12.01" y2="16"/><line x1="12" y1="8" x2="12" y2="12"/></svg>';
  html += '<span style="font-size:13px;color:var(--text-muted);">Review request ' + (b.reviewRequested ? 'sent' : 'not sent') + '</span>';
  html += '</div>';
  html += '<div style="font-size:11px;color:var(--text-dim);margin-top:8px;">Customer booking link: cybercheck.app/b/' + b.bookingToken + '</div>';
  html += '</div>';

  // Action buttons
  html += '<div style="display:flex;gap:10px;flex-wrap:wrap;">';
  if (b.status === 'pending') {
    html += '<button class="btn btn-primary" onclick="confirmBooking(\'' + b.id + '\');closeModal(\'modal-booking\');loadBookings();">Confirm Booking</button>';
  }
  if (b.status === 'confirmed') {
    html += '<button class="btn btn-success" onclick="completeBooking(\'' + b.id + '\');closeModal(\'modal-booking\');loadBookings();">Mark Complete</button>';
  }
  if (b.status === 'completed' && !b.reviewRequested) {
    html += '<button class="btn btn-primary" onclick="sendReviewRequest(\'' + b.id + '\');closeModal(\'modal-booking\');loadBookings();" style="background:#a855f7;">Send Review Request</button>';
  }
  if (b.status !== 'cancelled' && b.status !== 'completed') {
    html += '<button class="btn btn-outline" onclick="cancelBooking(\'' + b.id + '\');closeModal(\'modal-booking\');loadBookings();" style="color:var(--danger);border-color:var(--danger);">Cancel Booking</button>';
  }
  html += '<button class="btn btn-outline" onclick="resendConfirmation(\'' + b.id + '\')">&#128232; Resend</button>';
  html += '<button class="btn btn-outline" onclick="sendWaiverLink(\'' + b.id + '\')" style="color:#f59e0b;border-color:#f59e0b;">&#9997; Send Waiver</button>';
  html += '</div>';

  body.innerHTML = html;
  openModal('modal-booking');
}

async function resendConfirmation(id) {
  var apiId = id.startsWith('b-') ? id.slice(2) : id;
  if (!confirm('Resend SMS + Email confirmation to customer?')) return;
  try {
    var resp = await fetch('https://cybercheck-api-database.vercel.app/api/public/resend-confirmation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ booking_id: apiId })
    });
    var data = await resp.json();
    if (!resp.ok) throw new Error(data.error || 'Failed');
    toast('Confirmation resent to customer!', 'success');
    var rb = _bookings.find(function(x) { return (x._apiId || x.id) === id || x.id === 'b-' + id; });
    if (rb && typeof sendOwnerWhatsApp === 'function') {
      sendOwnerWhatsApp('CONFIRMATION RESENT\nCustomer: ' + rb.customerName + '\nPhone: ' + (rb.customerPhone || '') + '\nDate: ' + rb.date + '\nEmail + SMS resent to customer.');
    }
  } catch(e) {
    toast(e.message || 'Resend failed', 'error');
  }
}

async function sendWaiverLink(id) {
  var apiId = id.startsWith('b-') ? id.slice(2) : id;
  if (!confirm('Send waiver link to customer?')) return;
  try {
    var resp = await fetch('https://cybercheck-api-database.vercel.app/api/public/waivers/send-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ booking_id: apiId })
    });
    var data = await resp.json();
    if (!resp.ok) throw new Error(data.error || 'Failed');
    if (data.already_signed) {
      toast('Waiver already signed by this customer.', 'info');
    } else {
      toast('Waiver link sent to customer!', 'success');
    }
  } catch(e) {
    toast(e.message || 'Send failed', 'error');
  }
}

if (typeof escHtml === 'undefined') {
  function escHtml(str) {
    var div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }
}

onPageLoad('bookings', loadBookings);
