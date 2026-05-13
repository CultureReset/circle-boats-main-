// ============================================
// Media Accessories — Dock, Feature, Step Editor
// ============================================

var _docks = [];
var _features = [];
var _steps = [];
var _docksImages = {};
var _featuresImages = {};
var _stepsImages = {};

const MA_API = 'https://cybercheck-api-database.vercel.app';

async function loadMediaAccessories() {
  console.log('🔄 Loading media accessories...');
  try {
    const response = await fetch(MA_API + '/api/data');
    if (!response.ok) throw new Error('Failed to load data');
    const data = await response.json();
    console.log('✅ Data loaded:', data);

    // Load and render docks
    if (data.docks) {
      _docks = data.docks;
      console.log('📍 Rendering', data.docks.length, 'docks');
      renderDocksEditor(data.docks);
    }

    // Load and render features
    if (data.features) {
      _features = data.features;
      console.log('📍 Rendering', data.features.length, 'features');
      renderFeaturesEditor(data.features);
    }

    // Load and render steps
    if (data.steps) {
      _steps = data.steps;
      console.log('📍 Rendering', data.steps.length, 'steps');
      renderStepsEditor(data.steps);
    }
  } catch (e) {
    console.error('❌ Error loading accessories:', e.message);
  }
}

function renderDocksEditor(docks) {
  const container = document.getElementById('docks-editor-container');
  console.log('🚪 Looking for docks-editor-container:', container ? '✅ FOUND' : '❌ NOT FOUND');
  if (!container) return;

  let html = '';
  docks.forEach(dock => {
    html += `
      <div class="form-group" style="border:1px solid var(--card-border);padding:16px;border-radius:8px;margin-bottom:12px;">
        <h4 style="margin-top:0;margin-bottom:12px;color:var(--text);">🚪 ${dock.name}</h4>

        <div class="form-row">
          <div class="form-group">
            <label>Name</label>
            <input type="text" id="dock-name-${dock.id}" value="${dock.name}" class="form-input">
          </div>
          <div class="form-group">
            <label>Badge (e.g., "Most Popular")</label>
            <input type="text" id="dock-badge-${dock.id}" value="${dock.badge || ''}" class="form-input" placeholder="Leave empty for no badge">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Size</label>
            <input type="text" id="dock-size-${dock.id}" value="${dock.size || ''}" class="form-input" placeholder="e.g., 8'4\"">
          </div>
          <div class="form-group">
            <label>Capacity</label>
            <input type="text" id="dock-capacity-${dock.id}" value="${dock.capacity || ''}" class="form-input" placeholder="e.g., 100 lb">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Half-Day Price ($)</label>
            <input type="number" id="dock-halfday-${dock.id}" value="${dock.halfDay || 25}" class="form-input" min="0" step="0.01">
          </div>
          <div class="form-group">
            <label>Full-Day Price ($)</label>
            <input type="number" id="dock-fullday-${dock.id}" value="${dock.fullDay || 50}" class="form-input" min="0" step="0.01">
          </div>
        </div>

        <div class="form-group">
          <label>Description</label>
          <textarea id="dock-desc-${dock.id}" rows="3" class="form-input">${dock.description || ''}</textarea>
        </div>

        <div class="form-group">
          <label>Image</label>
          ${dock.image ? `
            <div style="margin-bottom:12px;border-radius:6px;overflow:hidden;max-width:200px;">
              <img src="${dock.image}" alt="${dock.name}" style="width:100%;height:120px;object-fit:cover;"/>
            </div>
          ` : `<p style="color:var(--text-muted);font-size:13px;margin-bottom:12px;">No image</p>`}
          <input type="file" id="dock-img-${dock.id}" accept="image/*" style="display:none;" onchange="uploadDockImage('${dock.id}')">
          <button class="btn btn-outline btn-sm" onclick="document.getElementById('dock-img-${dock.id}').click()">
            ${dock.image ? '🔄 Change Image' : '📤 Upload Image'}
          </button>
          <div id="dock-status-${dock.id}"></div>
        </div>

        <button class="btn btn-primary btn-sm" onclick="saveDock('${dock.id}')">💾 Save Changes</button>
      </div>
    `;
  });
  container.innerHTML = html;
}

