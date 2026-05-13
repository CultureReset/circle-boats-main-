// ============================================
// Site Editor — Beachside Circle Boats template
// ============================================

var _editorSections = [];
var _editorSectionIdCounter = 0;
var _activeEditorSection = null;
var _editorCssVisible = false;
var _editorCss = '';
var _previewMode = 'desktop';
var _siteEditorData = null;

const SITE_EDITOR_PREVIEW_BASE = 'https://beachsidecircleboats.com';

function toPreviewUrl(url) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  if (url.startsWith('/')) return SITE_EDITOR_PREVIEW_BASE + url;
  return SITE_EDITOR_PREVIEW_BASE + '/beachside-site/' + url;
}

function loadSiteEditor() {
  if (_editorSections.length === 0) {
    _editorSections = [
      {
        id: 1,
        name: '1 · Header / Navigation',
        html: '<header style="background:#fff;padding:16px 40px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #e5e5e5;position:sticky;top:0;z-index:100;">\n  <div style="display:flex;align-items:center;gap:10px;">\n    <span style="font-size:22px;">🚤</span>\n    <span style="font-weight:700;font-size:18px;color:#1a1a1a;font-family:Titillium Web,sans-serif;">{{business_name}}</span>\n  </div>\n  <nav style="display:flex;gap:24px;">\n    <a href="#rentals" style="color:#333;text-decoration:none;font-size:14px;font-weight:500;">Rentals</a>\n    <a href="#docks" style="color:#333;text-decoration:none;font-size:14px;font-weight:500;">Docks</a>\n    <a href="#addons" style="color:#333;text-decoration:none;font-size:14px;font-weight:500;">Add-ons</a>\n    <a href="#how" style="color:#333;text-decoration:none;font-size:14px;font-weight:500;">How It Works</a>\n    <a href="#gallery" style="color:#333;text-decoration:none;font-size:14px;font-weight:500;">Gallery</a>\n    <a href="#contact" style="color:#333;text-decoration:none;font-size:14px;font-weight:500;">Contact</a>\n  </nav>\n  <a href="tel:{{business_phone}}" style="padding:10px 24px;background:#00ada8;color:white;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px;">Book Now</a>\n</header>'
      },
      {
        id: 2,
        name: '2 · Hero Banner',
        html: '<section id="hero" style="background:linear-gradient(135deg,#00ada8 0%,#009590 100%);color:white;padding:100px 40px;display:grid;grid-template-columns:1fr 1fr;gap:60px;align-items:center;max-width:1200px;margin:0 auto;">\n  <div>\n    <div style="display:inline-block;background:rgba(255,255,255,0.15);padding:4px 14px;border-radius:20px;font-size:13px;font-weight:600;margin-bottom:16px;">📍 Orange Beach, Alabama</div>\n    <h1 style="font-size:48px;margin:0 0 16px;font-family:Titillium Web,sans-serif;font-weight:700;line-height:1.1;">The Easiest Way to Get on the Water</h1>\n    <p style="font-size:18px;opacity:0.9;margin:0 0 32px;line-height:1.6;">{{business_description}}</p>\n    <div style="display:flex;gap:12px;">\n      <a href="#rentals" style="padding:16px 32px;background:white;color:#00ada8;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px;">Book Now</a>\n      <a href="tel:{{business_phone}}" style="padding:16px 32px;background:transparent;color:white;border:2px solid rgba(255,255,255,0.6);border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;">{{business_phone}}</a>\n    </div>\n  </div>\n  <div style="background:rgba(255,255,255,0.1);border-radius:16px;aspect-ratio:4/3;display:flex;align-items:center;justify-content:center;font-size:80px;">🚤</div>\n</section>'
      },
      {
        id: 3,
        name: '3 · About',
        html: '<section id="about" style="padding:56px 40px;background:#f9fafb;">\n  <div style="max-width:1100px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:60px;align-items:center;">\n    <div>\n      <div style="font-size:12px;font-weight:700;letter-spacing:2px;color:#00ada8;text-transform:uppercase;margin-bottom:10px;">About Us</div>\n      <h2 style="font-size:36px;font-family:Titillium Web,sans-serif;color:#1a1a1a;margin:0 0 16px;">{{about_title}}</h2>\n      <p style="color:#666;font-size:16px;line-height:1.7;margin:0 0 16px;">{{about_description}}</p>\n      <p style="color:#888;font-size:14px;line-height:1.6;">{{about_perfect_for}}</p>\n    </div>\n    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">\n      <div style="background:white;border-radius:12px;padding:24px;border:1px solid #e5e5e5;"><div style="font-size:28px;margin-bottom:8px;">⚡</div><h4 style="margin:0 0 6px;font-size:14px;color:#1a1a1a;">Eco-Friendly</h4><p style="margin:0;font-size:13px;color:#666;">Zero emissions, zero noise. Electric motors.</p></div>\n      <div style="background:white;border-radius:12px;padding:24px;border:1px solid #e5e5e5;"><div style="font-size:28px;margin-bottom:8px;">💪</div><h4 style="margin:0 0 6px;font-size:14px;color:#1a1a1a;">Stable & Safe</h4><p style="margin:0;font-size:13px;color:#666;">Low center of gravity. Life jackets included.</p></div>\n      <div style="background:white;border-radius:12px;padding:24px;border:1px solid #e5e5e5;"><div style="font-size:28px;margin-bottom:8px;">🎒</div><h4 style="margin:0 0 6px;font-size:14px;color:#1a1a1a;">Portable</h4><p style="margin:0;font-size:13px;color:#666;">Inflatable design. We bring boats to you.</p></div>\n      <div style="background:white;border-radius:12px;padding:24px;border:1px solid #e5e5e5;"><div style="font-size:28px;margin-bottom:8px;">🌊</div><h4 style="margin:0 0 6px;font-size:14px;color:#1a1a1a;">Gulf Coast Views</h4><p style="margin:0;font-size:13px;color:#666;">Explore Orange Beach waterways.</p></div>\n    </div>\n  </div>\n</section>'
      },
      {
        id: 4,
        name: '4 · Rentals & Pricing',
        html: '<section id="rentals" style="padding:56px 40px;">\n  <div style="max-width:1100px;margin:0 auto;">\n    <div style="text-align:center;margin-bottom:40px;">\n      <div style="font-size:12px;font-weight:700;letter-spacing:2px;color:#00ada8;text-transform:uppercase;margin-bottom:10px;">Rentals & Pricing</div>\n      <h2 style="font-size:36px;font-family:Titillium Web,sans-serif;color:#1a1a1a;margin:0 0 12px;">Pick Your Boat</h2>\n      <p style="color:#666;margin:0;">No license needed. No experience required.</p>\n    </div>\n    {{inventory_grid}}\n  </div>\n</section>'
      },
      {
        id: 5,
        name: '5 · Docks / Accessories',
        html: '<section id="docks" style="padding:56px 40px;background:#f9fafb;">\n  <div style="max-width:1100px;margin:0 auto;">\n    <div style="text-align:center;margin-bottom:40px;">\n      <div style="font-size:12px;font-weight:700;letter-spacing:2px;color:#00ada8;text-transform:uppercase;margin-bottom:10px;">Accessories</div>\n      <h2 style="font-size:36px;font-family:Titillium Web,sans-serif;color:#1a1a1a;margin:0 0 12px;">Add a Floating Dock</h2>\n      <p style="color:#666;margin:0;">Tow it behind your boat. Perfect for sunbathing, gear storage, or your dog.</p>\n    </div>\n    {{docks_grid}}\n  </div>\n</section>'
      },
      {
        id: 6,
        name: "6 · What's Included",
        html: "<section id=\"whats-included\" style=\"padding:56px 40px;background:#00ada8;color:white;\">\n  <div style=\"max-width:900px;margin:0 auto;text-align:center;\">\n    <div style=\"font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;opacity:0.8;margin-bottom:10px;\">Every Rental Includes</div>\n    <h2 style=\"font-size:36px;font-family:Titillium Web,sans-serif;margin:0 0 36px;\">Everything You Need</h2>\n    <div style=\"display:grid;grid-template-columns:repeat(4,1fr);gap:12px;\">\n      <div style=\"background:rgba(255,255,255,0.15);border-radius:10px;padding:16px;font-size:14px;font-weight:600;\">🦺 Life Jacket</div>\n      <div style=\"background:rgba(255,255,255,0.15);border-radius:10px;padding:16px;font-size:14px;font-weight:600;\">📋 Safety Briefing</div>\n      <div style=\"background:rgba(255,255,255,0.15);border-radius:10px;padding:16px;font-size:14px;font-weight:600;\">🔋 Full Battery</div>\n      <div style=\"background:rgba(255,255,255,0.15);border-radius:10px;padding:16px;font-size:14px;font-weight:600;\">⚡ 5-Speed Motor</div>\n      <div style=\"background:rgba(255,255,255,0.15);border-radius:10px;padding:16px;font-size:14px;font-weight:600;\">🚣 Paddle</div>\n      <div style=\"background:rgba(255,255,255,0.15);border-radius:10px;padding:16px;font-size:14px;font-weight:600;\">📣 Whistle</div>\n      <div style=\"background:rgba(255,255,255,0.15);border-radius:10px;padding:16px;font-size:14px;font-weight:600;\">🥤 Cup Holders</div>\n      <div style=\"background:rgba(255,255,255,0.15);border-radius:10px;padding:16px;font-size:14px;font-weight:600;\">✅ No License Needed</div>\n    </div>\n  </div>\n</section>"
      },
      {
        id: 7,
        name: '7 · Add-ons / Extras',
        html: '<section id="addons" style="padding:56px 40px;">\n  <div style="max-width:1100px;margin:0 auto;">\n    <div style="text-align:center;margin-bottom:40px;">\n      <div style="font-size:12px;font-weight:700;letter-spacing:2px;color:#00ada8;text-transform:uppercase;margin-bottom:10px;">Extras</div>\n      <h2 style="font-size:36px;font-family:Titillium Web,sans-serif;color:#1a1a1a;margin:0 0 12px;">Make It Yours</h2>\n      <p style="color:#666;margin:0;">Add drinks, snacks, gear, and more to your rental.</p>\n    </div>\n    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:20px;">{{addon_cards}}</div>\n  </div>\n</section>'
      },
      {
        id: 8,
        name: '8 · How It Works',
        html: '<section id="how" style="padding:56px 40px;background:#f9fafb;">\n  <div style="max-width:900px;margin:0 auto;">\n    <div style="text-align:center;margin-bottom:40px;">\n      <div style="font-size:12px;font-weight:700;letter-spacing:2px;color:#00ada8;text-transform:uppercase;margin-bottom:10px;">How It Works</div>\n      <h2 style="font-size:36px;font-family:Titillium Web,sans-serif;color:#1a1a1a;margin:0;">4 Simple Steps</h2>\n    </div>\n    {{steps_grid}}\n  </div>\n</section>'
      },
      {
        id: 9,
        name: '9 · Why Circle Boats',
        html: '<section id="features" style="padding:56px 40px;">\n  <div style="max-width:1100px;margin:0 auto;">\n    <div style="text-align:center;margin-bottom:40px;">\n      <div style="font-size:12px;font-weight:700;letter-spacing:2px;color:#00ada8;text-transform:uppercase;margin-bottom:10px;">Why Us</div>\n      <h2 style="font-size:36px;font-family:Titillium Web,sans-serif;color:#1a1a1a;margin:0 0 12px;">Why Circle Boats?</h2>\n      <p style="color:#666;margin:0;">Everything you need. Nothing you don\'t.</p>\n    </div>\n    {{features_grid}}\n  </div>\n</section>'
      },
      {
        id: 10,
        name: '10 · Gallery',
        html: '<section id="gallery" style="padding:56px 40px;background:#f9fafb;">\n  <div style="max-width:1200px;margin:0 auto;">\n    <div style="text-align:center;margin-bottom:40px;">\n      <div style="font-size:12px;font-weight:700;letter-spacing:2px;color:#00ada8;text-transform:uppercase;margin-bottom:10px;">Gallery</div>\n      <h2 style="font-size:36px;font-family:Titillium Web,sans-serif;color:#1a1a1a;margin:0 0 12px;">See the Experience</h2>\n      <p style="color:#666;margin:0;">Tap any photo to view full size.</p>\n    </div>\n    {{gallery_grid}}\n  </div>\n</section>'
      },
      {
        id: 11,
        name: '11 · Reviews',
        html: '<section id="reviews" style="padding:56px 40px;">\n  <div style="max-width:1100px;margin:0 auto;">\n    <div style="text-align:center;margin-bottom:40px;">\n      <div style="font-size:12px;font-weight:700;letter-spacing:2px;color:#00ada8;text-transform:uppercase;margin-bottom:10px;">Reviews</div>\n      <h2 style="font-size:36px;font-family:Titillium Web,sans-serif;color:#1a1a1a;margin:0 0 8px;">What People Say</h2>\n      <div style="color:#f59e0b;font-size:20px;margin-bottom:8px;">★★★★★</div>\n      <p style="color:#666;margin:0;">5.0 · Google Reviews</p>\n    </div>\n    {{reviews_carousel}}\n  </div>\n</section>'
      },
      {
        id: 12,
        name: '12 · Contact',
        html: '<section id="contact" style="padding:56px 40px;background:#f9fafb;">\n  <div style="max-width:1000px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:60px;">\n    <div>\n      <div style="font-size:12px;font-weight:700;letter-spacing:2px;color:#00ada8;text-transform:uppercase;margin-bottom:10px;">Contact</div>\n      <h2 style="font-size:36px;font-family:Titillium Web,sans-serif;color:#1a1a1a;margin:0 0 24px;">Get in Touch</h2>\n      <div style="display:flex;flex-direction:column;gap:20px;">\n        <div style="display:flex;gap:16px;align-items:flex-start;"><span style="font-size:20px;">📞</span><div><div style="font-weight:600;color:#1a1a1a;margin-bottom:4px;">Phone</div><a href="tel:{{business_phone}}" style="color:#00ada8;text-decoration:none;font-size:15px;">{{business_phone}}</a></div></div>\n        <div style="display:flex;gap:16px;align-items:flex-start;"><span style="font-size:20px;">✉️</span><div><div style="font-weight:600;color:#1a1a1a;margin-bottom:4px;">Email</div><a href="mailto:{{business_email}}" style="color:#00ada8;text-decoration:none;font-size:15px;">{{business_email}}</a></div></div>\n        <div style="display:flex;gap:16px;align-items:flex-start;"><span style="font-size:20px;">📍</span><div><div style="font-weight:600;color:#1a1a1a;margin-bottom:4px;">Address</div><p style="margin:0;color:#666;font-size:15px;">{{business_address}}</p></div></div>\n        <div style="display:flex;gap:16px;align-items:flex-start;"><span style="font-size:20px;">🕐</span><div><div style="font-weight:600;color:#1a1a1a;margin-bottom:4px;">Hours</div><p style="margin:0;color:#666;font-size:15px;">{{business_hours}}</p></div></div>\n      </div>\n    </div>\n    <div style="background:white;border-radius:16px;padding:32px;border:1px solid #e5e5e5;">\n      <h3 style="margin:0 0 20px;font-family:Titillium Web,sans-serif;font-size:20px;color:#1a1a1a;">Send a Message</h3>\n      {{booking_form}}\n    </div>\n  </div>\n</section>'
      },
      {
        id: 13,
        name: '13 · Footer',
        html: '<footer style="background:#1a1a1a;color:#999;padding:48px 40px;">\n  <div style="max-width:1100px;margin:0 auto;display:grid;grid-template-columns:2fr 1fr 1fr;gap:48px;margin-bottom:32px;">\n    <div>\n      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;"><span style="font-size:20px;">🚤</span><span style="font-weight:700;font-size:18px;color:white;font-family:Titillium Web,sans-serif;">{{business_name}}</span></div>\n      <p style="font-size:14px;line-height:1.6;margin:0 0 16px;">Eco-friendly circle boat rentals in Orange Beach, Alabama.</p>\n      {{social_links}}\n    </div>\n    <div>\n      <h4 style="color:white;font-size:14px;font-weight:600;margin:0 0 16px;">Quick Links</h4>\n      <div style="display:flex;flex-direction:column;gap:10px;">\n        <a href="#rentals" style="color:#999;text-decoration:none;font-size:14px;">Rentals & Pricing</a>\n        <a href="#how" style="color:#999;text-decoration:none;font-size:14px;">How It Works</a>\n        <a href="#gallery" style="color:#999;text-decoration:none;font-size:14px;">Gallery</a>\n        <a href="#contact" style="color:#999;text-decoration:none;font-size:14px;">Contact</a>\n      </div>\n    </div>\n    <div>\n      <h4 style="color:white;font-size:14px;font-weight:600;margin:0 0 16px;">Contact</h4>\n      <div style="display:flex;flex-direction:column;gap:10px;font-size:14px;">\n        <span>{{business_phone}}</span>\n        <span>{{business_email}}</span>\n        <span>{{business_address}}</span>\n        <span style="font-size:12px;margin-top:4px;">{{business_hours}}</span>\n      </div>\n    </div>\n  </div>\n  <div style="border-top:1px solid #333;padding-top:24px;text-align:center;font-size:12px;">© 2025 {{business_name}}. All rights reserved.</div>\n</footer>'
      }
    ];
    _editorSectionIdCounter = 13;
    _editorCss = '/* Beachside Circle Boats - Custom CSS */\n@import url(\'https://fonts.googleapis.com/css2?family=Titillium+Web:wght@400;600;700&family=Inter:wght@400;500;600&display=swap\');\n\n:root {\n  --primary: #00ada8;\n  --primary-dark: #009590;\n}\n\nbody {\n  margin: 0;\n  font-family: Inter, -apple-system, sans-serif;\n  color: #1a1a1a;\n}\n\na { transition: opacity 0.2s; }\na:hover { opacity: 0.85; }';
  }

  renderSectionList();
  if (_editorSections.length > 0 && !_activeEditorSection) {
    selectSection(_editorSections[0].id);
  }
  // Always fetch fresh — so gallery/products/etc show latest saved data
  fetch('/api/site-data')
    .then(function(r) { return r.json(); })
    .then(function(data) { _siteEditorData = data; refreshPreview(); })
    .catch(function() { refreshPreview(); });
}

