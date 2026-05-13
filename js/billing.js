// ============================================
// Billing & Subscription — plan display, usage,
// invoices, payment method management
// ============================================

var BILLING_STORAGE = 'beachside_billing';

// No demo billing — real billing data comes from the API
var _billingData = {
  plan: 'free',
  status: 'active',
  renewDate: '',
  paymentMethod: null,
  usage: {
    sms: { used: 0, limit: 0 },
    reviews: { used: 0, limit: 0 },
    storage: { used: 0, limit: 0 },
    aiMinutes: { used: 0, limit: 0 }
  },
  invoices: []
};

var _plans = [
  { id: 'free', name: 'Free', price: 0, period: '', features: { sms: 20, reviews: 5, storage: 0.5, ai: 0, support: 'Community', customDomain: false, whiteLabel: false }, badge: '' },
  { id: 'basic', name: 'Basic', price: 49, period: '/mo', features: { sms: 200, reviews: 50, storage: 5, ai: 30, support: 'Email', customDomain: true, whiteLabel: false }, badge: '' },
  { id: 'pro', name: 'Pro', price: 99, period: '/mo', features: { sms: 1000, reviews: -1, storage: 25, ai: 120, support: 'Priority', customDomain: true, whiteLabel: false }, badge: 'POPULAR' },
  { id: 'enterprise', name: 'Enterprise', price: 249, period: '/mo', features: { sms: -1, reviews: -1, storage: 100, ai: -1, support: '24/7 Phone', customDomain: true, whiteLabel: true }, badge: '' }
];

function loadBilling() {
  try {
    var saved = localStorage.getItem(BILLING_STORAGE);
    if (saved) {
      var parsed = JSON.parse(saved);
      Object.keys(parsed).forEach(function(k) { _billingData[k] = parsed[k]; });
    }
  } catch(e) {}

  renderBillingPage();
}

function saveBilling() {
  try { localStorage.setItem(BILLING_STORAGE, JSON.stringify(_billingData)); } catch(e) {}
}

function renderBillingPage() {
  renderCurrentPlan();
  renderUsageStats();
  renderPlansGrid();
  renderPaymentMethod();
  renderInvoices();
}

// ---- Current Plan ----

function renderCurrentPlan() {
  var container = document.getElementById('billing-current-plan');
  if (!container) return;

  var plan = _plans.find(function(p) { return p.id === _billingData.plan; }) || _plans[0];

  var html = '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px;">';

  html += '<div style="display:flex;align-items:center;gap:16px;">';
  html += '<div style="width:56px;height:56px;border-radius:var(--radius-lg);background:linear-gradient(135deg,var(--primary),#4DA6FF);display:flex;align-items:center;justify-content:center;">';
  html += '<svg width="28" height="28" viewBox="0 0 24 24" fill="white" stroke="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>';
  html += '</div>';
  html += '<div>';
  html += '<div style="font-size:22px;font-weight:700;color:var(--text);">' + plan.name + ' Plan</div>';
  html += '<div style="display:flex;align-items:center;gap:8px;margin-top:4px;">';
  html += '<span class="badge badge-success">' + (_billingData.status === 'active' ? 'Active' : _billingData.status) + '</span>';
  if (_billingData.renewDate) {
    html += '<span style="font-size:12px;color:var(--text-muted);">Renews ' + _billingData.renewDate + '</span>';
  }
  html += '</div>';
  html += '</div>';
  html += '</div>';

  html += '<div style="text-align:right;">';
  html += '<div style="font-size:36px;font-weight:800;color:var(--primary);">$' + plan.price + '<span style="font-size:14px;font-weight:400;color:var(--text-muted);">' + plan.period + '</span></div>';
  html += '</div>';

  html += '</div>';

  container.innerHTML = html;
}

// ---- Usage Stats ----

function renderUsageStats() {
  var container = document.getElementById('billing-usage');
  if (!container) return;

  var items = [
    { label: 'SMS Messages', used: _billingData.usage.sms.used, limit: _billingData.usage.sms.limit, color: '#00ada8' },
    { label: 'Reviews', used: _billingData.usage.reviews.used, limit: _billingData.usage.reviews.limit, color: '#f59e0b' },
    { label: 'Storage', used: _billingData.usage.storage.used, limit: _billingData.usage.storage.limit, unit: 'GB', color: '#a855f7' },
    { label: 'AI Minutes', used: _billingData.usage.aiMinutes.used, limit: _billingData.usage.aiMinutes.limit, unit: 'min', color: '#4DA6FF' }
  ];

  var html = '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:16px;">';

  items.forEach(function(item) {
    var pct = item.limit > 0 ? Math.min((item.used / item.limit) * 100, 100) : 0;
    var barColor = pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : item.color;

    html += '<div style="padding:16px;background:var(--bg);border:1px solid var(--card-border);border-radius:var(--radius);">';
    html += '<div style="display:flex;justify-content:space-between;margin-bottom:8px;">';
    html += '<span style="font-size:13px;font-weight:600;color:var(--text);">' + item.label + '</span>';
    html += '<span style="font-size:13px;color:var(--text-muted);">' + item.used + (item.unit ? item.unit : '') + ' / ' + (item.limit === -1 ? 'Unlimited' : item.limit + (item.unit || '')) + '</span>';
    html += '</div>';
    html += '<div style="height:8px;background:var(--card-border);border-radius:4px;overflow:hidden;">';
    html += '<div style="height:100%;width:' + pct + '%;background:' + barColor + ';border-radius:4px;transition:width 0.5s;"></div>';
    html += '</div>';
    html += '</div>';
  });

  html += '</div>';
  container.innerHTML = html;
}

