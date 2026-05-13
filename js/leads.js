// Leads & Pipeline Management
import { requireAuth, logout as clearSession } from './shared/auth.js';
import { apiGet, apiPost, apiPut, apiDelete } from './shared/api.js';

let currentView = 'list';
let leads = [];
let contacts = [];
let editingLeadId = null;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  await initializePage();
});

async function initializePage() {
  try {
    // Check authentication
    if (!requireAuth()) {
      return;
    }

    // Load data
    await Promise.all([
      loadLeads(),
      loadContacts(),
      loadStats()
    ]);

    // Setup event listeners
    setupEventListeners();

    // Initialize sidebar
    initializeSidebar();
    initializeNotifications();
  } catch (error) {
    console.error('Initialization error:', error);
    showToast('Failed to load page', 'error');
  }
}

function setupEventListeners() {
  // View toggle
  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      switchView(view);
    });
  });

  // Search
  const searchInput = document.getElementById('searchInput');
  let searchTimeout;
  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => filterLeads(), 300);
  });

  // Stage filter
  document.getElementById('stageFilter').addEventListener('change', filterLeads);

  // Add lead button
  document.getElementById('addLeadBtn').addEventListener('click', () => openLeadModal());

  // Lead form
  document.getElementById('leadForm').addEventListener('submit', handleLeadSubmit);
}

async function loadLeads() {
  try {
    const response = await apiGet('/leads');
    if (response.success) {
      leads = response.data || [];
      renderLeads();
    }
  } catch (error) {
    console.error('Load leads error:', error);
    showToast('Failed to load leads', 'error');
  }
}

async function loadContacts() {
  try {
    const response = await apiGet('/contacts');
    if (response.success) {
      contacts = response.data || [];
      populateContactSelect();
    }
  } catch (error) {
    console.error('Load contacts error:', error);
  }
}

async function loadStats() {
  try {
    const response = await apiGet('/leads/stats');
    if (response.success) {
      const stats = response.data;

      document.getElementById('totalLeads').textContent = stats.total_leads || 0;
      document.getElementById('pipelineValue').textContent = formatCurrency(stats.total_value_cents || 0);
      document.getElementById('conversionRate').textContent = `${stats.conversion_rate || 0}%`;
      document.getElementById('avgDealSize').textContent = formatCurrency(stats.avg_deal_size_cents || 0);
    }
  } catch (error) {
    console.error('Load stats error:', error);
  }
}

function renderLeads() {
  if (currentView === 'list') {
    renderListView();
  } else {
    renderPipelineView();
  }
}

