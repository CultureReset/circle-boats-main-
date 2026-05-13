// ============================================
// Staff — Team member CRUD
// ============================================

var _staffMembers = [];
var _staffIdCounter = 0;

// No demo staff — real staff comes from the API
var _defaultStaff = [];

async function loadStaff() {
  // Try API first
  var apiData = await CC.dashboard.getStaff();
  if (apiData && Array.isArray(apiData) && apiData.length > 0) {
    _staffMembers = apiData.map(function(s) {
      return { id: s.id, name: s.name || '', role: s.role || '', bio: s.bio || '', photo: s.photo_url || '', _apiId: s.id };
    });
    _staffIdCounter = _staffMembers.length;
  } else if (_staffMembers.length === 0) {
    _staffMembers = _defaultStaff.slice();
    _staffIdCounter = 3;
  }

  renderStaff();
}

function renderStaff() {
  var grid = document.getElementById('staff-grid');
  var emptyState = document.getElementById('staff-empty');

  if (_staffMembers.length === 0) {
    grid.innerHTML = '';
    emptyState.style.display = '';
    return;
  }

  emptyState.style.display = 'none';
  var html = '';

  _staffMembers.forEach(function(member) {
    var initials = member.name.split(' ').map(function(n) { return n[0]; }).join('').toUpperCase();
    var colors = ['#3b82f6','#10b981','#f59e0b','#8b5cf6','#ec4899','#ef4444'];
    var color = colors[member.id % colors.length];

    var avatarImg;
    if (member.photo) {
      avatarImg = '<img src="' + member.photo + '" alt="' + escHtml(member.name) + '">';
    } else {
      avatarImg = '<div style="width:100%;aspect-ratio:1;display:flex;align-items:center;justify-content:center;background:' + color + ';font-size:32px;font-weight:700;color:white;">' + initials + '</div>';
    }

    html += '<div class="grid-item" style="position:relative;">';
    html += avatarImg;
    html += '<div class="item-info">';
    html += '<h4>' + escHtml(member.name) + '</h4>';
    html += '<p>' + escHtml(member.role) + '</p>';
    if (member.bio) {
      html += '<p style="margin-top:4px;font-size:11px;color:var(--text-dim);line-height:1.4;">' + escHtml(member.bio).substring(0, 80) + (member.bio.length > 80 ? '...' : '') + '</p>';
    }
    html += '<div style="display:flex;gap:4px;margin-top:8px;">';
    html += '<button class="btn btn-outline btn-sm" onclick="event.stopPropagation();editStaff(' + member.id + ')">Edit</button>';
    html += '<button class="btn btn-danger btn-sm" onclick="event.stopPropagation();deleteStaff(' + member.id + ')">Delete</button>';
    html += '</div>';
    html += '</div>';
    html += '</div>';
  });

  grid.innerHTML = html;
}

function openStaffModal(id) {
  document.getElementById('staff-form-name').value = '';
  document.getElementById('staff-form-role').value = '';
  document.getElementById('staff-form-bio').value = '';
  document.getElementById('staff-form-photo').value = '';
  document.getElementById('staff-form-id').value = '';
  document.getElementById('staff-modal-title').textContent = 'Add Team Member';

  if (id) {
    var member = _staffMembers.find(function(m) { return m.id === id; });
    if (member) {
      document.getElementById('staff-modal-title').textContent = 'Edit Team Member';
      document.getElementById('staff-form-name').value = member.name;
      document.getElementById('staff-form-role').value = member.role;
      document.getElementById('staff-form-bio').value = member.bio || '';
      document.getElementById('staff-form-id').value = member.id;
    }
  }

  openModal('modal-staff');
}

function saveStaff() {
  var name = document.getElementById('staff-form-name').value.trim();
  if (!name) { toast('Name is required', 'error'); return; }

  var role = document.getElementById('staff-form-role').value.trim();
  var bio = document.getElementById('staff-form-bio').value.trim();
  var id = document.getElementById('staff-form-id').value;
  var photoInput = document.getElementById('staff-form-photo');

  if (photoInput.files && photoInput.files[0]) {
    toast('Uploading photo...');
    uploadToSupabase(photoInput.files[0], 'staff').then(function(url) {
      finishSaveStaff(id, name, role, bio, url || '');
    });
  } else {
    var existingPhoto = '';
    if (id) {
      var existing = _staffMembers.find(function(m) { return m.id == id; });
      if (existing) existingPhoto = existing.photo;
    }
    finishSaveStaff(id, name, role, bio, existingPhoto);
  }
}

async function finishSaveStaff(id, name, role, bio, photo) {
  var staffData = { name: name, role: role, bio: bio, photo_url: photo || null };

  if (id) {
    await CC.dashboard.updateStaff(id, staffData);
    toast('Team member saved to database');
  } else {
    await CC.dashboard.createStaff(staffData);
    toast('Team member added to database');
  }

  await loadStaff();
  closeModal('modal-staff');
}

function editStaff(id) {
  openStaffModal(id);
}

async function deleteStaff(id) {
  if (!confirm('Remove this team member?')) return;
  await CC.dashboard.deleteStaff(id);
  await loadStaff();
  toast('Team member removed from database');
}

// Register page load callback
onPageLoad('staff', loadStaff);
