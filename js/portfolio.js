// Portfolio management for photographers

async function loadPortfolio() {
  const siteId = USER_CONFIG.business_id;
  if (!siteId) return;
  
  try {
    const r = await fetch(`/api/portfolio?site_id=${siteId}`);
    const { items = [] } = await r.json();
    
    const grid = document.getElementById('portfolio-grid');
    const empty = document.getElementById('portfolio-empty');
    
    if (!items.length) {
      grid.style.display = 'none';
      empty.style.display = 'block';
      return;
    }
    
    grid.innerHTML = items.map((item, i) => `
      <div style="border:1px solid var(--card-border);border-radius:8px;overflow:hidden;cursor:pointer;" onclick="editPortfolioItem(${i})">
        <img src="${item.image_url}" style="width:100%;height:150px;object-fit:cover;">
        <div style="padding:8px;"><p style="margin:0;font-size:13px;font-weight:500;">${item.title || 'Untitled'}</p></div>
      </div>
    `).join('');
    grid.style.display = 'grid';
    empty.style.display = 'none';
  } catch(e) {
    console.error('Portfolio load error:', e);
  }
}

function openPortfolioModal() {
  // TODO: Implement portfolio upload modal
  toast('Portfolio upload coming soon', 'info');
}

function editPortfolioItem(index) {
  // TODO: Implement edit modal
  toast('Edit coming soon', 'info');
}
