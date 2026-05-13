// ============================================
// Domain — Subdomain + Custom Domain setup
// ============================================
//
// ARCHITECTURE:
// ┌────────────────────────────────────────────────────────────┐
// │  Every business gets a FREE subdomain:                      │
// │  businessname.cybercheck.app                                │
// │                                                              │
// │  Optionally, they can add a CUSTOM DOMAIN:                  │
// │  1. User enters: beachsidecircleboats.com                   │
// │  2. We show them DNS instructions                           │
// │  3. They add CNAME → sites.cybercheck.app at their registrar│
// │  4. We verify DNS propagation                               │
// │  5. SSL auto-provisioned via Google Cloud / AWS / Cloudflare│
// │  6. Site is live on both subdomain AND custom domain        │
// └────────────────────────────────────────────────────────────┘
//
// HOSTING:
// - Static sites served from Google Cloud Storage / AWS S3
// - CDN: Cloudflare or Google Cloud CDN
// - SSL: Let's Encrypt via Cloudflare for SaaS, or
//         AWS Certificate Manager, or Google-managed certs
// - Routing: Cloud Load Balancer maps hostname → correct bucket

var DOMAIN_STORAGE = 'beachside_domain';

// Platform domain that all sites are hosted under
var PLATFORM_DOMAIN = 'cybercheck.app';
var PLATFORM_SITES_CNAME = 'sites.cybercheck.app';

var _domainData = {
  // Auto-assigned subdomain
  subdomain: 'beachside-circle-boats',
  subdomainActive: true,

  // Custom domain
  customDomain: '',
  customDomainVerified: false,
  customDomainSsl: 'none', // none | pending | active
  dnsRecordType: 'CNAME',  // CNAME or A record
  dnsVerifiedAt: null
};

async function loadDomain() {
  var apiData = await CC.dashboard.getDomain();
  if (apiData) {
    if (apiData.subdomain) _domainData.subdomain = apiData.subdomain;
    if (apiData.domain) { _domainData.customDomain = apiData.domain; _domainData.customDomainVerified = true; }
    _domainData.subdomainActive = true;
  }

  renderSubdomainSection();
  renderCustomDomainSection();
  renderDnsInstructions();
  renderSslStatus();
}

async function saveDomainData() {
  await CC.dashboard.updateDomain({ domain: _domainData.customDomain });
}

// ---- Subdomain ----

