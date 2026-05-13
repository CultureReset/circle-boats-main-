// ============================================
// Router — Sidebar navigation + section switching
// ============================================

let currentPage = 'overview';

function initRouter() {
  document.querySelectorAll('.nav-item[data-page]').forEach(item => {
    item.addEventListener('click', () => {
      navigateTo(item.dataset.page);
      // Close mobile sidebar
      document.querySelector('.sidebar').classList.remove('open');
    });
  });

  // Handle browser back/forward buttons
  window.addEventListener('popstate', (e) => {
    const page = (e.state && e.state.page) || window.location.hash.slice(1).split('?')[0] || 'overview';
    showPage(page);
  });

  window.addEventListener('hashchange', () => {
    const page = window.location.hash.slice(1).split('?')[0] || 'overview';
    showPage(page);
  });

  // Load initial page from hash
  const initial = window.location.hash.slice(1).split('?')[0] || 'overview';
  navigateTo(initial);
}

function navigateTo(page) {
  // Preserve ?biz= query param in the URL
  var search = window.location.search;
  window.history.pushState({ page: page }, '', window.location.pathname + search + '#' + page);
  showPage(page);
}

function showPage(page) {
  // Stop bookings polling when leaving the bookings page
  if (currentPage === 'bookings' && page !== 'bookings') {
    if (typeof stopBookingPolling === 'function') stopBookingPolling();
  }

  currentPage = page;

  // Update nav active state
  document.querySelectorAll('.nav-item[data-page]').forEach(item => {
    item.classList.toggle('active', item.dataset.page === page);
  });

  // Show/hide sections
  document.querySelectorAll('.page-section').forEach(section => {
    section.classList.toggle('active', section.id === 'page-' + page);
  });

  // Update topbar title
  const activeNav = document.querySelector(`.nav-item[data-page="${page}"]`);
  if (activeNav) {
    document.getElementById('topbar-title').textContent = activeNav.querySelector('span').textContent;
  }

  // Fire page load callback if exists
  const callback = pageCallbacks[page];
  if (callback) callback();
}

// Pages can register load callbacks
const pageCallbacks = {};

function onPageLoad(page, callback) {
  pageCallbacks[page] = callback;
}

// Show/hide nav items based on business type
function setupNavForType(type) {
  document.querySelectorAll('[data-biz-type]').forEach(el => {
    const types = el.dataset.bizType.split(',');
    el.style.display = types.includes(type) ? '' : 'none';
  });
}

// Toast notifications
function toast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => { el.remove(); }, 3500);
}

// Mobile sidebar toggle
function toggleSidebar() {
  document.querySelector('.sidebar').classList.toggle('open');
}

// Global HTML escape — prevents XSS when inserting user data into innerHTML
function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
