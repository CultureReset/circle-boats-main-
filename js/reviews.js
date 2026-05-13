// ============================================
// Reviews & Feedback System
// ============================================
//
// FLOW:
// ┌───────────────────────────────────────────────────────────────────┐
// │  1. Trip completes → owner clicks "Send Review" or auto-trigger  │
// │  2. Customer gets SMS: "Thanks for your trip! Leave a review:    │
// │     https://cybercheck.app/review/{{one_time_token}}"           │
// │  3. Customer opens link → authenticated one-time page:           │
// │     - Star rating (1-5)                                          │
// │     - Text review OR voice review (speech-to-text via ElevenLabs)│
// │     - AI lightly edits voice transcript for flow                 │
// │     - Custom questions set by business owner                     │
// │     - Photo upload (attach trip photos)                          │
// │     - Per-person feedback (each guest)                           │
// │  4. Customer submits → owner gets SMS:                           │
// │     "New review from Sarah! ⭐⭐⭐⭐⭐ + photo attached"          │
// │  5. Owner reviews in dashboard:                                  │
// │     - Read review text + see photo                               │
// │     - Approve → publishes to website Reviews section             │
// │     - Push photo to Gallery                                      │
// │     - One-click copy for Google Reviews                          │
// │  6. Digital receipt also sent to same SMS thread                  │
// └───────────────────────────────────────────────────────────────────┘

var REVIEWS_STORAGE = 'beachside_reviews';
var REVIEW_QUESTIONS_STORAGE = 'beachside_review_questions';

var _reviews = [];
var _reviewQuestions = [];
var _reviewFilter = 'all'; // all | pending | approved | published

// ---- Default custom questions ----
var _defaultQuestions = [
  { id: 'q1', text: 'How was the boat condition?', type: 'stars', enabled: true },
  { id: 'q2', text: 'How was the check-in experience?', type: 'stars', enabled: true },
  { id: 'q3', text: 'Would you recommend us to a friend?', type: 'yesno', enabled: true },
  { id: 'q4', text: 'What could we improve?', type: 'text', enabled: true },
  { id: 'q5', text: 'How was the staff friendliness?', type: 'stars', enabled: true }
];

// ---- Demo reviews ----
var _demoReviews = [
  {
    id: 'RV-001',
    bookingId: 'BK-1003',
    customerName: 'Emily Chen',
    customerEmail: 'emily.chen@yahoo.com',
    customerPhone: '+1 (555) 111-2222',
    date: '2026-02-20',
    rating: 5,
    reviewText: 'Amazing experience! The boats were so fun and easy to operate. The sunset views from the water were breathtaking. We will definitely be coming back. The staff was incredibly helpful and friendly.',
    reviewMethod: 'voice', // voice | text
    originalVoiceText: 'um amazing experience the boats were so fun and easy to operate and the sunset views from the water were just breathtaking we will definitely be coming back the staff was incredibly helpful and friendly',
    photos: ['review-sunset.jpg'],
    guestFeedback: [
      { name: 'Emily', rating: 5, comment: 'Loved every minute!' },
      { name: 'David', rating: 5, comment: 'Best date activity ever' }
    ],
    questionAnswers: [
      { questionId: 'q1', answer: 5 },
      { questionId: 'q2', answer: 5 },
      { questionId: 'q3', answer: 'yes' },
      { questionId: 'q4', answer: 'Nothing — it was perfect!' },
      { questionId: 'q5', answer: 5 }
    ],
    status: 'approved', // pending | approved | published | rejected
    publishedToSite: false,
    photoAddedToGallery: false,
    submittedAt: '2026-02-20T18:30:00Z',
    reviewToken: 'rv_em1ly_ch3n_x9',
    tokenUsed: true
  },
  {
    id: 'RV-002',
    bookingId: 'BK-1004',
    customerName: 'James Wilson',
    customerEmail: 'jwilson@email.com',
    customerPhone: '+1 (555) 333-4444',
    date: '2026-02-19',
    rating: 4,
    reviewText: 'Great solo fishing trip. The circle boat was perfect for just me and my gear. Only wish the fishing rod holder was a bit sturdier. Would definitely come back for another relaxing day on the water.',
    reviewMethod: 'text',
    originalVoiceText: '',
    photos: ['review-fishing.jpg', 'review-catch.jpg'],
    guestFeedback: [
      { name: 'James', rating: 4, comment: 'Solid experience, good value' }
    ],
    questionAnswers: [
      { questionId: 'q1', answer: 4 },
      { questionId: 'q2', answer: 5 },
      { questionId: 'q3', answer: 'yes' },
      { questionId: 'q4', answer: 'Sturdier rod holders would be great' },
      { questionId: 'q5', answer: 5 }
    ],
    status: 'pending',
    publishedToSite: false,
    photoAddedToGallery: false,
    submittedAt: '2026-02-19T16:00:00Z',
    reviewToken: 'rv_jam3s_w1ls_y7',
    tokenUsed: true
  }
];

// ---- Load ----

