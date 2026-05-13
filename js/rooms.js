// Rooms & Units management for hotels, condos, vacation rentals

async function loadRooms() {
  const siteId = USER_CONFIG.business_id;
  if (!siteId) return;
  
  try {
    const r = await fetch(`/api/rooms?site_id=${siteId}`);
    const { rooms = [] } = await r.json();
    
    const list = document.getElementById('rooms-list');
    const empty = document.getElementById('rooms-empty');
    
    if (!rooms.length) {
      list.style.display = 'none';
      empty.style.display = 'block';
      return;
    }
    
    list.innerHTML = rooms.map((room, i) => `
      <div style="padding:12px;border-bottom:1px solid var(--card-border);display:flex;justify-content:space-between;align-items:center;">
        <div><h4 style="margin:0 0 4px;font-size:14px;">${room.name}</h4><p style="margin:0;font-size:12px;color:var(--text-muted);">$${room.price || '0'}/night • ${room.capacity || '2'} guests</p></div>
        <button class="btn btn-outline btn-sm" onclick="editRoom(${i})">Edit</button>
      </div>
    `).join('');
    list.style.display = 'block';
    empty.style.display = 'none';
  } catch(e) {
    console.error('Rooms load error:', e);
  }
}

function openRoomModal() {
  // TODO: Implement room creation modal
  toast('Room creation coming soon', 'info');
}

function editRoom(index) {
  // TODO: Implement edit modal
  toast('Edit coming soon', 'info');
}