function renderSubdomainSection() {
  var container = document.getElementById('subdomain-section');
  if (!container) return;

  var fullSubdomain = _domainData.subdomain + '.' + PLATFORM_DOMAIN;

  var html = '';

  // Current subdomain display
  html += '<div style="display:flex;align-items:center;gap:16px;margin-bottom:20px;">';
  html += '<div style="flex:1;">';
  html += '<div style="font-size:11px;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Your free site address</div>';
  html += '<div style="display:flex;align-items:center;gap:10px;">';
  html += '<div style="font-size:20px;font-weight:700;color:var(--primary);font-family:\'SF Mono\',\'Fira Code\',monospace;">' + escHtml(fullSubdomain) + '</div>';
  html += _domainData.subdomainActive
    ? '<span class="badge badge-success">Active</span>'
    : '<span class="badge badge-warning">Inactive</span>';
  html += '</div>';
  html += '</div>';
  html += '<button class="btn btn-outline btn-sm" onclick="copyToClipboard(\'https://' + escHtml(fullSubdomain) + '\')">Copy URL</button>';
  html += '</div>';

  // Edit subdomain
  html += '<div style="display:flex;align-items:flex-end;gap:12px;">';
  html += '<div class="form-group" style="flex:1;margin-bottom:0;">';
  html += '<label>Subdomain</label>';
  html += '<div style="display:flex;align-items:center;">';
  html += '<input type="text" id="subdomain-input" value="' + escHtml(_domainData.subdomain) + '" style="border-radius:var(--radius) 0 0 var(--radius);border-right:none;" placeholder="your-business">';
  html += '<div style="padding:10px 14px;background:var(--card-border);border:1px solid var(--card-border);border-radius:0 var(--radius) var(--radius) 0;font-size:14px;color:var(--text-muted);white-space:nowrap;">.' + PLATFORM_DOMAIN + '</div>';
  html += '</div>';
  html += '</div>';
  html += '<button class="btn btn-primary btn-sm" onclick="saveSubdomain()" style="margin-bottom:0;">Save</button>';
  html += '</div>';

  html += '<p style="font-size:12px;color:var(--text-dim);margin-top:10px;">This is always free and active. Letters, numbers, and hyphens only.</p>';

  if (_domainData.customDomain) {
    html += '<div style="margin-top:20px;padding-top:20px;border-top:1px solid var(--card-border);">';
    html += '<div style="font-size:11px;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Your real domain</div>';
    html += '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">';
    html += '<div style="font-size:20px;font-weight:700;color:var(--text);font-family:\'SF Mono\',\'Fira Code\',monospace;flex:1;">' + escHtml(_domainData.customDomain) + '</div>';
    html += _domainData.customDomainVerified
      ? '<span class="badge badge-success">Active</span>'
      : '<span class="badge badge-warning">Pending DNS</span>';
    html += '</div>';
    html += '<div style="margin-top:12px;display:flex;align-items:center;gap:10px;">';
    html += '<input type="text" id="real-domain-input" value="' + escHtml(_domainData.customDomain) + '" placeholder="www.yourdomain.com" style="flex:1;">';
    html += '<button class="btn btn-primary btn-sm" onclick="saveRealDomain()" style="margin-bottom:0;">Save</button>';
    html += '</div>';
    html += '<p style="font-size:12px;color:var(--text-dim);margin-top:8px;">Enter your domain exactly as it should appear (e.g. www.beachsidecircleboats.com)</p>';
    html += '</div>';
  } else {
    html += '<div style="margin-top:20px;padding-top:20px;border-top:1px solid var(--card-border);">';
    html += '<div style="font-size:11px;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Your real domain</div>';
    html += '<div style="margin-top:8px;display:flex;align-items:center;gap:10px;">';
    html += '<input type="text" id="real-domain-input" value="" placeholder="www.yourdomain.com" style="flex:1;">';
    html += '<button class="btn btn-primary btn-sm" onclick="saveRealDomain()" style="margin-bottom:0;">Save</button>';
    html += '</div>';
    html += '<p style="font-size:12px;color:var(--text-dim);margin-top:8px;">Enter your custom domain to display it here and on your profile.</p>';
    html += '</div>';
  }

  container.innerHTML = html;
}

async function saveRealDomain() {
  var input = document.getElementById('real-domain-input');
  var val = (input ? input.value : '').trim();
  if (!val) { toast('Enter a domain first', 'error'); return; }
  _domainData.customDomain = val;
  _domainData.customDomainVerified = false;
  await CC.dashboard.updateDomain({ domain: val });
  renderSubdomainSection();
  toast('Real domain saved');
}

function saveSubdomain() {
  var input = document.getElementById('subdomain-input');
  var val = (input.value || '').toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/--+/g, '-');
  if (!val || val.length < 3) {
    toast('Subdomain must be at least 3 characters', 'error');
    return;
  }
  _domainData.subdomain = val;
  _domainData.subdomainActive = true;
  saveDomainData();
  renderSubdomainSection();
  toast('Subdomain updated to ' + val + '.' + PLATFORM_DOMAIN);
}

// ---- Custom Domain ----

// Track which method the user chose
var _domainMethod = 'none'; // none | buy | own | setup

function renderCustomDomainSection() {
  var container = document.getElementById('custom-domain-section');
  if (!container) return;

  var html = '';

  if (_domainData.customDomain) {
    // Already has a custom domain configured — show status
    html += '<div style="display:flex;align-items:center;gap:16px;margin-bottom:20px;">';
    html += '<div style="flex:1;">';
    html += '<div style="font-size:11px;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Custom Domain</div>';
    html += '<div style="display:flex;align-items:center;gap:10px;">';
    html += '<div style="font-size:20px;font-weight:700;color:var(--text);font-family:\'SF Mono\',\'Fira Code\',monospace;">' + escHtml(_domainData.customDomain) + '</div>';

    if (_domainData.customDomainVerified) {
      html += '<span class="badge badge-success">Verified</span>';
    } else {
      html += '<span class="badge badge-warning">DNS Not Verified</span>';
    }
    html += '</div>';
    html += '</div>';
    html += '<button class="btn btn-outline btn-sm" onclick="verifyDns()">Verify DNS</button>';
    html += '<button class="btn btn-danger btn-sm" onclick="removeCustomDomain()">Remove</button>';
    html += '</div>';

    // Show the DNS instructions card (only for "own" method; buy/setup auto-configures)
    if (_domainData.setupMethod === 'own') {
      document.getElementById('dns-instructions-card').style.display = '';
    } else {
      document.getElementById('dns-instructions-card').style.display = 'none';
    }
    if (_domainData.customDomainVerified) {
      document.getElementById('ssl-status-card').style.display = '';
    }
  } else {
    // No custom domain — show the 3 easy options
    html += renderDomainChoices();

    // Hide instruction cards
    document.getElementById('dns-instructions-card').style.display = 'none';
    document.getElementById('ssl-status-card').style.display = 'none';
  }

  container.innerHTML = html;

  // Render the sub-panel if a method is selected
  renderDomainMethodPanel();
}

