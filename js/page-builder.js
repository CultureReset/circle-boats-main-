// ============================================
// Visual Page Builder — Edit website sections easily
// Like Wix but simpler
// ============================================

const BUILDER_SECTIONS = [
  {
    id: 'hero',
    label: '🏠 Hero Banner',
    icon: '🎨',
    fields: [
      { name: 'heading', label: 'Heading', type: 'text', placeholder: 'Enter heading' },
      { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Enter description' },
      { name: 'cta_text', label: 'Button Text', type: 'text', placeholder: 'e.g., Book Now' },
      { name: 'bg_color', label: 'Background Color', type: 'color' }
    ]
  },
  {
    id: 'about',
    label: '💭 About Section',
    icon: 'ℹ️',
    fields: [
      { name: 'heading', label: 'Heading', type: 'text' },
      { name: 'description', label: 'Description', type: 'textarea' },
      { name: 'feature_1', label: 'Feature 1', type: 'text' },
      { name: 'feature_2', label: 'Feature 2', type: 'text' },
      { name: 'feature_3', label: 'Feature 3', type: 'text' }
    ]
  },
  {
    id: 'products',
    label: '🛥️ Rentals & Products',
    icon: '📦',
    fields: [
      { name: 'heading', label: 'Section Heading', type: 'text' },
      { name: 'product_1_name', label: 'Product 1 Name', type: 'text' },
      { name: 'product_1_price', label: 'Product 1 Price', type: 'text' },
      { name: 'product_2_name', label: 'Product 2 Name', type: 'text' },
      { name: 'product_2_price', label: 'Product 2 Price', type: 'text' }
    ]
  },
  {
    id: 'contact',
    label: '📬 Contact Section',
    icon: '📞',
    fields: [
      { name: 'heading', label: 'Heading', type: 'text' },
      { name: 'phone', label: 'Phone Number', type: 'tel' },
      { name: 'email', label: 'Email Address', type: 'email' },
      { name: 'address', label: 'Address', type: 'text' },
      { name: 'hours', label: 'Business Hours', type: 'textarea' }
    ]
  },
  {
    id: 'cta',
    label: '🎯 Call-to-Action',
    icon: '⭐',
    fields: [
      { name: 'heading', label: 'CTA Heading', type: 'text' },
      { name: 'description', label: 'CTA Description', type: 'textarea' },
      { name: 'button_text', label: 'Button Text', type: 'text' }
    ]
  }
];

let currentSection = null;
let sectionData = {};

// Initialize page builder
function initPageBuilder() {
  renderSectionsMenu();
  loadSectionData();
}

// Render sections menu on left side
function renderSectionsMenu() {
  const menu = document.getElementById('sections-menu');
  menu.innerHTML = '';

  BUILDER_SECTIONS.forEach(section => {
    const btn = document.createElement('button');
    btn.className = 'btn btn-outline';
    btn.style.cssText = `
      width: 100%;
      padding: 12px;
      text-align: left;
      border: 1px solid var(--card-border);
      background: ${currentSection?.id === section.id ? 'var(--primary)' : 'transparent'};
      color: ${currentSection?.id === section.id ? 'white' : 'var(--text)'};
      border-radius: var(--radius);
      cursor: pointer;
      transition: all 0.2s;
    `;
    btn.textContent = `${section.icon} ${section.label}`;
    btn.onclick = () => selectSection(section);
    menu.appendChild(btn);
  });
}

// Select section to edit
function selectSection(section) {
  currentSection = section;
  renderSectionsMenu();
  renderSectionEditor(section);
}

// Render editor form for selected section
function renderSectionEditor(section) {
  const editor = document.getElementById('section-editor');
  editor.innerHTML = `
    <h3 style="margin-bottom:16px;color:var(--text);">${section.icon} ${section.label}</h3>
    <div id="form-fields"></div>
    <div style="margin-top:20px;display:flex;gap:8px;">
      <button class="btn btn-primary" onclick="saveSectionData('${section.id}')">💾 Save Changes</button>
      <button class="btn btn-outline btn-sm" onclick="resetSectionForm()">Reset</button>
    </div>
  `;

  const form = document.getElementById('form-fields');
  section.fields.forEach(field => {
    const value = sectionData[section.id]?.[field.name] || '';
    const fieldHtml = createFormField(section.id, field, value);
    form.innerHTML += fieldHtml;
  });
}

// Create form field HTML
function createFormField(sectionId, field, value) {
  const fieldId = `${sectionId}-${field.name}`;

  if (field.type === 'textarea') {
    return `
      <div style="margin-bottom:16px;">
        <label style="display:block;margin-bottom:6px;color:var(--text-muted);font-size:13px;font-weight:500;">${field.label}</label>
        <textarea id="${fieldId}" placeholder="${field.placeholder || ''}"
          style="width:100%;padding:10px;background:var(--bg);border:1px solid var(--card-border);border-radius:var(--radius);color:var(--text);font-family:inherit;min-height:80px;resize:vertical;" rows="4">${value}</textarea>
      </div>
    `;
  }

  if (field.type === 'color') {
    return `
      <div style="margin-bottom:16px;">
        <label style="display:block;margin-bottom:6px;color:var(--text-muted);font-size:13px;font-weight:500;">${field.label}</label>
        <input type="color" id="${fieldId}" value="${value || '#ffffff'}"
          style="width:100%;height:40px;border:1px solid var(--card-border);border-radius:var(--radius);cursor:pointer;"/>
      </div>
    `;
  }

  return `
    <div style="margin-bottom:16px;">
      <label style="display:block;margin-bottom:6px;color:var(--text-muted);font-size:13px;font-weight:500;">${field.label}</label>
      <input type="${field.type || 'text'}" id="${fieldId}" placeholder="${field.placeholder || ''}" value="${value}"
        style="width:100%;padding:10px;background:var(--bg);border:1px solid var(--card-border);border-radius:var(--radius);color:var(--text);font-size:14px;"/>
    </div>
  `;
}

// Load section data from API
async function loadSectionData() {
  try {
    const response = await fetch(`/api/public/profile?subdomain=${window.SUBDOMAIN || 'beachside-circle-boats'}`);
    const data = await response.json();
    if (data) {
      sectionData = data;
    }
  } catch(e) {
    console.log('Could not load section data:', e.message);
  }
}

// Save section data
async function saveSectionData(sectionId) {
  if (!currentSection) return;

  const data = {};
  currentSection.fields.forEach(field => {
    const fieldId = `${sectionId}-${field.name}`;
    const element = document.getElementById(fieldId);
    if (element) data[field.name] = element.value;
  });

  // Update local data
  sectionData[sectionId] = data;

  // Save to API
  try {
    const response = await fetch('/api/public/save-section', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        section: sectionId,
        data: data,
        subdomain: window.SUBDOMAIN || 'beachside-circle-boats'
      })
    });

    if (response.ok) {
      showToast('✅ Changes saved!', 'success');
      // Reload preview
      const iframe = document.getElementById('preview-website-iframe');
      if (iframe) iframe.src = iframe.src; // Reload iframe
    } else {
      showToast('❌ Failed to save', 'error');
    }
  } catch(e) {
    showToast('Error: ' + e.message, 'error');
  }
}

// Reset form
function resetSectionForm() {
  if (currentSection) renderSectionEditor(currentSection);
}

// Preview modal
function openPreviewModal() {
  document.getElementById('preview-modal').style.display = 'block';
}

function closePreviewModal() {
  document.getElementById('preview-modal').style.display = 'none';
}

// Show toast notification
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: ${type === 'success' ? '#22c55e' : '#ef4444'};
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    z-index: 10000;
    animation: slideIn 0.3s ease;
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// Initialize on page load
onPageLoad('site-editor', initPageBuilder);
