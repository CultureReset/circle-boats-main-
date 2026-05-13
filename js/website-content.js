// ============================================
// Website Content Editor
// Every section editable → saves to /api/site-data → website updates instantly
// Images upload via uploadToSupabase() → stored in Supabase Storage, permanent CDN URLs
// ============================================

let _wc_data = null;
let _wc_activeSection = 'business';

const WC_BASE = 'https://cybercheck-api-database.vercel.app';
const WC_SITE_BASE = 'https://beachsidecircleboats.com'; // customer website domain

// Sections that have dedicated DB columns (saved to site_content via dashboard API)
const WC_DB_SECTIONS = ['whats_included','steps','features','footer','links_page','locations','group_rate','docks','qna','promotions'];

function wcGetAuthToken() {
  // Try Supabase session token
  try {
    var keys = Object.keys(localStorage);
    for (var k of keys) {
      if (k.startsWith('sb-') && k.endsWith('-auth-token')) {
        var s = JSON.parse(localStorage.getItem(k));
        if (s && s.access_token) return s.access_token;
      }
    }
  } catch(e) {}
  return localStorage.getItem('cc_token') || sessionStorage.getItem('cc_token') || null;
}

async function wcSaveSection(section, data) {
  const token = wcGetAuthToken();
  if (!token) return; // no auth, skip — blob save is the fallback
  try {
    await fetch(WC_BASE + '/api/dashboard/website-content/' + section, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ value: data })
    });
  } catch(e) { /* silent — blob already saved */ }
}

// Normalize any image URL to a full displayable URL
function wcToUrl(url) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  if (url.startsWith('/')) return WC_BASE + url;
  return WC_BASE + '/beachside-site/' + url;
}

const WC_SECTIONS = [
  { id: 'business',       label: '🏢 Business Info' },
  { id: 'hero',           label: '🌟 Hero Section' },
  { id: 'about',          label: 'ℹ️ About' },
  { id: 'products',       label: '🚤 Boats & Pricing' },
  { id: 'group_rate',     label: '👥 Group Rate' },
  { id: 'docks',          label: '🛟 Docks' },
  { id: 'whats_included', label: '✅ What\'s Included' },
  { id: 'addons',         label: '🎁 Add-ons' },
  { id: 'booking_settings', label: '💳 Booking & Payment' },
  { id: 'steps',          label: '👣 How It Works' },
  { id: 'features',       label: '⭐ Why Circle Boats' },
  { id: 'locations',      label: '📍 Launch Locations' },
  { id: 'links_page',     label: '🔗 Bio Links Page' },
  { id: 'gallery',        label: '🖼️ Gallery' },
  { id: 'reviews',        label: '💬 Reviews' },
  { id: 'qna',            label: '❓ Q&A / FAQ' },
  { id: 'promotions',     label: '🏷️ Promotions' },
  { id: 'cta',            label: '🎯 CTA Banner' },
  { id: 'contact',        label: '📞 Contact' },
  { id: 'footer',         label: '📋 Footer' }
];

// ─── Load ─────────────────────────────────────────────────────────────────────

async function loadWebsiteContent() {
  updateWebsiteSectionsForType();

  const panel = document.getElementById('wc-panel');
  if (panel) panel.innerHTML = '<p style="padding:32px;color:var(--text-muted);">Loading…</p>';
  try {
    const res = await fetch(WC_BASE + '/api/site-data');
    if (!res.ok) throw new Error(res.status);
    _wc_data = await res.json();
  } catch(e) {
    toast('Could not load site data — is the server running?', 'error');
    return;
  }
  // Overlay fresh DB content sections (more up-to-date than blob)
  try {
    const token = wcGetAuthToken();
    if (token) {
      const dbRes = await fetch(WC_BASE + '/api/dashboard/website-content', {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      if (dbRes.ok) {
        const dbData = await dbRes.json();
        WC_DB_SECTIONS.forEach(function(section) {
          if (dbData[section] !== undefined && dbData[section] !== null) {
            const isEmpty = Array.isArray(dbData[section])
              ? dbData[section].length === 0
              : (typeof dbData[section] === 'object' ? Object.keys(dbData[section]).length === 0 : !dbData[section]);
            if (!isEmpty) _wc_data[section] = dbData[section];
          }
        });
        // hero CTA
        if (dbData.hero_cta_text || dbData.hero_cta_url) {
          if (!_wc_data.hero) _wc_data.hero = {};
          if (dbData.hero_cta_text) _wc_data.hero.ctaText = dbData.hero_cta_text;
          if (dbData.hero_cta_url)  _wc_data.hero.ctaUrl  = dbData.hero_cta_url;
        }
      }
    }
  } catch(e) { /* use blob data */ }

  // Merge image_url from rental_addons table into blob addons (source of truth for images)
  try {
    const token = wcGetAuthToken();
    if (token) {
      const aoRes = await fetch(WC_BASE + '/api/dashboard/addons', {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      if (aoRes.ok) {
        const aoRows = await aoRes.json();
        if (Array.isArray(aoRows) && aoRows.length) {
          const byName = {};
          aoRows.forEach(function(r) { if (r.name) byName[r.name.trim().toLowerCase()] = r.image_url || ''; });
          if (!Array.isArray(_wc_data.addons)) _wc_data.addons = [];
          _wc_data.addons = _wc_data.addons.map(function(a) {
            const key = (a.name || '').trim().toLowerCase();
            return Object.assign({}, a, { image: a.image || byName[key] || '' });
          });
        }
      }
    }
  } catch(e) { /* keep blob images as-is */ }

  renderWCNav();
  renderWCSection(_wc_activeSection);
}

// ─── Nav ──────────────────────────────────────────────────────────────────────

function renderWCNav() {
  const nav = document.getElementById('wc-nav');
  if (!nav) return;
  nav.innerHTML = WC_SECTIONS.map(s => `
    <div class="wc-nav-item${_wc_activeSection === s.id ? ' active' : ''}"
         onclick="renderWCSection('${s.id}')">${s.label}</div>
  `).join('');
}

function renderWCSection(id) {
  _wc_activeSection = id;
  renderWCNav();
  const panel = document.getElementById('wc-panel');
  if (!panel || !_wc_data) return;
  const map = {
    business: renderBusiness, hero: renderHero, about: renderAbout,
    products: renderProducts, group_rate: renderGroupRate, docks: renderDocks,
    whats_included: renderWhatsIncluded, addons: renderAddons,
    booking_settings: renderBookingSettings,
    steps: renderSteps, features: renderFeatures, locations: renderLocations,
    links_page: renderLinksPage,
    gallery: renderGallery,
    reviews: renderReviews, qna: renderQnA, promotions: renderPromotions, cta: renderCta, contact: renderContact, footer: renderFooter
  };
  panel.innerHTML = (map[id] || (() => '<p>Section not found</p>'))();
  // Trigger live previews that need DOM to be ready
  if (id === 'booking_settings') setTimeout(bsPreview, 0);
}

// ─── Save ─────────────────────────────────────────────────────────────────────

async function wcSave(section, data) {
  _wc_data[section] = data;
  await wcPush();
  // Also save to proper DB column for supported sections
  if (WC_DB_SECTIONS.includes(section)) {
    wcSaveSection(section, data);  // fire and forget
  }
}

async function wcPush() {
  try {
    const res = await fetch(WC_BASE + '/api/site-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(_wc_data)
    });
    if (!res.ok) throw new Error(res.status);
    localStorage.removeItem('beachside_site_data');
    localStorage.removeItem('beachside_site_data_ts');
    toast('Saved — website updated ✓');
  } catch(e) {
    toast('Save failed: ' + e.message, 'error');
  }
}

// ─── In-memory collect (save form → _wc_data without API push) ───────────────
// Called before add/delete so unsaved edits aren't lost on re-render

function wcCollect(section) {
  if (section === 'products') {
    _wc_data.products = (_wc_data.products||[]).map((_,i) => ({
      name:val('p-name-'+i), description:val('p-desc-'+i), image:val('p-img-'+i),
      specs:val('p-specs-'+i), featured:chk('p-feat-'+i),
      halfDayAM:num('p-am-'+i), halfDayPM:num('p-pm-'+i), allDay:num('p-all-'+i)
    }));
  } else if (section === 'docks') {
    _wc_data.docks = (_wc_data.docks||[]).map((_,i) => ({
      name:val('dk-name-'+i), badge:val('dk-badge-'+i)||null, size:val('dk-size-'+i),
      capacity:val('dk-cap-'+i), description:val('dk-desc-'+i), image:val('dk-img-'+i),
      halfDay:num('dk-hd-'+i), allDay:num('dk-ad-'+i),
      features:val('dk-feats-'+i).split('\n').map(s=>s.trim()).filter(Boolean)
    }));
  } else if (section === 'addons') {
    _wc_data.addons = (_wc_data.addons||[]).map((_,i) => ({
      icon:val('ao-icon-'+i), name:val('ao-name-'+i), description:val('ao-desc-'+i),
      price:num('ao-price-'+i), unit:val('ao-unit-'+i), image:val('ao-img-'+i)||''
    }));
  } else if (section === 'steps') {
    _wc_data.steps = (_wc_data.steps||[]).map((s,i) => ({
      step:num('st-num-'+i), title:val('st-title-'+i), description:val('st-desc-'+i), image:val('st-img-'+i)||s.image||''
    }));
  } else if (section === 'features') {
    _wc_data.features = (_wc_data.features||[]).map((f,i) => ({
      icon:val('ft-icon-'+i), title:val('ft-title-'+i), description:val('ft-desc-'+i), image:f.image||''
    }));
  } else if (section === 'about') {
    const count = (_wc_data.about?.features||[]).length;
    if (!_wc_data.about) _wc_data.about = {};
    _wc_data.about = {
      ..._wc_data.about,
      title:val('a-title'), subtitle:val('a-sub'), description:val('a-desc'), perfectFor:val('a-for'),
      image: val('a-img') || _wc_data.about?.image || '',
      features: Array.from({length:count},(_,i)=>({ icon:val('af-icon-'+i), title:val('af-title-'+i), description:val('af-desc-'+i), image:val('af-img-'+i)||'' }))
    };
  } else if (section === 'reviews') {
    const count = (_wc_data.reviews?.items||[]).length;
    _wc_data.reviews = {
      ..._wc_data.reviews,
      rating:num('rv-rating'), source:val('rv-source'),
      items: Array.from({length:count},(_,i)=>({ name:val('rv-name-'+i), initial:val('rv-init-'+i), timeAgo:val('rv-time-'+i), stars:num('rv-stars-'+i), text:val('rv-text-'+i) }))
    };
  } else if (section === 'locations') {
    _wc_data.locations = (_wc_data.locations||[]).map((_,i) => ({
      id:val('lc-id-'+i)||('loc'+(i+1)), name:val('lc-name-'+i),
      address:val('lc-addr-'+i), description:val('lc-desc-'+i), mapUrl:val('lc-map-'+i),
      image:val('lc-img-'+i)||undefined
    }));
  } else if (section === 'qna') {
    _wc_data.qna = (_wc_data.qna||[]).map((_,i) => ({
      question:val('qa-q-'+i), answer:val('qa-a-'+i)
    }));
  }
}

// ─── Add / Delete item (in-memory, requires Save to push) ────────────────────

function wcAddItem(section) {
  wcCollect(section);
  const defaults = {
    products:  {name:'New Boat', description:'', specs:'', halfDayAM:0, halfDayPM:0, allDay:0, featured:false, image:''},
    docks:     {name:'New Dock', description:'', size:'', capacity:'', badge:'', halfDay:0, allDay:0, image:'', features:[]},
    addons:    {name:'New Add-on', description:'', icon:'', price:0, unit:'per trip', image:''},
    steps:     {step:(_wc_data.steps||[]).length+1, title:'New Step', description:'', image:''},
    features:  {title:'New Feature', icon:'', description:'', image:''},
    locations: {id:'loc'+Date.now(), name:'New Location', address:'', description:'', mapUrl:''},
    qna: {question:'', answer:''}
  };
  if (section === 'reviews') {
    if (!_wc_data.reviews) _wc_data.reviews = {rating:5, source:'Google Reviews', items:[]};
    if (!_wc_data.reviews.items) _wc_data.reviews.items = [];
    _wc_data.reviews.items.push({name:'', initial:'', timeAgo:'', stars:5, text:''});
  } else if (section === 'about') {
    if (!_wc_data.about) _wc_data.about = {};
    if (!_wc_data.about.features) _wc_data.about.features = [];
    _wc_data.about.features.push({icon:'', title:'New Feature', description:''});
  } else {
    if (!_wc_data[section]) _wc_data[section] = [];
    _wc_data[section].push(defaults[section] || {name:'New Item'});
  }
  renderWCSection(section);
}

function wcDeleteItem(section, index) {
  if (!confirm('Delete this item?')) return;
  wcCollect(section);
  if (section === 'reviews') {
    (_wc_data.reviews?.items||[]).splice(index, 1);
  } else if (section === 'about') {
    (_wc_data.about?.features||[]).splice(index, 1);
  } else {
    (_wc_data[section]||[]).splice(index, 1);
  }
  renderWCSection(section);
}

// ─── UI helpers ───────────────────────────────────────────────────────────────

function wcAddBar(section, label) {
  return `<div style="display:flex;justify-content:flex-end;margin-bottom:16px;">
    <button class="btn btn-outline btn-sm" onclick="wcAddItem('${section}')">+ Add ${esc(label)}</button>
  </div>`;
}

function wcDelBtn(section, index, label='Delete') {
  return `<button class="btn btn-sm" onclick="wcDeleteItem('${section}',${index})"
    style="color:var(--danger,#ef4444);border-color:var(--danger,#ef4444);padding:3px 10px;font-size:12px;">🗑 ${esc(label)}</button>`;
}

// ─── Image upload helper ──────────────────────────────────────────────────────

function imgPickerHtml(inputId, currentUrl, label='Image', context='default') {
  const fullUrl = wcToUrl(currentUrl);
  const preview = fullUrl
    ? `<img src="${esc(fullUrl)}" style="max-width:200px;max-height:160px;width:auto;height:auto;object-fit:contain;border-radius:6px;border:1px solid var(--card-border);display:block;" onerror="this.parentElement.innerHTML='<div style=\\'height:80px;width:120px;border-radius:6px;border:2px dashed var(--card-border);display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:11px;\\'>No image</div>'">`
    : `<div style="height:80px;width:120px;border-radius:6px;border:2px dashed var(--card-border);display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:11px;">No image</div>`;
  return `
    <div class="form-group">
      <label>${label}</label>
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
        <div id="${inputId}-preview">${preview}</div>
        <div style="display:flex;flex-direction:column;gap:6px;">
          <button type="button" class="btn btn-outline btn-sm"
            onclick="document.getElementById('${inputId}-file').click()">Upload Image</button>
          <input type="file" id="${inputId}-file" accept="image/*" style="display:none"
            data-context="${context}" onchange="wcUploadImg('${inputId}', this)">
          <button type="button" class="btn btn-outline btn-sm"
            onclick="wcOpenGalleryPicker('${inputId}')" style="color:var(--primary);">📂 Pick from Gallery</button>
          <input type="text" id="${inputId}" value="${esc(currentUrl)}"
            placeholder="or paste URL / path"
            style="font-size:12px;padding:4px 8px;"
            oninput="wcRefreshPreview('${inputId}')">
        </div>
      </div>
    </div>`;
}

async function wcUploadImg(inputId, fileInput) {
  const file = fileInput.files[0];
  if (!file) return;
  const btn = fileInput.previousElementSibling;
  if (btn) btn.textContent = 'Uploading…';
  try {
    const context = fileInput.dataset.context || 'website';
    const url = await uploadToSupabase(file, context);
    if (!url) throw new Error('Upload returned no URL');
    document.getElementById(inputId).value = url;
    wcRefreshPreview(inputId);
    toast('Image uploaded ✓');
  } catch(e) {
    toast('Upload failed: ' + e.message, 'error');
  }
  if (btn) btn.textContent = 'Upload Image';
  fileInput.value = '';
}

function wcRefreshPreview(inputId) {
  const input = document.getElementById(inputId);
  const previewEl = document.getElementById(inputId + '-preview');
  if (!input || !previewEl) return;
  const full = wcToUrl(input.value.trim());
  if (full) {
    previewEl.innerHTML = `<img src="${full}" style="max-width:200px;max-height:160px;width:auto;height:auto;object-fit:contain;border-radius:6px;border:1px solid var(--card-border);display:block;" onerror="this.style.display='none'">`;
  } else {
    previewEl.innerHTML = `<div style="height:80px;width:120px;border-radius:6px;border:2px dashed var(--card-border);display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:11px;">No image</div>`;
  }
}

// ─── Field helpers ────────────────────────────────────────────────────────────

function fi(label, id, value, type='text', placeholder='') {
  return `<div class="form-group"><label>${label}</label>
    <input type="${type}" id="${id}" value="${esc(value)}" placeholder="${esc(placeholder)}">
  </div>`;
}
function ta(label, id, value, rows=3) {
  return `<div class="form-group"><label>${label}</label>
    <textarea id="${id}" rows="${rows}">${esc(value)}</textarea>
  </div>`;
}
function esc(v) {
  return String(v||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function val(id) { const el = document.getElementById(id); return el ? el.value.trim() : ''; }
function num(id) { return parseFloat(val(id)) || 0; }
function chk(id) { const el = document.getElementById(id); return el ? el.checked : false; }
function saveBtn(fn) {
  return `<div style="margin-top:28px;padding-top:20px;border-top:1px solid var(--card-border);">
    <button class="btn btn-primary" onclick="${fn}()">💾 Save &amp; Publish to Website</button>
  </div>`;
}

// ─── Business ─────────────────────────────────────────────────────────────────

function renderBusiness() {
  const d = _wc_data.business || {};
  return `<h2 class="wc-title">Business Info</h2>
  <div class="form-row">${fi('Business Name','b-name',d.name)}${fi('Phone','b-phone',d.phone,'tel')}</div>
  <div class="form-row">${fi('Email','b-email',d.email,'email')}${fi('Location Tag','b-loc',d.location,'text','Orange Beach, Alabama')}</div>
  ${fi('Address','b-addr',d.address)}
  ${fi('Tagline','b-tag',d.tagline)}
  ${ta('Description','b-desc',d.description)}
  ${ta('Hours (one line per day, e.g. Mon–Fri: 9 AM – 6 PM)','b-hrs',d.hours||'',8)}
  ${fi('Hours note','b-hrsnote',d.hoursNote)}
  ${saveBtn('saveBusiness')}`;
}
function saveBusiness() {
  const bizData = {
    name:val('b-name'), phone:val('b-phone'), email:val('b-email'), location:val('b-loc'),
    address:val('b-addr'), tagline:val('b-tag'), description:val('b-desc'),
    hours:val('b-hrs'), hoursNote:val('b-hrsnote')
  };
  wcSave('business', bizData);
  // Write to DB tables so server.js overlay picks up the changes
  const token = wcGetAuthToken();
  if (token) {
    fetch(WC_BASE + '/api/dashboard/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({
        business: { name: bizData.name },
        content: {
          about_text:    bizData.description,
          contact_phone: bizData.phone,
          contact_email: bizData.email,
          address:       bizData.address,
          hero_text:     bizData.tagline
        }
      })
    }).catch(function(){});
  }
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function renderHero() {
  const d = _wc_data.hero || {};
  return `<h2 class="wc-title">Hero Section</h2>
  ${fi('Location Tag (top of hero)','h-loc',d.location,'text','Orange Beach, Alabama')}
  ${fi('Headline (H1)','h-title',d.title)}
  ${ta('Subtitle','h-sub',d.subtitle)}
  <div class="form-row">${fi('CTA Button Text','h-cta',d.ctaText,'text','Book Now')}${fi('CTA URL','h-url',d.ctaUrl,'text','#rentals')}</div>
  <div style="margin-top:16px;padding:16px;background:var(--bg);border-radius:12px;border:1px solid var(--card-border);">
    <label style="display:block;font-weight:600;margin-bottom:6px;font-size:14px;">Hero Video URL</label>
    <p style="color:var(--text-muted);font-size:12px;margin-bottom:8px;">Paste a YouTube or video URL. Leave blank to hide the video entirely.</p>
    <input type="text" id="h-video" value="${esc(d.videoUrl || '')}" placeholder="https://www.youtube.com/watch?v=..." style="width:100%;padding:10px 14px;border:1px solid var(--card-border);border-radius:8px;background:var(--card-bg);color:var(--text);font-size:14px;">
    ${d.videoUrl ? `<div style="margin-top:8px;"><button type="button" class="btn btn-sm" style="background:#ef4444;color:white;border:none;font-size:12px;padding:4px 12px;" onclick="document.getElementById('h-video').value='';toast('Video cleared — click Save to apply')">Remove Video</button></div>` : ''}
  </div>
  ${saveBtn('saveHero')}`;
}
function saveHero() {
  const heroData = { location:val('h-loc'), title:val('h-title'), subtitle:val('h-sub'), ctaText:val('h-cta'), ctaUrl:val('h-url'), videoUrl:val('h-video').trim() };
  wcSave('hero', heroData);
  // Save CTA fields to DB separately
  const token = wcGetAuthToken();
  if (token && heroData.ctaText) {
    fetch(WC_BASE + '/api/dashboard/website-content/hero_cta_text', {
      method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ value: heroData.ctaText })
    }).catch(function(){});
  }
  if (token && heroData.ctaUrl) {
    fetch(WC_BASE + '/api/dashboard/website-content/hero_cta_url', {
      method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ value: heroData.ctaUrl })
    }).catch(function(){});
  }
}

