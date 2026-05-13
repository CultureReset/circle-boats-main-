// ============================================
// Analytics — Traffic, Conversions, Revenue
// ============================================

var _analyticsData = {
  todayStats: { visitors: 0, pageviews: 0, conversions: 0, revenue: 0 },
  weekStats: { visitors: 0, pageviews: 0, conversions: 0, revenue: 0 },
  monthStats: { visitors: 0, pageviews: 0, conversions: 0, revenue: 0 },
  topPages: [],
  trafficSources: [],
  conversionFunnel: { views: 0, clicks: 0, bookings: 0, rate: 0 },
  revenueChart: []
};

async function loadAnalytics() {
  var apiData = await CC.dashboard.getAnalytics();
  if (apiData) {
    _analyticsData.todayStats = apiData.today || _analyticsData.todayStats;
    _analyticsData.weekStats = apiData.week || _analyticsData.weekStats;
    _analyticsData.monthStats = apiData.month || _analyticsData.monthStats;
    _analyticsData.topPages = apiData.topPages || [];
    _analyticsData.trafficSources = apiData.trafficSources || [];
    _analyticsData.conversionFunnel = apiData.conversionFunnel || _analyticsData.conversionFunnel;
    _analyticsData.bookingFunnel = apiData.bookingFunnel || null;
    _analyticsData.deviceBreakdown = apiData.deviceBreakdown || [];
    _analyticsData.revenueChart = apiData.revenueChart || [];
  }

  renderAnalyticsDashboard();
  renderTopPages();
  renderTrafficSources();
  renderConversionFunnel();
  renderBookingFunnelSteps();
  renderDeviceBreakdown();
  renderRevenueChart();
}

function renderAnalyticsDashboard() {
  // Update overview stats
  var stats = _analyticsData.todayStats;
  updateStatCard('analytics-today-visitors', stats.visitors || 0);
  updateStatCard('analytics-today-pageviews', stats.pageviews || 0);
  updateStatCard('analytics-today-conversions', stats.conversions || 0);
  updateStatCard('analytics-today-revenue', '$' + (stats.revenue || 0).toFixed(2));

  // Update week/month stats
  updateStatCard('analytics-week-visitors', _analyticsData.weekStats.visitors || 0);
  updateStatCard('analytics-week-revenue', '$' + (_analyticsData.weekStats.revenue || 0).toFixed(2));
  updateStatCard('analytics-month-visitors', _analyticsData.monthStats.visitors || 0);
  updateStatCard('analytics-month-revenue', '$' + (_analyticsData.monthStats.revenue || 0).toFixed(2));
}

function updateStatCard(id, value) {
  var el = document.getElementById(id);
  if (el) el.textContent = value;
}

function renderTopPages() {
  var container = document.getElementById('top-pages-list');
  if (!container) return;

  if (_analyticsData.topPages.length === 0) {
    container.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:20px;">No page data yet</p>';
    return;
  }

  var html = '<div class="table-wrap"><table>';
  html += '<thead><tr><th>Page</th><th>Views</th><th>Avg. Duration</th><th>Bounce Rate</th></tr></thead><tbody>';

  _analyticsData.topPages.forEach(function(page) {
    html += '<tr>';
    html += '<td><strong>' + escHtml(page.path) + '</strong></td>';
    html += '<td>' + (page.views || 0) + '</td>';
    html += '<td>' + formatDuration(page.avgDuration || 0) + '</td>';
    html += '<td>' + (page.bounceRate || 0).toFixed(1) + '%</td>';
    html += '</tr>';
  });

  html += '</tbody></table></div>';
  container.innerHTML = html;
}

function renderTrafficSources() {
  var container = document.getElementById('traffic-sources-list');
  if (!container) return;

  if (_analyticsData.trafficSources.length === 0) {
    container.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:20px;">No traffic source data yet</p>';
    return;
  }

  var html = '<div class="table-wrap"><table>';
  html += '<thead><tr><th>Source</th><th>Medium</th><th>Visitors</th><th>Sessions</th><th>Conversions</th><th>Revenue</th></tr></thead><tbody>';

  _analyticsData.trafficSources.forEach(function(source) {
    html += '<tr>';
    html += '<td><strong>' + escHtml(source.source || 'direct') + '</strong></td>';
    html += '<td style="color:var(--text-muted);">' + escHtml(source.medium || 'none') + '</td>';
    html += '<td>' + (source.visitors || 0) + '</td>';
    html += '<td>' + (source.sessions || 0) + '</td>';
    html += '<td>' + (source.conversions || 0) + '</td>';
    html += '<td>$' + (source.revenue || 0).toFixed(2) + '</td>';
    html += '</tr>';
  });

  html += '</tbody></table></div>';
  container.innerHTML = html;
}