// ---- 3 Easy Options ----

function renderDomainChoices() {
  var html = '';

  html += '<div style="text-align:center;margin-bottom:24px;">';
  html += '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="1.5" style="margin-bottom:12px;"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>';
  html += '<h3 style="font-size:18px;margin-bottom:6px;color:var(--text);">Get Your Custom Domain</h3>';
  html += '<p style="font-size:14px;color:var(--text-muted);max-width:460px;margin:0 auto;">Choose the easiest option for you. Your free subdomain stays active too.</p>';
  html += '</div>';

  // 3 option cards
  html += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:20px;">';

  // Option 1: Buy a domain
  html += '<div class="domain-option-card" onclick="selectDomainMethod(\'buy\')" style="cursor:pointer;padding:24px 16px;text-align:center;background:var(--bg);border:2px solid ' + (_domainMethod === 'buy' ? 'var(--primary)' : 'var(--card-border)') + ';border-radius:var(--radius-lg);transition:all 0.2s;">';
  html += '<div style="width:48px;height:48px;border-radius:50%;background:rgba(0,173,168,0.1);display:flex;align-items:center;justify-content:center;margin:0 auto 12px;">';
  html += '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>';
  html += '</div>';
  html += '<div style="font-size:15px;font-weight:700;color:var(--text);margin-bottom:6px;">Buy a Domain</div>';
  html += '<div style="font-size:12px;color:var(--text-muted);line-height:1.5;">Search & buy a new domain. We set up everything automatically — zero tech steps.</div>';
  html += '<div style="margin-top:12px;font-size:12px;font-weight:600;color:var(--primary);">From $12/year</div>';
  html += '</div>';

  // Option 2: I already have a domain
  html += '<div class="domain-option-card" onclick="selectDomainMethod(\'own\')" style="cursor:pointer;padding:24px 16px;text-align:center;background:var(--bg);border:2px solid ' + (_domainMethod === 'own' ? 'var(--primary)' : 'var(--card-border)') + ';border-radius:var(--radius-lg);transition:all 0.2s;">';
  html += '<div style="width:48px;height:48px;border-radius:50%;background:rgba(77,166,255,0.1);display:flex;align-items:center;justify-content:center;margin:0 auto 12px;">';
  html += '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4DA6FF" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>';
  html += '</div>';
  html += '<div style="font-size:15px;font-weight:700;color:var(--text);margin-bottom:6px;">I Have a Domain</div>';
  html += '<div style="font-size:12px;color:var(--text-muted);line-height:1.5;">Already own a domain? Connect it in a few steps. We\'ll walk you through it.</div>';
  html += '<div style="margin-top:12px;font-size:12px;font-weight:600;color:#4DA6FF;">Free</div>';
  html += '</div>';

  // Option 3: Set it up for me
  html += '<div class="domain-option-card" onclick="selectDomainMethod(\'setup\')" style="cursor:pointer;padding:24px 16px;text-align:center;background:var(--bg);border:2px solid ' + (_domainMethod === 'setup' ? 'var(--primary)' : 'var(--card-border)') + ';border-radius:var(--radius-lg);transition:all 0.2s;">';
  html += '<div style="width:48px;height:48px;border-radius:50%;background:rgba(168,85,247,0.1);display:flex;align-items:center;justify-content:center;margin:0 auto 12px;">';
  html += '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#a855f7" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
  html += '</div>';
  html += '<div style="font-size:15px;font-weight:700;color:var(--text);margin-bottom:6px;">Set It Up For Me</div>';
  html += '<div style="font-size:12px;color:var(--text-muted);line-height:1.5;">Don\'t want to deal with it? We\'ll handle everything — just tell us what you want.</div>';
  html += '<div style="margin-top:12px;font-size:12px;font-weight:600;color:#a855f7;">Free setup</div>';
  html += '</div>';

  html += '</div>';

  // Sub-panel container
  html += '<div id="domain-method-panel"></div>';

  return html;
}

