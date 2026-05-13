// ============================================
// CyberCheck - Contacts & CRM JavaScript (API Connected)
// ============================================

import { requireAuth, getUser } from './shared/auth.js';
import { apiGet, apiPost, apiPut, apiDelete } from './shared/api.js';

let currentContactId = null;
let contactsData = [];
let currentFilter = 'all';

// ============================================
// Initialize on Load
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
  // Require authentication
  if (!requireAuth()) return;

  // Initialize UI
  initializeDetailTabs();
  initializeSearch();
  initializeFilters();
  initializeModals();

  // Load contacts from API
  await loadContactsData();
});

// ============================================
// Load Contacts Data
// ============================================

async function loadContactsData(searchQuery = '', lifecycleFilter = '') {
  try {
    const params = {};
    if (searchQuery) params.q = searchQuery;
    if (lifecycleFilter && lifecycleFilter !== 'all') {
      params.lifecycle_stage = lifecycleFilter === 'customers' ? 'customer' : lifecycleFilter === 'leads' ? 'lead' : null;
    }

    const response = await apiGet('/contacts', params);
    contactsData = response.data;

    // Update filter counts
    updateFilterCounts(contactsData);

    // Render contacts list
    renderContactsList(contactsData);

    // Select first contact if available
    if (contactsData.length > 0 && !currentContactId) {
      selectContact(contactsData[0].id);
    }

    console.log(`Loaded ${contactsData.length} contacts from API`);
  } catch (err) {
    console.error('Failed to load contacts:', err);
    showToast('Failed to load contacts: ' + err.message, 5000);
  }
}

// ============================================
// Render Contacts List
// ============================================

function renderContactsList(contacts) {
  const listContainer = document.querySelector('.contacts-list');
  if (!listContainer) return;

  if (contacts.length === 0) {
    listContainer.innerHTML = `
      <div style="padding: 40px; text-align: center; color: #666;">
        <p>No contacts found</p>
        <button class="btn btn-primary" onclick="document.getElementById('addContactBtn').click()" style="margin-top: 16px;">
          Add Your First Contact
        </button>
      </div>
    `;
    return;
  }

  listContainer.innerHTML = contacts.map(contact => {
    const fullName = `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 'Unnamed Contact';
    const badgeClass = contact.lifecycle_stage === 'customer' ? 'customer' : contact.lifecycle_stage === 'lead' ? 'lead' : 'other';
    const badgeText = contact.lifecycle_stage || 'contact';
    const timeAgo = getTimeAgo(contact.created_at);
    const avatarUrl = contact.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=4DA6FF&color=fff`;

    return `
      <div class="contact-card ${contact.id === currentContactId ? 'active' : ''}" data-contact-id="${contact.id}">
        <div class="contact-avatar">
          <img src="${avatarUrl}" alt="${fullName}">
          ${contact.is_active ? '<span class="contact-status online"></span>' : ''}
        </div>
        <div class="contact-info">
          <h4 class="contact-name">${fullName}</h4>
          <p class="contact-detail">${contact.email || 'No email'}</p>
          <p class="contact-detail">${contact.phone || 'No phone'}</p>
        </div>
        <div class="contact-meta">
          <span class="contact-badge ${badgeClass}">${badgeText}</span>
          <span class="contact-time">${timeAgo}</span>
        </div>
      </div>
    `;
  }).join('');

  // Attach click handlers
  document.querySelectorAll('.contact-card').forEach(card => {
    card.addEventListener('click', () => {
      const contactId = card.dataset.contactId;
      selectContact(contactId);
    });
  });
}

// ============================================
// Select Contact
// ============================================

async function selectContact(contactId) {
  currentContactId = contactId;

  // Update active state in list
  document.querySelectorAll('.contact-card').forEach(card => {
    card.classList.remove('active');
    if (card.dataset.contactId === contactId) {
      card.classList.add('active');
    }
  });

  // Load full contact details
  await loadContactDetails(contactId);
}

// ============================================
// Load Contact Details
// ============================================

