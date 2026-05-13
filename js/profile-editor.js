// ============================================
// CyberCheck - Profile Editor JavaScript
// ============================================

import { requireAuth } from './shared/auth.js';
import { apiGet, apiPost, apiPut } from './shared/api.js';

let hasUnsavedChanges = false;
let currentIconPickerTarget = null;
let currentProfileId = null;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth()) return;

  initializeTabs();
  initializeImageUpload();
  initializeLivePreview();
  initializeLinks();
  initializeSaveButton();
  initializeHoursEditor();
  initializeCharacterCounts();
  initializeIconPicker();

  await loadProfile();
});

// ============================================
// Tab Navigation
// ============================================

function initializeTabs() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.dataset.tab;

      // Remove active class from all
      tabButtons.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));

      // Add active class to clicked
      btn.classList.add('active');
      document.getElementById(`${tabName}-tab`).classList.add('active');
    });
  });
}

// ============================================
// Image Upload
// ============================================

function initializeImageUpload() {
  const avatarPreview = document.getElementById('avatarPreview');
  const avatarInput = document.getElementById('avatarInput');

  if (avatarPreview && avatarInput) {
    avatarPreview.addEventListener('click', () => {
      avatarInput.click();
    });

    avatarInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const img = avatarPreview.querySelector('img');
          img.src = event.target.result;

          // Update preview
          document.getElementById('previewAvatar').src = event.target.result;

          hasUnsavedChanges = true;
        };
        reader.readAsDataURL(file);
      }
    });
  }
}

// ============================================
// Live Preview Updates
// ============================================

function initializeLivePreview() {
  const businessNameInput = document.getElementById('businessName');
  const taglineInput = document.getElementById('tagline');
  const previewName = document.getElementById('previewName');
  const previewTagline = document.getElementById('previewTagline');

  if (businessNameInput && previewName) {
    businessNameInput.addEventListener('input', (e) => {
      previewName.textContent = e.target.value || 'Your Business';
      hasUnsavedChanges = true;
    });
  }

  if (taglineInput && previewTagline) {
    taglineInput.addEventListener('input', (e) => {
      previewTagline.textContent = e.target.value || 'Your tagline here';
      hasUnsavedChanges = true;
    });
  }

  // Color scheme changes
  const colorSchemeInputs = document.querySelectorAll('input[name="colorScheme"]');
  colorSchemeInputs.forEach(input => {
    input.addEventListener('change', () => {
      document.querySelectorAll('.color-scheme-option').forEach(option => {
        option.classList.remove('active');
      });
      input.closest('.color-scheme-option').classList.add('active');
      hasUnsavedChanges = true;
    });
  });

  // Refresh preview button
  const refreshBtn = document.getElementById('refreshPreview');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      // Animate refresh
      refreshBtn.style.transform = 'rotate(360deg)';
      setTimeout(() => {
        refreshBtn.style.transform = '';
      }, 600);
    });
  }
}

// ============================================
// Character Counts
// ============================================

function initializeCharacterCounts() {
  const taglineInput = document.getElementById('tagline');
  const bioInput = document.getElementById('bio');
  const taglineCount = document.getElementById('taglineCount');
  const bioCount = document.getElementById('bioCount');

  if (taglineInput && taglineCount) {
    taglineInput.addEventListener('input', (e) => {
      taglineCount.textContent = e.target.value.length;
    });
  }

  if (bioInput && bioCount) {
    bioInput.addEventListener('input', (e) => {
      bioCount.textContent = e.target.value.length;
    });
  }

  // Track all input changes
  document.querySelectorAll('input, textarea, select').forEach(el => {
    el.addEventListener('change', () => {
      hasUnsavedChanges = true;
    });
  });
}

// ============================================
// Links Management
// ============================================

