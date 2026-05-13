// ============================================
// Sales Page Editor
// Edits all cybercheck-links sales pages from the admin dashboard.
// Reuses: wcGetAuthToken, val, num, chk, toast (globals from admin.html)
// Saves to: PUT /api/gcr/sales-page/:pageId
// ============================================

const SP_BASE = 'https://cybercheck-api-database.vercel.app';

let _sp_data    = null;
let _sp_pageId  = 'index';
let _sp_section = 'hero';

const SP_PAGES = [
  { id: 'index',        label: 'Home Page' },
  { id: 'gcr',          label: 'Gulf Coast Radar' },
  { id: 'booking',      label: 'Booking Engine' },
  { id: 'menu-updates', label: 'Menu Updates' },
  { id: 'reviews',      label: 'Reviews' },
  { id: 'artists',      label: 'Artist Platform' },
  { id: 'automations',  label: 'Automations' },
  { id: 'platform',     label: 'Platform Overview' },
];

const SP_SECTIONS = [
  { id: 'hero',           label: '🌟 Hero' },
  { id: 'products_grid',  label: '🧩 Products Grid' },
  { id: 'live_demo',      label: '📱 Live Demo Phones' },
  { id: 'booking_flow',   label: '📅 Booking Flow Steps' },
  { id: 'industries',     label: '🏪 Industries Grid' },
  { id: 'stats',          label: '📊 Stats Bar' },
  { id: 'problem_cards',  label: '❌ Problem Cards' },
  { id: 'features',       label: '⭐ Features' },
  { id: 'sms_demo',       label: '💬 SMS Demo' },
  { id: 'comparison',     label: '⚖️ Comparison Table' },
  { id: 'pricing',        label: '💰 Pricing' },
  { id: 'testimonials',   label: '💬 Testimonials' },
  { id: 'cta_band',       label: '🎯 CTA Band' },
  { id: 'footer',         label: '📋 Footer' },
];

// ─── Load ─────────────────────────────────────────────────────────────────────

async function loadSalesPageEditor(pageId) {
  _sp_pageId  = pageId || _sp_pageId;
  _sp_section = 'hero';

  const panel = document.getElementById('sp-panel');
  if (panel) panel.innerHTML = '<p style="padding:32px;color:var(--text-muted);">Loading…</p>';

  try {
    const res = await fetch(`${SP_BASE}/api/gcr/sales-page/${_sp_pageId}`);
    _sp_data = res.ok ? await res.json() : {};
  } catch(e) {
    _sp_data = {};
  }

  if (!_sp_data.sections) _sp_data.sections = [];

  renderSPNav();
  renderSPSection(_sp_section);
}

// ─── Nav ──────────────────────────────────────────────────────────────────────

function renderSPNav() {
  const nav = document.getElementById('sp-nav');
  if (!nav) return;
  nav.innerHTML = SP_SECTIONS.map(s => `
    <div class="wc-nav-item${_sp_section === s.id ? ' active' : ''}"
         onclick="renderSPSection('${s.id}')">${s.label}</div>
  `).join('');
}

function renderSPSection(id) {
  _sp_section = id;
  renderSPNav();
  const panel = document.getElementById('sp-panel');
  if (!panel) return;

  const renders = {
    hero:          spRenderHero,
    products_grid: spRenderProductsGrid,
    live_demo:     spRenderLiveDemo,
    booking_flow:  spRenderBookingFlow,
    industries:    spRenderIndustries,
    stats:         spRenderStats,
    problem_cards: spRenderProblemCards,
    features:      spRenderFeatures,
    sms_demo:      spRenderSmsDemo,
    comparison:    spRenderComparison,
    pricing:       spRenderPricing,
    testimonials:  spRenderTestimonials,
    cta_band:      spRenderCtaBand,
    footer:        spRenderFooter,
  };

  panel.innerHTML = (renders[id] || (() => '<p style="padding:32px">Section not found</p>'))();
}

// ─── Save / Push ──────────────────────────────────────────────────────────────

