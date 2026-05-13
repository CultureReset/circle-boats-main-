// ============================================
// CyberCheck - Admin Plans Management
// ============================================

// Plans data storage (simulates database)
let plansData = {
  starter: {
    name: 'Starter',
    price_monthly: 19,
    price_annual: 182,
    limit_profiles: 1,
    limit_sms: 100,
    limit_contacts: 500,
    limit_ai_tokens: 10000,
    limit_team: 1,
    limit_storage: '1 GB',
    features: {
      // Core features (always on)
      digital_card: true,
      contact_forms: true,
      qr_code: true,
      link_management: true,
      // Business tools
      menu_display: true,
      booking: true,
      song_requests: false,
      reviews: true,
      loyalty: false,
      events: false,
      // AI features
      ai_chat: true,
      ai_voice: false,
      ai_recommendations: false,
      // Marketing
      sms_marketing: true,
      email_campaigns: false,
      automation: false,
      // Advanced
      custom_domain: false,
      api_access: false,
      white_label: false,
      analytics_advanced: false
    }
  },
  pro: {
    name: 'Pro',
    price_monthly: 49,
    price_annual: 470,
    limit_profiles: 3,
    limit_sms: 1000,
    limit_contacts: 5000,
    limit_ai_tokens: 100000,
    limit_team: 5,
    limit_storage: '10 GB',
    features: {
      // Core features (always on)
      digital_card: true,
      contact_forms: true,
      qr_code: true,
      link_management: true,
      // Business tools
      menu_display: true,
      booking: true,
      song_requests: true,
      reviews: true,
      loyalty: true,
      events: true,
      // AI features
      ai_chat: true,
      ai_voice: true,
      ai_recommendations: true,
      // Marketing
      sms_marketing: true,
      email_campaigns: true,
      automation: true,
      // Advanced
      custom_domain: true,
      api_access: false,
      white_label: false,
      analytics_advanced: true
    }
  },
  enterprise: {
    name: 'Enterprise',
    price_monthly: 149,
    price_annual: 1430,
    contact_sales: false,
    limit_profiles: 10,
    limit_sms: 10000,
    limit_contacts: 'Unlimited',
    limit_ai_tokens: 'Unlimited',
    limit_team: 'Unlimited',
    limit_storage: '100 GB',
    features: {
      // Core features (always on)
      digital_card: true,
      contact_forms: true,
      qr_code: true,
      link_management: true,
      // Business tools (all on)
      menu_display: true,
      booking: true,
      song_requests: true,
      reviews: true,
      loyalty: true,
      events: true,
      // AI features (all on)
      ai_chat: true,
      ai_voice: true,
      ai_recommendations: true,
      // Marketing (all on)
      sms_marketing: true,
      email_campaigns: true,
      automation: true,
      // Advanced (all on)
      custom_domain: true,
      api_access: true,
      white_label: true,
      analytics_advanced: true,
      priority_support: true,
      dedicated_manager: true
    }
  }
};

// Industry templates configuration
let industryTemplates = {
  restaurants: {
    enabled_features: ['menu_display', 'booking', 'events', 'loyalty']
  },
  musicians: {
    enabled_features: ['song_requests', 'booking', 'events', 'menu_display']
  },
  dealers: {
    enabled_features: ['menu_display', 'booking', 'finance_calculator', 'reviews']
  },
  stylists: {
    enabled_features: ['booking', 'menu_display', 'gallery', 'reviews']
  }
};

// Track unsaved changes
let hasUnsavedChanges = false;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  initializePlanCards();
  attachEventListeners();
  calculateDiscounts();
});

// Initialize plan cards with data
function initializePlanCards() {
  const planCards = document.querySelectorAll('.plan-editor-card');

  planCards.forEach(card => {
    const planType = card.dataset.plan;
    const planData = plansData[planType];

    if (!planData) return;

    // Set all input values
    const inputs = card.querySelectorAll('input[data-field]');
    inputs.forEach(input => {
      const field = input.dataset.field;
      if (planData[field] !== undefined) {
        if (input.type === 'checkbox') {
          input.checked = planData[field];
        } else {
          input.value = planData[field];
        }
      }
    });

    // Set feature toggles
    const featureCheckboxes = card.querySelectorAll('input[data-feature]');
    featureCheckboxes.forEach(checkbox => {
      const feature = checkbox.dataset.feature;
      if (planData.features && planData.features[feature] !== undefined) {
        checkbox.checked = planData.features[feature];
      }
    });
  });
}

