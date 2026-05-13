/**
 * Loyalty & Rewards - Complete Backend Integration
 * Manages loyalty program settings, members, and rewards
 */

import { requireAuth } from './shared/auth.js';
import { apiGet, apiPut, apiPost } from './shared/api.js';

// State
const state = {
  program: null,
  members: [],
  stats: null,
  hasUnsavedChanges: false
};

// =============================================
// Initialize
// =============================================

document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth()) return;

  await loadLoyaltyProgram();
  await loadStats();
  initializeEventListeners();
});

// =============================================
// Load Program Settings
// =============================================

async function loadLoyaltyProgram() {
  try {
    const response = await apiGet('/loyalty/program');
    state.program = response.data;

    if (state.program) {
      populateSettings(state.program);
    }

    console.log('✓ Loyalty program loaded');
  } catch (error) {
    console.error('Error loading loyalty program:', error);
    showToast('Failed to load loyalty program', 'error');
  }
}

function populateSettings(program) {
  // Program enabled toggle
  const enabledToggle = document.getElementById('programEnabledToggle');
  if (enabledToggle) {
    enabledToggle.checked = program.is_active;
  }

  // Points system
  const pointsPerDollar = document.querySelector('.settings-card input[type="number"]');
  if (pointsPerDollar && program.points_per_dollar) {
    pointsPerDollar.value = program.points_per_dollar;
  }

  // Display reviews on menu
  const displayReviewsToggle = document.querySelector('input[name="display_reviews_on_menu"]');
  if (displayReviewsToggle) {
    displayReviewsToggle.checked = program.display_reviews_on_menu !== false;
  }

  // Minimum reviews
  const minReviewsInput = document.querySelector('input[name="require_min_reviews"]');
  if (minReviewsInput) {
    minReviewsInput.value = program.require_min_reviews || 5;
  }

  // Moderate reviews
  const moderateToggle = document.querySelector('input[name="moderate_reviews"]');
  if (moderateToggle) {
    moderateToggle.checked = program.moderate_reviews || false;
  }
}

// =============================================
// Load Stats
// =============================================

async function loadStats() {
  try {
    const response = await apiGet('/loyalty/stats');
    state.stats = response.data;

    updateStatsDisplay(state.stats);

    console.log('✓ Loyalty stats loaded');
  } catch (error) {
    console.error('Error loading stats:', error);
  }
}

function updateStatsDisplay(stats) {
  // Total Members
  const totalMembersEl = document.querySelector('.stat-card:nth-child(1) .stat-value');
  if (totalMembersEl) {
    totalMembersEl.textContent = stats.total_members || 0;
  }

  // Active This Month
  const activeEl = document.querySelector('.stat-card:nth-child(2) .stat-value');
  if (activeEl) {
    activeEl.textContent = stats.active_this_month || 0;
  }

  // Participation rate
  const participationEl = document.querySelector('.stat-card:nth-child(2) .stat-change');
  if (participationEl && stats.total_members > 0) {
    const rate = Math.round((stats.active_this_month / stats.total_members) * 100);
    participationEl.textContent = `${rate}% participation`;
    participationEl.className = 'stat-change positive';
  }

  // Revenue from Members
  const revenueEl = document.querySelector('.stat-card:nth-child(4) .stat-value');
  if (revenueEl) {
    const revenue = stats.total_revenue || 0;
    revenueEl.textContent = `$${(revenue / 1000).toFixed(1)}K`;
  }
}

// =============================================
// Save Settings
// =============================================