function spGetSectionData(id) {
  if (!_sp_data.sections) _sp_data.sections = [];
  let s = _sp_data.sections.find(s => s.id === id);
  if (!s) { s = { id, enabled: true, data: {} }; _sp_data.sections.push(s); }
  return s;
}

function spSetSectionData(id, data) {
  const s = spGetSectionData(id);
  s.data = data;
}

async function spSave(id, data) {
  spSetSectionData(id, data);
  await spPush();
}

async function spPush() {
  const token = wcGetAuthToken();
  try {
    const res = await fetch(`${SP_BASE}/api/gcr/sales-page/${_sp_pageId}`, {
      method:  'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': 'Bearer ' + token } : {})
      },
      body: JSON.stringify(_sp_data)
    });
    if (!res.ok) throw new Error(res.status);
    toast('Saved — sales page updated ✓');
  } catch(e) {
    toast('Save failed: ' + e.message, 'error');
  }
}

// ─── Section render helpers ───────────────────────────────────────────────────

function spD(id) {
  const s = _sp_data.sections && _sp_data.sections.find(s => s.id === id);
  return (s && s.data) ? s.data : {};
}

function spField(label, inputHtml, note) {
  return `<div class="wc-field">
    <label class="wc-label">${label}</label>
    ${inputHtml}
    ${note ? `<div class="wc-note">${note}</div>` : ''}
  </div>`;
}

function spText(id, value, placeholder) {
  return `<input class="wc-input" id="${id}" value="${(value||'').replace(/"/g,'&quot;')}" placeholder="${placeholder||''}">`;
}

function spTextarea(id, value, rows, placeholder) {
  return `<textarea class="wc-input" id="${id}" rows="${rows||3}" placeholder="${placeholder||''}">${value||''}</textarea>`;
}

function spSaveBtn(onclick) {
  return `<div class="wc-actions"><button class="wc-save-btn" onclick="${onclick}">💾 Save & Publish</button></div>`;
}

// Render an array of items with add/remove (generic)
function spArrayBlock(items, fields, prefix, addLabel) {
  const rows = (items||[]).map((item, i) => {
    const fieldHtml = fields.map(f => {
      if (f.type === 'textarea') return spField(f.label, spTextarea(`${prefix}-${f.key}-${i}`, item[f.key], 2));
      return spField(f.label, spText(`${prefix}-${f.key}-${i}`, item[f.key]));
    }).join('');
    return `<div class="wc-array-item" id="${prefix}-item-${i}">
      <div class="wc-array-header">
        <span style="font-weight:700;font-size:0.85rem;">#${i+1}</span>
        <button class="wc-remove-btn" onclick="spRemoveItem('${prefix}', ${i})">✕ Remove</button>
      </div>
      ${fieldHtml}
    </div>`;
  }).join('');
  return rows + `<button class="wc-add-btn" onclick="spAddItem('${prefix}', ${JSON.stringify(fields).replace(/"/g,'&quot;')})">${addLabel || '+ Add'}</button>`;
}

function spRemoveItem(prefix, i) {
  const items = _sp_current_items[prefix] || [];
  items.splice(i, 1);
  _sp_current_items[prefix] = items;
  renderSPSection(_sp_section);
}

let _sp_current_items = {};

function spAddItem(prefix, fieldsJson) {
  const fields = typeof fieldsJson === 'string' ? JSON.parse(fieldsJson.replace(/&quot;/g, '"')) : fieldsJson;
  if (!_sp_current_items[prefix]) _sp_current_items[prefix] = [];
  const blank = {};
  fields.forEach(f => blank[f.key] = '');
  _sp_current_items[prefix].push(blank);
  renderSPSection(_sp_section);
}

// ─── Section Renderers ────────────────────────────────────────────────────────

