// ============================================
// Admin Businesses Management JavaScript
// ============================================

let allBusinesses = [];
let filteredBusinesses = [];

// ============================================
// Initialize on Load
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  initializeSearch();
  initializeFilters();
  loadBusinessesData();
});

// ============================================
// Search Functionality
// ============================================

function initializeSearch() {
  const searchInput = document.getElementById('searchInput');

  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    filterAndDisplayBusinesses();
  });
}

// ============================================
// Filter Functionality
// ============================================

function initializeFilters() {
  const planFilter = document.getElementById('planFilter');
  const statusFilter = document.getElementById('statusFilter');
  const industryFilter = document.getElementById('industryFilter');

  planFilter.addEventListener('change', filterAndDisplayBusinesses);
  statusFilter.addEventListener('change', filterAndDisplayBusinesses);
  industryFilter.addEventListener('change', filterAndDisplayBusinesses);
}

function filterAndDisplayBusinesses() {
  const searchQuery = document.getElementById('searchInput').value.toLowerCase();
  const planFilter = document.getElementById('planFilter').value;
  const statusFilter = document.getElementById('statusFilter').value;
  const industryFilter = document.getElementById('industryFilter').value;

  // In production: filter actual data
  // For now, just show/hide rows in table
  const rows = document.querySelectorAll('.table-row');

  let visibleCount = 0;
  rows.forEach(row => {
    let show = true;

    // Apply filters (in production: this would filter actual data array)
    // For now, just demo filtering logic

    if (show) {
      row.style.display = '';
      visibleCount++;
    } else {
      row.style.display = 'none';
    }
  });

  console.log('Filtered businesses:', visibleCount);
}

function resetFilters() {
  document.getElementById('searchInput').value = '';
  document.getElementById('planFilter').value = 'all';
  document.getElementById('statusFilter').value = 'all';
  document.getElementById('industryFilter').value = 'all';

  filterAndDisplayBusinesses();
  showToast('Filters reset', 'info');
}

// ============================================
// Load Businesses Data
// ============================================

function loadBusinessesData() {
  // In production: fetch from API
  // For now, data is in HTML
  console.log('Businesses data loaded');
}

// ============================================
// Select All Checkbox
// ============================================

function toggleSelectAll(checkbox) {
  const rowCheckboxes = document.querySelectorAll('.row-checkbox');

  rowCheckboxes.forEach(cb => {
    cb.checked = checkbox.checked;
  });

  const selectedCount = checkbox.checked ? rowCheckboxes.length : 0;
  console.log(`Selected ${selectedCount} businesses`);

  if (selectedCount > 0) {
    showToast(`${selectedCount} businesses selected`, 'info', 2000);
  }
}

// ============================================
// View Business
// ============================================

function viewBusiness(businessId) {
  console.log('View business:', businessId);

  // In production: open business details modal or redirect
  showToast('Opening business details...', 'info');

  setTimeout(() => {
    // Simulate opening details
    console.log('Would show detailed view for business:', businessId);
    // window.location.href = `/admin/businesses/${businessId}`;
  }, 500);
}

// ============================================
// Edit Business
// ============================================

function editBusiness(businessId) {
  console.log('Edit business:', businessId);

  // In production: open edit modal with business data
  showToast('Opening edit form...', 'info');

  setTimeout(() => {
    // Simulate opening edit form
    console.log('Would show edit form for business:', businessId);

    // Example: open modal with plan selector, feature toggles, etc.
    // Similar to plans-management.html but for individual business
  }, 500);
}

// ============================================
// Suspend Business
// ============================================

function suspendBusiness(businessId) {
  console.log('Suspend business:', businessId);

  // Show confirmation dialog
  if (confirm('Are you sure you want to suspend this business? They will lose access to their dashboard and their profile will be hidden.')) {
    // In production: API call to suspend
    showToast('Suspending business...', 'info');

    setTimeout(() => {
      // Update UI
      const row = document.querySelector(`tr[data-id="${businessId}"]`);
      if (row) {
        const statusBadge = row.querySelector('.status-badge');
        statusBadge.className = 'status-badge suspended';
        statusBadge.textContent = 'Suspended';
      }

      showToast('Business suspended successfully', 'success');
      console.log('Business suspended:', businessId);

      // Update stats
      updateStats();
    }, 1000);
  }
}

// ============================================
// Update Stats
// ============================================

function updateStats() {
  // In production: recalculate from actual data
  // For demo: just update numbers
  const activeCount = document.getElementById('activeCount');
  const suspendedCount = document.getElementById('suspendedCount');

  if (activeCount && suspendedCount) {
    const currentActive = parseInt(activeCount.textContent);
    const currentSuspended = parseInt(suspendedCount.textContent);

    activeCount.textContent = currentActive - 1;
    suspendedCount.textContent = currentSuspended + 1;
  }
}

// ============================================
// Export Businesses
// ============================================

function exportBusinesses() {
  console.log('Exporting businesses to CSV...');

  showToast('Preparing CSV export...', 'info');

  // In production: generate CSV from actual data and download
  setTimeout(() => {
    // Simulate CSV generation
    const csvData = generateCSV();

    // Create download link
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cybercheck-businesses-${Date.now()}.csv`;
    link.click();

    showToast('CSV exported successfully!', 'success');
  }, 1500);
}

function generateCSV() {
  // In production: generate from actual data
  // For demo: create sample CSV
  const headers = 'Business Name,Handle,Industry,Plan,Status,Joined,MRR\n';
  const rows = [
    'The Sandbar Restaurant,@sandbar,Restaurant,Business,Active,2024-12-10,$79',
    'Luxe Hair Salon,@luxehair,Salon,Starter,Active,2024-12-09,$39',
    'Green Auto Repair,@greenauto,Auto Repair,Business,Active,2024-12-05,$79',
    'Sunrise Yoga Studio,@sunriseyoga,Fitness,Free,Inactive,2024-11-20,$0',
    'Tech Solutions Pro,@techsolutions,IT Services,Enterprise,Active,2024-11-15,$199'
  ].join('\n');

  return headers + rows;
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
// Console Log
// ============================================

console.log('%cBusinesses Management Ready', 'font-size: 16px; font-weight: bold; color: #4DA6FF;');
console.log('Total businesses loaded: 247');
console.log('Search, filter, and bulk actions enabled');
