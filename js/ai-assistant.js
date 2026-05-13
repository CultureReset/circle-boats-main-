'use strict';

class BusinessAIAssistant {
  constructor() {
    this.history = [];
    this.isListening = false;
    this.voiceMode = false;
    this.recognition = null;
    this.open = false;
    this.pendingImage = null; // { base64, mimeType, preview }
    this.conversationId = localStorage.getItem('cc_ai_conv_id') || null;

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) {
      this.recognition = new SR();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = 'en-US';
      this.recognition.onresult = (e) => {
        const text = e.results[0][0].transcript;
        this.voiceMode = true;
        this.send(text);
      };
      this.recognition.onerror = () => this.stopListening();
      this.recognition.onend  = () => { this.isListening = false; this._updateMic(); };
    }

    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = () => {};
    }
  }

  toggle() {
    this.open = !this.open;
    const el  = document.getElementById('ai-assistant');
    const fab = document.getElementById('ai-toggle-btn');
    if (!el) return;

    if (this.open) {
      el.style.display = 'flex';
      fab.classList.add('hidden');
      if (this.history.length === 0) {
        if (this.conversationId) {
          this.loadHistory();
        } else {
          this._addMsg('assistant', "Hey! I'm your AI assistant — like having ChatGPT built into your dashboard, but I **remember everything** you've told me about your business.\n\nI can **answer anything**, **analyze images** 📎, **read websites** (paste a URL), and make real changes to your data.\n\nWhat can I help with?");
        }
      }
      setTimeout(() => { const i = document.getElementById('ai-input'); if (i) i.focus(); }, 100);
    } else {
      el.style.display = 'none';
      fab.classList.remove('hidden');
      speechSynthesis.cancel();
    }
  }

  show() { if (!this.open) this.toggle(); }
  hide() { if (this.open) this.toggle(); }

  // ── Image attachment ──

  attachImage() {
    const input = document.getElementById('ai-file-input');
    if (input) input.click();
  }

  async handleFileSelect(file) {
    if (!file || !file.type.startsWith('image/')) return;
    try {
      const compressed = await this._compressImage(file);
      this.pendingImage = compressed;
      this._showImagePreview(compressed.preview);
    } catch (err) {
      this._addMsg('assistant', `Couldn't read that image (${err.message}). Try a different one.`);
    }
  }

  // Resize to max 1600px on longest edge, re-encode JPEG @ 85% quality
  _compressImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('read failed'));
      reader.onload = (e) => {
        const img = new Image();
        img.onerror = () => reject(new Error('unsupported format — try JPEG or PNG'));
        img.onload = () => {
          const MAX = 1600;
          let { width: w, height: h } = img;
          if (w > MAX || h > MAX) {
            const scale = MAX / Math.max(w, h);
            w = Math.round(w * scale);
            h = Math.round(h * scale);
          }
          const canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          const dataUrl  = canvas.toDataURL('image/jpeg', 0.85);
          const base64   = dataUrl.split(',')[1];
          resolve({ base64, mimeType: 'image/jpeg', preview: dataUrl });
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  removeImage() {
    this.pendingImage = null;
    const preview = document.getElementById('ai-image-preview');
    if (preview) { preview.innerHTML = ''; preview.style.display = 'none'; }
    const input = document.getElementById('ai-file-input');
    if (input) input.value = '';
  }

  _showImagePreview(src) {
    const preview = document.getElementById('ai-image-preview');
    if (!preview) return;
    preview.innerHTML = `
      <div class="ai-preview-wrap">
        <img src="${src}" class="ai-preview-img" alt="attachment">
        <button class="ai-preview-remove" onclick="window.dashboardAI.removeImage()">✕</button>
      </div>`;
    preview.style.display = 'block';
  }

  // ── Core send ──

  _extractUrl(text) {
    const m = text.match(/https?:\/\/[^\s"'<>]+/);
    return m ? m[0] : null;
  }

  async send(text) {
    const msg   = (text || '').trim();
    const image = this.pendingImage;
    if (!msg && !image) return;

    const displayMsg = msg.length > 300 ? msg.slice(0, 300) + `\n…(+${msg.length - 300} more chars)` : msg;
    this._addMsg('user', displayMsg, image ? image.preview : null);
    if (msg) this.history.push({ role: 'user', content: msg });
    this._showTyping();

    if (image) this.removeImage();

    try {
      const API   = window.CC_API_BASE || '';
      const token = window.CC && CC.getToken ? CC.getToken() : localStorage.getItem('cc_token');
      const url   = this._extractUrl(msg);

      const body = {
        message: msg || 'What do you see in this image?',
        history: this.history.slice(-10),
        ...(this.conversationId ? { conversation_id: this.conversationId } : {}),
        ...(image ? { image: { base64: image.base64, mimeType: image.mimeType } } : {}),
        ...(url   ? { url } : {})
      };

      const res  = await fetch(API + '/api/dashboard/ai-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': 'Bearer ' + token } : {})
        },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      this._removeTyping();

      // Capture conversation_id from first turn so subsequent messages stay threaded
      if (data.conversation_id && !this.conversationId) {
        this.conversationId = data.conversation_id;
        localStorage.setItem('cc_ai_conv_id', data.conversation_id);
      }

      if (data.tool_results && data.tool_results.length) {
        this._showToolResults(data.tool_results);
      }

      const reply = data.reply || 'Done!';
      this._addMsg('assistant', reply);
      this.history.push({ role: 'assistant', content: reply });

      if (this.voiceMode) this._speak(reply);
      this.voiceMode = false;

      if (data.tool_results && data.tool_results.length) {
        data.tool_results.forEach(r => {
          if (['add_menu_items','clear_menu_type','update_menu_item','delete_menu_item'].includes(r.tool)) {
            if (typeof loadMenu === 'function') loadMenu();
          }
          if (r.tool === 'add_specials' && typeof loadSpecials === 'function') loadSpecials();
          if (r.tool === 'add_events'   && typeof loadEvents   === 'function') loadEvents();
        });
      }
    } catch (err) {
      this._removeTyping();
      this._addMsg('assistant', 'Connection error — try again.');
    }
  }

  handleTextInput() {
    const input = document.getElementById('ai-input');
    if (!input) return;
    const msg = input.value.trim();
    if (!msg && !this.pendingImage) return;
    input.value = '';
    input.style.height = 'auto';
    this.voiceMode = false;
    this.send(msg);
  }

  // ── Tool result badges ──

  _showToolResults(results) {
    const container = document.getElementById('ai-chat-messages');
    if (!container) return;
    const div = document.createElement('div');
    div.className = 'ai-message ai-system';
    const badges = results.map(r => {
      if (r.tool === 'add_menu_items')     return `<span class="ai-tool-badge">✅ Added ${r.count} item${r.count !== 1 ? 's' : ''}</span>`;
      if (r.tool === 'clear_menu_type')    return `<span class="ai-tool-badge ai-tool-warn">🗑 Cleared ${r.cleared}</span>`;
      if (r.tool === 'add_specials')       return `<span class="ai-tool-badge">✅ Added ${r.count} special${r.count !== 1 ? 's' : ''}</span>`;
      if (r.tool === 'add_events')         return `<span class="ai-tool-badge">✅ Added ${r.count} event${r.count !== 1 ? 's' : ''}</span>`;
      if (r.tool === 'delete_menu_item')   return `<span class="ai-tool-badge ai-tool-warn">🗑 Removed: ${r.deleted_name}</span>`;
      if (r.tool === 'update_menu_item')   return `<span class="ai-tool-badge">✏️ Updated: ${r.updated_name}</span>`;
      if (r.tool === 'update_hh_schedule') return `<span class="ai-tool-badge">✅ Happy Hour: ${r.schedule.days} ${r.schedule.start}–${r.schedule.end}</span>`;
      if (r.tool === 'save_memory')        return `<span class="ai-tool-badge ai-tool-memory">🧠 Remembered: ${r.category}/${r.saved_key}</span>`;
      if (r.tool === 'update_memory')      return `<span class="ai-tool-badge ai-tool-memory">🧠 Updated memory: ${r.updated_key}</span>`;
      if (r.tool === 'delete_memory')      return `<span class="ai-tool-badge ai-tool-warn">🧠 Forgot: ${r.deleted_key}</span>`;
      return '';
    }).join(' ');
    div.innerHTML = `<div class="ai-message-content" style="background:transparent;box-shadow:none;">${badges}</div>`;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }

  // ── Voice ──

  toggleVoice() {
    if (!this.recognition) {
      this._addMsg('assistant', 'Voice not supported — try Chrome or Safari.');
      return;
    }
    if (this.isListening) {
      this.recognition.stop();
    } else {
      try { this.recognition.start(); this.isListening = true; this._updateMic(); } catch (e) {}
    }
  }

  stopListening() {
    if (this.recognition) this.recognition.stop();
    this.isListening = false;
    this._updateMic();
  }

  clearChat() {
    const el = document.getElementById('ai-chat-messages');
    if (el) el.innerHTML = '';
    this.history = [];
    this.conversationId = null;
    localStorage.removeItem('cc_ai_conv_id');
    this._addMsg('assistant', 'Started a new chat. What can I help with? *(I still remember things you\'ve told me before across all chats.)*');
  }

  async loadHistory() {
    if (!this.conversationId) return;
    try {
      const API   = window.CC_API_BASE || '';
      const token = window.CC && CC.getToken ? CC.getToken() : localStorage.getItem('cc_token');
      const res   = await fetch(`${API}/api/dashboard/ai-chat/conversations/${this.conversationId}`, {
        headers: token ? { 'Authorization': 'Bearer ' + token } : {}
      });
      if (!res.ok) {
        // conversation no longer exists — start fresh
        this.conversationId = null;
        localStorage.removeItem('cc_ai_conv_id');
        return;
      }
      const data = await res.json();
      const container = document.getElementById('ai-chat-messages');
      if (container) container.innerHTML = '';
      this.history = [];
      (data.messages || []).forEach(m => {
        this._addMsg(m.role === 'assistant' ? 'assistant' : 'user', m.content);
        this.history.push({ role: m.role, content: m.content });
        if (m.tool_results && m.tool_results.length) this._showToolResults(m.tool_results);
      });
    } catch (e) { /* silent */ }
  }

  // ── Private ──

  _speak(text) {
    if (!window.speechSynthesis) return;
    speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text.replace(/[#*`|>]/g, ''));
    utter.rate = 1.05;
    const voices = speechSynthesis.getVoices();
    const pick = voices.find(v => v.name.includes('Samantha')) ||
                 voices.find(v => v.lang === 'en-US' && v.localService) || voices[0];
    if (pick) utter.voice = pick;
    speechSynthesis.speak(utter);
  }

  _updateMic() {
    const btn = document.getElementById('ai-mic-btn');
    if (!btn) return;
    btn.classList.toggle('listening', this.isListening);
    btn.innerHTML = this.isListening ? '🔴' : '🎤';
  }

  // ── Markdown renderer ──

  _esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  _renderMarkdown(text) {
    // Protect code blocks first
    const codeBlocks = [];
    let html = text.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
      const id  = 'cb-' + Math.random().toString(36).slice(2, 8);
      const esc = this._esc(code.trim());
      codeBlocks.push(`<div class="ai-code-block"><div class="ai-code-lang">${lang || 'code'}<button class="ai-copy-btn" onclick="navigator.clipboard.writeText(this.closest('.ai-code-block').querySelector('code').innerText);this.textContent='copied!'">copy</button></div><pre><code id="${id}">${esc}</code></pre></div>`);
      return `\x00CODE${codeBlocks.length - 1}\x00`;
    });

    // Tables
    html = html.replace(/((?:\|.+\|\n?)+)/g, (match) => {
      const rows = match.trim().split('\n').filter(r => r.trim());
      const isSep = r => /^\|[\s\-:|]+\|$/.test(r.trim());
      let out = '<table class="ai-table"><tbody>';
      let headerDone = false;
      rows.forEach(row => {
        if (isSep(row)) { headerDone = true; return; }
        const cells = row.split('|').slice(1, -1);
        const tag   = !headerDone ? 'th' : 'td';
        out += '<tr>' + cells.map(c => `<${tag}>${this._esc(c.trim())}</${tag}>`).join('') + '</tr>';
        if (!headerDone) headerDone = true;
      });
      return out + '</tbody></table>';
    });

    // Headers
    html = html.replace(/^### (.+)$/gm, '<h3 class="ai-h">$1</h3>');
    html = html.replace(/^## (.+)$/gm,  '<h2 class="ai-h">$1</h2>');
    html = html.replace(/^# (.+)$/gm,   '<h1 class="ai-h">$1</h1>');

    // Blockquote
    html = html.replace(/^> (.+)$/gm, '<blockquote class="ai-quote">$1</blockquote>');

    // Lists — gather consecutive lines
    html = html.replace(/((?:^[ \t]*[-*•] .+\n?)+)/gm, match => {
      const items = match.trim().split('\n').map(l => `<li>${this._esc(l.replace(/^[ \t]*[-*•] /, ''))}</li>`).join('');
      return `<ul class="ai-ul">${items}</ul>`;
    });
    html = html.replace(/((?:^\d+\. .+\n?)+)/gm, match => {
      const items = match.trim().split('\n').map(l => `<li>${this._esc(l.replace(/^\d+\. /, ''))}</li>`).join('');
      return `<ol class="ai-ol">${items}</ol>`;
    });

    // Inline code
    html = html.replace(/`([^`\n]+)`/g, (_, c) => `<code class="ai-code">${this._esc(c)}</code>`);

    // Bold + italic
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*([^*\n]+?)\*/g, '<em>$1</em>');

    // Links
    html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

    // Auto-link bare URLs (not already inside an href)
    html = html.replace(/(?<!href=")(https?:\/\/[^\s<"]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');

    // Restore code blocks
    html = html.replace(/\x00CODE(\d+)\x00/g, (_, i) => codeBlocks[+i]);

    // Newlines → <br> (skip inside block elements)
    html = html.replace(/\n/g, '<br>');
    // Clean up <br> inside block tags
    html = html.replace(/(<(?:ul|ol|table|blockquote|div|h[1-3])[^>]*>)<br>/g, '$1');
    html = html.replace(/<br>(<\/(?:ul|ol|table|blockquote|div|h[1-3])>)/g, '$1');

    return html;
  }

  _addMsg(role, content, imageSrc) {
    const container = document.getElementById('ai-chat-messages');
    if (!container) return;

    const div  = document.createElement('div');
    div.className = `ai-message ai-${role}`;
    const icon = role === 'user' ? '👤' : '🤖';

    const imgHtml = imageSrc
      ? `<img src="${imageSrc}" class="ai-msg-image" alt="attachment">`
      : '';

    const bodyHtml = role === 'user'
      ? this._esc(content)
      : this._renderMarkdown(content);

    div.innerHTML = `
      <div class="ai-message-icon">${icon}</div>
      <div class="ai-message-content">${imgHtml}${bodyHtml}</div>`;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }

  _showTyping() {
    const container = document.getElementById('ai-chat-messages');
    if (!container) return;
    const div = document.createElement('div');
    div.className = 'ai-message ai-system';
    div.id = 'ai-typing';
    div.innerHTML = '<div class="ai-message-content"><div class="typing-indicator"><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span></div></div>';
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }

  _removeTyping() {
    const el = document.getElementById('ai-typing');
    if (el) el.remove();
  }
}

window.dashboardAI = new BusinessAIAssistant();
