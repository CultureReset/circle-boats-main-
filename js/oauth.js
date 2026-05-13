// ============================================
// Connections — Stripe Connect + OAuth cards
// ============================================
//
// STRIPE CONNECT (STANDARD) FLOW:
// ┌──────────────┐     ┌──────────────────┐     ┌──────────────┐
// │  Owner clicks │────>│  Stripe.com      │────>│  Owner logs  │
// │  "Connect"    │     │  OAuth authorize │     │  into Stripe │
// └──────────────┘     └──────────────────┘     └──────┬───────┘
//                                                       │ Authorizes
// ┌──────────────┐     ┌──────────────────┐            │
// │  We store     │<───│  Stripe sends    │<───────────┘
// │  account_id   │     │  auth code back  │
// │  (that's it!) │     │  to our callback │
// └──────────────┘     └──────────────────┘
//
// AT CHECKOUT:
// ┌──────────────┐     ┌──────────────────┐     ┌──────────────┐
// │  Customer    │────>│  Our Edge Fn      │────>│  Stripe API  │
// │  clicks pay  │     │  creates session  │     │  charges card│
// └──────────────┘     │  with:            │     └──────────────┘
//                       │  - account_id     │           │
//                       │  - app_fee (1%)   │     ┌─────┴────────┐
//                       └──────────────────┘     │  99% → Owner  │
//                                                 │  1%  → You    │
//                                                 └──────────────┘
//
// NO API KEYS EVER TOUCH YOUR PLATFORM.
// You only store the Stripe Connect account_id.
// ============================================

var STRIPE_CONNECT_STORAGE = 'beachside_stripe_connect';

// Capture OAuth callback params immediately — before the router strips them from the hash
var _initialHash = window.location.hash;
var _initialHashParams = new URLSearchParams(
  _initialHash.indexOf('?') !== -1 ? _initialHash.split('?')[1] : ''
);

// Your platform's Stripe Connect client ID (set this in production)
var PLATFORM_CLIENT_ID = window.CC_STRIPE_CLIENT_ID || 'ca_DEMO_your_platform_client_id';
var PLATFORM_FEE_PERCENT = 1; // Your cut: 1% of every transaction

var _stripeConnect = {
  accountId: '',
  connected: false,
  businessName: '',
  email: ''
};

var _connections = {
  square: { connected: false, label: 'Square', desc: 'POS and payment processing', icon: 'Sq', color: '#006aff' },
  paypal: { connected: false, label: 'PayPal', desc: 'Accept PayPal payments', icon: 'PP', color: '#003087' },
  google_analytics: { connected: false, label: 'Google Analytics', desc: 'Track site visitors and behavior', icon: 'GA', color: '#e37400' },
  google_business: { connected: false, label: 'Google Business', desc: 'Manage your Google listing', icon: 'GB', color: '#4285f4' },
  google_maps: { connected: false, label: 'Google Maps', desc: 'Show your location on a map', icon: 'GM', color: '#34a853' }
};

var _socialConnections = {
  facebook: { connected: false, label: 'Facebook', desc: 'Post updates, manage your page', icon: 'f', color: '#1877f2', scope: 'pages_manage_posts,pages_read_engagement' },
  instagram: { connected: false, label: 'Instagram', desc: 'Share photos and stories', icon: 'IG', color: '#e4405f', scope: 'instagram_basic,instagram_content_publish' },
  tiktok: { connected: false, label: 'TikTok', desc: 'Share short-form videos', icon: 'TT', color: '#000000', scope: 'video.publish' },
  twitter: { connected: false, label: 'Twitter / X', desc: 'Post updates and engage followers', icon: 'X', color: '#14171a', scope: 'tweet.read,tweet.write' },
  youtube: { connected: false, label: 'YouTube', desc: 'Upload videos, manage your channel', icon: 'YT', color: '#ff0000', scope: 'youtube.upload' }
};

var _manualKeyStatus = { saved: false, mode: '' };

// ─── Google Business state ────────────────────────────────────────────────
var _googleBusiness = { connected: false, account_email: '', account_name: '', account_id: '', locations: [] };

// ─── WhatsApp Business state ──────────────────────────────────────────────
var _whatsappBusiness = { connected: false, phone_number: '', waba_id: '' };

