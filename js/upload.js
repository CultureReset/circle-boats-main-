// ============================================
// upload.js — Supabase Storage upload helper
// All image uploads go through here → Supabase Storage → media table
// ============================================

// Per-folder resize settings.
// gallery + media = no resize (upload original for full quality).
// Other folders resize only if image exceeds max dimension.
var _folderResizeConfig = {
  gallery:  null,                              // skip — upload original
  media:    null,                              // skip — upload original
  hero:     { maxW: 2400, maxH: 2400, q: 0.95 },
  boat:     { maxW: 2400, maxH: 2400, q: 0.95 },
  dock:     { maxW: 2400, maxH: 2400, q: 0.95 },
  addon:    { maxW: 2400, maxH: 2400, q: 0.95 },
  steps:    { maxW: 2400, maxH: 2400, q: 0.95 },
  step:     { maxW: 2400, maxH: 2400, q: 0.95 },
  feature:  { maxW: 2000, maxH: 2000, q: 0.95 },
  location: { maxW: 2400, maxH: 2400, q: 0.95 },
  about:    { maxW: 2400, maxH: 2400, q: 0.95 },
  logo:      { maxW: 400,  maxH: 400,  q: 0.95 },
  customers: { maxW: 400,  maxH: 400,  q: 0.92 }
};
var _defaultResizeConfig = { maxW: 2400, maxH: 2400, q: 0.95 };

function resizeImageFile(file, folder) {
  // Skip non-images or GIFs (preserve animation)
  if (!file.type.startsWith('image/') || file.type === 'image/gif') {
    return Promise.resolve(file);
  }
  // gallery and media: upload original — no canvas processing
  var cfg = _folderResizeConfig.hasOwnProperty(folder) ? _folderResizeConfig[folder] : _defaultResizeConfig;
  if (!cfg) return Promise.resolve(file);

  var maxW = cfg.maxW, maxH = cfg.maxH, quality = cfg.q;
  return new Promise(function(resolve) {
    var reader = new FileReader();
    reader.onload = function(e) {
      var img = new Image();
      img.onload = function() {
        var w = img.naturalWidth;
        var h = img.naturalHeight;
        // Only scale down if image exceeds max dimension
        if (w <= maxW && h <= maxH) { resolve(file); return; }
        var scale = Math.min(maxW / w, maxH / h);
        var canvas = document.createElement('canvas');
        canvas.width  = Math.round(w * scale);
        canvas.height = Math.round(h * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        var outType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        canvas.toBlob(function(blob) {
          if (!blob) { resolve(file); return; }
          resolve(new File([blob], file.name, { type: outType, lastModified: Date.now() }));
        }, outType, quality);
      };
      img.onerror = function() { resolve(file); };
      img.src = e.target.result;
    };
    reader.onerror = function() { resolve(file); };
    reader.readAsDataURL(file);
  });
}

async function uploadToSupabase(file, folder) {
  // Block HEIC/HEIF — Chrome can't display them and Safari canvas produces black images
  if (file.type === 'image/heic' || file.type === 'image/heif' ||
      /\.heic$/i.test(file.name) || /\.heif$/i.test(file.name)) {
    toast('HEIC photos not supported. On iPhone: Settings → Camera → Formats → Most Compatible to shoot in JPEG.', 'error');
    return null;
  }

  // Resize before upload (gallery/media skip resize entirely — original quality)
  file = await resizeImageFile(file, folder);
  if (!supabase || !file) return null;
  var siteId = getSiteId();
  if (!siteId) { await getSupabaseBusiness(); siteId = getSiteId(); }
  if (!siteId) { toast('Not logged in', 'error'); return null; }

  // Build path: {site_id}/{folder}/{timestamp}-{filename}
  var safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  var path = siteId + '/' + (folder || 'general') + '/' + Date.now() + '-' + safeName;

  var { data, error } = await supabase.storage.from('media').upload(path, file, {
    cacheControl: '3600',
    upsert: false
  });

  if (error) {
    console.error('Upload error:', error);
    toast('Upload failed: ' + error.message, 'error');
    return null;
  }

  // Get public URL
  var { data: urlData } = supabase.storage.from('media').getPublicUrl(data.path);
  var publicUrl = urlData.publicUrl;

  // Record in media table
  var { error: insertError } = await supabase.from('media').insert({
    site_id: siteId,
    url: publicUrl,
    filename: file.name,
    file_type: file.type.startsWith('image/') ? 'image' : file.type.split('/')[0],
    file_size: file.size,
    folder: folder || 'general',
    title: file.name
  });

  if (insertError) {
    console.error('Media record failed:', insertError);
    // Remove the orphaned file from storage so nothing is stranded
    await supabase.storage.from('media').remove([data.path]);
    toast('Upload failed — could not save file record.', 'error');
    return null;
  }

  return publicUrl;
}

async function deleteFromSupabase(mediaId, storagePath) {
  if (!supabase) return false;
  var siteId = getSiteId();
  if (!siteId) return false;

  // Delete from storage if path provided
  if (storagePath) {
    await supabase.storage.from('media').remove([storagePath]);
  }

  // Delete from media table
  if (mediaId) {
    await supabase.from('media').delete().eq('id', mediaId).eq('site_id', siteId);
  }

  return true;
}

// Upload multiple files, returns array of public URLs
async function uploadMultipleToSupabase(files, folder) {
  var urls = [];
  for (var i = 0; i < files.length; i++) {
    var url = await uploadToSupabase(files[i], folder);
    if (url) urls.push(url);
  }
  return urls;
}
