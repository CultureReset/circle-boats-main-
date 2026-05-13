/**
 * Billing & Subscription Settings
 * Handles subscription management, plan upgrades, and billing history
 */

import { getCurrentUser } from './shared/auth.js';
import { apiFetch } from './shared/api.js';

let currentSubscription = null;
let availablePlans = [];

/**
 * Initialize billing settings
 */
async function init() {
  try {
    // Load current subscription
    await loadCurrentSubscription();

    // Load available plans
    await loadAvailablePlans();

    // Load usage statistics
    await loadUsageStats();

    // Load billing history
    await loadBillingHistory();

    // Set up event listeners
    setupEventListeners();
  } catch (error) {
    console.error('Failed to initialize billing settings:', error);
  }
}

/**
 * Load current subscription
 */
async function loadCurrentSubscription() {
  try {
    const response = await apiFetch('/billing/subscription');

    if (response.success) {
      currentSubscription = response.data;
      updateCurrentPlanUI();
    }
  } catch (error) {
    console.error('Failed to load subscription:', error);
  }
}

/**
 * Update current plan UI
 */
function updateCurrentPlanUI() {
  if (!currentSubscription) return;

  const planNameEl = document.getElementById('currentPlanName');
  const statusEl = document.getElementById('currentPlanStatus');
  const periodEl = document.getElementById('currentPlanPeriod');
  const voiceNotesEl = document.getElementById('featureVoiceNotes');
  const smsEl = document.getElementById('featureSMS');
  const reviewsEl = document.getElementById('featureReviews');
  const manageBtnEl = document.getElementById('manageSubscriptionBtn');
  const upgradeBtnEl = document.getElementById('upgradePlanBtn');

  // Update plan name
  planNameEl.textContent = currentSubscription.plan_name || 'Free Plan';

  // Update status
  const statusText = currentSubscription.status === 'active' ? 'Active' :
                    currentSubscription.status === 'canceled' ? 'Canceled' :
                    currentSubscription.status === 'past_due' ? 'Past Due' :
                    currentSubscription.status;
  statusEl.textContent = statusText;
  statusEl.style.color = currentSubscription.status === 'active' ? '#10b981' : '#f56565';

  // Update period
  if (currentSubscription.current_period_end) {
    const endDate = new Date(currentSubscription.current_period_end);
    periodEl.innerHTML = `<i class="fas fa-calendar"></i> <span>Renews ${endDate.toLocaleDateString()}</span>`;
  } else {
    periodEl.innerHTML = `<i class="fas fa-calendar"></i> <span>No billing cycle</span>`;
  }

  // Update features
  const features = currentSubscription.features || {};
  voiceNotesEl.textContent = features.voice_notes === -1 ? 'Unlimited' : `${features.voice_notes || 0} / month`;
  smsEl.textContent = features.sms_shared === -1 ? 'Unlimited' : `${features.sms_shared || 0} / month`;
  reviewsEl.textContent = features.reviews === -1 ? 'Unlimited' : `${features.reviews || 0} total`;

  // Show/hide manage button (only for paid plans)
  if (currentSubscription.plan_id !== 'free' && currentSubscription.stripe_subscription_id) {
    manageBtnEl.style.display = 'inline-flex';
    upgradeBtnEl.textContent = 'Change Plan';
    upgradeBtnEl.innerHTML = '<i class="fas fa-exchange-alt"></i> Change Plan';
  } else {
    manageBtnEl.style.display = 'none';
    upgradeBtnEl.innerHTML = '<i class="fas fa-arrow-up"></i> Upgrade Plan';
  }
}

/**
 * Load available plans
 */
async function loadAvailablePlans() {
  try {
    const response = await apiFetch('/billing/plans');

    if (response.success) {
      availablePlans = response.data;
      renderPlansGrid();
    }
  } catch (error) {
    console.error('Failed to load plans:', error);
  }
}

/**
 * Render plans grid
 */