// ─── About ────────────────────────────────────────────────────────────────────

function renderAbout() {
  const d = _wc_data.about || {};
  const feats = d.features || [];
  return `<h2 class="wc-title">About Section</h2>
  ${fi('Section Title','a-title',d.title)}
  ${fi('Subtitle','a-sub',d.subtitle)}
  ${ta('Main Description','a-desc',d.description,4)}
  ${ta('"Perfect For" line','a-for',d.perfectFor)}
  ${imgPickerHtml('a-img', d.image||'', 'Section Photo (displays full-width on website)', 'about')}
  <div style="display:flex;justify-content:space-between;align-items:center;margin:24px 0 12px;">
    <h3 style="margin:0;font-size:15px;font-weight:600;">Feature Highlights</h3>
    <button class="btn btn-outline btn-sm" onclick="wcAddItem('about')">+ Add Feature</button>
  </div>
  ${feats.map((f,i) => `
    <div class="wc-card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <strong style="font-size:14px;color:var(--text-muted);">Feature ${i+1}</strong>
        ${wcDelBtn('about', i)}
      </div>
      <div class="form-row">${fi('Icon (optional — hidden when photo is set)','af-icon-'+i,f.icon,'text','⚡')}${fi('Title','af-title-'+i,f.title)}</div>
      ${ta('Description','af-desc-'+i,f.description,2)}
      ${imgPickerHtml('af-img-'+i, f.image||'', 'Photo (optional)', 'about')}
    </div>`).join('')}
  ${feats.length === 0 ? `<div style="text-align:center;padding:32px;color:var(--text-muted);border:2px dashed var(--card-border);border-radius:10px;">No features yet — click "+ Add Feature" above</div>` : ''}
  ${saveBtn('saveAbout')}`;
}
function saveAbout() {
  const count = (_wc_data.about?.features||[]).length;
  wcSave('about', {
    title:val('a-title'), subtitle:val('a-sub'), description:val('a-desc'), perfectFor:val('a-for'),
    image: val('a-img') || (_wc_data.about?.image || ''),
    features: Array.from({length:count},(_,i)=>({ icon:val('af-icon-'+i), title:val('af-title-'+i), description:val('af-desc-'+i), image:val('af-img-'+i)||'' }))
  });
}

// ─── Products / Boats ─────────────────────────────────────────────────────────

