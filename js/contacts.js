// ============================================
// CyberCheck - Contacts & CRM JavaScript
// ============================================

let currentContactId = 1;
let contactsData = [];

// ============================================
// Initialize on Load
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  initializeContactsList();
  initializeDetailTabs();
  initializeSearch();
  initializeFilters();
  initializeModals();
  loadContactsData();
});

// ============================================
// Contacts List
// ============================================

function initializeContactsList() {
  const contactCards = document.querySelectorAll('.contact-card');

  contactCards.forEach(card => {
    card.addEventListener('click', () => {
      const contactId = card.dataset.contactId;
      selectContact(contactId, card);
    });
  });
}

function selectContact(contactId, cardElement) {
  currentContactId = contactId;

  // Update active state
  document.querySelectorAll('.contact-card').forEach(card => {
    card.classList.remove('active');
  });

  if (cardElement) {
    cardElement.classList.add('active');
  }

  // Load contact details
  loadContactDetails(contactId);
}

function loadContactDetails(contactId) {
  // In production: fetch from API
  // const contact = await fetch(`/api/contacts/${contactId}`);

  // Demo data
  const demoData = {
    '1': {
      name: 'John Smith',
      email: 'john.smith@email.com',
      phone: '+1 (555) 123-4567',
      avatar: 'https://i.pravatar.cc/150?img=1',
      status: 'online',
      totalOrders: 12,
      totalSpent: '$348.50',
      lastVisit: 'Dec 8, 2025'
    },
    '2': {
      name: 'Sarah Johnson',
      email: 'sarah.j@email.com',
      phone: '+1 (555) 234-5678',
      avatar: 'https://i.pravatar.cc/150?img=5',
      status: 'offline',
      totalOrders: 5,
      totalSpent: '$127.00',
      lastVisit: 'Dec 7, 2025'
    }
  };

  const contact = demoData[contactId] || demoData['1'];

  // Update detail panel
  document.getElementById('detailName').textContent = contact.name;
  document.getElementById('detailEmail').textContent = contact.email;
  document.getElementById('detailAvatar').src = contact.avatar;

  const statusElement = document.getElementById('detailStatus');
  if (statusElement) {
    statusElement.className = `contact-status ${contact.status}`;
  }

  // Update info cards
  const infoCards = document.querySelectorAll('.info-card');
  if (infoCards.length >= 4) {
    infoCards[0].querySelector('.info-value').textContent = contact.phone;
    infoCards[1].querySelector('.info-value').textContent = contact.totalOrders;
    infoCards[2].querySelector('.info-value').textContent = contact.totalSpent;
    infoCards[3].querySelector('.info-value').textContent = contact.lastVisit;
  }
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
      document.getElementById(`${tabName}-tab`).classList.add('active');
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
        const query = e.target.value.toLowerCase();
        filterContacts(query);
      }, 300);
    });
  }
}

function filterContacts(query) {
  const contactCards = document.querySelectorAll('.contact-card');

  contactCards.forEach(card => {
    const name = card.querySelector('.contact-name').textContent.toLowerCase();
    const email = card.querySelectorAll('.contact-detail')[0]?.textContent.toLowerCase() || '';
    const phone = card.querySelectorAll('.contact-detail')[1]?.textContent.toLowerCase() || '';

    const matches = name.includes(query) || email.includes(query) || phone.includes(query);

    if (matches || query === '') {
      card.style.display = 'flex';
    } else {
      card.style.display = 'none';
    }
  });
}

// ============================================
// Filters
// ============================================

function initializeFilters() {
  const filterButtons = document.querySelectorAll('.filter-btn');

  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const filter = btn.dataset.filter;

      // Update active state
      filterButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Apply filter
      applyFilter(filter);
    });
  });
}