async function loadReviews() {
  // Load reviews from Supabase
  try {
    // Check if CC.dashboard and getReviews method exist
    if (CC && CC.dashboard && typeof CC.dashboard.getReviews === 'function') {
      var apiData = await CC.dashboard.getReviews();
      if (apiData && Array.isArray(apiData) && apiData.length > 0) {
        _reviews = apiData.map(function(r) {
          return {
            id: r.id, bookingId: r.booking_id || '', customerName: r.customer_name || '',
            customerEmail: r.customer_email || '', rating: r.rating || 5,
            text: r.text || '', photos: r.photos || [], status: r.status || 'pending',
            createdAt: r.created_at || '', _apiId: r.id
          };
        });
      } else if (_reviews.length === 0) {
        _reviews = _demoReviews.slice();
      }
    } else {
      // Fallback to demo reviews if API not available
      if (_reviews.length === 0) {
        _reviews = _demoReviews.slice();
      }
    }
  } catch(e) {
    console.warn('Error loading reviews from API, using demo reviews:', e);
    // Fallback to demo reviews on any error
    if (_reviews.length === 0) {
      _reviews = _demoReviews.slice();
    }
  }

  // Load custom questions from API
  try {
    if (CC && CC.dashboard && typeof CC.dashboard.getReviewQuestions === 'function') {
      var apiQuestions = await CC.dashboard.getReviewQuestions();
      if (apiQuestions && Array.isArray(apiQuestions) && apiQuestions.length > 0) {
        _reviewQuestions = apiQuestions.map(function(q) {
          return {
            id: q.id,
            text: q.question_text,
            type: q.question_type,
            enabled: q.enabled !== false,
            _apiId: q.id
          };
        });
      } else {
        _reviewQuestions = _defaultQuestions.slice();
      }
    } else {
      // Fallback to localStorage
      var savedQ = localStorage.getItem(REVIEW_QUESTIONS_STORAGE);
      if (savedQ) {
        _reviewQuestions = JSON.parse(savedQ);
      } else {
        _reviewQuestions = _defaultQuestions.slice();
      }
    }
  } catch(e) {
    console.warn('Error loading review questions, using defaults:', e);
    _reviewQuestions = _defaultQuestions.slice();
  }

  renderReviewStats();
  renderReviewFilters();
  renderReviewsList();
  renderCustomQuestions();
  renderReviewSettings();
}

function saveReviews() { /* saved via CC.dashboard on each action */ }
function saveReviewQuestions() {
  // Save to API
  _reviewQuestions.forEach(function(q) {
    if (q._apiId) {
      // Update existing
      CC.dashboard.updateReviewQuestion(q._apiId, {
        question_text: q.text,
        question_type: q.type,
        enabled: q.enabled
      }).catch(function(e) { console.warn('Failed to update question:', e); });
    } else {
      // Create new
      CC.dashboard.createReviewQuestion({
        question_text: q.text,
        question_type: q.type,
        display_order: _reviewQuestions.indexOf(q)
      }).then(function(created) {
        q._apiId = created.id;
      }).catch(function(e) { console.warn('Failed to create question:', e); });
    }
  });
  // Backup to localStorage
  try { localStorage.setItem(REVIEW_QUESTIONS_STORAGE, JSON.stringify(_reviewQuestions)); } catch(e) {}
}

// ---- Stats ----

function renderReviewStats() {
  var container = document.getElementById('review-stats');
  if (!container) return;

  var total = _reviews.length;
  var pending = _reviews.filter(function(r) { return r.status === 'pending'; }).length;
  var published = _reviews.filter(function(r) { return r.publishedToSite; }).length;
  var avgRating = total > 0 ? (_reviews.reduce(function(s, r) { return s + r.rating; }, 0) / total).toFixed(1) : '0.0';

  // Also render send review request section
  renderSendReviewRequest();

  var html = '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;">';
  html += buildReviewStatCard(avgRating, 'Avg Rating', renderStarsSmall(parseFloat(avgRating)), '#f59e0b');
  html += buildReviewStatCard(total, 'Total Reviews', 'all time', '#4DA6FF');
  html += buildReviewStatCard(pending, 'Pending', 'needs approval', pending > 0 ? '#f59e0b' : '#6B7280');
  html += buildReviewStatCard(published, 'Published', 'on your site', '#22c55e');
  html += '</div>';

  // Add reminder SMS button if there are old pending reviews
  var oldPending = _reviews.filter(function(r) {
    if (r.status !== 'pending') return false;
    var daysSince = (new Date() - new Date(r.submittedAt || r.createdAt)) / (1000 * 60 * 60 * 24);
    return daysSince > 2;
  });

  if (oldPending.length > 0) {
    html = '<div style="margin-bottom:16px;padding:12px;background:rgba(251,146,60,0.1);border:1px solid rgba(251,146,60,0.3);border-radius:var(--radius);display:flex;align-items:center;justify-content:space-between;">';
    html += '<span style="font-size:13px;color:var(--text);">📱 ' + oldPending.length + ' review' + (oldPending.length !== 1 ? 's' : '') + ' pending 2+ days</span>';
    html += '<button class="btn btn-sm btn-primary" onclick="sendReviewReminders()" style="white-space:nowrap;">Send Reminders</button>';
    html += '</div>' + html;
  }

  container.innerHTML = html;
}

function buildReviewStatCard(value, label, sub, color) {
  var html = '<div style="padding:20px;background:var(--bg);border:1px solid var(--card-border);border-radius:var(--radius);text-align:center;">';
  html += '<div style="font-size:28px;font-weight:800;color:' + color + ';">' + value + '</div>';
  html += '<div style="font-size:13px;font-weight:600;color:var(--text);margin-top:4px;">' + label + '</div>';
  html += '<div style="font-size:11px;color:var(--text-dim);">' + sub + '</div>';
  html += '</div>';
  return html;
}

function renderStarsSmall(rating) {
  var html = '';
  for (var i = 1; i <= 5; i++) {
    html += '<span style="color:' + (i <= Math.round(rating) ? '#f59e0b' : '#374151') + ';font-size:12px;">&#9733;</span>';
  }
  return html;
}

// ---- Filters ----

function renderReviewFilters() {
  var container = document.getElementById('review-filters');
  if (!container) return;

  var filters = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'approved', label: 'Approved' },
    { key: 'published', label: 'Published' }
  ];

  var html = '<div style="display:flex;align-items:center;gap:12px;">';
  html += '<div style="display:flex;gap:4px;background:var(--bg);padding:4px;border-radius:var(--radius);border:1px solid var(--card-border);">';
  filters.forEach(function(f) {
    var active = _reviewFilter === f.key;
    html += '<button onclick="filterReviews(\'' + f.key + '\')" style="padding:8px 14px;border:none;border-radius:6px;font-size:13px;font-weight:' + (active ? '600' : '400') + ';cursor:pointer;background:' + (active ? 'var(--primary)' : 'transparent') + ';color:' + (active ? 'white' : 'var(--text-muted)') + ';transition:all 0.2s;">' + f.label + '</button>';
  });
  html += '</div>';
  html += '</div>';
  container.innerHTML = html;
}