function renderFeaturesEditor(features) {
  const container = document.getElementById('features-editor-container');
  console.log('✨ Looking for features-editor-container:', container ? '✅ FOUND' : '❌ NOT FOUND');
  if (!container) return;

  let html = '';
  features.forEach(feature => {
    html += `
      <div class="form-group" style="border:1px solid var(--card-border);padding:16px;border-radius:8px;margin-bottom:12px;">
        <h4 style="margin-top:0;margin-bottom:12px;color:var(--text);">${feature.icon} ${feature.title}</h4>

        <div class="form-row">
          <div class="form-group">
            <label>Title</label>
            <input type="text" id="feature-title-${feature.id}" value="${feature.title}" class="form-input">
          </div>
          <div class="form-group">
            <label>Emoji/Icon</label>
            <input type="text" id="feature-icon-${feature.id}" value="${feature.icon}" maxlength="2" class="form-input" placeholder="e.g., ⚡">
          </div>
        </div>

        <div class="form-group">
          <label>Description</label>
          <textarea id="feature-desc-${feature.id}" rows="2" class="form-input">${feature.description || ''}</textarea>
        </div>

        <div class="form-group">
          <label>Icon Image (optional - overrides emoji)</label>
          ${feature.iconImage ? `
            <div style="margin-bottom:12px;">
              <img src="${feature.iconImage}" alt="${feature.title}" style="width:60px;height:60px;object-fit:contain;"/>
            </div>
          ` : `<p style="color:var(--text-muted);font-size:13px;margin-bottom:12px;">Using emoji: ${feature.icon}</p>`}
          <input type="file" id="feature-img-${feature.id}" accept="image/*" style="display:none;" onchange="uploadFeatureImage('${feature.id}')">
          <button class="btn btn-outline btn-sm" onclick="document.getElementById('feature-img-${feature.id}').click()">
            ${feature.iconImage ? '🔄 Change Image' : '📤 Upload Image'}
          </button>
          <div id="feature-status-${feature.id}"></div>
        </div>

        <button class="btn btn-primary btn-sm" onclick="saveFeature('${feature.id}')">💾 Save Changes</button>
      </div>
    `;
  });
  container.innerHTML = html;
}

