// ============================================
// Pages — Page management CRUD (Supabase)
// ============================================

var _pages = [];
var _pageIdCounter = 0;

async function loadPages() {
  var apiData = await CC.dashboard.getPages();
  if (apiData && Array.isArray(apiData)) {
    _pages = apiData.map(function(p) {
      return {
        id: p.id, title: p.title || '', slug: p.slug || '',
        content: p.html_content || '', seoTitle: p.seo_title || '',
        seoDesc: p.seo_description || '', sortOrder: p.sort_order || 0, _apiId: p.id
      };
    });
  }
  renderPages();
  updatePageStats();
}

function renderPages() {
  var container = document.getElementById('pages-list');
  var emptyState = document.getElementById('pages-empty');

  if (_pages.length === 0) {
    container.innerHTML = '';
    emptyState.style.display = '';
    return;
  }

  emptyState.style.display = 'none';

  var html = '<div class="table-wrap"><table><thead><tr><th>Page</th><th>Slug</th><th>SEO Title</th><th>Actions</th></tr></thead><tbody>';

  _pages.sort(function(a, b) { return a.sortOrder - b.sortOrder; }).forEach(function(page) {
    html += '<tr>';
    html += '<td><strong>' + escHtml(page.title) + '</strong></td>';
    html += '<td style="color:var(--text-muted);">/' + escHtml(page.slug) + '</td>';
    html += '<td style="color:var(--text-muted);font-size:12px;">' + escHtml(page.seoTitle || '-') + '</td>';
    html += '<td><div style="display:flex;gap:6px;">';
    html += '<button class="btn btn-outline btn-sm" onclick="editPage(\'' + page.id + '\')">Edit</button>';
    html += '<button class="btn btn-danger btn-sm" onclick="deletePage(\'' + page.id + '\')">Delete</button>';
    html += '</div></td>';
    html += '</tr>';
  });

  html += '</tbody></table></div>';
  container.innerHTML = html;
}

function openPageModal(id) {
  document.getElementById('page-form-title').value = '';
  document.getElementById('page-form-slug').value = '';
  document.getElementById('page-form-content').value = '';
  document.getElementById('page-form-seo-title').value = '';
  document.getElementById('page-form-seo-desc').value = '';
  document.getElementById('page-form-id').value = '';
  document.getElementById('page-modal-title').textContent = 'Add Page';

  if (id) {
    var page = _pages.find(function(p) { return p.id == id; });
    if (page) {
      document.getElementById('page-modal-title').textContent = 'Edit Page';
      document.getElementById('page-form-title').value = page.title;
      document.getElementById('page-form-slug').value = page.slug;
      document.getElementById('page-form-content').value = page.content;
      document.getElementById('page-form-seo-title').value = page.seoTitle || '';
      document.getElementById('page-form-seo-desc').value = page.seoDesc || '';
      document.getElementById('page-form-id').value = page.id;
    }
  }

  var titleInput = document.getElementById('page-form-title');
  var slugInput = document.getElementById('page-form-slug');
  titleInput.oninput = function() {
    if (!id || !slugInput.value) {
      slugInput.value = titleInput.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }
  };

  openModal('modal-page');
}

async function savePage() {
  var title = document.getElementById('page-form-title').value.trim();
  if (!title) { toast('Page title is required', 'error'); return; }

  var slug = document.getElementById('page-form-slug').value.trim() || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  var content = document.getElementById('page-form-content').value;
  var seoTitle = document.getElementById('page-form-seo-title').value.trim();
  var seoDesc = document.getElementById('page-form-seo-desc').value.trim();
  var id = document.getElementById('page-form-id').value;

  var pageData = {
    title: title, slug: slug, html_content: content,
    seo_title: seoTitle, seo_description: seoDesc, sort_order: _pages.length
  };

  if (id) {
    await CC.dashboard.updatePage(id, pageData);
    toast('Page saved to database');
  } else {
    await CC.dashboard.createPage(pageData);
    toast('Page added to database');
  }

  await loadPages();
  closeModal('modal-page');
}

function editPage(id) {
  openPageModal(id);
}

async function deletePage(id) {
  if (!confirm('Delete this page?')) return;
  await CC.dashboard.deletePage(id);
  await loadPages();
  toast('Page deleted from database');
}

function updatePageStats() {
  var el = document.getElementById('stat-pages');
  if (el) el.textContent = _pages.length;
}

onPageLoad('pages', loadPages);