function filterReviews(filter) {
  _reviewFilter = filter;
  renderReviewFilters();
  renderReviewsList();
}

// ---- Reviews List ----

function renderReviewsList() {
  var container = document.getElementById('reviews-list');
  if (!container) return;

  var filtered = _reviews.filter(function(r) {
    if (_reviewFilter === 'all') return true;
    if (_reviewFilter === 'published') return r.publishedToSite;
    return r.status === _reviewFilter;
  });

  if (filtered.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-dim);">No reviews found.</div>';
    return;
  }

  var html = '';
  filtered.forEach(function(r) {
    html += buildReviewCard(r);
  });
  container.innerHTML = html;
}

function buildReviewCard(r) {
  var html = '';
  html += '<div style="padding:20px;background:var(--bg);border:1px solid var(--card-border);border-radius:var(--radius-lg);margin-bottom:16px;">';

  // Header: name + rating + status
  html += '<div style="display:flex;align-items:flex-start;gap:16px;margin-bottom:14px;">';
  // Avatar
  html += '<div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#00ada8,#4DA6FF);display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:16px;flex-shrink:0;">' + r.customerName.charAt(0) + '</div>';
  html += '<div style="flex:1;">';
  html += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:4px;">';
  html += '<strong style="font-size:15px;color:var(--text);">' + escHtml(r.customerName) + '</strong>';
  html += getReviewStatusBadge(r);
  if (r.reviewMethod === 'voice') {
    html += '<span style="font-size:11px;padding:2px 8px;background:rgba(168,85,247,0.1);color:#a855f7;border-radius:10px;">Voice Review</span>';
  }
  html += '</div>';
  // Stars
  html += '<div style="display:flex;align-items:center;gap:6px;">';
  html += renderStars(r.rating);
  html += '<span style="font-size:12px;color:var(--text-dim);margin-left:4px;">' + new Date(r.submittedAt).toLocaleDateString() + '</span>';
  html += '</div>';
  html += '</div>';
  html += '</div>';

  // Review text
  html += '<div style="font-size:14px;color:var(--text-muted);line-height:1.7;margin-bottom:14px;">"' + escHtml(r.reviewText) + '"</div>';

  // Original voice text (if voice review)
  if (r.reviewMethod === 'voice' && r.originalVoiceText) {
    html += '<details style="margin-bottom:14px;">';
    html += '<summary style="font-size:12px;color:#a855f7;cursor:pointer;">Show original voice transcript</summary>';
    html += '<div style="padding:10px;background:rgba(168,85,247,0.05);border:1px solid rgba(168,85,247,0.15);border-radius:var(--radius);margin-top:6px;font-size:12px;color:var(--text-dim);font-style:italic;">"' + escHtml(r.originalVoiceText) + '"</div>';
    html += '</details>';
  }

  // Photos
  if (r.photos && r.photos.length > 0) {
    html += '<div style="display:flex;gap:8px;margin-bottom:14px;">';
    r.photos.forEach(function(p) {
      html += '<div style="width:80px;height:80px;border-radius:var(--radius);background:linear-gradient(135deg,rgba(0,173,168,0.2),rgba(77,166,255,0.2));display:flex;align-items:center;justify-content:center;font-size:10px;color:var(--text-dim);border:1px solid var(--card-border);">' + escHtml(p) + '</div>';
    });
    html += '</div>';
  }

  // Guest feedback
  if (r.guestFeedback && r.guestFeedback.length > 0) {
    html += '<div style="margin-bottom:14px;">';
    html += '<div style="font-size:12px;font-weight:600;color:var(--text-dim);margin-bottom:6px;">Per-Person Feedback:</div>';
    r.guestFeedback.forEach(function(g) {
      html += '<div style="display:inline-flex;align-items:center;gap:6px;padding:4px 10px;background:var(--card-bg);border:1px solid var(--card-border);border-radius:20px;margin-right:6px;margin-bottom:4px;font-size:12px;">';
      html += '<strong>' + escHtml(g.name) + '</strong> ';
      html += renderStarsInline(g.rating);
      if (g.comment) html += ' <span style="color:var(--text-dim);">"' + escHtml(g.comment) + '"</span>';
      html += '</div>';
    });
    html += '</div>';
  }

  // Question answers
  if (r.questionAnswers && r.questionAnswers.length > 0) {
    html += '<details style="margin-bottom:14px;">';
    html += '<summary style="font-size:12px;color:var(--primary);cursor:pointer;">Custom question responses (' + r.questionAnswers.length + ')</summary>';
    html += '<div style="padding:10px;background:var(--card-bg);border:1px solid var(--card-border);border-radius:var(--radius);margin-top:6px;">';
    r.questionAnswers.forEach(function(qa) {
      var q = _reviewQuestions.find(function(x) { return x.id === qa.questionId; });
      var qText = q ? q.text : 'Question';
      html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--card-border);font-size:13px;">';
      html += '<span style="color:var(--text-muted);">' + escHtml(qText) + '</span>';
      if (typeof qa.answer === 'number') {
        html += '<span>' + renderStarsInline(qa.answer) + '</span>';
      } else {
        html += '<span style="color:var(--text);">' + escHtml(String(qa.answer)) + '</span>';
      }
      html += '</div>';
    });
    html += '</div></details>';
  }

  // Action buttons
  html += '<div style="display:flex;gap:8px;flex-wrap:wrap;padding-top:14px;border-top:1px solid var(--card-border);">';

  if (r.status === 'pending') {
    html += '<div style="width:100%;margin-bottom:10px;padding:10px;background:rgba(59,130,246,0.05);border-radius:var(--radius);border:1px solid rgba(59,130,246,0.2);">';
    html += '<div style="font-size:12px;color:var(--text-dim);font-weight:600;margin-bottom:6px;">What would you like to approve?</div>';
    html += '<div style="display:flex;gap:6px;flex-wrap:wrap;">';

    // Approve just text
    html += '<button class="btn btn-sm btn-outline" onclick="approveReviewText(\'' + r.id + '\')" style="padding:6px 12px;font-size:12px;">Text Only</button>';

    // Approve just photos
    if (r.photos && r.photos.length > 0) {
      html += '<button class="btn btn-sm btn-outline" onclick="approveReviewPhotos(\'' + r.id + '\')" style="padding:6px 12px;font-size:12px;">Photos Only</button>';
      html += '<button class="btn btn-sm btn-primary" onclick="approveReviewBoth(\'' + r.id + '\')" style="padding:6px 12px;font-size:12px;">Text + Photos</button>';
    } else {
      html += '<button class="btn btn-sm btn-primary" onclick="approveReview(\'' + r.id + '\')" style="padding:6px 12px;font-size:12px;">Approve</button>';
    }

    // Reject
    html += '<button class="btn btn-sm btn-outline" onclick="rejectReview(\'' + r.id + '\')" style="color:var(--danger);padding:6px 12px;font-size:12px;">Reject</button>';
    html += '</div>';
    html += '</div>';
  }

  if (r.status === 'approved' && !r.publishedToSite) {
    html += '<button class="btn btn-success btn-sm" onclick="publishReview(\'' + r.id + '\')">Publish to Website</button>';
  }
  if (r.publishedToSite) {
    html += '<button class="btn btn-outline btn-sm" onclick="unpublishReview(\'' + r.id + '\')" style="font-size:11px;">Unpublish</button>';
  }

  if (r.photos && r.photos.length > 0 && !r.photoAddedToGallery) {
    html += '<button class="btn btn-outline btn-sm" onclick="addReviewPhotosToGallery(\'' + r.id + '\')" style="font-size:11px;">Add Photos to Gallery</button>';
  }
  if (r.photoAddedToGallery) {
    html += '<span class="badge badge-success" style="font-size:11px;">✓ Photos in Gallery</span>';
  }

  html += '<button class="btn btn-outline btn-sm" onclick="copyForGoogleReview(\'' + r.id + '\')" style="margin-left:auto;">Copy for Google Reviews</button>';

  html += '</div>';

  // Reply section (if review is published and has no owner reply yet)
  if (r.publishedToSite || r.status === 'approved') {
    html += '<div style="border-top:1px solid var(--card-border);padding-top:14px;margin-top:14px;">';
    if (r.ownerReply) {
      html += '<div style="padding:10px;background:var(--card-bg);border-radius:var(--radius);margin-bottom:10px;">';
      html += '<div style="font-size:12px;color:var(--text-dim);font-weight:600;margin-bottom:4px;">Your Reply:</div>';
      html += '<div style="font-size:13px;color:var(--text);">"' + escHtml(r.ownerReply) + '"</div>';
      html += '<button class="btn btn-outline btn-xs" onclick="deleteOwnerReply(\'' + r.id + '\')" style="margin-top:6px;font-size:11px;">Delete Reply</button>';
      html += '</div>';
    } else {
      html += '<div style="margin-bottom:10px;">';
      html += '<div style="font-size:12px;color:var(--text-dim);font-weight:600;margin-bottom:6px;">Reply to this review (sent via SMS)</div>';
      html += '<textarea id="reply-text-' + r.id + '" placeholder="Type your reply..." style="width:100%;padding:8px;border:1px solid var(--card-border);border-radius:var(--radius);font-size:13px;min-height:60px;font-family:inherit;resize:vertical;"></textarea>';
      html += '<button class="btn btn-primary btn-sm" onclick="sendReplyToReview(\'' + r.id + '\')" style="margin-top:6px;white-space:nowrap;">Send Reply via SMS</button>';
      html += '</div>';
    }
    html += '</div>';
  }

  html += '</div>';
  return html;
}

