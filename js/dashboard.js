/**
 * CyberCheck Dashboard
 * Main dashboard logic and UI interactions
 */

// State
let currentPage = 'overview';
let currentUser = null;
let currentBusiness = null;

// Initialize dashboard
document.addEventListener('DOMContentLoaded', async () => {
  // Require authentication
  requireAuth();

  // Initialize UI
  initializeSidebar();
  initializeNavigation();
  initializeModals();

  // Load user data
  await loadUserData();

  // Load initial page
  await loadPage('overview');

  // Setup refresh button
  document.getElementById('refreshBtn').addEventListener('click', () => {
    loadPage(currentPage);
  });

  // Setup logout button
  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await api.logout();
    window.location.href = '/login.html';
  });
});

// ======================
// User Data
// ======================

async function loadUserData() {
  try {
    const response = await api.getMyBusiness();
    if (response.success) {
      currentBusiness = response.data;
      currentUser = response.data.owner || { full_name: 'Business Owner' };

      // Update UI
      document.getElementById('userName').textContent = currentUser.full_name || currentBusiness.name;
      document.getElementById('userRole').textContent = 'Owner';
    }
  } catch (error) {
    console.error('Failed to load user data:', error);
    showNotification('Failed to load user data', 'danger');
  }
}

// ======================
// Sidebar & Navigation
// ======================

function initializeSidebar() {
  const sidebar = document.getElementById('sidebar');
  const sidebarToggle = document.getElementById('sidebarToggle');
  const sidebarToggleMobile = document.getElementById('sidebarToggleMobile');

  // Mobile toggle
  sidebarToggleMobile.addEventListener('click', () => {
    sidebar.classList.toggle('active');
  });

  // Close sidebar when clicking outside on mobile
  document.addEventListener('click', (e) => {
    if (window.innerWidth <= 768) {
      if (!sidebar.contains(e.target) && !sidebarToggleMobile.contains(e.target)) {
        sidebar.classList.remove('active');
      }
    }
  });
}

function initializeNavigation() {
  const navLinks = document.querySelectorAll('.nav-link');

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const page = link.dataset.page;
      navigateTo(page);
    });
  });
}

async function navigateTo(page) {
  currentPage = page;

  // Update active nav link
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.toggle('active', link.dataset.page === page);
  });

  // Update page title
  const titles = {
    'overview': 'Overview',
    'voice-notes': 'Voice Notes',
    'reviews': 'Reviews',
    'profiles': 'Profiles',
    'sms': 'SMS Settings',
    'billing': 'Billing & Usage',
    'settings': 'Settings'
  };
  document.getElementById('pageTitle').textContent = titles[page] || page;

  // Load page content
  await loadPage(page);

  // Close mobile sidebar
  if (window.innerWidth <= 768) {
    document.getElementById('sidebar').classList.remove('active');
  }
}

async function loadPage(page) {
  // Hide all pages
  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));

  // Show requested page
  const pageElement = document.getElementById(`${page}Page`);
  if (pageElement) {
    pageElement.classList.remove('hidden');
  }

  // Load page-specific data
  switch (page) {
    case 'overview':
      await loadOverviewPage();
      break;
    case 'voice-notes':
      await loadVoiceNotesPage();
      break;
    case 'reviews':
      await loadReviewsPage();
      break;
    case 'profiles':
      await loadProfilesPage();
      break;
    case 'sms':
      await loadSMSPage();
      break;
    case 'billing':
      await loadBillingPage();
      break;
    case 'settings':
      await loadSettingsPage();
      break;
  }
}

// ======================
// Overview Page
// ======================

async function loadOverviewPage() {
  try {
    // Load voice notes and reviews in parallel
    const [voiceNotesResponse, reviewsResponse] = await Promise.all([
      api.getVoiceNotes({ limit: 5 }),
      api.getReviews({ limit: 5 })
    ]);

    // Update stats
    updateOverviewStats(voiceNotesResponse.data || [], reviewsResponse.data || []);

    // Render recent items
    renderRecentVoiceNotes(voiceNotesResponse.data || []);
    renderRecentReviews(reviewsResponse.data || []);

  } catch (error) {
    console.error('Failed to load overview:', error);
    showNotification('Failed to load dashboard data', 'danger');
  }
}

function updateOverviewStats(voiceNotes, reviews) {
  // Voice notes count
  document.getElementById('totalVoiceNotes').textContent = voiceNotes.length || '0';

  // Reviews count
  document.getElementById('totalReviews').textContent = reviews.length || '0';

  // Average rating
  if (reviews.length > 0) {
    const avgRating = reviews.reduce((sum, r) => sum + (r.overall_rating || 0), 0) / reviews.length;
    document.getElementById('avgRating').textContent = avgRating.toFixed(1);
    document.getElementById('ratingChange').textContent = '⭐'.repeat(Math.round(avgRating));
  }

  // Update badges
  const pendingVoiceNotes = voiceNotes.filter(v => v.status === 'pending' || v.status === 'processing').length;
  const pendingReviews = reviews.filter(r => !r.approved).length;

  document.getElementById('voiceNotesBadge').textContent = pendingVoiceNotes;
  document.getElementById('reviewsBadge').textContent = pendingReviews;
}