function loadConnections() {
  // Check URL for OAuth callback first (after Stripe / Google redirect)
  checkStripeCallback();
  checkGoogleCallback();
  checkSquareCallback();

  // Fetch Stripe status from API
  var token = getAuthToken();
  if (token) {
    fetch((window.CC_API_BASE || '') + '/api/stripe/status', {
      headers: { 'Authorization': 'Bearer ' + token }
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      _stripeConnect.connected = data.connected;
      _stripeConnect.accountId = data.accountId || '';
      _manualKeyStatus.saved = !!data.manualKey;
      _manualKeyStatus.mode  = data.manualKey ? (data.accountName || 'saved') : '';
      _manualKeyStatus.testKey = !!data.testKey;
      _manualKeyStatus.stripeMode = data.stripeMode || 'live';
      try { localStorage.setItem(STRIPE_CONNECT_STORAGE, JSON.stringify(_stripeConnect)); } catch(e) {}
      renderStripeSection();
    })
    .catch(function() {
      try {
        var saved = localStorage.getItem(STRIPE_CONNECT_STORAGE);
        if (saved) {
          var parsed = JSON.parse(saved);
          _stripeConnect.accountId = parsed.accountId || '';
          _stripeConnect.connected = !!parsed.accountId;
        }
      } catch(e) {}
      renderStripeSection();
    });
  } else {
    renderStripeSection();
  }

  // Fetch Square status from API
  if (token) {
    fetch((window.CC_API_BASE || '') + '/api/square/status', {
      headers: { 'Authorization': 'Bearer ' + token }
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      _connections.square.connected = !!data.connected;
      if (data.merchantName) _connections.square.label = data.merchantName;
      renderPaymentConnections();
    })
    .catch(function() {});
  }

  // Load saved social connections from localStorage
  try {
    var savedSocial = localStorage.getItem('beachside_social_connections');
    if (savedSocial) {
      var parsedSocial = JSON.parse(savedSocial);
      Object.keys(parsedSocial).forEach(function(key) {
        if (_socialConnections[key]) {
          _socialConnections[key].connected = !!parsedSocial[key].connected;
          _socialConnections[key].username = parsedSocial[key].username || '';
          _socialConnections[key].pageId = parsedSocial[key].pageId || '';
        }
      });
    }
  } catch(e) {}

  renderPaymentConnections();
  loadGoogleBusinessStatus();   // fetches real status from API, then renders
  loadWhatsAppBusinessStatus(); // fetches real status from API, then renders
  renderSocialConnections();
}

function checkStripeCallback() {
  // Check URL params for Stripe OAuth callback result
  var params = new URLSearchParams(window.location.search);

  // Use _initialHashParams — captured before the router strips them
  var connected = params.get('stripe_connected') || _initialHashParams.get('stripe_connected');
  var accountId = params.get('account_id') || _initialHashParams.get('account_id');
  var stripeError = params.get('stripe_error') || _initialHashParams.get('stripe_error');

  if (connected === 'true') {
    _stripeConnect.accountId = accountId || '';
    _stripeConnect.connected = true;
    try { localStorage.setItem(STRIPE_CONNECT_STORAGE, JSON.stringify(_stripeConnect)); } catch(e) {}
    window.history.replaceState({}, '', window.location.pathname + window.location.hash.split('?')[0]);
    toast('Stripe connected successfully! You can now accept payments.');
  }

  if (stripeError) {
    toast('Stripe connection failed: ' + decodeURIComponent(stripeError), 'error');
    window.history.replaceState({}, '', window.location.pathname + window.location.hash.split('?')[0]);
  }
}

function checkSquareCallback() {
  var connected = _initialHashParams.get('square_connected');
  var squareError = _initialHashParams.get('square_error');

  if (connected === 'true') {
    window.history.replaceState({}, '', window.location.pathname + window.location.hash.split('?')[0]);
    toast('Square connected! Finalizing setup...');
    // Auto-fetch location ID in case callback couldn't get it
    var token = getAuthToken();
    if (token) {
      fetch((window.CC_API_BASE || '') + '/api/square/refresh-location', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token }
      }).then(function(r) { return r.json(); }).then(function(d) {
        if (d.success) toast('Square connected successfully! You can now accept payments.');
        else toast('Square connected. You may need to reconnect if payments fail.', 'error');
      }).catch(function() {
        toast('Square connected successfully! You can now accept payments.');
      });
    }
  }
  if (squareError) {
    toast('Square connection failed: ' + decodeURIComponent(squareError), 'error');
    window.history.replaceState({}, '', window.location.pathname + window.location.hash.split('?')[0]);
  }
}

