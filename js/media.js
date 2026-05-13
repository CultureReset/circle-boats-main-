// ============================================
// Media Library — Upload, view, delete files
// ============================================

var _mediaItems = [];
var _mediaIdCounter = 0;
var _selectedMediaId = null;

// No demo files — real media comes from uploads or the API
var _demoMediaFiles = [];

async function loadMedia() {
  // Try API first
  var apiData = await CC.dashboard.getGallery();
  if (apiData && Array.isArray(apiData) && apiData.length > 0) {
    _mediaItems = apiData.map(function(m) {
      return {
        id: m.id, name: m.title || m.file_name || 'file', type: m.type || 'image/jpeg',
        size: m.file_size || 0, url: m.url || '', uploadedAt: m.created_at || '', _apiId: m.id
      };
    });
    _mediaIdCounter = _mediaItems.length;
  } else if (_mediaItems.length === 0) {
    // Seed placeholder data on first load
    _demoMediaFiles.forEach(function(f) {
      _mediaIdCounter++;
      _mediaItems.push({
        id: _mediaIdCounter, name: f.name, type: f.type, size: f.size,
        url: _generatePlaceholderUrl(f.name), uploadedAt: new Date().toISOString()
      });
    });
  }

  renderMediaGrid();
  setupMediaDropZone();
  updateMediaStats();
}

function _generatePlaceholderUrl(name) {
  // Generate a colored SVG placeholder
  var colors = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899'];
  var color = colors[Math.floor(Math.random() * colors.length)];
  var label = name.replace(/\.[^.]+$/, '').substring(0, 12);
  return 'data:image/svg+xml,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">' +
    '<rect width="200" height="200" fill="' + color + '"/>' +
    '<text x="100" y="106" text-anchor="middle" fill="white" font-family="sans-serif" font-size="14">' + label + '</text>' +
    '</svg>'
  );
}

function renderMediaGrid() {
  var grid = document.getElementById('media-grid');

  if (_mediaItems.length === 0) {
    grid.innerHTML = '<div class="empty-state"><h3>No media files</h3><p>Upload images, videos, or documents.</p></div>';
    return;
  }

  var brokenPlaceholder = 'data:image/svg+xml,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">' +
    '<rect width="200" height="200" fill="#1e293b"/>' +
    '<text x="100" y="88" text-anchor="middle" fill="#f59e0b" font-family="sans-serif" font-size="28">⚠</text>' +
    '<text x="100" y="114" text-anchor="middle" fill="#94a3b8" font-family="sans-serif" font-size="11">Unsupported format</text>' +
    '<text x="100" y="132" text-anchor="middle" fill="#64748b" font-family="sans-serif" font-size="10">Delete &amp; re-upload as JPG</text>' +
    '</svg>'
  );

  var html = '';
  _mediaItems.forEach(function(item) {
    html += '<div class="grid-item" onclick="openMediaDetail(' + item.id + ')">';
    html += '<img src="' + item.url + '" alt="' + item.name + '" onerror="this.src=\'' + brokenPlaceholder + '\';this.onerror=null;">';
    html += '<div class="item-info">';
    html += '<h4>' + item.name + '</h4>';
    html += '<p>' + formatFileSize(item.size) + '</p>';
    html += '</div>';
    html += '</div>';
  });

  grid.innerHTML = html;
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function setupMediaDropZone() {
  var dropZone = document.getElementById('media-drop-zone');
  if (!dropZone || dropZone._initialized) return;
  dropZone._initialized = true;

  dropZone.addEventListener('click', function() {
    document.getElementById('media-upload-input').click();
  });

  dropZone.addEventListener('dragover', function(e) {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });

  dropZone.addEventListener('dragleave', function() {
    dropZone.classList.remove('dragover');
  });

  dropZone.addEventListener('drop', function(e) {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
      uploadMedia(e.dataTransfer.files);
    }
  });
}

async function uploadMedia(files) {
  if (!files || files.length === 0) return;

  toast('Uploading ' + files.length + ' file(s)...');
  var uploaded = 0;

  for (var i = 0; i < files.length; i++) {
    var file = files[i];
    var url = await uploadToSupabase(file, 'gallery');
    if (url) {
      _mediaItems.unshift({
        id: 'new-' + Date.now() + '-' + i,
        name: file.name,
        type: file.type,
        size: file.size,
        url: url,
        uploadedAt: new Date().toISOString()
      });
      uploaded++;
    }
  }

  // Reload from DB to get real IDs
  await loadMedia();
  toast(uploaded + ' file(s) uploaded to database');
  document.getElementById('media-upload-input').value = '';
}

function openMediaDetail(id) {
  var item = _mediaItems.find(function(m) { return m.id === id; });
  if (!item) return;

  _selectedMediaId = id;
  document.getElementById('media-detail-img').src = item.url;
  document.getElementById('media-detail-url').value = item.url.substring(0, 80) + '...';
  document.getElementById('media-detail-info').textContent = item.name + ' - ' + formatFileSize(item.size) + ' - Uploaded ' + new Date(item.uploadedAt).toLocaleDateString();
  document.getElementById('media-detail-id').value = id;

  openModal('modal-media-detail');
}

async function deleteMedia() {
  if (!_selectedMediaId) return;

  var item = _mediaItems.find(function(m) { return m.id === _selectedMediaId; });
  // Delete from Supabase Storage + media table
  if (item && item._apiId) {
    await deleteFromSupabase(item._apiId, null);
  } else if (item && item.id) {
    await deleteFromSupabase(item.id, null);
  }

  _mediaItems = _mediaItems.filter(function(m) { return m.id !== _selectedMediaId; });
  _selectedMediaId = null;

  closeModal('modal-media-detail');
  renderMediaGrid();
  updateMediaStats();
  toast('Media file deleted from database');
}

function updateMediaStats() {
  var el = document.getElementById('stat-media');
  if (el) el.textContent = _mediaItems.length;
}

// Register page load callback
onPageLoad('media', function() {
  loadMedia();
});
