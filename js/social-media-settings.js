/**
 * Social Media Settings - Connect Facebook & Instagram
 * Manages OAuth connections and feed display settings
 */

import { requireAuth } from './shared/auth.js';
import { apiGet, apiPut, apiPost, apiDelete } from './shared/api.js';

// State
const state = {
  connections: [],
  loading: false
};

// =============================================
// Initialize
// =============================================

document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth()) return;

  // Check for OAuth callback messages
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('social_media') === 'connected') {
    const pages = urlParams.get('pages');
    showToast(`Successfully connected ${pages} Facebook page(s)!`, 'success');
    // Clean URL
    window.history.replaceState({}, document.title, window.location.pathname);
  } else if (urlParams.get('error')) {
    showToast(`Connection failed: ${urlParams.get('error')}`, 'error');
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  await loadConnections();
  initializeEventListeners();
});

// =============================================
// Load Connections
// =============================================

async function loadConnections() {
  try {
    state.loading = true;
    showLoadingState();

    const response = await apiGet('/social-media/connections');
    state.connections = response.data || [];

    renderConnections();
    updateEmptyState();

    console.log('✓ Social media connections loaded:', state.connections.length);
  } catch (error) {
    console.error('Error loading connections:', error);
    showToast('Failed to load social media connections', 'error');
  } finally {
    state.loading = false;
  }
}

// =============================================
// Render UI
// =============================================

function renderConnections() {
  const container = document.getElementById('connectionsContainer');
  if (!container) return;

  if (state.connections.length === 0) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = state.connections.map(conn => `
    <div class="connection-card ${conn.display_on_profile ? 'active' : 'inactive'}">
      <div class="connection-header">
        <div class="connection-info">
          <div class="platform-icon ${conn.platform}">
            <i class="fab fa-${conn.platform}"></i>
          </div>
          <div class="connection-details">
            <h3>${conn.platform === 'facebook' ? conn.facebook_page_name : conn.instagram_username}</h3>
            <p class="connection-type">${conn.platform === 'facebook' ? 'Facebook Page' : 'Instagram Business'}</p>
            ${conn.last_sync ? `
              <p class="last-sync">
                Last synced: ${formatDate(conn.last_sync)}
                ${conn.last_sync_status === 'success' ?
                  '<span class="status-badge success">✓</span>' :
                  '<span class="status-badge error">✗</span>'
                }
              </p>
            ` : ''}
          </div>
        </div>
        <div class="connection-actions">
          <button class="btn-icon" onclick="syncConnection('${conn.id}')" title="Sync now">
            <i class="fas fa-sync-alt"></i>
          </button>
          <button class="btn-icon" onclick="disconnectAccount('${conn.id}')" title="Disconnect">
            <i class="fas fa-unlink"></i>
          </button>
        </div>
      </div>

      <div class="connection-stats">
        <div class="stat">
          <span class="stat-label">Posts Synced</span>
          <span class="stat-value">${conn.total_posts_synced || 0}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Auto Sync</span>
          <span class="stat-value">${conn.auto_sync ? 'Enabled' : 'Disabled'}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Sync Interval</span>
          <span class="stat-value">${conn.sync_interval_minutes || 30} min</span>
        </div>
      </div>

      <div class="connection-settings">
        <div class="setting-row">
          <label class="toggle-label">
            <input type="checkbox"
              ${conn.display_on_profile ? 'checked' : ''}
              onchange="toggleDisplayOnProfile('${conn.id}', this.checked)">
            <span class="toggle-slider"></span>
            <span class="toggle-text">Display posts on profile</span>
          </label>
        </div>

        <div class="setting-row">
          <label class="toggle-label">
            <input type="checkbox"
              ${conn.auto_sync ? 'checked' : ''}
              onchange="toggleAutoSync('${conn.id}', this.checked)">
            <span class="toggle-slider"></span>
            <span class="toggle-text">Automatically sync feed</span>
          </label>
        </div>
      </div>
    </div>
  `).join('');
}