function renderStripeSection() {
  var container = document.getElementById('stripe-settings');
  if (!container) return;

  var isConnected = _stripeConnect.connected;

  var html = '';

  // Header
  html += '<div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;">';
  html += '<div style="width:48px;height:48px;border-radius:var(--radius);background:#635bff;display:flex;align-items:center;justify-content:center;">';
  html += '<svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"/></svg>';
  html += '</div>';
  html += '<div style="flex:1;">';
  html += '<h4 style="margin:0;font-size:16px;">Stripe Payments</h4>';
  html += '<p style="margin:4px 0 0;font-size:13px;color:var(--text-muted);">Add your Stripe key to accept payments</p>';
  html += '</div>';
  if (isConnected) {
    html += '<span class="badge badge-success">Connected</span>';
  } else {
    html += '<span class="badge badge-warning">Not connected</span>';
  }
  html += '</div>';

  if (false && isConnected) {
    // ---- CONNECTED STATE (OAuth — hidden while Connect account is suspended) ----
    html += '<div style="padding:16px 20px;background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.2);border-radius:var(--radius);margin-bottom:20px;">';
    html += '<div style="display:flex;align-items:center;gap:12px;">';
    html += '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>';
    html += '<div>';
    html += '<strong style="color:var(--text);">Stripe account connected</strong><br>';
    html += '<span style="font-size:12px;color:var(--text-muted);">Account: ' + escHtml(_stripeConnect.accountId) + '</span>';
    if (_stripeConnect.email) html += '<br><span style="font-size:12px;color:var(--text-muted);">' + escHtml(_stripeConnect.email) + '</span>';
    html += '</div>';
    html += '</div>';
    html += '</div>';

    // Payment flow explanation
    html += '<div style="padding:16px 20px;background:rgba(99,91,255,0.08);border:1px solid rgba(99,91,255,0.2);border-radius:var(--radius);margin-bottom:20px;">';
    html += '<strong style="color:var(--text);font-size:14px;">How payments work:</strong>';
    html += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-top:12px;">';

    html += '<div style="text-align:center;padding:12px;">';
    html += '<div style="font-size:24px;margin-bottom:6px;">🛒</div>';
    html += '<div style="font-size:12px;color:var(--text-muted);">Customer books on your site</div>';
    html += '</div>';

    html += '<div style="text-align:center;padding:12px;">';
    html += '<div style="font-size:24px;margin-bottom:6px;">💳</div>';
    html += '<div style="font-size:12px;color:var(--text-muted);">Pays on Stripe\'s secure checkout</div>';
    html += '</div>';

    html += '<div style="text-align:center;padding:12px;">';
    html += '<div style="font-size:24px;margin-bottom:6px;">💰</div>';
    html += '<div style="font-size:12px;color:var(--text-muted);">Money goes to YOUR Stripe account</div>';
    html += '</div>';

    html += '</div>';
    html += '<p style="font-size:12px;color:var(--text-dim);margin:12px 0 0;text-align:center;">Stripe fee: 2.9% + 30¢ | Platform fee: ' + PLATFORM_FEE_PERCENT + '% — you keep the rest</p>';
    html += '</div>';

    html += '<div style="display:flex;gap:10px;">';
    html += '<a href="https://dashboard.stripe.com" target="_blank" class="btn btn-outline btn-sm">Open Stripe Dashboard</a>';
    html += '<button class="btn btn-danger btn-sm" onclick="disconnectStripe()">Disconnect</button>';
    html += '</div>';

  }

  // ---- MANUAL KEY SECTION (via secure email link) ----
  html += '<div style="margin-top:24px;padding-top:24px;border-top:1px solid var(--card-border);">';
  html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">';
  html += '<span style="font-size:13px;font-weight:600;color:var(--text);">Or: Add Stripe Key via Secure Link</span>';
  if (_manualKeyStatus.saved) {
    html += '<span class="badge badge-success">Active</span>';
  }
  html += '</div>';

  html += '<div style="display:flex;gap:8px;margin-bottom:10px;">';
  if (_manualKeyStatus.saved) html += '<span style="font-size:12px;color:#22c55e;">✓ Live key saved</span>&nbsp;';
  if (_manualKeyStatus.testKey) html += '<span style="font-size:12px;color:#f59e0b;">✓ Test key saved</span>';
  if (_manualKeyStatus.saved || _manualKeyStatus.testKey) {
    html += '<button class="btn btn-danger btn-sm" style="margin-left:auto;" onclick="deleteStripeKey()">Remove All</button>';
  }
  html += '</div>';
  // Mode toggle
  var isLiveMode = _manualKeyStatus.stripeMode !== 'test';
  html += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;padding:10px 14px;background:var(--bg);border:1px solid var(--card-border);border-radius:var(--radius);">';
  html += '<span style="font-size:13px;color:var(--text);font-weight:600;">Payment Mode:</span>';
  html += '<button onclick="setStripeMode(\'test\')" class="btn btn-sm" style="' + (!isLiveMode ? 'background:#f59e0b;color:#fff;' : 'background:var(--card-border);color:var(--text-muted);') + '">Test</button>';
  html += '<button onclick="setStripeMode(\'live\')" class="btn btn-sm" style="' + (isLiveMode ? 'background:#22c55e;color:#fff;' : 'background:var(--card-border);color:var(--text-muted);') + '">Live</button>';
  html += '<span style="font-size:12px;color:var(--text-muted);">' + (isLiveMode ? 'Real payments' : 'Test cards only') + '</span>';
  html += '</div>';
    html += '<div style="display:flex;gap:8px;margin-bottom:8px;">';
    html += '<input id="stripe-live-key" type="password" placeholder="sk_live_..." style="flex:1;padding:10px 14px;border:1px solid var(--card-border);border-radius:var(--radius);background:var(--bg);color:var(--text);font-size:13px;font-family:monospace;">';
    html += '<button class="btn btn-primary" onclick="saveStripeKeyDirect(\'live\')" id="save-live-key-btn" style="white-space:nowrap;">Save Live</button>';
    html += '</div>';
    html += '<div style="display:flex;gap:8px;margin-bottom:10px;">';
    html += '<input id="stripe-test-key" type="password" placeholder="sk_test_..." style="flex:1;padding:10px 14px;border:1px solid var(--card-border);border-radius:var(--radius);background:var(--bg);color:var(--text);font-size:13px;font-family:monospace;">';
    html += '<button class="btn btn-secondary" onclick="saveStripeKeyDirect(\'test\')" id="save-test-key-btn" style="white-space:nowrap;">Save Test</button>';
    html += '</div>';
    html += '<div style="display:flex;gap:10px;align-items:center;">';
    html += '<input id="stripe-setup-email" type="email" placeholder="Or enter email to send secure link" style="flex:1;padding:10px 14px;border:1px solid var(--card-border);border-radius:var(--radius);background:var(--bg);color:var(--text);font-size:13px;">';
    html += '<button class="btn btn-secondary" onclick="sendStripeKeyLink()" id="send-key-link-btn" style="white-space:nowrap;">Send Link</button>';
    html += '</div>';
  html += '</div>';

  container.innerHTML = html;
}

