// ============================================
// CyberCheck - Menu/Content Manager JavaScript
// Universal content system for all industries
// ============================================

// Industry Configuration
const industryConfig = {
  restaurant: {
    contentName: 'Menu Items',
    itemSingular: 'Item',
    itemPlural: 'Items',
    categoryName: 'Category',
    fields: {
      name: { label: 'Item Name', placeholder: 'e.g., Carne Asada Taco', required: true },
      price: { label: 'Price', required: true },
      description: { label: 'Description', placeholder: 'Describe this menu item...' },
      tags: ['Popular', 'New', 'Featured', 'Spicy', 'Vegan', 'Gluten-Free', 'Vegetarian']
    }
  },
  stylist: {
    contentName: 'Services',
    itemSingular: 'Service',
    itemPlural: 'Services',
    categoryName: 'Service Type',
    fields: {
      name: { label: 'Service Name', placeholder: 'e.g., Haircut & Style', required: true },
      price: { label: 'Price', required: true },
      description: { label: 'Description', placeholder: 'Describe this service...' },
      duration: { label: 'Duration', placeholder: '60 min' },
      tags: ['Popular', 'New', 'Signature', 'Express', 'Premium']
    }
  },
  musician: {
    contentName: 'Merchandise & Music',
    itemSingular: 'Product',
    itemPlural: 'Products',
    categoryName: 'Category',
    fields: {
      name: { label: 'Product Name', placeholder: 'e.g., Band T-Shirt, Album', required: true },
      price: { label: 'Price', required: true },
      description: { label: 'Description', placeholder: 'Describe this product...' },
      tags: ['New Release', 'Limited Edition', 'Best Seller', 'Digital', 'Physical']
    }
  },
  dealer: {
    contentName: 'Inventory',
    itemSingular: 'Vehicle',
    itemPlural: 'Vehicles',
    categoryName: 'Category',
    fields: {
      name: { label: 'Vehicle Name', placeholder: 'e.g., 2020 Honda Accord', required: true },
      price: { label: 'Price', required: true },
      description: { label: 'Description', placeholder: 'Vehicle details, condition, mileage...' },
      tags: ['Featured', 'New Arrival', 'Low Mileage', 'Certified', 'Price Drop']
    }
  },
  gym: {
    contentName: 'Classes & Programs',
    itemSingular: 'Class',
    itemPlural: 'Classes',
    categoryName: 'Program Type',
    fields: {
      name: { label: 'Class Name', placeholder: 'e.g., HIIT Training', required: true },
      price: { label: 'Price', required: true },
      description: { label: 'Description', placeholder: 'Describe this class...' },
      duration: { label: 'Duration', placeholder: '45 min' },
      tags: ['Popular', 'Beginner Friendly', 'Advanced', 'High Intensity', 'Low Impact']
    }
  },
  realtor: {
    contentName: 'Property Listings',
    itemSingular: 'Property',
    itemPlural: 'Properties',
    categoryName: 'Property Type',
    fields: {
      name: { label: 'Property Name', placeholder: 'e.g., 123 Main St, Modern Condo', required: true },
      price: { label: 'Price', required: true },
      description: { label: 'Description', placeholder: 'Property details, features, location...' },
      tags: ['New Listing', 'Open House', 'Price Reduced', 'Waterfront', 'Move-in Ready']
    }
  },
  generic: {
    contentName: 'Content Items',
    itemSingular: 'Item',
    itemPlural: 'Items',
    categoryName: 'Category',
    fields: {
      name: { label: 'Item Name', placeholder: 'e.g., Product or Service Name', required: true },
      price: { label: 'Price', required: true },
      description: { label: 'Description', placeholder: 'Describe this item...' },
      tags: ['Featured', 'New', 'Popular', 'Special']
    }
  }
};

let currentIndustry = 'restaurant';
let currentCategories = [];
let currentItems = [];
let hasUnsavedChanges = false;

// ============================================
// Initialize on Load
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  initializeIndustrySelector();
  initializeModals();
  initializeDragAndDrop();
  initializeItemForm();
  initializeCategoryForm();
  loadDemoData();
  updateStats();

  // Unsaved changes warning
  window.addEventListener('beforeunload', (e) => {
    if (hasUnsavedChanges) {
      e.preventDefault();
      e.returnValue = '';
    }
  });
});

// ============================================
// Industry Selector
// ============================================

