// ============================================
// Receipt-Verified Review System
// ============================================

// State management
const reviewState = {
  hasReceipt: false,
  receiptImage: null,
  detectedItems: [],
  selectedItems: [],
  ratings: {},
  overallRating: 0
};

// Business data (in production, this comes from URL/database)
const businessData = {
  id: 'sandbar-restaurant',
  name: 'The Sandbar Restaurant',
  category: 'restaurant'
};

// ============================================
// Receipt Upload & OCR
// ============================================

// Setup drag & drop
const uploadArea = document.getElementById('uploadArea');
const receiptInput = document.getElementById('receiptInput');

uploadArea?.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadArea.classList.add('drag-over');
});

uploadArea?.addEventListener('dragleave', () => {
  uploadArea.classList.remove('drag-over');
});

uploadArea?.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadArea.classList.remove('drag-over');

  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) {
    handleReceiptUpload(file);
  }
});

uploadArea?.addEventListener('click', () => {
  receiptInput?.click();
});

receiptInput?.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    handleReceiptUpload(file);
  }
});

async function handleReceiptUpload(file) {
  reviewState.hasReceipt = true;
  reviewState.receiptImage = file;

  // Show preview
  const reader = new FileReader();
  reader.onload = (e) => {
    document.getElementById('previewImage').src = e.target.result;
    document.getElementById('uploadArea').style.display = 'none';
    document.getElementById('receiptPreview').style.display = 'block';
  };
  reader.readAsDataURL(file);

  // Simulate OCR processing
  showOCRProcessing();

  // In production: Send to OCR API
  const detectedItems = await simulateOCR(file);

  hideOCRProcessing();
  displayDetectedItems(detectedItems);
}

function showOCRProcessing() {
  document.getElementById('ocrStatus').style.display = 'block';
}

function hideOCRProcessing() {
  document.getElementById('ocrStatus').style.display = 'none';
}

async function simulateOCR(file) {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 2500));

  // Simulated OCR results - in production, this comes from OCR API
  return [
    { id: 1, name: 'Grilled Shrimp Tacos', price: 16.99 },
    { id: 2, name: 'Fish & Chips', price: 14.99 },
    { id: 3, name: 'Caesar Salad', price: 8.99 },
    { id: 4, name: 'Key Lime Pie', price: 7.99 },
    { id: 5, name: 'Corona Extra', price: 5.50 }
  ];

  /* In production:
  const formData = new FormData();
  formData.append('receipt', file);
  formData.append('business_id', businessData.id);

  const response = await fetch('/api/ocr/receipt', {
    method: 'POST',
    body: formData
  });

  const data = await response.json();
  return data.items;
  */
}

function displayDetectedItems(items) {
  reviewState.detectedItems = items;

  const itemsList = document.getElementById('itemsList');
  itemsList.innerHTML = items.map(item => `
    <label class="item-checkbox" data-item-id="${item.id}">
      <input type="checkbox" value="${item.id}" onchange="toggleItem(${item.id}, this.checked)">
      <div class="item-info">
        <div class="item-name">${item.name}</div>
        <div class="item-price">$${item.price.toFixed(2)}</div>
      </div>
    </label>
  `).join('');

  document.getElementById('detectedItems').style.display = 'block';

  // Auto-select all items by default
  items.forEach(item => {
    const checkbox = itemsList.querySelector(`input[value="${item.id}"]`);
    if (checkbox) {
      checkbox.checked = true;
      toggleItem(item.id, true);
    }
  });
}

function toggleItem(itemId, checked) {
  const checkbox = document.querySelector(`input[value="${itemId}"]`);
  const label = checkbox?.closest('.item-checkbox');

  if (checked) {
    reviewState.selectedItems.push(itemId);
    label?.classList.add('selected');
  } else {
    reviewState.selectedItems = reviewState.selectedItems.filter(id => id !== itemId);
    label?.classList.remove('selected');
  }
}