function spRenderHero() {
  const d = spD('hero');
  return `<div class="wc-section-form">
    <h3 class="wc-section-title">Hero Section</h3>
    ${spField('Eyebrow label', spText('sp-hero-eyebrow', d.eyebrow, 'e.g. Gulf Coast Radar + CyberCheck'))}
    ${spField('Headline', spTextarea('sp-hero-h1', d.headline, 2, 'e.g. One QR code. Your whole business.'))}
    ${spField('Subtext', spTextarea('sp-hero-sub', d.sub, 3, 'Short paragraph under the headline'))}
    ${spField('Primary button text', spText('sp-hero-btn1', d.btn1, 'Get Your Business Set Up'))}
    ${spField('Secondary button text', spText('sp-hero-btn2', d.btn2, 'See Everything We Offer'))}
    ${spField('Secondary button link', spText('sp-hero-btn2url', d.btn2url, '#products'))}
    ${spSaveBtn('spSaveHero()')}
  </div>`;
}

function spSaveHero() {
  spSave('hero', {
    eyebrow: val('sp-hero-eyebrow'),
    headline: val('sp-hero-h1'),
    sub:      val('sp-hero-sub'),
    btn1:     val('sp-hero-btn1'),
    btn2:     val('sp-hero-btn2'),
    btn2url:  val('sp-hero-btn2url'),
  });
}

function spRenderLiveDemo() {
  const d = spD('live_demo');
  return `<div class="wc-section-form">
    <h3 class="wc-section-title">Live Demo Phones</h3>
    <p class="wc-note" style="margin-bottom:16px;">These URLs load inside the phone wireframe iframes on the homepage.</p>
    ${spField('Left phone URL', spText('sp-demo-url1', d.url1||'https://beachsidecircleboats.com', 'https://beachsidecircleboats.com'))}
    ${spField('Left phone label', spText('sp-demo-label1', d.label1, 'Main Website'))}
    ${spField('Right phone URL', spText('sp-demo-url2', d.url2||'https://beachsidecircleboats.com/links.html', ''))}
    ${spField('Right phone label', spText('sp-demo-label2', d.label2, 'Links / Bio Page'))}
    ${spField('Section headline', spText('sp-demo-headline', d.headline, 'See it working right now.'))}
    ${spField('Section subtext', spTextarea('sp-demo-sub', d.sub, 2))}
    ${spSaveBtn('spSaveLiveDemo()')}
  </div>`;
}

function spSaveLiveDemo() {
  spSave('live_demo', {
    url1:     val('sp-demo-url1'),
    label1:   val('sp-demo-label1'),
    url2:     val('sp-demo-url2'),
    label2:   val('sp-demo-label2'),
    headline: val('sp-demo-headline'),
    sub:      val('sp-demo-sub'),
  });
}

function spRenderStats() {
  const d = spD('stats');
  const items = d.items || [
    { num: '4.9★', label: 'Average review rating' },
    { num: '85%',  label: 'Increase in review trust' },
    { num: '2.3×', label: 'More likely to rebook' },
    { num: '0%',   label: 'Platform booking fees' },
    { num: '60s',  label: 'Average menu update time' },
  ];
  _sp_current_items['sp-stats'] = items;
  const fields = [{key:'num',label:'Number / Value'},{key:'label',label:'Label'}];
  return `<div class="wc-section-form">
    <h3 class="wc-section-title">Stats Bar</h3>
    ${spArrayBlock(items, fields, 'sp-stats', '+ Add Stat')}
    ${spSaveBtn('spSaveStats()')}
  </div>`;
}

function spSaveStats() {
  const items = (_sp_current_items['sp-stats']||[]).map((_,i) => ({
    num:   val('sp-stats-num-'+i),
    label: val('sp-stats-label-'+i),
  }));
  spSave('stats', { items });
}

function spRenderFeatures() {
  const d = spD('features');
  const items = d.items || [];
  _sp_current_items['sp-feat'] = items;
  const fields = [
    {key:'icon',label:'Icon (emoji)'}, {key:'title',label:'Title'},
    {key:'desc',label:'Description',type:'textarea'},
  ];
  return `<div class="wc-section-form">
    <h3 class="wc-section-title">Feature Cards</h3>
    ${spArrayBlock(items, fields, 'sp-feat', '+ Add Feature')}
    ${spSaveBtn('spSaveFeatures()')}
  </div>`;
}