function applyFilter(filter) {
  const contactCards = document.querySelectorAll('.contact-card');

  contactCards.forEach(card => {
    const badge = card.querySelector('.contact-badge');
    const badgeType = badge?.classList.contains('customer') ? 'customers' :
                      badge?.classList.contains('lead') ? 'leads' : '';

    if (filter === 'all') {
      card.style.display = 'flex';
    } else if (filter === badgeType) {
      card.style.display = 'flex';
    } else {
      card.style.display = 'none';
    }
  });

  showToast(`Showing ${filter}`);
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
      closeModal('addContactModal');
    });
  }

  if (addContactForm) {
    addContactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      saveContact();
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

function saveContact() {
  const form = document.getElementById('addContactForm');
  const formData = new FormData(form);

  // Collect form data
  const contactData = {
    firstName: formData.get('firstName') || form.querySelector('input[type="text"]').value,
    lastName: formData.get('lastName') || form.querySelectorAll('input[type="text"]')[1].value,
    email: form.querySelector('input[type="email"]').value,
    phone: form.querySelector('input[type="tel"]').value,
    type: form.querySelector('select').value,
    notes: form.querySelector('textarea').value
  };

  console.log('Saving contact:', contactData);

  // In production: API call
  // await fetch('/api/contacts', { method: 'POST', body: JSON.stringify(contactData) });

  showToast('Contact added successfully!');
  closeModal('addContactModal');

  // Reset form
  form.reset();

  // Refresh list
  setTimeout(() => {
    // Reload contacts list
  }, 500);
}

// ============================================
// Load Contacts Data
// ============================================

function loadContactsData() {
  // In production: load from API
  // const contacts = await fetch('/api/contacts');

  console.log('Contacts loaded');
}

// ============================================
// Notes Functionality
// ============================================

const addNoteBtn = document.querySelector('.add-note-form .btn');
if (addNoteBtn) {
  addNoteBtn.addEventListener('click', () => {
    const noteInput = document.querySelector('.note-input');
    const noteText = noteInput.value.trim();

    if (noteText) {
      addNote(noteText);
      noteInput.value = '';
    }
  });
}

function addNote(text) {
  const notesList = document.querySelector('.notes-list');

  if (!notesList) return;

  const noteItem = document.createElement('div');
  noteItem.className = 'note-item';

  const now = new Date();
  const dateString = now.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  noteItem.innerHTML = `
    <div class="note-header">
      <span class="note-author">You</span>
      <span class="note-time">${dateString}</span>
    </div>
    <p class="note-text">${text}</p>
  `;

  notesList.insertBefore(noteItem, notesList.firstChild);
  showToast('Note added');
}

// ============================================
// Action Buttons
// ============================================

document.addEventListener('click', (e) => {
  const detailActionBtn = e.target.closest('.detail-action-btn');

  if (detailActionBtn) {
    const title = detailActionBtn.getAttribute('title');

    if (title === 'Call') {
      const phone = document.querySelectorAll('.info-card .info-value')[0]?.textContent;
      if (phone) {
        window.location.href = `tel:${phone.replace(/[^0-9+]/g, '')}`;
      }
    } else if (title === 'Message') {
      showToast('Opening messages...');
      // In production: open messaging interface
    } else if (title === 'Email') {
      const email = document.getElementById('detailEmail')?.textContent;
      if (email) {
        window.location.href = `mailto:${email}`;
      }
    } else if (title === 'More') {
      showToast('More options');
      // In production: show context menu
    }
  }
});

// ============================================
// Import Contacts
// ============================================

document.getElementById('importContactsBtn')?.addEventListener('click', () => {
  showToast('Import feature coming soon');
  // In production: open import dialog (CSV, vCard, etc.)
});

// ============================================
// Timeline Interactions
// ============================================

document.addEventListener('click', (e) => {
  if (e.target.classList.contains('timeline-link')) {
    e.preventDefault();
    const href = e.target.getAttribute('href');

    if (href && href !== '#') {
      // In production: navigate to order details, etc.
      showToast('Opening details...');
    }
  }
});

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

  // Arrow keys to navigate contacts
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    navigateContacts(e.key === 'ArrowDown' ? 1 : -1);
  }
});

function navigateContacts(direction) {
  const contacts = [...document.querySelectorAll('.contact-card')].filter(c => c.style.display !== 'none');
  const activeIndex = contacts.findIndex(c => c.classList.contains('active'));

  if (contacts.length === 0) return;

  let newIndex = activeIndex + direction;

  if (newIndex < 0) newIndex = contacts.length - 1;
  if (newIndex >= contacts.length) newIndex = 0;

  const newContact = contacts[newIndex];
  if (newContact) {
    const contactId = newContact.dataset.contactId;
    selectContact(contactId, newContact);

    // Scroll into view
    newContact.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

// ============================================
// Real-time Status Updates (WebSocket simulation)
// ============================================

function simulateStatusUpdates() {
  // In production: connect to WebSocket for real-time presence
  setInterval(() => {
    if (Math.random() > 0.8) {
      const statusElements = document.querySelectorAll('.contact-status');
      if (statusElements.length > 0) {
        const randomStatus = statusElements[Math.floor(Math.random() * statusElements.length)];
        randomStatus.classList.toggle('online');
      }
    }
  }, 30000); // Every 30 seconds
}

// Start simulated updates
simulateStatusUpdates();

// ============================================
// Console Log
// ============================================

console.log('%cContacts & CRM Ready', 'font-size: 16px; font-weight: bold; color: #4DA6FF;');
console.log('Keyboard shortcuts: Cmd/Ctrl+K (Search), Cmd/Ctrl+N (New Contact), Arrow Keys (Navigate)');
console.log('Current contact ID:', currentContactId);
