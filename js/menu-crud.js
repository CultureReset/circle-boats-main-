/**
 * Menu CRUD - Real Backend Integration
 * Handles all menu/content API operations
 */

const API_BASE = '/api/menu';

// =============================================
// Authentication Helper
// =============================================

function getAuthToken() {
  return localStorage.getItem('cybercheck_token') ||
         sessionStorage.getItem('cybercheck_token') ||
         '';
}

function getAuthHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getAuthToken()}`
  };
}

// =============================================
// Load Menu Data
// =============================================

async function loadMenuData() {
  try {
    const [categoriesRes, itemsRes] = await Promise.all([
      fetch(`${API_BASE}/categories`, {
        headers: { 'Authorization': `Bearer ${getAuthToken()}` }
      }),
      fetch(`${API_BASE}/items`, {
        headers: { 'Authorization': `Bearer ${getAuthToken()}` }
      })
    ]);

    if (!categoriesRes.ok || !itemsRes.ok) {
      throw new Error('Failed to load menu data');
    }

    const categories = await categoriesRes.json();
    const items = await itemsRes.json();

    renderMenuData(categories.data || [], items.data || []);
  } catch (error) {
    console.error('Error loading menu data:', error);
    showToast('Failed to load menu data. Please refresh the page.', 'error');
  }
}

function renderMenuData(categories, items) {
  const container = document.getElementById('categoriesContainer');
  if (!container) return;

  // Clear existing content except the "Create First Category" button
  const existingCategories = container.querySelectorAll('.category-section');
  existingCategories.forEach(section => section.remove());

  // Hide or show empty state
  const emptyState = container.querySelector('.empty-state');
  if (categories.length === 0) {
    if (emptyState) emptyState.style.display = 'flex';
    updateStats();
    return;
  }
  if (emptyState) emptyState.style.display = 'none';

  // Group items by category
  const itemsByCategory = {};
  items.forEach(item => {
    const catId = item.category_id || 'uncategorized';
    if (!itemsByCategory[catId]) {
      itemsByCategory[catId] = [];
    }
    itemsByCategory[catId].push(item);
  });

  // Render each category
  categories.forEach(category => {
    const categoryItems = itemsByCategory[category.id] || [];
    renderCategory(category, categoryItems);
  });

  updateStats();
  initializeDragAndDrop();
}

function renderCategory(category, items) {
  const container = document.getElementById('categoriesContainer');
  if (!container) return;

  const categoryHTML = `
    <div class="category-section" draggable="false" data-category-id="${category.id}">
      <div class="category-header">
        <div class="category-info">
          <button class="category-drag-handle" title="Drag to reorder">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <h3>${category.category_name}</h3>
          <span class="category-count">${items.length} items</span>
        </div>
        <div class="category-actions">
          <button class="category-collapse-btn" title="Collapse category">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
          <button class="category-action-btn" onclick="editCategory('${category.id}')" title="Edit category">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button class="category-action-btn" onclick="deleteCategory('${category.id}')" title="Delete category">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
        </div>
      </div>

      <div class="category-items">
        ${items.map(item => renderItemCard(item)).join('')}
        <button class="add-item-btn" onclick="openItemModal(null, '${category.id}')">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          <span>Add Item</span>
        </button>
      </div>
    </div>
  `;

  container.insertAdjacentHTML('beforeend', categoryHTML);
}

function renderItemCard(item) {
  const aiStatus = item.ai_context_processed ? 'ai-ready' : 'ai-none';
  const aiText = item.ai_context_processed ? '🤖 AI Ready' : '🤖 Train AI';

  return `
    <div class="menu-item-card item-card" draggable="true" data-item-id="${item.id}">
      ${item.image_url ? `
        <div class="item-image">
          <img src="${item.image_url}" alt="${item.item_name}">
        </div>
      ` : ''}
      <div class="item-content">
        <div class="item-header">
          <h4>${item.item_name}</h4>
          <span class="item-price">$${parseFloat(item.price).toFixed(2)}</span>
        </div>
        ${item.description ? `<p class="item-description">${item.description}</p>` : ''}
        <div class="item-footer">
          <button class="ai-training-btn ${aiStatus}"
                  onclick="openAITrainingModal('${item.id}', '${item.item_name}')"
                  title="AI Training: ${item.ai_context_processed ? 'Ready' : 'Not trained'}">
            <span class="ai-indicator"></span> ${aiText}
          </button>
          <div class="item-actions">
            <button class="item-action-btn" onclick="editItem('${item.id}')" title="Edit item">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button class="item-action-btn" onclick="duplicateItem('${item.id}')" title="Duplicate">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
            </button>
            <button class="item-action-btn" onclick="deleteItem('${item.id}')" title="Delete">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

