// ============================================
// Calendar View — visual calendar for bookings
// Toggles between Table view and Calendar view
// ============================================

var _calCurrentDate = new Date();
var _calView = 'table'; // 'table' | 'calendar'

function initCalendarToggle() {
  // Inject the view-toggle buttons above the bookings table
  var header = document.querySelector('#page-bookings .card-header');
  if (!header || header.dataset.calReady) return;
  header.dataset.calReady = '1';

  var toggle = document.createElement('div');
  toggle.style.cssText = 'display:flex;gap:6px;';
  toggle.innerHTML =
    '<button class="btn btn-sm ' + (_calView === 'table' ? 'btn-primary' : 'btn-outline') + '" onclick="switchBookingView(\'table\')">Table</button>' +
    '<button class="btn btn-sm ' + (_calView === 'calendar' ? 'btn-primary' : 'btn-outline') + '" onclick="switchBookingView(\'calendar\')">Calendar</button>';
  header.appendChild(toggle);
}

function switchBookingView(view) {
  _calView = view;
  // Update toggle buttons
  var header = document.querySelector('#page-bookings .card-header');
  if (header) {
    var btns = header.querySelectorAll('[onclick^="switchBookingView"]');
    btns.forEach(function(b) {
      b.className = 'btn btn-sm ' + (b.textContent.toLowerCase() === view ? 'btn-primary' : 'btn-outline');
    });
  }

  var tableDiv = document.getElementById('bookings-table');
  var calDiv = document.getElementById('bookings-calendar');
  var filtersDiv = document.getElementById('bookings-filters');

  if (view === 'calendar') {
    if (tableDiv) tableDiv.style.display = 'none';
    if (filtersDiv) filtersDiv.style.display = 'none';
    if (!calDiv) {
      // Create calendar container
      calDiv = document.createElement('div');
      calDiv.id = 'bookings-calendar';
      var parent = tableDiv ? tableDiv.parentNode : null;
      if (parent) parent.appendChild(calDiv);
    }
    calDiv.style.display = '';
    renderBookingsCalendar();
  } else {
    if (tableDiv) tableDiv.style.display = '';
    if (filtersDiv) filtersDiv.style.display = '';
    if (calDiv) calDiv.style.display = 'none';
  }
}

function renderBookingsCalendar() {
  var container = document.getElementById('bookings-calendar');
  if (!container) return;

  var year = _calCurrentDate.getFullYear();
  var month = _calCurrentDate.getMonth();

  var months = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  var html = '';

  // Calendar header
  html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">';
  html += '<button class="btn btn-outline btn-sm" onclick="calNavMonth(-1)">&lt;</button>';
  html += '<h3 style="font-size:18px;font-weight:700;color:var(--text);">' + months[month] + ' ' + year + '</h3>';
  html += '<div style="display:flex;gap:8px;">';
  html += '<button class="btn btn-outline btn-sm" onclick="calGoToday()">Today</button>';
  html += '<button class="btn btn-outline btn-sm" onclick="calNavMonth(1)">&gt;</button>';
  html += '</div>';
  html += '</div>';

  // Day headers
  html += '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:1px;background:var(--card-border);border:1px solid var(--card-border);border-radius:var(--radius-lg);overflow:hidden;">';
  var days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  days.forEach(function(d) {
    html += '<div style="padding:10px;text-align:center;font-size:12px;font-weight:700;color:var(--text-muted);background:var(--bg);text-transform:uppercase;letter-spacing:0.5px;">' + d + '</div>';
  });

  // Calendar cells
  var firstDay = new Date(year, month, 1).getDay();
  var daysInMonth = new Date(year, month + 1, 0).getDate();
  var today = new Date();
  var todayStr = today.getFullYear() + '-' + String(today.getMonth()+1).padStart(2,'0') + '-' + String(today.getDate()).padStart(2,'0');

  // Build booking map by date
  var bookingsByDate = {};
  if (typeof _bookingsData !== 'undefined') {
    _bookingsData.forEach(function(b) {
      if (!bookingsByDate[b.date]) bookingsByDate[b.date] = [];
      bookingsByDate[b.date].push(b);
    });
  }

  // Previous month padding
  var prevMonthDays = new Date(year, month, 0).getDate();
  for (var p = firstDay - 1; p >= 0; p--) {
    var d = prevMonthDays - p;
    html += '<div style="padding:8px;min-height:100px;background:var(--card-bg);opacity:0.4;">';
    html += '<div style="font-size:12px;color:var(--text-dim);">' + d + '</div>';
    html += '</div>';
  }

  // Current month days
  for (var i = 1; i <= daysInMonth; i++) {
    var dateStr = year + '-' + String(month+1).padStart(2,'0') + '-' + String(i).padStart(2,'0');
    var isToday = dateStr === todayStr;
    var dayBookings = bookingsByDate[dateStr] || [];

    html += '<div style="padding:8px;min-height:100px;background:var(--card-bg);cursor:pointer;position:relative;' + (isToday ? 'outline:2px solid var(--primary);outline-offset:-2px;' : '') + '" onclick="calDayClick(\'' + dateStr + '\')">';
    html += '<div style="font-size:12px;font-weight:' + (isToday ? '700' : '600') + ';color:' + (isToday ? 'var(--primary)' : 'var(--text)') + ';margin-bottom:4px;">' + i + '</div>';

    // Show bookings on this day (max 3 visible)
    var shown = 0;
    dayBookings.forEach(function(b) {
      if (shown >= 3) return;
      shown++;
      var statusColor = b.status === 'confirmed' ? 'rgba(0,173,168,0.15)' :
                        b.status === 'completed' ? 'rgba(34,197,94,0.15)' :
                        b.status === 'cancelled' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.15)';
      var textColor = b.status === 'confirmed' ? 'var(--primary)' :
                      b.status === 'completed' ? '#22c55e' :
                      b.status === 'cancelled' ? '#ef4444' : '#f59e0b';
      html += '<div style="padding:3px 6px;margin-bottom:2px;border-radius:4px;background:' + statusColor + ';font-size:10px;color:' + textColor + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:600;">';
      html += escHtml(b.customerName);
      html += '</div>';
    });

    if (dayBookings.length > 3) {
      html += '<div style="font-size:10px;color:var(--text-dim);margin-top:2px;">+' + (dayBookings.length - 3) + ' more</div>';
    }

    html += '</div>';
  }

  // Next month padding
  var totalCells = firstDay + daysInMonth;
  var remainder = totalCells % 7;
  if (remainder > 0) {
    for (var n = 1; n <= (7 - remainder); n++) {
      html += '<div style="padding:8px;min-height:100px;background:var(--card-bg);opacity:0.4;">';
      html += '<div style="font-size:12px;color:var(--text-dim);">' + n + '</div>';
      html += '</div>';
    }
  }

  html += '</div>';

  // Legend
  html += '<div style="display:flex;gap:16px;margin-top:16px;flex-wrap:wrap;">';
  html += '<span style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text-muted);"><span style="width:10px;height:10px;border-radius:2px;background:rgba(245,158,11,0.15);border:1px solid #f59e0b;"></span>Pending</span>';
  html += '<span style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text-muted);"><span style="width:10px;height:10px;border-radius:2px;background:rgba(0,173,168,0.15);border:1px solid var(--primary);"></span>Confirmed</span>';
  html += '<span style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text-muted);"><span style="width:10px;height:10px;border-radius:2px;background:rgba(34,197,94,0.15);border:1px solid #22c55e;"></span>Completed</span>';
  html += '<span style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text-muted);"><span style="width:10px;height:10px;border-radius:2px;background:rgba(239,68,68,0.1);border:1px solid #ef4444;"></span>Cancelled</span>';
  html += '</div>';

  container.innerHTML = html;
}