function renderSectionList() {
  var container = document.getElementById('editor-sections');
  if (!container) return; // Element doesn't exist in current layout

  var html = '';

  _editorSections.forEach(function(sec) {
    var isActive = _activeEditorSection === sec.id;
    html += '<div class="section-item' + (isActive ? ' active' : '') + '" onclick="selectSection(' + sec.id + ')">';
    html += '<span class="drag-handle">&#9776;</span>';
    html += '<span class="section-name">' + escHtml(sec.name) + '</span>';
    html += '<button class="btn btn-danger btn-sm" onclick="event.stopPropagation();deleteSection(' + sec.id + ')" style="padding:3px 8px;font-size:11px;">X</button>';
    html += '</div>';
  });

  if (_editorCssVisible) {
    html += '<div class="section-item' + (_activeEditorSection === 'css' ? ' active' : '') + '" onclick="selectSection(\'css\')" style="border-color:var(--warning);">';
    html += '<span class="section-name" style="color:var(--warning);">Custom CSS</span>';
    html += '</div>';
  }

  container.innerHTML = html;
}

function selectSection(id) {
  _activeEditorSection = id;
  var textarea = document.getElementById('editor-code');

  if (id === 'css') {
    textarea.value = _editorCss;
    textarea.placeholder = 'Edit your custom CSS...';
  } else {
    var sec = _editorSections.find(function(s) { return s.id === id; });
    if (sec) {
      textarea.value = sec.html;
      textarea.placeholder = 'Edit HTML for "' + sec.name + '"...';
    }
  }

  renderSectionList();
}