function saveStripeKeyDirect(mode) {
  var token = getAuthToken();
  if (!token) { toast('Please log in first', 'error'); return; }

  var inputId = mode === 'test' ? 'stripe-test-key' : 'stripe-live-key';
  var btnId = mode === 'test' ? 'save-test-key-btn' : 'save-live-key-btn';
  var keyInput = document.getElementById(inputId);
  var secretKey = keyInput ? keyInput.value.trim() : '';
  if (!secretKey) { toast('Please enter a Stripe key', 'error'); return; }

  var expectedPrefix = mode === 'test' ? 'sk_test_' : 'sk_live_';
  if (!secretKey.startsWith(expectedPrefix)) {
    toast('Key must start with ' + expectedPrefix, 'error');
    return;
  }
  if (!/^sk_(test|live)_.{20,}$/.test(secretKey)) {
    toast('Invalid key format', 'error');
    return;
  }

  var btn = document.getElementById(btnId);
  if (btn) { btn.textContent = 'Saving...'; btn.disabled = true; }

  fetch((window.CC_API_BASE || '') + '/api/stripe/save-key', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret_key: secretKey })
  })
  .then(function(r) { return r.json(); })
  .then(function(data) {
    if (data.error) {
      toast('Error: ' + data.error, 'error');
      if (btn) { btn.textContent = mode === 'test' ? 'Save Test' : 'Save Live'; btn.disabled = false; }
      return;
    }
    toast((mode === 'live' ? 'Live' : 'Test') + ' key saved and encrypted.');
    if (keyInput) keyInput.value = '';
    renderStripeSection();
  })
  .catch(function(err) {
    toast('Error: ' + err.message, 'error');
    if (btn) { btn.textContent = mode === 'test' ? 'Save Test' : 'Save Live'; btn.disabled = false; }
  });
}

function setStripeMode(mode) {
  var token = getAuthToken();
  if (!token) return;
  fetch((window.CC_API_BASE || '') + '/api/stripe/set-mode', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: mode })
  })
  .then(function(r) { return r.json(); })
  .then(function(data) {
    if (data.error) { toast('Error: ' + data.error, 'error'); return; }
    toast('Switched to ' + mode + ' mode.');
    _manualKeyStatus.stripeMode = mode;
    renderStripeSection();
  })
  .catch(function(err) { toast('Error: ' + err.message, 'error'); });
}

function sendStripeKeyLink() {
  var token = getAuthToken();
  if (!token) { toast('Please log in first', 'error'); return; }

  var emailInput = document.getElementById('stripe-setup-email');
  var email = emailInput ? emailInput.value.trim() : '';
  if (!email) { toast('Please enter an email address', 'error'); return; }

  var btn = document.getElementById('send-key-link-btn');
  if (btn) { btn.textContent = '📧 Sending...'; btn.disabled = true; }

  fetch((window.CC_API_BASE || '') + '/api/stripe/send-key-link', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email })
  })
  .then(function(r) { return r.json(); })
  .then(function(data) {
    if (data.error) {
      toast('Error: ' + data.error, 'error');
      if (btn) { btn.textContent = '📧 Send Setup Email'; btn.disabled = false; }
      return;
    }
    toast('Setup email sent to ' + data.email + '. Check your inbox for the secure link.');
    if (btn) { btn.textContent = '📧 Email Sent'; btn.disabled = true; }
  })
  .catch(function(err) {
    toast('Error sending email: ' + err.message, 'error');
    if (btn) { btn.textContent = '📧 Send Setup Email'; btn.disabled = false; }
  });
}

function deleteStripeKey() {
  if (!confirm('Remove your Stripe API key? Payments will stop working until you add a key or connect via Stripe.')) return;
  var token = getAuthToken();
  fetch((window.CC_API_BASE || '') + '/api/stripe/delete-key', {
    method: 'DELETE',
    headers: { 'Authorization': 'Bearer ' + token }
  })
  .then(function() {
    _manualKeyStatus.saved = false;
    _manualKeyStatus.mode  = '';
    toast('Stripe key removed');
    renderStripeSection();
  })
  .catch(function() { toast('Error removing key', 'error'); });
}