function calNavMonth(dir) {
  _calCurrentDate.setMonth(_calCurrentDate.getMonth() + dir);
  renderBookingsCalendar();
}

function calGoToday() {
  _calCurrentDate = new Date();
  renderBookingsCalendar();
}

function calDayClick(dateStr) {
  // Show bookings for this date
  var dayBookings = [];
  if (typeof _bookingsData !== 'undefined') {
    dayBookings = _bookingsData.filter(function(b) { return b.date === dateStr; });
  }

  if (dayBookings.length === 0) {
    toast('No bookings on ' + dateStr);
    return;
  }

  // Show a quick summary or switch to table filtered by date
  if (dayBookings.length === 1) {
    viewBookingDetail(dayBookings[0].id);
  } else {
    // Build mini-popup
    var html = '<div style="padding:20px;">';
    html += '<h4 style="margin-bottom:16px;color:var(--text);">Bookings for ' + dateStr + '</h4>';
    dayBookings.forEach(function(b) {
      html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:12px;background:var(--bg);border:1px solid var(--card-border);border-radius:var(--radius);margin-bottom:8px;cursor:pointer;" onclick="closeModal(\'modal-booking\');viewBookingDetail(\'' + b.id + '\')">';
      html += '<div>';
      html += '<div style="font-weight:600;font-size:14px;color:var(--text);">' + escHtml(b.customerName) + '</div>';
      html += '<div style="font-size:12px;color:var(--text-muted);">' + escHtml(b.timeSlot) + '</div>';
      html += '</div>';
      var badgeClass = b.status === 'confirmed' ? 'badge-success' : b.status === 'pending' ? 'badge-warning' : b.status === 'completed' ? 'badge-info' : 'badge-danger';
      html += '<span class="badge ' + badgeClass + '">' + b.status + '</span>';
      html += '</div>';
    });
    html += '</div>';

    document.getElementById('booking-modal-title').textContent = 'Bookings — ' + dateStr;
    document.getElementById('booking-detail-body').innerHTML = html;
    openModal('modal-booking');
  }
}

// Auto-init when bookings page loads
var _origLoadBookings = typeof loadBookings === 'function' ? loadBookings : null;

onPageLoad('bookings', function() {
  setTimeout(initCalendarToggle, 50);
});
