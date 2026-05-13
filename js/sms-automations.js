// ============================================
// CyberCheck - SMS & Automations JavaScript
// ============================================

import { requireAuth } from './shared/auth.js';
import { apiGet, apiPost, apiPut, apiDelete } from './shared/api.js';

// Number type: 'shared' or 'dedicated'
// In production, this comes from user's plan/profile
let numberType = 'shared'; // Admin controls this

// ============================================
// Initialize on Load
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth()) return;

  initializeNumberDisplay();
  initializeTabs();
  initializeModals();
  initializeToggles();

  await Promise.all([
    loadSMSConfig(),
    loadCampaigns(),
    loadAutomations()
  ]);
});

// ============================================
// Phone Number Display
// ============================================

function initializeNumberDisplay() {
  // In production: fetch from API
  // const profile = await fetch('/api/profile/sms-settings');
  // numberType = profile.phoneNumberType;

  updateNumberDisplay();
}

function updateNumberDisplay() {
  const numberTypeBadge = document.getElementById('numberTypeBadge');
  const numberTypeText = document.getElementById('numberType');
  const upgradeBanner = document.getElementById('upgradeBanner');
  const dedicatedInfo = document.getElementById('dedicatedInfo');

  if (numberType === 'dedicated') {
    // User has dedicated number (premium feature)
    if (numberTypeBadge) {
      numberTypeBadge.className = 'number-type-badge dedicated';
      numberTypeBadge.innerHTML = `
        <span class="badge-icon">⭐</span>
        <span class="badge-text">Dedicated Number</span>
      `;
    }

    if (numberTypeText) {
      numberTypeText.textContent = 'Private Twilio Number (Dedicated)';
    }

    if (upgradeBanner) upgradeBanner.style.display = 'none';
    if (dedicatedInfo) dedicatedInfo.style.display = 'flex';
  } else {
    // User has shared number (default)
    if (numberTypeBadge) {
      numberTypeBadge.className = 'number-type-badge shared';
      numberTypeBadge.innerHTML = `
        <span class="badge-icon">🌐</span>
        <span class="badge-text">Shared Number</span>
      `;
    }

    if (numberTypeText) {
      numberTypeText.textContent = 'Universal CyberCheck Number (Shared)';
    }

    if (upgradeBanner) upgradeBanner.style.display = 'flex';
    if (dedicatedInfo) dedicatedInfo.style.display = 'none';
  }

  console.log('Number type:', numberType);
}

// Function to switch number type (admin controlled)
function setNumberType(type) {
  numberType = type;
  updateNumberDisplay();
  showToast(`Switched to ${type} number`);
}

// ============================================
// Tab Switching
// ============================================

function initializeTabs() {
  const tabButtons = document.querySelectorAll('.sms-tab');
  const tabPanes = document.querySelectorAll('.tab-pane');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.dataset.tab;

      // Update active states
      tabButtons.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      document.getElementById(`${tabName}-tab`).classList.add('active');
    });
  });
}

// ============================================
// Modals
// ============================================

function initializeModals() {
  // New Campaign Modal
  const newCampaignBtn = document.getElementById('newCampaignBtn');
  const closeCampaignModal = document.getElementById('closeCampaignModal');
  const cancelCampaignBtn = document.getElementById('cancelCampaignBtn');
  const campaignForm = document.getElementById('campaignForm');
  const messageTextarea = campaignForm?.querySelector('textarea');
  const messageCount = document.getElementById('messageCount');

  if (newCampaignBtn) {
    newCampaignBtn.addEventListener('click', () => openModal('campaignModal'));
  }

  if (closeCampaignModal) {
    closeCampaignModal.addEventListener('click', () => closeModal('campaignModal'));
  }

  if (cancelCampaignBtn) {
    cancelCampaignBtn.addEventListener('click', () => closeModal('campaignModal'));
  }

  if (campaignForm) {
    campaignForm.addEventListener('submit', (e) => {
      e.preventDefault();
      createCampaign();
    });
  }

  // Character counter
  if (messageTextarea && messageCount) {
    messageTextarea.addEventListener('input', () => {
      const count = messageTextarea.value.length;
      messageCount.textContent = count;

      if (count > 160) {
        messageCount.style.color = 'rgb(239, 68, 68)';
      } else {
        messageCount.style.color = '';
      }
    });
  }

  // Close on overlay click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      const modal = e.target.closest('.modal');
      if (modal) {
        closeModal(modal.id);
      }
    });
  });
}

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