function initializeIndustrySelector() {
  const industrySelect = document.getElementById('industryType');

  if (industrySelect) {
    industrySelect.addEventListener('change', (e) => {
      currentIndustry = e.target.value;
      updateUIForIndustry();
      showToast(`Switched to ${industryConfig[currentIndustry].contentName} mode`);
    });
  }
}

function updateUIForIndustry() {
  const config = industryConfig[currentIndustry];

  // Update page title and description
  const headerTitle = document.querySelector('.header-title h1');
  const headerDesc = document.querySelector('.header-title p');

  if (headerTitle) {
    headerTitle.textContent = config.contentName;
  }

  if (headerDesc) {
    headerDesc.textContent = `Manage your ${config.contentName.toLowerCase()}`;
  }

  // Update "Add Category" button text
  const addCategoryBtn = document.getElementById('addCategoryBtn');
  if (addCategoryBtn) {
    const btnText = addCategoryBtn.querySelector('span');
    if (btnText) {
      btnText.textContent = `Add ${config.categoryName}`;
    }
  }

  // Update modal labels if they're open
  updateItemModalLabels();
}

function updateItemModalLabels() {
  const config = industryConfig[currentIndustry].fields;
  const modal = document.getElementById('itemModal');

  if (!modal) return;

  // Update modal title
  const modalTitle = modal.querySelector('.modal-title');
  if (modalTitle) {
    modalTitle.textContent = `Add ${industryConfig[currentIndustry].itemSingular}`;
  }

  // Update form labels
  const nameLabel = modal.querySelector('label[for="itemName"]');
  if (nameLabel) {
    nameLabel.textContent = config.name.label + (config.name.required ? ' *' : '');
  }

  const nameInput = document.getElementById('itemName');
  if (nameInput) {
    nameInput.placeholder = config.name.placeholder;
  }

  const descLabel = modal.querySelector('label[for="itemDescription"]');
  if (descLabel) {
    descLabel.textContent = config.description.label;
  }

  const descInput = document.getElementById('itemDescription');
  if (descInput) {
    descInput.placeholder = config.description.placeholder;
  }

  // Update tag suggestions
  const tagsHint = modal.querySelector('.form-hint');
  if (tagsHint && config.tags) {
    tagsHint.textContent = `Common: ${config.tags.join(', ')}`;
  }
}

// ============================================
// Modals
// ============================================

function initializeModals() {
  // Item Modal
  const itemModal = document.getElementById('itemModal');
  const addItemBtns = document.querySelectorAll('.add-item-btn');
  const closeItemModal = document.getElementById('closeItemModal');
  const cancelItemBtn = document.getElementById('cancelItemBtn');

  addItemBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      openItemModal();
    });
  });

  if (closeItemModal) {
    closeItemModal.addEventListener('click', () => closeModal('itemModal'));
  }

  if (cancelItemBtn) {
    cancelItemBtn.addEventListener('click', () => closeModal('itemModal'));
  }

  // Category Modal
  const categoryModal = document.getElementById('categoryModal');
  const addCategoryBtn = document.getElementById('addCategoryBtn');
  const closeCategoryModal = document.getElementById('closeCategoryModal');
  const cancelCategoryBtn = document.getElementById('cancelCategoryBtn');

  if (addCategoryBtn) {
    addCategoryBtn.addEventListener('click', () => {
      openCategoryModal();
    });
  }

  if (closeCategoryModal) {
    closeCategoryModal.addEventListener('click', () => closeModal('categoryModal'));
  }

  if (cancelCategoryBtn) {
    cancelCategoryBtn.addEventListener('click', () => closeModal('categoryModal'));
  }

  // Close on overlay click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      const modal = e.target.closest('.modal');
      if (modal) {
        closeModal(modal.id);
      }
    });
  });
}

