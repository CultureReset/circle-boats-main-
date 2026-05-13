// ── QR Menu AI Design Chat ──────────────────────────────

var _wgSlug = null;
var _wgHistory = [];

function loadWavegentTab() {
  if (!_currentEntityId) return;
  var entity = _allEntities.find(function(e) { return e.id === _currentEntityId; });
  _wgSlug = entity ? entity.slug : null;

  // Show preview bar with live QR menu URL
  var bar = document.getElementById('wg-preview-bar');
  var urlText = document.getElementById('wg-menu-url-text');
  if (bar && urlText && _wgSlug) {
    urlText.textContent = 'https://cybercheck-links.vercel.app/' + _wgSlug + '/menu';
    bar.style.display = 'flex';
  }

  // Reset chat
  _wgHistory = [];
  var msgs = document.getElementById('wg-chat-msgs');
  if (msgs) msgs.innerHTML = '<div style="text-align:center;color:var(--text-muted);font-size:13px;">Describe the style you want for this menu.</div>';
}

async function wgSend() {
  var input = document.getElementById('wg-chat-input');
  var text = (input.value || '').trim();
  if (!text || !_currentEntityId) return;
  input.value = '';

  var msgs = document.getElementById('wg-chat-msgs');
  var btn  = document.getElementById('wg-send-btn');

  // Append user bubble
  msgs.innerHTML += '<div style="align-self:flex-end;background:var(--primary);color:#fff;padding:10px 14px;border-radius:14px 14px 4px 14px;font-size:14px;max-width:85%;">' + escHtml(text) + '</div>';
  msgs.scrollTop = msgs.scrollHeight;

  btn.disabled = true;
  btn.textContent = '…';

  // Thinking bubble
  var thinkId = 'wg-think-' + Date.now();
  msgs.innerHTML += '<div id="' + thinkId + '" style="align-self:flex-start;background:var(--card-bg,#1e2533);color:var(--text-muted);padding:10px 14px;border-radius:14px 14px 14px 4px;font-size:13px;max-width:85%;">✨ Applying style…</div>';
  msgs.scrollTop = msgs.scrollHeight;

  try {
    var res = await fetch(API_BASE + '/api/admin/gcr/grok-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getAuthToken() },
      body: JSON.stringify({
        message: 'QR MENU DESIGN REQUEST: ' + text + '\n\nApply this style to the QR menu for this business. Use the set_qr_theme tool to save it. Generate appropriate colors, decide which modules to show, and set module_order based on what makes sense for the request. Respond with a short confirmation of what you applied.',
        entity_id: _currentEntityId,
        history: _wgHistory,
      })
    });

    var d = await res.json();
    var reply = d.reply || d.message || 'Done!';

    // Remove thinking bubble, add AI reply
    var think = document.getElementById(thinkId);
    if (think) think.remove();
    msgs.innerHTML += '<div style="align-self:flex-start;background:var(--card-bg,#1e2533);color:var(--text);padding:10px 14px;border-radius:14px 14px 14px 4px;font-size:14px;max-width:85%;line-height:1.5;">' + escHtml(reply) + '</div>';
    msgs.scrollTop = msgs.scrollHeight;

    _wgHistory.push({ role: 'user', content: text });
    _wgHistory.push({ role: 'assistant', content: reply });

    if (typeof toast === 'function') toast('Menu style saved!', 'success');
  } catch (err) {
    var think2 = document.getElementById(thinkId);
    if (think2) think2.textContent = '⚠️ ' + err.message;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Apply ✨';
  }
}
