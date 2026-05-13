// =============================================
// PROFILE TEMPLATES DASHBOARD
// Manage template links, QR codes, and analytics
// =============================================

const API_BASE_URL = '/api';
let currentBusiness = null;
let currentQRTemplate = null;

// Initialize page
async function initPage() {
    try {
        // Get current business from auth
        const business = await getCurrentBusiness();
        if (!business) {
            window.location.href = '/pages/auth/login.html';
            return;
        }

        currentBusiness = business;

        // Load analytics
        await loadTemplateAnalytics();

        // Set up event listeners
        setupEventListeners();

    } catch (error) {
        console.error('Init error:', error);
        showError('Failed to load template data');
    }
}

// Get current business from auth
async function getCurrentBusiness() {
    try {
        const token = localStorage.getItem('authToken');
        if (!token) return null;

        const response = await fetch(`${API_BASE_URL}/auth/me`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) return null;

        const result = await response.json();
        return result.data?.business;

    } catch (error) {
        console.error('Get business error:', error);
        return null;
    }
}

// Load template analytics
async function loadTemplateAnalytics() {
    try {
        if (!currentBusiness?.slug) return;

        // For now, use view_count from profile
        // In future, fetch from profile_analytics table
        const response = await fetch(`${API_BASE_URL}/public/profile/${currentBusiness.slug}`);

        if (!response.ok) return;

        const result = await response.json();
        const stats = result.data?.stats || {};

        // Update stats display
        updateStatDisplay('links-views', stats.views || 0);
        updateStatDisplay('card-views', Math.floor((stats.views || 0) * 0.3)); // Estimate
        updateStatDisplay('full-views', Math.floor((stats.views || 0) * 0.5)); // Estimate

        updateStatDisplay('links-clicks', stats.contacts || 0);
        updateStatDisplay('card-clicks', Math.floor((stats.contacts || 0) * 0.2)); // Estimate
        updateStatDisplay('full-clicks', Math.floor((stats.contacts || 0) * 0.3)); // Estimate

    } catch (error) {
        console.error('Load analytics error:', error);
    }
}

// Update stat display
function updateStatDisplay(statKey, value) {
    const el = document.querySelector(`[data-stat="${statKey}"]`);
    if (el) {
        el.textContent = formatNumber(value);
    }
}

// Format number with commas
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Set up event listeners
function setupEventListeners() {
    // Preview buttons
    document.querySelectorAll('[data-action="preview"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const template = e.currentTarget.dataset.template;
            previewTemplate(template);
        });
    });

    // Copy link buttons
    document.querySelectorAll('[data-action="copy-link"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const template = e.currentTarget.dataset.template;
            copyTemplateLink(template);
        });
    });

    // QR code buttons
    document.querySelectorAll('[data-action="qr-code"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const template = e.currentTarget.dataset.template;
            showQRCode(template);
        });
    });
}

// Preview template
function previewTemplate(template) {
    if (!currentBusiness?.slug) {
        showError('Business slug not found');
        return;
    }

    const urls = {
        links: `/profile/${currentBusiness.slug}/links`,
        card: `/profile/${currentBusiness.slug}/card`,
        full: `/profile/${currentBusiness.slug}`
    };

    const url = urls[template];
    if (url) {
        window.open(url, '_blank');
    }
}

// Copy template link
async function copyTemplateLink(template) {
    if (!currentBusiness?.slug) {
        showError('Business slug not found');
        return;
    }

    const baseUrl = window.location.origin;
    const urls = {
        links: `${baseUrl}/profile/${currentBusiness.slug}/links`,
        card: `${baseUrl}/profile/${currentBusiness.slug}/card`,
        full: `${baseUrl}/profile/${currentBusiness.slug}`
    };

    const url = urls[template];
    if (!url) return;

    try {
        await navigator.clipboard.writeText(url);
        showSuccess('Link copied to clipboard!');

        // Visual feedback on button
        const btn = document.querySelector(`[data-action="copy-link"][data-template="${template}"]`);
        if (btn) {
            const originalHTML = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-check"></i> Copied!';
            setTimeout(() => {
                btn.innerHTML = originalHTML;
            }, 2000);
        }

    } catch (error) {
        console.error('Copy error:', error);
        showError('Failed to copy link');
    }
}

// Show QR code
async function showQRCode(template) {
    if (!currentBusiness?.slug) {
        showError('Business slug not found');
        return;
    }

    const baseUrl = window.location.origin;
    const urls = {
        links: `${baseUrl}/profile/${currentBusiness.slug}/links`,
        card: `${baseUrl}/profile/${currentBusiness.slug}/card`,
        full: `${baseUrl}/profile/${currentBusiness.slug}`
    };

    const url = urls[template];
    if (!url) return;

    try {
        // Generate QR code using external service
        const qrSize = 400;
        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&data=${encodeURIComponent(url)}`;

        // Update modal
        document.getElementById('qr-code-display').innerHTML = `<img src="${qrCodeUrl}" alt="QR Code">`;
        document.getElementById('qr-url').textContent = url;

        // Show modal
        document.getElementById('qr-modal').style.display = 'flex';
        currentQRTemplate = { template, url, qrCodeUrl };

    } catch (error) {
        console.error('QR code error:', error);
        showError('Failed to generate QR code');
    }
}

// Close QR modal
window.closeQRModal = function() {
    document.getElementById('qr-modal').style.display = 'none';
    currentQRTemplate = null;
};

// Download QR code
window.downloadQRCode = async function() {
    if (!currentQRTemplate) return;

    try {
        const response = await fetch(currentQRTemplate.qrCodeUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `${currentBusiness.slug}-${currentQRTemplate.template}-qrcode.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        showSuccess('QR code downloaded!');

    } catch (error) {
        console.error('Download error:', error);
        showError('Failed to download QR code');
    }
};

// Print QR code
window.printQRCode = function() {
    if (!currentQRTemplate) return;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>QR Code - ${currentBusiness.business_name}</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    text-align: center;
                    padding: 2rem;
                }
                h1 {
                    margin-bottom: 1rem;
                }
                img {
                    max-width: 400px;
                    margin: 2rem auto;
                    display: block;
                }
                p {
                    color: #666;
                    word-break: break-all;
                }
            </style>
        </head>
        <body>
            <h1>${currentBusiness.business_name}</h1>
            <img src="${currentQRTemplate.qrCodeUrl}" alt="QR Code">
            <p>${currentQRTemplate.url}</p>
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 500);
};

// Close modal on background click
document.getElementById('qr-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'qr-modal') {
        closeQRModal();
    }
});

// Show success message
function showSuccess(message) {
    // You can implement a toast notification here
    alert(message);
}

// Show error message
function showError(message) {
    alert('Error: ' + message);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initPage);
