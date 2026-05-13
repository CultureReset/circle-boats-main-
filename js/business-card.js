// ============================================
// Digital Business Card JavaScript (API-Connected)
// ============================================

const API_BASE_URL = window.location.hostname === 'localhost'
  ? 'https://cybercheck-api-database.vercel.app/api'
  : '/api';

let businessData = null;
let businessSlug = null;

// ============================================
// Initialize - Load Business Data
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
  // Get slug from URL (e.g., /profile/business-card.html?slug=sandbar)
  const urlParams = new URLSearchParams(window.location.search);
  businessSlug = urlParams.get('slug');

  // If no slug in query, check if URL path contains it (e.g., /profile/sandbar)
  if (!businessSlug) {
    const pathParts = window.location.pathname.split('/');
    if (pathParts.length >= 3 && pathParts[1] === 'profile') {
      businessSlug = pathParts[2].replace('.html', '');
    }
  }

  // Fallback for development
  if (!businessSlug || businessSlug === 'business-card') {
    businessSlug = 'sandbar'; // Default for testing
  }

  console.log('Loading business card for slug:', businessSlug);

  // Show loading state
  showLoading();

  try {
    // Fetch business profile data
    const response = await fetch(`${API_BASE_URL}/public/profile/${businessSlug}`);

    if (!response.ok) {
      throw new Error(`Profile not found: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success || !data.data) {
      throw new Error('Invalid profile data');
    }

    businessData = data.data;
    console.log('Business data loaded:', businessData);

    // Populate the page with business data
    populateBusinessCard();

  } catch (error) {
    console.error('Failed to load business data:', error);
    showError('Unable to load business card. Please try again later.');
  }
});

// ============================================
// Populate Business Card with Data
// ============================================

function populateBusinessCard() {
  const {
    display_name,
    business_name,
    tagline,
    logo_url,
    contact,
    location,
    social
  } = businessData;

  // Update page title
  document.title = `${display_name || business_name} - Digital Business Card`;

  // Update card avatar
  const avatar = document.querySelector('.card-avatar img');
  if (avatar && logo_url) {
    avatar.src = logo_url;
    avatar.alt = display_name || business_name;
  }

  // Update card name
  const cardName = document.querySelector('.card-name');
  if (cardName) {
    cardName.textContent = display_name || business_name;
  }

  // Update tagline
  const cardTitle = document.querySelector('.card-title');
  if (cardTitle && tagline) {
    cardTitle.textContent = tagline;
  }

  // Update location
  const cardLocation = document.querySelector('.card-location');
  if (cardLocation && location) {
    const cityState = [location.city, location.state].filter(Boolean).join(', ');
    if (cityState) {
      cardLocation.textContent = `📍 ${cityState}`;
    }
  }

  // Update contact info
  updateContactInfo();

  // Update social links
  updateSocialLinks();

  // Hide loading, show card
  hideLoading();
}

// ============================================
// Update Contact Info Section
// ============================================

function updateContactInfo() {
  const { contact, location } = businessData;
  const contactInfo = document.querySelector('.card-contact-info');

  if (!contactInfo) return;

  // Build contact items HTML
  let html = '';

  // Phone
  if (contact.phone) {
    const formattedPhone = formatPhoneDisplay(contact.phone);
    html += `
      <a href="tel:${contact.phone}" class="contact-item">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
          <path d="M2 3C2 2.44772 2.44772 2 3 2H5.15287C5.64171 2 6.0589 2.35341 6.13927 2.8356L6.87858 7.27147C6.95075 7.70451 6.73206 8.13397 6.3394 8.3303L4.79126 9.10437C5.90756 11.8783 8.12168 14.0924 10.8956 15.2087L11.6697 13.6606C11.866 13.2679 12.2955 13.0492 12.7285 13.1214L17.1644 13.8607C17.6466 13.9411 18 14.3583 18 14.8471V17C18 17.5523 17.5523 18 17 18H15C7.8203 18 2 12.1797 2 5V3Z"/>
        </svg>
        <span>${formattedPhone}</span>
      </a>
    `;
  }

  // Email
  if (contact.email) {
    html += `
      <a href="mailto:${contact.email}" class="contact-item">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
          <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
          <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
        </svg>
        <span>${contact.email}</span>
      </a>
    `;
  }

  // Website
  if (contact.website) {
    const displayWebsite = contact.website.replace(/^https?:\/\//, '');
    html += `
      <a href="${contact.website}" target="_blank" rel="noopener" class="contact-item">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.73 6.974 6 7.5 6A1.5 1.5 0 019 7.5V8a2 2 0 004 0 2 2 0 011.523-1.943A5.977 5.977 0 0116 10c0 .34-.028.675-.083 1H15a2 2 0 00-2 2v2.197A5.973 5.973 0 0110 16v-2a2 2 0 00-2-2 2 2 0 01-2-2 2 2 0 00-1.668-1.973z"/>
        </svg>
        <span>${displayWebsite}</span>
      </a>
    `;
  }

  // Address
  if (location.address) {
    const fullAddress = [
      location.address,
      location.city,
      location.state,
      location.zip
    ].filter(Boolean).join(', ');

    html += `
      <div class="contact-item">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"/>
        </svg>
        <span>${fullAddress}</span>
      </div>
    `;
  }

  contactInfo.innerHTML = html;
}

// ============================================
// Update Social Links
// ============================================

function updateSocialLinks() {
  const { social } = businessData;
  const socialLinks = document.querySelector('.social-links');

  if (!socialLinks) return;

  let html = '';

  // Instagram
  if (social.instagram) {
    html += `
      <a href="${social.instagram}" target="_blank" rel="noopener" class="social-btn" title="Instagram">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
          <circle cx="12" cy="12" r="4" fill="white"/>
        </svg>
      </a>
    `;
  }

  // Facebook
  if (social.facebook) {
    html += `
      <a href="${social.facebook}" target="_blank" rel="noopener" class="social-btn" title="Facebook">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      </a>
    `;
  }

  // Twitter
  if (social.twitter) {
    html += `
      <a href="${social.twitter}" target="_blank" rel="noopener" class="social-btn" title="Twitter">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"/>
        </svg>
      </a>
    `;
  }

  // LinkedIn
  if (social.linkedin) {
    html += `
      <a href="${social.linkedin}" target="_blank" rel="noopener" class="social-btn" title="LinkedIn">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
        </svg>
      </a>
    `;
  }

  if (html) {
    socialLinks.innerHTML = html;
  } else {
    socialLinks.style.display = 'none';
  }
}

// ============================================
// Save Contact (vCard) - Use API
// ============================================

async function saveContact() {
  if (!businessSlug) {
    showToast('Unable to save contact. Please try again.', 'error');
    return;
  }

  try {
    // Download VCF file from API
    const response = await fetch(`${API_BASE_URL}/public/profile/${businessSlug}/vcard`);

    if (!response.ok) {
      throw new Error('Failed to generate contact card');
    }

    // Get the VCF content
    const vcfContent = await response.text();

    // Create download link
    const blob = new Blob([vcfContent], { type: 'text/vcard' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${businessData.slug || 'contact'}.vcf`;

    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // Show success toast
    showToast('Contact saved! Check your downloads', 'success');

    console.log('Contact card downloaded for:', businessData.display_name);

  } catch (error) {
    console.error('Error downloading contact card:', error);
    showToast('Unable to save contact. Please try again.', 'error');
  }
}

// ============================================
// Contact Form Submission
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  const contactForm = document.getElementById('contactForm');

  if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const formData = {
        name: document.getElementById('name').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        email: document.getElementById('email').value.trim(),
        notes: document.getElementById('notes')?.value.trim() || '',
        sms_opt_in: document.getElementById('sms')?.checked || false,
        source: 'business_card',
        business_slug: businessSlug
      };

      console.log('Form submitted:', formData);

      // Show loading state
      const submitBtn = e.target.querySelector('.btn-submit');
      const originalText = submitBtn.innerHTML;
      submitBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin">
          <circle cx="12" cy="12" r="10"/>
        </svg>
        Sending...
      `;
      submitBtn.disabled = true;

      try {
        // Send to backend API (create contact as lead)
        await sendContactInfo(formData);

        // Hide form, show success
        contactForm.style.display = 'none';
        const successMessage = document.getElementById('successMessage');
        if (successMessage) {
          successMessage.style.display = 'block';
        }

        // Track conversion
        console.log('Contact form conversion:', formData.name);

      } catch (error) {
        console.error('Error submitting form:', error);
        showToast('Oops! Something went wrong. Please try again.', 'error');

        // Restore button
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
      }
    });
  }
});

// ============================================
// Send Contact Info to Backend
// ============================================

async function sendContactInfo(data) {
  // TODO: Implement contact/lead creation endpoint
  // For now, simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log('Contact info saved to database:', data);
      resolve();
    }, 1500);
  });

  /* When backend endpoint is ready:
  const response = await fetch(`${API_BASE_URL}/public/contacts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    throw new Error('Failed to submit contact info');
  }

  return response.json();
  */
}

