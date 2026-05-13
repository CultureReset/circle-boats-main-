// ============================================
// SEO Management — Meta Tags, Sitemap, Schema
// ============================================

var _seoPages = [];
var _sitemapConfig = {};
var _robotsConfig = '';

async function loadSEO() {
  var apiData = await CC.dashboard.getSEO();
  if (apiData) {
    _seoPages = apiData.pages || [];
    _sitemapConfig = apiData.sitemap || {};
    _robotsConfig = apiData.robots || '';
  }

  renderSEOPages();
  renderSitemapConfig();
  renderRobotsConfig();
  loadTrackingSettings();
}

async function loadTrackingSettings() {
  var data = await CC.dashboard.getTrackingSettings();
  if (data) {
    var ga4 = document.getElementById('tracking-ga4-id');
    var pixel = document.getElementById('tracking-pixel-id');
    if (ga4) ga4.value = data.ga4_id || '';
    if (pixel) pixel.value = data.facebook_pixel_id || '';
  }
}

async function saveTrackingSettings() {
  var ga4Id = (document.getElementById('tracking-ga4-id')?.value || '').trim();
  var pixelId = (document.getElementById('tracking-pixel-id')?.value || '').trim();
  var status = document.getElementById('tracking-save-status');

  await CC.dashboard.updateTrackingSettings({ ga4_id: ga4Id, facebook_pixel_id: pixelId });

  if (status) {
    status.innerHTML = '<span style="color:var(--success);">✓ Tracking IDs saved — will load on your next site visit</span>';
    setTimeout(function() { if (status) status.innerHTML = ''; }, 4000);
  }
  toast('Tracking IDs saved');
}

function renderSEOPages() {
  var container = document.getElementById('seo-pages-list');
  if (!container) return;

  if (_seoPages.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted);">';
    container.innerHTML += '<p>No pages configured yet</p>';
    container.innerHTML += '<button class="btn btn-primary" onclick="openSEOPageModal()">Add First Page</button>';
    container.innerHTML += '</div>';
    return;
  }

  var html = '<div class="table-wrap"><table>';
  html += '<thead><tr><th>Page</th><th>SEO Title</th><th>Meta Description</th><th>Status</th><th>Actions</th></tr></thead><tbody>';

  _seoPages.forEach(function(page) {
    var hasTitle = page.page_title && page.page_title.length > 0;
    var hasDesc = page.meta_description && page.meta_description.length > 0;
    var hasOG = page.og_image && page.og_image.length > 0;
    var score = (hasTitle ? 33 : 0) + (hasDesc ? 33 : 0) + (hasOG ? 34 : 0);

    html += '<tr>';
    html += '<td><strong>' + escHtml(page.page_slug) + '</strong></td>';
    html += '<td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + escHtml(page.page_title || '-') + '</td>';
    html += '<td style="max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text-muted);font-size:13px;">' + escHtml(page.meta_description || '-') + '</td>';
    html += '<td>';
    if (score >= 90) html += '<span class="badge badge-success">Good</span>';
    else if (score >= 60) html += '<span class="badge badge-warning">Fair</span>';
    else html += '<span class="badge badge-danger">Poor</span>';
    html += '</td>';
    html += '<td><button class="btn btn-outline btn-sm" onclick="editSEOPage(\'' + page.id + '\')">Edit</button></td>';
    html += '</tr>';
  });

  html += '</tbody></table></div>';
  container.innerHTML = html;
}

function openSEOPageModal(pageId) {
  var modal = document.getElementById('modal-seo-page');
  if (!modal) return;

  // Reset form
  document.getElementById('seo-page-id').value = '';
  document.getElementById('seo-page-slug').value = '';
  document.getElementById('seo-page-title').value = '';
  document.getElementById('seo-meta-description').value = '';
  document.getElementById('seo-meta-keywords').value = '';
  document.getElementById('seo-og-title').value = '';
  document.getElementById('seo-og-description').value = '';
  document.getElementById('seo-og-image').value = '';
  document.getElementById('seo-twitter-card').value = 'summary_large_image';
  document.getElementById('seo-canonical-url').value = '';
  document.getElementById('seo-robots').value = 'index, follow';

  if (pageId) {
    var page = _seoPages.find(function(p) { return p.id === pageId; });
    if (page) {
      document.getElementById('seo-page-id').value = page.id;
      document.getElementById('seo-page-slug').value = page.page_slug || '';
      document.getElementById('seo-page-title').value = page.page_title || '';
      document.getElementById('seo-meta-description').value = page.meta_description || '';
      document.getElementById('seo-meta-keywords').value = page.meta_keywords || '';
      document.getElementById('seo-og-title').value = page.og_title || '';
      document.getElementById('seo-og-description').value = page.og_description || '';
      document.getElementById('seo-og-image').value = page.og_image || '';
      document.getElementById('seo-twitter-card').value = page.twitter_card || 'summary_large_image';
      document.getElementById('seo-canonical-url').value = page.canonical_url || '';
      document.getElementById('seo-robots').value = page.robots || 'index, follow';
    }
  }

  openModal('modal-seo-page');
}

