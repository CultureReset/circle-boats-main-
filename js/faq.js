/* FAQ Manager — /js/faq.js */

var _faqs = [];
var _faqEditId = null;

function loadFAQ() {
    var list = document.getElementById('faq-list');
    if (!list) return;

    list.innerHTML = '<p style="color:var(--text-dim);">Loading...</p>';

    CC.dashboard.getFAQs().then(function(data) {
        _faqs = data || [];
        renderFAQList();
    }).catch(function() {
        list.innerHTML = '<p style="color:var(--error);">Failed to load FAQs.</p>';
    });
}

function renderFAQList() {
    var list = document.getElementById('faq-list');
    if (!list) return;

    if (!_faqs.length) {
        list.innerHTML = '<p style="color:var(--text-dim);text-align:center;padding:24px 0;">No FAQs yet. Click "+ Add Question" to get started.</p>';
        return;
    }

    list.innerHTML = _faqs.map(function(faq) {
        return '<div class="faq-item" data-id="' + faq.id + '" style="border:1px solid var(--card-border);border-radius:8px;padding:14px 16px;margin-bottom:10px;background:var(--card-bg);">' +
            '<div style="display:flex;align-items:flex-start;gap:12px;">' +
            '<div style="display:flex;flex-direction:column;gap:4px;padding-top:2px;">' +
            '<button onclick="moveFAQ(\'' + faq.id + '\',-1)" style="background:none;border:none;cursor:pointer;color:var(--text-dim);font-size:12px;padding:0;line-height:1;" title="Move up">▲</button>' +
            '<button onclick="moveFAQ(\'' + faq.id + '\',1)" style="background:none;border:none;cursor:pointer;color:var(--text-dim);font-size:12px;padding:0;line-height:1;" title="Move down">▼</button>' +
            '</div>' +
            '<div style="flex:1;min-width:0;">' +
            '<div style="font-weight:600;color:var(--text);margin-bottom:4px;">' + escFAQ(faq.question) + '</div>' +
            '<div style="color:var(--text-dim);font-size:13px;line-height:1.5;">' + escFAQ(faq.answer) + '</div>' +
            '</div>' +
            '<div style="display:flex;gap:8px;flex-shrink:0;">' +
            '<button class="btn btn-outline btn-sm" onclick="openFAQModal(\'' + faq.id + '\')">Edit</button>' +
            '<button class="btn btn-sm" style="background:var(--error,#ef4444);color:#fff;border:none;border-radius:6px;padding:4px 10px;cursor:pointer;" onclick="deleteFAQ(\'' + faq.id + '\')">Delete</button>' +
            '</div>' +
            '</div></div>';
    }).join('');
}

function openFAQModal(id) {
    _faqEditId = id || null;
    var faq = id ? _faqs.find(function(f) { return f.id === id; }) : null;

    var header = document.getElementById('modal-faq-title');
    var qInput = document.getElementById('faq-question');
    var aInput = document.getElementById('faq-answer');
    if (header) header.textContent = id ? 'Edit FAQ' : 'Add Question';
    if (qInput) qInput.value = faq ? faq.question : '';
    if (aInput) aInput.value = faq ? faq.answer : '';

    openModal('modal-faq');
}

function saveFAQ() {
    var question = (document.getElementById('faq-question') || {}).value;
    var answer = (document.getElementById('faq-answer') || {}).value;
    if (question) question = question.trim();
    if (answer) answer = answer.trim();

    if (!question || !answer) {
        alert('Question and answer are required.');
        return;
    }

    var promise = _faqEditId
        ? CC.dashboard.updateFAQ(_faqEditId, { question: question, answer: answer })
        : CC.dashboard.createFAQ({ question: question, answer: answer });

    promise.then(function() {
        closeModal('modal-faq');
        loadFAQ();
    }).catch(function() {
        alert('Failed to save FAQ. Please try again.');
    });
}

function deleteFAQ(id) {
    if (!confirm('Delete this FAQ?')) return;
    CC.dashboard.deleteFAQ(id).then(function() {
        loadFAQ();
    }).catch(function() {
        alert('Failed to delete FAQ.');
    });
}

function moveFAQ(id, direction) {
    var idx = _faqs.findIndex(function(f) { return f.id === id; });
    if (idx === -1) return;
    var swapIdx = idx + direction;
    if (swapIdx < 0 || swapIdx >= _faqs.length) return;

    var aOrder = _faqs[idx].sort_order;
    var bOrder = _faqs[swapIdx].sort_order;

    Promise.all([
        CC.dashboard.updateFAQ(_faqs[idx].id, { sort_order: bOrder }),
        CC.dashboard.updateFAQ(_faqs[swapIdx].id, { sort_order: aOrder })
    ]).then(function() {
        loadFAQ();
    }).catch(function() {
        alert('Failed to reorder. Please try again.');
    });
}

function escFAQ(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