function renderStars(rating) {
  var html = '';
  for (var i = 1; i <= 5; i++) {
    html += '<span style="color:' + (i <= rating ? '#f59e0b' : '#374151') + ';font-size:18px;">&#9733;</span>';
  }
  return html;
}

function renderStarsInline(rating) {
  var html = '';
  for (var i = 1; i <= 5; i++) {
    html += '<span style="color:' + (i <= rating ? '#f59e0b' : '#374151') + ';font-size:12px;">&#9733;</span>';
  }
  return html;
}

function getReviewStatusBadge(r) {
  if (r.publishedToSite) return '<span class="badge badge-success">Published</span>';
  if (r.status === 'approved') return '<span class="badge badge-info">Approved</span>';
  if (r.status === 'pending') return '<span class="badge badge-warning">Pending</span>';
  if (r.status === 'rejected') return '<span class="badge" style="background:rgba(239,68,68,0.1);color:#ef4444;">Rejected</span>';
  return '';
}

// ---- Review Actions ----

async function approveReview(id) {
  var r = _reviews.find(function(x) { return x.id === id; });
  if (!r) return;
  r.status = 'approved';
  await CC.dashboard.updateReview(r._apiId || id, { status: 'approved' });
  renderReviewStats();
  renderReviewsList();
  toast('Review from ' + r.customerName + ' approved!');
}

async function approveReviewText(id) {
  var r = _reviews.find(function(x) { return x.id === id; });
  if (!r) return;
  r.status = 'approved';
  await CC.dashboard.updateReview(r._apiId || id, { status: 'approved', publish_text: true, publish_photos: false });
  renderReviewStats();
  renderReviewsList();
  toast('Review text approved (photos not published)!');
}

