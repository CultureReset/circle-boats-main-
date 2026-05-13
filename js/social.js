// ============================================
// Social Media Management — Posting, Scheduling, Analytics
// ============================================

var _socialAccounts = [];
var _socialPosts = [];
var _socialAnalytics = {};

async function loadSocial() {
  // Load social media data from API
  var apiData = await CC.dashboard.getSocialMedia();
  if (apiData) {
    _socialAccounts = apiData.accounts || [];
    _socialPosts = apiData.posts || [];
    _socialAnalytics = apiData.analytics || {};
  }

  renderSocialAccounts();
  renderSocialPosts();
  renderSocialAnalytics();
}

function renderSocialAccounts() {
  var container = document.getElementById('social-accounts-grid');
  if (!container) return;

  var platforms = [
    { id: 'facebook', name: 'Facebook', icon: 'f', color: '#1877f2' },
    { id: 'instagram', name: 'Instagram', icon: 'IG', color: '#e4405f' },
    { id: 'twitter', name: 'Twitter / X', icon: 'X', color: '#14171a' },
    { id: 'tiktok', name: 'TikTok', icon: 'TT', color: '#000000' },
    { id: 'youtube', name: 'YouTube', icon: 'YT', color: '#ff0000' }
  ];

  var html = '';

  platforms.forEach(function(platform) {
    var account = _socialAccounts.find(function(a) { return a.platform === platform.id; });
    var isConnected = account && account.is_connected;

    html += '<div class="social-account-card">';
    html += '<div class="social-icon" style="background:' + platform.color + ';color:#fff;width:50px;height:50px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:18px;margin:0 auto 12px;">';
    html += platform.icon;
    html += '</div>';
    html += '<div style="font-weight:600;margin-bottom:4px;">' + platform.name + '</div>';

    if (isConnected) {
      html += '<div style="color:var(--success);font-size:13px;margin-bottom:8px;">✓ Connected</div>';
      html += '<div style="font-size:12px;color:var(--text-muted);margin-bottom:8px;">@' + (account.account_name || 'username') + '</div>';
      html += '<button class="btn btn-outline btn-sm" onclick="disconnectSocial(\'' + platform.id + '\')">Disconnect</button>';
    } else {
      html += '<div style="color:var(--text-muted);font-size:13px;margin-bottom:12px;">Not connected</div>';
      html += '<button class="btn btn-primary btn-sm" onclick="connectSocial(\'' + platform.id + '\')">Connect</button>';
    }

    html += '</div>';
  });

  container.innerHTML = html;
}

function connectSocial(platform) {
  // OAuth flow to connect social media account
  var authUrls = {
    facebook: 'https://www.facebook.com/v12.0/dialog/oauth',
    instagram: 'https://api.instagram.com/oauth/authorize',
    twitter: 'https://twitter.com/i/oauth2/authorize',
    tiktok: 'https://www.tiktok.com/auth/authorize/',
    youtube: 'https://accounts.google.com/o/oauth2/v2/auth'
  };

  var url = authUrls[platform];
  if (!url) {
    toast('Platform not yet supported', 'info');
    return;
  }

  // TODO: Implement full OAuth flow with backend
  toast('Opening ' + platform + ' authorization...', 'info');

  // For now, simulate connection
  setTimeout(function() {
    toast(platform + ' connected!');
    loadSocial();
  }, 1500);
}

async function disconnectSocial(platform) {
  if (!confirm('Disconnect ' + platform + '?')) return;

  await CC.dashboard.disconnectSocialAccount(platform);
  toast('Account disconnected');
  loadSocial();
}