function selectDomainMethod(method) {
  _domainMethod = method;
  renderCustomDomainSection();
}

// ---- Method-specific panels ----

function renderDomainMethodPanel() {
  var panel = document.getElementById('domain-method-panel');
  if (!panel) return;

  if (_domainMethod === 'buy') {
    panel.innerHTML = renderBuyDomainPanel();
  } else if (_domainMethod === 'own') {
    panel.innerHTML = renderOwnDomainPanel();
  } else if (_domainMethod === 'setup') {
    panel.innerHTML = renderSetupForMePanel();
  } else {
    panel.innerHTML = '';
  }
}

// -- Panel A: Buy a Domain --

function renderBuyDomainPanel() {
  var html = '';
  html += '<div style="padding:24px;background:var(--bg);border:2px solid var(--primary);border-radius:var(--radius-lg);margin-top:4px;">';

  html += '<h4 style="font-size:16px;margin-bottom:4px;color:var(--text);">Search for a Domain</h4>';
  html += '<p style="font-size:13px;color:var(--text-muted);margin-bottom:16px;">Type the name you want and we\'ll show you what\'s available. We handle DNS, SSL, everything.</p>';

  html += '<div style="display:flex;gap:10px;margin-bottom:16px;">';
  html += '<input type="text" id="domain-search-input" placeholder="beachsidecircleboats" style="flex:1;font-size:16px;" onkeydown="if(event.key===\'Enter\')searchDomains()">';
  html += '<button class="btn btn-primary" onclick="searchDomains()">Search</button>';
  html += '</div>';

  // Results area
  html += '<div id="domain-search-results"></div>';

  html += '</div>';
  return html;
}

function searchDomains() {
  var input = document.getElementById('domain-search-input');
  var query = (input.value || '').toLowerCase().trim().replace(/[^a-z0-9-]/g, '');
  if (!query || query.length < 2) {
    toast('Enter a domain name to search', 'error');
    return;
  }

  var resultsDiv = document.getElementById('domain-search-results');
  resultsDiv.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted);"><div class="spinner" style="width:24px;height:24px;border:3px solid var(--card-border);border-top:3px solid var(--primary);border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 10px;"></div>Searching available domains...</div>';

  // Simulate API call to domain registrar (Namecheap/Cloudflare API in production)
  setTimeout(function() {
    var extensions = [
      { ext: '.com', price: 12.99, available: Math.random() > 0.3 },
      { ext: '.net', price: 11.99, available: true },
      { ext: '.co', price: 9.99, available: true },
      { ext: '.io', price: 39.99, available: Math.random() > 0.5 },
      { ext: '.biz', price: 8.99, available: true },
      { ext: '.app', price: 14.99, available: Math.random() > 0.4 }
    ];

    var html = '';
    html += '<div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:12px;">Results for "' + escHtml(query) + '"</div>';

    extensions.forEach(function(d) {
      var full = query + d.ext;
      html += '<div style="display:flex;align-items:center;gap:12px;padding:14px 16px;border:1px solid var(--card-border);border-radius:var(--radius);margin-bottom:8px;background:var(--card-bg);">';
      html += '<div style="flex:1;font-family:\'SF Mono\',\'Fira Code\',monospace;font-size:15px;font-weight:600;color:var(--text);">' + escHtml(full) + '</div>';

      if (d.available) {
        html += '<span class="badge badge-success" style="margin-right:8px;">Available</span>';
        html += '<div style="font-size:15px;font-weight:700;color:var(--text);margin-right:12px;">$' + d.price.toFixed(2) + '<span style="font-size:11px;font-weight:400;color:var(--text-dim);">/yr</span></div>';
        html += '<button class="btn btn-primary btn-sm" onclick="buyDomain(\'' + escHtml(full) + '\', ' + d.price + ')">Buy & Connect</button>';
      } else {
        html += '<span class="badge" style="background:rgba(239,68,68,0.1);color:#ef4444;">Taken</span>';
      }

      html += '</div>';
    });

    html += '<p style="font-size:12px;color:var(--text-dim);margin-top:12px;">Prices shown are per year. Domain will auto-renew annually. DNS & SSL configured automatically.</p>';

    resultsDiv.innerHTML = html;
  }, 1500);
}