function openItemModal(item = null) {
  const modal = document.getElementById('itemModal');
  const form = document.getElementById('itemForm');

  if (!modal || !form) return;

  // Reset or populate form
  if (item) {
    // Edit mode
    document.getElementById('itemName').value = item.name || '';
    document.getElementById('itemPrice').value = item.price || '';
    document.getElementById('itemDescription').value = item.description || '';
    document.getElementById('itemDisplayMode').value = item.displayMode || 'popup';
    document.getElementById('itemVisible').checked = item.visible !== false;
  } else {
    // Add mode
    form.reset();
    document.getElementById('itemVisible').checked = true;
  }

  updateItemModalLabels();
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function openCategoryModal(category = null) {
  const modal = document.getElementById('categoryModal');
  const form = document.getElementById('categoryForm');

  if (!modal || !form) return;

  // Update modal title based on industry
  const modalTitle = modal.querySelector('.modal-title');
  if (modalTitle) {
    modalTitle.textContent = category
      ? `Edit ${industryConfig[currentIndustry].categoryName}`
      : `Add ${industryConfig[currentIndustry].categoryName}`;
  }

  // Reset or populate form
  if (category) {
    document.getElementById('categoryName').value = category.name || '';
    document.getElementById('categoryDescription').value = category.description || '';
    document.getElementById('categoryVisible').checked = category.visible !== false;
  } else {
    form.reset();
    document.getElementById('categoryVisible').checked = true;
  }

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

// ============================================
// Item Form
// ============================================

function initializeItemForm() {
  const form = document.getElementById('itemForm');
  const photoUploadArea = document.getElementById('photoUploadArea');
  const photoInput = document.getElementById('photoInput');
  const photoRemove = document.getElementById('photoRemove');
  const descriptionInput = document.getElementById('itemDescription');
  const descriptionCount = document.getElementById('descriptionCount');

  // Form submission
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      saveItem();
    });
  }

  // Photo upload
  if (photoUploadArea && photoInput) {
    photoUploadArea.addEventListener('click', () => {
      photoInput.click();
    });

    photoInput.addEventListener('change', (e) => {
      handlePhotoUpload(e.target.files[0]);
    });

    // Drag and drop
    photoUploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      photoUploadArea.style.borderColor = 'var(--primary)';
      photoUploadArea.style.background = 'white';
    });

    photoUploadArea.addEventListener('dragleave', () => {
      photoUploadArea.style.borderColor = '';
      photoUploadArea.style.background = '';
    });

    photoUploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      photoUploadArea.style.borderColor = '';
      photoUploadArea.style.background = '';

      if (e.dataTransfer.files.length > 0) {
        handlePhotoUpload(e.dataTransfer.files[0]);
      }
    });
  }

  // Photo remove
  if (photoRemove) {
    photoRemove.addEventListener('click', (e) => {
      e.stopPropagation();
      removePhoto();
    });
  }

  // Character counter
  if (descriptionInput && descriptionCount) {
    descriptionInput.addEventListener('input', () => {
      descriptionCount.textContent = descriptionInput.value.length;
    });
  }

  // Tags input
  initializeTagsInput();
}

function handlePhotoUpload(file) {
  if (!file) return;

  // Validate file type
  if (!file.type.startsWith('image/')) {
    showToast('Please upload an image file', 'error');
    return;
  }

  // Validate file size (5MB)
  if (file.size > 5 * 1024 * 1024) {
    showToast('Image must be less than 5MB', 'error');
    return;
  }

  // Read and display
  const reader = new FileReader();
  reader.onload = (e) => {
    const photoPreview = document.getElementById('photoPreview');
    const photoPreviewImg = document.getElementById('photoPreviewImg');
    const photoUploadArea = document.getElementById('photoUploadArea');

    if (photoPreviewImg && photoPreview && photoUploadArea) {
      photoPreviewImg.src = e.target.result;
      photoPreview.style.display = 'block';
      photoUploadArea.style.display = 'none';
    }
  };
  reader.readAsDataURL(file);
}

function removePhoto() {
  const photoPreview = document.getElementById('photoPreview');
  const photoUploadArea = document.getElementById('photoUploadArea');
  const photoInput = document.getElementById('photoInput');

  if (photoPreview && photoUploadArea && photoInput) {
    photoPreview.style.display = 'none';
    photoUploadArea.style.display = 'flex';
    photoInput.value = '';
  }
}

function initializeTagsInput() {
  const tagsInput = document.getElementById('tagsInput');
  const tagInputField = tagsInput?.querySelector('.tag-input-field');

  if (!tagInputField) return;

  tagInputField.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const value = tagInputField.value.trim();

      if (value) {
        addTag(value);
        tagInputField.value = '';
      }
    }
  });

  // Remove tag functionality
  tagsInput.addEventListener('click', (e) => {
    if (e.target.classList.contains('tag-remove')) {
      e.target.closest('.tag-item').remove();
    }
  });
}

function addTag(text) {
  const tagsInput = document.getElementById('tagsInput');
  const tagInputField = tagsInput?.querySelector('.tag-input-field');

  if (!tagsInput || !tagInputField) return;

  const tagItem = document.createElement('div');
  tagItem.className = 'tag-item';
  tagItem.innerHTML = `
    ${text}
    <button type="button" class="tag-remove">×</button>
  `;

  tagsInput.insertBefore(tagItem, tagInputField);
}