async function createCampaign() {
  const form = document.getElementById('campaignForm');

  const name = form.querySelector('input[type="text"]').value.trim();
  const message = form.querySelector('textarea').value.trim();
  const recipient_type = form.querySelector('select').value;
  const send_type = form.querySelectorAll('select')[1].value;
  const scheduled_for = form.querySelector('input[type="datetime-local"]')?.value;

  if (!name || !message || !recipient_type) {
    showToast('Please fill in all required fields');
    return;
  }

  const campaignData = {
    name,
    message,
    recipient_type,
    send_type,
    scheduled_for: scheduled_for || null
  };

  try {
    await apiPost('/sms/campaigns', campaignData);
    showToast('Campaign created successfully!');
    closeModal('campaignModal');
    form.reset();
    await loadCampaigns();
  } catch (error) {
    console.error('Failed to create campaign:', error);
    showToast('Failed to create campaign: ' + error.message);
  }
}

async function editCampaign(id) {
  showToast('Edit campaign feature coming soon');
}

async function duplicateCampaign(id) {
  try {
    await apiPost(`/sms/campaigns/${id}/duplicate`);
    showToast('Campaign duplicated successfully!');
    await loadCampaigns();
  } catch (error) {
    console.error('Failed to duplicate campaign:', error);
    showToast('Failed to duplicate campaign');
  }
}

async function cancelCampaign(id) {
  if (!confirm('Cancel this scheduled campaign?')) return;

  try {
    await apiPost(`/sms/campaigns/${id}/cancel`);
    showToast('Campaign cancelled');
    await loadCampaigns();
  } catch (error) {
    console.error('Failed to cancel campaign:', error);
    showToast('Failed to cancel campaign');
  }
}

async function deleteCampaign(id) {
  if (!confirm('Delete this campaign?')) return;

  try {
    await apiDelete(`/sms/campaigns/${id}`);
    showToast('Campaign deleted');
    await loadCampaigns();
  } catch (error) {
    console.error('Failed to delete campaign:', error);
    showToast('Failed to delete campaign');
  }
}

async function toggleAutomation(id, enabled) {
  try {
    await apiPut(`/sms/automations/${id}/toggle`, { enabled });
    showToast(`Automation ${enabled ? 'enabled' : 'disabled'}`);
    await loadAutomations();
  } catch (error) {
    console.error('Failed to toggle automation:', error);
    showToast('Failed to toggle automation');
  }
}

async function editAutomation(id) {
  showToast('Edit automation feature coming soon');
}

async function deleteAutomation(id) {
  if (!confirm('Delete this automation?')) return;

  try {
    await apiDelete(`/sms/automations/${id}`);
    showToast('Automation deleted');
    await loadAutomations();
  } catch (error) {
    console.error('Failed to delete automation:', error);
    showToast('Failed to delete automation');
  }
}

// Make functions global for onclick handlers
window.editCampaign = editCampaign;
window.duplicateCampaign = duplicateCampaign;
window.cancelCampaign = cancelCampaign;
window.deleteCampaign = deleteCampaign;
window.toggleAutomation = toggleAutomation;
window.editAutomation = editAutomation;
window.deleteAutomation = deleteAutomation;

// ============================================
// Toggle Switches (Automations)
// ============================================

function initializeToggles() {
  document.querySelectorAll('.automation-card .toggle-switch input').forEach(toggle => {
    toggle.addEventListener('change', (e) => {
      const automationCard = e.target.closest('.automation-card');
      const automationName = automationCard.querySelector('h3').textContent;
      const isEnabled = e.target.checked;

      console.log(`Automation "${automationName}" ${isEnabled ? 'enabled' : 'disabled'}`);

      // In production: API call
      // await fetch(`/api/sms/automations/${automationId}`, {
      //   method: 'PATCH',
      //   body: JSON.stringify({ enabled: isEnabled })
      // });

      showToast(`${automationName} ${isEnabled ? 'enabled' : 'disabled'}`);
    });
  });
}

// ============================================
// Campaign Actions
// ============================================