// ---- Plans Grid ----

function renderPlansGrid() {
  var container = document.getElementById('billing-plans');
  if (!container) return;

  var html = '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;">';

  _plans.forEach(function(plan) {
    var isCurrent = _billingData.plan === plan.id;

    html += '<div style="padding:24px 20px;background:var(--card-bg);border:2px solid ' + (isCurrent ? 'var(--primary)' : 'var(--card-border)') + ';border-radius:var(--radius-lg);position:relative;text-align:center;">';

    if (plan.badge) {
      html += '<div style="position:absolute;top:-10px;left:50%;transform:translateX(-50%);padding:4px 12px;background:linear-gradient(135deg,#00ada8,#4DA6FF);color:white;border-radius:12px;font-size:11px;font-weight:700;white-space:nowrap;">' + plan.badge + '</div>';
    }

    html += '<div style="font-size:18px;font-weight:700;color:var(--text);margin-bottom:8px;">' + plan.name + '</div>';
    html += '<div style="font-size:32px;font-weight:800;color:var(--primary);margin-bottom:4px;">$' + plan.price + '</div>';
    html += '<div style="font-size:12px;color:var(--text-muted);margin-bottom:16px;">' + (plan.period || 'Forever free') + '</div>';

    // Features
    var featureList = [
      plan.features.sms === -1 ? 'Unlimited SMS' : plan.features.sms + ' SMS/mo',
      plan.features.reviews === -1 ? 'Unlimited Reviews' : plan.features.reviews + ' Reviews',
      plan.features.storage + 'GB Storage',
      plan.features.ai > 0 ? plan.features.ai + ' AI min/mo' : (plan.features.ai === -1 ? 'Unlimited AI' : 'No AI'),
      plan.features.support + ' Support',
      plan.features.customDomain ? 'Custom Domain' : '',
      plan.features.whiteLabel ? 'White Label' : ''
    ].filter(Boolean);

    html += '<div style="text-align:left;margin-bottom:16px;">';
    featureList.forEach(function(f) {
      html += '<div style="font-size:12px;color:var(--text-muted);padding:4px 0;display:flex;align-items:center;gap:6px;">';
      html += '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>';
      html += f + '</div>';
    });
    html += '</div>';

    if (isCurrent) {
      html += '<button class="btn btn-outline btn-sm" style="width:100%;opacity:0.6;cursor:default;" disabled>Current Plan</button>';
    } else {
      var action = plan.price > (_plans.find(function(p){return p.id===_billingData.plan;}) || {price:0}).price ? 'Upgrade' : (plan.price === 0 ? 'Downgrade' : 'Switch');
      html += '<button class="btn btn-primary btn-sm" style="width:100%;" onclick="changePlan(\'' + plan.id + '\')">' + action + '</button>';
    }

    html += '</div>';
  });

  html += '</div>';
  container.innerHTML = html;
}

function changePlan(planId) {
  var plan = _plans.find(function(p) { return p.id === planId; });
  if (!plan) return;

  if (!confirm('Switch to ' + plan.name + ' plan ($' + plan.price + plan.period + ')?\n\nIn production this will redirect to Stripe Checkout.')) return;

  _billingData.plan = planId;
  saveBilling();
  renderBillingPage();
  toast('Plan changed to ' + plan.name + '!', 'success');
}

// ---- Payment Method ----

function renderPaymentMethod() {
  var container = document.getElementById('billing-payment');
  if (!container) return;

  var pm = _billingData.paymentMethod;
  var html = '';

  if (pm && pm.last4) {
    html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:16px;background:var(--bg);border:1px solid var(--card-border);border-radius:var(--radius);">';
    html += '<div style="display:flex;align-items:center;gap:12px;">';

    // Card icon
    html += '<div style="width:48px;height:32px;background:linear-gradient(135deg,#1a1a2e,#16213e);border-radius:6px;display:flex;align-items:center;justify-content:center;color:white;font-size:11px;font-weight:700;text-transform:uppercase;">' + (pm.brand || 'card') + '</div>';

    html += '<div>';
    html += '<div style="font-size:14px;font-weight:600;color:var(--text);">•••• •••• •••• ' + pm.last4 + '</div>';
    html += '<div style="font-size:12px;color:var(--text-muted);">Expires ' + pm.expiry + '</div>';
    html += '</div>';
    html += '</div>';

    html += '<button class="btn btn-outline btn-sm" onclick="updatePaymentMethod()">Update</button>';
    html += '</div>';
  } else {
    html += '<div style="text-align:center;padding:24px;">';
    html += '<p style="color:var(--text-muted);margin-bottom:12px;">No payment method on file</p>';
    html += '<button class="btn btn-primary btn-sm" onclick="updatePaymentMethod()">Add Payment Method</button>';
    html += '</div>';
  }

  container.innerHTML = html;
}

