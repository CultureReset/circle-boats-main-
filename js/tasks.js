/**
 * Tasks & Reminders Management
 */

import { requireAuth } from './shared/auth.js';
import { apiGet, apiPost, apiPut, apiDelete } from './shared/api.js';

let currentView = 'list';
let tasks = [];
let contacts = [];
let leads = [];
let currentFilter = 'all';
let currentEditingTaskId = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  initializeTasks();
});

async function initializeTasks() {
  // Require authentication
  if (!requireAuth()) return;

  try {
    // Load initial data
    await Promise.all([
      loadTasks(),
      loadContacts(),
      loadLeads(),
      loadStats()
    ]);

    // Set up event listeners
    setupEventListeners();

    // Load user info
    loadUserInfo();
  } catch (error) {
    console.error('Initialization error:', error);
    showNotification('Failed to initialize tasks page', 'error');
  }
}

function setupEventListeners() {
  // View toggle
  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const view = e.currentTarget.dataset.view;
      switchView(view);
    });
  });

  // Quick filters
  document.querySelectorAll('.quick-filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const filter = e.currentTarget.dataset.filter;
      applyQuickFilter(filter);
    });
  });

  // Search
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', debounce(handleSearch, 300));
  }

  // Status filter
  const statusFilter = document.getElementById('statusFilter');
  if (statusFilter) {
    statusFilter.addEventListener('change', loadTasks);
  }

  // Priority filter
  const priorityFilter = document.getElementById('priorityFilter');
  if (priorityFilter) {
    priorityFilter.addEventListener('change', loadTasks);
  }

  // Add task button
  const addTaskBtn = document.getElementById('addTaskBtn');
  if (addTaskBtn) {
    addTaskBtn.addEventListener('click', () => openTaskModal());
  }

  // Task form
  const taskForm = document.getElementById('taskForm');
  if (taskForm) {
    taskForm.addEventListener('submit', handleTaskSubmit);
  }

  // Mobile menu
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', toggleSidebar);
  }

  // Sidebar toggle
  const sidebarToggle = document.getElementById('sidebarToggle');
  if (sidebarToggle) {
    sidebarToggle.addEventListener('click', toggleSidebar);
  }
}

// Load Data Functions
async function loadTasks() {
  try {
    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('statusFilter');
    const priorityFilter = document.getElementById('priorityFilter');

    const params = new URLSearchParams();
    if (searchInput?.value) params.append('search', searchInput.value);
    if (statusFilter?.value) params.append('status', statusFilter.value);
    if (priorityFilter?.value) params.append('priority', priorityFilter.value);

    const response = await apiGet(`/tasks?${params.toString()}`);
    tasks = response.data || [];

    renderTasks();
    updateQuickFilterCounts();
  } catch (error) {
    console.error('Load tasks error:', error);
    showNotification('Failed to load tasks', 'error');
  }
}

async function loadContacts() {
  try {
    const response = await apiGet('/contacts?limit=1000');
    contacts = response.data || [];
    populateContactSelect();
  } catch (error) {
    console.error('Load contacts error:', error);
  }
}

async function loadLeads() {
  try {
    const response = await apiGet('/leads?limit=1000');
    leads = response.data || [];
    populateLeadSelect();
  } catch (error) {
    console.error('Load leads error:', error);
  }
}

async function loadStats() {
  try {
    const response = await apiGet('/tasks/stats');
    const stats = response.data;

    document.getElementById('totalTasks').textContent = stats.total_tasks || 0;
    document.getElementById('overdueTasks').textContent = stats.overdue_tasks || 0;
    document.getElementById('inProgressTasks').textContent = stats.by_status?.in_progress || 0;
    document.getElementById('completedTasksStat').textContent = stats.by_status?.completed || 0;
  } catch (error) {
    console.error('Load stats error:', error);
  }
}

// Render Functions
function renderTasks() {
  if (currentView === 'list') {
    renderListView();
  } else {
    renderBoardView();
  }
}