async function approveReviewPhotos(id) {
  var r = _reviews.find(function(x) { return x.id === id; });
  if (!r) return;
  r.status = 'approved';
  r.photoAddedToGallery = true;
  await CC.dashboard.updateReview(r._apiId || id, { status: 'approved', publish_text: false, publish_photos: true, photo_added_to_gallery: true });
  // Also add photos to gallery
  if (r.photos && r.photos.length > 0) {
    for (var i = 0; i < r.photos.length; i++) {
      await CC.dashboard.uploadMedia({ url: r.photos[i], type: 'review-photo', review_id: id });
    }
  }
  renderReviewStats();
  renderReviewsList();
  toast(r.photos.length + ' photo(s) approved and added to gallery!');
}

async function approveReviewBoth(id) {
  var r = _reviews.find(function(x) { return x.id === id; });
  if (!r) return;
  r.status = 'approved';
  r.photoAddedToGallery = true;
  await CC.dashboard.updateReview(r._apiId || id, { status: 'approved', publish_text: true, publish_photos: true, photo_added_to_gallery: true });
  // Also add photos to gallery
  if (r.photos && r.photos.length > 0) {
    for (var i = 0; i < r.photos.length; i++) {
      await CC.dashboard.uploadMedia({ url: r.photos[i], type: 'review-photo', review_id: id });
    }
  }
  renderReviewStats();
  renderReviewsList();
  toast('Review and photos approved!');
}

async function rejectReview(id) {
  var r = _reviews.find(function(x) { return x.id === id; });
  if (!r) return;
  if (!confirm('Reject this review from ' + r.customerName + '? It will not be published.')) return;
  r.status = 'rejected';
  await CC.dashboard.updateReview(r._apiId || id, { status: 'rejected' });
  renderReviewStats();
  renderReviewsList();
  toast('Review rejected.');
}

async function publishReview(id) {
  var r = _reviews.find(function(x) { return x.id === id; });
  if (!r) return;
  r.publishedToSite = true;
  r.status = 'published';
  await CC.dashboard.updateReview(r._apiId || id, { status: 'published' });
  renderReviewStats();
  renderReviewsList();
  toast('Review published to your website!', 'success');
}

function unpublishReview(id) {
  var r = _reviews.find(function(x) { return x.id === id; });
  if (!r) return;
  r.publishedToSite = false;
  saveReviews();
  renderReviewStats();
  renderReviewsList();
  toast('Review removed from website.');
}

function addReviewPhotosToGallery(id) {
  var r = _reviews.find(function(x) { return x.id === id; });
  if (!r) return;
  r.photoAddedToGallery = true;
  saveReviews();
  renderReviewsList();
  toast(r.photos.length + ' photo(s) added to your gallery!', 'success');
  // In production: copy images to media library
}

function copyForGoogleReview(id) {
  var r = _reviews.find(function(x) { return x.id === id; });
  if (!r) return;

  // Build a clean copy-friendly version
  var text = '';
  for (var i = 0; i < r.rating; i++) text += '\u2B50';
  text += '\n\n' + r.reviewText;
  text += '\n\n- ' + r.customerName;

  if (navigator.clipboard) {
    navigator.clipboard.writeText(text);
  } else {
    var ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }

  toast('Review copied! Paste it into Google Reviews.', 'success');
}

// ---- Owner Replies ----

async function sendReplyToReview(id) {
  var r = _reviews.find(function(x) { return x.id === id; });
  if (!r) return;

  var replyText = document.getElementById('reply-text-' + id).value.trim();
  if (!replyText) {
    toast('Please type a reply', 'error');
    return;
  }

  if (replyText.length > 160) {
    toast('Reply must be 160 characters or less for SMS', 'error');
    return;
  }

  try {
    // Save reply to review record
    r.ownerReply = replyText;
    await CC.dashboard.updateReview(r._apiId || id, { owner_reply: replyText });

    // Send SMS to customer
    var smsBody = 'Thanks for your review, ' + r.customerName + '! We appreciate the feedback: ' + replyText;
    await CC.dashboard.sendSMS({
      to: r.customerPhone || r.phone,
      body: smsBody
    });

    renderReviewsList();
    toast('Reply sent to ' + r.customerName + ' via SMS!', 'success');
  } catch (err) {
    toast('Error sending reply: ' + err.message, 'error');
  }
}

async function deleteOwnerReply(id) {
  var r = _reviews.find(function(x) { return x.id === id; });
  if (!r) return;

  if (!confirm('Delete your reply to this review?')) return;

  try {
    r.ownerReply = null;
    await CC.dashboard.updateReview(r._apiId || id, { owner_reply: null });
    renderReviewsList();
    toast('Reply deleted');
  } catch (err) {
    toast('Error deleting reply: ' + err.message, 'error');
  }
}

// ---- Review Reminders ----

async function sendReviewReminders() {
  var oldPending = _reviews.filter(function(r) {
    if (r.status !== 'pending') return false;
    var daysSince = (new Date() - new Date(r.submittedAt || r.createdAt)) / (1000 * 60 * 60 * 24);
    return daysSince > 2;
  });

  if (oldPending.length === 0) {
    toast('No pending reviews to remind', 'info');
    return;
  }

  if (!confirm('Send reminder SMS to ' + oldPending.length + ' customer(s)?')) {
    return;
  }

  var sent = 0;
  var failed = 0;

  for (var i = 0; i < oldPending.length; i++) {
    var r = oldPending[i];
    try {
      var reviewUrl = window.location.origin + '/review.html?token=' + r.reviewToken;
      var smsBody = 'Hi ' + r.customerName + ', just following up! 😊 We\'d love to hear about your experience. Review link: ' + reviewUrl;
      await CC.dashboard.sendSMS({
        to: r.customerPhone,
        body: smsBody
      });
      sent++;
    } catch (err) {
      console.warn('Failed to send reminder to ' + r.customerName, err);
      failed++;
    }
  }

  toast('Sent ' + sent + ' reminders' + (failed > 0 ? ' (' + failed + ' failed)' : ''), 'success');
  renderReviewStats();
}

