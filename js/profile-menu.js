// ============================================
// Profile Menu JavaScript
// ============================================

let orderItems = [];
let orderTotal = 0;

// ============================================
// Initialize on Load
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  initializeCategoryTabs();
  loadOrderFromStorage();
});

// ============================================
// Category Filtering
// ============================================

function initializeCategoryTabs() {
  const tabs = document.querySelectorAll('.category-tab');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const category = tab.dataset.category;

      // Update active state
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      // Filter sections
      filterMenuSections(category);
    });
  });
}

function filterMenuSections(category) {
  const sections = document.querySelectorAll('.menu-section');

  if (category === 'all') {
    sections.forEach(section => section.classList.remove('hidden'));
  } else {
    sections.forEach(section => {
      const sectionCategory = section.dataset.category;
      if (sectionCategory === category) {
        section.classList.remove('hidden');
      } else {
        section.classList.add('hidden');
      }
    });
  }

  // Smooth scroll to first visible section
  const firstVisible = document.querySelector('.menu-section:not(.hidden)');
  if (firstVisible) {
    firstVisible.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// ============================================
// Add to Order
// ============================================

function addToOrder(button, itemName, itemPrice) {
  // Find if item already in order
  const existingItem = orderItems.find(item => item.name === itemName);

  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    orderItems.push({
      name: itemName,
      price: itemPrice,
      quantity: 1
    });
  }

  // Update total
  orderTotal = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  // Update UI
  updateOrderSummary();

  // Animate button
  button.classList.add('added');
  button.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M15 4.5L6.75 12.75L3 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    Added!
  `;

  setTimeout(() => {
    button.classList.remove('added');
    button.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M9 3V15M3 9H15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
      Add to Order
    `;
  }, 1500);

  // Save to localStorage
  saveOrderToStorage();

  // Show toast
  showToast(`${itemName} added to order!`, 'success');
}

// ============================================
// Update Order Summary
// ============================================

function updateOrderSummary() {
  const orderSummary = document.getElementById('orderSummary');
  const itemCount = document.getElementById('itemCount');
  const orderTotalEl = document.getElementById('orderTotal');

  const totalItems = orderItems.reduce((sum, item) => sum + item.quantity, 0);

  if (totalItems > 0) {
    orderSummary.style.display = 'block';
    itemCount.textContent = totalItems;
    orderTotalEl.textContent = orderTotal.toFixed(2);
  } else {
    orderSummary.style.display = 'none';
  }
}

// ============================================
// Local Storage
// ============================================

function saveOrderToStorage() {
  localStorage.setItem('cybercheck_order', JSON.stringify({
    items: orderItems,
    total: orderTotal,
    businessName: 'The Sandbar Restaurant',
    businessHandle: 'sandbar',
    timestamp: Date.now()
  }));
}

function loadOrderFromStorage() {
  const savedOrder = localStorage.getItem('cybercheck_order');

  if (savedOrder) {
    const order = JSON.parse(savedOrder);

    // Check if order is less than 2 hours old
    const twoHours = 2 * 60 * 60 * 1000;
    if (Date.now() - order.timestamp < twoHours) {
      orderItems = order.items;
      orderTotal = order.total;
      updateOrderSummary();
    } else {
      // Clear old order
      localStorage.removeItem('cybercheck_order');
    }
  }
}

// ============================================
// Checkout
// ============================================

function checkout() {
  if (orderItems.length === 0) {
    showToast('Your order is empty', 'error');
    return;
  }

  // In production: redirect to checkout page
  console.log('Checkout with order:', orderItems);

  showToast('Redirecting to checkout...', 'success');

  // Simulate redirect
  setTimeout(() => {
    // window.location.href = '/checkout?business=sandbar';
    console.log('Would redirect to checkout page');
  }, 1000);
}

// ============================================
// Open Booking
// ============================================

function openBooking() {
  // In production: open booking modal or redirect to booking page
  console.log('Opening booking interface');

  showToast('Opening reservation system...', 'success');

  // Simulate opening booking
  setTimeout(() => {
    // window.location.href = '/@sandbar/booking';
    console.log('Would open booking interface');
  }, 500);
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
    bottom: 140px;
    right: 24px;
    background: ${bgColor};
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    z-index: 10000;
    animation: slideInUp 0.3s ease-out;
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

console.log('%cProfile Menu Ready', 'font-size: 16px; font-weight: bold; color: #4DA6FF;');
console.log('Business: The Sandbar Restaurant');
console.log('Category filtering enabled');