function renderListView() {
  const tbody = document.getElementById('tasksTableBody');
  if (!tbody) return;

  const filteredTasks = getFilteredTasks();

  if (filteredTasks.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center">No tasks found</td></tr>';
    return;
  }

  tbody.innerHTML = filteredTasks.map(task => {
    const isOverdue = task.due_at && new Date(task.due_at) < new Date() && task.status !== 'completed';
    const isToday = task.due_at && isDateToday(new Date(task.due_at));
    const isCompleted = task.status === 'completed';

    return `
      <tr class="${isCompleted ? 'task-completed' : ''}">
        <td>
          <input type="checkbox"
                 class="task-checkbox"
                 ${isCompleted ? 'checked' : ''}
                 onchange="toggleTaskComplete('${task.id}', this.checked)">
        </td>
        <td>
          <div class="task-title">
            <span>${escapeHtml(task.title)}</span>
            ${task.description ? `<span class="task-description">${escapeHtml(truncate(task.description, 60))}</span>` : ''}
          </div>
        </td>
        <td>
          <span class="priority-badge ${task.priority || 'medium'}">
            ${(task.priority || 'medium').toUpperCase()}
          </span>
        </td>
        <td>
          <div class="task-related">
            ${task.contact ? `
              <div class="related-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                <a href="contacts.html?id=${task.contact.id}">
                  ${escapeHtml(task.contact.first_name)} ${escapeHtml(task.contact.last_name)}
                </a>
              </div>
            ` : ''}
            ${task.lead ? `
              <div class="related-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <polyline points="17 8 12 13 8 9"/>
                </svg>
                <a href="leads.html?id=${task.lead.id}">
                  ${escapeHtml(task.lead.lead_name)}
                </a>
              </div>
            ` : ''}
            ${!task.contact && !task.lead ? '<span class="text-muted">—</span>' : ''}
          </div>
        </td>
        <td>
          ${task.assigned_user ? `
            <div class="assigned-user">
              <div class="user-avatar-small">
                ${getInitials(task.assigned_user.full_name)}
              </div>
              <span>${escapeHtml(task.assigned_user.full_name)}</span>
            </div>
          ` : '<span class="text-muted">Unassigned</span>'}
        </td>
        <td>
          ${task.due_at ? `
            <div class="due-date ${isOverdue ? 'overdue' : isToday ? 'today' : 'upcoming'}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              ${formatDate(task.due_at)}
            </div>
          ` : '<span class="text-muted">No due date</span>'}
        </td>
        <td>
          <span class="status-badge ${task.status}">
            ${formatStatus(task.status)}
          </span>
        </td>
        <td>
          <div class="action-buttons">
            <button class="btn-icon-sm" onclick="viewTaskDetail('${task.id}')" title="View Details">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </button>
            <button class="btn-icon-sm" onclick="openTaskModal('${task.id}')" title="Edit">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button class="btn-icon-sm" onclick="deleteTask('${task.id}')" title="Delete">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

async function renderBoardView() {
  const boardContainer = document.getElementById('taskBoard');
  if (!boardContainer) return;

  try {
    const response = await apiGet('/tasks/board');
    const board = response.data.board;

    const statusConfig = [
      { key: 'todo', title: 'To Do', color: '#6b7280' },
      { key: 'in_progress', title: 'In Progress', color: '#3b82f6' },
      { key: 'completed', title: 'Completed', color: '#10b981' },
      { key: 'cancelled', title: 'Cancelled', color: '#ef4444' }
    ];

    boardContainer.innerHTML = statusConfig.map(status => {
      const statusTasks = board[status.key] || [];

      return `
        <div class="board-column" data-status="${status.key}">
          <div class="board-header">
            <div class="board-title">${status.title}</div>
            <div class="board-count">${statusTasks.length}</div>
          </div>
          <div class="board-cards" data-status="${status.key}">
            ${statusTasks.length === 0 ? `
              <div class="empty-state" style="padding: 2rem 1rem; font-size: 0.875rem;">
                No tasks
              </div>
            ` : statusTasks.map(task => renderTaskCard(task)).join('')}
          </div>
        </div>
      `;
    }).join('');

    enableDragAndDrop();
  } catch (error) {
    console.error('Render board error:', error);
    boardContainer.innerHTML = '<div class="empty-board">Failed to load board</div>';
  }
}

function renderTaskCard(task) {
  const isOverdue = task.due_at && new Date(task.due_at) < new Date() && task.status !== 'completed';
  const isToday = task.due_at && isDateToday(new Date(task.due_at));
  const isCompleted = task.status === 'completed';

  return `
    <div class="task-card ${isOverdue ? 'overdue' : ''}"
         draggable="true"
         data-task-id="${task.id}">
      <div class="task-card-header">
        <input type="checkbox"
               class="task-card-checkbox"
               ${isCompleted ? 'checked' : ''}
               onchange="toggleTaskComplete('${task.id}', this.checked)">
        <div class="task-card-content">
          <div class="task-card-title">${escapeHtml(task.title)}</div>
          ${task.description ? `
            <div class="task-card-description">${escapeHtml(truncate(task.description, 80))}</div>
          ` : ''}
        </div>
      </div>
      <div class="task-card-meta">
        <div class="task-card-row">
          <span class="priority-badge ${task.priority || 'medium'}">
            ${(task.priority || 'medium').toUpperCase()}
          </span>
          ${task.due_at ? `
            <div class="task-card-due ${isOverdue ? 'overdue' : isToday ? 'today' : ''}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              ${formatDate(task.due_at, true)}
            </div>
          ` : ''}
        </div>
        ${task.assigned_user || task.contact || task.lead ? `
          <div class="task-card-row">
            ${task.assigned_user ? `
              <div class="task-card-assigned">
                <div class="user-avatar-small">
                  ${getInitials(task.assigned_user.full_name)}
                </div>
                <span>${escapeHtml(task.assigned_user.full_name.split(' ')[0])}</span>
              </div>
            ` : '<span></span>'}
            ${task.contact ? `
              <span style="font-size: 0.75rem; color: #9ca3af;">
                ${escapeHtml(task.contact.first_name)} ${escapeHtml(task.contact.last_name)}
              </span>
            ` : task.lead ? `
              <span style="font-size: 0.75rem; color: #9ca3af;">
                ${escapeHtml(truncate(task.lead.lead_name, 20))}
              </span>
            ` : ''}
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

// Drag and Drop
function enableDragAndDrop() {
  const cards = document.querySelectorAll('.task-card');
  const columns = document.querySelectorAll('.board-cards');

  cards.forEach(card => {
    card.addEventListener('dragstart', handleDragStart);
    card.addEventListener('dragend', handleDragEnd);
  });

  columns.forEach(column => {
    column.addEventListener('dragover', handleDragOver);
    column.addEventListener('drop', handleDrop);
    column.addEventListener('dragleave', handleDragLeave);
  });
}

let draggedElement = null;

function handleDragStart(e) {
  draggedElement = e.currentTarget;
  e.currentTarget.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/html', e.currentTarget.innerHTML);
}

function handleDragEnd(e) {
  e.currentTarget.classList.remove('dragging');
  document.querySelectorAll('.board-cards').forEach(col => {
    col.classList.remove('drag-over');
  });
}

function handleDragOver(e) {
  if (e.preventDefault) {
    e.preventDefault();
  }
  e.dataTransfer.dropEffect = 'move';
  e.currentTarget.classList.add('drag-over');
  return false;
}

function handleDragLeave(e) {
  e.currentTarget.classList.remove('drag-over');
}

async function handleDrop(e) {
  if (e.stopPropagation) {
    e.stopPropagation();
  }
  e.preventDefault();

  const newStatus = e.currentTarget.dataset.status;
  const taskId = draggedElement.dataset.taskId;

  if (taskId && newStatus) {
    await updateTaskStatus(taskId, newStatus);
  }

  return false;
}

// Task Actions
async function toggleTaskComplete(taskId, isCompleted) {
  try {
    const newStatus = isCompleted ? 'completed' : 'todo';
    await updateTaskStatus(taskId, newStatus);
  } catch (error) {
    console.error('Toggle complete error:', error);
    showNotification('Failed to update task', 'error');
  }
}

async function updateTaskStatus(taskId, newStatus) {
  try {
    await apiPut(`/tasks/${taskId}/status`, { status: newStatus });
    await loadTasks();
    await loadStats();
    showNotification('Task status updated', 'success');
  } catch (error) {
    console.error('Update status error:', error);
    showNotification('Failed to update task status', 'error');
    throw error;
  }
}

async function deleteTask(taskId) {
  if (!confirm('Are you sure you want to delete this task?')) {
    return;
  }

  try {
    await apiDelete(`/tasks/${taskId}`);
    await loadTasks();
    await loadStats();
    showNotification('Task deleted successfully', 'success');
  } catch (error) {
    console.error('Delete task error:', error);
    showNotification('Failed to delete task', 'error');
  }
}

// Modal Functions
function openTaskModal(taskId = null) {
  currentEditingTaskId = taskId;
  const modal = document.getElementById('taskModal');
  const modalTitle = document.getElementById('modalTitle');
  const form = document.getElementById('taskForm');

  if (taskId) {
    modalTitle.textContent = 'Edit Task';
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      form.elements.title.value = task.title || '';
      form.elements.description.value = task.description || '';
      form.elements.priority.value = task.priority || 'medium';
      form.elements.status.value = task.status || 'todo';
      form.elements.due_at.value = task.due_at ? formatDateForInput(task.due_at) : '';
      form.elements.reminder_at.value = task.reminder_at ? formatDateForInput(task.reminder_at) : '';
      form.elements.contact_id.value = task.contact_id || '';
      form.elements.lead_id.value = task.lead_id || '';
      form.elements.assigned_to.value = task.assigned_to || '';
    }
  } else {
    modalTitle.textContent = 'Add Task';
    form.reset();
  }

  modal.classList.add('active');
}

function closeTaskModal() {
  const modal = document.getElementById('taskModal');
  modal.classList.remove('active');
  currentEditingTaskId = null;
  document.getElementById('taskForm').reset();
}

async function handleTaskSubmit(e) {
  e.preventDefault();

  const form = e.target;
  const submitBtn = document.getElementById('submitTaskBtn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Saving...';

  try {
    const formData = {
      title: form.elements.title.value.trim(),
      description: form.elements.description.value.trim() || null,
      priority: form.elements.priority.value,
      status: form.elements.status.value,
      due_at: form.elements.due_at.value || null,
      reminder_at: form.elements.reminder_at.value || null,
      contact_id: form.elements.contact_id.value || null,
      lead_id: form.elements.lead_id.value || null,
      assigned_to: form.elements.assigned_to.value || null
    };

    if (currentEditingTaskId) {
      await apiPut(`/tasks/${currentEditingTaskId}`, formData);
      showNotification('Task updated successfully', 'success');
    } else {
      await apiPost('/tasks', formData);
      showNotification('Task created successfully', 'success');
    }

    closeTaskModal();
    await loadTasks();
    await loadStats();
  } catch (error) {
    console.error('Submit task error:', error);
    showNotification(error.response?.data?.error || 'Failed to save task', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Save Task';
  }
}

async function viewTaskDetail(taskId) {
  const modal = document.getElementById('taskDetailModal');
  const content = document.getElementById('taskDetailContent');

  try {
    const response = await apiGet(`/tasks/${taskId}`);
    const task = response.data;

    const isOverdue = task.due_at && new Date(task.due_at) < new Date() && task.status !== 'completed';

    content.innerHTML = `
      <div class="task-detail-header">
        <div class="task-detail-info">
          <div class="task-detail-title">${escapeHtml(task.title)}</div>
          <div class="task-detail-badges">
            <span class="status-badge ${task.status}">${formatStatus(task.status)}</span>
            <span class="priority-badge ${task.priority}">${task.priority.toUpperCase()}</span>
            ${isOverdue ? '<span class="status-badge" style="background: #fee2e2; color: #991b1b;">OVERDUE</span>' : ''}
          </div>
        </div>
        <div class="task-detail-actions">
          <button class="btn btn-secondary" onclick="openTaskModal('${task.id}')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            Edit
          </button>
        </div>
      </div>

      <div class="task-detail-body">
        <div class="task-detail-main">
          ${task.description ? `
            <div class="task-detail-section">
              <h3>Description</h3>
              <div class="task-detail-description">${escapeHtml(task.description)}</div>
            </div>
          ` : ''}

          <div class="task-detail-section">
            <h3>Related Items</h3>
            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
              ${task.contact ? `
                <a href="contacts.html?id=${task.contact.id}" style="color: #3b82f6; text-decoration: none;">
                  📞 ${escapeHtml(task.contact.first_name)} ${escapeHtml(task.contact.last_name)}
                </a>
              ` : ''}
              ${task.lead ? `
                <a href="leads.html?id=${task.lead.id}" style="color: #3b82f6; text-decoration: none;">
                  💼 ${escapeHtml(task.lead.lead_name)}
                </a>
              ` : ''}
              ${!task.contact && !task.lead ? '<p style="color: #9ca3af; font-size: 0.875rem;">No related items</p>' : ''}
            </div>
          </div>
        </div>

        <div class="task-detail-sidebar">
          <div class="detail-info-card">
            <h4>Task Info</h4>
            <div class="detail-info-item">
              <span class="detail-info-label">Status</span>
              <span class="detail-info-value">${formatStatus(task.status)}</span>
            </div>
            <div class="detail-info-item">
              <span class="detail-info-label">Priority</span>
              <span class="detail-info-value">${task.priority.toUpperCase()}</span>
            </div>
            ${task.due_at ? `
              <div class="detail-info-item">
                <span class="detail-info-label">Due Date</span>
                <span class="detail-info-value">${formatDate(task.due_at)}</span>
              </div>
            ` : ''}
            ${task.reminder_at ? `
              <div class="detail-info-item">
                <span class="detail-info-label">Reminder</span>
                <span class="detail-info-value">${formatDate(task.reminder_at)}</span>
              </div>
            ` : ''}
            ${task.assigned_user ? `
              <div class="detail-info-item">
                <span class="detail-info-label">Assigned To</span>
                <span class="detail-info-value">${escapeHtml(task.assigned_user.full_name)}</span>
              </div>
            ` : ''}
            <div class="detail-info-item">
              <span class="detail-info-label">Created</span>
              <span class="detail-info-value">${formatDate(task.created_at)}</span>
            </div>
            ${task.completed_at ? `
              <div class="detail-info-item">
                <span class="detail-info-label">Completed</span>
                <span class="detail-info-value">${formatDate(task.completed_at)}</span>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;

    modal.classList.add('active');
  } catch (error) {
    console.error('Load task detail error:', error);
    showNotification('Failed to load task details', 'error');
  }
}

function closeTaskDetailModal() {
  const modal = document.getElementById('taskDetailModal');
  modal.classList.remove('active');
}

// Filter Functions
function switchView(view) {
  currentView = view;

  // Update buttons
  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === view);
  });

  // Update views
  document.getElementById('listView').classList.toggle('hidden', view !== 'list');
  document.getElementById('boardView').classList.toggle('hidden', view !== 'board');

  renderTasks();
}

function applyQuickFilter(filter) {
  currentFilter = filter;

  // Update buttons
  document.querySelectorAll('.quick-filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === filter);
  });

  renderTasks();
}

function getFilteredTasks() {
  let filtered = [...tasks];

  switch (currentFilter) {
    case 'overdue':
      filtered = filtered.filter(task =>
        task.due_at &&
        new Date(task.due_at) < new Date() &&
        task.status !== 'completed'
      );
      break;
    case 'today':
      filtered = filtered.filter(task =>
        task.due_at &&
        isDateToday(new Date(task.due_at))
      );
      break;
    case 'upcoming':
      filtered = filtered.filter(task => {
        if (!task.due_at || task.status === 'completed') return false;
        const dueDate = new Date(task.due_at);
        const today = new Date();
        const daysDiff = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
        return daysDiff > 0 && daysDiff <= 7;
      });
      break;
    case 'completed':
      filtered = filtered.filter(task => task.status === 'completed');
      break;
  }

  return filtered;
}

function updateQuickFilterCounts() {
  const now = new Date();

  const overdue = tasks.filter(task =>
    task.due_at &&
    new Date(task.due_at) < now &&
    task.status !== 'completed'
  ).length;

  const today = tasks.filter(task =>
    task.due_at &&
    isDateToday(new Date(task.due_at))
  ).length;

  const upcoming = tasks.filter(task => {
    if (!task.due_at || task.status === 'completed') return false;
    const dueDate = new Date(task.due_at);
    const daysDiff = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
    return daysDiff > 0 && daysDiff <= 7;
  }).length;

  const completed = tasks.filter(task => task.status === 'completed').length;

  document.getElementById('allCount').textContent = tasks.length;
  document.getElementById('overdueCount').textContent = overdue;
  document.getElementById('todayCount').textContent = today;
  document.getElementById('upcomingCount').textContent = upcoming;
  document.getElementById('completedCount').textContent = completed;
}

function handleSearch() {
  loadTasks();
}

// Populate Selects
function populateContactSelect() {
  const select = document.getElementById('contactSelect');
  if (!select) return;

  select.innerHTML = '<option value="">Select contact (optional)</option>' +
    contacts.map(contact => `
      <option value="${contact.id}">
        ${escapeHtml(contact.first_name)} ${escapeHtml(contact.last_name)}
      </option>
    `).join('');
}

function populateLeadSelect() {
  const select = document.getElementById('leadSelect');
  if (!select) return;

  select.innerHTML = '<option value="">Select lead (optional)</option>' +
    leads.map(lead => `
      <option value="${lead.id}">
        ${escapeHtml(lead.lead_name)}
      </option>
    `).join('');
}

// User Functions
async function loadUserInfo() {
  try {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) {
      const userNameEl = document.getElementById('userName');
      if (userNameEl) {
        userNameEl.textContent = user.full_name || user.email;
      }

      // Populate assigned to select
      const assignedToSelect = document.getElementById('assignedToSelect');
      if (assignedToSelect) {
        assignedToSelect.innerHTML = `
          <option value="">Select user (optional)</option>
          <option value="${user.id}" selected>${escapeHtml(user.full_name || user.email)}</option>
        `;
      }
    }
  } catch (error) {
    console.error('Load user info error:', error);
  }
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '../../pages/auth/login.html';
}

// Utility Functions
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (sidebar) {
    sidebar.classList.toggle('collapsed');
  }
}

function formatStatus(status) {
  const map = {
    'todo': 'To Do',
    'in_progress': 'In Progress',
    'completed': 'Completed',
    'cancelled': 'Cancelled'
  };
  return map[status] || status;
}

function formatDate(dateString, short = false) {
  if (!dateString) return '';
  const date = new Date(dateString);

  if (short) {
    const today = new Date();
    if (isDateToday(date)) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

function formatDateForInput(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function isDateToday(date) {
  const today = new Date();
  return date.getDate() === today.getDate() &&
         date.getMonth() === today.getMonth() &&
         date.getFullYear() === today.getFullYear();
}

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function truncate(text, length) {
  if (!text || text.length <= length) return text;
  return text.substring(0, length) + '...';
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function showNotification(message, type = 'info') {
  console.log(`[${type.toUpperCase()}] ${message}`);
  // TODO: Implement toast notification UI
}