function renderProducts() {
  const prods = _wc_data.products || [];
  return `<h2 class="wc-title">Boats & Pricing</h2>
  ${wcAddBar('products', 'Boat')}
  ${prods.map((p,i) => `
    <div class="wc-card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
        <input type="text" id="p-name-${i}" value="${esc(p.name)}" placeholder="Boat name…"
          style="font-size:16px;font-weight:600;border:none;background:transparent;padding:2px 0;flex:1;color:inherit;outline:none;border-bottom:1px dashed var(--card-border);"
          onfocus="this.style.borderBottomColor='var(--primary)'" onblur="this.style.borderBottomColor='var(--card-border)'">
        <div style="display:flex;align-items:center;gap:12px;flex-shrink:0;">
          <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;">
            <input type="checkbox" id="p-feat-${i}" ${p.featured?'checked':''}> Mark as Popular
          </label>
          ${wcDelBtn('products', i)}
        </div>
      </div>
      ${imgPickerHtml('p-img-'+i, p.image, 'Boat Photo', 'boat')}
      <div class="form-row">${fi('Specs line','p-specs-'+i,p.specs,'text','70" diameter • Max 300 lbs')}</div>
      ${ta('Description','p-desc-'+i,p.description,2)}
      <div class="form-row">
        ${fi('Half Day AM ($)','p-am-'+i,p.halfDayAM??p.halfDay,'number')}
        ${fi('Half Day PM ($)','p-pm-'+i,p.halfDayPM??p.halfDay,'number')}
        ${fi('All Day ($)','p-all-'+i,p.allDay,'number')}
        ${fi('Qty Available','p-qty-'+i,p.qty??1,'number')}
      </div>
    </div>`).join('')}
  ${prods.length === 0 ? `<div style="text-align:center;padding:32px;color:var(--text-muted);border:2px dashed var(--card-border);border-radius:10px;">No boats yet — click "+ Add Boat" above</div>` : ''}
  ${saveBtn('saveProducts')}`;
}
async function saveProducts() {
  const prods = (_wc_data.products||[]).map((_,i)=>({
    name:val('p-name-'+i), description:val('p-desc-'+i), image:val('p-img-'+i),
    specs:val('p-specs-'+i), featured:chk('p-feat-'+i),
    halfDayAM:num('p-am-'+i), halfDayPM:num('p-pm-'+i), allDay:num('p-all-'+i),
    qty:num('p-qty-'+i)||1
  }));
  wcSave('products', prods);

  // Sync images + pricing to fleet_types so inventory tab and booking engine stay in sync
  const token = wcGetAuthToken();
  if (!token) return;
  try {
    // Fetch fleet types directly — don't depend on CC.dashboard module
    const ftRes = await fetch(WC_BASE + '/api/dashboard/fleet', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (!ftRes.ok) { toast('Price sync failed — could not load fleet types', 'error'); return; }
    const fleetTypes = await ftRes.json();
    if (!Array.isArray(fleetTypes) || !fleetTypes.length) return;

    for (const ft of fleetTypes) {
      const match = prods.find(function(p) {
        return p.name && ft.name && p.name.trim().toLowerCase() === ft.name.trim().toLowerCase();
      });
      if (!match) continue;
      const r = await fetch(WC_BASE + '/api/dashboard/fleet/' + ft.id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({
          description: match.description || ft.description || '',
          image_url: match.image || ft.image_url || null,
          specs: Object.assign({}, ft.specs || {}, {
            halfDayAM: match.halfDayAM || 0,
            halfDayPM: match.halfDayPM || 0,
            allDay: match.allDay || 0,
            specsText: match.specs || '',
            qty: match.qty || (ft.specs && ft.specs.qty) || 1
          })
        })
      });
      if (!r.ok) toast('Price sync failed for ' + ft.name + ' — try saving again', 'error');
    }
  } catch(e) {
    toast('Price sync error: ' + e.message, 'error');
  }
}

// ─── Group Rate ───────────────────────────────────────────────────────────────

function renderGroupRate() {
  const d = _wc_data.group_rate || {};
  return `<h2 class="wc-title">Group Rate</h2>
  ${fi('Title','gr-title',d.title)}
  ${ta('Description','gr-desc',d.description)}
  <div class="form-row">${fi('Price per boat ($)','gr-price',d.price,'number')}${fi('Price label','gr-label',d.priceLabel,'text','each / All Day')}</div>
  <div class="form-row">${fi('CTA Button Text','gr-cta',d.ctaText,'text','Call to Book')}${fi('CTA URL','gr-url',d.ctaUrl,'text','tel:6013251205')}</div>
  ${saveBtn('saveGroupRate')}`;
}
function saveGroupRate() {
  wcSave('group_rate', { title:val('gr-title'), description:val('gr-desc'), price:num('gr-price'), priceLabel:val('gr-label'), ctaText:val('gr-cta'), ctaUrl:val('gr-url') });
}

// ─── Docks ────────────────────────────────────────────────────────────────────

function renderDocks() {
  const docks = _wc_data.docks || [];
  return `<h2 class="wc-title">Docks / Accessories</h2>
  ${wcAddBar('docks', 'Dock')}
  ${docks.map((d,i) => `
    <div class="wc-card">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:16px;">
        <input type="text" id="dk-name-${i}" value="${esc(d.name)}" placeholder="Dock / accessory name…"
          style="font-size:16px;font-weight:600;border:none;background:transparent;padding:2px 0;flex:1;color:inherit;outline:none;border-bottom:1px dashed var(--card-border);"
          onfocus="this.style.borderBottomColor='var(--primary)'" onblur="this.style.borderBottomColor='var(--card-border)'">
        ${wcDelBtn('docks', i)}
      </div>
      ${imgPickerHtml('dk-img-'+i, d.image, 'Dock Photo', 'dock')}
      <div class="form-row">${fi('Badge','dk-badge-'+i,d.badge,'text','Most Popular')}</div>
      <div class="form-row">${fi('Size','dk-size-'+i,d.size,'text',"8'4\" x 44\"")}${fi('Capacity','dk-cap-'+i,d.capacity,'text','100 lb')}</div>
      ${ta('Description','dk-desc-'+i,d.description,3)}
      <div class="form-row">${fi('Half Day ($)','dk-hd-'+i,d.halfDay,'number')}${fi('All Day ($)','dk-ad-'+i,d.allDay,'number')}</div>
      <div class="form-group">
        <label>Feature Bullets (one per line)</label>
        <textarea id="dk-feats-${i}" rows="4">${esc((d.features||[]).join('\n'))}</textarea>
      </div>
    </div>`).join('')}
  ${docks.length === 0 ? `<div style="text-align:center;padding:32px;color:var(--text-muted);border:2px dashed var(--card-border);border-radius:10px;">No docks yet — click "+ Add Dock" above</div>` : ''}
  ${saveBtn('saveDocks')}`;
}
function saveDocks() {
  const docks = (_wc_data.docks||[]).map((_,i)=>({
    name:val('dk-name-'+i), badge:val('dk-badge-'+i)||null, size:val('dk-size-'+i),
    capacity:val('dk-cap-'+i), description:val('dk-desc-'+i), image:val('dk-img-'+i),
    halfDay:num('dk-hd-'+i), allDay:num('dk-ad-'+i),
    features:val('dk-feats-'+i).split('\n').map(s=>s.trim()).filter(Boolean)
  }));
  wcSave('docks', docks);
}

// ─── What's Included ──────────────────────────────────────────────────────────

function renderWhatsIncluded() {
  const items = _wc_data.whats_included || [];
  return `<h2 class="wc-title">What's Included</h2>
  <p style="color:var(--text-muted);margin-bottom:16px;font-size:14px;">One item per line — shown as checkmarks on the website.</p>
  <div class="form-group"><textarea id="wi-items" rows="10">${esc(items.join('\n'))}</textarea></div>
  ${saveBtn('saveWhatsIncluded')}`;
}
function saveWhatsIncluded() {
  wcSave('whats_included', val('wi-items').split('\n').map(s=>s.trim()).filter(Boolean));
}

// ─── Add-ons ──────────────────────────────────────────────────────────────────

function renderAddons() {
  const addons = _wc_data.addons || [];
  return `<h2 class="wc-title">Add-ons / Extras</h2>
  ${wcAddBar('addons', 'Add-on')}
  ${addons.map((a,i) => `
    <div class="wc-card">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:12px;">
        <input type="text" id="ao-name-${i}" value="${esc(a.name)}" placeholder="Add-on name…"
          style="font-size:16px;font-weight:600;border:none;background:transparent;padding:2px 0;flex:1;color:inherit;outline:none;border-bottom:1px dashed var(--card-border);"
          onfocus="this.style.borderBottomColor='var(--primary)'" onblur="this.style.borderBottomColor='var(--card-border)'">
        ${wcDelBtn('addons', i)}
      </div>
      ${imgPickerHtml('ao-img-'+i, a.image||'', 'Add-on Photo (optional)', 'addon')}
      <div class="form-row">
        ${fi('Icon (optional)','ao-icon-'+i,a.icon,'text','🎁')}
        ${fi('Price ($)','ao-price-'+i,a.price,'number')}
        ${fi('Unit','ao-unit-'+i,a.unit,'text','per trip')}
      </div>
      ${fi('Description','ao-desc-'+i,a.description)}
    </div>`).join('')}
  ${addons.length === 0 ? `<div style="text-align:center;padding:32px;color:var(--text-muted);border:2px dashed var(--card-border);border-radius:10px;">No add-ons yet — click "+ Add Add-on" above</div>` : ''}
  ${saveBtn('saveAddons')}`;
}
async function saveAddons() {
  const addons = (_wc_data.addons||[]).map((_,i)=>({
    icon:val('ao-icon-'+i), name:val('ao-name-'+i), description:val('ao-desc-'+i),
    price:num('ao-price-'+i), unit:val('ao-unit-'+i), image:val('ao-img-'+i)||undefined
  }));
  wcSave('addons', addons);

  // Sync to rental_addons table so website reads live data
  try {
    const token = wcGetAuthToken();
    if (token) {
      const r = await fetch(WC_BASE + '/api/dashboard/addons/sync', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify(addons)
      });
      if (!r.ok) { const err = await r.json().catch(()=>({})); toast('Add-on sync failed: ' + (err.error || r.status), 'error'); }
    }
  } catch(e) {
    toast('Add-on sync error: ' + e.message, 'error');
  }
}

// ─── Booking & Payment Settings ───────────────────────────────────────────────