function getAuthToken() {
  // Check Supabase session first (primary auth method)
  try {
    var sbKey = Object.keys(localStorage).find(function(k) { return k.startsWith('sb-') && k.endsWith('-auth-token'); });
    if (sbKey) {
      var sbSession = JSON.parse(localStorage.getItem(sbKey));
      if (sbSession && sbSession.access_token) return sbSession.access_token;
    }
  } catch(e) {}
  // Fallback to legacy token
  return localStorage.getItem('cc_token') || sessionStorage.getItem('cc_token') || localStorage.getItem('auth_token') || null;
}

function startStripeConnect() {
  // Fetch the OAuth URL from backend, then redirect to Stripe
  var token = getAuthToken();
  if (!token) {
    toast('Please log in first', 'error');
    return;
  }

  fetch((window.CC_API_BASE || '') + '/api/stripe/connect-url', {
    headers: { 'Authorization': 'Bearer ' + token }
  })
  .then(function(r) { return r.json(); })
  .then(function(data) {
    if (data.url) {
      window.location.href = data.url;
    } else if (data.error) {
      // Stripe not configured yet — show helpful message
      toast('Stripe Connect is not configured on the server yet. Add your STRIPE_CLIENT_ID to .env', 'error');
    } else {
      toast('Could not get Stripe connection URL', 'error');
    }
  })
  .catch(function(err) {
    toast('Error connecting to Stripe: ' + err.message, 'error');
  });
}

function disconnectStripe() {
  if (!confirm('Disconnect Stripe? Customers won\'t be able to pay online until you reconnect.')) return;

  var token = getAuthToken();
  fetch((window.CC_API_BASE || '') + '/api/stripe/disconnect', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token }
  })
  .then(function() {
    _stripeConnect = { accountId: '', connected: false, businessName: '', email: '' };
    try { localStorage.removeItem(STRIPE_CONNECT_STORAGE); } catch(e) {}
    renderStripeSection();
    toast('Stripe disconnected');
  })
  .catch(function() {
    // Disconnect locally even if API call fails
    _stripeConnect = { accountId: '', connected: false, businessName: '', email: '' };
    try { localStorage.removeItem(STRIPE_CONNECT_STORAGE); } catch(e) {}
    renderStripeSection();
    toast('Stripe disconnected');
  });
}

// ---- Other providers (OAuth-based) ----

function renderPaymentConnections() {
  var container = document.getElementById('payment-connections');
  var html = '';
  ['square', 'paypal'].forEach(function(key) { html += buildConnectionCard(key); });
  container.innerHTML = html;
}

function buildConnectionCard(key) {
  var conn = _connections[key];
  var statusBadge = conn.connected
    ? '<span class="badge badge-success">Connected</span>'
    : '<span class="badge badge-warning">Not connected</span>';
  var btnLabel = conn.connected ? 'Disconnect' : 'Connect';
  var btnClass = conn.connected ? 'btn btn-outline btn-sm' : 'btn btn-primary btn-sm';
  var html = '<div class="oauth-card">';
  html += '<div class="provider-icon" style="background:' + conn.color + ';color:white;font-weight:700;font-size:14px;">' + conn.icon + '</div>';
  html += '<div class="provider-info">';
  html += '<h4>' + conn.label + '</h4>';
  html += '<p>' + conn.desc + '</p>';
  html += '<div style="margin-top:8px;display:flex;align-items:center;gap:8px;">' + statusBadge;
  html += '<button class="' + btnClass + '" onclick="toggleConnection(\'' + key + '\')">' + btnLabel + '</button>';
  html += '</div></div></div>';
  return html;
}

function toggleConnection(key) {
  if (key === 'square') {
    if (_connections.square.connected) {
      if (!confirm('Disconnect Square?')) return;
      var token = getAuthToken();
      fetch((window.CC_API_BASE || '') + '/api/square/disconnect', {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer ' + token }
      })
      .then(function() {
        _connections.square.connected = false;
        renderPaymentConnections();
        toast('Square disconnected');
      })
      .catch(function() { toast('Error disconnecting Square', 'error'); });
    } else {
      startSquareConnect();
    }
    return;
  }
  var conn = _connections[key];
  if (!conn) return;
  if (conn.connected) {
    if (!confirm('Disconnect ' + conn.label + '?')) return;
    conn.connected = false;
    toast(conn.label + ' disconnected');
  } else {
    conn.connected = true;
    toast(conn.label + ' connected successfully');
  }
  renderPaymentConnections();
  renderGoogleConnections();
}

function startSquareConnect() {
  var token = getAuthToken();
  if (!token) { toast('Please log in first', 'error'); return; }
  fetch((window.CC_API_BASE || '') + '/api/square/connect-url', {
    headers: { 'Authorization': 'Bearer ' + token }
  })
  .then(function(r) { return r.json(); })
  .then(function(data) {
    if (data.error) { toast('Square not available: ' + data.error, 'error'); return; }
    window.location.href = data.url;
  })
  .catch(function(err) { toast('Error: ' + err.message, 'error'); });
}