function renderSocialPosts() {
  var container = document.getElementById('social-posts-list');
  if (!container) return;

  if (_socialPosts.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted);">';
    container.innerHTML += '<p>No posts yet</p>';
    container.innerHTML += '<button class="btn btn-primary" onclick="openPostComposer()">Create First Post</button>';
    container.innerHTML += '</div>';
    return;
  }

  var html = '<div class="table-wrap"><table>';
  html += '<thead><tr><th>Post</th><th>Platforms</th><th>Status</th><th>Scheduled</th><th>Actions</th></tr></thead><tbody>';

  _socialPosts.forEach(function(post) {
    html += '<tr>';
    html += '<td><div style="max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + escHtml(post.post_text) + '</div></td>';
    html += '<td>';
    (post.platforms || []).forEach(function(platform) {
      html += '<span class="badge badge-neutral" style="margin-right:4px;">' + platform + '</span>';
    });
    html += '</td>';
    html += '<td>';
    if (post.status === 'published') html += '<span class="badge badge-success">Published</span>';
    else if (post.status === 'scheduled') html += '<span class="badge badge-info">Scheduled</span>';
    else if (post.status === 'failed') html += '<span class="badge badge-danger">Failed</span>';
    else html += '<span class="badge badge-neutral">Draft</span>';
    html += '</td>';
    html += '<td style="color:var(--text-muted);font-size:13px;">';
    if (post.scheduled_for) {
      html += new Date(post.scheduled_for).toLocaleString();
    } else if (post.published_at) {
      html += new Date(post.published_at).toLocaleString();
    } else {
      html += '-';
    }
    html += '</td>';
    html += '<td>';
    if (post.status === 'draft' || post.status === 'scheduled') {
      html += '<button class="btn btn-outline btn-sm" onclick="editPost(\'' + post.id + '\')">Edit</button> ';
      html += '<button class="btn btn-danger btn-sm" onclick="deletePost(\'' + post.id + '\')">Delete</button>';
    } else {
      html += '<button class="btn btn-outline btn-sm" onclick="viewPostStats(\'' + post.id + '\')">Stats</button>';
    }
    html += '</td>';
    html += '</tr>';
  });

  html += '</tbody></table></div>';
  container.innerHTML = html;
}

function openPostComposer(postId) {
  var modal = document.getElementById('modal-post-composer');
  if (!modal) return;

  // Reset form
  document.getElementById('post-id').value = '';
  document.getElementById('post-text').value = '';
  document.getElementById('post-media-urls').value = '';
  document.getElementById('post-schedule-type').value = 'now';
  document.getElementById('post-schedule-datetime').value = '';
  document.getElementById('post-schedule-datetime').style.display = 'none';

  // Reset platform checkboxes
  document.querySelectorAll('.platform-checkbox').forEach(function(cb) {
    cb.checked = false;
  });

  if (postId) {
    var post = _socialPosts.find(function(p) { return p.id === postId; });
    if (post) {
      document.getElementById('post-id').value = post.id;
      document.getElementById('post-text').value = post.post_text || '';
      document.getElementById('post-media-urls').value = (post.media_urls || []).join('\n');

      (post.platforms || []).forEach(function(platform) {
        var cb = document.getElementById('platform-' + platform);
        if (cb) cb.checked = true;
      });

      if (post.scheduled_for) {
        document.getElementById('post-schedule-type').value = 'schedule';
        document.getElementById('post-schedule-datetime').value = new Date(post.scheduled_for).toISOString().slice(0, 16);
        document.getElementById('post-schedule-datetime').style.display = 'block';
      }
    }
  }

  openModal('modal-post-composer');
  updateCharCount();
}

function editPost(postId) {
  openPostComposer(postId);
}

async function deletePost(postId) {
  if (!confirm('Delete this post?')) return;

  await CC.dashboard.deleteSocialPost(postId);
  toast('Post deleted');
  loadSocial();
}

function updateCharCount() {
  var text = document.getElementById('post-text').value;
  var count = text.length;
  var counter = document.getElementById('char-count');
  if (counter) {
    counter.textContent = count + ' / 280';
    if (count > 280) {
      counter.style.color = 'var(--danger)';
    } else {
      counter.style.color = 'var(--text-muted)';
    }
  }
}

function toggleScheduleDateTime() {
  var type = document.getElementById('post-schedule-type').value;
  var datetime = document.getElementById('post-schedule-datetime');
  datetime.style.display = type === 'schedule' ? 'block' : 'none';
}

