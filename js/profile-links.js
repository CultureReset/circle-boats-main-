// =============================================
// LINKTREE-STYLE PROFILE TEMPLATE
// Dynamic data loading and rendering
// =============================================

const API_BASE_URL = '/api';

// Get slug from URL path
function getSlugFromPath() {
    const path = window.location.pathname;
    const match = path.match(/\/profile\/([^\/]+)\/links/);
    return match ? match[1] : null;
}

// Initialize profile
async function initProfile() {
    try {
        const slug = getSlugFromPath();

        if (!slug) {
            showError('Invalid profile URL');
            return;
        }

        // Fetch profile data
        const response = await fetch(`${API_BASE_URL}/public/profile/${slug}`);

        if (!response.ok) {
            throw new Error('Profile not found');
        }

        const result = await response.json();

        if (!result.success || !result.data) {
            throw new Error('Invalid profile data');
        }

        // Render profile
        renderProfile(result.data, slug);

        // Hide loading, show profile
        document.getElementById('loading').style.display = 'none';
        document.getElementById('profile-container').style.display = 'block';

    } catch (error) {
        console.error('Profile load error:', error);
        showError(error.message);
    }
}

// Show error state
function showError(message) {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('error').style.display = 'flex';

    const errorMsg = document.querySelector('.error-content p');
    if (errorMsg && message) {
        errorMsg.textContent = message;
    }
}

// Render profile data
function renderProfile(profile, slug) {
    // Set page title and meta tags
    document.title = `${profile.display_name || profile.business_name} - Links`;
    document.querySelector('meta[name="description"]').content = profile.tagline || profile.description || '';
    document.querySelector('meta[property="og:title"]').content = profile.display_name || profile.business_name;
    document.querySelector('meta[property="og:description"]').content = profile.tagline || profile.description || '';
    document.querySelector('meta[property="og:image"]').content = profile.logo_url || '';

    // Apply theme color
    applyTheme(profile.theme?.color);

    // Render header
    renderHeader(profile);

    // Render primary buttons
    renderPrimaryButtons(profile, slug);

    // Render secondary links
    renderSecondaryLinks(profile, slug);

    // Render social links
    renderSocialLinks(profile.social);
}

// Apply custom theme color
function applyTheme(themeColor) {
    if (!themeColor) return;

    const root = document.documentElement;
    root.style.setProperty('--primary-color', themeColor);

    // Generate hover color (slightly darker)
    const hoverColor = adjustColor(themeColor, -20);
    root.style.setProperty('--primary-hover', hoverColor);

    // Generate light version (for backgrounds)
    const lightColor = adjustColor(themeColor, 90, 0.1);
    root.style.setProperty('--primary-light', lightColor);
}