function spSaveFeatures() {
  const items = (_sp_current_items['sp-feat']||[]).map((_,i) => ({
    icon:  val('sp-feat-icon-'+i),
    title: val('sp-feat-title-'+i),
    desc:  val('sp-feat-desc-'+i),
  }));
  spSave('features', { items });
}

function spRenderProblemCards() {
  const d = spD('problem_cards');
  const items = d.items || [];
  _sp_current_items['sp-prob'] = items;
  const fields = [
    {key:'icon',label:'Icon (emoji)'}, {key:'title',label:'Title'},
    {key:'desc',label:'Description',type:'textarea'},
  ];
  return `<div class="wc-section-form">
    <h3 class="wc-section-title">Problem Cards</h3>
    ${spArrayBlock(items, fields, 'sp-prob', '+ Add Problem Card')}
    ${spSaveBtn('spSaveProblemCards()')}
  </div>`;
}

function spSaveProblemCards() {
  const items = (_sp_current_items['sp-prob']||[]).map((_,i) => ({
    icon:  val('sp-prob-icon-'+i),
    title: val('sp-prob-title-'+i),
    desc:  val('sp-prob-desc-'+i),
  }));
  spSave('problem_cards', { items });
}

function spRenderIndustries() {
  const d = spD('industries');
  const items = d.items || [];
  _sp_current_items['sp-ind'] = items;
  const fields = [
    {key:'icon',label:'Icon (emoji)'}, {key:'name',label:'Industry Name'},
    {key:'desc',label:'Short description',type:'textarea'},
  ];
  return `<div class="wc-section-form">
    <h3 class="wc-section-title">Industries Grid</h3>
    ${spArrayBlock(items, fields, 'sp-ind', '+ Add Industry')}
    ${spSaveBtn('spSaveIndustries()')}
  </div>`;
}

function spSaveIndustries() {
  const items = (_sp_current_items['sp-ind']||[]).map((_,i) => ({
    icon: val('sp-ind-icon-'+i),
    name: val('sp-ind-name-'+i),
    desc: val('sp-ind-desc-'+i),
  }));
  spSave('industries', { items });
}

function spRenderProductsGrid() {
  const d = spD('products_grid');
  const items = d.cards || [];
  _sp_current_items['sp-pc'] = items;
  const fields = [
    {key:'icon',label:'Icon (emoji)'}, {key:'title',label:'Title'},
    {key:'desc',label:'Description',type:'textarea'},
    {key:'link',label:'Link URL'}, {key:'tag',label:'Link label (e.g. Learn more)'},
  ];
  return `<div class="wc-section-form">
    <h3 class="wc-section-title">Products Grid</h3>
    ${spArrayBlock(items, fields, 'sp-pc', '+ Add Product Card')}
    ${spSaveBtn('spSaveProductsGrid()')}
  </div>`;
}

function spSaveProductsGrid() {
  const cards = (_sp_current_items['sp-pc']||[]).map((_,i) => ({
    icon:  val('sp-pc-icon-'+i),
    title: val('sp-pc-title-'+i),
    desc:  val('sp-pc-desc-'+i),
    link:  val('sp-pc-link-'+i),
    tag:   val('sp-pc-tag-'+i),
  }));
  spSave('products_grid', { cards });
}

function spRenderBookingFlow() {
  const d = spD('booking_flow');
  const steps = d.steps || [{num:1},{num:2},{num:3},{num:4}];
  _sp_current_items['sp-flow'] = steps;
  const fields = [
    {key:'num',label:'Step #'}, {key:'title',label:'Title'},
    {key:'desc',label:'Description',type:'textarea'},
    {key:'image',label:'Screenshot image URL'},
  ];
  return `<div class="wc-section-form">
    <h3 class="wc-section-title">Booking Flow Steps</h3>
    ${spArrayBlock(steps, fields, 'sp-flow', '+ Add Step')}
    ${spSaveBtn('spSaveBookingFlow()')}
  </div>`;
}

function spSaveBookingFlow() {
  const steps = (_sp_current_items['sp-flow']||[]).map((_,i) => ({
    num:   val('sp-flow-num-'+i),
    title: val('sp-flow-title-'+i),
    desc:  val('sp-flow-desc-'+i),
    image: val('sp-flow-image-'+i),
  }));
  spSave('booking_flow', { steps });
}