function renderRecentVoiceNotes(voiceNotes) {
  const container = document.getElementById('recentVoiceNotes');

  if (voiceNotes.length === 0) {
    container.innerHTML = '<div class="empty-state"><i class="fas fa-microphone"></i><h3>No voice notes yet</h3><p>Upload your first voice note to get started</p></div>';
    return;
  }

  container.innerHTML = voiceNotes.map(vn => `
    <div class="list-item">
      <div class="list-item-icon">
        <i class="fas fa-microphone"></i>
      </div>
      <div class="list-item-content">
        <div class="list-item-title">${escapeHtml(vn.title || 'Untitled')}</div>
        <div class="list-item-subtitle">
          ${formatDate(vn.created_at)} • ${getStatusBadge(vn.status)}
        </div>
      </div>
      <div class="list-item-actions">
        <button class="btn btn-sm" onclick="viewVoiceNote('${vn.id}')">
          View
        </button>
      </div>
    </div>
  `).join('');
}

function renderRecentReviews(reviews) {
  const container = document.getElementById('recentReviews');

  if (reviews.length === 0) {
    container.innerHTML = '<div class="empty-state"><i class="fas fa-star"></i><h3>No reviews yet</h3><p>Reviews will appear here as customers submit them</p></div>';
    return;
  }

  container.innerHTML = reviews.map(review => `
    <div class="list-item">
      <div class="list-item-icon">
        <i class="fas fa-star"></i>
      </div>
      <div class="list-item-content">
        <div class="list-item-title">${'⭐'.repeat(review.overall_rating || 0)} (${review.overall_rating}/5)</div>
        <div class="list-item-subtitle">
          ${escapeHtml(review.review_text?.substring(0, 100) || 'No text')}...
          ${review.receipt_verified ? '✅ Verified' : ''}
        </div>
      </div>
      <div class="list-item-actions">
        ${!review.approved ? `
          <button class="btn btn-sm btn-success" onclick="approveReview('${review.id}')">
            Approve
          </button>
        ` : ''}
      </div>
    </div>
  `).join('');
}

// ======================
// Voice Notes Page
// ======================

async function loadVoiceNotesPage() {
  try {
    const response = await api.getVoiceNotes();
    renderVoiceNotesList(response.data?.voice_notes || []);

    // Setup upload button (only first time)
    const uploadBtn = document.getElementById('uploadVoiceNoteBtn');
    if (!uploadBtn.dataset.initialized) {
      uploadBtn.addEventListener('click', () => {
        openModal('uploadVoiceNoteModal');
      });
      uploadBtn.dataset.initialized = 'true';
    }

    // Setup filters (only first time)
    if (!document.getElementById('voiceNotesFilter').dataset.initialized) {
      setupVoiceNotesFilters();
      document.getElementById('voiceNotesFilter').dataset.initialized = 'true';
    }

    // Update badge
    const pendingNotes = (response.data?.voice_notes || []).filter(vn => vn.status === 'processing').length;
    document.getElementById('voiceNotesBadge').textContent = pendingNotes;

  } catch (error) {
    console.error('Failed to load voice notes:', error);
    showNotification('Failed to load voice notes', 'danger');
  }
}