// ============================================
// Share Card
// ============================================

async function shareCard() {
  const shareData = {
    title: businessData.display_name || businessData.business_name,
    text: `Check out ${businessData.display_name || businessData.business_name}${businessData.tagline ? ` - ${businessData.tagline}` : ''}`,
    url: window.location.href
  };

  try {
    // Try native share API (mobile)
    if (navigator.share) {
      await navigator.share(shareData);
      showToast('Thanks for sharing!', 'success');
    } else {
      // Fallback: copy link
      await navigator.clipboard.writeText(window.location.href);
      showToast('Link copied to clipboard!', 'success');
    }
  } catch (error) {
    if (error.name !== 'AbortError') {
      console.error('Share failed:', error);
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(window.location.href);
        showToast('Link copied to clipboard!', 'success');
      } catch (e) {
        showToast('Unable to share. Please copy the URL manually.', 'error');
      }
    }
  }
}

// ============================================
// Utility Functions
// ============================================

function formatPhoneDisplay(phone) {
  // Convert +12515550123 to (251) 555-0123
  const cleaned = phone.replace(/\D/g, '');

  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    const areaCode = cleaned.slice(1, 4);
    const prefix = cleaned.slice(4, 7);
    const line = cleaned.slice(7);
    return `(${areaCode}) ${prefix}-${line}`;
  } else if (cleaned.length === 10) {
    const areaCode = cleaned.slice(0, 3);
    const prefix = cleaned.slice(3, 6);
    const line = cleaned.slice(6);
    return `(${areaCode}) ${prefix}-${line}`;
  }

  return phone;
}