function removeReceipt() {
  reviewState.hasReceipt = false;
  reviewState.receiptImage = null;
  reviewState.detectedItems = [];
  reviewState.selectedItems = [];

  document.getElementById('uploadArea').style.display = 'flex';
  document.getElementById('receiptPreview').style.display = 'none';
  document.getElementById('detectedItems').style.display = 'none';
  receiptInput.value = '';
}

function skipReceipt() {
  reviewState.hasReceipt = false;
  proceedToRating();
}

// ============================================
// Rating Section
// ============================================

function proceedToRating() {
  // Hide upload section
  document.getElementById('uploadSection').style.display = 'none';

  // Show rating section
  const ratingSection = document.getElementById('ratingSection');
  ratingSection.style.display = 'block';
  ratingSection.scrollIntoView({ behavior: 'smooth' });

  if (reviewState.hasReceipt && reviewState.selectedItems.length > 0) {
    // Show item ratings
    displayItemRatings();
  } else {
    // Show overall rating
    displayOverallRating();
  }
}

function displayItemRatings() {
  document.getElementById('ratingTitle').textContent = 'Rate Each Item';
  document.getElementById('ratingSubtitle').textContent = 'Help others know what to order';

  const itemRatings = document.getElementById('itemRatings');
  const selectedItems = reviewState.detectedItems.filter(item =>
    reviewState.selectedItems.includes(item.id)
  );

  itemRatings.innerHTML = selectedItems.map(item => `
    <div class="item-rating-card">
      <h4>${item.name}</h4>
      <div class="star-rating" data-item-id="${item.id}">
        ${[1, 2, 3, 4, 5].map(rating => `
          <svg class="star empty" data-rating="${rating}" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" onclick="rateItem(${item.id}, ${rating})">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
        `).join('')}
      </div>
    </div>
  `).join('');

  itemRatings.style.display = 'flex';
  document.getElementById('overallRating').style.display = 'none';
}

function displayOverallRating() {
  document.getElementById('ratingTitle').textContent = 'Rate Your Experience';
  document.getElementById('ratingSubtitle').textContent = 'How was your overall experience?';

  document.getElementById('itemRatings').style.display = 'none';
  document.getElementById('overallRating').style.display = 'block';

  // Setup overall rating stars
  const stars = document.querySelectorAll('#overallRating .star');
  stars.forEach(star => {
    star.addEventListener('click', () => {
      const rating = parseInt(star.dataset.rating);
      rateOverall(rating);
    });
  });
}

function rateItem(itemId, rating) {
  reviewState.ratings[itemId] = rating;

  // Update stars visually
  const container = document.querySelector(`[data-item-id="${itemId}"]`);
  const stars = container.querySelectorAll('.star');

  stars.forEach((star, index) => {
    if (index < rating) {
      star.classList.remove('empty');
      star.classList.add('filled');
    } else {
      star.classList.remove('filled');
      star.classList.add('empty');
    }
  });

  // Check if all items are rated
  checkAllItemsRated();
}

function rateOverall(rating) {
  reviewState.overallRating = rating;

  // Update stars visually
  const stars = document.querySelectorAll('#overallRating .star');
  stars.forEach((star, index) => {
    if (index < rating) {
      star.classList.remove('empty');
      star.classList.add('filled');
    } else {
      star.classList.remove('filled');
      star.classList.add('empty');
    }
  });

  // Proceed to write section after rating
  setTimeout(() => {
    proceedToWriteReview();
  }, 500);
}

function checkAllItemsRated() {
  const allRated = reviewState.selectedItems.every(itemId =>
    reviewState.ratings[itemId] !== undefined
  );

  if (allRated) {
    setTimeout(() => {
      proceedToWriteReview();
    }, 500);
  }
}

// ============================================
// Write Review Section
// ============================================