function initializeLinks() {
  const addLinkBtn = document.getElementById('addLinkBtn');
  const linksList = document.getElementById('linksList');

  if (addLinkBtn && linksList) {
    addLinkBtn.addEventListener('click', () => {
      addNewLink();
    });

    // Make links sortable (drag and drop)
    initializeDragAndDrop();

    // Delete link buttons
    attachLinkEventListeners();
  }
}

function addNewLink() {
  const linksList = document.getElementById('linksList');
  const newLink = document.createElement('div');
  newLink.className = 'link-item';
  newLink.innerHTML = `
    <div class="link-handle">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>
      </svg>
    </div>
    <div class="link-icon-picker">
      <button class="icon-btn" data-icon="🔗">🔗</button>
    </div>
    <div class="link-fields">
      <input type="text" class="form-input" placeholder="Link title">
      <input type="url" class="form-input" placeholder="https://...">
    </div>
    <div class="link-actions">
      <label class="toggle-switch">
        <input type="checkbox" checked>
        <span class="toggle-slider"></span>
      </label>
      <button class="link-action-btn delete">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
        </svg>
      </button>
    </div>
  `;

  linksList.appendChild(newLink);
  attachLinkEventListeners();
  hasUnsavedChanges = true;

  // Focus on title input
  newLink.querySelector('input[type="text"]').focus();
}

function attachLinkEventListeners() {
  // Delete buttons
  document.querySelectorAll('.link-action-btn.delete').forEach(btn => {
    btn.onclick = (e) => {
      if (confirm('Delete this link?')) {
        e.target.closest('.link-item').remove();
        hasUnsavedChanges = true;
      }
    };
  });

  // Icon picker buttons
  document.querySelectorAll('.icon-btn').forEach(btn => {
    btn.onclick = () => {
      currentIconPickerTarget = btn;
      openIconPicker();
    };
  });
}

function initializeDragAndDrop() {
  const linksList = document.getElementById('linksList');
  if (!linksList) return;

  let draggedElement = null;

  linksList.addEventListener('dragstart', (e) => {
    if (e.target.classList.contains('link-item')) {
      draggedElement = e.target;
      e.target.style.opacity = '0.4';
    }
  });

  linksList.addEventListener('dragend', (e) => {
    if (e.target.classList.contains('link-item')) {
      e.target.style.opacity = '1';
    }
  });

  linksList.addEventListener('dragover', (e) => {
    e.preventDefault();
    const afterElement = getDragAfterElement(linksList, e.clientY);
    if (afterElement == null) {
      linksList.appendChild(draggedElement);
    } else {
      linksList.insertBefore(draggedElement, afterElement);
    }
  });

  // Make items draggable
  document.querySelectorAll('.link-item').forEach(item => {
    item.draggable = true;
  });
}

function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll('.link-item:not(.dragging)')];

  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;

    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// ============================================
// Icon Picker Modal
// ============================================

function initializeIconPicker() {
  const modal = document.getElementById('iconPickerModal');
  const closeBtn = document.getElementById('closeIconPicker');
  const overlay = document.getElementById('modalOverlay');

  if (closeBtn) {
    closeBtn.addEventListener('click', closeIconPicker);
  }

  if (overlay) {
    overlay.addEventListener('click', closeIconPicker);
  }

  // Icon selection
  document.querySelectorAll('.icon-option').forEach(option => {
    option.addEventListener('click', () => {
      const icon = option.dataset.icon;
      if (currentIconPickerTarget) {
        currentIconPickerTarget.textContent = icon;
        currentIconPickerTarget.dataset.icon = icon;
        hasUnsavedChanges = true;
      }
      closeIconPicker();
    });
  });
}

function openIconPicker() {
  const modal = document.getElementById('iconPickerModal');
  if (modal) {
    modal.style.display = 'flex';
  }
}

function closeIconPicker() {
  const modal = document.getElementById('iconPickerModal');
  if (modal) {
    modal.style.display = 'none';
  }
}

// ============================================
// Hours Editor
// ============================================