function spRenderSmsDemo() {
  const d = spD('sms_demo');
  return `<div class="wc-section-form">
    <h3 class="wc-section-title">SMS Demo</h3>
    ${spField('Sender name', spText('sp-sms-sender', d.sender, 'Gulf Coast Radar'))}
    ${spField('Avatar initials', spText('sp-sms-avatar', d.avatar, 'GCR'))}
    ${spField('Business name (in message)', spText('sp-sms-biz', d.business, 'The Shrimp Basket'))}
    ${spField('Message 1 (incoming)', spTextarea('sp-sms-msg1', d.message1, 3))}
    ${spField('Reply (outgoing)', spText('sp-sms-reply', d.reply1, 'Thanks! Just updated the catch 🐟'))}
    ${spField('Message 2 (incoming)', spText('sp-sms-msg2', d.message2, '✅ Live! Customers can see it now.'))}
    ${spSaveBtn('spSaveSmsDemo()')}
  </div>`;
}

function spSaveSmsDemo() {
  spSave('sms_demo', {
    sender:   val('sp-sms-sender'),
    avatar:   val('sp-sms-avatar'),
    business: val('sp-sms-biz'),
    message1: val('sp-sms-msg1'),
    reply1:   val('sp-sms-reply'),
    message2: val('sp-sms-msg2'),
  });
}

function spRenderPricing() {
  const d = spD('pricing');
  const cards = d.cards || [];
  _sp_current_items['sp-price'] = cards;
  const fields = [
    {key:'name',label:'Plan name'}, {key:'price',label:'Price (e.g. $49)'},
    {key:'period',label:'Period (e.g. /mo per location)'},
    {key:'desc',label:'Short description',type:'textarea'},
    {key:'features',label:'Features (one per line)',type:'textarea'},
    {key:'cta',label:'Button text'},  {key:'badge',label:'Badge text (optional, e.g. MOST POPULAR)'},
  ];
  return `<div class="wc-section-form">
    <h3 class="wc-section-title">Pricing Cards</h3>
    ${spArrayBlock(cards, fields, 'sp-price', '+ Add Plan')}
    ${spSaveBtn('spSavePricing()')}
  </div>`;
}

function spSavePricing() {
  const cards = (_sp_current_items['sp-price']||[]).map((_,i) => ({
    name:     val('sp-price-name-'+i),
    price:    val('sp-price-price-'+i),
    period:   val('sp-price-period-'+i),
    desc:     val('sp-price-desc-'+i),
    features: val('sp-price-features-'+i).split('\n').map(s=>s.trim()).filter(Boolean),
    cta:      val('sp-price-cta-'+i),
    badge:    val('sp-price-badge-'+i),
    featured: !!(val('sp-price-badge-'+i)),
  }));
  spSave('pricing', { cards });
}

function spRenderTestimonials() {
  const d = spD('testimonials');
  const items = d.items || [];
  _sp_current_items['sp-test'] = items;
  const fields = [
    {key:'quote',label:'Quote',type:'textarea'}, {key:'name',label:'Name'},
    {key:'business',label:'Business name'}, {key:'image',label:'Photo URL (optional)'},
  ];
  return `<div class="wc-section-form">
    <h3 class="wc-section-title">Testimonials</h3>
    ${spArrayBlock(items, fields, 'sp-test', '+ Add Testimonial')}
    ${spSaveBtn('spSaveTestimonials()')}
  </div>`;
}

function spSaveTestimonials() {
  const items = (_sp_current_items['sp-test']||[]).map((_,i) => ({
    quote:    val('sp-test-quote-'+i),
    name:     val('sp-test-name-'+i),
    business: val('sp-test-business-'+i),
    image:    val('sp-test-image-'+i),
  }));
  spSave('testimonials', { items });
}