function buyDomain(domain, price) {
  if (!confirm('Buy ' + domain + ' for $' + price.toFixed(2) + '/year?\n\nDNS and SSL will be set up automatically. Your site will be live at https://' + domain + ' within minutes.')) return;

  toast('Purchasing ' + domain + '...', 'info', 5000);

  // Simulate purchase + auto-configuration
  setTimeout(function() {
    _domainData.customDomain = domain;
    _domainData.customDomainVerified = true;
    _domainData.customDomainSsl = 'pending';
    _domainData.dnsVerifiedAt = new Date().toISOString();
    _domainData.setupMethod = 'buy';
    saveDomainData();

    toast('Domain purchased! Setting up DNS & SSL...');
    renderCustomDomainSection();
    renderDnsInstructions();
    renderSslStatus();

    // SSL auto-provisions
    setTimeout(function() {
      _domainData.customDomainSsl = 'active';
      saveDomainData();
      renderSslStatus();
      document.getElementById('ssl-status-card').style.display = '';
      toast('Your site is live at https://' + domain + '!', 'success', 5000);
    }, 3000);
  }, 2500);
}

// -- Panel B: I Already Have a Domain (simplified) --

function renderOwnDomainPanel() {
  var html = '';
  html += '<div style="padding:24px;background:var(--bg);border:2px solid #4DA6FF;border-radius:var(--radius-lg);margin-top:4px;">';

  html += '<h4 style="font-size:16px;margin-bottom:4px;color:var(--text);">Connect Your Existing Domain</h4>';
  html += '<p style="font-size:13px;color:var(--text-muted);margin-bottom:16px;">Enter your domain and we\'ll show you exactly what to do — just 2 simple steps.</p>';

  html += '<div style="display:flex;align-items:flex-end;gap:12px;">';
  html += '<div class="form-group" style="flex:1;margin-bottom:0;">';
  html += '<label>Your Domain Name</label>';
  html += '<input type="text" id="custom-domain-input" placeholder="yourbusiness.com" style="font-size:16px;">';
  html += '</div>';
  html += '<button class="btn btn-primary" onclick="addCustomDomain()">Connect</button>';
  html += '</div>';

  html += '<p style="font-size:12px;color:var(--text-dim);margin-top:8px;">Without http:// or www. Example: <strong>beachsidecircleboats.com</strong></p>';

  html += '</div>';
  return html;
}

// -- Panel C: Set It Up For Me --

function renderSetupForMePanel() {
  var html = '';
  html += '<div style="padding:24px;background:var(--bg);border:2px solid #a855f7;border-radius:var(--radius-lg);margin-top:4px;">';

  html += '<h4 style="font-size:16px;margin-bottom:4px;color:var(--text);">We\'ll Handle Everything</h4>';
  html += '<p style="font-size:13px;color:var(--text-muted);margin-bottom:20px;">Tell us what you need and our team will set it up for you — usually within 24 hours.</p>';

  // Do they need a domain or have one?
  html += '<div class="form-group">';
  html += '<label>Do you already have a domain?</label>';
  html += '<div style="display:flex;gap:10px;margin-top:6px;">';
  html += '<label style="display:flex;align-items:center;gap:8px;padding:10px 16px;border:1px solid var(--card-border);border-radius:var(--radius);cursor:pointer;font-size:14px;">';
  html += '<input type="radio" name="setup-has-domain" value="yes"> Yes, I own a domain</label>';
  html += '<label style="display:flex;align-items:center;gap:8px;padding:10px 16px;border:1px solid var(--card-border);border-radius:var(--radius);cursor:pointer;font-size:14px;">';
  html += '<input type="radio" name="setup-has-domain" value="no" checked> No, I need one</label>';
  html += '</div>';
  html += '</div>';

  html += '<div class="form-group">';
  html += '<label>Domain name (or what you\'d like it to be)</label>';
  html += '<input type="text" id="setup-domain-input" placeholder="beachsidecircleboats.com" style="font-size:15px;">';
  html += '</div>';

  html += '<div class="form-group">';
  html += '<label>Anything else we should know? <span style="color:var(--text-dim);">(optional)</span></label>';
  html += '<textarea id="setup-notes-input" rows="2" placeholder="E.g. I bought my domain on GoDaddy, my login is..."></textarea>';
  html += '</div>';

  html += '<button class="btn btn-primary" onclick="submitSetupRequest()" style="width:100%;padding:14px;">Submit Setup Request</button>';

  html += '<p style="font-size:12px;color:var(--text-dim);margin-top:10px;text-align:center;">We\'ll email you when it\'s done. Usually takes less than 24 hours.</p>';

  html += '</div>';
  return html;
}