function renderBookingSettings() {
  const d = _wc_data.booking_settings || {};
  const mode = d.paymentMode || 'full';
  return `<h2 class="wc-title">Booking & Payment</h2>
  <p style="color:var(--text-muted);margin-bottom:24px;font-size:14px;">
    Choose how customers pay when they book on your website. This setting applies to every booking.
  </p>

  <div class="form-group">
    <label style="font-weight:600;margin-bottom:12px;display:block;">Payment Policy</label>
    <div style="display:flex;flex-direction:column;gap:10px;">

      <label style="display:flex;align-items:flex-start;gap:12px;padding:14px 16px;border:2px solid ${mode==='full'?'var(--primary)':'var(--card-border)'};border-radius:10px;cursor:pointer;background:${mode==='full'?'var(--primary-bg,rgba(0,173,168,0.06))':'var(--bg)'};">
        <input type="radio" name="bs-mode" value="full" ${mode==='full'?'checked':''} onchange="bsToggleMode()" style="margin-top:3px;flex-shrink:0;">
        <div>
          <div style="font-weight:600;font-size:14px;">Pay in Full at Booking</div>
          <div style="font-size:13px;color:var(--text-muted);margin-top:2px;">Customer pays the full amount via credit card when they book.</div>
        </div>
      </label>

      <label style="display:flex;align-items:flex-start;gap:12px;padding:14px 16px;border:2px solid ${mode==='deposit'?'var(--primary)':'var(--card-border)'};border-radius:10px;cursor:pointer;background:${mode==='deposit'?'var(--primary-bg,rgba(0,173,168,0.06))':'var(--bg)'};">
        <input type="radio" name="bs-mode" value="deposit" ${mode==='deposit'?'checked':''} onchange="bsToggleMode()" style="margin-top:3px;flex-shrink:0;">
        <div>
          <div style="font-weight:600;font-size:14px;">Deposit at Booking</div>
          <div style="font-size:13px;color:var(--text-muted);margin-top:2px;">Customer pays a deposit now. Balance due at time of rental.</div>
        </div>
      </label>

      <label style="display:flex;align-items:flex-start;gap:12px;padding:14px 16px;border:2px solid ${mode==='at_location'?'var(--primary)':'var(--card-border)'};border-radius:10px;cursor:pointer;background:${mode==='at_location'?'var(--primary-bg,rgba(0,173,168,0.06))':'var(--bg)'};">
        <input type="radio" name="bs-mode" value="at_location" ${mode==='at_location'?'checked':''} onchange="bsToggleMode()" style="margin-top:3px;flex-shrink:0;">
        <div>
          <div style="font-weight:600;font-size:14px;">Book Now — Pay at Location</div>
          <div style="font-size:13px;color:var(--text-muted);margin-top:2px;">No payment collected at booking. Customer pays when they arrive.</div>
        </div>
      </label>

    </div>
  </div>

  <div id="bs-deposit-fields" style="display:${mode==='deposit'?'block':'none'};margin-top:4px;">
    <div class="form-row">
      ${fi('Deposit %','bs-pct',d.depositPct||25,'number','25')}
      ${fi('Deposit label shown to customer','bs-label',d.depositLabel||'Deposit required to secure your booking','text')}
    </div>
  </div>

  <div style="margin-top:20px;">
    ${fi('Booking button label (optional override)','bs-btnlabel',d.buttonLabel||'','text','e.g. Reserve Now')}
  </div>

  <!-- SMS Confirmation Preview -->
  <div style="margin-top:32px;padding-top:24px;border-top:1px solid var(--card-border);">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
      <label style="font-weight:600;font-size:15px;">Booking Confirmation SMS</label>
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:14px;color:var(--text-muted);">
        <input type="checkbox" id="bs-sms-enabled" onchange="bsPreview()"
          ${d.smsEnabled !== false ? 'checked' : ''}
          style="width:16px;height:16px;accent-color:var(--primary);">
        Send automatically
      </label>
    </div>
    <p style="font-size:13px;color:var(--text-muted);margin-bottom:14px;">
      Sent to the customer immediately after they book. Use: <code style="background:var(--bg2,#f0f4f8);padding:1px 5px;border-radius:4px;">{customer_name}</code> <code style="background:var(--bg2,#f0f4f8);padding:1px 5px;border-radius:4px;">{date}</code> <code style="background:var(--bg2,#f0f4f8);padding:1px 5px;border-radius:4px;">{time}</code> <code style="background:var(--bg2,#f0f4f8);padding:1px 5px;border-radius:4px;">{service}</code> <code style="background:var(--bg2,#f0f4f8);padding:1px 5px;border-radius:4px;">{business_name}</code>
    </p>
    <textarea id="bs-sms-template" rows="4" oninput="bsPreview()"
      style="width:100%;padding:12px;border:1px solid var(--card-border);border-radius:8px;font-size:13px;font-family:inherit;resize:vertical;background:var(--bg);color:inherit;"
      placeholder="Confirmation SMS text…">${esc(d.smsTemplate || 'Hi {customer_name}! Your {service} is confirmed for {date} at {time}. See you at the dock! Questions? Reply to this message.')}</textarea>
    <div style="margin-top:16px;">
      <div style="font-size:12px;font-weight:600;color:var(--text-muted);margin-bottom:8px;text-transform:uppercase;letter-spacing:.5px;">Live Preview</div>
      <div style="display:flex;gap:12px;align-items:flex-end;">
        <div style="background:var(--bg2,#f0f0f4);border-radius:18px 18px 18px 4px;padding:12px 16px;max-width:320px;font-size:14px;line-height:1.55;color:var(--text);box-shadow:0 1px 4px rgba(0,0,0,.08);">
          <span id="bs-sms-preview-text"></span>
        </div>
      </div>
      <div style="font-size:12px;color:var(--text-muted);margin-top:5px;padding-left:2px;">Delivered · just now</div>
    </div>
  </div>

  ${saveBtn('saveBookingSettings')}`;
}

function bsToggleMode() {
  const mode = document.querySelector('input[name="bs-mode"]:checked')?.value || 'full';
  const depositFields = document.getElementById('bs-deposit-fields');
  if (depositFields) depositFields.style.display = mode === 'deposit' ? 'block' : 'none';
  // Update border highlight
  document.querySelectorAll('input[name="bs-mode"]').forEach(function(r) {
    const card = r.closest('label');
    if (!card) return;
    if (r.checked) {
      card.style.borderColor = 'var(--primary)';
      card.style.background = 'var(--primary-bg,rgba(0,173,168,0.06))';
    } else {
      card.style.borderColor = 'var(--card-border)';
      card.style.background = 'var(--bg)';
    }
  });
}

function bsPreview() {
  const tmpl    = (document.getElementById('bs-sms-template')?.value || '').trim();
  const enabled = document.getElementById('bs-sms-enabled')?.checked !== false;
  const preview = document.getElementById('bs-sms-preview-text');
  if (!preview) return;

  if (!enabled) {
    preview.textContent = '(SMS disabled — customers will not receive a confirmation text)';
    preview.style.color = 'var(--text-muted)';
    return;
  }

  const biz  = (typeof window.SITE_DATA !== 'undefined' && window.SITE_DATA?.business?.name) || 'Beachside Circle Boats';
  const text = tmpl
    .replace(/\{customer_name\}/g,  'Alex')
    .replace(/\{service\}/g,        'Single Seater (AM)')
    .replace(/\{date\}/g,           'Sat Jun 21')
    .replace(/\{time\}/g,           '9:00 AM')
    .replace(/\{business_name\}/g,  biz);

  preview.textContent = text || '(enter template above)';
  preview.style.color = '';
}

function saveBookingSettings() {
  const mode = document.querySelector('input[name="bs-mode"]:checked')?.value || 'full';
  wcSave('booking_settings', {
    paymentMode:  mode,
    depositPct:   mode === 'deposit' ? num('bs-pct') || 25 : 0,
    depositLabel: val('bs-label'),
    buttonLabel:  val('bs-btnlabel'),
    smsEnabled:   document.getElementById('bs-sms-enabled')?.checked !== false,
    smsTemplate:  (document.getElementById('bs-sms-template')?.value || '').trim() || null
  });
}

// ─── How It Works ─────────────────────────────────────────────────────────────

function renderSteps() {
  const steps = _wc_data.steps || [];
  return `<h2 class="wc-title">How It Works</h2>
  ${wcAddBar('steps', 'Step')}
  ${steps.map((s,i) => `
    <div class="wc-card">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
        <span style="font-size:15px;font-weight:700;color:var(--primary);flex-shrink:0;">Step</span>
        <input type="number" id="st-num-${i}" value="${s.step||i+1}" min="1"
          style="width:44px;font-size:15px;font-weight:700;border:none;background:transparent;padding:2px 0;color:var(--primary);outline:none;text-align:center;border-bottom:1px dashed var(--card-border);"
          onfocus="this.style.borderBottomColor='var(--primary)'" onblur="this.style.borderBottomColor='var(--card-border)'">
        <span style="color:var(--text-muted);flex-shrink:0;">—</span>
        <input type="text" id="st-title-${i}" value="${esc(s.title)}" placeholder="Step title…"
          style="font-size:16px;font-weight:600;border:none;background:transparent;padding:2px 0;flex:1;color:inherit;outline:none;border-bottom:1px dashed var(--card-border);"
          onfocus="this.style.borderBottomColor='var(--primary)'" onblur="this.style.borderBottomColor='var(--card-border)'">
        ${wcDelBtn('steps', i)}
      </div>
      ${ta('Description','st-desc-'+i,s.description,2)}
      ${imgPickerHtml('st-img-'+i, s.image||'', 'Photo (optional)', 'steps')}
    </div>`).join('')}
  ${steps.length === 0 ? `<div style="text-align:center;padding:32px;color:var(--text-muted);border:2px dashed var(--card-border);border-radius:10px;">No steps yet — click "+ Add Step" above</div>` : ''}
  ${saveBtn('saveSteps')}`;
}
function saveSteps() {
  wcSave('steps', (_wc_data.steps||[]).map((s,i)=>({ step:num('st-num-'+i), title:val('st-title-'+i), description:val('st-desc-'+i), image:val('st-img-'+i)||'' })));
}

// ─── Why Circle Boats ─────────────────────────────────────────────────────────

function renderFeatures() {
  const feats = _wc_data.features || [];
  const sec = _wc_data.features_section || {};
  return `<h2 class="wc-title">Why Circle Boats</h2>
  <p style="color:var(--text-muted);font-size:13px;margin-bottom:16px;">This section is hidden on the website until at least one feature is added.</p>
  <div class="wc-card" style="margin-bottom:20px;">
    <h3 style="font-size:14px;font-weight:600;margin-bottom:12px;color:var(--text-muted);">Section Header</h3>
    ${fi('Section Title','ft-sec-title',sec.title,'text','A New Way to Experience the Gulf')}
    ${fi('Section Subtitle','ft-sec-sub',sec.subtitle,'text','Portable inflatable boats that combine fun, safety, and sustainability.')}
  </div>
  ${wcAddBar('features', 'Feature')}
  ${feats.map((f,i) => {
    const imgUrl = wcToUrl(f.image);
    return `<div class="wc-card">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:12px;">
        <input type="text" id="ft-title-${i}" value="${esc(f.title)}" placeholder="Feature title…"
          style="font-size:16px;font-weight:600;border:none;background:transparent;padding:2px 0;flex:1;color:inherit;outline:none;border-bottom:1px dashed var(--card-border);"
          onfocus="this.style.borderBottomColor='var(--primary)'" onblur="this.style.borderBottomColor='var(--card-border)'">
        ${wcDelBtn('features', i)}
      </div>
      <div class="form-row">${fi('Icon (optional)','ft-icon-'+i,f.icon,'text','⚡')}</div>
      ${ta('Description','ft-desc-'+i,f.description,2)}
      <div style="margin-top:10px;">
        <label style="font-size:12px;font-weight:600;color:var(--text-muted);display:block;margin-bottom:6px;">Photo (optional)</label>
        <div style="display:flex;align-items:center;gap:12px;">
          ${imgUrl ? `<img src="${esc(imgUrl)}" style="width:72px;height:72px;object-fit:cover;border-radius:8px;border:1px solid var(--card-border);" onerror="this.style.display='none'" id="ft-img-preview-${i}">` : `<div id="ft-img-preview-${i}" style="width:72px;height:72px;border-radius:8px;border:2px dashed var(--card-border);display:flex;align-items:center;justify-content:center;color:var(--text-dim);font-size:22px;">📷</div>`}
          <div style="display:flex;flex-direction:column;gap:6px;">
            <button type="button" class="btn btn-outline btn-sm" onclick="document.getElementById('ft-img-file-${i}').click()">Upload Photo</button>
            <input type="file" id="ft-img-file-${i}" accept="image/*" style="display:none" onchange="wcFeatureImageUpload(this,${i})">
            <button type="button" class="btn btn-outline btn-sm" onclick="wcOpenGalleryPickerForFeature(${i})" style="color:var(--primary);">📂 Pick from Gallery</button>
            ${f.image ? `<button type="button" class="btn btn-outline btn-sm" onclick="wcFeatureImageRemove(${i})" style="color:var(--danger);">Remove</button>` : ''}
          </div>
        </div>
      </div>
    </div>`;
  }).join('')}
  ${feats.length === 0 ? `<div style="text-align:center;padding:32px;color:var(--text-muted);border:2px dashed var(--card-border);border-radius:10px;">No features yet — click "+ Add Feature" above</div>` : ''}
  ${saveBtn('saveFeatures')}`;
}
function saveFeatures() {
  _wc_data.features_section = { title: val('ft-sec-title'), subtitle: val('ft-sec-sub') };
  const featuresArray = (_wc_data.features||[]).map((f,i)=>({
    icon: val('ft-icon-'+i),
    title: val('ft-title-'+i),
    description: val('ft-desc-'+i),
    image: f.image || ''
  }));
  wcSave('features', featuresArray);
  wcSaveSection('features', featuresArray);
  wcPush();
}
async function wcFeatureImageUpload(fileInput, index) {
  const file = fileInput.files[0];
  if (!file) return;
  const btn = fileInput.previousElementSibling;
  if (btn) btn.textContent = 'Uploading…';
  try {
    const url = await uploadToSupabase(file, 'feature');
    if (!url) throw new Error('Upload returned no URL');
    if (!_wc_data.features) _wc_data.features = [];
    if (!_wc_data.features[index]) _wc_data.features[index] = {};
    _wc_data.features[index].image = url;
    await wcPush();
    renderWCSection('features');
    toast('Photo uploaded ✓');
  } catch(e) {
    toast('Upload failed: ' + e.message, 'error');
    if (btn) btn.textContent = 'Upload Photo';
  }
  fileInput.value = '';
}
function wcFeatureImageRemove(index) {
  if (_wc_data.features && _wc_data.features[index]) {
    _wc_data.features[index].image = '';
    wcPush().then(() => renderWCSection('features'));
  }
}

// ─── Gallery Picker Modal ──────────────────────────────────────────────────────

var _wcGalleryPickTarget = null;