// =============================================
// Create Category
// =============================================

async function saveCategoryToAPI() {
  const categoryData = {
    category_name: document.getElementById('categoryName').value,
    description: document.getElementById('categoryDescription').value,
    is_active: document.getElementById('categoryVisible').checked
  };

  try {
    const response = await fetch(`${API_BASE}/categories`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(categoryData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create category');
    }

    showToast('Category created successfully!');
    closeModal('categoryModal');

    // Reload menu data
    await loadMenuData();
  } catch (error) {
    console.error('Error creating category:', error);
    showToast(error.message || 'Failed to create category', 'error');
  }
}

// =============================================
// Update Category
// =============================================

async function updateCategoryAPI(categoryId) {
  const categoryData = {
    category_name: document.getElementById('categoryName').value,
    description: document.getElementById('categoryDescription').value,
    is_active: document.getElementById('categoryVisible').checked
  };

  try {
    const response = await fetch(`${API_BASE}/categories/${categoryId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(categoryData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update category');
    }

    showToast('Category updated successfully!');
    closeModal('categoryModal');

    // Reload menu data
    await loadMenuData();
  } catch (error) {
    console.error('Error updating category:', error);
    showToast(error.message || 'Failed to update category', 'error');
  }
}

// =============================================
// Delete Category
// =============================================

async function deleteCategory(categoryId) {
  if (!confirm('Delete this category and all its items? This cannot be undone.')) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/categories/${categoryId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${getAuthToken()}` }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete category');
    }

    showToast('Category deleted successfully!');

    // Reload menu data
    await loadMenuData();
  } catch (error) {
    console.error('Error deleting category:', error);
    showToast(error.message || 'Failed to delete category', 'error');
  }
}

// =============================================
// Edit Category
// =============================================

let currentEditingCategoryId = null;

async function editCategory(categoryId) {
  currentEditingCategoryId = categoryId;

  try {
    // Fetch category details
    const response = await fetch(`${API_BASE}/categories`, {
      headers: { 'Authorization': `Bearer ${getAuthToken()}` }
    });

    if (!response.ok) {
      throw new Error('Failed to load category');
    }

    const data = await response.json();
    const category = data.data.find(c => c.id === categoryId);

    if (!category) {
      throw new Error('Category not found');
    }

    // Populate form
    document.getElementById('categoryName').value = category.category_name || '';
    document.getElementById('categoryDescription').value = category.description || '';
    document.getElementById('categoryVisible').checked = category.is_active !== false;

    // Update modal title
    const modal = document.getElementById('categoryModal');
    const modalTitle = modal.querySelector('.modal-title');
    if (modalTitle) {
      modalTitle.textContent = 'Edit Category';
    }

    // Open modal
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  } catch (error) {
    console.error('Error loading category:', error);
    showToast('Failed to load category', 'error');
  }
}

// =============================================
// Create/Update Item
// =============================================

let currentEditingItemId = null;
let currentItemCategoryId = null;

function openItemModalWithCategory(itemId, categoryId) {
  currentEditingItemId = itemId;
  currentItemCategoryId = categoryId;

  if (itemId) {
    loadItemForEdit(itemId);
  } else {
    // New item - just set category
    const categorySelect = document.getElementById('itemCategory');
    if (categorySelect && categoryId) {
      categorySelect.value = categoryId;
    }
  }
}

async function loadItemForEdit(itemId) {
  try {
    const response = await fetch(`${API_BASE}/items/${itemId}`, {
      headers: { 'Authorization': `Bearer ${getAuthToken()}` }
    });

    if (!response.ok) {
      throw new Error('Failed to load item');
    }

    const data = await response.json();
    const item = data.data;

    // Populate form
    document.getElementById('itemName').value = item.item_name || '';
    document.getElementById('itemPrice').value = item.price || '';
    document.getElementById('itemDescription').value = item.description || '';
    document.getElementById('itemCategory').value = item.category_id || '';
    document.getElementById('itemVisible').checked = item.is_active !== false;

    // Update modal title
    const modal = document.getElementById('itemModal');
    const modalTitle = modal.querySelector('.modal-title');
    if (modalTitle) {
      modalTitle.textContent = 'Edit Item';
    }

    // Show image if exists
    if (item.image_url) {
      const photoPreviewImg = document.getElementById('photoPreviewImg');
      const photoPreview = document.getElementById('photoPreview');
      const photoUploadArea = document.getElementById('photoUploadArea');

      if (photoPreviewImg && photoPreview && photoUploadArea) {
        photoPreviewImg.src = item.image_url;
        photoPreview.style.display = 'block';
        photoUploadArea.style.display = 'none';
      }
    }
  } catch (error) {
    console.error('Error loading item:', error);
    showToast('Failed to load item', 'error');
  }
}