function showLoadingState() {
  const container = document.getElementById('connectionsContainer');
  if (!container) return;

  container.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Loading connections...</p>
    </div>
  `;
}

function updateEmptyState() {
  const emptyState = document.getElementById('emptyState');
  const connectionsSection = document.getElementById('connectionsSection');

  if (!emptyState || !connectionsSection) return;

  if (state.connections.length === 0) {
    emptyState.style.display = 'flex';
    connectionsSection.style.display = 'none';
  } else {
    emptyState.style.display = 'none';
    connectionsSection.style.display = 'block';
  }
}

// =============================================
// Actions
// =============================================

async function connectFacebook() {
  try {
    const response = await apiGet('/social-media/connect/facebook');

    if (response.success && response.data.auth_url) {
      // Open OAuth popup
      const width = 600;
      const height = 700;
      const left = (window.screen.width - width) / 2;
      const top = (window.screen.height - height) / 2;

      const popup = window.open(
        response.data.auth_url,
        'Facebook Login',
        `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
      );

      // Poll for popup close
      const pollTimer = setInterval(() => {
        if (popup.closed) {
          clearInterval(pollTimer);
          // Reload connections after OAuth
          setTimeout(() => loadConnections(), 1000);
        }
      }, 500);
    }
  } catch (error) {
    console.error('Error initiating Facebook connection:', error);
    showToast('Failed to connect Facebook', 'error');
  }
}

async function syncConnection(connectionId) {
  try {
    const btn = event.target.closest('.btn-icon');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    await apiPost(`/social-media/connections/${connectionId}/sync`);
    showToast('Feed sync started', 'success');

    // Reload after a delay to show updated sync time
    setTimeout(() => loadConnections(), 3000);
  } catch (error) {
    console.error('Error syncing connection:', error);
    showToast('Failed to sync feed', 'error');
  }
}

async function disconnectAccount(connectionId) {
  if (!confirm('Are you sure you want to disconnect this account? Your posts will no longer be displayed on your profile.')) {
    return;
  }

  try {
    await apiDelete(`/social-media/connections/${connectionId}`);
    showToast('Account disconnected', 'success');
    await loadConnections();
  } catch (error) {
    console.error('Error disconnecting account:', error);
    showToast('Failed to disconnect account', 'error');
  }
}

async function toggleDisplayOnProfile(connectionId, enabled) {
  try {
    await apiPut(`/social-media/connections/${connectionId}`, {
      display_on_profile: enabled
    });

    showToast(enabled ? 'Posts will now be displayed' : 'Posts hidden from profile', 'success');
  } catch (error) {
    console.error('Error updating display setting:', error);
    showToast('Failed to update setting', 'error');
    // Reload to reset the toggle
    loadConnections();
  }
}

async function toggleAutoSync(connectionId, enabled) {
  try {
    await apiPut(`/social-media/connections/${connectionId}`, {
      auto_sync: enabled
    });

    showToast(enabled ? 'Auto sync enabled' : 'Auto sync disabled', 'success');
  } catch (error) {
    console.error('Error updating auto sync:', error);
    showToast('Failed to update setting', 'error');
    loadConnections();
  }
}

// =============================================
// Event Listeners
// =============================================

function initializeEventListeners() {
  // Connect Facebook button
  const connectBtn = document.getElementById('connectFacebookBtn');
  if (connectBtn) {
    connectBtn.addEventListener('click', connectFacebook);
  }

  // Refresh button
  const refreshBtn = document.getElementById('refreshConnectionsBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      refreshBtn.disabled = true;
      loadConnections().finally(() => {
        refreshBtn.disabled = false;
      });
    });
  }
}

// =============================================
// Utilities
// =============================================

function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

  return date.toLocaleDateString();
}

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
  if (type === 'success') bgColor = 'rgba(34, 197, 94, 0.95)';

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

  .spinner {
    border: 4px solid #e2e8f0;
    border-top-color: #667eea;
    border-radius: 50%;
    width: 40px;
    height: 40px;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);

// =============================================
// Export for global access
// =============================================

window.socialMediaSettings = {
  connect: connectFacebook,
  refresh: loadConnections,
  sync: syncConnection,
  disconnect: disconnectAccount
};

// Make functions globally accessible for inline onclick handlers
window.syncConnection = syncConnection;
window.disconnectAccount = disconnectAccount;
window.toggleDisplayOnProfile = toggleDisplayOnProfile;
window.toggleAutoSync = toggleAutoSync;

console.log('%c✓ Social Media Settings Module Loaded', 'font-size: 14px; font-weight: bold; color: #667eea;');