function showLoading() {
  const card = document.querySelector('.business-card');
  if (card) {
    card.style.opacity = '0.5';
    card.style.pointerEvents = 'none';
  }
}

function hideLoading() {
  const card = document.querySelector('.business-card');
  if (card) {
    card.style.opacity = '1';
    card.style.pointerEvents = 'auto';
  }
}

function showError(message) {
  const card = document.querySelector('.business-card');
  if (card) {
    card.innerHTML = `
      <div style="text-align: center; padding: 40px 20px;">
        <h2 style="color: #EF4444; margin-bottom: 16px;">⚠️ Error</h2>
        <p style="color: #666;">${message}</p>
      </div>
    `;
  }
}

// ============================================
// Toast Notifications
// ============================================

function showToast(message, type = 'info') {
  const existingToast = document.querySelector('.toast');
  if (existingToast) existingToast.remove();

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;

  const colors = {
    success: '#10B981',
    error: '#EF4444',
    info: '#667eea'
  };

  toast.style.cssText = `
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    background: ${colors[type] || colors.info};
    color: white;
    padding: 14px 24px;
    border-radius: 12px;
    font-size: 15px;
    font-weight: 500;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
    z-index: 10000;
    animation: slideInUp 0.3s ease-out;
    max-width: 90%;
    text-align: center;
  `;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(10px)';
    toast.style.transition = 'all 0.3s ease-out';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ============================================
// Phone Number Formatting (Input Field)
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  const phoneInput = document.getElementById('phone');

  if (phoneInput) {
    phoneInput.addEventListener('input', (e) => {
      let value = e.target.value.replace(/\D/g, '');

      if (value.length >= 10) {
        value = `(${value.slice(0, 3)}) ${value.slice(3, 6)}-${value.slice(6, 10)}`;
      } else if (value.length >= 6) {
        value = `(${value.slice(0, 3)}) ${value.slice(3, 6)}-${value.slice(6)}`;
      } else if (value.length >= 3) {
        value = `(${value.slice(0, 3)}) ${value.slice(3)}`;
      }

      e.target.value = value;
    });
  }
});

// ============================================
// Console Log
// ============================================

console.log('%cDigital Business Card Ready (API-Connected)', 'font-size: 16px; font-weight: bold; color: #667eea;');
