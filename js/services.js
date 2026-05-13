// Services & Products management for salons, spas, retail

async function loadServices() {
  const siteId = USER_CONFIG.business_id;
  if (!siteId) return;
  
  try {
    const r = await fetch(`/api/services?site_id=${siteId}`);
    const { services = [] } = await r.json();
    
    const list = document.getElementById('services-list');
    const empty = document.getElementById('services-empty');
    
    if (!services.length) {
      list.style.display = 'none';
      empty.style.display = 'block';
      return;
    }
    
    list.innerHTML = services.map((svc, i) => `
      <div style="padding:12px;border-bottom:1px solid var(--card-border);display:flex;justify-content:space-between;align-items:center;">
        <div><h4 style="margin:0 0 4px;font-size:14px;">${svc.name}</h4><p style="margin:0;font-size:12px;color:var(--text-muted);">$${svc.price || '0'} • ${svc.duration || '30'} min</p></div>
        <button class="btn btn-outline btn-sm" onclick="editService(${i})">Edit</button>
      </div>
    `).join('');
    list.style.display = 'block';
    empty.style.display = 'none';
  } catch(e) {
    console.error('Services load error:', e);
  }
}

function openServiceModal() {
  // TODO: Implement service creation modal
  toast('Service creation coming soon', 'info');
}

function editService(index) {
  // TODO: Implement edit modal
  toast('Edit coming soon', 'info');
}
