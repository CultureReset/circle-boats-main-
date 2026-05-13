// ============================================
// Menu — Category + Item CRUD for restaurants
// Backed by Supabase menu_items table via CC.dashboard
// ============================================

var _menuItems = [];      // items loaded from DB
var _menuCategories = []; // derived from item.category strings + local additions
var _activeMenuTab = 'food'; // 'food' | 'drink' | 'happy_hour'

var MENU_TAB_LABELS = {
  food:       '🍽️ Menu',
  drink:      '🍹 Drinks',
  happy_hour: '🍺 Happy Hour'
};

function loadMenu() {
  switchMenuTab(_activeMenuTab); // style the active tab button
  updateMenuStats();
  renderMenuQR();

  CC.dashboard.getMenu().then(function(items) {
    _menuItems = (items || []).map(function(item) {
      return {
        id: item.id,
        dbId: item.id,
        categoryName: item.category || 'Uncategorized',
        itemType: item.item_type || 'food',
        name: item.name || '',
        price: parseFloat(item.price) || 0,
        description: item.description || '',
        tags: Array.isArray(item.tags) ? item.tags : (item.tags ? [item.tags] : []),
        modifiers: Array.isArray(item.modifiers) ? item.modifiers : [],
        photo: item.photo_url || '',
        sort_order: item.sort_order || 0,
      };
    });

    // Derive categories from loaded items (keyed by type+name)
    var seenCats = {};
    _menuItems.forEach(function(item) {
      var key = item.itemType + '|' + item.categoryName;
      if (!seenCats[key]) {
        seenCats[key] = true;
        _menuCategories.push({ name: item.categoryName, type: item.itemType });
      }
    });

    renderMenu();
    updateMenuStats();
  }).catch(function(err) {
    console.error('Failed to load menu:', err);
    toast('Could not load menu items', 'error');
  });
}

function switchMenuTab(type) {
  _activeMenuTab = type;
  ['food', 'drink', 'happy_hour'].forEach(function(t) {
    var btn = document.getElementById('tab-' + t);
    if (btn) {
      btn.classList.toggle('active', t === type);
      btn.style.background   = t === type ? 'var(--primary)' : '';
      btn.style.color        = t === type ? '#fff' : '';
      btn.style.borderColor  = t === type ? 'var(--primary)' : '';
    }
  });
  renderMenu();
}

function renderMenu() {
  var container = document.getElementById('menu-categories-list');
  var emptyState = document.getElementById('menu-empty');
  if (!container) return;

  // Build a unified category list from all items (all types)
  var allCats = _menuCategories.slice();
  _menuItems.forEach(function(item) {
    if (!allCats.find(function(c) { return c.name === item.categoryName && c.type === item.itemType; })) {
      allCats.push({ name: item.categoryName, type: item.itemType });
    }
  });

  if (_menuItems.length === 0 && allCats.length === 0) {
    container.innerHTML = '';
    if (emptyState) {
      emptyState.textContent = 'No menu items yet. Add one above.';
      emptyState.style.display = '';
    }
    return;
  }

  if (emptyState) emptyState.style.display = 'none';
  var html = '';

  allCats.forEach(function(cat) {
    var items = _menuItems.filter(function(i) { return i.categoryName === cat.name && i.itemType === cat.type; });
    var badge = MENU_TAB_LABELS[cat.type] || cat.type;

    html += '<div class="card" style="margin-bottom:12px;">';
    html += '<div class="card-header">';
    html += '<h3 style="font-size:15px;">' + escHtml(cat.name)
          + ' <span style="color:var(--text-dim);font-weight:400;">(' + items.length + ')</span>'
          + ' <span style="font-size:11px;background:var(--surface-2,#f0f0f0);border-radius:999px;padding:2px 8px;margin-left:6px;">' + badge + '</span>'
          + '</h3>';
    html += '<div style="display:flex;gap:6px;">';
    html += '<button class="btn btn-outline btn-sm" onclick="editCategory(\'' + escAttr(cat.name) + '\',\'' + escAttr(cat.type) + '\')">Edit</button>';
    html += '<button class="btn btn-danger btn-sm" onclick="deleteCategory(\'' + escAttr(cat.name) + '\',\'' + escAttr(cat.type) + '\')">Delete</button>';
    html += '</div>';
    html += '</div>';

    if (items.length > 0) {
      html += '<div class="table-wrap"><table><thead><tr><th>Item</th><th>Price</th><th>Tags</th><th>Actions</th></tr></thead><tbody>';
      items.forEach(function(item) {
        html += '<tr>';
        html += '<td><strong>' + escHtml(item.name) + '</strong>';
        if (item.description) html += '<br><span style="font-size:12px;color:var(--text-muted);">' + escHtml(item.description) + '</span>';
        html += '</td>';
        html += '<td>$' + Number(item.price).toFixed(2) + '</td>';
        html += '<td>' + (item.tags || []).map(function(t) { return '<span class="tag">' + escHtml(t) + '</span>'; }).join('') + '</td>';
        html += '<td><div style="display:flex;gap:6px;">';
        html += '<button class="btn btn-outline btn-sm" onclick="editMenuItem(\'' + escAttr(item.id) + '\')">Edit</button>';
        html += '<button class="btn btn-danger btn-sm" onclick="deleteMenuItem(\'' + escAttr(item.id) + '\')">Delete</button>';
        html += '</div></td>';
        html += '</tr>';
      });
      html += '</tbody></table></div>';
    } else {
      html += '<p style="color:var(--text-muted);font-size:13px;padding:8px 0;">No items in this section yet.</p>';
    }

    html += '</div>';
  });

  container.innerHTML = html;
}

