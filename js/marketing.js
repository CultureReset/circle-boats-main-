// ============================================
// Marketing Pages JavaScript
// ============================================

// ============================================
// Initialize on Load
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  initializeFAQ();
  initializeContactForm();
});

// ============================================
// FAQ Functionality
// ============================================

function initializeFAQ() {
  const faqItems = document.querySelectorAll('.faq-item');
  const searchInput = document.getElementById('faqSearch');
  const categoryButtons = document.querySelectorAll('.category-btn');

  // FAQ item click to expand/collapse
  faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');

    question.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');

      // Close all items
      faqItems.forEach(i => i.classList.remove('open'));

      // Open clicked item if it wasn't already open
      if (!isOpen) {
        item.classList.add('open');
      }
    });
  });

  // Search functionality
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase();

      faqItems.forEach(item => {
        const question = item.querySelector('.faq-question h3').textContent.toLowerCase();
        const answer = item.querySelector('.faq-answer').textContent.toLowerCase();

        if (question.includes(query) || answer.includes(query)) {
          item.classList.remove('hidden');
        } else {
          item.classList.add('hidden');
        }
      });
    });
  }

  // Category filtering
  categoryButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const category = btn.dataset.category;

      // Update active state
      categoryButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Filter items
      if (category === 'all') {
        faqItems.forEach(item => item.classList.remove('hidden'));
      } else {
        faqItems.forEach(item => {
          const itemCategory = item.dataset.category;
          if (itemCategory === category) {
            item.classList.remove('hidden');
          } else {
            item.classList.add('hidden');
          }
        });
      }
    });
  });
}

// ============================================
// Contact Form
// ============================================

function initializeContactForm() {
  const contactForm = document.getElementById('contactForm');

  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();

      // Get form data
      const formData = {
        name: document.getElementById('name').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value,
        subject: document.getElementById('subject').value,
        message: document.getElementById('message').value,
        timestamp: Date.now()
      };

      console.log('Contact form submission:', formData);

      // Show loading state
      const submitBtn = contactForm.querySelector('.btn-submit');
      const originalText = submitBtn.innerHTML;

      submitBtn.disabled = true;
      submitBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style="animation: spin 1s linear infinite;">
          <circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="2" fill="none" stroke-dasharray="50" stroke-dashoffset="10"/>
        </svg>
        Sending...
      `;

      // In production: submit to API
      setTimeout(() => {
        // Success
        submitBtn.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M16 6L8.5 13.5L5 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Message Sent!
        `;

        showToast('Thank you! We\'ll get back to you within 24 hours.', 'success', 5000);

        // Reset form
        setTimeout(() => {
          contactForm.reset();
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalText;
        }, 3000);
      }, 2000);
    });
  }
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

console.log('%cCyberCheck Marketing Page Ready', 'font-size: 14px; font-weight: bold; color: #4DA6FF;');
