// ============================================
// Admin Dashboard JavaScript
// ============================================

let currentDateRange = 30;
let revenueData = [];

// ============================================
// Initialize on Load
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  initializeDateRangeSelector();
  loadDashboardData();
  drawRevenueChart();
});

// ============================================
// Date Range Selector
// ============================================

function initializeDateRangeSelector() {
  const dateButtons = document.querySelectorAll('.date-btn');

  dateButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const range = btn.dataset.range;

      // Update active state
      dateButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      currentDateRange = parseInt(range);
      loadDashboardData();
      drawRevenueChart();
    });
  });
}

// ============================================
// Load Dashboard Data
// ============================================

function loadDashboardData() {
  // In production: fetch from API
  // For now, generate sample data
  console.log('Loading dashboard data for', currentDateRange, 'days');

  generateRevenueData();
}

function generateRevenueData() {
  revenueData = [];
  const today = new Date();

  for (let i = currentDateRange - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    // Generate revenue with upward trend
    const baseRevenue = 500;
    const trendFactor = (currentDateRange - i) / currentDateRange;
    const randomFactor = Math.random() * 200;
    const revenue = baseRevenue + (trendFactor * 300) + randomFactor;

    revenueData.push({
      date: formatDate(date),
      revenue: Math.round(revenue)
    });
  }
}

function formatDate(date) {
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${month}/${day}`;
}

// ============================================
// Draw Revenue Chart
// ============================================

function drawRevenueChart() {
  const canvas = document.getElementById('revenueChart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;

  // Clear canvas
  ctx.clearRect(0, 0, width, height);

  // Chart dimensions
  const padding = 40;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  // Draw grid and axes
  ctx.strokeStyle = '#E5E7EB';
  ctx.lineWidth = 1;

  // Horizontal grid lines
  for (let i = 0; i <= 5; i++) {
    const y = padding + (chartHeight / 5) * i;
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(width - padding, y);
    ctx.stroke();
  }

  // Y-axis labels
  ctx.fillStyle = '#6B7280';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'right';

  const maxRevenue = Math.max(...revenueData.map(d => d.revenue));
  const roundedMax = Math.ceil(maxRevenue / 100) * 100;

  for (let i = 0; i <= 5; i++) {
    const value = roundedMax - (roundedMax / 5) * i;
    const y = padding + (chartHeight / 5) * i;
    ctx.fillText('$' + value.toLocaleString(), padding - 10, y + 4);
  }

  // X-axis labels (show every Nth date)
  ctx.textAlign = 'center';
  const labelInterval = Math.ceil(revenueData.length / 8);

  revenueData.forEach((data, index) => {
    if (index % labelInterval === 0 || index === revenueData.length - 1) {
      const x = padding + (index / (revenueData.length - 1)) * chartWidth;
      ctx.fillText(data.date, x, height - 15);
    }
  });

  // Draw revenue line
  ctx.beginPath();
  ctx.strokeStyle = '#4DA6FF';
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  revenueData.forEach((data, index) => {
    const x = padding + (index / (revenueData.length - 1)) * chartWidth;
    const y = padding + chartHeight - (data.revenue / roundedMax) * chartHeight;

    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });

  ctx.stroke();

  // Draw gradient fill
  const gradient = ctx.createLinearGradient(0, padding, 0, padding + chartHeight);
  gradient.addColorStop(0, 'rgba(77, 166, 255, 0.2)');
  gradient.addColorStop(1, 'rgba(77, 166, 255, 0)');

  ctx.lineTo(width - padding, padding + chartHeight);
  ctx.lineTo(padding, padding + chartHeight);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  // Draw data points
  ctx.fillStyle = '#4DA6FF';
  revenueData.forEach((data, index) => {
    const x = padding + (index / (revenueData.length - 1)) * chartWidth;
    const y = padding + chartHeight - (data.revenue / roundedMax) * chartHeight;

    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();

    // Draw white border around points
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.stroke();
  });
}

// ============================================
// Refresh Data
// ============================================

function refreshData() {
  console.log('Refreshing dashboard data...');

  showToast('Refreshing data...', 'info', 1500);

  // In production: fetch latest data from API
  setTimeout(() => {
    loadDashboardData();
    drawRevenueChart();
    showToast('Dashboard updated!', 'success');
  }, 1000);
}

// ============================================
// Toast Notifications
// ============================================

function showToast(message, type = 'info', duration = 3000) {
  const existingToast = document.querySelector('.toast-notification');
  if (existingToast) {
    existingToast.remove();
  }

  const toast = document.createElement('div');
  toast.className = 'toast-notification';
  toast.textContent = message;

  let bgColor = 'rgba(0, 0, 0, 0.9)';
  if (type === 'error') bgColor = 'rgba(239, 68, 68, 0.95)';
  if (type === 'success') bgColor = 'rgba(16, 185, 129, 0.95)';

  toast.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    background: ${bgColor};
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    z-index: 10000;
    animation: slideInUp 0.3s ease-out;
  `;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease-out';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ============================================
// Window Resize Handler
// ============================================

let resizeTimeout;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    drawRevenueChart();
  }, 250);
});

// ============================================
// Console Log
// ============================================

console.log('%cAdmin Dashboard Ready', 'font-size: 16px; font-weight: bold; color: #4DA6FF;');
console.log('Date range:', currentDateRange, 'days');
console.log('Total businesses: 247');
console.log('Monthly revenue: $18,450');