async function loadContactDetails(contactId) {
  try {
    const response = await apiGet(`/contacts/${contactId}`);
    const contact = response.data;

    const fullName = `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 'Unnamed Contact';
    const avatarUrl = contact.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=4DA6FF&color=fff`;

    // Update detail panel header
    document.getElementById('detailName').textContent = fullName;
    document.getElementById('detailEmail').textContent = contact.email || 'No email';
    document.getElementById('detailAvatar').src = avatarUrl;

    const statusElement = document.getElementById('detailStatus');
    if (statusElement) {
      statusElement.className = `contact-status ${contact.is_active ? 'online' : ''}`;
    }

    // Update info cards
    const infoCards = document.querySelectorAll('.info-card');
    if (infoCards.length >= 4) {
      infoCards[0].querySelector('.info-value').textContent = contact.phone || 'N/A';
      infoCards[1].querySelector('.info-value').textContent = contact.leads?.length || 0;
      infoCards[2].querySelector('.info-value').textContent = `Score: ${contact.lead_score || 0}`;
      infoCards[3].querySelector('.info-value').textContent = formatDate(contact.created_at);
    }

    // Update timeline with real activity
    renderTimeline(contact);

  } catch (err) {
    console.error('Failed to load contact details:', err);
    showToast('Failed to load contact details', 3000);
  }
}

// ============================================
// Render Timeline
// ============================================

function renderTimeline(contact) {
  const timelineContainer = document.getElementById('timeline-tab');
  if (!timelineContainer) return;

  let timelineHTML = '';

  // Add leads to timeline
  if (contact.leads && contact.leads.length > 0) {
    contact.leads.forEach(lead => {
      timelineHTML += `
        <div class="timeline-item">
          <div class="timeline-dot lead"></div>
          <div class="timeline-content">
            <div class="timeline-header">
              <span class="timeline-title">Lead: ${lead.lead_name}</span>
              <span class="timeline-time">${getTimeAgo(lead.created_at)}</span>
            </div>
            <div class="timeline-body">
              <p>Stage: ${lead.stage} | Value: $${(lead.estimated_value_cents / 100).toFixed(2)}</p>
            </div>
          </div>
        </div>
      `;
    });
  }

  // Add tasks to timeline
  if (contact.tasks && contact.tasks.length > 0) {
    contact.tasks.forEach(task => {
      timelineHTML += `
        <div class="timeline-item">
          <div class="timeline-dot task"></div>
          <div class="timeline-content">
            <div class="timeline-header">
              <span class="timeline-title">${task.title}</span>
              <span class="timeline-time">${getTimeAgo(task.created_at)}</span>
            </div>
            <div class="timeline-body">
              <div class="timeline-meta">
                <span class="timeline-badge ${task.status}">${task.status}</span>
                <span class="timeline-badge ${task.priority}">${task.priority}</span>
              </div>
            </div>
          </div>
        </div>
      `;
    });
  }

  // Contact created event
  timelineHTML += `
    <div class="timeline-item">
      <div class="timeline-dot contact"></div>
      <div class="timeline-content">
        <div class="timeline-header">
          <span class="timeline-title">Contact created</span>
          <span class="timeline-time">${getTimeAgo(contact.created_at)}</span>
        </div>
        <div class="timeline-body">
          <p>Source: ${contact.source_type || 'manual'}</p>
        </div>
      </div>
    </div>
  `;

  timelineContainer.querySelector('.timeline').innerHTML = timelineHTML || '<p style="padding: 20px; text-align: center; color: #666;">No activity yet</p>';
}

// ============================================
// Detail Tabs
// ============================================

function initializeDetailTabs() {
  const tabButtons = document.querySelectorAll('.detail-tab');
  const tabContents = document.querySelectorAll('.detail-tab-content');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.dataset.tab;

      // Update active states
      tabButtons.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      document.getElementById(`${tabName}-tab`)?.classList.add('active');
    });
  });
}

// ============================================
// Search
// ============================================