function renderListView() {
  const tbody = document.getElementById('leadsTableBody');

  if (leads.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7">
          <div class="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
            </svg>
            <h3>No leads yet</h3>
            <p>Create your first lead to start tracking your sales pipeline</p>
            <button class="btn btn-primary" onclick="openLeadModal()">Add Lead</button>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = leads.map(lead => `
    <tr>
      <td>
        <div class="lead-name">${escapeHtml(lead.lead_name)}</div>
      </td>
      <td>
        <div class="lead-contact">
          ${lead.contact ? `
            <div class="contact-name">${escapeHtml(lead.contact.first_name)} ${escapeHtml(lead.contact.last_name)}</div>
            <div class="contact-email">${escapeHtml(lead.contact.email || '')}</div>
          ` : '<span class="text-muted">No contact</span>'}
        </div>
      </td>
      <td>
        <span class="stage-badge ${lead.stage}">${getStageLabel(lead.stage)}</span>
      </td>
      <td>
        <div class="value-display">${formatCurrency(lead.estimated_value_cents)}</div>
      </td>
      <td>
        <div class="assigned-user">
          ${lead.assigned_user ? `
            <div class="user-avatar-small">${getInitials(lead.assigned_user.full_name)}</div>
            <span>${escapeHtml(lead.assigned_user.full_name)}</span>
          ` : '<span class="text-muted">Unassigned</span>'}
        </div>
      </td>
      <td>${formatDate(lead.created_at)}</td>
      <td>
        <div class="action-buttons">
          <button class="btn-icon-sm" onclick="viewLeadDetail('${lead.id}')" title="View Details">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </button>
          <button class="btn-icon-sm" onclick="editLead('${lead.id}')" title="Edit">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button class="btn-icon-sm" onclick="deleteLead('${lead.id}')" title="Delete">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

async function renderPipelineView() {
  try {
    const response = await apiGet('/leads/pipeline');
    if (!response.success) throw new Error('Failed to load pipeline');

    const { pipeline, stage_totals } = response.data;
    const boardEl = document.getElementById('pipelineBoard');

    const stages = [
      { key: 'new', label: 'New', color: '#e0e7ff' },
      { key: 'contacted', label: 'Contacted', color: '#dbeafe' },
      { key: 'qualified', label: 'Qualified', color: '#d1fae5' },
      { key: 'proposal', label: 'Proposal', color: '#fef3c7' },
      { key: 'negotiation', label: 'Negotiation', color: '#fed7aa' },
      { key: 'won', label: 'Won', color: '#d1fae5' },
      { key: 'lost', label: 'Lost', color: '#fee2e2' }
    ];

    boardEl.innerHTML = stages.map(stage => {
      const stageLeads = pipeline[stage.key] || [];
      const totals = stage_totals[stage.key] || { count: 0, total_value_cents: 0 };

      return `
        <div class="pipeline-column" data-stage="${stage.key}">
          <div class="pipeline-header">
            <div>
              <div class="pipeline-title">${stage.label}</div>
              <div class="text-sm text-muted">${formatCurrency(totals.total_value_cents)}</div>
            </div>
            <span class="pipeline-count">${totals.count}</span>
          </div>
          <div class="pipeline-cards" data-stage="${stage.key}">
            ${stageLeads.map(lead => renderLeadCard(lead)).join('')}
          </div>
        </div>
      `;
    }).join('');

    // Enable drag and drop
    enableDragAndDrop();
  } catch (error) {
    console.error('Render pipeline error:', error);
    showToast('Failed to load pipeline view', 'error');
  }
}

function renderLeadCard(lead) {
  return `
    <div class="lead-card" draggable="true" data-lead-id="${lead.id}" data-stage="${lead.stage}">
      <div class="lead-card-header">
        <div class="lead-card-title">${escapeHtml(lead.lead_name)}</div>
        <div class="lead-card-value">${formatCurrency(lead.estimated_value_cents)}</div>
      </div>
      ${lead.contact ? `
        <div class="lead-card-contact">
          ${escapeHtml(lead.contact.first_name)} ${escapeHtml(lead.contact.last_name)}
        </div>
      ` : ''}
      <div class="lead-card-meta">
        <span>${formatDate(lead.created_at)}</span>
        ${lead.assigned_user ? `<span>${escapeHtml(lead.assigned_user.full_name)}</span>` : ''}
      </div>
    </div>
  `;
}

function enableDragAndDrop() {
  const cards = document.querySelectorAll('.lead-card');
  const columns = document.querySelectorAll('.pipeline-cards');

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

function handleDragStart(e) {
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/html', this.innerHTML);
  e.dataTransfer.setData('leadId', this.dataset.leadId);
  e.dataTransfer.setData('currentStage', this.dataset.stage);
  this.classList.add('dragging');
}

function handleDragEnd(e) {
  this.classList.remove('dragging');
}

function handleDragOver(e) {
  if (e.preventDefault) {
    e.preventDefault();
  }
  e.dataTransfer.dropEffect = 'move';
  this.classList.add('drag-over');
  return false;
}

function handleDragLeave(e) {
  this.classList.remove('drag-over');
}

async function handleDrop(e) {
  if (e.stopPropagation) {
    e.stopPropagation();
  }
  e.preventDefault();

  const leadId = e.dataTransfer.getData('leadId');
  const currentStage = e.dataTransfer.getData('currentStage');
  const newStage = this.dataset.stage;

  this.classList.remove('drag-over');

  if (currentStage !== newStage) {
    await updateLeadStage(leadId, newStage);
  }

  return false;
}

async function updateLeadStage(leadId, newStage) {
  try {
    const response = await apiPut(`/leads/${leadId}`, { stage: newStage });
    if (response.success) {
      showToast('Lead stage updated', 'success');
      await loadLeads();
      await loadStats();
    }
  } catch (error) {
    console.error('Update stage error:', error);
    showToast('Failed to update lead stage', 'error');
  }
}

function switchView(view) {
  currentView = view;

  // Update buttons
  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === view);
  });

  // Toggle views
  document.getElementById('listView').classList.toggle('hidden', view !== 'list');
  document.getElementById('pipelineView').classList.toggle('hidden', view !== 'pipeline');

  // Render appropriate view
  renderLeads();
}

function filterLeads() {
  const search = document.getElementById('searchInput').value.toLowerCase();
  const stage = document.getElementById('stageFilter').value;

  const filtered = leads.filter(lead => {
    const matchesSearch = !search ||
      lead.lead_name.toLowerCase().includes(search) ||
      (lead.notes && lead.notes.toLowerCase().includes(search)) ||
      (lead.contact && `${lead.contact.first_name} ${lead.contact.last_name}`.toLowerCase().includes(search));

    const matchesStage = !stage || lead.stage === stage;

    return matchesSearch && matchesStage;
  });

  // Temporarily replace leads array for rendering
  const originalLeads = leads;
  leads = filtered;
  renderLeads();
  leads = originalLeads;
}

function openLeadModal(leadId = null) {
  editingLeadId = leadId;
  const modal = document.getElementById('leadModal');
  const form = document.getElementById('leadForm');
  const title = document.getElementById('modalTitle');

  form.reset();

  if (leadId) {
    title.textContent = 'Edit Lead';
    const lead = leads.find(l => l.id === leadId);
    if (lead) {
      form.lead_name.value = lead.lead_name || '';
      form.contact_id.value = lead.contact_id || '';
      form.stage.value = lead.stage || 'new';
      form.estimated_value.value = (lead.estimated_value_cents / 100).toFixed(2);
      form.product_interest.value = Array.isArray(lead.product_interest) ? lead.product_interest.join(', ') : '';
      form.notes.value = lead.notes || '';
    }
  } else {
    title.textContent = 'Add Lead';
  }

  modal.classList.add('show');
}

function closeLeadModal() {
  document.getElementById('leadModal').classList.remove('show');
  editingLeadId = null;
}

async function handleLeadSubmit(e) {
  e.preventDefault();

  const formData = new FormData(e.target);
  const submitBtn = document.getElementById('submitLeadBtn');

  submitBtn.disabled = true;
  submitBtn.textContent = 'Saving...';

  try {
    const data = {
      lead_name: formData.get('lead_name'),
      contact_id: formData.get('contact_id') || null,
      stage: formData.get('stage'),
      estimated_value_cents: Math.round(parseFloat(formData.get('estimated_value') || 0) * 100),
      product_interest: formData.get('product_interest')
        ? formData.get('product_interest').split(',').map(s => s.trim()).filter(Boolean)
        : [],
      notes: formData.get('notes') || ''
    };

    let response;
    if (editingLeadId) {
      response = await apiPut(`/leads/${editingLeadId}`, data);
    } else {
      response = await apiPost('/leads', data);
    }

    if (response.success) {
      showToast(editingLeadId ? 'Lead updated successfully' : 'Lead created successfully', 'success');
      closeLeadModal();
      await loadLeads();
      await loadStats();
    }
  } catch (error) {
    console.error('Submit lead error:', error);
    showToast(error.message || 'Failed to save lead', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Save Lead';
  }
}

function editLead(leadId) {
  openLeadModal(leadId);
}

async function deleteLead(leadId) {
  const lead = leads.find(l => l.id === leadId);
  if (!lead) return;

  if (!confirm(`Are you sure you want to delete "${lead.lead_name}"?`)) {
    return;
  }

  try {
    const response = await apiDelete(`/leads/${leadId}`);
    if (response.success) {
      showToast('Lead deleted successfully', 'success');
      await loadLeads();
      await loadStats();
    }
  } catch (error) {
    console.error('Delete lead error:', error);
    showToast('Failed to delete lead', 'error');
  }
}

async function viewLeadDetail(leadId) {
  try {
    const response = await apiGet(`/leads/${leadId}`);
    if (response.success) {
      const lead = response.data;
      showLeadDetail(lead);
    }
  } catch (error) {
    console.error('View lead error:', error);
    showToast('Failed to load lead details', 'error');
  }
}

function showLeadDetail(lead) {
  const modal = document.getElementById('leadDetailModal');
  const title = document.getElementById('leadDetailTitle');
  const content = document.getElementById('leadDetailContent');

  title.textContent = lead.lead_name;

  content.innerHTML = `
    <div class="lead-detail-content">
      <div class="detail-section">
        <h3>Lead Information</h3>
        <div class="detail-grid">
          <div class="detail-item">
            <label>Stage</label>
            <span class="stage-badge ${lead.stage}">${getStageLabel(lead.stage)}</span>
          </div>
          <div class="detail-item">
            <label>Value</label>
            <div>${formatCurrency(lead.estimated_value_cents)}</div>
          </div>
          <div class="detail-item">
            <label>Assigned To</label>
            <div>${lead.assigned_user ? escapeHtml(lead.assigned_user.full_name) : 'Unassigned'}</div>
          </div>
          <div class="detail-item">
            <label>Created</label>
            <div>${formatDateTime(lead.created_at)}</div>
          </div>
        </div>
      </div>

      ${lead.contact ? `
        <div class="detail-section">
          <h3>Contact Information</h3>
          <div class="detail-grid">
            <div class="detail-item">
              <label>Name</label>
              <div>${escapeHtml(lead.contact.first_name)} ${escapeHtml(lead.contact.last_name)}</div>
            </div>
            <div class="detail-item">
              <label>Email</label>
              <div>${escapeHtml(lead.contact.email || 'N/A')}</div>
            </div>
            <div class="detail-item">
              <label>Phone</label>
              <div>${escapeHtml(lead.contact.phone || 'N/A')}</div>
            </div>
          </div>
        </div>
      ` : ''}

      ${lead.product_interest && lead.product_interest.length > 0 ? `
        <div class="detail-section">
          <h3>Product Interest</h3>
          <div class="tags">
            ${lead.product_interest.map(item => `<span class="tag">${escapeHtml(item)}</span>`).join('')}
          </div>
        </div>
      ` : ''}

      ${lead.notes ? `
        <div class="detail-section">
          <h3>Notes</h3>
          <p>${escapeHtml(lead.notes)}</p>
        </div>
      ` : ''}

      <div class="modal-actions">
        <button class="btn btn-secondary" onclick="closeLeadDetailModal()">Close</button>
        <button class="btn btn-primary" onclick="editLead('${lead.id}'); closeLeadDetailModal();">Edit Lead</button>
      </div>
    </div>
  `;

  modal.classList.add('show');
}

function closeLeadDetailModal() {
  document.getElementById('leadDetailModal').classList.remove('show');
}

function populateContactSelect() {
  const select = document.getElementById('contactSelect');
  select.innerHTML = '<option value="">Select contact (optional)</option>' +
    contacts.map(contact => `
      <option value="${contact.id}">${escapeHtml(contact.first_name)} ${escapeHtml(contact.last_name)}</option>
    `).join('');
}

// Helper functions
function getStageLabel(stage) {
  const labels = {
    new: 'New',
    contacted: 'Contacted',
    qualified: 'Qualified',
    proposal: 'Proposal',
    negotiation: 'Negotiation',
    won: 'Won',
    lost: 'Lost'
  };
  return labels[stage] || stage;
}

function formatCurrency(cents) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format((cents || 0) / 100);
}

function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTime(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showToast(message, type = 'info') {
  // Implement toast notification
  console.log(`[${type.toUpperCase()}] ${message}`);
}

// Sidebar & Navigation
function initializeSidebar() {
  const sidebar = document.getElementById('sidebar');
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const sidebarToggle = document.getElementById('sidebarToggle');

  if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', () => {
      sidebar.classList.toggle('mobile-open');
    });
  }

  if (sidebarToggle) {
    sidebarToggle.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
    });
  }

  // Close sidebar when clicking outside on mobile
  document.addEventListener('click', (e) => {
    if (window.innerWidth <= 768) {
      if (!sidebar.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
        sidebar.classList.remove('mobile-open');
      }
    }
  });
}

function initializeNotifications() {
  const notifBtn = document.getElementById('notificationsBtn');
  if (notifBtn) {
    notifBtn.addEventListener('click', () => {
      showToast('Notifications feature coming soon', 'info');
    });
  }
}

function logout() {
  clearSession();
  window.location.href = '/frontend/login.html';
}