function wcOpenGalleryPicker(inputId) {
  _wcGalleryPickTarget = { type: 'input', id: inputId };
  wcShowGalleryPickerModal();
}

function wcOpenGalleryPickerForFeature(index) {
  _wcGalleryPickTarget = { type: 'feature', index: index };
  wcShowGalleryPickerModal();
}

function wcShowGalleryPickerModal() {
  var existing = document.getElementById('wc-gallery-picker-modal');
  if (existing) existing.remove();

  var photos = ((_wc_data && _wc_data.gallery) || []).map(function(r) {
    return typeof r === 'string' ? r : ((r || {}).url || '');
  }).filter(Boolean);

  var gridHtml = photos.length
    ? photos.map(function(url) {
        var safe = url.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        return '<div style="cursor:pointer;border-radius:8px;overflow:hidden;border:2px solid transparent;transition:border-color .15s;" ' +
          'onmouseover="this.style.borderColor=\'var(--primary)\'" onmouseout="this.style.borderColor=\'transparent\'" ' +
          'onclick="wcGalleryPickerSelect(\'' + safe + '\')">' +
          '<img src="' + safe + '" style="width:100%;aspect-ratio:1/1;object-fit:cover;display:block;" loading="lazy" onerror="this.parentElement.style.display=\'none\'">' +
          '</div>';
      }).join('')
    : '<p style="color:var(--text-muted);text-align:center;padding:32px;grid-column:1/-1;">No gallery photos yet — upload some in the Gallery section first.</p>';

  var modal = document.createElement('div');
  modal.id = 'wc-gallery-picker-modal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.72);display:flex;align-items:center;justify-content:center;padding:20px;';
  modal.innerHTML =
    '<div style="background:var(--card-bg,#1a1a2e);border-radius:14px;width:100%;max-width:720px;max-height:85vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.5);">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid var(--card-border);">' +
        '<h3 style="margin:0;font-size:16px;">📂 Pick from Gallery</h3>' +
        '<button onclick="document.getElementById(\'wc-gallery-picker-modal\').remove()" style="background:none;border:none;font-size:24px;cursor:pointer;color:var(--text-muted);line-height:1;padding:0;">&times;</button>' +
      '</div>' +
      '<div style="overflow-y:auto;padding:16px;">' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px;">' +
          gridHtml +
        '</div>' +
      '</div>' +
    '</div>';
  modal.addEventListener('click', function(e) { if (e.target === modal) modal.remove(); });
  document.body.appendChild(modal);
}

function wcGalleryPickerSelect(url) {
  var target = _wcGalleryPickTarget;
  var modal = document.getElementById('wc-gallery-picker-modal');
  if (modal) modal.remove();
  _wcGalleryPickTarget = null;
  if (!target || !url) return;

  if (target.type === 'input') {
    var input = document.getElementById(target.id);
    if (input) { input.value = url; wcRefreshPreview(target.id); }
    toast('Photo selected ✓');
  } else if (target.type === 'feature') {
    if (!_wc_data.features) _wc_data.features = [];
    if (!_wc_data.features[target.index]) _wc_data.features[target.index] = {};
    _wc_data.features[target.index].image = url;
    wcSaveSection('features', _wc_data.features);
    wcPush().then(function() { renderWCSection('features'); });
    toast('Photo selected ✓');
  }
}

// ─── Gallery ──────────────────────────────────────────────────────────────────

var _galDragSrc = null;
var _galActiveTab = -1; // -1 = All, 0+ = section index
var _galPageOffset = 0;  // pagination: how many photos to skip
const _galPageSize = 12; // show 12 at a time

function renderGallery() {
  const gallery = _wc_data.gallery || [];
  const sections = _wc_data.gallery_sections || [];
  const HOMEPAGE_COUNT = 12;

  // Clamp active tab if sections were deleted
  if (_galActiveTab >= sections.length) _galActiveTab = -1;

  // Tab bar
  const tabBar = `
    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:20px;">
      <button onclick="wcGalSetTab(-1)" style="padding:8px 18px;border-radius:20px;border:2px solid ${_galActiveTab === -1 ? 'var(--primary)' : 'var(--card-border)'};background:${_galActiveTab === -1 ? 'var(--primary)' : 'var(--card-bg)'};color:${_galActiveTab === -1 ? 'white' : 'var(--text)'};cursor:pointer;font-size:13px;font-weight:600;transition:all .15s;">
        All (${gallery.length})
      </button>
      ${sections.map((s, i) => `
        <div style="display:flex;align-items:center;border-radius:20px;border:2px solid ${_galActiveTab === i ? 'var(--primary)' : 'var(--card-border)'};overflow:hidden;background:${_galActiveTab === i ? 'var(--primary)' : 'var(--card-bg)'};">
          <button onclick="wcGalSetTab(${i})" style="padding:8px 14px;background:transparent;color:${_galActiveTab === i ? 'white' : 'var(--text)'};border:none;cursor:pointer;font-size:13px;font-weight:600;">
            ${esc(s.name)} (${(s.images||[]).length})
          </button>
          <button onclick="wcGalRenameTabPrompt(${i})" title="Rename tab" style="padding:8px 8px;background:transparent;color:${_galActiveTab === i ? 'rgba(255,255,255,0.75)' : 'var(--text-muted)'};border:none;border-left:1px solid ${_galActiveTab === i ? 'rgba(255,255,255,0.25)' : 'var(--card-border)'};cursor:pointer;font-size:11px;">✏️</button>
          <button onclick="wcDeleteGallerySection(${i})" title="Delete tab" style="padding:8px 8px;background:transparent;color:${_galActiveTab === i ? 'rgba(255,255,255,0.75)' : '#ef4444'};border:none;border-left:1px solid ${_galActiveTab === i ? 'rgba(255,255,255,0.25)' : 'var(--card-border)'};cursor:pointer;font-size:12px;">✕</button>
        </div>`).join('')}
      ${sections.length < 5
        ? `<button onclick="wcAddGallerySection()" style="padding:8px 16px;border-radius:20px;border:2px dashed var(--card-border);background:transparent;color:var(--text-muted);cursor:pointer;font-size:13px;">+ Add Tab</button>`
        : `<span style="font-size:12px;color:var(--text-muted);padding:4px 8px;">Max 5 tabs</span>`}
    </div>`;

  // Get photos for current tab
  let displayPhotos;
  if (_galActiveTab === -1) {
    displayPhotos = gallery.map((img, i) => ({ url: typeof img === 'string' ? img : img.url, globalIdx: i }));
  } else {
    const sec = sections[_galActiveTab];
    const sectionImages = sec ? (sec.images || []) : [];
    displayPhotos = sectionImages.map(url => {
      const globalIdx = gallery.findIndex(img => (typeof img === 'string' ? img : img.url) === url);
      return { url, globalIdx };
    }).filter(p => p.globalIdx !== -1);
  }

  const activeSecName = _galActiveTab >= 0 && sections[_galActiveTab] ? sections[_galActiveTab].name : null;
  const uploadLabel = activeSecName ? `+ Upload to "${activeSecName}"` : '+ Upload Photos';

  // Pagination: show _galPageSize at a time
  const pageEnd = Math.min(_galPageOffset + _galPageSize, displayPhotos.length);
  const currentPagePhotos = displayPhotos.slice(_galPageOffset, pageEnd);
  const hasMore = pageEnd < displayPhotos.length;
  const hasPrev = _galPageOffset > 0;

  const gridHtml = displayPhotos.length === 0
    ? `<div style="background:var(--bg);border:2px dashed var(--card-border);border-radius:12px;padding:48px;text-align:center;color:var(--text-muted);">${activeSecName ? `No photos in "${activeSecName}" yet. Upload photos above to add them here.` : 'No gallery photos yet. Upload your first photo above.'}</div>`
    : `<div id="galGrid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;">
        ${currentPagePhotos.map(({url, globalIdx}) => {
          const full = wcToUrl(url);
          const isHomepage = _galActiveTab === -1 && globalIdx < HOMEPAGE_COUNT;
          const assignedIdx = sections.findIndex(s => (s.images||[]).includes(url));
          const sectionSelector = _galActiveTab === -1 && sections.length > 0 ? `
            <select onchange="wcGalAssignSection(${globalIdx},this.value)" onclick="event.stopPropagation()"
              style="position:absolute;bottom:4px;left:4px;right:28px;font-size:10px;padding:2px 4px;border-radius:4px;background:rgba(0,0,0,0.7);color:white;border:none;cursor:pointer;max-width:calc(100% - 32px);">
              <option value="-1">${assignedIdx >= 0 ? esc(sections[assignedIdx].name) : '+ Add to tab'}</option>
              ${sections.map((s,si) => si !== assignedIdx ? `<option value="${si}">${esc(s.name)}</option>` : '').join('')}
              ${assignedIdx >= 0 ? `<option value="-1">✕ Remove from tab</option>` : ''}
            </select>` : '';
          const borderColor = isHomepage ? 'var(--primary)' : (assignedIdx >= 0 ? '#8b5cf6' : 'var(--card-border)');
          return `<div draggable="true" data-gal-index="${globalIdx}"
            ondragstart="wcGalDragStart(event,${globalIdx})"
            ondragover="wcGalDragOver(event)"
            ondrop="wcGalDrop(event,${globalIdx})"
            ondragend="wcGalDragEnd(event)"
            ontouchstart="wcGalTouchStart(event,${globalIdx})"
            ontouchmove="wcGalTouchMove(event)"
            ontouchend="wcGalTouchEnd(event,${globalIdx})"
            style="position:relative;aspect-ratio:1;border-radius:8px;overflow:hidden;border:2px solid ${borderColor};cursor:grab;touch-action:none;">
            <img src="${esc(full)}" style="width:100%;height:100%;object-fit:cover;" onerror="this.parentElement.style.background='#f1f5f9'">
            ${isHomepage ? `<div style="position:absolute;top:4px;left:4px;background:var(--primary);color:white;font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;">HOME</div>` : ''}
            ${_galActiveTab === -1 && !isHomepage && assignedIdx >= 0 ? `<div style="position:absolute;top:4px;left:4px;background:#8b5cf6;color:white;font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;max-width:80%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(sections[assignedIdx].name)}</div>` : ''}
            ${_galActiveTab >= 0 ? `<div style="position:absolute;top:4px;left:4px;background:#8b5cf6;color:white;font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;">${esc(activeSecName)}</div>` : ''}
            <div style="position:absolute;top:4px;right:4px;display:flex;gap:3px;">
              <div style="background:rgba(0,0,0,0.5);color:white;font-size:10px;padding:2px 5px;border-radius:3px;">${globalIdx+1}</div>
              <button onclick="wcGalleryRemove(${globalIdx})" title="Remove photo"
                style="background:rgba(0,0,0,0.65);color:white;border:none;border-radius:50%;width:20px;height:20px;cursor:pointer;font-size:11px;line-height:1;padding:0;">✕</button>
            </div>
            ${sectionSelector}
          </div>`;
        }).join('')}
      </div>
      ${displayPhotos.length > _galPageSize ? `<div style="display:flex;align-items:center;justify-content:center;gap:10px;margin-top:20px;padding:16px;background:var(--bg);border-radius:8px;">
        <button class="btn btn-outline btn-sm" onclick="wcGalPrevPage()" ${!hasPrev ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : ''}>← Previous</button>
        <span style="font-size:13px;color:var(--text-muted);">Showing ${_galPageOffset + 1}–${pageEnd} of ${displayPhotos.length}</span>
        <button class="btn btn-outline btn-sm" onclick="wcGalNextPage()" ${!hasMore ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : ''}>Next →</button>
      </div>` : ''}
      ${_galActiveTab === -1 && sections.length > 0 ? `<p style="margin-top:10px;font-size:12px;color:var(--text-muted);">🔵 Blue border = on home page &nbsp;|&nbsp; 🟣 Purple border = assigned to a tab</p>` : ''}`;

  return `<h2 class="wc-title">Gallery</h2>
  <p style="color:var(--text-muted);margin-bottom:16px;font-size:14px;">Upload photos for your website gallery. <strong>Drag to reorder</strong> — the first 12 appear on your home page.</p>
  ${tabBar}
  <div style="margin-bottom:20px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
    <button type="button" class="btn btn-primary" onclick="document.getElementById('gal-upload-file').click()">${uploadLabel}</button>
    <input type="file" id="gal-upload-file" accept="image/*" multiple style="display:none" onchange="wcGalleryAdd(this)">
    <button type="button" class="btn btn-outline btn-sm" onclick="wcGalRemoveDuplicates()" title="Remove duplicate photos from gallery">🧹 Remove Duplicates</button>
    <span id="gal-upload-status" style="margin-left:4px;font-size:13px;color:var(--text-muted);"></span>
  </div>
  ${gridHtml}
  ${saveBtn('wcGalManualSave')}`;
}