function renderConversionFunnel() {
  var container = document.getElementById('conversion-funnel');
  if (!container) return;

  var funnel = _analyticsData.conversionFunnel;
  var viewsToClicks = funnel.clicks && funnel.views ? ((funnel.clicks / funnel.views) * 100).toFixed(1) : 0;
  var clicksToBookings = funnel.bookings && funnel.clicks ? ((funnel.bookings / funnel.clicks) * 100).toFixed(1) : 0;
  var overallRate = funnel.bookings && funnel.views ? ((funnel.bookings / funnel.views) * 100).toFixed(1) : 0;

  var html = '<div style="display:flex;flex-direction:column;gap:16px;">';

  // Views
  html += '<div class="funnel-step">';
  html += '<div class="funnel-label">Website Visitors</div>';
  html += '<div class="funnel-bar" style="width:100%;background:var(--primary);">';
  html += '<span>' + (funnel.views || 0) + '</span>';
  html += '</div></div>';

  // Clicks
  html += '<div class="funnel-step">';
  html += '<div class="funnel-label">Booking Page Clicks <span style="color:var(--success);margin-left:8px;">' + viewsToClicks + '%</span></div>';
  html += '<div class="funnel-bar" style="width:' + Math.min(viewsToClicks, 100) + '%;background:var(--info);">';
  html += '<span>' + (funnel.clicks || 0) + '</span>';
  html += '</div></div>';

  // Bookings
  html += '<div class="funnel-step">';
  html += '<div class="funnel-label">Completed Bookings <span style="color:var(--success);margin-left:8px;">' + clicksToBookings + '%</span></div>';
  html += '<div class="funnel-bar" style="width:' + Math.min(clicksToBookings, 100) + '%;background:var(--success);">';
  html += '<span>' + (funnel.bookings || 0) + '</span>';
  html += '</div></div>';

  html += '</div>';

  html += '<div style="margin-top:24px;padding:16px;background:var(--card-bg);border:1px solid var(--card-border);border-radius:var(--radius);text-align:center;">';
  html += '<div style="font-size:12px;color:var(--text-muted);margin-bottom:4px;">Overall Conversion Rate</div>';
  html += '<div style="font-size:32px;font-weight:700;color:var(--success);">' + overallRate + '%</div>';
  html += '</div>';

  container.innerHTML = html;
}

function renderRevenueChart() {
  var container = document.getElementById('revenue-chart');
  if (!container) return;

  if (_analyticsData.revenueChart.length === 0) {
    container.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:40px;">No revenue data yet</p>';
    return;
  }

  var maxRevenue = Math.max.apply(null, _analyticsData.revenueChart.map(function(d) { return d.revenue || 0; }));
  if (maxRevenue === 0) maxRevenue = 1;

  var html = '<div style="display:flex;align-items:flex-end;gap:8px;height:200px;">';

  _analyticsData.revenueChart.forEach(function(day) {
    var height = ((day.revenue || 0) / maxRevenue) * 100;
    html += '<div style="flex:1;display:flex;flex-direction:column;align-items:center;">';
    html += '<div style="width:100%;height:' + height + '%;background:var(--success);border-radius:4px 4px 0 0;min-height:2px;" title="$' + (day.revenue || 0).toFixed(2) + '"></div>';
    html += '<div style="font-size:10px;color:var(--text-muted);margin-top:4px;writing-mode:vertical-rl;transform:rotate(180deg);">' + formatShortDate(day.date) + '</div>';
    html += '</div>';
  });

  html += '</div>';
  container.innerHTML = html;
}

function formatDuration(seconds) {
  if (!seconds) return '0s';
  if (seconds < 60) return seconds + 's';
  var minutes = Math.floor(seconds / 60);
  var secs = seconds % 60;
  return minutes + 'm ' + secs + 's';
}

function formatShortDate(dateStr) {
  if (!dateStr) return '';
  var d = new Date(dateStr);
  return (d.getMonth() + 1) + '/' + d.getDate();
}