// ---- Send Review Request ----

function renderSendReviewRequest() {
  var container = document.getElementById('send-review-request');
  if (!container) return;

  var html = '<div style="background:var(--bg);border:1px solid var(--card-border);border-radius:var(--radius-lg);padding:20px;">';
  html += '<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">';
  html += '<div style="width:40px;height:40px;border-radius:50%;background:rgba(59,130,246,0.15);display:flex;align-items:center;justify-content:center;font-size:18px;">📧</div>';
  html += '<div>';
  html += '<strong style="font-size:14px;display:block;">Send Review Request</strong>';
  html += '<p style="font-size:12px;color:var(--text-dim);margin:2px 0;">Send a one-time link to a customer so they can leave a review</p>';
  html += '</div>';
  html += '</div>';

  html += '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px;">';
  html += '<input type="text" id="review-customer-name" placeholder="Customer name" style="flex:1;padding:10px;border:1px solid var(--card-border);border-radius:var(--radius);font-size:13px;min-width:150px;">';
  html += '<input type="tel" id="review-customer-phone" placeholder="Phone (SMS)" style="flex:1;padding:10px;border:1px solid var(--card-border);border-radius:var(--radius);font-size:13px;min-width:150px;">';
  html += '<input type="text" id="review-booking-id" placeholder="Booking ID (optional)" style="flex:1;padding:10px;border:1px solid var(--card-border);border-radius:var(--radius);font-size:13px;min-width:150px;">';
  html += '<button class="btn btn-primary btn-sm" onclick="sendReviewRequest()" style="white-space:nowrap;">Send Review Link</button>';
  html += '</div>';

  html += '<div style="font-size:12px;color:var(--text-dim);line-height:1.6;">';
  html += '✓ Customer gets unique link via SMS<br>';
  html += '✓ Only they can access it<br>';
  html += '✓ Link works one time only<br>';
  html += '✓ One review per booking prevented';
  html += '</div>';

  html += '</div>';
  container.innerHTML = html;
}

async function sendReviewRequest() {
  var name = document.getElementById('review-customer-name').value.trim();
  var phone = document.getElementById('review-customer-phone').value.trim();
  var bookingId = document.getElementById('review-booking-id').value.trim();

  if (!name || !phone) {
    toast('Please enter customer name and phone', 'error');
    return;
  }

  // Check for duplicate reviews (prevent customer from reviewing same booking twice)
  var existingReview = _reviews.find(function(r) {
    var phoneMatch = r.customerPhone && r.customerPhone.replace(/\D/g, '') === phone.replace(/\D/g, '');
    var bookingMatch = bookingId ? (r.bookingId === bookingId) : false;
    var notRejected = r.status !== 'rejected';
    return phoneMatch && bookingMatch && notRejected;
  });

  if (existingReview && bookingId) {
    var confirm_msg = 'This customer already has a ' + existingReview.status + ' review for booking ' + bookingId + '. Send anyway?';
    if (!confirm(confirm_msg)) {
      return;
    }
  }

  // Generate unique token
  var token = 'rv_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);

  // Create review record with token
  var reviewRecord = {
    customer_name: name,
    phone: phone,
    review_token: token,
    status: 'pending',
    booking_id: bookingId || null
  };

  // Save to API and send SMS
  try {
    await CC.dashboard.createReviewWithToken(reviewRecord);

    var reviewUrl = window.location.origin + '/review.html?token=' + token;
    var smsBody = 'Hi ' + name + '! Thank you for booking with us. Please share your experience: ' + reviewUrl;

    await CC.dashboard.sendSMS({
      to: phone,
      body: smsBody
    });

    // Notify business owner that a review was submitted
    try {
      var ownerPhone = sessionStorage.getItem('ownerPhone') || sessionStorage.getItem('owner_phone');
      if (ownerPhone) {
        var ownerSmsBody = 'New review from ' + name + '! 📝 They\'ll submit their feedback via the link you sent. Approve it in your dashboard when ready.';
        await CC.dashboard.sendSMS({
          to: ownerPhone,
          body: ownerSmsBody
        });
      }
    } catch (err) {
      console.warn('Could not send owner notification SMS:', err);
      // Don't fail the whole flow if owner notification fails
    }

    toast('Review request sent! Customer will receive SMS with link.', 'success');
    document.getElementById('review-customer-name').value = '';
    document.getElementById('review-customer-phone').value = '';
    document.getElementById('review-booking-id').value = '';
    loadReviews(); // Refresh to show the new pending review
  } catch (err) {
    toast('Error sending review request: ' + err.message, 'error');
  }
}

// ---- Custom Review Questions ----