// Attach all event listeners
function attachEventListeners() {
  // Save individual plan buttons
  document.querySelectorAll('[data-action="save"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const card = e.target.closest('.plan-editor-card');
      savePlan(card);
    });
  });

  // Reset buttons
  document.querySelectorAll('[data-action="reset"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const card = e.target.closest('.plan-editor-card');
      resetPlan(card);
    });
  });

  // Save all plans button
  const saveAllBtn = document.getElementById('saveAllPlansBtn');
  if (saveAllBtn) {
    saveAllBtn.addEventListener('click', saveAllPlans);
  }

  // Preview changes button
  const previewBtn = document.getElementById('previewChangesBtn');
  if (previewBtn) {
    previewBtn.addEventListener('click', previewChanges);
  }

  // Track changes on all inputs
  document.querySelectorAll('.plan-editor-card input').forEach(input => {
    input.addEventListener('change', () => {
      hasUnsavedChanges = true;
      const card = input.closest('.plan-editor-card');
      if (card) {
        card.classList.add('has-changes');
      }
    });
  });

  // Recalculate discount on price changes
  document.querySelectorAll('input[data-field="price_monthly"], input[data-field="price_annual"]').forEach(input => {
    input.addEventListener('input', (e) => {
      const card = e.target.closest('.plan-editor-card');
      updateDiscountDisplay(card);
    });
  });

  // Industry template toggles
  document.querySelectorAll('input[data-industry]').forEach(checkbox => {
    checkbox.addEventListener('change', () => {
      hasUnsavedChanges = true;
    });
  });

  // Warn before leaving with unsaved changes
  window.addEventListener('beforeunload', (e) => {
    if (hasUnsavedChanges) {
      e.preventDefault();
      e.returnValue = '';
    }
  });
}

// Calculate and display discounts
function calculateDiscounts() {
  document.querySelectorAll('.plan-editor-card').forEach(card => {
    updateDiscountDisplay(card);
  });
}

function updateDiscountDisplay(card) {
  const monthlyInput = card.querySelector('input[data-field="price_monthly"]');
  const annualInput = card.querySelector('input[data-field="price_annual"]');
  const discountDisplay = card.querySelector('.discount-amount');

  if (!monthlyInput || !annualInput || !discountDisplay) return;

  const monthlyPrice = parseFloat(monthlyInput.value) || 0;
  const annualPrice = parseFloat(annualInput.value) || 0;

  const expectedAnnual = monthlyPrice * 12;
  const discount = ((expectedAnnual - annualPrice) / expectedAnnual * 100).toFixed(0);

  discountDisplay.textContent = `${discount}%`;

  // Update color based on discount
  if (discount >= 15) {
    discountDisplay.style.color = 'var(--success)';
  } else if (discount >= 10) {
    discountDisplay.style.color = 'var(--warning, #F59E0B)';
  } else {
    discountDisplay.style.color = 'var(--gray-500)';
  }
}

// Save individual plan
function savePlan(card) {
  const planType = card.dataset.plan;
  const planData = plansData[planType];

  if (!planData) {
    showToast('Error: Plan not found', 'error');
    return;
  }

  // Collect all field values
  const inputs = card.querySelectorAll('input[data-field]');
  inputs.forEach(input => {
    const field = input.dataset.field;
    if (input.type === 'checkbox') {
      planData[field] = input.checked;
    } else if (input.type === 'number') {
      planData[field] = parseFloat(input.value) || 0;
    } else {
      planData[field] = input.value;
    }
  });

  // Collect feature toggles
  const featureCheckboxes = card.querySelectorAll('input[data-feature]');
  featureCheckboxes.forEach(checkbox => {
    const feature = checkbox.dataset.feature;
    if (!checkbox.disabled) {
      planData.features[feature] = checkbox.checked;
    }
  });

  // In production, this would be an API call
  console.log(`Saving ${planType} plan:`, planData);

  // Simulate API delay
  setTimeout(() => {
    card.classList.remove('has-changes');
    showToast(`${planData.name} plan saved successfully!`, 'success');
    checkAllChanges();
  }, 500);
}

// Reset plan to original values
function resetPlan(card) {
  const planType = card.dataset.plan;

  if (!confirm('Are you sure you want to reset all changes to this plan?')) {
    return;
  }

  // Re-initialize this card
  const planData = plansData[planType];

  const inputs = card.querySelectorAll('input[data-field]');
  inputs.forEach(input => {
    const field = input.dataset.field;
    if (planData[field] !== undefined) {
      if (input.type === 'checkbox') {
        input.checked = planData[field];
      } else {
        input.value = planData[field];
      }
    }
  });

  const featureCheckboxes = card.querySelectorAll('input[data-feature]');
  featureCheckboxes.forEach(checkbox => {
    const feature = checkbox.dataset.feature;
    if (planData.features && planData.features[feature] !== undefined) {
      checkbox.checked = planData.features[feature];
    }
  });

  card.classList.remove('has-changes');
  updateDiscountDisplay(card);
  checkAllChanges();

  showToast('Changes reset', 'info');
}

