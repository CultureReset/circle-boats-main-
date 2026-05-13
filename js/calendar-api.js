// ============================================
// CyberCheck - Calendar & Appointments (API-Connected)
// ============================================

import { requireAuth } from './shared/auth.js';
import { apiGet, apiPost, apiPut, apiDelete } from './shared/api.js';

// Check authentication
if (!requireAuth()) {
  window.location.href = '/frontend/login.html';
}

// State
let currentView = 'week';
let currentDate = new Date();
let appointments = [];
let currentFilter = 'all';
let editingAppointmentId = null;

// ============================================
// Initialize on Load
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
  await loadAppointments();
  initializeViewSwitcher();
  initializeNavigation();
  initializeFilters();
  initializeModal();
  initializeAppointmentActions();
  updatePeriodDisplay();
  renderCalendar();
});

// ============================================
// Load Appointments from API
// ============================================

async function loadAppointments() {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const params = new URLSearchParams({
      start_date: startOfMonth.toISOString(),
      end_date: endOfMonth.toISOString(),
      limit: 500
    });

    const response = await apiGet(`/appointments?${params}`);
    appointments = response.data || [];

    console.log('Loaded appointments:', appointments.length);
    renderCalendar();
    updateStats();
  } catch (error) {
    console.error('Failed to load appointments:', error);
    showToast('Failed to load appointments');
  }
}

// ============================================
// Update Statistics
// ============================================

async function updateStats() {
  try {
    const response = await apiGet('/appointments/stats');
    const stats = response.data;

    // Update stat cards if they exist
    document.getElementById('totalAppointments')?.textContent = stats.total || 0;
    document.getElementById('todayAppointments')?.textContent = stats.today || 0;
    document.getElementById('upcomingAppointments')?.textContent = stats.upcoming || 0;
    document.getElementById('scheduledCount')?.textContent = stats.scheduled || 0;
  } catch (error) {
    console.error('Failed to load stats:', error);
  }
}

// ============================================
// View Switcher
// ============================================

function initializeViewSwitcher() {
  const viewButtons = document.querySelectorAll('.view-btn');

  viewButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      currentView = view;

      // Update active state
      viewButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Re-render calendar with new view
      renderCalendar();
      updatePeriodDisplay();
    });
  });
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
      loadAppointments();
    });
  }
}

function navigatePeriod(direction) {
  if (currentView === 'week') {
    currentDate.setDate(currentDate.getDate() + (7 * direction));
  } else if (currentView === 'month') {
    currentDate.setMonth(currentDate.getMonth() + direction);
  } else if (currentView === 'day') {
    currentDate.setDate(currentDate.getDate() + direction);
  }

  updatePeriodDisplay();
  loadAppointments();
}

function updatePeriodDisplay() {
  const periodElement = document.getElementById('currentPeriod');
  if (!periodElement) return;

  let periodText = '';

  if (currentView === 'week') {
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
      currentFilter = btn.dataset.status;

      // Update active state
      filterButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      renderCalendar();
    });
  });
}

// ============================================
// Render Calendar
// ============================================

function renderCalendar() {
  if (currentView === 'list') {
    renderListView();
  } else {
    renderWeekView();
  }
}

function renderListView() {
  const container = document.getElementById('listView');
  if (!container) return;

  // Filter appointments
  let filtered = appointments;
  if (currentFilter !== 'all') {
    filtered = filtered.filter(a => a.status === currentFilter);
  }

  // Sort by start time
  filtered.sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

  // Group by date
  const grouped = {};
  filtered.forEach(appt => {
    const date = new Date(appt.start_time).toDateString();
    if (!grouped[date]) {
      grouped[date] = [];
    }
    grouped[date].push(appt);
  });

  // Render HTML
  container.innerHTML = Object.entries(grouped).map(([date, appts]) => `
    <div class="appointment-day-group">
      <div class="appointment-day-header">${date}</div>
      ${appts.map(appt => renderAppointmentCard(appt)).join('')}
    </div>
  `).join('');
}

function renderWeekView() {
  // Simplified week view - you can enhance this with a full calendar grid
  const container = document.getElementById('weekView');
  if (!container) return;

  let filtered = appointments;
  if (currentFilter !== 'all') {
    filtered = filtered.filter(a => a.status === currentFilter);
  }

  container.innerHTML = `
    <div class="calendar-week-grid">
      ${filtered.map(appt => renderAppointmentCard(appt)).join('')}
    </div>
  `;
}

function renderAppointmentCard(appt) {
  const startTime = new Date(appt.start_time);
  const timeStr = startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const statusClass = `status-${appt.status}`;

  const contactName = appt.contact
    ? `${appt.contact.first_name} ${appt.contact.last_name}`
    : 'No contact';

  return `
    <div class="appointment-list-item ${statusClass}" data-id="${appt.id}">
      <div class="appointment-time">${timeStr}</div>
      <div class="appointment-details">
        <div class="appointment-title">${appt.title}</div>
        <div class="appointment-customer">${contactName}</div>
        ${appt.location ? `<div class="appointment-location">${appt.location}</div>` : ''}
      </div>
      <div class="appointment-status">
        <span class="status-badge ${statusClass}">${appt.status}</span>
      </div>
      <div class="appointment-actions">
        <button class="action-btn" title="Edit" data-id="${appt.id}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button class="action-btn" title="Delete" data-id="${appt.id}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
        </button>
      </div>
    </div>
  `;
}