function wcGalRenameTabPrompt(i) {
  const sections = _wc_data.gallery_sections || [];
  if (!sections[i]) return;
  const name = prompt('Rename tab:', sections[i].name);
  if (name && name.trim()) wcRenameGallerySection(i, name.trim());
}

function wcAddGallerySection() {
  if (!_wc_data.gallery_sections) _wc_data.gallery_sections = [];
  if (_wc_data.gallery_sections.length >= 5) return;
  _wc_data.gallery_sections.push({ id: 'sec_' + Date.now(), name: 'New Tab', images: [] });
  _galActiveTab = _wc_data.gallery_sections.length - 1;
  wcPush().then(() => renderWCSection('gallery'));
}

function wcDeleteGallerySection(i) {
  if (!_wc_data.gallery_sections) return;
  const name = _wc_data.gallery_sections[i] ? _wc_data.gallery_sections[i].name : 'this tab';
  if (!confirm(`Delete "${name}"? Photos will stay in All.`)) return;
  _wc_data.gallery_sections.splice(i, 1);
  if (_galActiveTab >= _wc_data.gallery_sections.length) _galActiveTab = -1;
  wcPush().then(() => renderWCSection('gallery'));
}

function wcRenameGallerySection(i, name) {
  if (!_wc_data.gallery_sections || !_wc_data.gallery_sections[i]) return;
  _wc_data.gallery_sections[i].name = name;
  wcPush();
}

function wcGalAssignSection(imgIdx, sectionIdx) {
  const gallery = _wc_data.gallery || [];
  const sections = _wc_data.gallery_sections || [];
  const url = typeof gallery[imgIdx] === 'string' ? gallery[imgIdx] : (gallery[imgIdx] || {}).url;
  if (!url) return;
  // Remove from all sections first
  sections.forEach(s => { if (s.images) s.images = s.images.filter(u => u !== url); });
  // Add to new section if valid
  const si = parseInt(sectionIdx);
  if (si >= 0 && sections[si]) {
    if (!sections[si].images) sections[si].images = [];
    sections[si].images.push(url);
  }
  wcPush().then(() => renderWCSection('gallery'));
}

function wcGalDragStart(e, i) {
  _galDragSrc = i;
  e.dataTransfer.effectAllowed = 'move';
  e.currentTarget.style.opacity = '0.4';
}

function wcGalDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
}

function wcGalDrop(e, i) {
  e.preventDefault();
  if (_galDragSrc === null || _galDragSrc === i) return;
  const gallery = _wc_data.gallery;
  const moved = gallery.splice(_galDragSrc, 1)[0];
  gallery.splice(i, 0, moved);
  wcPush().then(() => renderWCSection('gallery'));
}

function wcGalDragEnd(e) {
  _galDragSrc = null;
  e.currentTarget.style.opacity = '';
}

// ── Touch drag support (mobile) ──
var _galTouchSrc = null;
var _galTouchSrcEl = null;

function wcGalTouchStart(e, i) {
  _galTouchSrc = i;
  _galTouchSrcEl = e.currentTarget;
  _galTouchSrcEl.style.opacity = '0.4';
}

function wcGalTouchMove(e) {
  if (_galTouchSrc === null) return;
  e.preventDefault(); // stop page scroll while dragging
}

function wcGalTouchEnd(e, i) {
  if (_galTouchSrc === null) return;
  if (_galTouchSrcEl) _galTouchSrcEl.style.opacity = '';
  if (_galTouchSrc !== i) {
    const gallery = _wc_data.gallery;
    const moved = gallery.splice(_galTouchSrc, 1)[0];
    gallery.splice(i, 0, moved);
    wcPush().then(() => renderWCSection('gallery'));
  }
  _galTouchSrc = null;
  _galTouchSrcEl = null;
}

// SHA-256 of file bytes — exact same file = same hash, regardless of filename
async function wcFileHash(file) {
  try {
    const buf = await file.arrayBuffer();
    const hashBuf = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2,'0')).join('');
  } catch(e) { return null; }
}

// SHA-256 of image at a URL (for checking existing gallery images)
async function wcUrlHash(url) {
  try {
    const resp = await fetch(url);
    const buf = await resp.arrayBuffer();
    const hashBuf = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2,'0')).join('');
  } catch(e) { return null; }
}

async function wcGalleryAdd(fileInput) {
  const files = Array.from(fileInput.files);
  if (!files.length) return;
  const btn = fileInput.previousElementSibling;
  const status = document.getElementById('gal-upload-status');
  if (!_wc_data.gallery) _wc_data.gallery = [];
  if (!_wc_data.gallery_hashes) _wc_data.gallery_hashes = {};
  let uploaded = 0, failed = 0, skipped = 0;
  const newUrls = [];
  const storedHashes = Object.values(_wc_data.gallery_hashes).filter(Boolean);
  // Build set of existing base filenames for fast lookup
  const existingNames = new Set((_wc_data.gallery || []).map(function(u) {
    return wcGalBaseName(typeof u === 'string' ? u : (u || {}).url || '');
  }));
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    // Primary check: filename match (no CORS needed, works for all existing photos)
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').toLowerCase();
    if (existingNames.has(safeName)) {
      if (status) status.textContent = `"${file.name}" already in gallery — skipped`;
      skipped++;
      continue;
    }
    // Secondary check: SHA-256 hash (catches renamed duplicates)
    if (status) status.textContent = `Checking ${file.name}…`;
    const fileHash = await wcFileHash(file);
    if (fileHash && storedHashes.includes(fileHash)) {
      if (status) status.textContent = `"${file.name}" already in gallery — skipped`;
      skipped++;
      continue;
    }
    if (btn) btn.textContent = `Uploading ${i+1} of ${files.length}…`;
    if (status) status.textContent = file.name;
    try {
      const url = await uploadToSupabase(file, 'gallery');
      if (url) {
        _wc_data.gallery.push(url);
        if (fileHash) { _wc_data.gallery_hashes[url] = fileHash; storedHashes.push(fileHash); }
        newUrls.push(url);
        uploaded++;
      } else failed++;
    } catch(e) { failed++; }
  }
  // Auto-assign to active tab when uploading from a section tab
  if (_galActiveTab >= 0 && newUrls.length) {
    const sections = _wc_data.gallery_sections || [];
    if (sections[_galActiveTab]) {
      if (!sections[_galActiveTab].images) sections[_galActiveTab].images = [];
      sections[_galActiveTab].images.push(...newUrls);
    }
  }
  await wcPush();
  renderWCSection('gallery');
  const activeSecName = _galActiveTab >= 0 && _wc_data.gallery_sections && _wc_data.gallery_sections[_galActiveTab] ? _wc_data.gallery_sections[_galActiveTab].name : null;
  if (btn) btn.textContent = activeSecName ? `+ Upload to "${activeSecName}"` : '+ Upload Photos';
  if (status) status.textContent = '';
  const msg = uploaded > 0 ? `${uploaded} photo${uploaded!==1?'s':''} added ✓` : '';
  const skipMsg = skipped > 0 ? `${skipped} duplicate${skipped!==1?'s':''} skipped` : '';
  const failMsg = failed > 0 ? `${failed} failed` : '';
  toast([msg, skipMsg, failMsg].filter(Boolean).join(' · ') || 'No new photos added');
  fileInput.value = '';
}

async function wcGalleryRemove(i) {
  if (!_wc_data.gallery) return;
  if (!confirm('Remove this photo from your gallery?\n\nThe photo will stay on any website sections (dock, about, etc.) where it\'s already used.')) return;
  const raw = _wc_data.gallery[i];
  const urlToRemove = typeof raw === 'string' ? raw : (raw || {}).url;

  // Remove from main gallery array and gallery tabs only
  _wc_data.gallery.splice(i, 1);
  if (_wc_data.gallery_sections && Array.isArray(_wc_data.gallery_sections)) {
    _wc_data.gallery_sections.forEach(function(section) {
      if (section.images && Array.isArray(section.images)) {
        section.images = section.images.filter(function(url) { return url !== urlToRemove; });
      }
    });
  }

  // Delete from media table so server doesn't re-add it to gallery on next load.
  // NOTE: We intentionally do NOT delete the file from Supabase Storage so any
  // section (dock, about, fleet, etc.) that uses this URL continues to load.
  if (urlToRemove && supabase) {
    try {
      await supabase.from('media').delete().eq('url', urlToRemove);
    } catch(e) {
      console.warn('Media table delete error:', e);
    }
  }

  await wcPush();
  renderWCSection('gallery');
}

function wcGalNextPage() {
  _galPageOffset += _galPageSize;
  renderWCSection('gallery');
}

function wcGalPrevPage() {
  _galPageOffset = Math.max(0, _galPageOffset - _galPageSize);
  renderWCSection('gallery');
}

function wcGalManualSave() { wcPush(); }

// Extract the base filename from a Supabase storage URL (strips the timestamp prefix)
// Path format: {siteId}/gallery/{13-digit-timestamp}-{originalName}
function wcGalBaseName(url) {
  const filename = (url || '').split('/').pop().split('?')[0];
  return filename.replace(/^\d{13}-/, '').toLowerCase();
}

async function wcGalRemoveDuplicates() {
  if (!_wc_data.gallery || !_wc_data.gallery.length) return;
  const status = document.getElementById('gal-upload-status');
  if (status) status.textContent = 'Scanning for duplicates…';

  const gallery = _wc_data.gallery;

  // Deduplicate by base filename (strips timestamp → same photo uploaded N times = same name)
  // Also deduplicates exact URL matches as a secondary check
  const seenNames = new Set();
  const seenUrls = new Set();
  const dupeUrls = [];

  _wc_data.gallery = gallery.filter(function(item) {
    const url = typeof item === 'string' ? item : (item || {}).url || '';
    if (!url) return false;
    const name = wcGalBaseName(url);
    if (seenUrls.has(url) || seenNames.has(name)) {
      dupeUrls.push(url);
      return false;
    }
    seenUrls.add(url);
    seenNames.add(name);
    return true;
  });

  // Clean sections — remove any URLs that were dupes
  const dupeSet = new Set(dupeUrls);
  if (_wc_data.gallery_sections) {
    _wc_data.gallery_sections.forEach(function(sec) {
      if (sec.images) sec.images = sec.images.filter(function(u) { return !dupeSet.has(u); });
    });
  }

  // Delete dupe media records from Supabase so server can't re-add them
  if (dupeUrls.length && supabase) {
    if (status) status.textContent = `Removing ${dupeUrls.length} duplicate${dupeUrls.length!==1?'s':''}…`;
    for (const url of dupeUrls) {
      try {
        await supabase.from('media').delete().eq('url', url);
        const pathMatch = url.split('/storage/v1/object/public/media/');
        if (pathMatch[1]) await supabase.storage.from('media').remove([decodeURIComponent(pathMatch[1])]);
      } catch(e) {}
    }
  }

  if (status) status.textContent = '';
  const removed = dupeUrls.length;
  if (removed === 0) { toast('No duplicates found ✓'); return; }
  await wcPush();
  renderWCSection('gallery');
  toast(`Removed ${removed} duplicate photo${removed !== 1 ? 's' : ''} ✓`);
}

// Override wcGalSetTab to reset pagination when switching tabs
function wcGalSetTab(idx) {
  _galActiveTab = idx;
  _galPageOffset = 0;
  renderWCSection('gallery');
}

// ─── Reviews ──────────────────────────────────────────────────────────────────