function spRenderComparison() {
  const d = spD('comparison');
  return `<div class="wc-section-form">
    <h3 class="wc-section-title">Comparison Table</h3>
    <p class="wc-note" style="margin-bottom:16px;">Paste JSON array of rows. Each row: { "feature": "...", "cc": "✓ Free", "col2": "6% + cc", "col3": "N/A", "col4": "..." }</p>
    ${spField('Column headers (comma-separated)', spText('sp-cmp-headers', (d.headers||[]).join(', '), 'CyberCheck, FareHarbor, Linktree, Stacked apps'))}
    ${spField('Rows (JSON array)', spTextarea('sp-cmp-rows', JSON.stringify(d.rows||[], null, 2), 12))}
    ${spSaveBtn('spSaveComparison()')}
  </div>`;
}

function spSaveComparison() {
  let rows = [];
  try { rows = JSON.parse(val('sp-cmp-rows')); } catch(e) { toast('Invalid JSON in rows', 'error'); return; }
  spSave('comparison', {
    headers: val('sp-cmp-headers').split(',').map(s=>s.trim()),
    rows,
  });
}

function spRenderCtaBand() {
  const d = spD('cta_band');
  return `<div class="wc-section-form">
    <h3 class="wc-section-title">CTA Band</h3>
    ${spField('Headline', spTextarea('sp-cta-h', d.headline, 2, 'Ready to put your business on the map?'))}
    ${spField('Subtext', spTextarea('sp-cta-sub', d.sub, 3))}
    ${spField('Primary button text', spText('sp-cta-btn1', d.btn1, 'Get Set Up Today'))}
    ${spField('Secondary button text', spText('sp-cta-btn2', d.btn2, 'See a Live Example'))}
    ${spField('Secondary button URL', spText('sp-cta-btn2url', d.btn2url, 'https://beachsidecircleboats.com'))}
    ${spSaveBtn('spSaveCtaBand()')}
  </div>`;
}

function spSaveCtaBand() {
  spSave('cta_band', {
    headline: val('sp-cta-h'),
    sub:      val('sp-cta-sub'),
    btn1:     val('sp-cta-btn1'),
    btn2:     val('sp-cta-btn2'),
    btn2url:  val('sp-cta-btn2url'),
  });
}

function spRenderFooter() {
  const d = spD('footer');
  return `<div class="wc-section-form">
    <h3 class="wc-section-title">Footer</h3>
    ${spField('Tagline text', spTextarea('sp-ft-tag', d.tagline, 2, 'The all-in-one booking, menu, and marketing platform for Gulf Coast businesses.'))}
    ${spSaveBtn('spSaveFooter()')}
  </div>`;
}

function spSaveFooter() {
  spSave('footer', { tagline: val('sp-ft-tag') });
}

// ─── Page selector init ───────────────────────────────────────────────────────

function spRenderPageSelector() {
  const sel = document.getElementById('sp-page-select');
  if (!sel) return;
  sel.innerHTML = SP_PAGES.map(p =>
    `<option value="${p.id}"${_sp_pageId === p.id ? ' selected' : ''}>${p.label}</option>`
  ).join('');
  sel.onchange = () => { loadSalesPageEditor(sel.value); spUpdatePreviewLink(); };
}

const SP_PREVIEW_URLS = {
  'index':        'https://cybercheck-links.vercel.app/index.html',
  'gcr':          'https://cybercheck-links.vercel.app/gcr.html',
  'booking':      'https://cybercheck-links.vercel.app/booking.html',
  'menu-updates': 'https://cybercheck-links.vercel.app/menu-updates.html',
  'reviews':      'https://cybercheck-links.vercel.app/reviews.html',
  'artists':      'https://cybercheck-links.vercel.app/artists.html',
  'automations':  'https://cybercheck-links.vercel.app/automations.html',
  'platform':     'https://cybercheck-links.vercel.app/platform.html',
};

function spUpdatePreviewLink() {
  const el = document.getElementById('sp-preview-link');
  if (el) el.href = SP_PREVIEW_URLS[_sp_pageId] || '#';
}

function initSalesPageEditor() {
  spRenderPageSelector();
  spUpdatePreviewLink();
  loadSalesPageEditor(_sp_pageId);
}
