/**
 * Social Media Feed Widget
 * Displays Facebook & Instagram posts on public profile pages
 */

// =============================================
// Configuration
// =============================================

const API_BASE = window.location.hostname === 'localhost'
  ? 'https://cybercheck-api-database.vercel.app/api'
  : '/api';

// =============================================
// State
// =============================================

const state = {
  businessSlug: null,
  posts: [],
  loading: false,
  error: null,
  limit: 12
};

// =============================================
// Initialize
// =============================================

export async function initSocialFeed(businessSlug, options = {}) {
  state.businessSlug = businessSlug;
  state.limit = options.limit || 12;

  await loadPosts();
  renderFeed();
}

// =============================================
// Load Posts from API
// =============================================

async function loadPosts() {
  if (!state.businessSlug) {
    console.error('Business slug not provided');
    return;
  }

  try {
    state.loading = true;
    showLoadingState();

    const url = `${API_BASE}/social-media/public/${state.businessSlug}/posts?limit=${state.limit}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    state.posts = data.data || [];
    state.error = null;

    console.log(`✓ Loaded ${state.posts.length} social media posts`);
  } catch (error) {
    console.error('Error loading social media posts:', error);
    state.error = error.message;
    state.posts = [];
  } finally {
    state.loading = false;
  }
}

// =============================================
// Render Feed
// =============================================

function renderFeed() {
  const container = document.getElementById('socialPostsGrid');
  if (!container) {
    console.warn('Social posts grid container not found');
    return;
  }

  // If no posts, hide the entire social section
  if (state.posts.length === 0 && !state.error) {
    const socialSection = document.getElementById('socialFeed');
    if (socialSection) {
      socialSection.style.display = 'none';
    }
    return;
  }

  // Show error state
  if (state.error) {
    container.innerHTML = `
      <div class="feed-error-state">
        <div class="error-icon">⚠️</div>
        <p>Unable to load social media posts</p>
      </div>
    `;
    return;
  }

  // Render posts
  container.innerHTML = state.posts.map(post => renderPost(post)).join('');
}

function renderPost(post) {
  const platformConfig = {
    facebook: {
      icon: `<svg class="post-platform-icon" width="20" height="20" viewBox="0 0 24 24" fill="#1877F2">
        <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/>
      </svg>`,
      color: '#1877F2',
      linkText: 'View on Facebook'
    },
    instagram: {
      icon: `<svg class="post-platform-icon" width="20" height="20" viewBox="0 0 24 24" fill="#E4405F">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
        <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" fill="white"/>
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" stroke="white" stroke-width="2"/>
      </svg>`,
      color: '#E4405F',
      linkText: 'View on Instagram'
    }
  };

  const config = platformConfig[post.platform] || platformConfig.facebook;
  const hasMedia = post.media_url && post.media_url !== '';
  const postText = post.message || post.caption || '';
  const accountName = post.account_name || (post.platform === 'facebook' ? 'Facebook Page' : 'Instagram');

  // Calculate engagement total
  const totalEngagement = (post.likes_count || 0) + (post.comments_count || 0);

  return `
    <div class="social-post ${post.platform}-post" data-post-id="${post.id}">
      <div class="post-header">
        <div class="post-author-info">
          ${config.icon}
          <div class="post-meta">
            <div class="post-author">${escapeHtml(accountName)}</div>
            <div class="post-time">${formatTimeAgo(post.posted_at)}</div>
          </div>
        </div>
        ${post.permalink ? `
          <a href="${escapeHtml(post.permalink)}" target="_blank" rel="noopener noreferrer" class="post-link-icon" title="${config.linkText}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
              <polyline points="15 3 21 3 21 9"/>
              <line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
          </a>
        ` : ''}
      </div>

      ${hasMedia ? `
        <div class="post-image">
          <img src="${escapeHtml(post.media_url)}"
               alt="${post.platform} post"
               loading="lazy"
               onerror="this.parentElement.style.display='none'">
        </div>
      ` : ''}

      ${postText ? `
        <div class="post-content">
          <div class="post-caption">${formatPostText(postText)}</div>
        </div>
      ` : ''}

      ${totalEngagement > 0 ? `
        <div class="post-engagement">
          ${post.likes_count > 0 ? `<span>❤️ ${formatNumber(post.likes_count)}</span>` : ''}
          ${post.comments_count > 0 ? `<span>💬 ${formatNumber(post.comments_count)}</span>` : ''}
          ${post.shares_count > 0 ? `<span>🔗 ${formatNumber(post.shares_count)}</span>` : ''}
        </div>
      ` : ''}
    </div>
  `;
}

function showLoadingState() {
  const container = document.getElementById('socialPostsGrid');
  if (!container) return;

  container.innerHTML = `
    <div class="feed-loading-state">
      <div class="loading-spinner"></div>
      <p>Loading social media posts...</p>
    </div>
  `;
}

// =============================================
// Utilities
// =============================================

function formatTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return num.toString();
}

function formatPostText(text) {
  if (!text) return '';

  // Limit text length for preview
  const maxLength = 250;
  let displayText = text.length > maxLength
    ? text.substring(0, maxLength) + '...'
    : text;

  // Convert hashtags to styled spans
  displayText = displayText.replace(/#(\w+)/g, '<span class="hashtag">#$1</span>');

  // Convert @mentions to styled spans
  displayText = displayText.replace(/@(\w+)/g, '<span class="mention">@$1</span>');

  // Convert line breaks to <br>
  displayText = displayText.replace(/\n/g, '<br>');

  return displayText;
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// =============================================
// Refresh Function (for future use)
// =============================================

export async function refreshFeed() {
  await loadPosts();
  renderFeed();
}

// =============================================
// Export for global access
// =============================================

window.socialMediaFeed = {
  init: initSocialFeed,
  refresh: refreshFeed
};

console.log('%c✓ Social Media Feed Widget Loaded', 'font-size: 14px; font-weight: bold; color: #667eea;');
