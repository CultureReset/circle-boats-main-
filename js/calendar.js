// ============================================
// CyberCheck - Calendar & Appointments JavaScript
// ============================================

let currentView = 'week';
let currentDate = new Date();
let appointments = [];

// ============================================
// Initialize on Load
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  initializeViewSwitcher();
  initializeNavigation();
  initializeFilters();
  initializeModal();
  initializeAppointmentActions();
  loadAppointments();
});

// ============================================
// View Switcher
// ============================================

function initializeViewSwitcher() {
  const viewButtons = document.querySelectorAll('.view-btn');

  viewButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      switchView(view);

      // Update active state
      viewButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
}

function switchView(view) {
  currentView = view;

  // Hide all views
  document.querySelectorAll('.calendar-view').forEach(v => {
    v.classList.remove('active');
  });

  // Show selected view
  const viewElement = document.getElementById(`${view}View`);
  if (viewElement) {
    viewElement.classList.add('active');
  }

  console.log('Switched to view:', view);
  showToast(`Switched to ${view} view`);
}

// ============================================
// Date Navigation
// ============================================

function initializeNavigation() {
  const prevBtn = document.getElementById('prevPeriod');
  const nextBtn = document.getElementById('nextPeriod');
  const todayBtn = document.getElementById('todayBtn');

  if (prevBtn) {
    prevBtn.addEventListener('click', () => navigatePeriod(-1));
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => navigatePeriod(1));
  }

  if (todayBtn) {
    todayBtn.addEventListener('click', () => {
      currentDate = new Date();
      updatePeriodDisplay();
      showToast('Jumped to today');
    });
  }

  updatePeriodDisplay();
}

function navigatePeriod(direction) {
  // direction: -1 for previous, 1 for next

  if (currentView === 'week') {
    currentDate.setDate(currentDate.getDate() + (7 * direction));
  } else if (currentView === 'month') {
    currentDate.setMonth(currentDate.getMonth() + direction);
  } else if (currentView === 'day') {
    currentDate.setDate(currentDate.getDate() + direction);
  }

  updatePeriodDisplay();
}