function renderVoiceNotesList(voiceNotes) {
  const container = document.getElementById('voiceNotesList');

  if (voiceNotes.length === 0) {
    container.innerHTML = '<div class="empty-state"><i class="fas fa-microphone"></i><h3>No voice notes yet</h3><p>Upload a voice note to get AI-powered transcription and data extraction</p><button class="btn btn-primary" onclick="document.getElementById(\'uploadVoiceNoteBtn\').click()"><i class="fas fa-upload"></i> Upload Your First Voice Note</button></div>';
    return;
  }

  const cardsHTML = voiceNotes.map(vn => {
    const statusBadge = vn.status === 'completed'
      ? '<span class="badge badge-success"><i class="fas fa-check-circle"></i> Completed</span>'
      : vn.status === 'failed'
      ? '<span class="badge badge-danger"><i class="fas fa-exclamation-circle"></i> Failed</span>'
      : vn.status === 'processing'
      ? '<span class="badge badge-warning"><i class="fas fa-spinner fa-spin"></i> Processing</span>'
      : '<span class="badge badge-secondary"><i class="fas fa-clock"></i> Pending</span>';

    const extractedData = vn.extracted_data || {};
    const hasContact = extractedData.contact || extractedData.first_name || extractedData.name;
    const duration = vn.audio_duration_seconds
      ? `${Math.floor(vn.audio_duration_seconds / 60)}:${String(vn.audio_duration_seconds % 60).padStart(2, '0')}`
      : '--:--';

    return `
      <div class="voice-note-card" data-voice-note-id="${vn.id}">
        <div class="voice-note-header">
          <div class="voice-note-info">
            <div class="voice-note-icon">
              <i class="fas fa-microphone-alt"></i>
            </div>
            <div class="voice-note-meta">
              <strong>${escapeHtml(vn.title || 'Untitled Voice Note')}</strong>
              <div class="voice-note-details">
                <span><i class="fas fa-tag"></i> ${escapeHtml(vn.note_type || 'general')}</span>
                <span>•</span>
                <span><i class="fas fa-clock"></i> ${duration}</span>
                <span>•</span>
                <span>${formatDate(vn.created_at)}</span>
              </div>
            </div>
          </div>
          <div class="voice-note-status">
            ${statusBadge}
          </div>
        </div>

        ${vn.audio_url ? `
          <div class="voice-note-audio">
            <audio controls preload="metadata">
              <source src="${vn.audio_url}" type="audio/mpeg">
              Your browser does not support audio playback.
            </audio>
          </div>
        ` : ''}

        ${vn.status === 'completed' && vn.transcription ? `
          <div class="voice-note-transcription">
            <strong><i class="fas fa-file-alt"></i> Transcription:</strong>
            <p>${escapeHtml(vn.transcription.substring(0, 200))}${vn.transcription.length > 200 ? '...' : ''}</p>
          </div>
        ` : ''}

        ${vn.status === 'completed' && extractedData && Object.keys(extractedData).length > 0 ? `
          <div class="voice-note-extracted">
            <strong><i class="fas fa-magic"></i> Extracted Data:</strong>
            <div class="extracted-data-grid">
              ${hasContact ? `
                <div class="extracted-item">
                  <i class="fas fa-user"></i>
                  <span>${escapeHtml(extractedData.contact?.name || extractedData.first_name || extractedData.name || 'N/A')}</span>
                </div>
              ` : ''}
              ${extractedData.contact?.phone || extractedData.phone ? `
                <div class="extracted-item">
                  <i class="fas fa-phone"></i>
                  <span>${escapeHtml(extractedData.contact?.phone || extractedData.phone)}</span>
                </div>
              ` : ''}
              ${extractedData.contact?.email || extractedData.email ? `
                <div class="extracted-item">
                  <i class="fas fa-envelope"></i>
                  <span>${escapeHtml(extractedData.contact?.email || extractedData.email)}</span>
                </div>
              ` : ''}
              ${extractedData.follow_up?.when || extractedData.follow_up_date ? `
                <div class="extracted-item">
                  <i class="fas fa-calendar"></i>
                  <span>Follow-up: ${escapeHtml(extractedData.follow_up?.when || extractedData.follow_up_date)}</span>
                </div>
              ` : ''}
            </div>
          </div>
        ` : ''}

        ${vn.status === 'failed' && vn.error_message ? `
          <div class="voice-note-error">
            <i class="fas fa-exclamation-triangle"></i>
            <span>${escapeHtml(vn.error_message)}</span>
          </div>
        ` : ''}

        <div class="voice-note-actions">
          ${vn.status === 'completed' ? `
            <button class="btn btn-sm btn-primary" onclick="viewVoiceNoteDetails('${vn.id}')">
              <i class="fas fa-eye"></i> View Full Details
            </button>
            ${hasContact ? `
              <button class="btn btn-sm btn-secondary" onclick="createContactFromVoiceNote('${vn.id}')">
                <i class="fas fa-user-plus"></i> Create Contact
              </button>
            ` : ''}
            ${extractedData.calendar || extractedData.follow_up ? `
              <button class="btn btn-sm btn-secondary" onclick="exportToCalendar('${vn.id}')">
                <i class="fas fa-calendar-plus"></i> Export to Calendar
              </button>
            ` : ''}
          ` : vn.status === 'failed' ? `
            <button class="btn btn-sm btn-warning" onclick="retryVoiceNoteProcessing('${vn.id}')">
              <i class="fas fa-redo"></i> Retry Processing
            </button>
          ` : ''}
          <button class="btn btn-sm btn-danger" onclick="deleteVoiceNote('${vn.id}')">
            <i class="fas fa-trash"></i> Delete
          </button>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = cardsHTML;
}

function setupVoiceNotesFilters() {
  const filterSelect = document.getElementById('voiceNotesFilter');
  const searchInput = document.getElementById('voiceNotesSearch');

  filterSelect.addEventListener('change', applyVoiceNotesFilters);
  searchInput.addEventListener('input', debounce(applyVoiceNotesFilters, 300));
}

async function applyVoiceNotesFilters() {
  const status = document.getElementById('voiceNotesFilter').value;
  const search = document.getElementById('voiceNotesSearch').value;

  const params = {};
  if (status !== 'all') params.status = status;
  if (search) params.search = search;

  try {
    const response = await api.getVoiceNotes(params);
    renderVoiceNotesList(response.data?.voice_notes || []);
  } catch (error) {
    console.error('Failed to filter voice notes:', error);
    showNotification('Failed to load filtered voice notes', 'danger');
  }
}

async function viewVoiceNoteDetails(id) {
  try {
    const response = await api.getVoiceNote(id);
    const vn = response.data;

    const modalHTML = `
      <div class="voice-note-detail">
        <h4>${escapeHtml(vn.title || 'Untitled Voice Note')}</h4>
        <div class="detail-section">
          <strong>Type:</strong> ${escapeHtml(vn.note_type || 'general')}
        </div>
        <div class="detail-section">
          <strong>Status:</strong> ${vn.status}
        </div>
        <div class="detail-section">
          <strong>Created:</strong> ${formatDate(vn.created_at)}
        </div>
        ${vn.audio_url ? `
          <div class="detail-section">
            <strong>Audio:</strong>
            <audio controls style="width: 100%; margin-top: 8px;">
              <source src="${vn.audio_url}" type="audio/mpeg">
            </audio>
          </div>
        ` : ''}
        ${vn.transcription ? `
          <div class="detail-section">
            <strong>Full Transcription:</strong>
            <p style="background: var(--bg-tertiary); padding: 12px; border-radius: 6px; white-space: pre-wrap; margin-top: 8px;">${escapeHtml(vn.transcription)}</p>
          </div>
        ` : ''}
        ${vn.extracted_data ? `
          <div class="detail-section">
            <strong>Extracted Data:</strong>
            <pre style="background: var(--bg-tertiary); padding: 12px; border-radius: 6px; overflow-x: auto; margin-top: 8px;">${JSON.stringify(vn.extracted_data, null, 2)}</pre>
          </div>
        ` : ''}
      </div>
    `;

    document.getElementById('voiceNoteDetailContent').innerHTML = modalHTML;
    openModal('voiceNoteDetailModal');
  } catch (error) {
    console.error('Failed to load voice note details:', error);
    showNotification('Failed to load voice note details', 'danger');
  }
}

async function deleteVoiceNote(id) {
  if (!confirm('Delete this voice note? This action cannot be undone.')) return;

  try {
    await api.deleteVoiceNote(id);
    showNotification('Voice note deleted successfully', 'success');
    loadVoiceNotesPage();
  } catch (error) {
    console.error('Failed to delete voice note:', error);
    showNotification('Failed to delete voice note', 'danger');
  }
}

async function retryVoiceNoteProcessing(id) {
  try {
    await api.processVoiceNote(id);
    showNotification('Voice note requeued for processing', 'success');
    loadVoiceNotesPage();
  } catch (error) {
    console.error('Failed to retry processing:', error);
    showNotification('Failed to retry processing', 'danger');
  }
}

async function createContactFromVoiceNote(id) {
  try {
    const response = await api.createContactFromVoiceNote(id);
    showNotification('Contact created successfully!', 'success');
    // Optionally navigate to contacts page or show contact details
  } catch (error) {
    console.error('Failed to create contact:', error);
    showNotification('Failed to create contact', 'danger');
  }
}

function exportToCalendar(id) {
  // Generate .ics file for calendar export
  showNotification('Calendar export coming soon!', 'info');
  // TODO: Implement .ics file generation
}

// ======================
// Reviews Page
// ======================

async function loadReviewsPage() {
  try {
    const response = await api.getReviews();
    renderReviewsList(response.data?.reviews || []);

    // Setup filters (only first time)
    if (!document.getElementById('reviewsFilter').dataset.initialized) {
      setupReviewsFilters();
      document.getElementById('reviewsFilter').dataset.initialized = 'true';
    }

    // Update badge
    const pendingReviews = (response.data?.reviews || []).filter(r => r.status === 'pending').length;
    document.getElementById('reviewsBadge').textContent = pendingReviews;

  } catch (error) {
    console.error('Failed to load reviews:', error);
    showNotification('Failed to load reviews', 'danger');
  }
}

function renderReviewsList(reviews) {
  const container = document.getElementById('reviewsList');

  if (reviews.length === 0) {
    container.innerHTML = '<div class="empty-state"><i class="fas fa-star"></i><h3>No reviews yet</h3><p>Reviews will appear here as customers submit them</p></div>';
    return;
  }

  const cardsHTML = reviews.map(review => {
    const statusBadge = review.status === 'approved'
      ? '<span class="badge badge-success"><i class="fas fa-check-circle"></i> Approved</span>'
      : review.status === 'rejected'
      ? '<span class="badge badge-danger"><i class="fas fa-times-circle"></i> Rejected</span>'
      : '<span class="badge badge-warning"><i class="fas fa-clock"></i> Pending</span>';

    const verifiedBadge = review.receipt_verified
      ? '<span class="badge badge-success"><i class="fas fa-badge-check"></i> Receipt Verified</span>'
      : review.receipt_url
      ? '<span class="badge badge-secondary"><i class="fas fa-hourglass-half"></i> Verification Pending</span>'
      : '';

    const stars = '⭐'.repeat(review.overall_rating || 0);
    const customerName = review.customer_name || review.users?.full_name || 'Anonymous';
    const profileName = review.profiles?.name || 'Unknown Business';

    return `
      <div class="review-card" data-review-id="${review.id}">
        <div class="review-header">
          <div class="review-customer">
            <div class="customer-avatar">
              <i class="fas fa-user-circle"></i>
            </div>
            <div class="customer-info">
              <strong>${escapeHtml(customerName)}</strong>
              <div class="review-meta">
                <span>${stars} ${review.overall_rating}.0</span>
                <span>•</span>
                <span>${formatDate(review.created_at)}</span>
                <span>•</span>
                <span>${escapeHtml(profileName)}</span>
              </div>
            </div>
          </div>
          <div class="review-badges">
            ${statusBadge}
            ${verifiedBadge}
          </div>
        </div>

        <div class="review-body">
          <p>${escapeHtml(review.review_text || 'No review text provided')}</p>
          ${review.response_text ? `
            <div class="review-response">
              <strong><i class="fas fa-reply"></i> Business Response:</strong>
              <p>${escapeHtml(review.response_text)}</p>
              <small>Responded ${formatDate(review.response_date)}</small>
            </div>
          ` : ''}
        </div>

        <div class="review-actions">
          ${review.status === 'pending' ? `
            <button class="btn btn-sm btn-success" onclick="approveReview('${review.id}')">
              <i class="fas fa-check"></i> Approve
            </button>
            <button class="btn btn-sm btn-danger" onclick="openRejectModal('${review.id}')">
              <i class="fas fa-times"></i> Reject
            </button>
          ` : ''}

          ${review.status === 'approved' && !review.response_text ? `
            <button class="btn btn-sm btn-primary" onclick="openRespondModal('${review.id}', '${escapeHtml(customerName)}', ${review.overall_rating}, '${escapeHtml(review.review_text || '')}')">
              <i class="fas fa-reply"></i> Respond
            </button>
          ` : ''}

          ${review.receipt_url ? `
            <button class="btn btn-sm btn-secondary" onclick="openReceiptModal('${review.receipt_url}', '${JSON.stringify(review.ocr_data || {}).replace(/'/g, "\\'")}')">
              <i class="fas fa-receipt"></i> View Receipt
            </button>
          ` : ''}

          <button class="btn btn-sm btn-secondary" onclick="viewReviewDetails('${review.id}')">
            <i class="fas fa-eye"></i> View Details
          </button>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = cardsHTML;
}

function setupReviewsFilters() {
  const filterSelect = document.getElementById('reviewsFilter');
  const searchInput = document.getElementById('reviewsSearch');

  filterSelect.addEventListener('change', applyReviewsFilters);
  searchInput.addEventListener('input', debounce(applyReviewsFilters, 300));
}

async function applyReviewsFilters() {
  const filter = document.getElementById('reviewsFilter').value;
  const search = document.getElementById('reviewsSearch').value;

  const params = {};
  if (filter === 'approved') params.status = 'approved';
  if (filter === 'pending') params.status = 'pending';
  if (filter === 'rejected') params.status = 'rejected';
  if (filter === 'receipt_verified') params.receipt_verified = true;
  if (search) params.search = search;

  try {
    const response = await api.getReviews(params);
    renderReviewsList(response.data?.reviews || []);
  } catch (error) {
    console.error('Failed to filter reviews:', error);
    showNotification('Failed to load filtered reviews', 'danger');
  }
}

async function approveReview(id) {
  if (!confirm('Approve this review? It will become publicly visible.')) return;

  try {
    await api.approveReview(id);
    showNotification('Review approved successfully', 'success');
    loadReviewsPage();
  } catch (error) {
    console.error('Failed to approve review:', error);
    showNotification('Failed to approve review', 'danger');
  }
}

function openRejectModal(reviewId) {
  document.getElementById('rejectReviewId').value = reviewId;
  document.getElementById('rejectionReason').value = '';
  openModal('rejectReviewModal');
}

async function handleRejectReview(e) {
  e.preventDefault();

  const reviewId = document.getElementById('rejectReviewId').value;
  const reason = document.getElementById('rejectionReason').value;

  try {
    await api.rejectReview(reviewId, reason);
    showNotification('Review rejected successfully', 'success');
    closeModal('rejectReviewModal');
    loadReviewsPage();
  } catch (error) {
    console.error('Failed to reject review:', error);
    showNotification('Failed to reject review', 'danger');
  }
}

function openRespondModal(reviewId, customerName, rating, reviewText) {
  document.getElementById('respondReviewId').value = reviewId;
  document.getElementById('responseText').value = '';

  const infoHTML = `
    <div class="review-preview">
      <strong>${escapeHtml(customerName)}</strong> - ${'⭐'.repeat(rating)}
      <p style="margin-top: 8px; color: #666;">"${escapeHtml(reviewText.substring(0, 150))}${reviewText.length > 150 ? '...' : ''}"</p>
    </div>
  `;
  document.getElementById('respondReviewInfo').innerHTML = infoHTML;

  openModal('respondReviewModal');
}

async function handleRespondToReview(e) {
  e.preventDefault();

  const reviewId = document.getElementById('respondReviewId').value;
  const responseText = document.getElementById('responseText').value;

  try {
    await api.respondToReview(reviewId, responseText);
    showNotification('Response posted successfully', 'success');
    closeModal('respondReviewModal');
    loadReviewsPage();
  } catch (error) {
    console.error('Failed to respond to review:', error);
    showNotification('Failed to post response', 'danger');
  }
}

function openReceiptModal(receiptUrl, ocrDataStr) {
  document.getElementById('receiptImage').src = receiptUrl;

  let ocrData;
  try {
    ocrData = JSON.parse(ocrDataStr);
  } catch (e) {
    ocrData = { status: 'No OCR data available' };
  }

  const ocrHTML = `
    <div class="ocr-data">
      ${ocrData.merchant_name ? `<p><strong>Merchant:</strong> ${escapeHtml(ocrData.merchant_name)}</p>` : ''}
      ${ocrData.total ? `<p><strong>Total:</strong> $${ocrData.total}</p>` : ''}
      ${ocrData.date ? `<p><strong>Date:</strong> ${ocrData.date}</p>` : ''}
      ${ocrData.confidence ? `<p><strong>Confidence:</strong> ${(ocrData.confidence * 100).toFixed(0)}%</p>` : ''}
      ${ocrData.status ? `<p><strong>Status:</strong> ${escapeHtml(ocrData.status)}</p>` : ''}
      ${ocrData.raw_text ? `<p><strong>Raw Text:</strong></p><pre style="white-space: pre-wrap; font-size: 11px;">${escapeHtml(ocrData.raw_text)}</pre>` : ''}
    </div>
  `;
  document.getElementById('ocrData').innerHTML = ocrHTML;

  openModal('viewReceiptModal');
}

async function viewReviewDetails(id) {
  try {
    const response = await api.getReview(id);
    const review = response.data;

    // Could open a detailed modal or navigate to a detail page
    console.log('Review details:', review);
    showNotification('Detailed view coming soon', 'info');
  } catch (error) {
    console.error('Failed to get review details:', error);
    showNotification('Failed to load review details', 'danger');
  }
}

// ======================
// Profiles Page
// ======================

async function loadProfilesPage() {
  try {
    const response = await api.getProfiles();
    renderProfilesList(response.data || []);

    // Setup create button
    document.getElementById('createProfileBtn').addEventListener('click', () => {
      // TODO: Show create profile modal
      alert('Create profile modal - to be implemented');
    });

  } catch (error) {
    console.error('Failed to load profiles:', error);
    showNotification('Failed to load profiles', 'danger');
  }
}

function renderProfilesList(profiles) {
  const container = document.getElementById('profilesList');

  if (profiles.length === 0) {
    container.innerHTML = '<div class="empty-state"><i class="fas fa-store"></i><h3>No profiles</h3><p>Create your first profile to start collecting reviews</p></div>';
    return;
  }

  container.innerHTML = profiles.map(profile => `
    <div class="list-item">
      <div class="list-item-icon">
        <i class="fas fa-store"></i>
      </div>
      <div class="list-item-content">
        <div class="list-item-title">${escapeHtml(profile.name)}</div>
        <div class="list-item-subtitle">
          ${escapeHtml(profile.profile_type)} • ${profile.city || 'No city'}
        </div>
      </div>
      <div class="list-item-actions">
        <button class="btn btn-sm" onclick="editProfile('${profile.id}')">
          <i class="fas fa-edit"></i> Edit
        </button>
      </div>
    </div>
  `).join('');
}

async function editProfile(id) {
  // TODO: Implement profile edit modal
  alert(`Edit profile: ${id}`);
}

// ======================
// SMS Settings Page
// ======================

async function loadSMSPage() {
  try {
    const response = await api.getSMSConfig();
    renderSMSConfig(response.data);

    // Setup test SMS button
    document.getElementById('sendTestSMSBtn').addEventListener('click', sendTestSMS);

  } catch (error) {
    console.error('Failed to load SMS config:', error);
    showNotification('Failed to load SMS configuration', 'danger');
  }
}

function renderSMSConfig(config) {
  const container = document.getElementById('smsConfig');

  const html = `
    <div class="form-group">
      <label>SMS Provider</label>
      <div class="alert alert-info">
        ${config.custom_twilio_enabled
          ? '✅ Using Custom Twilio Account (Free - You pay Twilio directly)'
          : '📱 Using Shared Platform SMS ($0.01/SMS)'
        }
      </div>
    </div>

    ${config.custom_twilio_enabled ? `
      <div class="form-group">
        <label>Your Twilio Phone Number</label>
        <input type="text" class="form-input" value="${config.phone_number || 'Not configured'}" readonly>
      </div>
    ` : ''}

    <div class="form-group">
      <button class="btn btn-primary" onclick="showCustomTwilioSetup()">
        <i class="fas fa-cog"></i> ${config.custom_twilio_enabled ? 'Update' : 'Configure'} Custom Twilio
      </button>
      ${config.custom_twilio_enabled ? `
        <button class="btn btn-secondary" onclick="switchToSharedTwilio()">
          <i class="fas fa-undo"></i> Switch to Shared Platform SMS
        </button>
      ` : ''}
    </div>
  `;

  container.innerHTML = html;
}

async function sendTestSMS() {
  const btn = document.getElementById('sendTestSMSBtn');
  const resultDiv = document.getElementById('testSMSResult');

  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

  try {
    const response = await api.sendTestSMS();

    if (response.success) {
      resultDiv.innerHTML = '<div class="alert alert-success"><i class="fas fa-check-circle"></i> Test SMS sent successfully! Check your phone.</div>';
    } else {
      resultDiv.innerHTML = `<div class="alert alert-danger"><i class="fas fa-exclamation-circle"></i> ${response.error}</div>`;
    }
  } catch (error) {
    resultDiv.innerHTML = `<div class="alert alert-danger"><i class="fas fa-exclamation-circle"></i> Failed to send test SMS: ${error.message}</div>`;
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Test SMS';
  }
}

async function showCustomTwilioSetup() {
  // TODO: Implement custom Twilio setup modal
  alert('Custom Twilio setup modal - to be implemented');
}

async function switchToSharedTwilio() {
  if (confirm('Switch to shared platform SMS? You will be charged $0.01 per SMS.')) {
    try {
      await api.updateSMSConfig({
        custom_twilio_enabled: false
      });
      showNotification('Switched to shared platform SMS', 'success');
      loadSMSPage();
    } catch (error) {
      showNotification('Failed to update SMS configuration', 'danger');
    }
  }
}

// ======================
// Billing Page
// ======================

async function loadBillingPage() {
  try {
    const [subscription, usage] = await Promise.all([
      api.getSubscription(),
      api.getUsageStats()
    ]);

    renderSubscriptionInfo(subscription.data);
    renderUsageBreakdown(usage.data);

  } catch (error) {
    console.error('Failed to load billing:', error);
    showNotification('Failed to load billing information', 'danger');
  }
}

function renderSubscriptionInfo(subscription) {
  const container = document.getElementById('subscriptionInfo');

  const html = `
    <div class="form-group">
      <label>Current Plan</label>
      <h2>${subscription.plan || 'Free'}</h2>
    </div>
    <div class="form-group">
      <label>Status</label>
      <span class="badge badge-success">${subscription.status || 'active'}</span>
    </div>
    <div class="form-group">
      <button class="btn btn-primary">
        <i class="fas fa-credit-card"></i> Upgrade Plan
      </button>
    </div>
  `;

  container.innerHTML = html;
}

function renderUsageBreakdown(usage) {
  const container = document.getElementById('usageBreakdown');

  const html = `
    <table class="table">
      <tbody>
        <tr>
          <td><i class="fas fa-microphone"></i> Voice Notes</td>
          <td>${usage.voice_notes?.count || 0}</td>
          <td>$${(usage.voice_notes?.cost || 0).toFixed(2)}</td>
        </tr>
        <tr>
          <td><i class="fas fa-sms"></i> SMS Messages</td>
          <td>${usage.sms?.count || 0}</td>
          <td>$${(usage.sms?.cost || 0).toFixed(2)}</td>
        </tr>
        <tr>
          <td><i class="fas fa-receipt"></i> Receipt OCR</td>
          <td>${usage.ocr?.count || 0}</td>
          <td>$${(usage.ocr?.cost || 0).toFixed(2)}</td>
        </tr>
        <tr>
          <td><strong>Total</strong></td>
          <td></td>
          <td><strong>$${(usage.total_cost || 0).toFixed(2)}</strong></td>
        </tr>
      </tbody>
    </table>
  `;

  container.innerHTML = html;
}

// ======================
// Settings Page
// ======================

async function loadSettingsPage() {
  if (currentBusiness) {
    document.getElementById('businessName').value = currentBusiness.name || '';
    document.getElementById('businessType').value = currentBusiness.business_type || 'restaurant';
    document.getElementById('businessPhone').value = currentBusiness.phone || '';
    document.getElementById('businessEmail').value = currentBusiness.email || '';
  }

  // Setup form submission
  document.getElementById('businessSettingsForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const updates = {
      name: document.getElementById('businessName').value,
      business_type: document.getElementById('businessType').value,
      phone: document.getElementById('businessPhone').value,
      email: document.getElementById('businessEmail').value
    };

    try {
      await api.updateBusiness(updates);
      showNotification('Settings saved successfully', 'success');
      await loadUserData();
    } catch (error) {
      showNotification('Failed to save settings', 'danger');
    }
  });
}