document.addEventListener('click', (e) => {
  const actionBtn = e.target.closest('.action-btn');

  if (!actionBtn) return;

  const campaignCard = actionBtn.closest('.campaign-card');
  const automationCard = actionBtn.closest('.automation-card');

  const btnText = actionBtn.textContent.trim();

  if (btnText === 'View Details') {
    showToast('Campaign details coming soon');
  } else if (btnText === 'Duplicate') {
    showToast('Campaign duplicated');
  } else if (btnText === 'Edit') {
    showToast('Edit mode coming soon');
  } else if (btnText === 'Cancel') {
    if (confirm('Cancel this scheduled campaign?')) {
      if (campaignCard) {
        campaignCard.remove();
        showToast('Campaign cancelled');
      }
    }
  } else if (btnText === 'Delete') {
    if (confirm('Delete this draft campaign?')) {
      if (campaignCard) {
        campaignCard.remove();
        showToast('Draft deleted');
      }
    }
  } else if (btnText === 'Continue Editing') {
    showToast('Opening editor...');
  } else if (btnText === 'View Logs') {
    showToast('Viewing automation logs...');
  } else if (btnText === 'Enable') {
    if (automationCard) {
      const toggle = automationCard.querySelector('.toggle-switch input');
      if (toggle) {
        toggle.checked = true;
        toggle.dispatchEvent(new Event('change'));
      }
    }
  }
});

// ============================================
// Settings Actions
// ============================================

document.querySelector('.settings-actions .btn-primary')?.addEventListener('click', () => {
  const settingsForm = document.querySelector('.settings-form');

  if (!settingsForm) return;

  const settingsData = {
    requireConsent: settingsForm.querySelectorAll('input[type="checkbox"]')[0].checked,
    includeOptOut: settingsForm.querySelectorAll('input[type="checkbox"]')[1].checked,
    sendingHoursStart: settingsForm.querySelector('input[type="time"]').value,
    sendingHoursEnd: settingsForm.querySelectorAll('input[type="time"]')[1].value,
    signature: settingsForm.querySelector('input[type="text"]').value,
    limitRepeated: settingsForm.querySelectorAll('input[type="checkbox"]')[2].checked,
    maxPerDay: settingsForm.querySelector('.rate-limit-config select').value
  };

  console.log('Saving SMS settings:', settingsData);

  // In production: API call
  // await fetch('/api/sms/settings', {
  //   method: 'POST',
  //   body: JSON.stringify(settingsData)
  // });

  showToast('Settings saved successfully');
});

document.querySelector('.settings-actions .btn-outline')?.addEventListener('click', () => {
  if (confirm('Reset all settings to defaults?')) {
    // Reset form values
    showToast('Settings reset to defaults');
  }
});

// ============================================
// Load Data
// ============================================

async function loadSMSConfig() {
  try {
    const response = await apiGet('/sms/config');
    const config = response.data;

    // Update UI with config data
    if (config.notifications_enabled !== undefined) {
      const toggle = document.querySelector('input[type="checkbox"][value="notifications"]');
      if (toggle) toggle.checked = config.notifications_enabled;
    }

    console.log('SMS config loaded:', config);
  } catch (error) {
    console.error('Failed to load SMS config:', error);
  }
}

async function loadCampaigns() {
  try {
    const response = await apiGet('/sms/campaigns?limit=50');
    const campaigns = response.data || [];

    renderCampaigns(campaigns);
    console.log('Campaigns loaded:', campaigns.length);
  } catch (error) {
    console.error('Failed to load campaigns:', error);
    showToast('Failed to load campaigns');
  }
}

async function loadAutomations() {
  try {
    const response = await apiGet('/sms/automations');
    const automations = response.data || [];

    renderAutomations(automations);
    console.log('Automations loaded:', automations.length);
  } catch (error) {
    console.error('Failed to load automations:', error);
    showToast('Failed to load automations');
  }
}

