// ============================================
// CyberCheck - Pricing Page JavaScript
// ============================================

// Billing Toggle (Monthly/Annual)
const billingToggle = document.getElementById('billingToggle');
const monthlyLabel = document.getElementById('monthlyLabel');
const annualLabel = document.getElementById('annualLabel');
const monthlyPrices = document.querySelectorAll('.monthly-price');
const annualPrices = document.querySelectorAll('.annual-price');

let isAnnual = false;

if (billingToggle) {
  billingToggle.addEventListener('click', () => {
    isAnnual = !isAnnual;

    if (isAnnual) {
      billingToggle.classList.add('active');
      monthlyLabel.classList.remove('active');
      annualLabel.classList.add('active');

      monthlyPrices.forEach(price => price.classList.add('hidden'));
      annualPrices.forEach(price => price.classList.remove('hidden'));
    } else {
      billingToggle.classList.remove('active');
      monthlyLabel.classList.add('active');
      annualLabel.classList.remove('active');

      monthlyPrices.forEach(price => price.classList.remove('hidden'));
      annualPrices.forEach(price => price.classList.add('hidden'));
    }
  });

  // Set initial state
  monthlyLabel.classList.add('active');
}

// ROI Calculator
const toolCheckboxes = document.querySelectorAll('.tool-checkbox input[type="checkbox"]');
const currentCostEl = document.querySelector('.roi-current-cost');
const savingsEl = document.querySelector('.roi-savings');

function updateROI() {
  let totalCost = 0;

  toolCheckboxes.forEach(checkbox => {
    if (checkbox.checked) {
      totalCost += parseFloat(checkbox.dataset.cost);
    }
  });

  const cybercheckCost = 49; // Pro plan
  const monthlySavings = Math.max(0, totalCost - cybercheckCost);
  const annualSavings = monthlySavings * 12;

  if (currentCostEl) {
    currentCostEl.textContent = `$${totalCost}/mo`;
  }

  if (savingsEl) {
    savingsEl.textContent = `$${monthlySavings}/mo = $${annualSavings.toLocaleString()}/year`;
  }

  // Update annual cost displays
  const annualCostEl = document.querySelector('.roi-results .roi-annual');
  if (annualCostEl) {
    annualCostEl.textContent = `$${(totalCost * 12).toLocaleString()}/year`;
  }
}

if (toolCheckboxes.length > 0) {
  toolCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', updateROI);
  });

  // Initial calculation
  updateROI();
}

// Smooth scroll for CTA buttons
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
    }
  });
});

// Highlight plan on hover in comparison table
const comparisonTable = document.querySelector('.comparison-table');
if (comparisonTable) {
  const headerCells = comparisonTable.querySelectorAll('thead th:not(.feature-name-col)');

  headerCells.forEach((cell, index) => {
    cell.addEventListener('mouseenter', () => {
      const colIndex = index + 1; // +1 because feature name is first column
      const rows = comparisonTable.querySelectorAll('tbody tr:not(.category-row)');

      rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells[colIndex]) {
          cells[colIndex].style.background = 'rgba(77, 166, 255, 0.05)';
        }
      });
    });

    cell.addEventListener('mouseleave', () => {
      const colIndex = index + 1;
      const rows = comparisonTable.querySelectorAll('tbody tr:not(.category-row)');

      rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells[colIndex]) {
          cells[colIndex].style.background = '';
        }
      });
    });
  });
}

// FAQ accordion (optional enhancement)
const faqItems = document.querySelectorAll('.faq-item');
faqItems.forEach(item => {
  const question = item.querySelector('.faq-question');
  if (question) {
    question.style.cursor = 'pointer';

    question.addEventListener('click', () => {
      const answer = item.querySelector('.faq-answer');
      if (answer) {
        const isOpen = answer.style.display === 'block';

        // Close all other FAQs (optional)
        // faqItems.forEach(otherItem => {
        //   const otherAnswer = otherItem.querySelector('.faq-answer');
        //   if (otherAnswer && otherAnswer !== answer) {
        //     otherAnswer.style.display = 'none';
        //   }
        // });

        // Toggle current FAQ
        answer.style.display = isOpen ? 'none' : 'block';
      }
    });
  }
});

// Track pricing page views (analytics placeholder)
console.log('Pricing page loaded');
if (typeof gtag !== 'undefined') {
  gtag('event', 'page_view', {
    page_title: 'Pricing',
    page_location: window.location.href,
    page_path: window.location.pathname
  });
}

// Add click tracking for plan selection (analytics)
const planButtons = document.querySelectorAll('.plan-card .btn');
planButtons.forEach((button, index) => {
  button.addEventListener('click', () => {
    const planCard = button.closest('.plan-card');
    const planName = planCard.querySelector('.plan-name').textContent;
    const planPrice = planCard.querySelector('.price-amount:not(.hidden)').textContent;

    console.log(`Selected plan: ${planName} - ${planPrice}`);

    if (typeof gtag !== 'undefined') {
      gtag('event', 'select_plan', {
        plan_name: planName,
        plan_price: planPrice
      });
    }
  });
});

// Pricing comparison tooltip (optional)
const comparisonCells = document.querySelectorAll('.comparison-table td');
comparisonCells.forEach(cell => {
  if (cell.textContent.trim() === '✓' || cell.textContent.trim() === '–') {
    cell.style.cursor = 'help';
    cell.title = cell.textContent.trim() === '✓' ? 'Included' : 'Not included';
  }
});

console.log('%cCyberCheck Pricing', 'font-size: 16px; font-weight: bold; color: #4DA6FF;');
console.log('Interactive pricing calculator ready');