function onEditorInput() {
  var textarea = document.getElementById('editor-code');
  var val = textarea.value;

  if (_activeEditorSection === 'css') {
    _editorCss = val;
  } else {
    var sec = _editorSections.find(function(s) { return s.id === _activeEditorSection; });
    if (sec) sec.html = val;
  }

  clearTimeout(onEditorInput._timer);
  onEditorInput._timer = setTimeout(function() { refreshPreview(); }, 500);
}

function addSection() {
  var name = prompt('Section name:', 'New Section');
  if (!name) return;

  _editorSectionIdCounter++;
  var newSection = {
    id: _editorSectionIdCounter,
    name: name,
    html: '<section style="padding:60px 40px;">\n  <h2 style="font-family:Titillium Web,sans-serif;">' + escHtml(name) + '</h2>\n  <p>Add your content here...</p>\n</section>'
  };

  _editorSections.push(newSection);
  selectSection(newSection.id);
  renderSectionList();
  refreshPreview();
  toast('Section added');
}

function deleteSection(id) {
  if (!confirm('Delete this section?')) return;
  _editorSections = _editorSections.filter(function(s) { return s.id !== id; });

  if (_activeEditorSection === id) {
    _activeEditorSection = _editorSections.length > 0 ? _editorSections[0].id : null;
    if (_activeEditorSection) selectSection(_activeEditorSection);
    else document.getElementById('editor-code').value = '';
  }

  renderSectionList();
  refreshPreview();
  toast('Section deleted');
}

