// ============================================
// CyberCheck Module Registry
// Modules self-register by calling CC.modules.register(config)
// Dashboard shell loads only what the business has installed
// Users can also drop in custom scripts stored in the DB
// ============================================

(function() {

  var _modules = [];

  // Built-in app_id → script file mapping
  var MODULE_FILES = {
    'restaurant-menu':     'js/modules/restaurant-menu.js',
    'bakery-menu':         'js/modules/bakery-menu.js',
    'retail-products':     'js/modules/retail-products.js',
    'charter-booking':     'js/modules/charter-booking.js',
    'salon-booking':       'js/modules/salon-booking.js',
    'rental-booking':      'js/modules/rental-booking.js',
    'service-booking':     'js/modules/service-booking.js',
    'restaurant-ordering': 'js/modules/restaurant-ordering.js',
    'basic-crm':           'js/modules/basic-crm.js',
    'sms-notifications':   'js/modules/sms-notifications.js',
    'review-requests':     'js/modules/review-requests.js',
    'social-feed':         'js/modules/social-feed.js',
    'analytics':           'js/modules/analytics.js',
    'loyalty':             'js/modules/loyalty.js',
    'qr-menu':             'js/modules/qr-menu.js',
    'social-manager':      'js/modules/social-manager.js'
  };

  // Core modules always loaded (every business gets these)
  var CORE_MODULES = [
    'js/modules/core-overview.js',
    'js/modules/core-profile.js',
    'js/modules/core-billing.js',
    'js/modules/core-domain.js',
    'js/modules/core-connections.js',
    'js/modules/core-publish.js'
  ];

  function loadScript(src) {
    return new Promise(function(resolve) {
      if (document.querySelector('script[src="' + src + '"]')) { resolve(); return; }
      var s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = function() { console.warn('Module not found:', src); resolve(); };
      document.head.appendChild(s);
    });
  }

  // Load core + installed apps + any custom user scripts
  // installedApps = array of { app_id, config } from site_apps
  async function loadModules(installedApps) {
    var toLoad = CORE_MODULES.slice();

    (installedApps || []).forEach(function(app) {
      // Built-in module file
      if (MODULE_FILES[app.app_id]) {
        toLoad.push(MODULE_FILES[app.app_id]);
      }
      // Custom user script stored in app config
      if (app.config && app.config.script_url) {
        toLoad.push(app.config.script_url);
      }
    });

    await Promise.all(toLoad.map(loadScript));
  }

  // Each module file calls this to register itself
  // config.type:
  //   'full'       — dashboard panel + public page block (booking, menu, gallery)
  //   'dashboard'  — dashboard only, nothing on public page (CRM, analytics, staff)
  //   'automation' — no UI, runs in background (SMS, review requests, webhooks)
  function register(config) {
    if (!config || !config.id) return;
    if (_modules.find(function(m){ return m.id === config.id; })) return;
    config.type = config.type || 'dashboard';
    _modules.push(config);
    // Automations init immediately — no UI needed
    if (config.type === 'automation' && typeof config.init === 'function') {
      try { config.init(); } catch(e) { console.warn('Automation init error:', config.id, e); }
    }
  }

  // Build nav + panels from everything that registered
  function renderAll() {
    var navEl = document.getElementById('module-nav');
    var panelsEl = document.getElementById('module-panels');
    if (!navEl || !panelsEl) return;

    // Group modules by section — skip automation-only modules (no UI)
    var sections = {};
    _modules.forEach(function(m) {
      if (m.type === 'automation') return;
      var sec = m.section || 'Tools';
      if (!sections[sec]) sections[sec] = [];
      sections[sec].push(m);
    });

    // Render sidebar nav
    var navHtml = '';
    Object.keys(sections).forEach(function(sec) {
      navHtml += '<div class="nav-section-label">' + esc(sec) + '</div>';
      sections[sec].forEach(function(m) {
        navHtml +=
          '<div class="nav-item" data-module="' + esc(m.id) + '" onclick="CC.modules.show(\'' + esc(m.id) + '\')">' +
            '<span class="nav-icon">' + (m.icon || '📦') + '</span>' +
            '<span>' + esc(m.name) + '</span>' +
          '</div>';
      });
    });

    // App store always in nav
    navHtml +=
      '<div class="nav-section-label">Platform</div>' +
      '<div class="nav-item" data-module="__appstore" onclick="CC.modules.show(\'__appstore\')">' +
        '<span class="nav-icon">🛍️</span><span>App Store</span>' +
      '</div>';

    navEl.innerHTML = navHtml;

    // Render panels
    var panelsHtml = '';
    _modules.forEach(function(m) {
      var content = typeof m.panel === 'function' ? m.panel() : (m.panel || '');
      panelsHtml += '<div class="page-panel" id="panel-' + esc(m.id) + '">' + content + '</div>';
    });
    // App store panel — populated by dashboard
    panelsHtml += '<div class="page-panel" id="panel-__appstore"></div>';
    panelsEl.innerHTML = panelsHtml;

    // Run each module's init
    _modules.forEach(function(m) {
      if (typeof m.init === 'function') {
        try { m.init(); } catch(e) { console.warn('Module init error:', m.id, e); }
      }
    });

    // Show overview by default, then hash, then first module
    var hash = window.location.hash.replace('#', '');
    var defaultModule = 'overview';
    if (hash && document.getElementById('panel-' + hash)) {
      show(hash);
    } else if (document.getElementById('panel-' + defaultModule)) {
      show(defaultModule);
    } else if (_modules[0]) {
      show(_modules[0].id);
    }
  }

  function show(id) {
    document.querySelectorAll('.page-panel').forEach(function(p){ p.classList.remove('active'); });
    document.querySelectorAll('.nav-item[data-module]').forEach(function(n){ n.classList.remove('active'); });
    var panel = document.getElementById('panel-' + id);
    var nav = document.querySelector('.nav-item[data-module="' + id + '"]');
    if (panel) panel.classList.add('active');
    if (nav) nav.classList.add('active');
    window.location.hash = id;
  }

  function getAll() { return _modules.slice(); }

  function esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  window.CC = window.CC || {};
  window.CC.modules = {
    register:    register,
    load:        loadModules,
    renderAll:   renderAll,
    show:        show,
    getAll:      getAll,
    files:       MODULE_FILES
  };

})();