async function saveAllSettings() {
  const saveBtn = document.getElementById('saveSettingsBtn');
  const originalHTML = saveBtn.innerHTML;

  try {
    // Disable button and show loading
    saveBtn.disabled = true;
    saveBtn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite;">
        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
      </svg>
      Saving...
    `;

    // Collect settings
    const settings = collectAllSettings();

    // Save to backend
    await apiPut('/loyalty/program', settings);

    showToast('Settings saved successfully!');
    state.hasUnsavedChanges = false;

  } catch (error) {
    console.error('Error saving settings:', error);
    showToast('Failed to save settings', 'error');
  } finally {
    // Restore button
    saveBtn.disabled = false;
    saveBtn.innerHTML = originalHTML;
    saveBtn.style.animation = '';
  }
}

function collectAllSettings() {
  const programEnabled = document.getElementById('programEnabledToggle')?.checked || false;

  // Points system
  const pointsInputs = document.querySelectorAll('.settings-card input[type="number"]');
  const pointsPerDollar = pointsInputs[0]?.value || 1;

  // Display settings
  const displayReviews = document.querySelector('input[name="display_reviews_on_menu"]')?.checked !== false;
  const minReviews = document.querySelector('input[name="require_min_reviews"]')?.value || 5;
  const moderateReviews = document.querySelector('input[name="moderate_reviews"]')?.checked || false;

  return {
    is_active: programEnabled,
    points_per_dollar: parseFloat(pointsPerDollar),
    display_reviews_on_menu: displayReviews,
    require_min_reviews: parseInt(minReviews),
    moderate_reviews: moderateReviews
  };
}

// =============================================
// Event Listeners
// =============================================

function initializeEventListeners() {
  // Save button
  const saveBtn = document.getElementById('saveSettingsBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', saveAllSettings);
  }

  // Reset button
  const resetBtn = document.querySelector('.save-actions .btn-outline');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (confirm('Reset all loyalty settings to defaults? This cannot be undone.')) {
        resetSettings();
      }
    });
  }

  // Program toggle with confirmation
  const programToggle = document.getElementById('programEnabledToggle');
  if (programToggle) {
    programToggle.addEventListener('change', (e) => {
      if (!e.target.checked) {
        if (!confirm('Disable loyalty program? Members will not be able to earn or redeem points.')) {
          e.target.checked = true;
          return;
        }
      }
      state.hasUnsavedChanges = true;
      updateSaveButton();
    });
  }

  // Track changes
  const container = document.querySelector('.loyalty-container');
  if (container) {
    container.addEventListener('input', () => {
      state.hasUnsavedChanges = true;
      updateSaveButton();
    });

    container.addEventListener('change', () => {
      state.hasUnsavedChanges = true;
      updateSaveButton();
    });
  }

  // Punch card toggle
  const punchCardToggle = document.getElementById('punchCardEnabled');
  if (punchCardToggle) {
    punchCardToggle.addEventListener('change', (e) => {
      const punchCardConfig = document.querySelector('.punch-card-config');
      if (punchCardConfig) {
        punchCardConfig.style.display = e.target.checked ? 'flex' : 'none';
      }
    });
  }

  // Unsaved changes warning
  window.addEventListener('beforeunload', (e) => {
    if (state.hasUnsavedChanges) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      if (state.hasUnsavedChanges) {
        saveAllSettings();
      }
    }
  });
}

function updateSaveButton() {
  const saveBtn = document.getElementById('saveSettingsBtn');
  if (saveBtn && state.hasUnsavedChanges) {
    saveBtn.style.animation = 'pulse 1s infinite';
  }
}

async function resetSettings() {
  try {
    // Reload default settings
    await loadLoyaltyProgram();
    showToast('Settings reset to defaults', 'warning');
    state.hasUnsavedChanges = false;
  } catch (error) {
    console.error('Error resetting settings:', error);
    showToast('Failed to reset settings', 'error');
  }
}

// =============================================
// Member Management
// =============================================

async function viewMembers() {
  try {
    const response = await apiGet('/loyalty/members?limit=100');
    state.members = response.data;

    console.log('Loyalty members loaded:', state.members.length);
    return state.members;
  } catch (error) {
    console.error('Error loading members:', error);
    showToast('Failed to load members', 'error');
    return [];
  }
}

async function searchMember(phoneOrName) {
  try {
    const response = await apiGet(`/loyalty/members?search=${encodeURIComponent(phoneOrName)}&limit=20`);
    return response.data;
  } catch (error) {
    console.error('Error searching member:', error);
    return [];
  }
}

// =============================================
// Toast Notifications
// =============================================

function showToast(message, type = 'success', duration = 3000) {
  const existingToast = document.querySelector('.toast-notification');
  if (existingToast) {
    existingToast.remove();
  }

  const toast = document.createElement('div');
  toast.className = 'toast-notification';
  toast.textContent = message;

  let bgColor = 'rgba(0, 0, 0, 0.9)';
  if (type === 'error') bgColor = 'rgba(239, 68, 68, 0.95)';
  if (type === 'warning') bgColor = 'rgba(245, 158, 11, 0.95)';

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

// =============================================
// CSS Animations
// =============================================

const style = document.createElement('style');
style.textContent = `
  @keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  @keyframes slideInUp {
    from {
      transform: translateY(20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
`;
document.head.appendChild(style);

// =============================================
// Export for global access
// =============================================

window.loyaltyRewards = {
  refresh: loadLoyaltyProgram,
  refreshStats: loadStats,
  save: saveAllSettings,
  viewMembers,
  searchMember
};

console.log('%c✓ Loyalty & Rewards Module Loaded', 'font-size: 14px; font-weight: bold; color: #4DA6FF;');
console.log('Keyboard shortcuts: Cmd/Ctrl+S (Save)');