function initializeHoursEditor() {
  // Copy hours to all days
  document.querySelectorAll('.hours-copy-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const row = e.target.closest('.hours-row');
      const startTime = row.querySelector('.hours-time:first-of-type').value;
      const endTime = row.querySelector('.hours-time:last-of-type').value;
      const isOpen = row.querySelector('input[type="checkbox"]').checked;

      // Apply to all rows
      document.querySelectorAll('.hours-row').forEach(otherRow => {
        otherRow.querySelector('.hours-time:first-of-type').value = startTime;
        otherRow.querySelector('.hours-time:last-of-type').value = endTime;
        otherRow.querySelector('input[type="checkbox"]').checked = isOpen;
      });

      hasUnsavedChanges = true;
      showToast('Hours copied to all days');
    });
  });

  // Disable time inputs when day is unchecked
  document.querySelectorAll('.hours-day input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      const row = e.target.closest('.hours-row');
      const timeInputs = row.querySelectorAll('.hours-time');
      timeInputs.forEach(input => {
        input.disabled = !e.target.checked;
      });
      hasUnsavedChanges = true;
    });
  });
}

// ============================================
// Save Changes
// ============================================

function initializeSaveButton() {
  const saveBtn = document.getElementById('saveChangesBtn');

  if (saveBtn) {
    saveBtn.addEventListener('click', saveAllChanges);
  }

  // Warn before leaving with unsaved changes
  window.addEventListener('beforeunload', (e) => {
    if (hasUnsavedChanges) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  // Keyboard shortcut Cmd/Ctrl + S
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      saveAllChanges();
    }
  });
}

async function loadProfile() {
  try {
    const response = await apiGet('/profiles');
    const profiles = response.data || [];

    // Get the first profile or create default
    if (profiles.length > 0) {
      const profile = profiles[0];
      currentProfileId = profile.id;
      populateProfileForm(profile);
      console.log('Profile loaded:', profile);
    } else {
      console.log('No profiles found, showing empty form');
    }
  } catch (error) {
    console.error('Failed to load profile:', error);
    showToast('Failed to load profile data');
  }
}

function populateProfileForm(profile) {
  // Populate branding fields
  if (profile.profile_name) document.getElementById('businessName').value = profile.profile_name;
  if (profile.tagline) document.getElementById('tagline').value = profile.tagline;
  if (profile.description) document.getElementById('bio').value = profile.description;

  // Populate contact fields
  if (profile.contact_phone) document.getElementById('phone').value = profile.contact_phone;
  if (profile.contact_email) document.getElementById('email').value = profile.contact_email;
  if (profile.contact_website) document.getElementById('website').value = profile.contact_website;
  if (profile.address_line1) document.getElementById('address').value = profile.address_line1;
  if (profile.city) document.getElementById('city').value = profile.city;
  if (profile.state) document.getElementById('state').value = profile.state;
  if (profile.postal_code) document.getElementById('zip').value = profile.postal_code;

  // TODO: Populate hours, links, and social from JSON fields
  if (profile.business_hours) {
    // Parse and populate hours editor
  }

  if (profile.social_links) {
    // Parse and populate social fields
  }
}

