/**
 * Dashboard Overview - Real Backend Integration
 * Loads stats and displays dashboard widgets
 */

import { requireAuth } from './shared/auth.js';
import { apiGet } from './shared/api.js';

// State
const dashboardState = {
  stats: null,
  tasks: [],
  recentActivity: [],
  notifications: []
};

// =============================================
// Initialize Dashboard
// =============================================

document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth()) return;

  await loadDashboardData();
  initializeNotificationPanel();
});

// =============================================
// Load All Dashboard Data
// =============================================

async function loadDashboardData() {
  try {
    // Load all stats in parallel
    const [
      contactsStats,
      reviewsStats,
      tasksStats,
      leadsStats,
      appointmentsStats,
      voiceNotesStats
    ] = await Promise.all([
      apiGet('/contacts/stats').catch(() => ({ data: {} })),
      apiGet('/reviews/stats').catch(() => ({ data: {} })),
      apiGet('/tasks/stats').catch(() => ({ data: {} })),
      apiGet('/leads/stats').catch(() => ({ data: {} })),
      apiGet('/appointments/stats').catch(() => ({ data: {} })),
      apiGet('/voice-notes/stats').catch(() => ({ data: {} }))
    ]);

    // Update dashboard with real data
    updateStatsCards({
      contacts: contactsStats.data,
      reviews: reviewsStats.data,
      tasks: tasksStats.data,
      leads: leadsStats.data,
      appointments: appointmentsStats.data,
      voiceNotes: voiceNotesStats.data
    });

    // Load tasks
    await loadTasks();

    console.log('Dashboard data loaded');
  } catch (error) {
    console.error('Error loading dashboard data:', error);
  }
}

// =============================================
// Update Stats Cards
// =============================================

function updateStatsCards(stats) {
  // Total Contacts
  const totalContactsEl = document.querySelector('.stat-card:nth-child(1) .stat-value');
  if (totalContactsEl && stats.contacts) {
    totalContactsEl.textContent = stats.contacts.total || 0;
  }

  // Reviews
  const avgRatingEl = document.querySelector('.stat-card:nth-child(2) .stat-value');
  if (avgRatingEl && stats.reviews) {
    avgRatingEl.textContent = (stats.reviews.average_rating || 0).toFixed(1);
  }

  // Profile Views (if available)
  const profileViewsEl = document.querySelector('.stat-card:nth-child(3) .stat-value');
  if (profileViewsEl && stats.voiceNotes) {
    profileViewsEl.textContent = stats.voiceNotes.total || 0;
  }

  // Response Rate (from tasks completed)
  const responseRateEl = document.querySelector('.stat-card:nth-child(4) .stat-value');
  if (responseRateEl && stats.tasks) {
    const completed = stats.tasks.completed || 0;
    const total = stats.tasks.total || 1;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
    responseRateEl.textContent = `${rate}%`;
  }

  // Update quick stats in cards
  updateQuickStats(stats);
}

function updateQuickStats(stats) {
  // Update Contacts Card
  if (stats.contacts) {
    const newContactsEl = document.querySelector('.quick-stats .quick-stat:nth-child(1) .quick-stat-value');
    if (newContactsEl) {
      newContactsEl.textContent = `+${stats.contacts.new_today || 0}`;
    }
  }

  // Update Reviews Card
  if (stats.reviews) {
    const pendingReviewsEl = document.querySelector('.quick-stats .quick-stat:nth-child(2) .quick-stat-value');
    if (pendingReviewsEl) {
      pendingReviewsEl.textContent = stats.reviews.pending || 0;
    }
  }

  // Update Appointments Card
  if (stats.appointments) {
    const todayApptsEl = document.getElementById('todayAppointments');
    if (todayApptsEl) {
      todayApptsEl.textContent = stats.appointments.today || 0;
    }
    const upcomingApptsEl = document.getElementById('upcomingAppointments');
    if (upcomingApptsEl) {
      upcomingApptsEl.textContent = stats.appointments.upcoming || 0;
    }
  }

  // Update AI Stats
  if (stats.voiceNotes) {
    const aiConversationsEl = document.querySelector('.ai-stats .ai-stat:nth-child(1) .ai-stat-value');
    if (aiConversationsEl) {
      aiConversationsEl.textContent = stats.voiceNotes.total || 0;
    }
  }
}

// =============================================
// Load Tasks
// =============================================

async function loadTasks() {
  try {
    const response = await apiGet('/tasks?status=pending&limit=4');
    dashboardState.tasks = response.data || [];

    renderTasks(dashboardState.tasks);
  } catch (error) {
    console.error('Error loading tasks:', error);
  }
}

function renderTasks(tasks) {
  const tasksList = document.querySelector('.tasks-list');
  if (!tasksList) return;

  if (tasks.length === 0) {
    tasksList.innerHTML = `
      <div style="padding: 20px; text-align: center; color: #666;">
        <p>No pending tasks</p>
      </div>
    `;
    return;
  }

  tasksList.innerHTML = tasks.map(task => {
    const priority = task.priority || 'medium';
    const priorityClass = priority.toLowerCase();

    return `
      <label class="task-item">
        <input type="checkbox" class="task-checkbox" data-task-id="${task.id}">
        <span class="task-text">${escapeHTML(task.title || '')}</span>
        <span class="task-priority ${priorityClass}">${capitalize(priority)}</span>
      </label>
    `;
  }).join('');

  // Add event listeners to checkboxes
  tasksList.querySelectorAll('.task-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', async (e) => {
      const taskId = e.target.dataset.taskId;
      if (e.target.checked) {
        await completeTask(taskId);
        e.target.closest('.task-item').style.opacity = '0.5';
      }
    });
  });

  // Update task count
  const taskCountEl = document.querySelector('.task-count');
  if (taskCountEl) {
    taskCountEl.textContent = tasks.length;
  }
}

async function completeTask(taskId) {
  try {
    await apiGet(`/tasks/${taskId}/complete`, {}, { method: 'PUT' });
    // Reload tasks
    await loadTasks();
    // Reload stats
    await loadDashboardData();
  } catch (error) {
    console.error('Error completing task:', error);
  }
}

// =============================================
// Notification Panel
// =============================================

function initializeNotificationPanel() {
  const notificationBtn = document.getElementById('notificationBtn');
  const notificationPanel = document.getElementById('notificationPanel');
  const closeBtn = document.getElementById('closeNotificationPanel');

  if (notificationBtn && notificationPanel) {
    notificationBtn.addEventListener('click', () => {
      notificationPanel.style.display = 'block';
      loadNotifications();
    });
  }

  if (closeBtn && notificationPanel) {
    closeBtn.addEventListener('click', () => {
      notificationPanel.style.display = 'none';
    });
  }

  // Close on outside click
  if (notificationPanel) {
    document.addEventListener('click', (e) => {
      if (!notificationPanel.contains(e.target) && !notificationBtn?.contains(e.target)) {
        notificationPanel.style.display = 'none';
      }
    });
  }
}

async function loadNotifications() {
  try {
    // In a real implementation, this would fetch from /api/notifications
    // For now, we'll use the static notifications in the HTML
    console.log('Notifications loaded from HTML');
  } catch (error) {
    console.error('Error loading notifications:', error);
  }
}

// =============================================
// Utility Functions
// =============================================

function escapeHTML(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// =============================================
// Export for global access
// =============================================

window.dashboardOverview = {
  refresh: loadDashboardData
};

console.log('✓ Dashboard Overview loaded');