function initializeSearch() {
  const searchInput = document.getElementById('contactSearch');

  if (searchInput) {
    let searchTimeout;

    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);

      searchTimeout = setTimeout(() => {
        const query = e.target.value.trim();
        loadContactsData(query, currentFilter);
      }, 500);
    });
  }
}

// ============================================
// Filters
// ============================================

function initializeFilters() {
  const filterButtons = document.querySelectorAll('.filter-btn');

  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const filter = btn.dataset.filter;
      currentFilter = filter;

      // Update active state
      filterButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Apply filter
      const searchQuery = document.getElementById('contactSearch')?.value || '';
      loadContactsData(searchQuery, filter);
    });
  });
}

function updateFilterCounts(contacts) {
  const allCount = contacts.length;
  const customersCount = contacts.filter(c => c.lifecycle_stage === 'customer').length;
  const leadsCount = contacts.filter(c => c.lifecycle_stage === 'lead').length;

  const filterButtons = document.querySelectorAll('.filter-btn');
  filterButtons.forEach(btn => {
    const filter = btn.dataset.filter;
    const countSpan = btn.querySelector('.filter-count');
    if (countSpan) {
      if (filter === 'all') countSpan.textContent = allCount;
      else if (filter === 'customers') countSpan.textContent = customersCount;
      else if (filter === 'leads') countSpan.textContent = leadsCount;
    }
  });
}

// ============================================
// Modals
// ============================================

function initializeModals() {
  const addContactBtn = document.getElementById('addContactBtn');
  const closeContactModal = document.getElementById('closeContactModal');
  const cancelContactBtn = document.getElementById('cancelContactBtn');
  const addContactForm = document.getElementById('addContactForm');
  const modal = document.getElementById('addContactModal');

  if (addContactBtn) {
    addContactBtn.addEventListener('click', () => {
      editingContactId = null;
      // Reset modal title and button text
      document.querySelector('#addContactModal .modal-header h2').textContent = 'Add New Contact';
      document.getElementById('addContactModal').querySelector('button[type="submit"]').textContent = 'Add Contact';
      openModal('addContactModal');
    });
  }

  if (closeContactModal) {
    closeContactModal.addEventListener('click', () => {
      closeModal('addContactModal');
    });
  }

  if (cancelContactBtn) {
    cancelContactBtn.addEventListener('click', () => {
      editingContactId = null;
      addContactForm.reset();
      // Reset modal title and button text
      document.querySelector('#addContactModal .modal-header h2').textContent = 'Add New Contact';
      document.getElementById('addContactModal').querySelector('button[type="submit"]').textContent = 'Add Contact';
      closeModal('addContactModal');
    });
  }

  if (addContactForm) {
    addContactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await saveContact();
    });
  }

  // Close on overlay click
  const overlay = modal?.querySelector('.modal-overlay');
  if (overlay) {
    overlay.addEventListener('click', () => {
      closeModal('addContactModal');
    });
  }
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

// ============================================
// Save Contact
// ============================================

async function saveContact() {
  const form = document.getElementById('addContactForm');
  const inputs = form.querySelectorAll('input, select, textarea');

  const contactData = {
    first_name: inputs[0].value.trim(),
    last_name: inputs[1].value.trim(),
    email: inputs[2].value.trim() || null,
    phone: inputs[3].value.trim() || null,
    lifecycle_stage: inputs[4].value || 'lead',
    notes: inputs[5].value.trim() || null
  };

  try {
    let response;

    if (editingContactId) {
      // Update existing contact
      response = await apiPut(`/contacts/${editingContactId}`, contactData);
      showToast('Contact updated successfully!');
    } else {
      // Create new contact
      response = await apiPost('/contacts', contactData);
      showToast('Contact created successfully!');
    }

    closeModal('addContactModal');
    form.reset();

    // Reset modal title and button text
    document.querySelector('#addContactModal .modal-header h2').textContent = 'Add New Contact';
    document.getElementById('addContactModal').querySelector('button[type="submit"]').textContent = 'Add Contact';
    editingContactId = null;

    // Reload contacts list
    await loadContactsData();

    // Select the contact (new or updated)
    if (response.data?.id) {
      selectContact(response.data.id);
    } else if (editingContactId) {
      selectContact(editingContactId);
    }

  } catch (err) {
    console.error('Failed to save contact:', err);
    showToast('Failed to save contact: ' + err.message, 5000);
  }
}