function saveItem() {
  const itemData = {
    name: document.getElementById('itemName').value,
    price: document.getElementById('itemPrice').value,
    description: document.getElementById('itemDescription').value,
    displayMode: document.getElementById('itemDisplayMode').value,
    category: document.getElementById('itemCategory').value,
    visible: document.getElementById('itemVisible').checked,
    tags: collectTags(),
    photo: document.getElementById('photoPreviewImg')?.src || null
  };

  console.log('Saving item:', itemData);

  // In production: API call to save item
  // await fetch('/api/content-items', { method: 'POST', body: JSON.stringify(itemData) });

  showToast(`${industryConfig[currentIndustry].itemSingular} saved successfully!`);
  closeModal('itemModal');
  hasUnsavedChanges = false;

  // Refresh list (in production, reload from API)
  setTimeout(() => {
    updateStats();
  }, 500);
}

function collectTags() {
  const tags = [];
  document.querySelectorAll('#tagsInput .tag-item').forEach(tag => {
    const text = tag.textContent.replace('×', '').trim();
    if (text) tags.push(text);
  });
  return tags;
}

// ============================================
// Category Form
// ============================================

function initializeCategoryForm() {
  const form = document.getElementById('categoryForm');

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      saveCategory();
    });
  }
}

function saveCategory() {
  const categoryData = {
    name: document.getElementById('categoryName').value,
    description: document.getElementById('categoryDescription').value,
    visible: document.getElementById('categoryVisible').checked
  };

  console.log('Saving category:', categoryData);

  // In production: API call to save category

  showToast(`${industryConfig[currentIndustry].categoryName} created successfully!`);
  closeModal('categoryModal');
  hasUnsavedChanges = false;

  // Refresh list
  setTimeout(() => {
    updateStats();
  }, 500);
}

// ============================================
// Drag and Drop
// ============================================

function initializeDragAndDrop() {
  initializeCategoryDragDrop();
  initializeItemDragDrop();
}

function initializeCategoryDragDrop() {
  const categoriesContainer = document.getElementById('categoriesContainer');
  let draggedCategory = null;

  if (!categoriesContainer) return;

  categoriesContainer.addEventListener('dragstart', (e) => {
    if (e.target.classList.contains('category-section')) {
      draggedCategory = e.target;
      e.target.style.opacity = '0.5';
    }
  });

  categoriesContainer.addEventListener('dragend', (e) => {
    if (e.target.classList.contains('category-section')) {
      e.target.style.opacity = '1';
      hasUnsavedChanges = true;
    }
  });

  categoriesContainer.addEventListener('dragover', (e) => {
    e.preventDefault();
    const afterElement = getDragAfterElement(categoriesContainer, e.clientY, '.category-section');

    if (draggedCategory && afterElement == null) {
      categoriesContainer.appendChild(draggedCategory);
    } else if (draggedCategory && afterElement) {
      categoriesContainer.insertBefore(draggedCategory, afterElement);
    }
  });

  // Make category sections draggable via handle
  document.querySelectorAll('.category-drag-handle').forEach(handle => {
    handle.addEventListener('mousedown', () => {
      const categorySection = handle.closest('.category-section');
      if (categorySection) {
        categorySection.setAttribute('draggable', 'true');
      }
    });
  });
}

function initializeItemDragDrop() {
  document.querySelectorAll('.category-items').forEach(categoryItems => {
    let draggedItem = null;

    categoryItems.addEventListener('dragstart', (e) => {
      if (e.target.classList.contains('item-card')) {
        draggedItem = e.target;
        e.target.classList.add('dragging');
      }
    });

    categoryItems.addEventListener('dragend', (e) => {
      if (e.target.classList.contains('item-card')) {
        e.target.classList.remove('dragging');
        hasUnsavedChanges = true;
      }
    });

    categoryItems.addEventListener('dragover', (e) => {
      e.preventDefault();
      const afterElement = getDragAfterElement(categoryItems, e.clientY, '.item-card');

      if (draggedItem && afterElement == null) {
        const addBtn = categoryItems.querySelector('.add-item-btn');
        if (addBtn) {
          categoryItems.insertBefore(draggedItem, addBtn);
        } else {
          categoryItems.appendChild(draggedItem);
        }
      } else if (draggedItem && afterElement) {
        categoryItems.insertBefore(draggedItem, afterElement);
      }
    });
  });
}