function proceedToWriteReview() {
  document.getElementById('ratingSection').style.display = 'none';

  const writeSection = document.getElementById('writeSection');
  writeSection.style.display = 'block';
  writeSection.scrollIntoView({ behavior: 'smooth' });
}

// Character counter
const reviewTextarea = document.getElementById('reviewText');
const charCount = document.getElementById('charCount');

reviewTextarea?.addEventListener('input', (e) => {
  const length = e.target.value.length;
  charCount.textContent = Math.min(length, 500);

  if (length > 500) {
    e.target.value = e.target.value.substring(0, 500);
  }
});

// ============================================
// Form Submission
// ============================================

document.getElementById('reviewForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const formData = {
    business_id: businessData.id,
    business_name: businessData.name,
    title: document.getElementById('reviewTitle').value,
    review: document.getElementById('reviewText').value,
    visitor_name: document.getElementById('visitorName').value,
    visitor_email: document.getElementById('visitorEmail').value,
    allow_contact: document.getElementById('allowContact').checked,
    has_receipt: reviewState.hasReceipt,
    overall_rating: reviewState.overallRating,
    item_ratings: reviewState.ratings,
    timestamp: new Date().toISOString()
  };

  // Show loading state
  const submitBtn = e.target.querySelector('.btn-submit');
  const originalText = submitBtn.innerHTML;
  submitBtn.innerHTML = `
    <svg class="spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"/>
    </svg>
    Submitting...
  `;
  submitBtn.disabled = true;

  try {
    // In production: Submit to API with receipt image if present
    await submitReview(formData);

    // Show success
    showSuccess();

  } catch (error) {
    console.error('Error submitting review:', error);
    alert('Oops! Something went wrong. Please try again.');

    // Restore button
    submitBtn.innerHTML = originalText;
    submitBtn.disabled = false;
  }
});

async function submitReview(data) {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log('Review submitted:', data);

  /* In production:
  const formData = new FormData();

  // Add all review data
  Object.keys(data).forEach(key => {
    if (typeof data[key] === 'object') {
      formData.append(key, JSON.stringify(data[key]));
    } else {
      formData.append(key, data[key]);
    }
  });

  // Add receipt image if present
  if (reviewState.receiptImage) {
    formData.append('receipt_image', reviewState.receiptImage);
  }

  const response = await fetch('/api/reviews', {
    method: 'POST',
    body: formData
  });

  return response.json();
  */
}

function showSuccess() {
  document.getElementById('writeSection').style.display = 'none';

  const successSection = document.getElementById('successSection');
  successSection.style.display = 'block';
  successSection.scrollIntoView({ behavior: 'smooth' });

  // Show verified badge if receipt was uploaded
  if (reviewState.hasReceipt) {
    document.getElementById('verifiedBadge').style.display = 'inline-flex';
  }

  // Track conversion
  console.log('Review conversion:', {
    business: businessData.name,
    verified: reviewState.hasReceipt,
    item_count: reviewState.selectedItems.length
  });
}

// ============================================
// Continue Button from Upload Section
// ============================================

// Add event listener for when user selects items
document.addEventListener('DOMContentLoaded', () => {
  // Check if items are selected, then show continue button
  const detectedItemsDiv = document.getElementById('detectedItems');
  if (detectedItemsDiv) {
    // Create continue button dynamically
    const continueBtn = document.createElement('button');
    continueBtn.className = 'btn-submit';
    continueBtn.style.marginTop = '20px';
    continueBtn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M13 7l5 5m0 0l-5 5m5-5H6"/>
      </svg>
      Continue to Rating
    `;
    continueBtn.onclick = proceedToRating;

    // Add after items list
    detectedItemsDiv.appendChild(continueBtn);
  }
});

// ============================================
// Initialize
// ============================================

console.log('%cReceipt-Verified Review System Ready', 'font-size: 16px; font-weight: bold; color: #667eea;');
console.log('Business:', businessData.name);