function renderReviews() {
  const d = _wc_data.reviews || {};
  const items = d.items || [];
  return `<h2 class="wc-title">Reviews</h2>
  <div class="form-row">${fi('Overall Rating','rv-rating',d.rating,'number','5.0')}${fi('Source label','rv-source',d.source,'text','Google Reviews')}</div>
  <div style="display:flex;justify-content:space-between;align-items:center;margin:20px 0 12px;">
    <h3 style="margin:0;font-size:15px;font-weight:600;">Reviews (${items.length})</h3>
    <button class="btn btn-outline btn-sm" onclick="wcAddItem('reviews')">+ Add Review</button>
  </div>
  ${items.map((r,i) => `
    <div class="wc-card">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:12px;">
        <input type="text" id="rv-name-${i}" value="${esc(r.name||'')}" placeholder="Reviewer name…"
          style="font-size:15px;font-weight:600;border:none;background:transparent;padding:2px 0;flex:1;color:inherit;outline:none;border-bottom:1px dashed var(--card-border);"
          onfocus="this.style.borderBottomColor='var(--primary)'" onblur="this.style.borderBottomColor='var(--card-border)'">
        ${wcDelBtn('reviews', i)}
      </div>
      <div class="form-row">
        ${fi('Initial (avatar letter)','rv-init-'+i,r.initial,'text','M')}
        ${fi('Time ago','rv-time-'+i,r.timeAgo,'text','2 weeks ago')}
        ${fi('Stars (1-5)','rv-stars-'+i,r.stars,'number')}
      </div>
      ${ta('Review Text','rv-text-'+i,r.text,3)}
    </div>`).join('')}
  ${items.length === 0 ? `<div style="text-align:center;padding:32px;color:var(--text-muted);border:2px dashed var(--card-border);border-radius:10px;">No reviews yet — click "+ Add Review" above</div>` : ''}
  ${saveBtn('saveReviews')}`;
}
function saveReviews() {
  _wc_data.reviews = {
    rating:num('rv-rating'), source:val('rv-source'),
    items:(_wc_data.reviews?.items||[]).map((_,i)=>({ name:val('rv-name-'+i), initial:val('rv-init-'+i), timeAgo:val('rv-time-'+i), stars:num('rv-stars-'+i), text:val('rv-text-'+i) }))
  };
  wcPush();
}

// ─── Q&A / FAQ ───────────────────────────────────────────────────────────────

function renderQnA() {
  const items = _wc_data.qna || [];
  return `<h2 class="wc-title">Q&A / FAQ</h2>
  <p style="color:var(--text-muted);margin-bottom:20px;font-size:14px;">Add frequently asked questions. These appear in an expandable accordion on your website.</p>
  ${wcAddBar('qna', 'Question')}
  ${items.map((q,i) => `
    <div class="wc-card">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:12px;">
        <span style="flex-shrink:0;font-size:16px;">❓</span>
        <input type="text" id="qa-q-${i}" value="${esc(q.question)}" placeholder="Question…"
          style="font-size:15px;font-weight:600;border:none;background:transparent;padding:2px 0;flex:1;color:inherit;outline:none;border-bottom:1px dashed var(--card-border);"
          onfocus="this.style.borderBottomColor='var(--primary)'" onblur="this.style.borderBottomColor='var(--card-border)'">
        ${wcDelBtn('qna', i)}
      </div>
      ${ta('Answer','qa-a-'+i,q.answer,3)}
    </div>`).join('')}
  ${items.length === 0 ? `<div style="text-align:center;padding:32px;color:var(--text-muted);border:2px dashed var(--card-border);border-radius:10px;">No questions yet — click "+ Add Question" above</div>` : ''}
  ${saveBtn('saveQnA')}`;
}
function saveQnA() {
  const items = (_wc_data.qna||[]).map((_,i) => ({
    question: val('qa-q-'+i),
    answer: val('qa-a-'+i)
  }));
  wcSave('qna', items);
}

// ─── Promotions ───────────────────────────────────────────────────────────────

function renderPromotions() {
  const d = _wc_data.promotions || {};
  const items = d.items || [];
  return `<h2 class="wc-title">Promotions</h2>
  <p style="color:var(--text-muted);font-size:13px;margin-bottom:20px;">Promotional banners shown on the website and booking flow (e.g. "Rent 4+ boats = FREE dock!").</p>

  <div style="background:var(--bg);border:1px solid var(--card-border);border-radius:10px;padding:16px;margin-bottom:16px;">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
      <div style="font-size:13px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;">Active Promotions</div>
      <button class="btn btn-outline btn-sm" onclick="promoAddItem()">+ Add Promo</button>
    </div>
    <div id="promo-items-list">
      ${items.length === 0
        ? `<div style="text-align:center;padding:24px;color:var(--text-dim);border:2px dashed var(--card-border);border-radius:8px;font-size:13px;">No promotions yet — click "+ Add Promo"</div>`
        : items.map((p, i) => promoItemCard(p, i)).join('')}
    </div>
  </div>
  ${saveBtn('savePromotions')}`;
}

function promoItemCard(p, i) {
  return `<div style="background:var(--card-bg);border:1px solid var(--card-border);border-radius:8px;padding:14px;margin-bottom:10px;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
      <span style="font-size:12px;font-weight:600;color:var(--text-muted);text-transform:uppercase;">Promo ${i+1}</span>
      <button class="btn btn-outline btn-sm" style="color:#ef4444;border-color:#ef4444;" onclick="promoRemoveItem(${i})">Remove</button>
    </div>
    ${fi('Headline','promo-title-'+i, p.title, 'text', 'Rent 4+ boats and get a FREE dock for the day!')}
    ${fi('Subtext','promo-sub-'+i, p.subtitle, 'text', 'Any dock type. Automatically applied at checkout.')}
    ${fi('Min Boats (threshold — 0 = always show)','promo-threshold-'+i, p.threshold ?? '', 'number', '0')}
    <label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer;margin-top:8px;">
      <input type="checkbox" id="promo-enabled-${i}" ${p.enabled !== false ? 'checked' : ''}>
      <span>Enabled (show on site)</span>
    </label>
  </div>`;
}

function promoAddItem() {
  const d = _wc_data.promotions || {};
  const items = d.items || [];
  items.push({ title: '', subtitle: '', threshold: 0, enabled: true });
  _wc_data.promotions = { ...d, items };
  wcRenderSection('promotions');
}

function promoRemoveItem(i) {
  const d = _wc_data.promotions || {};
  const items = d.items || [];
  items.splice(i, 1);
  _wc_data.promotions = { ...d, items };
  wcRenderSection('promotions');
}

function savePromotions() {
  const d = _wc_data.promotions || {};
  const items = (d.items || []).map((_, i) => ({
    title:     val('promo-title-' + i),
    subtitle:  val('promo-sub-' + i),
    threshold: parseInt(document.getElementById('promo-threshold-' + i)?.value || '0') || 0,
    enabled:   document.getElementById('promo-enabled-' + i)?.checked !== false
  }));
  wcSave('promotions', { items });
}

// ─── CTA Banner ───────────────────────────────────────────────────────────────

function renderCta() {
  const d = _wc_data.cta || {};
  return `<h2 class="wc-title">CTA Banner</h2>
  <p style="color:var(--text-muted);font-size:13px;margin-bottom:20px;">The call-to-action strip that appears below the Q&amp;A section.</p>
  ${fi('Heading','cta-title', d.title, 'text', 'Ready to Get on the Water?')}
  ${fi('Subtitle','cta-sub', d.subtitle, 'text', 'Book your circle boat today and experience the Gulf Coast like never before.')}
  ${fi('Button Text','cta-btn', d.btnText, 'text', 'Book Your Boat')}
  ${fi('Button URL','cta-url', d.btnUrl, 'text', 'booking.html')}
  ${saveBtn('saveCta')}`;
}
function saveCta() {
  wcSave('cta', {
    title:   val('cta-title'),
    subtitle: val('cta-sub'),
    btnText: val('cta-btn'),
    btnUrl:  val('cta-url')
  });
}

// ─── Contact ──────────────────────────────────────────────────────────────────

function renderContact() {
  const d = _wc_data.contact || {};
  const fields = d.customFields || [];
  return `<h2 class="wc-title">Contact Form</h2>

  <div style="background:var(--bg);border:1px solid var(--card-border);border-radius:10px;padding:16px;margin-bottom:16px;">
    <div style="font-size:13px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:12px;">Section Text</div>
    ${fi('Section Heading','ct-heading',d.heading,'text','Book or Ask a Question')}
    ${fi('Section Subtitle','ct-subtitle',d.subtitle,'text','Send us a message or call. We respond fast.')}
  </div>

  <div style="background:var(--bg);border:1px solid var(--card-border);border-radius:10px;padding:16px;margin-bottom:16px;">
    <div style="font-size:13px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:12px;">Form Labels</div>
    ${fi('Form Title (above fields)','ct-title',d.formTitle,'text','Send a Message')}
    ${fi('Submit Button Text','ct-submit',d.submitLabel,'text','Send Message')}
  </div>

  <div style="background:var(--bg);border:1px solid var(--card-border);border-radius:10px;padding:16px;margin-bottom:16px;">
    <div style="font-size:13px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">"Interested In" Dropdown</div>
    <p style="font-size:12px;color:var(--text-dim);margin-bottom:10px;">One option per line. If empty, options auto-build from your fleet prices.</p>
    <textarea id="ct-int" rows="8" style="width:100%;padding:10px 14px;background:var(--card-bg);border:1px solid var(--card-border);border-radius:8px;color:var(--text);font-size:13px;resize:vertical;">${esc((d.interests||[]).join('\n'))}</textarea>
  </div>

  <div style="background:var(--bg);border:1px solid var(--card-border);border-radius:10px;padding:16px;margin-bottom:16px;">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
      <div>
        <div style="font-size:13px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;">Custom Questions</div>
        <p style="font-size:12px;color:var(--text-dim);margin:4px 0 0;">Extra fields shown on the contact form above the Message box.</p>
      </div>
      <button class="btn btn-outline btn-sm" onclick="ctAddField()">+ Add Question</button>
    </div>
    <div id="ct-fields-list">
      ${fields.length === 0
        ? `<div style="text-align:center;padding:24px;color:var(--text-dim);border:2px dashed var(--card-border);border-radius:8px;font-size:13px;">No custom questions yet — click "+ Add Question"</div>`
        : fields.map((f,i) => ctFieldCard(f,i)).join('')}
    </div>
  </div>

  ${saveBtn('saveContact')}`;
}

function ctFieldCard(f, i) {
  const typeOpts = ['text','email','tel','number','textarea','select','checkbox'].map(t =>
    `<option value="${t}"${f.type===t?' selected':''}>${t}</option>`).join('');
  return `<div id="ct-field-${i}" style="border:1px solid var(--card-border);border-radius:8px;padding:14px;margin-bottom:10px;background:var(--card-bg);">
    <div style="display:flex;gap:10px;align-items:flex-start;margin-bottom:10px;">
      <div style="flex:1;">
        <label style="font-size:12px;font-weight:600;color:var(--text-muted);display:block;margin-bottom:4px;">Question Label</label>
        <input type="text" id="ct-fl-${i}" value="${esc(f.label||'')}" placeholder="e.g. Preferred Date" style="width:100%;padding:8px 12px;background:var(--bg);border:1px solid var(--card-border);border-radius:6px;color:var(--text);font-size:13px;box-sizing:border-box;">
      </div>
      <div style="width:120px;">
        <label style="font-size:12px;font-weight:600;color:var(--text-muted);display:block;margin-bottom:4px;">Type</label>
        <select id="ct-ft-${i}" onchange="ctToggleOptions(${i})" style="width:100%;padding:8px 10px;background:var(--bg);border:1px solid var(--card-border);border-radius:6px;color:var(--text);font-size:13px;">${typeOpts}</select>
      </div>
      <div style="padding-top:20px;">
        <label style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text-muted);cursor:pointer;white-space:nowrap;">
          <input type="checkbox" id="ct-fr-${i}"${f.required?' checked':''} style="width:14px;height:14px;"> Required
        </label>
      </div>
      <button onclick="ctRemoveField(${i})" style="margin-top:18px;background:none;border:none;cursor:pointer;color:var(--danger);font-size:18px;line-height:1;padding:2px 4px;" title="Remove">&#10005;</button>
    </div>
    <div>
      <label style="font-size:12px;font-weight:600;color:var(--text-muted);display:block;margin-bottom:4px;">Placeholder Text</label>
      <input type="text" id="ct-fp-${i}" value="${esc(f.placeholder||'')}" placeholder="Optional hint shown inside the field" style="width:100%;padding:8px 12px;background:var(--bg);border:1px solid var(--card-border);border-radius:6px;color:var(--text);font-size:13px;box-sizing:border-box;">
    </div>
    <div id="ct-fopts-${i}" style="${f.type==='select'?'':'display:none;'}margin-top:10px;">
      <label style="font-size:12px;font-weight:600;color:var(--text-muted);display:block;margin-bottom:4px;">Dropdown Options (one per line)</label>
      <textarea id="ct-fo-${i}" rows="4" style="width:100%;padding:8px 12px;background:var(--bg);border:1px solid var(--card-border);border-radius:6px;color:var(--text);font-size:13px;resize:vertical;">${esc((f.options||[]).join('\n'))}</textarea>
    </div>
  </div>`;
}

