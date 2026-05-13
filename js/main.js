// ============================================
// CyberCheck - Main JavaScript
// ============================================

// Header scroll effect
const header = document.getElementById('header');
if (header) {
  window.addEventListener('scroll', () => {
    if (window.scrollY > 10) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  });
}

// Mobile menu toggle
const mobileMenuToggle = document.getElementById('mobileMenuToggle');
const navLinks = document.querySelector('.nav-links');

if (mobileMenuToggle) {
  mobileMenuToggle.addEventListener('click', () => {
    navLinks.classList.toggle('mobile-active');
    mobileMenuToggle.classList.toggle('active');
  });
}

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const href = this.getAttribute('href');
    if (href === '#') return;

    const target = document.querySelector(href);
    if (target) {
      e.preventDefault();
      const headerOffset = 80;
      const elementPosition = target.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });

      // Close mobile menu if open
      if (navLinks.classList.contains('mobile-active')) {
        navLinks.classList.remove('mobile-active');
        mobileMenuToggle.classList.remove('active');
      }
    }
  });
});

// Fade in elements on scroll
const fadeElements = document.querySelectorAll('.fade-in, .slide-in-right');

const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0) translateX(0)';
    }
  });
}, observerOptions);

fadeElements.forEach(el => {
  el.style.opacity = '0';
  observer.observe(el);
});

// Initialize animations
document.addEventListener('DOMContentLoaded', () => {
  // Add CSS for mobile menu
  const style = document.createElement('style');
  style.textContent = `
    @media (max-width: 768px) {
      .nav-links {
        position: fixed;
        top: var(--header-height);
        left: 0;
        right: 0;
        background: white;
        flex-direction: column;
        padding: var(--space-xl);
        box-shadow: var(--shadow-xl);
        transform: translateY(-100%);
        opacity: 0;
        transition: all var(--transition-normal);
        pointer-events: none;
      }

      .nav-links.mobile-active {
        transform: translateY(0);
        opacity: 1;
        pointer-events: all;
      }

      .mobile-menu-toggle.active svg {
        transform: rotate(90deg);
      }
    }
  `;
  document.head.appendChild(style);
});

// Newsletter form submission (placeholder)
const newsletterForms = document.querySelectorAll('.newsletter-form');
newsletterForms.forEach(form => {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = form.querySelector('input[type="email"]').value;
    console.log('Newsletter signup:', email);
    // TODO: Implement actual newsletter signup
    alert('Thanks for signing up! We\'ll be in touch soon.');
    form.reset();
  });
});

// ROI Calculator (if on pricing page)
const roiInputs = document.querySelectorAll('.roi-calculator input[type="checkbox"]');
if (roiInputs.length > 0) {
  const updateROI = () => {
    let total = 0;
    roiInputs.forEach(input => {
      if (input.checked) {
        total += parseFloat(input.dataset.cost || 0);
      }
    });

    const currentCostEl = document.querySelector('.roi-current-cost');
    const savingsEl = document.querySelector('.roi-savings');

    if (currentCostEl) {
      currentCostEl.textContent = `$${total}/mo`;
    }

    if (savingsEl) {
      const cybercheckCost = 49; // Pro plan
      const savings = Math.max(0, total - cybercheckCost);
      const annualSavings = savings * 12;
      savingsEl.textContent = `$${savings}/mo = $${annualSavings.toLocaleString()}/year`;
    }
  };

  roiInputs.forEach(input => {
    input.addEventListener('change', updateROI);
  });

  // Initial calculation
  updateROI();
}

// Console welcome message
console.log('%cWelcome to CyberCheck! 🚀', 'font-size: 20px; font-weight: bold; color: #4DA6FF;');
console.log('%cInterested in our API or have questions? Contact us at api@cybercheck.com', 'font-size: 14px; color: #6B7280;');