function getDragAfterElement(container, y, selector) {
  const draggableElements = [...container.querySelectorAll(`${selector}:not(.dragging)`)];

  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;

    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// ============================================
// Category Actions
// ============================================

// Category collapse
document.addEventListener('click', (e) => {
  if (e.target.closest('.category-collapse-btn')) {
    const categorySection = e.target.closest('.category-section');
    if (categorySection) {
      categorySection.classList.toggle('collapsed');
    }
  }

  // Item actions
  if (e.target.closest('.item-action-btn')) {
    const btn = e.target.closest('.item-action-btn');
    const itemCard = btn.closest('.item-card');

    if (btn.title === 'Edit item') {
      // Open edit modal with item data
      openItemModal({ /* item data */ });
    } else if (btn.title === 'Duplicate') {
      showToast('Item duplicated');
      hasUnsavedChanges = true;
    } else if (btn.title === 'Delete') {
      if (confirm('Delete this item?')) {
        itemCard.remove();
        updateStats();
        hasUnsavedChanges = true;
        showToast('Item deleted');
      }
    }
  }

  // Category actions
  if (e.target.closest('.category-action-btn')) {
    const btn = e.target.closest('.category-action-btn');
    const categorySection = btn.closest('.category-section');

    if (btn.title === 'Edit category') {
      openCategoryModal({ /* category data */ });
    } else if (btn.title === 'Delete category') {
      if (confirm('Delete this category and all its items?')) {
        categorySection.remove();
        updateStats();
        hasUnsavedChanges = true;
        showToast('Category deleted');
      }
    }
  }
});

// Toggle visibility
document.addEventListener('change', (e) => {
  if (e.target.closest('.toggle-switch input[type="checkbox"]')) {
    hasUnsavedChanges = true;
    const isChecked = e.target.checked;
    const context = e.target.closest('.item-card') ? 'Item' : 'Category';
    showToast(`${context} ${isChecked ? 'visible' : 'hidden'}`);
    updateStats();
  }

  // Display mode change
  if (e.target.classList.contains('item-display-mode')) {
    hasUnsavedChanges = true;
    const mode = e.target.value;
    const modeNames = { button: 'Button Link', popup: 'Popup Modal', inline: 'Inline Section' };
    showToast(`Display mode: ${modeNames[mode]}`);
  }
});

// ============================================
// Import/Export
// ============================================

document.getElementById('importBtn')?.addEventListener('click', () => {
  showToast('Import feature coming soon');
});

document.getElementById('exportBtn')?.addEventListener('click', () => {
  showToast('Export feature coming soon');
});

// ============================================
// Stats Update
// ============================================

function updateStats() {
  const totalCategories = document.querySelectorAll('.category-section').length;
  const totalItems = document.querySelectorAll('.item-card').length;
  const visibleItems = document.querySelectorAll('.item-card .toggle-switch input:checked').length;

  document.getElementById('totalCategories').textContent = totalCategories;
  document.getElementById('totalItems').textContent = totalItems;
  document.getElementById('visibleItems').textContent = visibleItems;
}

// ============================================
// Demo Data Loader
// ============================================

function loadDemoData() {
  // Demo data is already in HTML
  // In production, load from API:
  // const data = await fetch('/api/content-items?profile_id=123');
  console.log('Content manager initialized with demo data');
}

// ============================================
// Toast Notifications
// ============================================

function showToast(message, type = 'success', duration = 3000) {
  const existingToast = document.querySelector('.toast-notification');
  if (existingToast) {
    existingToast.remove();
  }

  const toast = document.createElement('div');
  toast.className = 'toast-notification';
  toast.textContent = message;

  const bgColor = type === 'error' ? 'rgba(239, 68, 68, 0.95)' : 'rgba(0, 0, 0, 0.9)';

  toast.style.cssText = `
    position: fixed;
    bottom: 24px;
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
// Keyboard Shortcuts
// ============================================

document.addEventListener('keydown', (e) => {
  // Cmd/Ctrl + S to save
  if ((e.metaKey || e.ctrlKey) && e.key === 's') {
    e.preventDefault();
    if (hasUnsavedChanges) {
      showToast('Changes saved');
      hasUnsavedChanges = false;
    }
  }

  // Escape to close modals
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal.active').forEach(modal => {
      closeModal(modal.id);
    });
  }
});

console.log('%cContent Manager Ready', 'font-size: 16px; font-weight: bold; color: #4DA6FF;');
console.log('Current industry:', currentIndustry);
console.log('Keyboard shortcuts: Cmd/Ctrl+S (Save), Esc (Close modal)');
