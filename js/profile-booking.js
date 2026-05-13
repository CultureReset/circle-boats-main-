// ============================================
// Profile Booking JavaScript
// ============================================

let selectedDate = null;
let selectedTime = null;
let partySize = 2;

// ============================================
// Initialize on Load
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  initializeDateInput();
  initializeTimeSlots();
  initializePartySizeControls();
  initializeForm();
  setMinDate();
});

// ============================================
// Date Input
// ============================================

function setMinDate() {
  const dateInput = document.getElementById('bookingDate');
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const minDate = tomorrow.toISOString().split('T')[0];
  dateInput.min = minDate;
  dateInput.value = minDate;

  selectedDate = minDate;
  updateSummary();
}

function initializeDateInput() {
  const dateInput = document.getElementById('bookingDate');

  dateInput.addEventListener('change', (e) => {
    selectedDate = e.target.value;
    updateSummary();

    // In production: fetch available times for selected date
    console.log('Date selected:', selectedDate);
  });
}

// ============================================
// Time Slots
// ============================================

function initializeTimeSlots() {
  const timeSlots = document.querySelectorAll('.time-slot:not(.unavailable)');

  timeSlots.forEach(slot => {
    slot.addEventListener('click', () => {
      // Remove previous selection
      timeSlots.forEach(s => s.classList.remove('selected'));

      // Select clicked slot
      slot.classList.add('selected');
      selectedTime = slot.dataset.time;

      // Update summary
      updateSummary();

      console.log('Time selected:', selectedTime);
    });
  });
}

// ============================================
// Party Size
// ============================================

function initializePartySizeControls() {
  const partySizeInput = document.getElementById('partySize');

  partySizeInput.addEventListener('change', () => {
    partySize = parseInt(partySizeInput.value);
    updateSummary();
  });
}

function adjustPartySize(change) {
  const partySizeInput = document.getElementById('partySize');
  let currentSize = parseInt(partySizeInput.value);
  let newSize = currentSize + change;

  // Enforce min/max
  if (newSize < 1) newSize = 1;
  if (newSize > 20) newSize = 20;

  partySizeInput.value = newSize;
  partySize = newSize;

  // Show warning for large parties
  if (newSize > 8) {
    showToast('For parties larger than 8, we recommend calling us directly', 'info', 5000);
  }

  updateSummary();
}

// ============================================
// Update Summary
// ============================================

function updateSummary() {
  // Update date
  const summaryDate = document.getElementById('summaryDate');
  if (selectedDate) {
    const date = new Date(selectedDate + 'T00:00:00');
    const options = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
    summaryDate.textContent = date.toLocaleDateString('en-US', options);
  }

  // Update time
  const summaryTime = document.getElementById('summaryTime');
  if (selectedTime) {
    summaryTime.textContent = formatTime(selectedTime);
  }

  // Update party size
  const summaryPartySize = document.getElementById('summaryPartySize');
  summaryPartySize.textContent = `${partySize} ${partySize === 1 ? 'guest' : 'guests'}`;
}

function formatTime(time24) {
  const [hours, minutes] = time24.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

// ============================================
// Form Submission
// ============================================

function initializeForm() {
  const form = document.getElementById('bookingForm');

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    // Validate time selection
    if (!selectedTime) {
      showToast('Please select a time for your reservation', 'error');
      document.getElementById('timeSlots').scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    // Collect form data
    const formData = {
      serviceType: document.querySelector('input[name="serviceType"]:checked').value,
      date: selectedDate,
      time: selectedTime,
      partySize: partySize,
      specialRequests: document.getElementById('specialRequests').value,
      firstName: document.getElementById('firstName').value,
      lastName: document.getElementById('lastName').value,
      email: document.getElementById('email').value,
      phone: document.getElementById('phone').value,
      smsConsent: document.getElementById('smsConsent').checked,
      businessHandle: 'sandbar',
      businessName: 'The Sandbar Restaurant',
      timestamp: Date.now()
    };

    console.log('Booking submission:', formData);

    // In production: submit to API
    submitBooking(formData);
  });
}

function submitBooking(data) {
  // Show loading state
  const submitBtn = document.querySelector('.btn-submit');
  const originalText = submitBtn.innerHTML;

  submitBtn.disabled = true;
  submitBtn.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style="animation: spin 1s linear infinite;">
      <circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="2" fill="none" stroke-dasharray="50" stroke-dashoffset="10"/>
    </svg>
    Processing...
  `;

  // Simulate API call
  setTimeout(() => {
    // Success
    submitBtn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M16 6L8.5 13.5L5 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      Confirmed!
    `;

    showToast('Reservation confirmed! Check your email for details.', 'success', 5000);

    // Save booking to localStorage
    localStorage.setItem('cybercheck_last_booking', JSON.stringify(data));

    // Reset form after delay
    setTimeout(() => {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;

      // In production: redirect to confirmation page
      console.log('Would redirect to confirmation page');
      // window.location.href = '/booking-confirmation?id=ABC123';
    }, 2000);
  }, 2000);
}

// ============================================
// Toast Notifications
// ============================================

function showToast(message, type = 'info', duration = 3000) {
  const existingToast = document.querySelector('.toast-notification');
  if (existingToast) {
    existingToast.remove();
  }

  const toast = document.createElement('div');
  toast.className = 'toast-notification';
  toast.textContent = message;

  let bgColor = 'rgba(0, 0, 0, 0.9)';
  if (type === 'error') bgColor = 'rgba(239, 68, 68, 0.95)';
  if (type === 'success') bgColor = 'rgba(16, 185, 129, 0.95)';

  toast.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    background: ${bgColor};
    color: white;
    padding: 16px 24px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    z-index: 10000;
    max-width: 400px;
    animation: slideInUp 0.3s ease-out;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  `;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease-out';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ============================================
// Console Log
// ============================================

console.log('%cBooking Page Ready', 'font-size: 16px; font-weight: bold; color: #4DA6FF;');
console.log('Business: The Sandbar Restaurant');
console.log('Available booking slots loaded');