function editSEOPage(pageId) {
  openSEOPageModal(pageId);
}

async function saveSEOPage() {
  var id = document.getElementById('seo-page-id').value;
  var slug = document.getElementById('seo-page-slug').value.trim();
  var pageTitle = document.getElementById('seo-page-title').value.trim();
  var metaDesc = document.getElementById('seo-meta-description').value.trim();

  if (!slug) {
    toast('Page slug is required', 'error');
    return;
  }

  var pageData = {
    page_slug: slug,
    page_title: pageTitle,
    meta_description: metaDesc,
    meta_keywords: document.getElementById('seo-meta-keywords').value.trim(),
    og_title: document.getElementById('seo-og-title').value.trim() || pageTitle,
    og_description: document.getElementById('seo-og-description').value.trim() || metaDesc,
    og_image: document.getElementById('seo-og-image').value.trim(),
    twitter_card: document.getElementById('seo-twitter-card').value,
    canonical_url: document.getElementById('seo-canonical-url').value.trim(),
    robots: document.getElementById('seo-robots').value
  };

  if (id) {
    await CC.dashboard.updateSEOPage(id, pageData);
    toast('SEO settings saved');
  } else {
    await CC.dashboard.createSEOPage(pageData);
    toast('SEO page added');
  }

  await loadSEO();
  closeModal('modal-seo-page');
}

function renderSitemapConfig() {
  var autoGen = document.getElementById('sitemap-auto-generate');
  var includePages = document.getElementById('sitemap-include-pages');
  if (autoGen) autoGen.checked = _sitemapConfig.auto_generate !== false;
  if (includePages) includePages.checked = _sitemapConfig.include_pages !== false;
}

async function generateSitemap() {
  var btn = event.target;
  btn.textContent = 'Generating...';
  btn.disabled = true;

  try {
    var sitemap = await CC.dashboard.generateSitemap();
    if (sitemap) {
      // Download sitemap.xml
      var blob = new Blob([sitemap.xml], { type: 'application/xml' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'sitemap.xml';
      a.click();
      URL.revokeObjectURL(url);

      toast('Sitemap generated!');
    }
  } catch(e) {
    toast('Failed to generate sitemap', 'error');
  }

  btn.textContent = 'Generate Sitemap';
  btn.disabled = false;
}

async function saveSitemapConfig() {
  var config = {
    auto_generate: document.getElementById('sitemap-auto-generate').checked,
    include_pages: document.getElementById('sitemap-include-pages').checked,
    change_frequency: document.getElementById('sitemap-frequency').value,
    priority: parseFloat(document.getElementById('sitemap-priority').value)
  };

  await CC.dashboard.updateSitemapConfig(config);
  toast('Sitemap settings saved');
}

function renderRobotsConfig() {
  var textarea = document.getElementById('robots-txt');
  if (textarea) {
    textarea.value = _robotsConfig || 'User-agent: *\nAllow: /\n\nSitemap: https://yoursite.com/sitemap.xml';
  }
}

async function saveRobotsTxt() {
  var robotsTxt = document.getElementById('robots-txt').value;

  await CC.dashboard.updateRobotsTxt(robotsTxt);
  toast('robots.txt saved');
}

function previewSchema() {
  // Show schema.org JSON-LD preview
  var business = window._business || {};
  var content = window._siteContent || {};

  var schema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": business.name || 'Business Name',
    "description": content.about_text || '',
    "image": business.logo_url || '',
    "address": {
      "@type": "PostalAddress",
      "streetAddress": content.address || '',
      "addressLocality": content.city || '',
      "addressRegion": content.state || '',
      "postalCode": content.zip || '',
      "addressCountry": "US"
    },
    "telephone": content.contact_phone || '',
    "email": content.contact_email || '',
    "url": business.domain || '',
    "priceRange": "$$"
  };

  var schemaStr = JSON.stringify(schema, null, 2);
  document.getElementById('schema-preview').value = schemaStr;
  openModal('modal-schema-preview');
}

function copySchema() {
  var textarea = document.getElementById('schema-preview');
  textarea.select();
  document.execCommand('copy');
  toast('Schema copied to clipboard');
}

onPageLoad('seo', loadSEO);