// ======================
// Modals
// ======================

function initializeModals() {
  // Upload voice note modal
  const uploadForm = document.getElementById('uploadVoiceNoteForm');
  uploadForm.addEventListener('submit', handleVoiceNoteUpload);

  // Reject review modal
  const rejectForm = document.getElementById('rejectReviewForm');
  rejectForm.addEventListener('submit', handleRejectReview);

  // Respond to review modal
  const respondForm = document.getElementById('respondReviewForm');
  respondForm.addEventListener('submit', handleRespondToReview);

  // Close modal on background click
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal(modal.id);
      }
    });
  });

  // Load profiles for voice note profile selector
  loadProfilesForSelect();
}

async function loadProfilesForSelect() {
  try {
    const response = await api.getProfiles();
    const select = document.getElementById('voiceNoteProfile');

    if (response.data && response.data.length > 0) {
      response.data.forEach(profile => {
        const option = document.createElement('option');
        option.value = profile.id;
        option.textContent = profile.name;
        select.appendChild(option);
      });
    }
  } catch (error) {
    console.error('Failed to load profiles:', error);
  }
}

async function handleVoiceNoteUpload(e) {
  e.preventDefault();

  const fileInput = document.getElementById('voiceNoteFile');
  const file = fileInput.files[0];

  if (!file) {
    showNotification('Please select an audio file', 'warning');
    return;
  }

  // Validate file size (25MB max)
  if (file.size > 25 * 1024 * 1024) {
    showNotification('File size must be less than 25MB', 'danger');
    return;
  }

  const formData = new FormData();
  formData.append('audio', file);
  formData.append('title', document.getElementById('voiceNoteTitle').value || file.name);
  formData.append('note_type', document.getElementById('voiceNoteType').value);

  const profileId = document.getElementById('voiceNoteProfile').value;
  if (profileId) {
    formData.append('profile_id', profileId);
  }

  // Show progress
  const progressDiv = document.getElementById('uploadProgress');
  const statusText = document.getElementById('uploadStatus');
  progressDiv.classList.remove('hidden');

  try {
    statusText.textContent = 'Uploading...';
    const response = await api.uploadVoiceNote(formData);

    if (response.success) {
      statusText.textContent = 'Upload complete! AI processing started...';
      showNotification('Voice note uploaded successfully! AI is processing it now.', 'success');

      setTimeout(() => {
        closeModal('uploadVoiceNoteModal');
        navigateTo('voice-notes');
      }, 2000);
    }
  } catch (error) {
    statusText.textContent = 'Upload failed';
    showNotification(`Failed to upload voice note: ${error.message}`, 'danger');
  } finally {
    setTimeout(() => {
      progressDiv.classList.add('hidden');
    }, 3000);
  }
}

function showModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';

    // Reset form if it exists
    const form = modal.querySelector('form');
    if (form) {
      form.reset();
    }
  }
}

// ======================
// Utilities
// ======================

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getStatusBadge(status) {
  const badges = {
    'pending': '<span class="badge badge-warning">Pending</span>',
    'processing': '<span class="badge badge-info">Processing</span>',
    'completed': '<span class="badge badge-success">Completed</span>',
    'failed': '<span class="badge badge-danger">Failed</span>'
  };
  return badges[status] || '<span class="badge">Unknown</span>';
}

function showNotification(message, type = 'info') {
  // TODO: Implement toast notification system
  console.log(`[${type.toUpperCase()}] ${message}`);
  alert(message);
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Export for inline onclick handlers
window.navigateTo = navigateTo;
window.viewVoiceNote = viewVoiceNote;
window.approveReview = approveReview;
window.editProfile = editProfile;
window.showCustomTwilioSetup = showCustomTwilioSetup;
window.switchToSharedTwilio = switchToSharedTwilio;
window.closeModal = closeModal;