// ─── Check for Google OAuth callback result ───────────────────────────────
function checkGoogleCallback() {
  var urlParams  = new URLSearchParams(window.location.search);
  var connected  = _initialHashParams.get('google_connected') || urlParams.get('google_connected');
  var gErr       = _initialHashParams.get('google_error')     || urlParams.get('google_error');

  if (connected === '1') {
    toast('Google Business Profile connected!');
    window.history.replaceState({}, '', window.location.pathname + window.location.hash.split('?')[0]);
    loadGoogleBusinessStatus();
  } else if (gErr) {
    toast('Google connection failed: ' + decodeURIComponent(gErr), 'error');
    window.history.replaceState({}, '', window.location.pathname + window.location.hash.split('?')[0]);
  }
}

// ─── Load real Google Business status from API ────────────────────────────
function loadGoogleBusinessStatus() {
  var token = getAuthToken();
  if (!token) { renderGoogleConnections(); return; }

  fetch((window.CC_API_BASE || '') + '/api/dashboard/google-business/status', {
    headers: { 'Authorization': 'Bearer ' + token }
  })
  .then(function(r) { return r.json(); })
  .then(function(data) {
    _googleBusiness.connected    = !!data.connected;
    _googleBusiness.account_email = data.account_email || '';
    _googleBusiness.account_name  = data.account_name  || '';
    _googleBusiness.account_id    = data.account_id    || '';
    _googleBusiness.locations     = data.accounts       || [];
    renderGoogleConnections();
  })
  .catch(function() { renderGoogleConnections(); });
}

function renderGoogleConnections() {
  var container = document.getElementById('google-connections');
  if (!container) return;
  var html = '';

  // ── Google Business Profile (REAL OAuth) ────────────────────────────────
  html += '<div class="oauth-card">';
  html += '<div class="provider-icon" style="background:#4285f4;color:white;font-weight:700;font-size:14px;">GB</div>';
  html += '<div class="provider-info">';
  html += '<h4>Google Business Profile</h4>';

  if (_googleBusiness.connected) {
    html += '<p style="color:var(--success,#22c55e);">✓ Connected' +
      (_googleBusiness.account_email ? ' as ' + escHtml(_googleBusiness.account_email) : '') + '</p>';
    if (_googleBusiness.account_name) {
      html += '<p style="font-size:12px;color:var(--text-muted);">Account: ' + escHtml(_googleBusiness.account_name) + '</p>';
    }
    html += '<div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;">';
    html += '<button class="btn btn-primary btn-sm" onclick="syncGoogleReviews()">↻ Sync Reviews</button>';
    html += '<button class="btn btn-outline btn-sm" onclick="disconnectGoogleBusiness()">Disconnect</button>';
    html += '</div>';
  } else {
    html += '<p>Connect your Google Business Profile to sync reviews and manage your listing.</p>';
    html += '<div style="margin-top:8px;">';
    html += '<button class="btn btn-primary btn-sm" onclick="startGoogleBusinessConnect()" style="display:inline-flex;align-items:center;gap:8px;">';
    html += '<svg width="16" height="16" viewBox="0 0 24 24"><path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>';
    html += 'Connect Google Business</button>';
    html += '</div>';
  }

  html += '</div></div>';

  // ── Google Analytics (placeholder — coming soon) ──────────────────────
  html += buildComingSoonCard('Google Analytics', 'GA', '#e37400', 'Track site visitors and conversion data');

  // ── Google Maps (placeholder — coming soon) ───────────────────────────
  html += buildComingSoonCard('Google Maps', 'GM', '#34a853', 'Show your location on a map embed');

  container.innerHTML = html;
}

function buildComingSoonCard(label, icon, color, desc) {
  var html = '<div class="oauth-card" style="opacity:.7;">';
  html += '<div class="provider-icon" style="background:' + color + ';color:white;font-weight:700;font-size:14px;">' + icon + '</div>';
  html += '<div class="provider-info">';
  html += '<h4>' + label + ' <span style="font-size:11px;background:var(--card-border);color:var(--text-muted);padding:2px 6px;border-radius:4px;vertical-align:middle;">Coming soon</span></h4>';
  html += '<p>' + desc + '</p>';
  html += '</div></div>';
  return html;
}

function startGoogleBusinessConnect() {
  var token = getAuthToken();
  if (!token) { toast('Please log in first', 'error'); return; }

  // Get site_id from current user session
  var siteId = window.CC_SITE_ID || '';
  var apiBase = window.CC_API_BASE || '';
  var returnTo = encodeURIComponent(window.location.href);

  var url = apiBase + '/api/google-business/auth'
    + '?site_id=' + encodeURIComponent(siteId)
    + '&jwt='     + encodeURIComponent(token)
    + '&return_to=' + returnTo;

  window.location.href = url;
}