function submitSetupRequest() {
  var domainInput = document.getElementById('setup-domain-input');
  var notesInput = document.getElementById('setup-notes-input');
  var hasDomain = document.querySelector('input[name="setup-has-domain"]:checked');

  var domain = (domainInput.value || '').trim();
  if (!domain) {
    toast('Please enter a domain name', 'error');
    return;
  }

  var requestData = {
    domain: domain,
    hasDomain: hasDomain ? hasDomain.value === 'yes' : false,
    notes: (notesInput.value || '').trim(),
    requestedAt: new Date().toISOString(),
    status: 'pending'
  };

  // Save the request (in production: POST to API → notification to admin)
  try {
    var requests = JSON.parse(localStorage.getItem('domain_setup_requests') || '[]');
    requests.push(requestData);
    localStorage.setItem('domain_setup_requests', JSON.stringify(requests));
  } catch(e) {}

  // Show success state
  _domainData.setupMethod = 'setup';
  _domainData.setupRequestDomain = domain;
  saveDomainData();

  // Replace panel with confirmation
  var panel = document.getElementById('domain-method-panel');
  if (panel) {
    var html = '';
    html += '<div style="padding:32px 24px;background:rgba(168,85,247,0.06);border:2px solid rgba(168,85,247,0.2);border-radius:var(--radius-lg);text-align:center;margin-top:4px;">';
    html += '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#a855f7" stroke-width="2" style="margin-bottom:12px;"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>';
    html += '<h4 style="font-size:18px;color:var(--text);margin-bottom:8px;">Setup Request Submitted!</h4>';
    html += '<p style="font-size:14px;color:var(--text-muted);max-width:400px;margin:0 auto 8px;">We\'ll set up <strong>' + escHtml(domain) + '</strong> for you and send you an email when it\'s ready.</p>';
    html += '<p style="font-size:13px;color:var(--text-dim);">Usually done within 24 hours.</p>';
    html += '</div>';
    panel.innerHTML = html;
  }

  toast('Setup request submitted!', 'success');
}

function addCustomDomain() {
  var input = document.getElementById('custom-domain-input');
  var domain = (input.value || '').toLowerCase().trim()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/.*$/, '');

  if (!domain || domain.indexOf('.') < 0) {
    toast('Please enter a valid domain name', 'error');
    return;
  }

  _domainData.customDomain = domain;
  _domainData.customDomainVerified = false;
  _domainData.customDomainSsl = 'none';
  _domainData.dnsVerifiedAt = null;
  _domainData.setupMethod = 'own';
  saveDomainData();

  _domainMethod = 'none';
  renderCustomDomainSection();
  renderDnsInstructions();
  toast('Domain added! Follow the DNS instructions below.');
}

function removeCustomDomain() {
  if (!confirm('Remove custom domain ' + _domainData.customDomain + '? Your site will only be available at your subdomain.')) return;

  _domainData.customDomain = '';
  _domainData.customDomainVerified = false;
  _domainData.customDomainSsl = 'none';
  _domainData.dnsVerifiedAt = null;
  saveDomainData();

  renderCustomDomainSection();
  toast('Custom domain removed');
}

// ---- DNS Instructions ----

