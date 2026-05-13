// ============================================================
// Blackout Dates — Block entire days across all boats
// ============================================================

var _blackoutDates = [];
var _blackoutCurrentYear = new Date().getFullYear();
var _blackoutCurrentMonth = new Date().getMonth();

async function loadBlackoutDates() {
  var data = await CC.dashboard.getBlackoutDates();
  _blackoutDates = data || [];
  renderBlackoutList();
  renderBlackoutCalendar();
}

function renderBlackoutList() {
  var list = document.getElementById('blackout-list');
  var empty = document.getElementById('blackout-empty');

  if (!_blackoutDates.length) {
    list.innerHTML = '';
    empty.style.display = '';
    return;
  }

  empty.style.display = 'none';
  var html = '<table class="data-table"><thead><tr><th>Label</th><th>From</th><th>To</th><th></th></tr></thead><tbody>';

  _blackoutDates.forEach(function(row) {
    var from = formatBlackoutDate(row.date_from);
    var to = formatBlackoutDate(row.date_to);
    var isSingle = row.date_from === row.date_to;
    html += '<tr>';
    html += '<td><strong>' + escapeHtml(row.label || 'No label') + '</strong></td>';
    html += '<td>' + from + '</td>';
    html += '<td>' + (isSingle ? '—' : to) + '</td>';
    html += '<td style="text-align:right;"><button class="btn btn-outline btn-sm" style="color:var(--danger);border-color:var(--danger);" onclick="deleteBlackout(\'' + row.id + '\')">Remove</button></td>';
    html += '</tr>';
  });

  html += '</tbody></table>';
  list.innerHTML = html;
}

function formatBlackoutDate(dateStr) {
  if (!dateStr) return '';
  var d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function escapeHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function renderBlackoutCalendar() {
  var container = document.getElementById('blackout-calendar');
  var monthLabel = document.getElementById('blackout-month-label');

  var monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  monthLabel.textContent = monthNames[_blackoutCurrentMonth] + ' ' + _blackoutCurrentYear;

  // Build a set of blacked-out date strings for quick lookup
  var blockedDates = {};
  _blackoutDates.forEach(function(row) {
    var cur = new Date(row.date_from + 'T12:00:00');
    var end = new Date(row.date_to + 'T12:00:00');
    while (cur <= end) {
      var key = cur.getFullYear() + '-' + String(cur.getMonth()+1).padStart(2,'0') + '-' + String(cur.getDate()).padStart(2,'0');
      blockedDates[key] = true;
      cur.setDate(cur.getDate() + 1);
    }
  });

  var dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  var html = '';
  dayNames.forEach(function(d) { html += '<div class="day-header">' + d + '</div>'; });

  var firstDay = new Date(_blackoutCurrentYear, _blackoutCurrentMonth, 1).getDay();
  var daysInMonth = new Date(_blackoutCurrentYear, _blackoutCurrentMonth + 1, 0).getDate();
  var today = new Date();
  var todayStr = today.getFullYear() + '-' + String(today.getMonth()+1).padStart(2,'0') + '-' + String(today.getDate()).padStart(2,'0');

  for (var i = 0; i < firstDay; i++) {
    html += '<div class="day-cell empty"></div>';
  }

  for (var d = 1; d <= daysInMonth; d++) {
    var dateKey = _blackoutCurrentYear + '-' + String(_blackoutCurrentMonth+1).padStart(2,'0') + '-' + String(d).padStart(2,'0');
    var isBlocked = blockedDates[dateKey];
    var isToday = dateKey === todayStr;
    var cls = 'day-cell ' + (isBlocked ? 'blocked' : 'available');
    var style = isToday ? ' style="font-weight:700;box-shadow:inset 0 0 0 2px var(--primary);"' : '';
    html += '<div class="' + cls + '"' + style + '>' + d + '</div>';
  }

  container.innerHTML = html;
}

function blackoutPrevMonth() {
  _blackoutCurrentMonth--;
  if (_blackoutCurrentMonth < 0) { _blackoutCurrentMonth = 11; _blackoutCurrentYear--; }
  renderBlackoutCalendar();
}

function blackoutNextMonth() {
  _blackoutCurrentMonth++;
  if (_blackoutCurrentMonth > 11) { _blackoutCurrentMonth = 0; _blackoutCurrentYear++; }
  renderBlackoutCalendar();
}

function openBlackoutModal() {
  var today = new Date();
  var todayStr = today.getFullYear() + '-' + String(today.getMonth()+1).padStart(2,'0') + '-' + String(today.getDate()).padStart(2,'0');
  document.getElementById('blackout-from').value = todayStr;
  document.getElementById('blackout-to').value = todayStr;
  document.getElementById('blackout-label').value = '';
  document.getElementById('blackout-modal').style.display = 'flex';
}

function closeBlackoutModal() {
  document.getElementById('blackout-modal').style.display = 'none';
}

async function saveBlackoutDate() {
  var from = document.getElementById('blackout-from').value;
  var to = document.getElementById('blackout-to').value;
  var label = document.getElementById('blackout-label').value.trim();

  if (!from || !to) { toast('Please select a date range', 'error'); return; }
  if (to < from) { toast('End date must be on or after start date', 'error'); return; }

  var btn = document.getElementById('blackout-save-btn');
  btn.disabled = true;
  btn.textContent = 'Saving...';

  var result = await CC.dashboard.addBlackoutDate({ date_from: from, date_to: to, label: label });

  btn.disabled = false;
  btn.textContent = 'Save';

  if (result) {
    closeBlackoutModal();
    toast('Blackout dates saved', 'success');
    loadBlackoutDates();
  } else {
    toast('Failed to save — please try again', 'error');
  }
}

async function deleteBlackout(id) {
  if (!confirm('Remove this blackout period?')) return;
  await CC.dashboard.deleteBlackoutDate(id);
  toast('Blackout removed', 'success');
  loadBlackoutDates();
}

onPageLoad('blackout-dates', function() {
  loadBlackoutDates();
});