function renderCustomQuestions() {
  var container = document.getElementById('review-questions-editor');
  if (!container) return;

  var html = '';

  html += '<p style="font-size:13px;color:var(--text-muted);margin-bottom:16px;">These questions appear on the review form your customers see. Drag to reorder, toggle to enable/disable.</p>';

  _reviewQuestions.forEach(function(q, idx) {
    var typeLabel = q.type === 'stars' ? 'Star Rating' : (q.type === 'yesno' ? 'Yes/No' : 'Text');
    var typeBadgeColor = q.type === 'stars' ? '#f59e0b' : (q.type === 'yesno' ? '#4DA6FF' : '#22c55e');

    html += '<div style="display:flex;align-items:center;gap:12px;padding:14px 16px;background:var(--bg);border:1px solid var(--card-border);border-radius:var(--radius);margin-bottom:8px;' + (!q.enabled ? 'opacity:0.5;' : '') + '">';

    // Drag handle
    html += '<div style="color:var(--text-dim);cursor:grab;font-size:16px;">\u2630</div>';

    // Question text
    html += '<div style="flex:1;">';
    html += '<input type="text" value="' + escHtml(q.text) + '" onchange="updateQuestionText(\'' + q.id + '\',this.value)" style="border:none;background:transparent;font-size:14px;color:var(--text);width:100%;padding:0;">';
    html += '</div>';

    // Type badge
    html += '<span style="font-size:11px;padding:3px 8px;background:' + typeBadgeColor + '22;color:' + typeBadgeColor + ';border-radius:10px;white-space:nowrap;">' + typeLabel + '</span>';

    // Type selector
    html += '<select onchange="updateQuestionType(\'' + q.id + '\',this.value)" style="padding:4px 8px;font-size:12px;background:var(--card-bg);border:1px solid var(--card-border);border-radius:4px;color:var(--text);">';
    html += '<option value="stars"' + (q.type === 'stars' ? ' selected' : '') + '>Stars</option>';
    html += '<option value="yesno"' + (q.type === 'yesno' ? ' selected' : '') + '>Yes/No</option>';
    html += '<option value="text"' + (q.type === 'text' ? ' selected' : '') + '>Text</option>';
    html += '</select>';

    // Enable toggle
    html += '<label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12px;color:var(--text-dim);">';
    html += '<input type="checkbox" ' + (q.enabled ? 'checked' : '') + ' onchange="toggleQuestion(\'' + q.id + '\',this.checked)">';
    html += '</label>';

    // Delete
    html += '<button onclick="deleteQuestion(\'' + q.id + '\')" style="background:none;border:none;color:var(--danger);cursor:pointer;font-size:16px;padding:4px;">&times;</button>';

    html += '</div>';
  });

  // Add new question button
  html += '<button class="btn btn-outline btn-sm" onclick="addNewQuestion()" style="margin-top:8px;">+ Add Question</button>';

  container.innerHTML = html;
}

function updateQuestionText(id, text) {
  var q = _reviewQuestions.find(function(x) { return x.id === id; });
  if (q) { q.text = text; saveReviewQuestions(); }
}

function updateQuestionType(id, type) {
  var q = _reviewQuestions.find(function(x) { return x.id === id; });
  if (q) { q.type = type; saveReviewQuestions(); renderCustomQuestions(); }
}

function toggleQuestion(id, enabled) {
  var q = _reviewQuestions.find(function(x) { return x.id === id; });
  if (q) { q.enabled = enabled; saveReviewQuestions(); renderCustomQuestions(); }
}

function deleteQuestion(id) {
  if (!confirm('Delete this question?')) return;
  var q = _reviewQuestions.find(function(x) { return x.id === id; });
  if (q && q._apiId) {
    // Delete from API
    CC.dashboard.deleteReviewQuestion(q._apiId).catch(function(e) {
      console.warn('Failed to delete from API:', e);
    });
  }
  _reviewQuestions = _reviewQuestions.filter(function(x) { return x.id !== id; });
  saveReviewQuestions();
  renderCustomQuestions();
  toast('Question deleted');
}

function addNewQuestion() {
  var newId = 'q' + Date.now().toString(36);
  _reviewQuestions.push({
    id: newId,
    text: 'New question...',
    type: 'stars',
    enabled: true
  });
  saveReviewQuestions();
  renderCustomQuestions();
  toast('Question added');
}

// ---- Review Settings ----