var _stripe = null;
var _stripeElements = { number: null, expiry: null, cvc: null };

function mountStripeCard() {
  var pk = window.CC_STRIPE_PUBLISHABLE_KEY;
  if (!pk || pk.indexOf('pk_') !== 0) return;
  if (typeof Stripe === 'undefined') return;

  // Destroy any previous instances
  ['number', 'expiry', 'cvc'].forEach(function(k) {
    if (_stripeElements[k]) { try { _stripeElements[k].destroy(); } catch(e) {} _stripeElements[k] = null; }
  });

  try {
    if (!_stripe) _stripe = Stripe(pk);
    var elements = _stripe.elements();
    var style = {
      base: { fontSize: '14px', color: '#e2e8f0', '::placeholder': { color: '#64748b' } },
      invalid: { color: '#ef4444' }
    };

    _stripeElements.number = elements.create('cardNumber', { style: style });
    _stripeElements.expiry = elements.create('cardExpiry', { style: style });
    _stripeElements.cvc    = elements.create('cardCvc',    { style: style });

    _stripeElements.number.mount('#stripe-card-number');
    _stripeElements.expiry.mount('#stripe-card-expiry');
    _stripeElements.cvc.mount('#stripe-card-cvc');

    ['number', 'expiry', 'cvc'].forEach(function(k) {
      _stripeElements[k].on('change', function(e) {
        var errEl = document.getElementById('stripe-card-error');
        if (!errEl) return;
        if (e.error) { errEl.textContent = e.error.message; errEl.style.display = 'block'; }
        else { errEl.style.display = 'none'; }
      });
    });
  } catch(e) {
    console.error('Stripe mount error:', e);
  }
}

function updatePaymentMethod() {
  openModal('modal-payment');
  requestAnimationFrame(function() {
    requestAnimationFrame(mountStripeCard);
  });
}

async function savePaymentMethod() {
  if (!_stripe || !_stripeElements.number) return;
  var btn = document.getElementById('stripe-save-btn');
  btn.disabled = true;
  btn.textContent = 'Saving...';

  var { paymentMethod, error } = await _stripe.createPaymentMethod({
    type: 'card',
    card: _stripeElements.number
  });

  if (error) {
    var errEl = document.getElementById('stripe-card-error');
    errEl.textContent = error.message;
    errEl.style.display = 'block';
    btn.disabled = false;
    btn.textContent = 'Save Card';
    return;
  }

  // Store card display info locally
  _billingData.paymentMethod = {
    id: paymentMethod.id,
    last4: paymentMethod.card.last4,
    brand: paymentMethod.card.brand,
    expiry: paymentMethod.card.exp_month + '/' + paymentMethod.card.exp_year
  };
  saveBilling();
  closeModal('modal-payment');
  renderPaymentMethod();
  toast('Payment method saved!', 'success');
}

// ---- Invoices ----

function renderInvoices() {
  var container = document.getElementById('billing-invoices');
  if (!container) return;

  if (!_billingData.invoices || _billingData.invoices.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text-muted);">No invoices yet</div>';
    return;
  }

  var html = '<div class="table-wrap"><table><thead><tr>';
  html += '<th>Invoice</th><th>Date</th><th>Plan</th><th>Amount</th><th>Status</th>';
  html += '</tr></thead><tbody>';

  _billingData.invoices.forEach(function(inv) {
    var statusBadge = inv.status === 'paid' ? '<span class="badge badge-success">Paid</span>' :
                      inv.status === 'failed' ? '<span class="badge badge-danger">Failed</span>' :
                      '<span class="badge badge-warning">Pending</span>';

    html += '<tr>';
    html += '<td style="font-weight:600;font-family:\'SF Mono\',monospace;font-size:13px;">' + inv.id + '</td>';
    html += '<td>' + inv.date + '</td>';
    html += '<td>' + (inv.plan || '—') + '</td>';
    html += '<td style="font-weight:600;">$' + inv.amount.toFixed(2) + '</td>';
    html += '<td>' + statusBadge + '</td>';
    html += '</tr>';
  });

  html += '</tbody></table></div>';
  container.innerHTML = html;
}

onPageLoad('billing', loadBilling);