// ============================================
// Modal Handling
// ============================================

function initializeModal() {
  const addAppointmentBtn = document.getElementById('addAppointmentBtn');
  const closeAppointmentModal = document.getElementById('closeAppointmentModal');
  const cancelAppointmentBtn = document.getElementById('cancelAppointmentBtn');
  const appointmentForm = document.getElementById('appointmentForm');

  if (addAppointmentBtn) {
    addAppointmentBtn.addEventListener('click', () => {
      editingAppointmentId = null;
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
    appointmentForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await saveAppointment();
    });
  }
}

async function openAppointmentModal(appointmentId = null) {
  const modal = document.getElementById('appointmentModal');
  const form = document.getElementById('appointmentForm');
  const modalTitle = modal?.querySelector('.modal-title');

  if (!modal || !form) return;

  if (appointmentId) {
    // Edit mode
    editingAppointmentId = appointmentId;
    modalTitle.textContent = 'Edit Appointment';

    try {
      const response = await apiGet(`/appointments/${appointmentId}`);
      const appt = response.data;

      // Populate form
      form.querySelector('[name="title"]').value = appt.title || '';
      form.querySelector('[name="contact_id"]').value = appt.contact_id || '';
      form.querySelector('[name="description"]').value = appt.description || '';
      form.querySelector('[name="location"]').value = appt.location || '';

      const startDate = new Date(appt.start_time);
      const endDate = new Date(appt.end_time);

      form.querySelector('[name="date"]').value = startDate.toISOString().split('T')[0];
      form.querySelector('[name="start_time"]').value = startDate.toTimeString().slice(0, 5);
      form.querySelector('[name="end_time"]').value = endDate.toTimeString().slice(0, 5);
      form.querySelector('[name="status"]').value = appt.status || 'scheduled';
      form.querySelector('[name="notes"]').value = appt.notes || '';
    } catch (error) {
      console.error('Failed to load appointment:', error);
      showToast('Failed to load appointment');
      return;
    }
  } else {
    // Add mode
    editingAppointmentId = null;
    modalTitle.textContent = 'New Appointment';
    form.reset();

    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    form.querySelector('[name="date"]').value = today;
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

async function saveAppointment() {
  const form = document.getElementById('appointmentForm');

  const date = form.querySelector('[name="date"]').value;
  const startTime = form.querySelector('[name="start_time"]').value;
  const endTime = form.querySelector('[name="end_time"]').value;

  const appointmentData = {
    title: form.querySelector('[name="title"]').value.trim(),
    description: form.querySelector('[name="description"]').value.trim() || null,
    contact_id: form.querySelector('[name="contact_id"]').value || null,
    location: form.querySelector('[name="location"]').value.trim() || null,
    start_time: `${date}T${startTime}:00`,
    end_time: `${date}T${endTime}:00`,
    status: form.querySelector('[name="status"]').value || 'scheduled',
    notes: form.querySelector('[name="notes"]').value.trim() || null,
    reminder_minutes: 30 // Default 30 min reminder
  };

  try {
    if (editingAppointmentId) {
      await apiPut(`/appointments/${editingAppointmentId}`, appointmentData);
      showToast('Appointment updated successfully!');
    } else {
      await apiPost('/appointments', appointmentData);
      showToast('Appointment created successfully!');
    }

    closeModal('appointmentModal');
    form.reset();
    editingAppointmentId = null;
    await loadAppointments();
  } catch (error) {
    console.error('Failed to save appointment:', error);
    showToast('Failed to save appointment: ' + error.message);
  }
}

// ============================================
// Appointment Actions
// ============================================

function initializeAppointmentActions() {
  document.addEventListener('click', async (e) => {
    const actionBtn = e.target.closest('.action-btn');
    if (!actionBtn) return;

    e.stopPropagation();

    const appointmentId = actionBtn.dataset.id;
    if (!appointmentId) return;

    const title = actionBtn.getAttribute('title');

    if (title === 'Edit') {
      await openAppointmentModal(appointmentId);
    } else if (title === 'Delete') {
      if (confirm('Delete this appointment?')) {
        await deleteAppointment(appointmentId);
      }
    }
  });

  // Click on appointment cards to view details
  document.addEventListener('click', async (e) => {
    const card = e.target.closest('.appointment-list-item');
    if (!card || e.target.closest('.action-btn')) return;

    const appointmentId = card.dataset.id;
    if (appointmentId) {
      await openAppointmentModal(appointmentId);
    }
  });
}

async function deleteAppointment(appointmentId) {
  try {
    await apiDelete(`/appointments/${appointmentId}`);
    showToast('Appointment deleted successfully!');
    await loadAppointments();
  } catch (error) {
    console.error('Failed to delete appointment:', error);
    showToast('Failed to delete appointment');
  }
}

async function updateAppointmentStatus(appointmentId, status) {
  try {
    await apiPut(`/appointments/${appointmentId}/status`, { status });
    showToast(`Appointment ${status}!`);
    await loadAppointments();
  } catch (error) {
    console.error('Failed to update status:', error);
    showToast('Failed to update status');
  }
}

// ============================================
// Toast Notifications
// ============================================

function showToast(message, duration = 3000) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('show');
  }, 10);

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, duration);
}