async function saveAllChanges() {
  const saveBtn = document.getElementById('saveChangesBtn');
  const originalText = saveBtn.innerHTML;

  // Show loading state
  saveBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 2v6h-6M3 12a9 9 0 0115-6.7L21 8M3 22v-6h6M21 12a9 9 0 01-15 6.7L3 16"/></svg> Saving...';
  saveBtn.disabled = true;

  // Collect all form data
  const profileData = {
    profile_name: document.getElementById('businessName')?.value,
    tagline: document.getElementById('tagline')?.value,
    description: document.getElementById('bio')?.value,

    contact_phone: document.getElementById('phone')?.value,
    contact_email: document.getElementById('email')?.value,
    contact_website: document.getElementById('website')?.value,
    address_line1: document.getElementById('address')?.value,
    city: document.getElementById('city')?.value,
    state: document.getElementById('state')?.value,
    postal_code: document.getElementById('zip')?.value,

    business_hours: collectHours(),
    custom_links: collectLinks(),
    social_links: collectSocial()
  };

  console.log('Saving profile data:', profileData);

  try {
    let response;
    if (currentProfileId) {
      response = await apiPut(`/profiles/${currentProfileId}`, profileData);
      showToast('Profile updated successfully!');
    } else {
      response = await apiPost('/profiles', profileData);
      currentProfileId = response.data.id;
      showToast('Profile created successfully!');
    }

    hasUnsavedChanges = false;
  } catch (error) {
    console.error('Failed to save profile:', error);
    showToast('Failed to save profile: ' + error.message);
  } finally {
    saveBtn.innerHTML = originalText;
    saveBtn.disabled = false;
  }
}

function collectHours() {
  const hours = {};
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  document.querySelectorAll('.hours-row').forEach((row, index) => {
    const dayName = days[index].toLowerCase();
    const isOpen = row.querySelector('input[type="checkbox"]').checked;
    const startTime = row.querySelector('.hours-time:first-of-type').value;
    const endTime = row.querySelector('.hours-time:last-of-type').value;

    hours[dayName] = {
      open: isOpen,
      start: startTime,
      end: endTime
    };
  });

  return hours;
}

function collectLinks() {
  const links = [];

  document.querySelectorAll('.link-item').forEach((item, index) => {
    const icon = item.querySelector('.icon-btn').dataset.icon;
    const title = item.querySelector('input[type="text"]').value;
    const url = item.querySelector('input[type="url"]').value;
    const enabled = item.querySelector('.toggle-switch input').checked;

    links.push({
      order: index,
      icon: icon,
      title: title,
      url: url,
      enabled: enabled
    });
  });

  return links;
}

function collectSocial() {
  const social = {
    instagram: document.querySelector('.social-input-group:nth-child(1) input')?.value,
    facebook: document.querySelector('.social-input-group:nth-child(2) input')?.value,
    twitter: document.querySelector('.social-input-group:nth-child(3) input')?.value,
    tiktok: document.querySelector('.social-input-group:nth-child(4) input')?.value,
    youtube: document.querySelector('.social-input-group:nth-child(5) input')?.value,
    linkedin: document.querySelector('.social-input-group:nth-child(6) input')?.value
  };

  return social;
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
    z-index: 1000;
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
// Form Validation
// ============================================

function validatePhone(phone) {
  return /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/.test(phone);
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateURL(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// ============================================
// Auto-save Draft (optional)
// ============================================

let autoSaveTimeout;

function scheduleAutoSave() {
  clearTimeout(autoSaveTimeout);
  autoSaveTimeout = setTimeout(() => {
    saveDraft();
  }, 5000); // Auto-save after 5 seconds of inactivity
}

function saveDraft() {
  const formData = {
    businessName: document.getElementById('businessName')?.value,
    tagline: document.getElementById('tagline')?.value
    // ... other fields
  };

  localStorage.setItem('profileDraft', JSON.stringify(formData));
  console.log('Draft saved');
}

// Optional: Restore draft on load
function restoreDraft() {
  const draft = localStorage.getItem('profileDraft');
  if (draft && confirm('Restore unsaved changes?')) {
    const data = JSON.parse(draft);
    // Populate fields with draft data
  }
}

// ============================================
// Analytics Tracking
// ============================================

console.log('%cCyberCheck Profile Editor', 'font-size: 20px; font-weight: bold; color: #4DA6FF;');
console.log('Keyboard shortcut: Cmd/Ctrl+S to save');

// Track time spent on each tab
let tabStartTime = Date.now();
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const timeSpent = Date.now() - tabStartTime;
    console.log(`Time spent on previous tab: ${Math.round(timeSpent / 1000)}s`);
    tabStartTime = Date.now();
  });
});