function renderStepsEditor(steps) {
  const container = document.getElementById('steps-editor-container');
  console.log('📸 Looking for steps-editor-container:', container ? '✅ FOUND' : '❌ NOT FOUND');
  if (!container) return;

  let html = '';
  steps.forEach(step => {
    html += `
      <div class="form-group" style="border:1px solid var(--card-border);padding:16px;border-radius:8px;margin-bottom:12px;">
        <h4 style="margin-top:0;margin-bottom:12px;color:var(--text);">Step ${step.number}: ${step.title}</h4>

        <div class="form-row">
          <div class="form-group">
            <label>Title</label>
            <input type="text" id="step-title-${step.id}" value="${step.title}" class="form-input">
          </div>
          <div class="form-group">
            <label>Step Number</label>
            <input type="number" id="step-number-${step.id}" value="${step.number}" class="form-input" min="1" max="10">
          </div>
        </div>

        <div class="form-group">
          <label>Description</label>
          <textarea id="step-desc-${step.id}" rows="2" class="form-input">${step.description || ''}</textarea>
        </div>

        <div class="form-group">
          <label>Image (optional)</label>
          ${step.image ? `
            <div style="margin-bottom:12px;border-radius:6px;overflow:hidden;max-width:200px;">
              <img src="${step.image}" alt="${step.title}" style="width:100%;height:120px;object-fit:cover;"/>
            </div>
          ` : `<p style="color:var(--text-muted);font-size:13px;margin-bottom:12px;">Showing circle number #${step.number}</p>`}
          <input type="file" id="step-img-${step.id}" accept="image/*" style="display:none;" onchange="uploadStepImage('${step.id}')">
          <button class="btn btn-outline btn-sm" onclick="document.getElementById('step-img-${step.id}').click()">
            ${step.image ? '🔄 Change Image' : '📤 Upload Image'}
          </button>
          <p style="font-size:12px;color:var(--text-muted);margin-top:8px;">Optional: Leave empty to show circle number</p>
          <div id="step-status-${step.id}"></div>
        </div>

        <button class="btn btn-primary btn-sm" onclick="saveStep('${step.id}')">💾 Save Changes</button>
      </div>
    `;
  });
  container.innerHTML = html;
}

async function uploadDockImage(dockId) {
  const fileInput = document.getElementById(`dock-img-${dockId}`);
  const statusDiv = document.getElementById(`dock-status-${dockId}`);
  const file = fileInput.files[0];
  if (!file) return;

  statusDiv.innerHTML = '<p style="color:var(--text-muted);font-size:12px;">⏳ Uploading...</p>';

  const formData = new FormData();
  formData.append('file', file);
  formData.append('type', 'dock');

  try {
    const response = await fetch(MA_API + '/api/upload', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) throw new Error('Upload failed');
    const result = await response.json();
    const imageUrl = result.url;

    // Save to site-data
    await fetch(MA_API + '/api/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        section: 'docks',
        data: {
          id: dockId,
          image: imageUrl
        }
      })
    });

    _docksImages[dockId] = imageUrl;
    statusDiv.innerHTML = '<p style="color:var(--success);font-size:12px;">✅ Saved!</p>';
    setTimeout(() => loadMediaAccessories(), 1000);
  } catch (e) {
    statusDiv.innerHTML = `<p style="color:var(--error);font-size:12px;">❌ Error: ${e.message}</p>`;
  }
}

async function uploadFeatureImage(featureId) {
  const fileInput = document.getElementById(`feature-img-${featureId}`);
  const statusDiv = document.getElementById(`feature-status-${featureId}`);
  const file = fileInput.files[0];
  if (!file) return;

  statusDiv.innerHTML = '<p style="color:var(--text-muted);font-size:12px;">⏳ Uploading...</p>';

  const formData = new FormData();
  formData.append('file', file);
  formData.append('type', 'feature');

  try {
    const response = await fetch(MA_API + '/api/upload', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) throw new Error('Upload failed');
    const result = await response.json();
    const imageUrl = result.url;

    // Save to site-data
    await fetch(MA_API + '/api/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        section: 'features',
        data: {
          id: featureId,
          iconImage: imageUrl
        }
      })
    });

    _featuresImages[featureId] = imageUrl;
    statusDiv.innerHTML = '<p style="color:var(--success);font-size:12px;">✅ Saved!</p>';
    setTimeout(() => loadMediaAccessories(), 1000);
  } catch (e) {
    statusDiv.innerHTML = `<p style="color:var(--error);font-size:12px;">❌ Error: ${e.message}</p>`;
  }
}

async function uploadStepImage(stepId) {
  const fileInput = document.getElementById(`step-img-${stepId}`);
  const statusDiv = document.getElementById(`step-status-${stepId}`);
  const file = fileInput.files[0];
  if (!file) return;

  statusDiv.innerHTML = '<p style="color:var(--text-muted);font-size:12px;">⏳ Uploading...</p>';

  const formData = new FormData();
  formData.append('file', file);
  formData.append('type', 'step');

  try {
    const response = await fetch(MA_API + '/api/upload', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) throw new Error('Upload failed');
    const result = await response.json();
    const imageUrl = result.url;

    // Save to site-data
    await fetch(MA_API + '/api/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        section: 'steps',
        data: {
          id: stepId,
          image: imageUrl
        }
      })
    });

    _stepsImages[stepId] = imageUrl;
    statusDiv.innerHTML = '<p style="color:var(--success);font-size:12px;">✅ Saved!</p>';
    setTimeout(() => loadMediaAccessories(), 1000);
  } catch (e) {
    statusDiv.innerHTML = `<p style="color:var(--error);font-size:12px;">❌ Error: ${e.message}</p>`;
  }
}

// SAVE FUNCTIONS
async function saveDock(dockId) {
  const name = document.getElementById(`dock-name-${dockId}`).value.trim();
  if (!name) { alert('Name is required'); return; }

  const dockData = {
    id: dockId,
    name: name,
    description: document.getElementById(`dock-desc-${dockId}`).value.trim(),
    size: document.getElementById(`dock-size-${dockId}`).value.trim(),
    capacity: document.getElementById(`dock-capacity-${dockId}`).value.trim(),
    badge: document.getElementById(`dock-badge-${dockId}`).value.trim(),
    halfDay: parseFloat(document.getElementById(`dock-halfday-${dockId}`).value) || 25,
    fullDay: parseFloat(document.getElementById(`dock-fullday-${dockId}`).value) || 50
  };

  try {
    await fetch(MA_API + '/api/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ section: 'docks', data: dockData })
    });
    alert('✅ Dock saved!');
    loadMediaAccessories();
  } catch (e) {
    alert('❌ Error saving: ' + e.message);
  }
}

async function saveFeature(featureId) {
  const title = document.getElementById(`feature-title-${featureId}`).value.trim();
  if (!title) { alert('Title is required'); return; }

  const featureData = {
    id: featureId,
    title: title,
    icon: document.getElementById(`feature-icon-${featureId}`).value.trim() || '✨',
    description: document.getElementById(`feature-desc-${featureId}`).value.trim()
  };

  try {
    await fetch(MA_API + '/api/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ section: 'features', data: featureData })
    });
    alert('✅ Feature saved!');
    loadMediaAccessories();
  } catch (e) {
    alert('❌ Error saving: ' + e.message);
  }
}

async function saveStep(stepId) {
  const title = document.getElementById(`step-title-${stepId}`).value.trim();
  if (!title) { alert('Title is required'); return; }

  const stepData = {
    id: stepId,
    number: parseInt(document.getElementById(`step-number-${stepId}`).value) || 1,
    title: title,
    description: document.getElementById(`step-desc-${stepId}`).value.trim()
  };

  try {
    await fetch(MA_API + '/api/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ section: 'steps', data: stepData })
    });
    alert('✅ Step saved!');
    loadMediaAccessories();
  } catch (e) {
    alert('❌ Error saving: ' + e.message);
  }
}

// Register callback for when user navigates to addons page
onPageLoad('addons', loadMediaAccessories);