function renderDnsInstructions() {
  var container = document.getElementById('dns-instructions');
  if (!container) return;
  if (!_domainData.customDomain) return;

  var domain = _domainData.customDomain;

  var html = '';

  // Step-by-step
  html += '<div style="padding:16px;background:rgba(0,173,168,0.06);border:1px solid rgba(0,173,168,0.15);border-radius:var(--radius);margin-bottom:20px;">';
  html += '<strong style="font-size:14px;color:var(--text);">Follow these steps at your domain registrar (GoDaddy, Namecheap, Google Domains, etc.):</strong>';
  html += '</div>';

  // DNS Records Table
  html += '<div style="margin-bottom:20px;">';
  html += '<div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:10px;">Required DNS Records:</div>';
  html += '<div class="table-wrap"><table>';
  html += '<thead><tr><th>Type</th><th>Name / Host</th><th>Value / Points To</th><th>TTL</th></tr></thead>';
  html += '<tbody>';

  // Root domain CNAME (or A record)
  html += '<tr>';
  html += '<td><span class="badge badge-info">CNAME</span></td>';
  html += '<td style="font-family:\'SF Mono\',monospace;font-size:13px;">@</td>';
  html += '<td style="font-family:\'SF Mono\',monospace;font-size:13px;">' + PLATFORM_SITES_CNAME + '</td>';
  html += '<td>Auto / 3600</td>';
  html += '</tr>';

  // www subdomain
  html += '<tr>';
  html += '<td><span class="badge badge-info">CNAME</span></td>';
  html += '<td style="font-family:\'SF Mono\',monospace;font-size:13px;">www</td>';
  html += '<td style="font-family:\'SF Mono\',monospace;font-size:13px;">' + PLATFORM_SITES_CNAME + '</td>';
  html += '<td>Auto / 3600</td>';
  html += '</tr>';

  html += '</tbody></table></div>';
  html += '</div>';

  // Copy-friendly values
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px;">';

  html += '<div style="padding:12px;background:var(--bg);border:1px solid var(--card-border);border-radius:var(--radius);">';
  html += '<div style="font-size:11px;color:var(--text-dim);margin-bottom:4px;">CNAME Target (click to copy)</div>';
  html += '<div style="font-family:\'SF Mono\',monospace;font-size:14px;color:var(--primary);cursor:pointer;" onclick="copyToClipboard(\'' + PLATFORM_SITES_CNAME + '\')">' + PLATFORM_SITES_CNAME + '</div>';
  html += '</div>';

  html += '<div style="padding:12px;background:var(--bg);border:1px solid var(--card-border);border-radius:var(--radius);">';
  html += '<div style="font-size:11px;color:var(--text-dim);margin-bottom:4px;">Your Domain</div>';
  html += '<div style="font-family:\'SF Mono\',monospace;font-size:14px;color:var(--text);">' + escHtml(domain) + '</div>';
  html += '</div>';

  html += '</div>';

  // Common registrar tips
  html += '<details style="margin-bottom:16px;">';
  html += '<summary style="font-size:13px;font-weight:600;color:var(--primary);cursor:pointer;padding:8px 0;">Tips for common registrars</summary>';
  html += '<div style="padding:12px;margin-top:8px;background:var(--bg);border:1px solid var(--card-border);border-radius:var(--radius);font-size:13px;color:var(--text-muted);line-height:1.8;">';
  html += '<strong>GoDaddy:</strong> My Domains → DNS → Add Record → CNAME → Host: @ → Points to: ' + PLATFORM_SITES_CNAME + '<br>';
  html += '<strong>Namecheap:</strong> Domain List → Manage → Advanced DNS → Add CNAME → Host: @ → Value: ' + PLATFORM_SITES_CNAME + '<br>';
  html += '<strong>Google Domains:</strong> My Domains → DNS → Custom Records → CNAME → @ → ' + PLATFORM_SITES_CNAME + '<br>';
  html += '<strong>Cloudflare:</strong> DNS → Add Record → CNAME → Name: @ → Target: ' + PLATFORM_SITES_CNAME + ' (Proxy: ON)<br>';
  html += '<br><em>Note: Some registrars don\'t support CNAME on root (@). In that case, use CNAME on "www" only and set up a redirect from the root to www.</em>';
  html += '</div>';
  html += '</details>';

  // Verification status
  html += '<div style="display:flex;align-items:center;gap:12px;padding:14px 16px;background:' + (_domainData.customDomainVerified ? 'rgba(34,197,94,0.08)' : 'rgba(245,158,11,0.08)') + ';border:1px solid ' + (_domainData.customDomainVerified ? 'rgba(34,197,94,0.2)' : 'rgba(245,158,11,0.2)') + ';border-radius:var(--radius);">';
  if (_domainData.customDomainVerified) {
    html += '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>';
    html += '<div>';
    html += '<strong style="color:var(--success);">DNS Verified!</strong>';
    if (_domainData.dnsVerifiedAt) {
      html += '<div style="font-size:12px;color:var(--text-dim);">Verified on ' + new Date(_domainData.dnsVerifiedAt).toLocaleString() + '</div>';
    }
    html += '</div>';
  } else {
    html += '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
    html += '<div>';
    html += '<strong style="color:var(--warning);">Waiting for DNS verification</strong>';
    html += '<div style="font-size:12px;color:var(--text-dim);">DNS changes can take up to 48 hours to propagate (usually 5-30 minutes).</div>';
    html += '</div>';
    html += '<button class="btn btn-primary btn-sm" onclick="verifyDns()" style="margin-left:auto;">Check Now</button>';
  }
  html += '</div>';

  container.innerHTML = html;
}