function ctToggleOptions(i) {
  var sel = document.getElementById('ct-ft-' + i);
  var opts = document.getElementById('ct-fopts-' + i);
  if (opts) opts.style.display = sel && sel.value === 'select' ? '' : 'none';
}

function ctAddField() {
  if (!_wc_data.contact) _wc_data.contact = {};
  if (!_wc_data.contact.customFields) _wc_data.contact.customFields = [];
  _wc_data.contact.customFields.push({ id: 'cf' + Date.now(), label: '', type: 'text', required: false, placeholder: '', options: [] });
  renderWCSection('contact');
}

function ctRemoveField(i) {
  if (_wc_data.contact && _wc_data.contact.customFields) {
    _wc_data.contact.customFields.splice(i, 1);
    renderWCSection('contact');
  }
}

function saveContact() {
  const fields = (_wc_data.contact && _wc_data.contact.customFields || []).map(function(f, i) {
    return {
      id: f.id || ('cf' + i),
      label: val('ct-fl-' + i),
      type: val('ct-ft-' + i) || 'text',
      required: document.getElementById('ct-fr-' + i) ? document.getElementById('ct-fr-' + i).checked : false,
      placeholder: val('ct-fp-' + i),
      options: (document.getElementById('ct-fo-' + i) ? document.getElementById('ct-fo-' + i).value : '')
        .split('\n').map(function(s) { return s.trim(); }).filter(Boolean)
    };
  });
  wcSave('contact', {
    heading: val('ct-heading'),
    subtitle: val('ct-subtitle'),
    formTitle: val('ct-title'),
    submitLabel: val('ct-submit'),
    interests: val('ct-int').split('\n').map(function(s) { return s.trim(); }).filter(Boolean),
    customFields: fields
  });
}

// ─── Bio Links Page ───────────────────────────────────────────────────────────

function renderLinksPage() {
  const lp = _wc_data.links_page || {};
  const links = lp.links || [];
  const shareUrl = WC_SITE_BASE + '/links.html';
  return `<h2 class="wc-title">Bio Links Page</h2>
  <p style="color:var(--text-muted);margin-bottom:16px;font-size:14px;">
    This is your shareable Linktree-style page. Choose which sections appear as buttons, and add any custom links (website, booking tool, etc.).
    <br><strong style="color:var(--text);">Share URL:</strong>
    <a href="${shareUrl}" target="_blank" style="color:var(--primary);">${shareUrl}</a>
  </p>
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
    <h3 style="margin:0;font-size:15px;font-weight:600;">Links (${links.length})</h3>
    <button class="btn btn-outline btn-sm" onclick="lpAddLink()">+ Add Custom Link</button>
  </div>
  ${links.map((l,i) => `
    <div class="wc-card" style="display:flex;align-items:center;gap:12px;padding:14px 16px;">
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer;flex-shrink:0;">
        <input type="checkbox" id="lp-en-${i}" ${l.enabled ? 'checked' : ''} onchange="lpToggleEnabled(${i})">
        <span style="font-size:18px;">${esc(l.icon||'🔗')}</span>
      </label>
      <div style="flex:1;min-width:0;">
        <input type="text" id="lp-label-${i}" value="${esc(l.label)}"
          style="width:100%;font-size:13px;font-weight:600;margin-bottom:4px;"
          placeholder="Button label">
        <input type="text" id="lp-sub-${i}" value="${esc(l.sub||'')}"
          style="width:100%;font-size:12px;color:var(--text-muted);"
          placeholder="Subtitle (optional)">
        ${l.id === 'website' || l.url ? `<input type="text" id="lp-url-${i}" value="${esc(l.url||'')}" style="width:100%;font-size:12px;margin-top:4px;" placeholder="URL">` : ''}
      </div>
      <input type="text" id="lp-icon-${i}" value="${esc(l.icon||'')}"
        style="width:44px;font-size:18px;text-align:center;flex-shrink:0;" placeholder="🔗">
      ${l.id && !['booking','fleet','gallery','reviews','about','website'].includes(l.id)
        ? `<button class="btn btn-sm" onclick="lpDeleteLink(${i})" style="color:var(--danger,#ef4444);border-color:var(--danger,#ef4444);flex-shrink:0;">✕</button>` : ''}
    </div>`).join('')}
  ${saveBtn('saveLinksPage')}`;
}

function lpToggleEnabled(i) {
  if (!_wc_data.links_page) _wc_data.links_page = { links: [] };
  if (_wc_data.links_page.links[i]) {
    _wc_data.links_page.links[i].enabled = document.getElementById('lp-en-' + i).checked;
  }
}

function lpAddLink() {
  if (!_wc_data.links_page) _wc_data.links_page = { links: [] };
  if (!_wc_data.links_page.links) _wc_data.links_page.links = [];
  _wc_data.links_page.links.push({ id: 'custom_' + Date.now(), enabled: true, icon: '🔗', label: 'New Link', sub: '', url: '' });
  renderWCSection('links_page');
}

function lpDeleteLink(i) {
  if (!_wc_data.links_page?.links) return;
  _wc_data.links_page.links.splice(i, 1);
  renderWCSection('links_page');
}

function saveLinksPage() {
  if (!_wc_data.links_page) _wc_data.links_page = {};
  const links = (_wc_data.links_page.links||[]).map((l, i) => ({
    id: l.id,
    enabled: document.getElementById('lp-en-' + i)?.checked ?? l.enabled,
    icon: val('lp-icon-' + i) || l.icon,
    label: val('lp-label-' + i),
    sub: val('lp-sub-' + i),
    url: val('lp-url-' + i) || l.url || ''
  }));
  _wc_data.links_page.links = links;
  wcSave('links_page', _wc_data.links_page);
}

// ─── Launch Locations ─────────────────────────────────────────────────────────

function renderLocations() {
  const locs = _wc_data.locations || [];
  return `<h2 class="wc-title">Launch Locations</h2>
  <p style="color:var(--text-muted);margin-bottom:20px;font-size:14px;">Manage where customers can launch from. These appear on your website and in the booking flow — customers must choose a location to complete their booking.</p>
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
    <h3 style="margin:0;font-size:15px;font-weight:600;">Locations (${locs.length})</h3>
    <button class="btn btn-outline btn-sm" onclick="wcAddItem('locations')">+ Add Location</button>
  </div>
  ${locs.map((l,i) => `
    <div class="wc-card">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:12px;">
        <span style="flex-shrink:0;font-size:16px;">📍</span>
        <input type="text" id="lc-name-${i}" value="${esc(l.name)}" placeholder="Location name…"
          style="font-size:15px;font-weight:600;border:none;background:transparent;padding:2px 0;flex:1;color:inherit;outline:none;border-bottom:1px dashed var(--card-border);"
          onfocus="this.style.borderBottomColor='var(--primary)'" onblur="this.style.borderBottomColor='var(--card-border)'">
        ${wcDelBtn('locations', i)}
      </div>
      <input type="hidden" id="lc-id-${i}" value="${esc(l.id||'')}">
      ${imgPickerHtml('lc-img-'+i, l.image||'', 'Location Photo', 'locations')}
      <div class="form-row">${fi('Address','lc-addr-'+i,l.address,'text','25856 Canal Road...')}</div>
      ${ta('Description (shown in booking)','lc-desc-'+i,l.description,2)}
      ${fi('Google Maps URL (optional)','lc-map-'+i,l.mapUrl,'url','https://maps.google.com/?q=...')}
    </div>`).join('')}
  ${locs.length === 0 ? `<div style="text-align:center;padding:32px;color:var(--text-muted);border:2px dashed var(--card-border);border-radius:10px;">No locations yet — click "+ Add Location" above</div>` : ''}
  ${saveBtn('saveLocations')}`;
}
function saveLocations() {
  wcCollect('locations');
  wcSave('locations', _wc_data.locations);
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function renderFooter() {
  const d = _wc_data.footer || {};
  return `<h2 class="wc-title">Footer</h2>
  ${fi('Business Name','ft2-name',d.businessName)}
  ${ta('Footer Tagline','ft2-tag',d.tagline)}
  <h3 style="margin:20px 0 8px;font-size:14px;font-weight:600;">Footer Links — format: <code>Label|/url</code> (one per line)</h3>
  <div class="form-group"><textarea id="ft2-links" rows="6">${esc((d.links||[]).map(l=>l.label+'|'+l.href).join('\n'))}</textarea></div>
  <h3 style="margin:20px 0 8px;font-size:14px;font-weight:600;">Services (one per line)</h3>
  <div class="form-group"><textarea id="ft2-svcs" rows="5">${esc((d.services||[]).join('\n'))}</textarea></div>
  ${saveBtn('saveFooter')}`;
}
function saveFooter() {
  const links = val('ft2-links').split('\n').map(line => {
    const [label,...rest] = line.split('|');
    return { label:label.trim(), href:rest.join('|').trim() };
  }).filter(l=>l.label);
  wcSave('footer', { businessName:val('ft2-name'), tagline:val('ft2-tag'), links, services:val('ft2-svcs').split('\n').map(s=>s.trim()).filter(Boolean) });
}

// ─── Register page callback ───────────────────────────────────────────────────

if (typeof onPageLoad === 'function') {
  onPageLoad('website-content', loadWebsiteContent);
}

// ─────────────────────────────────────────────────────────────────────────────
// TYPE-AWARE SECTIONS
// ─────────────────────────────────────────────────────────────────────────────

function getWebsiteSectionsByType(bizType) {
  const baseSections = [
    { id: 'hero', label: '🌟 Hero' },
    { id: 'about', label: 'ℹ️ About' },
    { id: 'gallery', label: '🖼️ Gallery' },
    { id: 'reviews', label: '💬 Reviews' },
    { id: 'qna', label: '❓ FAQ' },
    { id: 'contact', label: '📞 Contact' },
    { id: 'footer', label: '📋 Footer' }
  ];

  const typeSpecificSections = {
    'restaurant,bar,cafe,food_truck': [
      { id: 'menu', label: '🍽️ Menu' },
      { id: 'specials', label: '🔥 Specials & Happy Hour' },
      { id: 'events', label: '🎉 Events & Live Music' },
      { id: 'booking_settings', label: '💳 Reservations & Payment' }
    ],
    'boat_rental,charter,jet_ski_rental': [
      { id: 'products', label: '🚤 Fleet & Pricing' },
      { id: 'group_rate', label: '👥 Group Rates' },
      { id: 'docks', label: '🛟 Docks & Locations' },
      { id: 'addons', label: '🎁 Add-ons' },
      { id: 'whats_included', label: '✅ What\'s Included' },
      { id: 'booking_settings', label: '💳 Booking & Payment' }
    ],
    'photographer': [
      { id: 'portfolio', label: '📸 Portfolio' },
      { id: 'services', label: '💼 Services & Packages' },
      { id: 'booking_settings', label: '💳 Bookings & Payment' }
    ],
    'salon,spa,retail': [
      { id: 'services', label: '💇 Services & Products' },
      { id: 'staff', label: '👥 Team' },
      { id: 'booking_settings', label: '💳 Appointments & Payment' }
    ],
    'hotel,condo,vacation_rental': [
      { id: 'rooms', label: '🛏️ Rooms & Rates' },
      { id: 'amenities', label: '🏊 Amenities' },
      { id: 'booking_settings', label: '💳 Bookings & Payment' }
    ]
  };

  // Find matching type-specific sections
  let typeSections = [];
  for (const [types, sections] of Object.entries(typeSpecificSections)) {
    if (types.split(',').includes(bizType)) {
      typeSections = sections;
      break;
    }
  }

  return [...baseSections.slice(0, 2), ...typeSections, ...baseSections.slice(2)];
}

// Update wcSections based on business type on load
function updateWebsiteSectionsForType() {
  if (USER_CONFIG && USER_CONFIG.business_type) {
    const newSections = getWebsiteSectionsByType(USER_CONFIG.business_type);
    // Update the global wcSections array if it exists
    if (typeof wcSections !== 'undefined') {
      wcSections.length = 0;
      wcSections.push(...newSections);
    }
  }
}