function toggleCssEditor() {
  _editorCssVisible = !_editorCssVisible;
  if (_editorCssVisible) selectSection('css');
  else if (_activeEditorSection === 'css' && _editorSections.length > 0) selectSection(_editorSections[0].id);
  renderSectionList();
}

function insertDataToken() {
  var tokens = [
    { token: '{{business_name}}', desc: 'Business name' },
    { token: '{{business_description}}', desc: 'Business description' },
    { token: '{{business_phone}}', desc: 'Phone number' },
    { token: '{{business_email}}', desc: 'Email address' },
    { token: '{{business_address}}', desc: 'Full address' },
    { token: '{{business_hours}}', desc: 'Formatted business hours' },
    { token: '{{inventory_grid}}', desc: 'Rental boat cards with pricing' },
    { token: '{{docks_grid}}', desc: 'Dock / accessory cards' },
    { token: '{{addon_cards}}', desc: 'Add-on cards with pricing' },
    { token: '{{steps_grid}}', desc: 'How It Works steps' },
    { token: '{{features_grid}}', desc: 'Why Circle Boats feature cards' },
    { token: '{{gallery_grid}}', desc: 'Photo gallery grid' },
    { token: '{{reviews_carousel}}', desc: 'Customer review cards' },
    { token: '{{about_title}}', desc: 'About section heading' },
    { token: '{{about_description}}', desc: 'About section body text' },
    { token: '{{booking_form}}', desc: 'Booking / contact form widget' },
    { token: '{{social_links}}', desc: 'Social media links' },
    { token: '{{google_map}}', desc: 'Embedded Google Map' }
  ];

  var container = document.getElementById('data-tokens-list');
  var html = '';
  tokens.forEach(function(t) {
    html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;margin-bottom:4px;background:var(--bg);border-radius:var(--radius);cursor:pointer;transition:background 0.15s;" onclick="insertToken(\'' + t.token + '\')" onmouseenter="this.style.background=\'var(--sidebar-hover)\'" onmouseleave="this.style.background=\'var(--bg)\'">';
    html += '<div><code style="color:var(--primary);font-size:13px;">' + t.token + '</code><br><span style="font-size:11px;color:var(--text-muted);">' + t.desc + '</span></div>';
    html += '<span style="font-size:11px;color:var(--text-dim);">Click to insert</span>';
    html += '</div>';
  });

  container.innerHTML = html;
  openModal('modal-insert-data');
}

function insertToken(token) {
  var textarea = document.getElementById('editor-code');
  var start = textarea.selectionStart;
  var end = textarea.selectionEnd;
  var val = textarea.value;

  textarea.value = val.substring(0, start) + token + val.substring(end);
  textarea.selectionStart = textarea.selectionEnd = start + token.length;
  textarea.focus();
  onEditorInput();
  closeModal('modal-insert-data');
  toast('Token inserted');
}

function setPreviewMode(mode) {
  _previewMode = mode;
  var frame = document.getElementById('editor-preview');
  if (mode === 'mobile') {
    frame.style.maxWidth = '375px';
    frame.style.margin = '0 auto';
  } else {
    frame.style.maxWidth = '';
    frame.style.margin = '';
  }
  toast('Preview: ' + mode, 'info');
}

function refreshPreview() {
  var frame = document.getElementById('editor-preview');
  if (!frame) return;

  var allHtml = _editorSections.map(function(s) { return s.html; }).join('\n');

  // Build inventory cards from SITE_DATA
  var sd = _siteEditorData || window.SITE_DATA || null;
  var inventoryHtml = '';
  var sdProducts = (sd && sd.products) ? sd.products
                   : (typeof _inventoryItems !== 'undefined' ? _inventoryItems : []);
  if (sdProducts.length > 0) {
    inventoryHtml = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:24px;">';
    sdProducts.forEach(function(item) {
      var imgSrc = toPreviewUrl(item.image);
      inventoryHtml += '<div style="background:white;border:1px solid #e5e5e5;border-radius:12px;overflow:hidden;">';
      if (imgSrc) {
        inventoryHtml += '<img src="' + imgSrc + '" style="width:100%;height:200px;object-fit:cover;">';
      } else {
        inventoryHtml += '<div style="background:#00ada8;height:200px;display:flex;align-items:center;justify-content:center;color:white;font-size:48px;">🚤</div>';
      }
      inventoryHtml += '<div style="padding:24px;">';
      if (item.featured) inventoryHtml += '<span style="background:#f59e0b;color:white;font-size:11px;padding:3px 10px;border-radius:20px;font-weight:600;margin-bottom:8px;display:inline-block;">Popular</span>';
      inventoryHtml += '<h3 style="margin:8px 0 8px;font-size:18px;color:#1a1a1a;">' + item.name + '</h3>';
      inventoryHtml += '<p style="color:#666;font-size:14px;margin:0 0 16px;">' + (item.description || '') + '</p>';
      inventoryHtml += '<div style="display:flex;gap:8px;margin-bottom:12px;">';
      inventoryHtml += '<div style="flex:1;background:#f9fafb;border-radius:8px;padding:10px;text-align:center;"><div style="font-size:11px;color:#999;">Half Day</div><div style="font-size:18px;font-weight:700;color:#00ada8;">$' + (item.halfDayAM||item.halfDay||0) + '</div></div>';
      inventoryHtml += '<div style="flex:1;background:#f9fafb;border-radius:8px;padding:10px;text-align:center;"><div style="font-size:11px;color:#999;">All Day</div><div style="font-size:18px;font-weight:700;color:#00ada8;">$' + (item.allDay||0) + '</div></div>';
      inventoryHtml += '</div>';
      if (item.specs) inventoryHtml += '<p style="font-size:12px;color:#999;margin:0;">' + item.specs + '</p>';
      inventoryHtml += '</div></div>';
    });
    inventoryHtml += '</div>';
  }

  // Build addon cards from SITE_DATA
  var addonHtml = '';
  var sdAddons = (sd && sd.addons) ? sd.addons
                 : (typeof _addons !== 'undefined' ? _addons : []);
  sdAddons.forEach(function(a) {
    addonHtml += '<div style="background:white;border:1px solid #e5e5e5;border-radius:12px;padding:20px;text-align:center;">';
    if (a.image) {
      addonHtml += '<img src="' + toPreviewUrl(a.image) + '" style="width:100%;height:120px;object-fit:cover;border-radius:8px;margin-bottom:12px;">';
    } else {
      addonHtml += '<div style="font-size:36px;margin-bottom:8px;">' + (a.icon||'🎁') + '</div>';
    }
    addonHtml += '<h4 style="margin:0 0 6px;font-size:15px;color:#1a1a1a;">' + a.name + '</h4>';
    addonHtml += '<p style="font-size:12px;color:#666;margin:0 0 10px;">' + (a.description||'') + '</p>';
    addonHtml += '<div style="font-size:18px;font-weight:700;color:#00ada8;">$' + Number(a.price||0).toFixed(0) + ' <span style="font-size:11px;color:#999;">' + (a.unit||'') + '</span></div>';
    addonHtml += '</div>';
  });

  // Build docks grid
  var docksHtml = '';
  var siteData = sd;
  if (siteData && siteData.docks && siteData.docks.length > 0) {
    docksHtml = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:24px;">';
    siteData.docks.forEach(function(d) {
      var imgSrc = toPreviewUrl(d.image);
      docksHtml += '<div style="background:white;border-radius:12px;overflow:hidden;border:1px solid #e5e5e5;">';
      if (imgSrc) docksHtml += '<img src="' + imgSrc + '" style="width:100%;height:180px;object-fit:cover;">';
      docksHtml += '<div style="padding:20px;">';
      if (d.badge) docksHtml += '<span style="background:#00ada8;color:white;font-size:11px;padding:3px 10px;border-radius:20px;font-weight:600;">' + d.badge + '</span>';
      docksHtml += '<h3 style="margin:10px 0 4px;font-size:18px;color:#1a1a1a;">' + d.name + '</h3>';
      docksHtml += '<p style="font-size:12px;color:#999;margin:0 0 8px;">' + (d.size||'') + ' · ' + (d.capacity||'') + ' capacity</p>';
      docksHtml += '<p style="font-size:14px;color:#666;margin:0 0 12px;">' + (d.description||'') + '</p>';
      docksHtml += '<div style="font-size:20px;font-weight:700;color:#00ada8;">$' + (d.allDay||50) + ' <span style="font-size:13px;color:#999;">/ day</span></div>';
      docksHtml += '</div></div>';
    });
    docksHtml += '</div>';
  } else {
    docksHtml = '<p style="color:#999;text-align:center;">No docks yet.</p>';
  }

  // Build steps grid
  var stepsHtml = '';
  if (siteData && siteData.steps && siteData.steps.length > 0) {
    stepsHtml = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:24px;">';
    siteData.steps.forEach(function(s) {
      stepsHtml += '<div style="text-align:center;padding:32px 20px;">';
      stepsHtml += '<div style="width:52px;height:52px;background:#00ada8;color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;margin:0 auto 16px;">' + (s.step||'') + '</div>';
      stepsHtml += '<h3 style="margin:0 0 8px;font-size:16px;color:#1a1a1a;">' + (s.title||'') + '</h3>';
      stepsHtml += '<p style="margin:0;font-size:14px;color:#666;">' + (s.description||'') + '</p>';
      stepsHtml += '</div>';
    });
    stepsHtml += '</div>';
  } else {
    stepsHtml = '<p style="color:#999;text-align:center;">No steps yet.</p>';
  }

  // Build features grid
  var featuresHtml = '';
  if (siteData && siteData.features && siteData.features.length > 0) {
    featuresHtml = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:24px;">';
    siteData.features.forEach(function(f) {
      featuresHtml += '<div style="background:#f9fafb;border-radius:12px;padding:28px;">';
      featuresHtml += '<div style="font-size:32px;margin-bottom:12px;">' + (f.icon||'⭐') + '</div>';
      featuresHtml += '<h3 style="margin:0 0 8px;font-size:16px;color:#1a1a1a;">' + (f.title||'') + '</h3>';
      featuresHtml += '<p style="margin:0;font-size:14px;color:#666;">' + (f.description||'') + '</p>';
      featuresHtml += '</div>';
    });
    featuresHtml += '</div>';
  } else {
    featuresHtml = '<p style="color:#999;text-align:center;">No features yet.</p>';
  }

  // Build gallery grid
  var galleryHtml = '';
  if (siteData && siteData.gallery && siteData.gallery.length > 0) {
    galleryHtml = '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:4px;">';
    siteData.gallery.forEach(function(img) {
      var src = toPreviewUrl(typeof img === 'string' ? img : img.url);
      galleryHtml += '<div style="aspect-ratio:1;overflow:hidden;"><img src="' + src + '" style="width:100%;height:100%;object-fit:cover;"></div>';
    });
    galleryHtml += '</div>';
  } else {
    galleryHtml = '<div style="background:#f1f5f9;border-radius:12px;padding:48px;text-align:center;color:#999;border:2px dashed #e5e5e5;">No gallery images yet. Upload images from Website Content → Gallery.</div>';
  }

  // Build reviews carousel
  var reviewsHtml = '';
  if (siteData && siteData.reviews) {
    var items = Array.isArray(siteData.reviews) ? siteData.reviews : (siteData.reviews.items || []);
    if (items.length > 0) {
      reviewsHtml = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:20px;">';
      items.forEach(function(r) {
        reviewsHtml += '<div style="background:#f9fafb;border-radius:12px;padding:24px;">';
        reviewsHtml += '<div style="display:flex;gap:12px;align-items:center;margin-bottom:12px;">';
        reviewsHtml += '<div style="width:40px;height:40px;background:#00ada8;color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;">' + (r.initial||r.name.charAt(0)) + '</div>';
        reviewsHtml += '<div><div style="font-weight:600;font-size:14px;color:#1a1a1a;">' + r.name + '</div><div style="font-size:12px;color:#999;">' + (r.timeAgo||r.date||'') + '</div></div>';
        reviewsHtml += '</div>';
        reviewsHtml += '<div style="color:#f59e0b;margin-bottom:8px;">' + '★'.repeat(r.stars||5) + '</div>';
        reviewsHtml += '<p style="margin:0;font-size:14px;color:#444;line-height:1.6;">' + r.text + '</p>';
        reviewsHtml += '</div>';
      });
      reviewsHtml += '</div>';
    }
  }
  if (!reviewsHtml) reviewsHtml = '<p style="color:#999;text-align:center;">No reviews yet.</p>';

  var aboutData = sd && sd.about ? sd.about : {};
  var businessData = sd && sd.business ? sd.business : {};

  var replacements = {
    '{{business_name}}': businessData.name || (_profileData ? _profileData.name : 'Beachside Circle Boats'),
    '{{business_description}}': businessData.description || (_profileData ? _profileData.description : 'Rent a portable, eco-friendly circle boat.'),
    '{{business_phone}}': businessData.phone || (_profileData ? _profileData.phone : '(601) 325-1205'),
    '{{business_email}}': businessData.email || (_profileData ? _profileData.email : 'beachsideboats@myyahoo.com'),
    '{{business_address}}': businessData.address || (_profileData ? (_profileData.address + ', ' + _profileData.city) : '25856 Canal Road, Orange Beach, AL'),
    '{{business_hours}}': businessData.hours || 'Mon-Sat: 8am-6pm | Sun: 9am-5pm',
    '{{about_title}}': aboutData.title || 'About Beachside Circle Boats',
    '{{about_description}}': aboutData.description || '',
    '{{about_perfect_for}}': aboutData.perfectFor || '',
    '{{inventory_grid}}': inventoryHtml || '<p style="color:#999;text-align:center;">No fleet items yet.</p>',
    '{{addon_cards}}': addonHtml || '<p style="color:#999;text-align:center;">No add-ons yet.</p>',
    '{{docks_grid}}': docksHtml,
    '{{steps_grid}}': stepsHtml,
    '{{features_grid}}': featuresHtml,
    '{{gallery_grid}}': galleryHtml,
    '{{reviews_carousel}}': reviewsHtml,
    '{{booking_form}}': '<div style="background:#f9fafb;padding:40px;text-align:center;border-radius:12px;color:#666;border:2px dashed #e5e5e5;">[Booking Form Widget]</div>',
    '{{staff_grid}}': '<p style="color:#999;text-align:center;">Team info here</p>',
    '{{social_links}}': '',
    '{{google_map}}': '<div style="background:#f1f5f9;padding:60px;text-align:center;border-radius:8px;color:#64748b;">[Google Map]</div>'
  };

  Object.keys(replacements).forEach(function(key) {
    allHtml = allHtml.split(key).join(replacements[key]);
  });

  var fullDoc = '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>' + _editorCss + '</style></head><body>' + allHtml + '</body></html>';

  var doc = frame.contentDocument || frame.contentWindow.document;
  doc.open();
  doc.write(fullDoc);
  doc.close();
}

if (typeof escHtml === 'undefined') {
  function escHtml(str) {
    var div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }
}

onPageLoad('site-editor', loadSiteEditor);
