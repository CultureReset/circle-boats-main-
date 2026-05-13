// ============================================
// Availability — Calendar for rental items
// ============================================

var _availCurrentYear = new Date().getFullYear();
var _availCurrentMonth = new Date().getMonth(); // 0-indexed
var _availBookings = {}; // key: "itemId-YYYY-MM-DD", value: "available"|"booked"|"blocked"

function loadAvailabilityItems() {
  var select = document.getElementById('avail-item-select');
  var currentVal = select.value;
  select.innerHTML = '<option value="">Select item...</option>';

  _inventoryItems.forEach(function(item) {
    var opt = document.createElement('option');
    opt.value = item.id;
    opt.textContent = item.name + ' (qty: ' + item.qty + ')';
    select.appendChild(opt);
  });

  // Restore selection if still valid
  if (currentVal) select.value = currentVal;

  // No demo bookings — real availability comes from the API
}

function formatDateKey(date) {
  var y = date.getFullYear();
  var m = String(date.getMonth() + 1).padStart(2, '0');
  var d = String(date.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + d;
}

async function loadAvailability() {
  var apiData = await CC.dashboard.getAvailability();
  if (apiData && Array.isArray(apiData)) {
    _availBookings = {};
    apiData.forEach(function(row) {
      if (row.item_id && row.date && row.status && row.status !== 'available') {
        _availBookings[row.item_id + '-' + row.date] = row.status;
      }
    });
  }
  renderCalendar();
}

function prevMonth() {
  _availCurrentMonth--;
  if (_availCurrentMonth < 0) {
    _availCurrentMonth = 11;
    _availCurrentYear--;
  }
  renderCalendar();
}

function nextMonth() {
  _availCurrentMonth++;
  if (_availCurrentMonth > 11) {
    _availCurrentMonth = 0;
    _availCurrentYear++;
  }
  renderCalendar();
}

function renderCalendar() {
  var container = document.getElementById('availability-calendar');
  var monthLabel = document.getElementById('avail-month-label');
  var itemId = document.getElementById('avail-item-select').value;

  var monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  monthLabel.textContent = monthNames[_availCurrentMonth] + ' ' + _availCurrentYear;

  var dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  var html = '';

  // Day headers
  dayNames.forEach(function(d) {
    html += '<div class="day-header">' + d + '</div>';
  });

  // First day of month
  var firstDay = new Date(_availCurrentYear, _availCurrentMonth, 1).getDay();
  var daysInMonth = new Date(_availCurrentYear, _availCurrentMonth + 1, 0).getDate();
  var today = new Date();
  var todayStr = formatDateKey(today);

  // Empty cells before first day
  for (var i = 0; i < firstDay; i++) {
    html += '<div class="day-cell empty"></div>';
  }

  // Day cells
  for (var d = 1; d <= daysInMonth; d++) {
    var dateObj = new Date(_availCurrentYear, _availCurrentMonth, d);
    var dateKey = formatDateKey(dateObj);
    var bookingKey = itemId + '-' + dateKey;
    var status = _availBookings[bookingKey] || 'available';
    var isToday = dateKey === todayStr;
    var isPast = dateObj < new Date(today.getFullYear(), today.getMonth(), today.getDate());

    var cls = 'day-cell';
    if (!itemId) {
      cls += ' empty';
    } else if (isPast) {
      cls += ' blocked';
    } else {
      cls += ' ' + status;
    }

    var style = isToday ? ' style="font-weight:700;box-shadow:inset 0 0 0 2px var(--primary);"' : '';

    html += '<div class="' + cls + '"' + style + ' onclick="toggleAvailDay(\'' + dateKey + '\')" title="Click to toggle">' + d + '</div>';
  }

  container.innerHTML = html;
}

function toggleAvailDay(dateKey) {
  var itemId = document.getElementById('avail-item-select').value;
  if (!itemId) {
    toast('Select an item first', 'error');
    return;
  }

  var dateObj = new Date(dateKey + 'T12:00:00');
  var today = new Date();
  today.setHours(0, 0, 0, 0);
  if (dateObj < today) return; // Cannot change past dates

  var key = itemId + '-' + dateKey;
  var current = _availBookings[key] || 'available';

  // Cycle: available -> booked -> blocked -> available
  var newStatus;
  if (current === 'available') {
    newStatus = 'booked';
    _availBookings[key] = 'booked';
  } else if (current === 'booked') {
    newStatus = 'blocked';
    _availBookings[key] = 'blocked';
  } else {
    newStatus = 'available';
    delete _availBookings[key];
  }

  CC.dashboard.setAvailability(itemId, dateKey, newStatus);
  renderCalendar();
}

// Register page load callback
onPageLoad('availability', function() {
  loadAvailabilityItems();
  renderCalendar();
});