// Save all plans at once
function saveAllPlans() {
  const planCards = document.querySelectorAll('.plan-editor-card');

  // Save each plan
  planCards.forEach(card => {
    const planType = card.dataset.plan;
    const planData = plansData[planType];

    if (!planData) return;

    // Collect all field values
    const inputs = card.querySelectorAll('input[data-field]');
    inputs.forEach(input => {
      const field = input.dataset.field;
      if (input.type === 'checkbox') {
        planData[field] = input.checked;
      } else if (input.type === 'number') {
        planData[field] = parseFloat(input.value) || 0;
      } else {
        planData[field] = input.value;
      }
    });

    // Collect feature toggles
    const featureCheckboxes = card.querySelectorAll('input[data-feature]');
    featureCheckboxes.forEach(checkbox => {
      const feature = checkbox.dataset.feature;
      if (!checkbox.disabled) {
        planData.features[feature] = checkbox.checked;
      }
    });
  });

  // Save industry templates
  document.querySelectorAll('input[data-industry]').forEach(checkbox => {
    const industry = checkbox.dataset.industry;
    const feature = checkbox.dataset.feature;

    if (industryTemplates[industry]) {
      if (checkbox.checked) {
        if (!industryTemplates[industry].enabled_features.includes(feature)) {
          industryTemplates[industry].enabled_features.push(feature);
        }
      } else {
        industryTemplates[industry].enabled_features =
          industryTemplates[industry].enabled_features.filter(f => f !== feature);
      }
    }
  });

  // In production, this would be an API call
  console.log('Saving all plans:', plansData);
  console.log('Saving industry templates:', industryTemplates);

  // Simulate API delay
  setTimeout(() => {
    planCards.forEach(card => card.classList.remove('has-changes'));
    hasUnsavedChanges = false;
    showToast('All changes saved successfully!', 'success');
  }, 800);
}

// Check if any plans have unsaved changes
function checkAllChanges() {
  const hasChanges = document.querySelector('.plan-editor-card.has-changes');
  hasUnsavedChanges = !!hasChanges;
}

// Preview changes (opens pricing page in new tab)
function previewChanges() {
  // In production, this would pass the current data to a preview mode
  const previewUrl = '../pricing.html?preview=true';
  window.open(previewUrl, '_blank');

  showToast('Opening preview...', 'info');
}

// Show toast notification
function showToast(message, type = 'success') {
  const toast = document.getElementById('successToast');
  if (!toast) {
    // Create toast if it doesn't exist
    const newToast = document.createElement('div');
    newToast.id = 'successToast';
    newToast.className = `toast toast-${type}`;
    newToast.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
      <span>${message}</span>
    `;
    document.body.appendChild(newToast);

    setTimeout(() => {
      newToast.style.display = 'flex';
    }, 10);

    setTimeout(() => {
      newToast.style.display = 'none';
    }, 3000);

    return;
  }

  // Update existing toast
  toast.className = `toast toast-${type}`;
  const span = toast.querySelector('span');
  if (span) {
    span.textContent = message;
  }

  toast.style.display = 'flex';

  setTimeout(() => {
    toast.style.display = 'none';
  }, 3000);
}

// Validation functions
function validatePlanData(planData) {
  const errors = [];

  if (!planData.name || planData.name.trim() === '') {
    errors.push('Plan name is required');
  }

  if (planData.price_monthly < 0) {
    errors.push('Monthly price cannot be negative');
  }

  if (planData.price_annual < 0) {
    errors.push('Annual price cannot be negative');
  }

  if (planData.limit_profiles < 1) {
    errors.push('Must allow at least 1 profile');
  }

  return errors;
}

// Export data as JSON (for backup/debugging)
function exportPlansData() {
  const dataStr = JSON.stringify({ plans: plansData, industries: industryTemplates }, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `cybercheck-plans-${Date.now()}.json`;
  link.click();

  URL.revokeObjectURL(url);
  showToast('Plans data exported', 'success');
}

// Import plans data from JSON
function importPlansData(jsonData) {
  try {
    const data = JSON.parse(jsonData);

    if (data.plans) {
      plansData = data.plans;
    }

    if (data.industries) {
      industryTemplates = data.industries;
    }

    initializePlanCards();
    showToast('Plans data imported successfully', 'success');
  } catch (error) {
    showToast('Error importing data: ' + error.message, 'error');
  }
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  // Ctrl/Cmd + S = Save all
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    saveAllPlans();
  }

  // Escape = Cancel/close modals
  if (e.key === 'Escape') {
    // Future: close any open modals
  }
});

// Log for debugging
console.log('%cCyberCheck Admin Plans Management', 'font-size: 16px; font-weight: bold; color: #4DA6FF;');
console.log('Plans loaded:', plansData);
console.log('Keyboard shortcuts: Ctrl/Cmd+S = Save All');