async function savePost() {
  var postText = document.getElementById('post-text').value.trim();
  if (!postText) {
    toast('Post text is required', 'error');
    return;
  }

  var platforms = [];
  document.querySelectorAll('.platform-checkbox:checked').forEach(function(cb) {
    platforms.push(cb.value);
  });

  if (platforms.length === 0) {
    toast('Select at least one platform', 'error');
    return;
  }

  var mediaUrls = document.getElementById('post-media-urls').value
    .split('\n')
    .map(function(url) { return url.trim(); })
    .filter(function(url) { return url.length > 0; });

  var scheduleType = document.getElementById('post-schedule-type').value;
  var scheduledFor = null;
  if (scheduleType === 'schedule') {
    scheduledFor = document.getElementById('post-schedule-datetime').value;
    if (!scheduledFor) {
      toast('Schedule date/time is required', 'error');
      return;
    }
  }

  var postData = {
    post_text: postText,
    media_urls: mediaUrls,
    platforms: platforms,
    scheduled_for: scheduledFor,
    status: scheduleType === 'now' ? 'publishing' : 'scheduled'
  };

  var postId = document.getElementById('post-id').value;
  if (postId) {
    await CC.dashboard.updateSocialPost(postId, postData);
    toast('Post updated');
  } else {
    await CC.dashboard.createSocialPost(postData);
    toast(scheduleType === 'now' ? 'Publishing post...' : 'Post scheduled');
  }

  closeModal('modal-post-composer');
  loadSocial();
}

function renderSocialAnalytics() {
  var container = document.getElementById('social-analytics-grid');
  if (!container) return;

  var platforms = ['facebook', 'instagram', 'twitter', 'tiktok'];
  var html = '';

  platforms.forEach(function(platform) {
    var stats = _socialAnalytics[platform] || { followers: 0, posts: 0, engagement: 0 };

    html += '<div class="social-stats-card">';
    html += '<div style="font-weight:600;margin-bottom:12px;text-transform:capitalize;">' + platform + '</div>';
    html += '<div style="display:flex;flex-direction:column;gap:8px;">';
    html += '<div><span style="color:var(--text-muted);font-size:12px;">Followers:</span> <strong>' + (stats.followers || 0) + '</strong></div>';
    html += '<div><span style="color:var(--text-muted);font-size:12px;">Posts this month:</span> <strong>' + (stats.posts || 0) + '</strong></div>';
    html += '<div><span style="color:var(--text-muted);font-size:12px;">Engagement rate:</span> <strong>' + (stats.engagement || 0).toFixed(1) + '%</strong></div>';
    html += '</div></div>';
  });

  container.innerHTML = html;
}

function viewPostStats(postId) {
  var post = _socialPosts.find(function(p) { return p.id === postId; });
  if (!post) return;

  var stats = post.engagement_stats || {};
  var html = '<div style="padding:20px;">';
  html += '<h3 style="margin-bottom:16px;">Post Engagement</h3>';
  html += '<div style="display:grid;gap:12px;">';

  Object.keys(stats).forEach(function(platform) {
    var platformStats = stats[platform] || {};
    html += '<div style="padding:12px;background:var(--card-bg);border:1px solid var(--card-border);border-radius:var(--radius);">';
    html += '<div style="font-weight:600;margin-bottom:8px;text-transform:capitalize;">' + platform + '</div>';
    html += '<div style="display:flex;gap:16px;font-size:13px;">';
    html += '<div>Likes: ' + (platformStats.likes || 0) + '</div>';
    html += '<div>Comments: ' + (platformStats.comments || 0) + '</div>';
    html += '<div>Shares: ' + (platformStats.shares || 0) + '</div>';
    html += '</div></div>';
  });

  html += '</div></div>';

  document.getElementById('post-stats-content').innerHTML = html;
  openModal('modal-post-stats');
}

onPageLoad('social', loadSocial);
