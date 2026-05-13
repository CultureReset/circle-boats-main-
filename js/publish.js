// ============================================
// Publish — Publish/unpublish flow + revisions
// ============================================

var _publishStatus = 'draft';
var _publishLastUpdated = null;
var _revisions = [];
var _revisionIdCounter = 0;

function loadPublishStatus() {
  renderPublishStatus();
  renderRevisions();
}

function renderPublishStatus() {
  var badge = document.getElementById('publish-status-badge');
  var lastUpdated = document.getElementById('publish-last-updated');
  var unpublishBtn = document.getElementById('btn-unpublish');
  var statStatus = document.getElementById('stat-status');

  if (_publishStatus === 'published') {
    badge.className = 'badge badge-success';
    badge.textContent = 'Published';
    unpublishBtn.style.display = '';
    if (statStatus) statStatus.textContent = 'Live';
  } else {
    badge.className = 'badge badge-warning';
    badge.textContent = 'Draft';
    unpublishBtn.style.display = 'none';
    if (statStatus) statStatus.textContent = 'Draft';
  }

  if (_publishLastUpdated) {
    lastUpdated.textContent = 'Last updated: ' + new Date(_publishLastUpdated).toLocaleString();
  } else {
    lastUpdated.textContent = 'Never published';
  }
}

async function publishSite() {
  await CC.dashboard.publish();

  _publishStatus = 'published';
  _publishLastUpdated = new Date().toISOString();

  _revisionIdCounter++;
  _revisions.unshift({
    id: _revisionIdCounter,
    timestamp: _publishLastUpdated,
    label: 'Published v' + _revisionIdCounter,
    status: 'published'
  });

  renderPublishStatus();
  renderRevisions();
  toast('Site published to database!');
}

function unpublishSite() {
  if (!confirm('This will take your site offline. Continue?')) return;

  _publishStatus = 'draft';
  _publishLastUpdated = new Date().toISOString();

  _revisionIdCounter++;
  _revisions.unshift({
    id: _revisionIdCounter,
    timestamp: _publishLastUpdated,
    label: 'Unpublished',
    status: 'unpublished'
  });

  renderPublishStatus();
  renderRevisions();
  toast('Site unpublished');
}

function renderRevisions() {
  var container = document.getElementById('revisions-list');
  var emptyState = document.getElementById('revisions-empty');

  if (_revisions.length === 0) {
    container.innerHTML = '';
    emptyState.style.display = '';
    return;
  }

  emptyState.style.display = 'none';

  var html = '<div class="table-wrap"><table><thead><tr><th>Revision</th><th>Date</th><th>Status</th></tr></thead><tbody>';

  _revisions.forEach(function(rev) {
    var statusBadge = rev.status === 'published'
      ? '<span class="badge badge-success">Published</span>'
      : '<span class="badge badge-warning">Unpublished</span>';

    html += '<tr>';
    html += '<td><strong>' + escHtml(rev.label) + '</strong></td>';
    html += '<td style="color:var(--text-muted);font-size:13px;">' + new Date(rev.timestamp).toLocaleString() + '</td>';
    html += '<td>' + statusBadge + '</td>';
    html += '</tr>';
  });

  html += '</tbody></table></div>';
  container.innerHTML = html;
}

function previewSite() {
  // Open the actual beachside site in a new tab
  window.open('../beachside-site/index.html', '_blank');
}

if (typeof escHtml === 'undefined') {
  function escHtml(str) {
    var div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }
}

onPageLoad('publish', loadPublishStatus);