// Adjust color brightness
function adjustColor(color, amount, alpha = 1) {
    const hex = color.replace('#', '');
    const r = Math.max(0, Math.min(255, parseInt(hex.substr(0, 2), 16) + amount));
    const g = Math.max(0, Math.min(255, parseInt(hex.substr(2, 2), 16) + amount));
    const b = Math.max(0, Math.min(255, parseInt(hex.substr(4, 2), 16) + amount));

    if (alpha < 1) {
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// Render profile header
function renderHeader(profile) {
    // Cover image
    if (profile.cover_image_url) {
        const coverEl = document.getElementById('cover-image');
        coverEl.style.backgroundImage = `url(${profile.cover_image_url})`;
        coverEl.style.opacity = '0.3';
    }

    // Avatar
    const avatarEl = document.getElementById('avatar');
    avatarEl.src = profile.logo_url || '/images/default-avatar.png';
    avatarEl.alt = profile.display_name || profile.business_name;

    // Display name
    document.getElementById('display-name').textContent = profile.display_name || profile.business_name;

    // Tagline
    if (profile.tagline) {
        document.getElementById('tagline').textContent = profile.tagline;
    } else {
        document.getElementById('tagline').style.display = 'none';
    }

    // Location
    if (profile.location?.city && profile.location?.state) {
        document.getElementById('location-text').textContent = `${profile.location.city}, ${profile.location.state}`;
    } else {
        document.getElementById('location').style.display = 'none';
    }

    // Stats
    if (profile.stats) {
        // Rating
        const rating = parseFloat(profile.stats.rating || 0);
        document.getElementById('rating').textContent = rating.toFixed(1);

        // Review count
        const reviewCount = profile.stats.review_count || 0;
        document.getElementById('review-count').textContent = `${reviewCount} ${reviewCount === 1 ? 'review' : 'reviews'}`;

        // Verified badge
        if (profile.stats.verified_reviews > 0) {
            document.getElementById('verified-badge').style.display = 'flex';
        }
    }
}

// Render primary action buttons
function renderPrimaryButtons(profile, slug) {
    // Call button
    if (profile.contact?.phone) {
        const btnCall = document.getElementById('btn-call');
        btnCall.style.display = 'flex';
        btnCall.onclick = () => {
            window.location.href = `tel:${profile.contact.phone}`;
            trackClick('call', slug);
        };
    }

    // Book appointment button (if Voice AI enabled)
    if (profile.features && profile.features.includes('voice_ai_booking')) {
        const btnBook = document.getElementById('btn-book');
        btnBook.style.display = 'flex';
        btnBook.onclick = () => {
            window.location.href = `/book/${slug}`;
            trackClick('book', slug);
        };
    }

    // Leave review button
    const btnReview = document.getElementById('btn-review');
    btnReview.style.display = 'flex';
    btnReview.onclick = () => {
        window.location.href = `/review/${slug}`;
        trackClick('review', slug);
    };
}

// Render secondary links
function renderSecondaryLinks(profile, slug) {
    // Website link
    if (profile.contact?.website) {
        const linkWebsite = document.getElementById('link-website');
        linkWebsite.style.display = 'flex';
        linkWebsite.href = profile.contact.website;
        document.getElementById('website-url').textContent = cleanUrl(profile.contact.website);
        linkWebsite.onclick = () => trackClick('website', slug);
    }

    // Full profile link
    const linkFullProfile = document.getElementById('link-full-profile');
    linkFullProfile.href = `/profile/${slug}`;
    linkFullProfile.onclick = () => trackClick('full_profile', slug);

    // Business card link
    const linkBusinessCard = document.getElementById('link-business-card');
    linkBusinessCard.href = `/profile/${slug}/card`;
    linkBusinessCard.onclick = () => trackClick('business_card', slug);

    // Save contact (VCF download)
    const linkSaveContact = document.getElementById('link-save-contact');
    linkSaveContact.href = `${API_BASE_URL}/public/profile/${slug}/vcard`;
    linkSaveContact.onclick = () => trackClick('save_contact', slug);

    // Email link
    if (profile.contact?.email) {
        const linkEmail = document.getElementById('link-email');
        linkEmail.style.display = 'flex';
        linkEmail.href = `mailto:${profile.contact.email}`;
        document.getElementById('email-address').textContent = profile.contact.email;
        linkEmail.onclick = () => trackClick('email', slug);
    }

    // Directions link
    if (profile.location?.address && profile.location?.city) {
        const linkDirections = document.getElementById('link-directions');
        linkDirections.style.display = 'flex';

        const fullAddress = `${profile.location.address}, ${profile.location.city}, ${profile.location.state} ${profile.location.zip}`;
        document.getElementById('address-text').textContent = `${profile.location.city}, ${profile.location.state}`;

        // Use Google Maps or Apple Maps based on device
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const mapsUrl = isIOS
            ? `maps://maps.apple.com/?q=${encodeURIComponent(fullAddress)}`
            : `https://maps.google.com/?q=${encodeURIComponent(fullAddress)}`;

        linkDirections.href = mapsUrl;
        linkDirections.onclick = () => trackClick('directions', slug);
    }
}

// Render social media links
function renderSocialLinks(social) {
    if (!social) return;

    const socialPlatforms = [
        { id: 'facebook', key: 'facebook', icon: 'fab fa-facebook-f' },
        { id: 'instagram', key: 'instagram', icon: 'fab fa-instagram' },
        { id: 'twitter', key: 'twitter', icon: 'fab fa-twitter' },
        { id: 'linkedin', key: 'linkedin', icon: 'fab fa-linkedin-in' },
        { id: 'youtube', key: 'youtube', icon: 'fab fa-youtube' },
        { id: 'tiktok', key: 'tiktok', icon: 'fab fa-tiktok' }
    ];

    socialPlatforms.forEach(platform => {
        const url = social[platform.key];
        if (url) {
            const el = document.getElementById(`social-${platform.id}`);
            el.style.display = 'flex';
            el.href = url;
            el.onclick = () => trackClick(`social_${platform.id}`, '');
        }
    });
}

// Clean URL for display (remove protocol and trailing slash)
function cleanUrl(url) {
    return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

// Track click events (async, fire-and-forget)
function trackClick(action, slug) {
    try {
        fetch(`${API_BASE_URL}/public/analytics/click`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                slug,
                action,
                template: 'links',
                timestamp: new Date().toISOString()
            })
        }).catch(() => {}); // Ignore errors
    } catch (err) {
        // Silent fail
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initProfile);