function renderCampaigns(campaigns) {
  const container = document.querySelector('.campaigns-list');
  if (!container) return;

  if (campaigns.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>No campaigns yet. Create your first SMS campaign!</p>
      </div>
    `;
    return;
  }

  container.innerHTML = campaigns.map(campaign => {
    const statusClass = campaign.status || 'draft';
    const date = new Date(campaign.created_at);
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    return `
      <div class="campaign-card" data-id="${campaign.id}">
        <div class="campaign-header">
          <div class="campaign-info">
            <h3 class="campaign-name">${campaign.name}</h3>
            <p class="campaign-meta">
              <span>${dateStr}</span>
              <span>•</span>
              <span>${campaign.total_recipients || 0} recipients</span>
            </p>
          </div>
          <span class="campaign-status ${statusClass}">${statusClass}</span>
        </div>

        <div class="campaign-message">
          "${campaign.message.substring(0, 150)}${campaign.message.length > 150 ? '...' : ''}"
        </div>

        ${campaign.status === 'sent' ? `
          <div class="campaign-stats">
            <div class="stat">
              <span class="stat-value">${campaign.messages_delivered || 0}</span>
              <span class="stat-label">Delivered</span>
            </div>
            <div class="stat">
              <span class="stat-value">${campaign.clicks || 0}</span>
              <span class="stat-label">Clicked</span>
            </div>
            <div class="stat">
              <span class="stat-value">${campaign.conversions || 0}</span>
              <span class="stat-label">Converted</span>
            </div>
          </div>
        ` : ''}

        <div class="campaign-actions">
          ${campaign.status === 'draft' || campaign.status === 'scheduled' ? `
            <button class="action-btn primary" onclick="editCampaign('${campaign.id}')">Edit</button>
          ` : ''}
          ${campaign.status === 'sent' ? `
            <button class="action-btn" onclick="duplicateCampaign('${campaign.id}')">Duplicate</button>
          ` : ''}
          ${campaign.status === 'scheduled' ? `
            <button class="action-btn danger" onclick="cancelCampaign('${campaign.id}')">Cancel</button>
          ` : ''}
          <button class="action-btn" onclick="deleteCampaign('${campaign.id}')">Delete</button>
        </div>
      </div>
    `;
  }).join('');
}

function renderAutomations(automations) {
  const container = document.querySelector('.automations-list');
  if (!container) return;

  if (automations.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>No automations yet. Create your first automated workflow!</p>
      </div>
    `;
    return;
  }

  container.innerHTML = automations.map(automation => {
    const deliveryRate = automation.total_sent > 0
      ? ((automation.total_delivered / automation.total_sent) * 100).toFixed(0)
      : 0;

    return `
      <div class="automation-card" data-id="${automation.id}">
        <div class="automation-header">
          <div class="automation-icon">${automation.icon || '📱'}</div>
          <div class="automation-info">
            <h3>${automation.name}</h3>
            <p>${automation.description || ''}</p>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" ${automation.enabled ? 'checked' : ''}
              onchange="toggleAutomation('${automation.id}', this.checked)">
            <span class="toggle-slider"></span>
          </label>
        </div>

        <div class="automation-stats">
          <span>${automation.total_sent || 0} messages sent</span>
          <span>•</span>
          <span>${deliveryRate}% delivery rate</span>
        </div>

        <div class="automation-message">
          <strong>Message:</strong> "${automation.message_template}"
        </div>

        <div class="automation-actions">
          <button class="action-btn" onclick="editAutomation('${automation.id}')">Edit</button>
          <button class="action-btn" onclick="deleteAutomation('${automation.id}')">Delete</button>
        </div>
      </div>
    `;
  }).join('');
}

// ============================================
// Toast Notifications
// ============================================

function showToast(message, duration = 3000) {
  const existingToast = document.querySelector('.toast-notification');
  if (existingToast) {
    existingToast.remove();
  }

  const toast = document.createElement('div');
  toast.className = 'toast-notification';
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    background: rgba(0, 0, 0, 0.9);
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
// Keyboard Shortcuts
// ============================================

document.addEventListener('keydown', (e) => {
  // Cmd/Ctrl + N to create new campaign
  if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
    e.preventDefault();
    openModal('campaignModal');
  }

  // Escape to close modals
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal.active').forEach(modal => {
      closeModal(modal.id);
    });
  }
});

// ============================================
// Admin Function (for testing number type switch)
// ============================================

// This function would be called by admin when changing user's plan
window.adminSetNumberType = function(type) {
  if (type === 'shared' || type === 'dedicated') {
    setNumberType(type);
  } else {
    console.error('Invalid number type. Use "shared" or "dedicated"');
  }
};

// ============================================
// Console Log
// ============================================

console.log('%cSMS & Automations Ready', 'font-size: 16px; font-weight: bold; color: #4DA6FF;');
console.log('Current number type:', numberType);
console.log('Keyboard shortcuts: Cmd/Ctrl+N (New Campaign), Esc (Close modal)');
console.log('Admin: Use adminSetNumberType("dedicated") or adminSetNumberType("shared") to test');