function disconnectGoogleBusiness() {
  if (!confirm('Disconnect Google Business Profile?')) return;
  var token = getAuthToken();
  if (!token) return;

  fetch((window.CC_API_BASE || '') + '/api/dashboard/google-business/disconnect', {
    method:  'DELETE',
    headers: { 'Authorization': 'Bearer ' + token }
  })
  .then(function() {
    _googleBusiness = { connected: false, account_email: '', account_name: '', account_id: '', locations: [] };
    renderGoogleConnections();
    toast('Google Business disconnected');
  })
  .catch(function(err) { toast('Error disconnecting: ' + err.message, 'error'); });
}

function syncGoogleReviews() {
  var token = getAuthToken();
  if (!token) return;
  toast('Syncing Google reviews…');

  fetch((window.CC_API_BASE || '') + '/api/dashboard/google-business/sync-reviews', {
    method:  'POST',
    headers: { 'Authorization': 'Bearer ' + token }
  })
  .then(function(r) { return r.json(); })
  .then(function(data) {
    if (data.error) { toast(data.error, 'error'); return; }
    toast('Synced ' + data.imported + ' new review' + (data.imported !== 1 ? 's' : '') + ' from Google');
  })
  .catch(function(err) { toast('Sync failed: ' + err.message, 'error'); });
}

// ---- Social Media OAuth ----

// ─── WhatsApp Business OAuth ──────────────────────────────────────────────

function loadWhatsAppBusinessStatus() {
  var apiBase = window.CC_API_BASE || '';
  getSupabaseBusiness().then(function() {
    var siteId = getSiteId() || window.CC_SITE_ID || '';
    if (!siteId) { renderWhatsAppCard(); return; }
    fetch(apiBase + '/api/whatsapp/status?site_id=' + encodeURIComponent(siteId))
      .then(function(r) { return r.json(); })
      .then(function(data) {
        _whatsappBusiness.connected    = !!data.connected;
        _whatsappBusiness.phone_number = data.phone_number || '';
        _whatsappBusiness.waba_id      = data.waba_id || '';
        renderWhatsAppCard();
      })
      .catch(function() { renderWhatsAppCard(); });
  });
}

function renderWhatsAppCard() {
  var container = document.getElementById('whatsapp-oauth-card');
  if (!container) return;
  var html = '<div class="oauth-card">';
  html += '<div class="provider-icon" style="background:#25d366;color:white;font-weight:700;font-size:16px;">W</div>';
  html += '<div class="provider-info">';
  html += '<h4>WhatsApp Business</h4>';

  if (_whatsappBusiness.connected) {
    html += '<p style="color:var(--success,#22c55e);">✓ Connected — booking alerts active</p>';
    if (_whatsappBusiness.phone_number) {
      html += '<p style="font-size:12px;color:var(--text-muted);">Business number: ' + escHtml(_whatsappBusiness.phone_number) + '</p>';
    }
    html += '<div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;">';
    html += '<button class="btn btn-outline btn-sm" onclick="disconnectWhatsAppBusiness()">Disconnect</button>';
    html += '</div>';
  } else {
    html += '<p>Connect your WhatsApp Business account to receive booking notifications on WhatsApp while SMS is pending approval.</p>';
    html += '<div style="margin-top:8px;">';
    html += '<button class="btn btn-primary btn-sm" onclick="startWhatsAppBusinessConnect()" style="display:inline-flex;align-items:center;gap:8px;">';
    html += '<svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M11.999 2C6.477 2 2 6.477 2 12c0 1.99.58 3.842 1.573 5.403L2 22l4.761-1.546C8.15 21.41 10.012 22 12 22c5.523 0 10-4.477 10-10S17.522 2 12 2z"/></svg>';
    html += 'Connect WhatsApp Business</button>';
    html += '</div>';
    html += '<div style="margin-top:8px;font-size:11px;color:var(--text-dim);">You\'ll be redirected to Meta/Facebook to authorize your WhatsApp Business account.</div>';
  }

  html += '</div></div>';
  container.innerHTML = html;
}

function loadFbSdk(callback) {
  if (window.FB) { callback(); return; }
  window.fbAsyncInit = function() {
    FB.init({
      appId: window.META_APP_ID || '',
      cookie: true,
      xfbml: false,
      version: 'v21.0'
    });
    callback();
  };
  if (!document.getElementById('facebook-jssdk')) {
    var js = document.createElement('script');
    js.id = 'facebook-jssdk';
    js.src = 'https://connect.facebook.net/en_US/sdk.js';
    document.head.appendChild(js);
  }
}