function renderPlansGrid() {
  const grid = document.getElementById('plansGrid');
  if (!grid) return;

  grid.innerHTML = availablePlans.map(plan => {
    const isCurrentPlan = currentSubscription?.plan_id === plan.id;
    const isFree = plan.id === 'free';

    return `
      <div class="connection-card ${isCurrentPlan ? 'active' : ''}" style="position: relative;">
        ${plan.id === 'pro' ? `
          <div style="position: absolute; top: -12px; right: 16px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 700; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">
            POPULAR
          </div>
        ` : ''}

        <div style="padding: 24px;">
          <h4 style="font-size: 20px; font-weight: 700; margin-bottom: 8px; color: #1a202c;">
            ${plan.name}
          </h4>
          <div style="display: flex; align-items: baseline; margin-bottom: 20px;">
            <span style="font-size: 36px; font-weight: 800; color: #667eea;">$${plan.price}</span>
            <span style="font-size: 14px; color: #718096; margin-left: 8px;">${isFree ? '' : '/ month'}</span>
          </div>

          <div style="margin-bottom: 24px;">
            <div style="font-size: 13px; color: #4a5568; margin-bottom: 12px;">
              <i class="fas fa-microphone" style="width: 20px; color: #667eea;"></i>
              <strong>${plan.features.voice_notes === -1 ? 'Unlimited' : plan.features.voice_notes}</strong> Voice Notes
            </div>
            <div style="font-size: 13px; color: #4a5568; margin-bottom: 12px;">
              <i class="fas fa-sms" style="width: 20px; color: #667eea;"></i>
              <strong>${plan.features.sms_shared === -1 ? 'Unlimited' : plan.features.sms_shared}</strong> SMS Messages
            </div>
            <div style="font-size: 13px; color: #4a5568; margin-bottom: 12px;">
              <i class="fas fa-star" style="width: 20px; color: #667eea;"></i>
              <strong>${plan.features.reviews === -1 ? 'Unlimited' : plan.features.reviews}</strong> Reviews
            </div>
            <div style="font-size: 13px; color: #4a5568; margin-bottom: 12px;">
              <i class="fas fa-user" style="width: 20px; color: #667eea;"></i>
              <strong>${plan.features.profiles === -1 ? 'Unlimited' : plan.features.profiles}</strong> Profiles
            </div>
            ${plan.features.custom_twilio ? `
              <div style="font-size: 13px; color: #4a5568; margin-bottom: 12px;">
                <i class="fas fa-phone" style="width: 20px; color: #667eea;"></i>
                <strong>Custom Twilio</strong>
              </div>
            ` : ''}
            ${plan.features.phone_ai ? `
              <div style="font-size: 13px; color: #4a5568; margin-bottom: 12px;">
                <i class="fas fa-robot" style="width: 20px; color: #667eea;"></i>
                <strong>AI Phone Assistant</strong>
              </div>
            ` : ''}
            ${plan.features.priority_support ? `
              <div style="font-size: 13px; color: #4a5568; margin-bottom: 12px;">
                <i class="fas fa-headset" style="width: 20px; color: #667eea;"></i>
                <strong>Priority Support</strong>
              </div>
            ` : ''}
            ${plan.features.white_label ? `
              <div style="font-size: 13px; color: #4a5568; margin-bottom: 12px;">
                <i class="fas fa-tag" style="width: 20px; color: #667eea;"></i>
                <strong>White Label</strong>
              </div>
            ` : ''}
          </div>

          ${isCurrentPlan ? `
            <button class="btn-secondary" style="width: 100%; opacity: 0.6; cursor: not-allowed;" disabled>
              <i class="fas fa-check"></i> Current Plan
            </button>
          ` : isFree ? `
            <button class="btn-secondary" style="width: 100%;" onclick="window.location.reload()">
              <i class="fas fa-info-circle"></i> Free Forever
            </button>
          ` : `
            <button class="btn-primary" style="width: 100%;" data-plan-id="${plan.id}" onclick="window.billingSettings.selectPlan('${plan.id}')">
              <i class="fas fa-arrow-right"></i> Select Plan
            </button>
          `}
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Select a plan (open Stripe Checkout)
 */
async function selectPlan(planId) {
  try {
    const response = await apiFetch('/billing/checkout', {
      method: 'POST',
      body: JSON.stringify({ plan_id: planId })
    });

    if (response.success && response.data.url) {
      // Redirect to Stripe Checkout
      window.location.href = response.data.url;
    } else {
      alert('Failed to create checkout session. Please try again.');
    }
  } catch (error) {
    console.error('Failed to create checkout:', error);
    alert('Failed to create checkout session. Please try again.');
  }
}

/**
 * Open Stripe Customer Portal (manage subscription, update payment method, etc.)
 */
async function openCustomerPortal() {
  try {
    const response = await apiFetch('/billing/portal', {
      method: 'POST'
    });

    if (response.success && response.data.url) {
      // Redirect to Stripe Customer Portal
      window.location.href = response.data.url;
    } else {
      alert('Failed to open customer portal. Please try again.');
    }
  } catch (error) {
    console.error('Failed to open portal:', error);
    alert('Failed to open customer portal. Please try again.');
  }
}

/**
 * Load usage statistics
 */
async function loadUsageStats() {
  try {
    const response = await apiFetch('/billing/usage');

    if (response.success) {
      renderUsageStats(response.data.usage);
    }
  } catch (error) {
    console.error('Failed to load usage stats:', error);
    document.getElementById('usageStats').innerHTML = '<p style="text-align: center; color: #718096;">Failed to load usage statistics</p>';
  }
}

/**
 * Render usage statistics
 */
function renderUsageStats(usage) {
  const container = document.getElementById('usageStats');
  if (!container) return;

  container.innerHTML = `
    <div style="padding: 20px; text-align: center; border-right: 1px solid #e2e8f0;">
      <div style="font-size: 28px; font-weight: 700; color: #667eea; margin-bottom: 8px;">
        ${usage.voice_notes?.count || 0}
      </div>
      <div style="font-size: 13px; color: #718096;">
        Voice Notes
      </div>
      <div style="font-size: 12px; color: #a0aec0; margin-top: 4px;">
        $${(usage.voice_notes?.cost || 0).toFixed(2)}
      </div>
    </div>

    <div style="padding: 20px; text-align: center; border-right: 1px solid #e2e8f0;">
      <div style="font-size: 28px; font-weight: 700; color: #667eea; margin-bottom: 8px;">
        ${usage.sms?.count || 0}
      </div>
      <div style="font-size: 13px; color: #718096;">
        SMS Messages
      </div>
      <div style="font-size: 12px; color: #a0aec0; margin-top: 4px;">
        $${(usage.sms?.cost || 0).toFixed(2)}
      </div>
    </div>

    <div style="padding: 20px; text-align: center; border-right: 1px solid #e2e8f0;">
      <div style="font-size: 28px; font-weight: 700; color: #667eea; margin-bottom: 8px;">
        ${usage.ocr?.count || 0}
      </div>
      <div style="font-size: 13px; color: #718096;">
        OCR Scans
      </div>
      <div style="font-size: 12px; color: #a0aec0; margin-top: 4px;">
        $${(usage.ocr?.cost || 0).toFixed(2)}
      </div>
    </div>

    <div style="padding: 20px; text-align: center;">
      <div style="font-size: 28px; font-weight: 700; color: #10b981; margin-bottom: 8px;">
        $${(usage.total_cost || 0).toFixed(2)}
      </div>
      <div style="font-size: 13px; color: #718096;">
        Total This Month
      </div>
    </div>
  `;
}

/**
 * Load billing history
 */
async function loadBillingHistory() {
  try {
    const response = await apiFetch('/billing/invoices');

    if (response.success) {
      renderInvoices(response.data);
    }
  } catch (error) {
    console.error('Failed to load invoices:', error);
    document.getElementById('invoicesList').innerHTML = '<p style="text-align: center; color: #718096;">Failed to load billing history</p>';
  }
}

/**
 * Render invoices list
 */
function renderInvoices(invoices) {
  const container = document.getElementById('invoicesList');
  if (!container) return;

  if (!invoices || invoices.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: #718096; padding: 40px;">No billing history yet</p>';
    return;
  }

  container.innerHTML = `
    <table style="width: 100%; border-collapse: collapse;">
      <thead>
        <tr style="border-bottom: 2px solid #e2e8f0;">
          <th style="text-align: left; padding: 12px; font-size: 13px; font-weight: 600; color: #4a5568;">Date</th>
          <th style="text-align: left; padding: 12px; font-size: 13px; font-weight: 600; color: #4a5568;">Amount</th>
          <th style="text-align: left; padding: 12px; font-size: 13px; font-weight: 600; color: #4a5568;">Status</th>
          <th style="text-align: right; padding: 12px; font-size: 13px; font-weight: 600; color: #4a5568;">Invoice</th>
        </tr>
      </thead>
      <tbody>
        ${invoices.map(invoice => {
          const date = new Date(invoice.paid_at || invoice.created_at);
          const statusColor = invoice.status === 'paid' ? '#10b981' : '#f56565';
          const statusText = invoice.status === 'paid' ? 'Paid' : 'Failed';

          return `
            <tr style="border-bottom: 1px solid #f7fafc;">
              <td style="padding: 16px; font-size: 14px; color: #2d3748;">
                ${date.toLocaleDateString()}
              </td>
              <td style="padding: 16px; font-size: 14px; color: #2d3748; font-weight: 600;">
                $${invoice.amount.toFixed(2)}
              </td>
              <td style="padding: 16px;">
                <span style="display: inline-block; padding: 4px 12px; background: ${statusColor}15; color: ${statusColor}; border-radius: 12px; font-size: 12px; font-weight: 600;">
                  ${statusText}
                </span>
              </td>
              <td style="padding: 16px; text-align: right;">
                ${invoice.stripe_invoice_id ? `
                  <a href="https://dashboard.stripe.com/invoices/${invoice.stripe_invoice_id}" target="_blank" style="color: #667eea; text-decoration: none; font-size: 13px;">
                    <i class="fas fa-external-link-alt"></i> View
                  </a>
                ` : '-'}
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
  // Upgrade plan button
  const upgradeBtnEl = document.getElementById('upgradePlanBtn');
  if (upgradeBtnEl) {
    upgradeBtnEl.addEventListener('click', () => {
      // Scroll to plans section
      document.getElementById('plansGrid').scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  // Manage subscription button
  const manageBtnEl = document.getElementById('manageSubscriptionBtn');
  if (manageBtnEl) {
    manageBtnEl.addEventListener('click', openCustomerPortal);
  }
}

// Export functions for onclick handlers
window.billingSettings = {
  selectPlan,
  openCustomerPortal
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', init);
