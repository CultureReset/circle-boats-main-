/**
 * Custom Fields Manager - Backend Integration
 * Manages custom CRM fields extracted from voice conversations
 */

import { requireAuth } from './shared/auth.js';
import { apiGet, apiPost, apiPut, apiDelete } from './shared/api.js';

// State
const state = {
  fields: [],
  templates: [],
  editingField: null
};

// =============================================
// Initialize
// =============================================

document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth()) return;

  await loadCustomFields();
  initializeEventListeners();
});

// =============================================
// Load Custom Fields
// =============================================

async function loadCustomFields() {
  try {
    const response = await apiGet('/custom-fields');
    state.fields = response.data || [];

    renderFields(state.fields);
    updateStats(state.fields);

    console.log('Custom fields loaded:', state.fields.length);
  } catch (error) {
    console.error('Error loading custom fields:', error);
    showNotification('Failed to load custom fields', 'error');
  }
}

// =============================================
// Render Fields
// =============================================

function renderFields(fields) {
  const container = document.getElementById('fieldsContainer');
  if (!container) return;

  if (fields.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📋</div>
        <h3>No Custom Fields Yet</h3>
        <p>Create custom fields to extract specific information from customer conversations</p>
        <button class="btn-primary" onclick="window.customFields.openNewFieldModal()">
          <i class="fas fa-plus"></i> Create First Field
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = fields.map(field => `
    <div class="field-card" data-field-id="${field.id}">
      <div class="field-header">
        <div class="field-icon">
          ${getFieldIcon(field.field_type)}
        </div>
        <div class="field-info">
          <h3>${escapeHTML(field.field_name)}</h3>
          <p class="field-type">${formatFieldType(field.field_type)}</p>
        </div>
        <div class="field-actions">
          ${field.is_required ? '<span class="badge-required">Required</span>' : ''}
          <button class="btn-icon" onclick="window.customFields.editField('${field.id}')">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn-icon" onclick="window.customFields.deleteField('${field.id}')">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>

      ${field.field_description ? `
        <div class="field-description">
          ${escapeHTML(field.field_description)}
        </div>
      ` : ''}

      ${field.extraction_prompt ? `
        <div class="extraction-prompt">
          <strong>AI Extraction:</strong> ${escapeHTML(field.extraction_prompt)}
        </div>
      ` : ''}

      <div class="field-meta">
        <span><i class="fas fa-sort"></i> Order: ${field.display_order || 0}</span>
        <span class="status-badge ${field.is_active ? 'active' : 'inactive'}">
          ${field.is_active ? 'Active' : 'Inactive'}
        </span>
      </div>
    </div>
  `).join('');
}

// =============================================
// Update Stats
// =============================================

function updateStats(fields) {
  const totalEl = document.getElementById('totalFields');
  const activeEl = document.getElementById('activeFields');
  const requiredEl = document.getElementById('requiredFields');

  if (totalEl) totalEl.textContent = fields.length;
  if (activeEl) activeEl.textContent = fields.filter(f => f.is_active).length;
  if (requiredEl) requiredEl.textContent = fields.filter(f => f.is_required).length;
}

// =============================================
// Create New Field
// =============================================

function openNewFieldModal() {
  state.editingField = null;

  const modal = document.getElementById('fieldModal');
  const form = document.getElementById('fieldForm');

  if (modal && form) {
    form.reset();
    document.getElementById('modalTitle').textContent = 'Create New Field';
    modal.style.display = 'flex';
  }
}

async function handleFieldSubmit(e) {
  e.preventDefault();

  const formData = new FormData(e.target);
  const fieldData = {
    field_name: formData.get('fieldName'),
    field_type: formData.get('fieldType'),
    field_description: formData.get('fieldDescription'),
    extraction_prompt: formData.get('extractionPrompt'),
    placeholder: formData.get('placeholder'),
    is_required: formData.get('isRequired') === 'on',
    display_order: parseInt(formData.get('displayOrder')) || 0
  };

  try {
    if (state.editingField) {
      // Update existing field
      await apiPut(`/custom-fields/${state.editingField}`, fieldData);
      showNotification('Field updated successfully', 'success');
    } else {
      // Create new field
      await apiPost('/custom-fields', fieldData);
      showNotification('Field created successfully', 'success');
    }

    closeFieldModal();
    await loadCustomFields();
  } catch (error) {
    console.error('Error saving field:', error);
    showNotification(error.message || 'Failed to save field', 'error');
  }
}

// =============================================
// Edit Field
// =============================================

async function editField(fieldId) {
  const field = state.fields.find(f => f.id === fieldId);
  if (!field) return;

  state.editingField = fieldId;

  const modal = document.getElementById('fieldModal');
  const form = document.getElementById('fieldForm');

  if (modal && form) {
    // Populate form
    form.querySelector('[name="fieldName"]').value = field.field_name || '';
    form.querySelector('[name="fieldType"]').value = field.field_type || 'text';
    form.querySelector('[name="fieldDescription"]').value = field.field_description || '';
    form.querySelector('[name="extractionPrompt"]').value = field.extraction_prompt || '';
    form.querySelector('[name="placeholder"]').value = field.placeholder || '';
    form.querySelector('[name="displayOrder"]').value = field.display_order || 0;
    form.querySelector('[name="isRequired"]').checked = field.is_required || false;

    document.getElementById('modalTitle').textContent = 'Edit Field';
    modal.style.display = 'flex';
  }
}

// =============================================
// Delete Field
// =============================================

async function deleteField(fieldId) {
  const field = state.fields.find(f => f.id === fieldId);
  if (!field) return;

  if (!confirm(`Delete "${field.field_name}"? This cannot be undone.`)) {
    return;
  }

  try {
    await apiDelete(`/custom-fields/${fieldId}`);
    showNotification('Field deleted successfully', 'success');
    await loadCustomFields();
  } catch (error) {
    console.error('Error deleting field:', error);
    showNotification('Failed to delete field', 'error');
  }
}

// =============================================
// Copy from Template
// =============================================

async function copyFromTemplate() {
  if (!confirm('Copy default fields from industry template? This will add standard fields for your business type.')) {
    return;
  }

  try {
    await apiPost('/custom-fields/copy-from-template', {});
    showNotification('Template fields copied successfully', 'success');
    await loadCustomFields();
  } catch (error) {
    console.error('Error copying template:', error);
    showNotification(error.message || 'Failed to copy template fields', 'error');
  }
}

// =============================================
// Re-extract Data
// =============================================

async function reExtractData() {
  if (!confirm('Re-extract data from all voice notes? This may take a few minutes and will update contact records with newly defined fields.')) {
    return;
  }

  try {
    showNotification('Starting re-extraction... This may take a few minutes', 'info');

    const response = await apiPost('/custom-fields/re-extract', {});
    const stats = response.data;

    showNotification(
      `Re-extraction complete! Processed ${stats.total_notes} voice notes, updated ${stats.updated_contacts} contacts`,
      'success'
    );

  } catch (error) {
    console.error('Error re-extracting data:', error);
    showNotification(error.message || 'Failed to re-extract data', 'error');
  }
}

// =============================================
// Modal Management
// =============================================

function closeFieldModal() {
  const modal = document.getElementById('fieldModal');
  if (modal) {
    modal.style.display = 'none';
  }
  state.editingField = null;
}

// =============================================
// Event Listeners
// =============================================

function initializeEventListeners() {
  // Add new field button
  const addBtn = document.getElementById('addFieldBtn');
  if (addBtn) {
    addBtn.addEventListener('click', openNewFieldModal);
  }

  // Field form submit
  const form = document.getElementById('fieldForm');
  if (form) {
    form.addEventListener('submit', handleFieldSubmit);
  }

  // Copy template button
  const templateBtn = document.getElementById('copyTemplateBtn');
  if (templateBtn) {
    templateBtn.addEventListener('click', copyFromTemplate);
  }

  // Re-extract button
  const reExtractBtn = document.getElementById('reExtractBtn');
  if (reExtractBtn) {
    reExtractBtn.addEventListener('click', reExtractData);
  }

  // Modal close buttons
  const closeButtons = document.querySelectorAll('[data-close-modal]');
  closeButtons.forEach(btn => {
    btn.addEventListener('click', closeFieldModal);
  });

  // Close modal on outside click
  const modal = document.getElementById('fieldModal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeFieldModal();
      }
    });
  }
}

// =============================================
// Utility Functions
// =============================================

function getFieldIcon(fieldType) {
  const icons = {
    text: '📝',
    number: '🔢',
    phone: '📞',
    email: '📧',
    date: '📅',
    url: '🔗',
    select: '📋',
    boolean: '✓',
    textarea: '📄'
  };
  return icons[fieldType] || '📋';
}

function formatFieldType(fieldType) {
  const types = {
    text: 'Text',
    number: 'Number',
    phone: 'Phone Number',
    email: 'Email Address',
    date: 'Date',
    url: 'URL',
    select: 'Dropdown',
    boolean: 'Yes/No',
    textarea: 'Long Text'
  };
  return types[fieldType] || fieldType;
}

function escapeHTML(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function showNotification(message, type = 'info') {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.classList.add('show');
  }, 10);

  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// =============================================
// Export for global access
// =============================================

window.customFields = {
  openNewFieldModal,
  editField,
  deleteField,
  copyFromTemplate,
  reExtractData,
  refresh: loadCustomFields
};

console.log('✓ Custom Fields Manager loaded');