function startWhatsAppBusinessConnect() {
  var siteId = getSiteId() || window.CC_SITE_ID || '';
  var apiBase = window.CC_API_BASE || '';
  if (!siteId) { toast('Session error — please refresh and try again.', 'error'); return; }
  if (!window.META_APP_ID) { toast('WhatsApp Business not yet configured on this platform. Contact support.', 'error'); return; }

  loadFbSdk(function() {
    var loginOptions = {
      response_type: 'code',
      override_default_response_type: true,
      scope: 'whatsapp_business_management,whatsapp_business_messaging,business_management'
    };
    // Use Embedded Signup config if provided
    if (window.META_WHATSAPP_CONFIG_ID) {
      loginOptions.config_id = window.META_WHATSAPP_CONFIG_ID;
      loginOptions.extras = { setup: {}, featureType: '', sessionInfoVersion: '2' };
    }

    FB.login(function(response) {
      if (!response.authResponse || !response.authResponse.code) {
        toast('WhatsApp authorization cancelled.', 'error');
        return;
      }
      toast('Connecting WhatsApp Business...', 'success');
      fetch(apiBase + '/api/whatsapp/exchange-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: response.authResponse.code, site_id: siteId })
      })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (data.error) { toast('Connection failed: ' + data.error, 'error'); return; }
        _whatsappBusiness.connected    = true;
        _whatsappBusiness.phone_number = data.phone_number || '';
        _whatsappBusiness.waba_id      = data.waba_id || '';
        renderWhatsAppCard();
        // Also update the messaging section if visible
        if (typeof renderWhatsAppSection === 'function') renderWhatsAppSection();
        toast('WhatsApp Business connected! Booking alerts are active.', 'success');
      })
      .catch(function(err) { toast('Error: ' + err.message, 'error'); });
    }, loginOptions);
  });
}

function disconnectWhatsAppBusiness() {
  if (!confirm('Disconnect WhatsApp Business? Booking alerts will stop until you reconnect.')) return;
  var siteId  = getSiteId() || window.CC_SITE_ID || '';
  var apiBase = window.CC_API_BASE || '';
  fetch(apiBase + '/api/whatsapp/disconnect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ site_id: siteId })
  })
  .then(function() {
    _whatsappBusiness = { connected: false, phone_number: '', waba_id: '' };
    renderWhatsAppCard();
    if (typeof renderWhatsAppSection === 'function') renderWhatsAppSection();
    toast('WhatsApp Business disconnected.');
  })
  .catch(function(err) { toast('Error: ' + err.message, 'error'); });
}

function renderSocialConnections() {
  var container = document.getElementById('social-connections');
  if (!container) return;
  var html = '';
  Object.keys(_socialConnections).forEach(function(key) { html += buildSocialCard(key); });
  container.innerHTML = html;
}

function buildSocialCard(key) {
  var conn = _socialConnections[key];
  var statusHtml = conn.connected
    ? '<span class="badge badge-success">Connected</span>'
    : '<span class="badge badge-warning">Not connected</span>';
  var btnLabel = conn.connected ? 'Disconnect' : 'Connect';
  var btnClass = conn.connected ? 'btn btn-outline btn-sm' : 'btn btn-primary btn-sm';

  var usernameHtml = '';
  if (conn.connected && conn.username) {
    usernameHtml = '<div style="font-size:11px;color:var(--text-dim);margin-top:4px;">@' + escHtml(conn.username) + '</div>';
  }

  var html = '<div class="oauth-card">';
  html += '<div class="provider-icon" style="background:' + conn.color + ';color:white;font-weight:700;font-size:14px;">' + conn.icon + '</div>';
  html += '<div class="provider-info">';
  html += '<h4>' + conn.label + '</h4>';
  html += '<p>' + conn.desc + '</p>' + usernameHtml;
  html += '<div style="margin-top:8px;display:flex;align-items:center;gap:8px;">' + statusHtml;
  html += '<button class="' + btnClass + '" onclick="toggleSocialConnection(\'' + key + '\')">' + btnLabel + '</button>';
  html += '</div></div></div>';
  return html;
}

function toggleSocialConnection(key) {
  var conn = _socialConnections[key];
  if (!conn) return;

  if (conn.connected) {
    if (!confirm('Disconnect ' + conn.label + '? You won\'t be able to auto-post until you reconnect.')) return;
    conn.connected = false;
    conn.username = '';
    conn.pageId = '';
    toast(conn.label + ' disconnected');
  } else {
    // In production: redirect to OAuth
    // e.g. https://www.facebook.com/v18.0/dialog/oauth?client_id=APP_ID&redirect_uri=...&scope=pages_manage_posts
    var demoConfirm = confirm(
      'In production, you would be redirected to ' + conn.label + ' to authorize your account.\n\n' +
      'Click OK to simulate a successful ' + conn.label + ' connection.'
    );
    if (!demoConfirm) return;

    conn.connected = true;
    conn.username = 'beachsidecircleboats';
    conn.pageId = key + '_page_' + Date.now().toString(36);
    toast(conn.label + ' connected!');
  }

  // Save to localStorage
  var saveData = {};
  Object.keys(_socialConnections).forEach(function(k) {
    saveData[k] = {
      connected: _socialConnections[k].connected,
      username: _socialConnections[k].username || '',
      pageId: _socialConnections[k].pageId || ''
    };
  });
  try { localStorage.setItem('beachside_social_connections', JSON.stringify(saveData)); } catch(e) {}

  renderSocialConnections();
}

onPageLoad('connections', loadConnections);