// ============================================
// Edit Contact
// ============================================

let editingContactId = null;

document.getElementById('editContactBtn')?.addEventListener('click', () => {
  if (!currentContactId) return;

  editingContactId = currentContactId;
  const contact = contactsData.find(c => c.id === currentContactId);

  if (!contact) return;

  // Populate form with current contact data
  const form = document.getElementById('addContactForm');
  const inputs = form.querySelectorAll('input, select, textarea');

  inputs[0].value = contact.first_name || '';
  inputs[1].value = contact.last_name || '';
  inputs[2].value = contact.email || '';
  inputs[3].value = contact.phone || '';
  inputs[4].value = contact.lifecycle_stage || 'lead';
  inputs[5].value = contact.notes || '';

  // Change modal title
  document.querySelector('#addContactModal .modal-header h2').textContent = 'Edit Contact';
  document.getElementById('addContactModal').querySelector('button[type="submit"]').textContent = 'Update Contact';

  openModal('addContactModal');
});

// ============================================
// Delete Contact
// ============================================

document.getElementById('deleteContactBtn')?.addEventListener('click', async () => {
  if (!currentContactId) return;

  const contact = contactsData.find(c => c.id === currentContactId);
  if (!contact) return;

  const fullName = `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 'this contact';

  if (!confirm(`Are you sure you want to delete ${fullName}?`)) {
    return;
  }

  try {
    await apiDelete(`/contacts/${currentContactId}`);

    showToast('Contact deleted successfully!');

    // Reload contacts list
    await loadContactsData();

    // Clear current selection
    currentContactId = null;

  } catch (err) {
    console.error('Failed to delete contact:', err);
    showToast('Failed to delete contact: ' + err.message, 5000);
  }
});

// ============================================
// Import Contacts
// ============================================

document.getElementById('importContactsBtn')?.addEventListener('click', () => {
  showToast('Import feature coming soon');
});

// ============================================
// Action Buttons
// ============================================

document.addEventListener('click', async (e) => {
  const detailActionBtn = e.target.closest('.detail-action-btn');

  if (detailActionBtn) {
    const title = detailActionBtn.getAttribute('title');

    if (title === 'Call') {
      const phone = document.querySelectorAll('.info-card .info-value')[0]?.textContent;
      if (phone && phone !== 'N/A') {
        window.location.href = `tel:${phone.replace(/[^0-9+]/g, '')}`;
      }
    } else if (title === 'Message') {
      showToast('Opening messages...');
    } else if (title === 'Email') {
      const email = document.getElementById('detailEmail')?.textContent;
      if (email && email !== 'No email') {
        window.location.href = `mailto:${email}`;
      }
    } else if (title === 'More') {
      showToast('More options');
    }
  }
});

// ============================================
// Utility Functions
// ============================================

function getTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 604800)}w ago`;
  return `${Math.floor(seconds / 2592000)}mo ago`;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
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
  // Cmd/Ctrl + K to focus search
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    document.getElementById('contactSearch')?.focus();
  }

  // Cmd/Ctrl + N to add new contact
  if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
    e.preventDefault();
    openModal('addContactModal');
  }

  // Escape to close modals
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal.active').forEach(modal => {
      closeModal(modal.id);
    });
  }
});

// ============================================
// Console Log
// ============================================

console.log('%cContacts & CRM Ready (API Connected)', 'font-size: 16px; font-weight: bold; color: #4DA6FF;');
console.log('Keyboard shortcuts: Cmd/Ctrl+K (Search), Cmd/Ctrl+N (New Contact)');

// Make functions available globally for HTML onclick handlers
window.loadContactsData = loadContactsData;
window.selectContact = selectContact;
