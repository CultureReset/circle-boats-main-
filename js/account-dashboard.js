// ============================================
// Account Dashboard JavaScript
// ============================================

// ============================================
// Initialize on Load
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  console.log('Account dashboard loaded');
  loadAccountData();
});

// ============================================
// Load Account Data
// ============================================

function loadAccountData() {
  // In production: fetch from API
  // For now, data is in HTML
  console.log('Account data loaded');
}

// ============================================
// Create New Profile
// ============================================

function createNewProfile() {
  console.log('Creating new profile...');

  showToast('Redirecting to profile setup...', 'info');

  // In production: redirect to onboarding
  setTimeout(() => {
    // window.location.href = '/onboarding';
    console.log('Would redirect to onboarding wizard');
  }, 1000);
}

// ============================================
// Open Dashboard
// ============================================

function openDashboard(handle) {
  console.log('Opening dashboard for:', handle);

  showToast('Opening dashboard...', 'info');

  // In production: redirect to specific business dashboard
  setTimeout(() => {
    // window.location.href = `/dashboard?profile=${handle}`;
    console.log(`Would redirect to dashboard for ${handle}`);
  }, 500);
}

// ============================================
// View Public Profile
// ============================================

function viewProfile(handle) {
  console.log('Viewing public profile:', handle);

  // Open in new tab
  // window.open(`/@${handle}`, '_blank');
  console.log(`Would open /@${handle} in new tab`);

  showToast('Opening public profile...', 'info');
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

console.log('%cAccount Dashboard Ready', 'font-size: 16px; font-weight: bold; color: #4DA6FF;');
console.log('Managing 3 active profiles');