function renderReviewSettings() {
  var container = document.getElementById('review-settings');
  if (!container) return;

  var settings;
  try {
    settings = JSON.parse(localStorage.getItem('beachside_review_settings') || '{}');
  } catch(e) { settings = {}; }

  var autoSend = settings.autoSendReviewRequest !== false; // default true
  var delayHours = settings.reviewDelayHours || 2;
  var googleReviewUrl = settings.googleReviewUrl || '';

  var html = '';

  // Auto-send review request
  html += '<div style="display:flex;align-items:center;gap:12px;padding:14px 16px;background:var(--bg);border:1px solid var(--card-border);border-radius:var(--radius);margin-bottom:12px;">';
  html += '<div style="flex:1;">';
  html += '<div style="font-size:14px;font-weight:600;color:var(--text);">Auto-send review request after trip</div>';
  html += '<div style="font-size:12px;color:var(--text-dim);">Automatically send SMS review link after a booking is completed</div>';
  html += '</div>';
  html += '<label class="toggle-switch"><input type="checkbox" ' + (autoSend ? 'checked' : '') + ' onchange="updateReviewSetting(\'autoSendReviewRequest\',this.checked)"><span class="toggle-slider"></span></label>';
  html += '</div>';

  // Delay
  html += '<div style="display:flex;align-items:center;gap:12px;padding:14px 16px;background:var(--bg);border:1px solid var(--card-border);border-radius:var(--radius);margin-bottom:12px;">';
  html += '<div style="flex:1;">';
  html += '<div style="font-size:14px;font-weight:600;color:var(--text);">Delay before sending</div>';
  html += '<div style="font-size:12px;color:var(--text-dim);">Hours after trip completion to send review request</div>';
  html += '</div>';
  html += '<select onchange="updateReviewSetting(\'reviewDelayHours\',parseInt(this.value))" style="padding:6px 12px;background:var(--card-bg);border:1px solid var(--card-border);border-radius:var(--radius);color:var(--text);">';
  [1,2,4,8,24,48].forEach(function(h) {
    html += '<option value="' + h + '"' + (delayHours === h ? ' selected' : '') + '>' + h + ' hour' + (h !== 1 ? 's' : '') + '</option>';
  });
  html += '</select>';
  html += '</div>';

  // Google Reviews URL
  html += '<div style="padding:14px 16px;background:var(--bg);border:1px solid var(--card-border);border-radius:var(--radius);margin-bottom:12px;">';
  html += '<div style="font-size:14px;font-weight:600;color:var(--text);margin-bottom:4px;">Google Reviews Link</div>';
  html += '<div style="font-size:12px;color:var(--text-dim);margin-bottom:10px;">After customers submit a review, they\'ll see a one-click button to also post on Google.</div>';
  html += '<input type="text" value="' + escHtml(googleReviewUrl) + '" placeholder="https://g.page/your-business/review" style="width:100%;" onchange="updateReviewSetting(\'googleReviewUrl\',this.value)">';
  html += '</div>';

  // Google Business Profile — sync reviews from connected account
  html += '<div id="gbp-sync-banner" style="padding:16px;border:1px solid var(--card-border);border-radius:var(--radius);margin-bottom:12px;">';
  html += '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">';
  html += '<div>';
  html += '<div style="font-size:14px;font-weight:600;color:var(--text);">Google Business Profile Reviews</div>';
  html += '<div id="gbp-sync-desc" style="font-size:12px;color:var(--text-dim);margin-top:2px;">Connect Google Business to import your existing Google reviews.</div>';
  html += '</div>';
  html += '<div style="display:flex;gap:8px;flex-wrap:wrap;">';
  html += '<button id="gbp-sync-btn" class="btn btn-primary btn-sm" onclick="syncGoogleReviewsFromReviewsTab()" style="display:none;">↻ Sync Google Reviews</button>';
  html += '<a id="gbp-connect-link" href="#connections" class="btn btn-outline btn-sm">Connect Google →</a>';
  html += '</div>';
  html += '</div>';
  html += '<div id="gbp-sync-result" style="font-size:12px;color:var(--text-muted);margin-top:8px;display:none;"></div>';
  html += '</div>';

  // Review SMS template preview
  html += '<div style="padding:14px 16px;background:var(--bg);border:1px solid var(--card-border);border-radius:var(--radius);">';
  html += '<div style="font-size:14px;font-weight:600;color:var(--text);margin-bottom:8px;">Review Request SMS Preview</div>';
  html += '<div style="padding:14px 16px;background:#1a3a1a;border-radius:12px 12px 12px 4px;font-size:13px;color:#86efac;line-height:1.6;max-width:320px;">';
  html += 'Hi Sarah! Thanks for your trip with Beachside Circle Boats! We\'d love your feedback.<br><br>';
  html += 'Leave a quick review (takes 1 min):<br>';
  html += '<span style="color:#4DA6FF;text-decoration:underline;">cybercheck.app/review/rv_abc123</span><br><br>';
  html += 'You can record a voice review or type one. We\'d really appreciate it!';
  html += '</div>';
  html += '<div style="font-size:11px;color:var(--text-dim);margin-top:6px;">This is a one-time link. Only the customer can access it.</div>';
  html += '</div>';

  container.innerHTML = html;

  // Populate GBP sync banner based on real connection status
  loadGbpSyncBannerStatus();
}

function loadGbpSyncBannerStatus() {
  var token = typeof getAuthToken === 'function' ? getAuthToken() : null;
  if (!token) return;

  fetch((window.CC_API_BASE || '') + '/api/dashboard/google-business/status', {
    headers: { 'Authorization': 'Bearer ' + token }
  })
  .then(function(r) { return r.json(); })
  .then(function(data) {
    var desc    = document.getElementById('gbp-sync-desc');
    var syncBtn = document.getElementById('gbp-sync-btn');
    var connLink = document.getElementById('gbp-connect-link');
    if (!desc) return;

    if (data.connected) {
      desc.textContent = '✓ Connected' + (data.account_email ? ' as ' + data.account_email : '') + '. Import your Google reviews into the platform.';
      if (syncBtn)   { syncBtn.style.display = '';      }
      if (connLink)  { connLink.style.display = 'none'; }
    } else {
      desc.textContent = 'Connect your Google Business Profile to import existing Google reviews.';
      if (syncBtn)   { syncBtn.style.display = 'none'; }
      if (connLink)  { connLink.style.display = '';    }
    }
  })
  .catch(function() { /* banner stays in default state */ });
}

function syncGoogleReviewsFromReviewsTab() {
  var token = typeof getAuthToken === 'function' ? getAuthToken() : null;
  if (!token) return;

  var btn    = document.getElementById('gbp-sync-btn');
  var result = document.getElementById('gbp-sync-result');
  if (btn) { btn.disabled = true; btn.textContent = 'Syncing…'; }
  if (result) { result.style.display = 'none'; }

  fetch((window.CC_API_BASE || '') + '/api/dashboard/google-business/sync-reviews', {
    method:  'POST',
    headers: { 'Authorization': 'Bearer ' + token }
  })
  .then(function(r) { return r.json(); })
  .then(function(data) {
    if (btn) { btn.disabled = false; btn.textContent = '↻ Sync Google Reviews'; }
    if (result) {
      result.textContent = data.error
        ? 'Error: ' + data.error
        : 'Imported ' + (data.imported || 0) + ' new review' + (data.imported !== 1 ? 's' : '') +
          (data.skipped ? ' · ' + data.skipped + ' already synced' : '') + '.';
      result.style.display = 'block';
    }
    // Reload review list to show newly imported reviews
    if (!data.error && data.imported > 0 && typeof loadReviews === 'function') {
      setTimeout(loadReviews, 800);
    }
  })
  .catch(function(err) {
    if (btn) { btn.disabled = false; btn.textContent = '↻ Sync Google Reviews'; }
    if (result) { result.textContent = 'Sync failed: ' + err.message; result.style.display = 'block'; }
  });
}

function updateReviewSetting(key, value) {
  var settings;
  try { settings = JSON.parse(localStorage.getItem('beachside_review_settings') || '{}'); } catch(e) { settings = {}; }
  settings[key] = value;
  try { localStorage.setItem('beachside_review_settings', JSON.stringify(settings)); } catch(e) {}
  toast('Setting updated');
}

// ---- Utilities ----

if (typeof escHtml === 'undefined') {
  function escHtml(str) {
    var div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }
}

onPageLoad('reviews', loadReviews);