function updatePeriodDisplay() {
  const periodElement = document.getElementById('currentPeriod');

  if (!periodElement) return;

  let periodText = '';

  if (currentView === 'week') {
    // Calculate week range
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay() + 1);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];

    const startMonth = monthNames[startOfWeek.getMonth()];
    const endMonth = monthNames[endOfWeek.getMonth()];

    if (startMonth === endMonth) {
      periodText = `${startMonth} ${startOfWeek.getDate()}-${endOfWeek.getDate()}, ${startOfWeek.getFullYear()}`;
    } else {
      periodText = `${startMonth} ${startOfWeek.getDate()} - ${endMonth} ${endOfWeek.getDate()}, ${startOfWeek.getFullYear()}`;
    }
  } else if (currentView === 'month') {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
    periodText = `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  } else if (currentView === 'day') {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
    periodText = `${monthNames[currentDate.getMonth()]} ${currentDate.getDate()}, ${currentDate.getFullYear()}`;
  } else if (currentView === 'list') {
    periodText = 'All Appointments';
  }

  periodElement.textContent = periodText;
}

// ============================================
// Status Filters
// ============================================

function initializeFilters() {
  const filterButtons = document.querySelectorAll('.status-filter-btn');

  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const status = btn.dataset.status;

      // Update active state
      filterButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Apply filter
      filterAppointments(status);
    });
  });
}

function filterAppointments(status) {
  const appointmentBlocks = document.querySelectorAll('.appointment-block');
  const appointmentListItems = document.querySelectorAll('.appointment-list-item');

  // Filter week view blocks
  appointmentBlocks.forEach(block => {
    if (status === 'all') {
      block.style.display = 'block';
    } else if (block.classList.contains(status)) {
      block.style.display = 'block';
    } else {
      block.style.display = 'none';
    }
  });

  // Filter list view items
  appointmentListItems.forEach(item => {
    if (status === 'all') {
      item.style.display = 'flex';
    } else if (item.classList.contains(status)) {
      item.style.display = 'flex';
    } else {
      item.style.display = 'none';
    }
  });

  showToast(`Showing ${status === 'all' ? 'all' : status} appointments`);
}

// ============================================
// Appointment Modal
// ============================================

function initializeModal() {
  const addAppointmentBtn = document.getElementById('addAppointmentBtn');
  const closeAppointmentModal = document.getElementById('closeAppointmentModal');
  const cancelAppointmentBtn = document.getElementById('cancelAppointmentBtn');
  const appointmentForm = document.getElementById('appointmentForm');
  const modal = document.getElementById('appointmentModal');

  if (addAppointmentBtn) {
    addAppointmentBtn.addEventListener('click', () => {
      openAppointmentModal();
    });
  }

  if (closeAppointmentModal) {
    closeAppointmentModal.addEventListener('click', () => {
      closeModal('appointmentModal');
    });
  }

  if (cancelAppointmentBtn) {
    cancelAppointmentBtn.addEventListener('click', () => {
      closeModal('appointmentModal');
    });
  }

  if (appointmentForm) {
    appointmentForm.addEventListener('submit', (e) => {
      e.preventDefault();
      saveAppointment();
    });
  }

  // Close on overlay click
  const overlay = modal?.querySelector('.modal-overlay');
  if (overlay) {
    overlay.addEventListener('click', () => {
      closeModal('appointmentModal');
    });
  }

  // Click on appointment blocks to edit
  document.querySelectorAll('.appointment-block').forEach(block => {
    block.addEventListener('click', () => {
      const appointmentId = block.dataset.id;
      openAppointmentModal(appointmentId);
    });
  });
}

function openAppointmentModal(appointmentId = null) {
  const modal = document.getElementById('appointmentModal');
  const form = document.getElementById('appointmentForm');
  const modalTitle = modal.querySelector('.modal-title');

  if (!modal || !form) return;

  if (appointmentId) {
    // Edit mode
    modalTitle.textContent = 'Edit Appointment';

    // In production: load appointment data
    // const appointment = await fetch(`/api/appointments/${appointmentId}`);

    // Populate form fields
    // form.querySelector('input[type="text"]').value = appointment.customerName;
    // etc...
  } else {
    // Add mode
    modalTitle.textContent = 'New Appointment';
    form.reset();

    // Set default date to today
    const dateInput = form.querySelector('input[type="date"]');
    if (dateInput) {
      const today = new Date().toISOString().split('T')[0];
      dateInput.value = today;
    }
  }

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

function saveAppointment() {
  const form = document.getElementById('appointmentForm');

  const appointmentData = {
    customerName: form.querySelector('input[type="text"]').value,
    phone: form.querySelector('input[type="tel"]').value,
    email: form.querySelector('input[type="email"]').value,
    date: form.querySelector('input[type="date"]').value,
    time: form.querySelector('input[type="time"]').value,
    service: form.querySelector('select[required]').value,
    duration: form.querySelectorAll('select')[1].value,
    notes: form.querySelector('textarea').value,
    status: form.querySelector('input[name="status"]:checked').value
  };

  console.log('Saving appointment:', appointmentData);

  // In production: API call
  // await fetch('/api/appointments', { method: 'POST', body: JSON.stringify(appointmentData) });

  showToast('Appointment created successfully!');
  closeModal('appointmentModal');

  // Refresh calendar
  setTimeout(() => {
    // Reload appointments
  }, 500);
}

// ============================================
// Appointment Actions
// ============================================

function initializeAppointmentActions() {
  document.addEventListener('click', (e) => {
    const actionBtn = e.target.closest('.action-btn');

    if (!actionBtn) return;

    e.stopPropagation();

    const listItem = actionBtn.closest('.appointment-list-item');
    const appointmentId = listItem?.dataset.id;

    if (!appointmentId) return;

    const title = actionBtn.getAttribute('title');

    if (title === 'Edit') {
      openAppointmentModal(appointmentId);
    } else if (title === 'Cancel') {
      if (confirm('Cancel this appointment?')) {
        cancelAppointment(appointmentId);
      }
    } else if (title === 'Confirm') {
      confirmAppointment(appointmentId);
    }
  });
}

function confirmAppointment(appointmentId) {
  console.log('Confirming appointment:', appointmentId);

  // In production: API call
  // await fetch(`/api/appointments/${appointmentId}/confirm`, { method: 'POST' });

  // Update UI
  const listItem = document.querySelector(`.appointment-list-item[data-id="${appointmentId}"]`);
  const block = document.querySelector(`.appointment-block[data-id="${appointmentId}"]`);

  if (listItem) {
    listItem.classList.remove('pending');
    listItem.classList.add('confirmed');
    const badge = listItem.querySelector('.status-badge');
    if (badge) {
      badge.className = 'status-badge confirmed';
      badge.textContent = 'Confirmed';
    }
  }

  if (block) {
    block.classList.remove('pending');
    block.classList.add('confirmed');
  }

  showToast('Appointment confirmed');
}

function cancelAppointment(appointmentId) {
  console.log('Cancelling appointment:', appointmentId);

  // In production: API call
  // await fetch(`/api/appointments/${appointmentId}/cancel`, { method: 'POST' });

  // Update UI
  const listItem = document.querySelector(`.appointment-list-item[data-id="${appointmentId}"]`);
  const block = document.querySelector(`.appointment-block[data-id="${appointmentId}"]`);

  if (listItem) {
    listItem.classList.remove('confirmed', 'pending');
    listItem.classList.add('cancelled');
    const badge = listItem.querySelector('.status-badge');
    if (badge) {
      badge.className = 'status-badge cancelled';
      badge.textContent = 'Cancelled';
    }
  }

  if (block) {
    block.classList.remove('confirmed', 'pending');
    block.classList.add('cancelled');
  }

  showToast('Appointment cancelled');
}

// ============================================
// Load Appointments
// ============================================

function loadAppointments() {
  // In production: load from API
  // const appointments = await fetch('/api/appointments');

  console.log('Appointments loaded');
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
  // Cmd/Ctrl + N to create new appointment
  if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
    e.preventDefault();
    openAppointmentModal();
  }

  // Escape to close modals
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal.active').forEach(modal => {
      closeModal(modal.id);
    });
  }

  // Arrow keys to navigate dates
  if (e.key === 'ArrowLeft') {
    navigatePeriod(-1);
  } else if (e.key === 'ArrowRight') {
    navigatePeriod(1);
  }

  // T for today
  if (e.key === 't' || e.key === 'T') {
    currentDate = new Date();
    updatePeriodDisplay();
    showToast('Jumped to today');
  }

  // View shortcuts: 1=Month, 2=Week, 3=Day, 4=List
  if (e.key >= '1' && e.key <= '4') {
    const views = ['month', 'week', 'day', 'list'];
    const viewIndex = parseInt(e.key) - 1;

    if (viewIndex < views.length) {
      switchView(views[viewIndex]);

      // Update button active state
      document.querySelectorAll('.view-btn').forEach((btn, index) => {
        btn.classList.toggle('active', index === viewIndex);
      });
    }
  }
});

// ============================================
// Auto-refresh
// ============================================

// In production: refresh appointments periodically
setInterval(() => {
  // Check for new appointments from API
  // Update UI if needed
}, 60000); // Every minute

// ============================================
// Console Log
// ============================================

console.log('%cCalendar & Appointments Ready', 'font-size: 16px; font-weight: bold; color: #4DA6FF;');
console.log('Keyboard shortcuts:');
console.log('  Cmd/Ctrl+N: New appointment');
console.log('  Arrow keys: Navigate dates');
console.log('  T: Jump to today');
console.log('  1-4: Switch views (Month/Week/Day/List)');
console.log('Current view:', currentView);