function escHtml(str) {
  var div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

function escAttr(str) {
  return String(str || '').replace(/'/g, '&#39;').replace(/"/g, '&quot;');
}

// ── Category CRUD ──
function openCategoryModal(existingName) {
  document.getElementById('cat-form-name').value = existingName || '';
  document.getElementById('cat-form-id').value = existingName || '';
  var titleEl = document.getElementById('cat-modal-title');
  if (titleEl) titleEl.textContent = (existingName ? 'Edit' : 'Add') + ' Section — ' + MENU_TAB_LABELS[_activeMenuTab];
  openModal('modal-category');
}

function saveCategory() {
  var name = document.getElementById('cat-form-name').value.trim();
  if (!name) { toast('Category name is required', 'error'); return; }

  var oldName = document.getElementById('cat-form-id').value;

  if (oldName && oldName !== name) {
    // Rename: update all items with this category in DB
    var toRename = _menuItems.filter(function(i) { return i.categoryName === oldName; });
    var promises = toRename.map(function(item) {
      return CC.dashboard.updateMenuItem(item.id, { category: name });
    });
    Promise.all(promises).then(function() {
      // Update local state
      _menuItems.forEach(function(i) { if (i.categoryName === oldName) i.categoryName = name; });
      var cat = _menuCategories.find(function(c) { return c.name === oldName; });
      if (cat) cat.name = name;
      closeModal('modal-category');
      renderMenu();
      toast('Category renamed');
    }).catch(function() { toast('Failed to rename category', 'error'); });
  } else if (!oldName) {
    // New category (no items yet, just add locally)
    if (!_menuCategories.find(function(c) { return c.name === name && c.type === _activeMenuTab; })) {
      _menuCategories.push({ name: name, type: _activeMenuTab });
    }
    closeModal('modal-category');
    renderMenu();
    toast('Category added');
  } else {
    closeModal('modal-category');
  }
}

function editCategory(name, type) {
  if (type) _activeMenuTab = type;
  openCategoryModal(name);
}

function deleteCategory(name, type) {
  var useType = type || _activeMenuTab;
  if (!confirm('Delete this section and all its items?')) return;
  var toDelete = _menuItems.filter(function(i) { return i.categoryName === name && i.itemType === useType; });
  var promises = toDelete.map(function(item) {
    return CC.dashboard.deleteMenuItem(item.id);
  });
  Promise.all(promises).then(function() {
    _menuItems = _menuItems.filter(function(i) { return !(i.categoryName === name && i.itemType === useType); });
    _menuCategories = _menuCategories.filter(function(c) { return !(c.name === name && c.type === useType); });
    renderMenu();
    updateMenuStats();
    toast('Category deleted');
  }).catch(function() { toast('Failed to delete category', 'error'); });
}

// ── Menu Item CRUD ──
function openMenuItemModal(id) {
  document.getElementById('mi-form-name').value = '';
  document.getElementById('mi-form-price').value = '';
  document.getElementById('mi-form-desc').value = '';
  document.getElementById('mi-form-tags').value = '';
  document.getElementById('mi-form-modifiers').value = '';
  document.getElementById('mi-form-id').value = '';
  document.getElementById('mi-form-type').value = _activeMenuTab;
  document.getElementById('menu-item-modal-title').textContent = 'Add ' + MENU_TAB_LABELS[_activeMenuTab] + ' Item';

  // Populate category dropdown — only show sections for current tab
  var select = document.getElementById('mi-form-category');
  select.innerHTML = '';
  var tabCats = _menuCategories.filter(function(c) { return c.type === _activeMenuTab; });
  if (tabCats.length === 0) {
    // auto-create a default section name for this tab
    var defaultCat = _activeMenuTab === 'food' ? 'Menu Items'
                   : _activeMenuTab === 'drink' ? 'Drinks'
                   : 'Happy Hour Deals';
    tabCats = [{ name: defaultCat, type: _activeMenuTab }];
    _menuCategories.push(tabCats[0]);
  }
  tabCats.forEach(function(cat) {
    var opt = document.createElement('option');
    opt.value = cat.name;
    opt.textContent = cat.name;
    select.appendChild(opt);
  });

  if (id) {
    var item = _menuItems.find(function(i) { return String(i.id) === String(id); });
    if (item) {
      document.getElementById('menu-item-modal-title').textContent = 'Edit ' + MENU_TAB_LABELS[item.itemType] + ' Item';
      document.getElementById('mi-form-type').value = item.itemType;
      document.getElementById('mi-form-name').value = item.name;
      document.getElementById('mi-form-price').value = item.price;
      document.getElementById('mi-form-desc').value = item.description || '';
      document.getElementById('mi-form-tags').value = (item.tags || []).join(', ');
      document.getElementById('mi-form-modifiers').value = (item.modifiers || []).map(function(m) {
        return m.name + ' | ' + (parseFloat(m.price) || 0).toFixed(2);
      }).join('\n');
      document.getElementById('mi-form-id').value = item.id;
      // Re-populate select for this item's type
      select.innerHTML = '';
      _menuCategories.filter(function(c) { return c.type === item.itemType; }).forEach(function(cat) {
        var opt = document.createElement('option');
        opt.value = cat.name;
        opt.textContent = cat.name;
        select.appendChild(opt);
      });
      select.value = item.categoryName;
    }
  }

  openModal('modal-menu-item');
}

function saveMenuItem() {
  var name = document.getElementById('mi-form-name').value.trim();
  var price = parseFloat(document.getElementById('mi-form-price').value);
  var categoryName = document.getElementById('mi-form-category').value;

  if (!name) { toast('Item name is required', 'error'); return; }
  if (isNaN(price) || price < 0) { toast('Valid price is required', 'error'); return; }

  var desc = document.getElementById('mi-form-desc').value.trim();
  var tagsStr = document.getElementById('mi-form-tags').value.trim();
  var tags = tagsStr ? tagsStr.split(',').map(function(t) { return t.trim(); }).filter(Boolean) : [];
  var modsStr = document.getElementById('mi-form-modifiers').value.trim();
  var modifiers = [];
  if (modsStr) {
    modsStr.split('\n').forEach(function(line) {
      var parts = line.split('|');
      if (parts.length === 2) {
        modifiers.push({ name: parts[0].trim(), price: parseFloat(parts[1].trim()) || 0 });
      }
    });
  }

  var itemType = document.getElementById('mi-form-type').value || _activeMenuTab;
  var dbPayload = {
    name: name,
    price: price,
    category: categoryName,
    item_type: itemType,
    description: desc,
    tags: tags,
    modifiers: modifiers,
    sort_order: _menuItems.filter(function(i) { return i.categoryName === categoryName && i.itemType === itemType; }).length
  };

  var id = document.getElementById('mi-form-id').value;

  if (id) {
    // Update existing
    CC.dashboard.updateMenuItem(id, dbPayload).then(function(updated) {
      var item = _menuItems.find(function(i) { return String(i.id) === String(id); });
      if (item) {
        item.name = name;
        item.price = price;
        item.categoryName = categoryName;
        item.itemType = itemType;
        item.description = desc;
        item.tags = tags;
        item.modifiers = modifiers;
      }
      closeModal('modal-menu-item');
      renderMenu();
      updateMenuStats();
      toast('Menu item updated');
    }).catch(function() { toast('Failed to save item', 'error'); });
  } else {
    // Create new
    CC.dashboard.createMenuItem(dbPayload).then(function(created) {
      _menuItems.push({
        id: created.id,
        dbId: created.id,
        categoryName: categoryName,
        itemType: itemType,
        name: name,
        price: price,
        description: desc,
        tags: tags,
        modifiers: modifiers,
        photo: '',
        sort_order: dbPayload.sort_order
      });
      closeModal('modal-menu-item');
      renderMenu();
      updateMenuStats();
      toast('Menu item added');
    }).catch(function() { toast('Failed to save item', 'error'); });
  }
}

function editMenuItem(id) {
  openMenuItemModal(id);
}

function deleteMenuItem(id) {
  if (!confirm('Delete this menu item?')) return;
  CC.dashboard.deleteMenuItem(id).then(function() {
    _menuItems = _menuItems.filter(function(i) { return String(i.id) !== String(id); });
    renderMenu();
    updateMenuStats();
    toast('Menu item deleted');
  }).catch(function() { toast('Failed to delete item', 'error'); });
}

function updateMenuStats() {
  var el = document.getElementById('stat-items');
  if (el) el.textContent = _menuItems.length;
}

function renderMenuQR() {
  var siteId = getSiteId();
  var wrap = document.getElementById('menu-qr-wrap');
  if (!wrap) return;
  if (!siteId) {
    wrap.innerHTML = '<p style="color:var(--text-muted);font-size:13px;">Sign in to see your QR code.</p>';
    return;
  }
  var menuUrl = 'https://cybercheck-links.vercel.app/qr-menu.html?site_id=' + encodeURIComponent(siteId);
  var qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=' + encodeURIComponent(menuUrl);
  wrap.innerHTML =
    '<img src="' + qrUrl + '" style="width:140px;height:140px;border-radius:8px;" alt="Menu QR Code"><br>' +
    '<div style="font-size:12px;color:var(--text-muted);margin-top:8px;word-break:break-all;">' +
      '<a href="' + menuUrl + '" target="_blank" style="color:var(--primary);">View Live Menu</a>' +
    '</div>' +
    '<button class="btn btn-outline btn-sm" style="margin-top:8px;" onclick="navigator.clipboard.writeText(\'' + menuUrl.replace(/'/g, "\\'") + '\').then(function(){toast(\'URL copied\')})">Copy URL</button>';
}

// Register page load callback
onPageLoad('menu', loadMenu);

// ── AI Menu Extraction ──────────────────────────────────────────────────────

var _extractedData = null;

function openMenuExtractModal() {
  _extractedData = null;
  document.getElementById('extract-step-upload').style.display = '';
  document.getElementById('extract-step-results').style.display = 'none';
  document.getElementById('extract-preview-wrap').style.display = 'none';
  document.getElementById('extract-preview-img').src = '';
  document.getElementById('extract-file-input').value = '';
  document.getElementById('extract-status').textContent = '';
  document.getElementById('extract-scan-btn').style.display = 'none';
  document.getElementById('extract-import-btn').style.display = 'none';
  loadVisionProviders('extract-provider');
  openModal('modal-menu-extract');
}

// Populates a <select> with the list of configured AI vision providers.
// Remembers the last choice in localStorage so it persists across sessions.
var _visionProvidersCache = null;
async function loadVisionProviders(selectId) {
  var sel = document.getElementById(selectId);
  if (!sel) return;
  try {
    if (!_visionProvidersCache) {
      var token = window.CC && CC.getToken ? CC.getToken() : '';
      var res = await fetch((window.CC_API_BASE || '') + '/api/dashboard/ai/vision-providers', {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      _visionProvidersCache = res.ok ? await res.json() : { providers: [] };
    }
    var saved = localStorage.getItem('cc_ai_provider') || '';
    var html = '<option value="">Auto (' + (_visionProvidersCache.default || 'default') + ')</option>';
    (_visionProvidersCache.providers || []).forEach(function(p) {
      var disabled = p.configured ? '' : ' disabled';
      var suffix   = p.configured ? '' : ' — not configured';
      html += '<option value="' + p.id + '"' + disabled + (p.id === saved ? ' selected' : '') + '>' + p.label + suffix + '</option>';
    });
    sel.innerHTML = html;
    sel.onchange = function() { localStorage.setItem('cc_ai_provider', sel.value || ''); };
  } catch (e) { /* dropdown keeps its single "Auto" option */ }
}

function handleExtractFile(input) {
  var file = input.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    document.getElementById('extract-preview-img').src = e.target.result;
    document.getElementById('extract-preview-wrap').style.display = '';
    document.getElementById('extract-scan-btn').style.display = '';
    document.getElementById('extract-status').textContent = 'Photo ready — click "Scan Menu" to extract items.';
  };
  reader.readAsDataURL(file);
}

async function runMenuExtraction() {
  var input = document.getElementById('extract-file-input');
  var file = input.files[0];
  if (!file) { toast('Please select a photo first', 'error'); return; }

  var btn = document.getElementById('extract-scan-btn');
  btn.disabled = true;
  btn.textContent = 'Scanning...';
  document.getElementById('extract-status').textContent = 'AI is reading your menu — this takes 5-15 seconds...';
  document.getElementById('extract-import-btn').style.display = 'none';
  document.getElementById('extract-step-results').style.display = 'none';

  var base64, sendMime;
  try {
    var compressed = await CC.compressImage(file, 1280, 0.75);
    base64 = compressed.dataUrl;
    sendMime = compressed.mimeType;
  } catch (e) {
    document.getElementById('extract-status').textContent = 'Could not read image (' + (e.message || 'unknown error') + ') — try a different photo.';
    btn.disabled = false;
    btn.textContent = 'Scan Menu';
    return;
  }

  try {
    var token = window.CC && CC.getToken ? CC.getToken() : '';
    var providerSel = document.getElementById('extract-provider');
    var provider = providerSel ? providerSel.value : '';
    var res = await fetch((window.CC_API_BASE || '') + '/api/dashboard/menu/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ image_base64: base64, mime_type: sendMime, provider: provider || undefined })
    });

    var data;
    try { data = await res.json(); }
    catch (_) { data = { error: 'Server returned non-JSON (status ' + res.status + ')' }; }

    if (!res.ok) {
      document.getElementById('extract-status').textContent = 'Error: ' + (data.error || 'Extraction failed');
      btn.disabled = false;
      btn.textContent = 'Scan Menu';
      return;
    }

    _extractedData = data;
    renderExtractPreview(data);
    document.getElementById('extract-step-results').style.display = '';
    document.getElementById('extract-import-btn').style.display = '';

    var total = (data.categories || []).reduce(function(s, c) { return s + (c.items || []).length; }, 0);
    document.getElementById('extract-status').textContent = 'Found ' + total + ' items across ' + (data.categories || []).length + ' categories. Review below, then click Import.';
  } catch (err) {
    document.getElementById('extract-status').textContent = 'Network error — check connection and try again.';
  }

  btn.disabled = false;
  btn.textContent = 'Scan Again';
}

function renderExtractPreview(data) {
  var html = '';
  var inpS = 'width:100%;padding:4px 6px;background:var(--bg);border:1px solid var(--card-border);border-radius:4px;color:var(--text);font-size:13px;box-sizing:border-box;';
  (data.categories || []).forEach(function(cat, ci) {
    html += '<div style="margin-bottom:16px;">';
    html += '<div style="font-weight:600;font-size:14px;padding:6px 0;border-bottom:1px solid var(--card-border);margin-bottom:8px;">';
    html += escHtml(cat.name) + ' <span style="font-weight:400;color:var(--text-muted);">(' + (cat.items || []).length + ' items)</span></div>';
    html += '<table style="width:100%;font-size:13px;border-collapse:collapse;table-layout:fixed;">';
    html += '<thead><tr>' +
      '<th style="text-align:left;padding:4px 6px;color:var(--text-muted);font-weight:500;width:28%;">Item</th>' +
      '<th style="text-align:left;padding:4px 6px;color:var(--text-muted);font-weight:500;width:14%;">Price</th>' +
      '<th style="text-align:left;padding:4px 6px;color:var(--text-muted);font-weight:500;">Description</th>' +
      '<th style="width:36px;"></th>' +
      '</tr></thead>';
    html += '<tbody>';
    (cat.items || []).forEach(function(item, ii) {
      html += '<tr id="ex-row-' + ci + '-' + ii + '" style="border-top:1px solid var(--card-border);">';
      html += '<td style="padding:4px 6px;"><input data-ci="' + ci + '" data-ii="' + ii + '" data-k="name" value="' + escHtml(item.name || '') + '" style="' + inpS + 'font-weight:500;" oninput="updateExtractedField(this)"></td>';
      html += '<td style="padding:4px 6px;"><input type="number" step="0.01" min="0" data-ci="' + ci + '" data-ii="' + ii + '" data-k="price" value="' + (item.price || 0) + '" style="' + inpS + '" oninput="updateExtractedField(this)"></td>';
      html += '<td style="padding:4px 6px;"><input data-ci="' + ci + '" data-ii="' + ii + '" data-k="description" value="' + escHtml(item.description || '') + '" style="' + inpS + 'color:var(--text-muted);" oninput="updateExtractedField(this)"></td>';
      html += '<td style="padding:4px 2px;text-align:center;"><button onclick="deleteExtractedItem(' + ci + ',' + ii + ')" title="Remove" style="background:none;border:none;color:var(--danger);font-size:16px;cursor:pointer;padding:2px 6px;">✕</button></td>';
      html += '</tr>';
    });
    html += '</tbody></table></div>';
  });
  document.getElementById('extract-results-content').innerHTML = html;
}

function updateExtractedField(el) {
  if (!_extractedData || !_extractedData.categories) return;
  var ci = +el.dataset.ci, ii = +el.dataset.ii, k = el.dataset.k;
  var item = _extractedData.categories[ci] && _extractedData.categories[ci].items[ii];
  if (!item) return;
  item[k] = k === 'price' ? parseFloat(el.value) || 0 : el.value;
}

function deleteExtractedItem(ci, ii) {
  if (!_extractedData || !_extractedData.categories) return;
  var cat = _extractedData.categories[ci];
  if (!cat) return;
  cat.items.splice(ii, 1);
  renderExtractPreview(_extractedData);
  var total = _extractedData.categories.reduce(function(s, c) { return s + (c.items || []).length; }, 0);
  document.getElementById('extract-status').textContent = total + ' items remaining — click Import when ready.';
}

async function importExtractedItems() {
  if (!_extractedData || !_extractedData.categories) return;

  var btn = document.getElementById('extract-import-btn');
  btn.disabled = true;
  btn.textContent = 'Importing...';

  var totalItems = 0;
  var errors = 0;

  for (var ci = 0; ci < _extractedData.categories.length; ci++) {
    var cat = _extractedData.categories[ci];
    var catName = (cat.name || 'Menu Items').trim();
    var catType = (['food','drink','happy_hour'].indexOf(cat.item_type) !== -1) ? cat.item_type : _activeMenuTab;

    if (!_menuCategories.find(function(c) { return c.name === catName && c.type === catType; })) {
      _menuCategories.push({ name: catName, type: catType });
    }

    var items = cat.items || [];
    // Merge category-level section_modifiers into each item's modifiers
    var sectionMods = Array.isArray(cat.section_modifiers) ? cat.section_modifiers : [];
    for (var ii = 0; ii < items.length; ii++) {
      var item = items[ii];
      var itemMods = Array.isArray(item.modifiers) ? item.modifiers : [];
      var mergedMods = itemMods.concat(sectionMods).map(function(m) {
        return { name: String(m.name || '').trim(), price: parseFloat(m.price) || 0 };
      }).filter(function(m) { return m.name; });
      var dbPayload = {
        name: item.name || 'Unnamed Item',
        price: parseFloat(item.price) || 0,
        category: catName,
        item_type: catType,
        description: item.description || '',
        tags: Array.isArray(item.tags) ? item.tags : [],
        modifiers: mergedMods,
        sort_order: ii
      };
      try {
        var created = await CC.dashboard.createMenuItem(dbPayload);
        if (created) {
          _menuItems.push({
            id: created.id, dbId: created.id,
            categoryName: catName,
            itemType: catType,
            name: dbPayload.name, price: dbPayload.price,
            description: dbPayload.description,
            tags: dbPayload.tags, modifiers: mergedMods,
            photo: '', sort_order: dbPayload.sort_order
          });
          totalItems++;
        }
      } catch (e) { errors++; }
    }
  }

  closeModal('modal-menu-extract');
  renderMenu();
  updateMenuStats();
  toast('Imported ' + totalItems + ' menu items' + (errors ? ' (' + errors + ' failed)' : ''));
  btn.disabled = false;
  btn.textContent = 'Import to Menu';
}