function renderBookingFunnelSteps() {
  var container = document.getElementById('booking-funnel-steps');
  if (!container) return;

  var f = _analyticsData.bookingFunnel;
  if (!f || f.opened === 0) {
    container.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:20px;">No booking funnel data yet</p>';
    return;
  }

  var steps = [
    { label: 'Booking Opened',     count: f.opened,    color: '#00ada8' },
    { label: 'Boat & Time',        count: f.step2,     color: '#3b82f6' },
    { label: 'Extras / Add-ons',   count: f.step3,     color: '#8b5cf6' },
    { label: 'Checkout Reached',   count: f.step4,     color: '#f59e0b' },
    { label: 'Booking Completed',  count: f.completed, color: '#22c55e' }
  ];

  var html = '<div style="display:flex;flex-direction:column;gap:10px;">';
  steps.forEach(function(s, i) {
    var pct = f.opened > 0 ? Math.round((s.count / f.opened) * 100) : 0;
    var dropPct = i > 0 && steps[i-1].count > 0 ? Math.round(((steps[i-1].count - s.count) / steps[i-1].count) * 100) : null;
    html += '<div>';
    html += '<div style="display:flex;justify-content:space-between;margin-bottom:5px;">';
    html += '<span style="font-size:13px;font-weight:600;">' + s.label + '</span>';
    html += '<span style="font-size:13px;">' + s.count + ' <span style="color:var(--text-muted);font-size:11px;">(' + pct + '%)</span>';
    if (dropPct !== null && dropPct > 0) html += ' <span style="color:#ef4444;font-size:11px;">−' + dropPct + '% dropped</span>';
    html += '</span></div>';
    html += '<div style="height:28px;background:var(--bg);border-radius:6px;overflow:hidden;">';
    html += '<div style="height:100%;width:' + Math.max(pct, 2) + '%;background:' + s.color + ';border-radius:6px;display:flex;align-items:center;padding-left:8px;"></div>';
    html += '</div></div>';
  });

  if (f.abandoned > 0) {
    html += '<div style="margin-top:8px;padding:10px 14px;background:rgba(239,68,68,0.07);border:1px solid rgba(239,68,68,0.15);border-radius:var(--radius);font-size:13px;">';
    html += '<strong style="color:#ef4444;">' + f.abandoned + ' abandoned</strong> — opened booking but did not complete';
    html += '</div>';
  }

  html += '</div>';
  container.innerHTML = html;
}

function renderDeviceBreakdown() {
  var container = document.getElementById('device-breakdown-chart');
  if (!container) return;

  var devices = _analyticsData.deviceBreakdown || [];
  if (devices.length === 0) {
    container.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:20px;">No device data yet</p>';
    return;
  }

  var total = devices.reduce(function(s, d) { return s + d.count; }, 0);
  var colors = { mobile: '#00ada8', desktop: '#3b82f6', tablet: '#8b5cf6', unknown: '#94a3b8' };
  var icons  = { mobile: '📱', desktop: '💻', tablet: '📟', unknown: '❓' };

  var html = '<div style="display:flex;flex-direction:column;gap:10px;">';
  devices.forEach(function(d) {
    var pct = total > 0 ? Math.round((d.count / total) * 100) : 0;
    var color = colors[d.device] || '#94a3b8';
    html += '<div style="display:flex;align-items:center;gap:12px;">';
    html += '<span style="font-size:18px;width:24px;">' + (icons[d.device] || '❓') + '</span>';
    html += '<div style="flex:1;">';
    html += '<div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span style="font-size:13px;font-weight:600;text-transform:capitalize;">' + d.device + '</span><span style="font-size:13px;">' + d.count + ' <span style="color:var(--text-muted);">(' + pct + '%)</span></span></div>';
    html += '<div style="height:8px;background:var(--bg);border-radius:4px;"><div style="height:100%;width:' + pct + '%;background:' + color + ';border-radius:4px;"></div></div>';
    html += '</div></div>';
  });
  html += '</div>';
  container.innerHTML = html;
}

function exportAnalytics() {
  var data = {
    overview: {
      today: _analyticsData.todayStats,
      week: _analyticsData.weekStats,
      month: _analyticsData.monthStats
    },
    topPages: _analyticsData.topPages,
    trafficSources: _analyticsData.trafficSources,
    conversionFunnel: _analyticsData.conversionFunnel,
    revenueChart: _analyticsData.revenueChart,
    exportedAt: new Date().toISOString()
  };

  var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'analytics-export-' + new Date().toISOString().split('T')[0] + '.json';
  a.click();
  URL.revokeObjectURL(url);

  toast('Analytics exported');
}

function changeAnalyticsPeriod(period) {
  // period: 'today', 'week', 'month', 'year'
  document.querySelectorAll('.period-btn').forEach(function(btn) {
    btn.classList.remove('active');
  });
  event.target.classList.add('active');

  // Reload analytics with new period
  loadAnalytics();
}

onPageLoad('analytics', loadAnalytics);
