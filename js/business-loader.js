// GCR Business Loader
// Loads businesses from Google Sheets via API

let allBusinesses = [];
let isLoading = false;
let loadError = null;

// Load businesses from API
async function loadBusinesses() {
  if (isLoading) {
    console.log('Already loading businesses...');
    return;
  }

  isLoading = true;
  console.log('Loading businesses from Google Sheets API...');

  try {
    const response = await fetch('/api/gcr/businesses', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (data.success && Array.isArray(data.businesses)) {
      allBusinesses = data.businesses;
      console.log(`✅ Loaded ${allBusinesses.length} businesses from ${data.source || 'API'}`);

      // Trigger any callbacks waiting for data
      if (window.onBusinessesLoaded) {
        window.onBusinessesLoaded(allBusinesses);
      }

      // Dispatch custom event
      window.dispatchEvent(new CustomEvent('businessesLoaded', {
        detail: { businesses: allBusinesses, source: data.source }
      }));

      return allBusinesses;
    } else {
      throw new Error(data.error || 'Failed to load businesses');
    }

  } catch (error) {
    console.error('Error loading businesses:', error);
    loadError = error.message;

    // Try to load from fallback if available
    if (window.fallbackBusinesses && Array.isArray(window.fallbackBusinesses)) {
      console.warn('⚠️ Using fallback business data');
      allBusinesses = window.fallbackBusinesses;
      return allBusinesses;
    }

    throw error;
  } finally {
    isLoading = false;
  }
}

// Auto-load on script load
loadBusinesses()
  .then(() => {
    console.log('Business data ready');
  })
  .catch(error => {
    console.error('Failed to load business data:', error);
    // Show error to user
    const errorElement = document.getElementById('loading-error');
    if (errorElement) {
      errorElement.textContent = `Failed to load businesses: ${error.message}. Please refresh the page.`;
      errorElement.style.display = 'block';
    }
  });

// Expose globally
window.allBusinesses = allBusinesses;
window.loadBusinesses = loadBusinesses;