async function saveItemToAPI() {
  const itemData = {
    item_name: document.getElementById('itemName').value,
    price: parseFloat(document.getElementById('itemPrice').value),
    description: document.getElementById('itemDescription').value,
    category_id: document.getElementById('itemCategory').value || currentItemCategoryId,
    is_active: document.getElementById('itemVisible').checked
  };

  // Handle image upload if present
  const photoInput = document.getElementById('photoInput');
  if (photoInput && photoInput.files && photoInput.files[0]) {
    // TODO: Upload image to storage and get URL
    // For now, we'll skip image upload
  }

  try {
    let response;

    if (currentEditingItemId) {
      // Update existing item
      response = await fetch(`${API_BASE}/items/${currentEditingItemId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(itemData)
      });
    } else {
      // Create new item
      response = await fetch(`${API_BASE}/items`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(itemData)
      });
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to save item');
    }

    showToast(`Item ${currentEditingItemId ? 'updated' : 'created'} successfully!`);
    closeModal('itemModal');

    // Reset state
    currentEditingItemId = null;
    currentItemCategoryId = null;

    // Reload menu data
    await loadMenuData();
  } catch (error) {
    console.error('Error saving item:', error);
    showToast(error.message || 'Failed to save item', 'error');
  }
}

// =============================================
// Delete Item
// =============================================

async function deleteItem(itemId) {
  if (!confirm('Delete this item? This cannot be undone.')) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/items/${itemId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${getAuthToken()}` }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete item');
    }

    showToast('Item deleted successfully!');

    // Reload menu data
    await loadMenuData();
  } catch (error) {
    console.error('Error deleting item:', error);
    showToast(error.message || 'Failed to delete item', 'error');
  }
}

// =============================================
// Duplicate Item
// =============================================

async function duplicateItem(itemId) {
  try {
    // Fetch item details
    const response = await fetch(`${API_BASE}/items/${itemId}`, {
      headers: { 'Authorization': `Bearer ${getAuthToken()}` }
    });

    if (!response.ok) {
      throw new Error('Failed to load item');
    }

    const data = await response.json();
    const item = data.data;

    // Create duplicate
    const duplicateData = {
      item_name: `${item.item_name} (Copy)`,
      price: item.price,
      description: item.description,
      category_id: item.category_id,
      is_active: item.is_active,
      image_url: item.image_url
    };

    const createResponse = await fetch(`${API_BASE}/items`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(duplicateData)
    });

    if (!createResponse.ok) {
      const error = await createResponse.json();
      throw new Error(error.error || 'Failed to duplicate item');
    }

    showToast('Item duplicated successfully!');

    // Reload menu data
    await loadMenuData();
  } catch (error) {
    console.error('Error duplicating item:', error);
    showToast(error.message || 'Failed to duplicate item', 'error');
  }
}

// =============================================
// Edit Item
// =============================================

async function editItem(itemId) {
  currentEditingItemId = itemId;
  await loadItemForEdit(itemId);

  const modal = document.getElementById('itemModal');
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

// =============================================
// Override existing functions
// =============================================

// Override the saveCategory function from menu-manager.js
window.saveCategory = async function() {
  if (currentEditingCategoryId) {
    await updateCategoryAPI(currentEditingCategoryId);
    currentEditingCategoryId = null;
  } else {
    await saveCategoryToAPI();
  }
};

// Override the saveItem function from menu-manager.js
window.saveItem = async function() {
  await saveItemToAPI();
};

// Override loadDemoData to load from API
window.loadDemoData = function() {
  loadMenuData();
};

// Export functions for global access
window.loadMenuData = loadMenuData;
window.saveItemToAPI = saveItemToAPI;
window.saveCategoryToAPI = saveCategoryToAPI;
window.deleteCategory = deleteCategory;
window.deleteItem = deleteItem;
window.duplicateItem = duplicateItem;
window.editCategory = editCategory;
window.editItem = editItem;
window.openItemModalWithCategory = openItemModalWithCategory;

console.log('✓ Menu CRUD system loaded and connected to backend API');

// Load menu data on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadMenuData);
} else {
  loadMenuData();
}