function verifyDns() {
  // In production: server-side DNS lookup via Edge Function
  // fetch('/api/verify-dns', { method: 'POST', body: JSON.stringify({ domain: _domainData.customDomain }) })
  //   .then(r => r.json())
  //   .then(data => { if (data.verified) { ... } })

  // For demo: simulate DNS lookup
  toast('Checking DNS records for ' + _domainData.customDomain + '...');

  setTimeout(function() {
    // Simulate successful verification
    _domainData.customDomainVerified = true;
    _domainData.dnsVerifiedAt = new Date().toISOString();
    _domainData.customDomainSsl = 'pending';
    saveDomainData();

    renderCustomDomainSection();
    renderDnsInstructions();
    renderSslStatus();
    toast('DNS verified! SSL certificate is being provisioned.');

    // Simulate SSL provisioning
    setTimeout(function() {
      _domainData.customDomainSsl = 'active';
      saveDomainData();
      renderSslStatus();
      toast('SSL certificate is active! Your site is live at https://' + _domainData.customDomain);
    }, 3000);
  }, 2000);
}

// ---- SSL Status ----

function renderSslStatus() {
  var container = document.getElementById('ssl-status');
  if (!container) return;
  if (!_domainData.customDomainVerified) return;

  var html = '';
  var sslState = _domainData.customDomainSsl;

  html += '<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">';

  if (sslState === 'active') {
    html += '<div style="width:48px;height:48px;border-radius:50%;background:rgba(34,197,94,0.1);display:flex;align-items:center;justify-content:center;">';
    html += '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>';
    html += '</div>';
    html += '<div>';
    html += '<strong style="font-size:16px;color:var(--success);">SSL Active</strong>';
    html += '<div style="font-size:13px;color:var(--text-muted);">Your site is fully secured with HTTPS</div>';
    html += '</div>';
  } else if (sslState === 'pending') {
    html += '<div style="width:48px;height:48px;border-radius:50%;background:rgba(245,158,11,0.1);display:flex;align-items:center;justify-content:center;">';
    html += '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';
    html += '</div>';
    html += '<div>';
    html += '<strong style="font-size:16px;color:var(--warning);">Provisioning SSL...</strong>';
    html += '<div style="font-size:13px;color:var(--text-muted);">Certificate is being generated. This usually takes 1-5 minutes.</div>';
    html += '</div>';
  } else {
    html += '<div style="width:48px;height:48px;border-radius:50%;background:rgba(239,68,68,0.1);display:flex;align-items:center;justify-content:center;">';
    html += '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>';
    html += '</div>';
    html += '<div>';
    html += '<strong style="font-size:16px;color:var(--danger);">No SSL</strong>';
    html += '<div style="font-size:13px;color:var(--text-muted);">Verify your DNS first to provision SSL</div>';
    html += '</div>';
  }

  html += '</div>';

  // How SSL works
  if (sslState === 'active') {
    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">';

    html += '<div style="padding:14px;background:var(--bg);border:1px solid var(--card-border);border-radius:var(--radius);">';
    html += '<div style="font-size:12px;color:var(--text-dim);margin-bottom:4px;">Site URL</div>';
    html += '<div style="font-family:\'SF Mono\',monospace;font-size:14px;color:var(--success);cursor:pointer;" onclick="copyToClipboard(\'https://' + escHtml(_domainData.customDomain) + '\')">https://' + escHtml(_domainData.customDomain) + '</div>';
    html += '</div>';

    html += '<div style="padding:14px;background:var(--bg);border:1px solid var(--card-border);border-radius:var(--radius);">';
    html += '<div style="font-size:12px;color:var(--text-dim);margin-bottom:4px;">Certificate Provider</div>';
    html += '<div style="font-size:14px;color:var(--text);">Let\'s Encrypt (auto-renewed)</div>';
    html += '</div>';

    html += '</div>';
  }

  container.innerHTML = html;
}

// ---- Utilities ----

function copyToClipboard(text) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text);
  } else {
    var ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }
  toast('Copied: ' + text);
}

if (typeof escHtml === 'undefined') {
  function escHtml(str) {
    var div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }
}

onPageLoad('domain', loadDomain);
