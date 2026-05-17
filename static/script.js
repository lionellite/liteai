/* ─── Globals ─── */
let currentSessionId = null;
let currentModel = DEFAULT_MODEL;
let pendingFileContent = null;
let pendingFileName = null;
let pendingFileType = null;
let isStreaming = false;
let webSearchEnabled = false;

const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const sessionsList = document.getElementById('sessions-list');
const welcomeScreen = document.getElementById('welcome-screen');
const modelSelect = document.getElementById('model-select');
const modelCtx = document.getElementById('model-ctx');

// ─── Init ───
document.addEventListener('DOMContentLoaded', () => {
    marked.setOptions({ breaks: true, gfm: true });
    updateModelCtx(currentModel);
    loadSessions();

    userInput.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    });
    userInput.addEventListener('input', () => {
        userInput.style.height = 'auto';
        userInput.style.height = Math.min(userInput.scrollHeight, 180) + 'px';
    });
});

// ─── Model ───
function onModelChange(val) {
    currentModel = val;
    updateModelCtx(val);
}

function updateModelCtx(key) {
    const m = MODELS[key];
    if (m && modelCtx) modelCtx.textContent = m.context || '';
}

// ─── Format Messages ───
function formatAIContent(raw) {
    let thinking = '';
    let content = raw.replace(/<think>([\s\S]*?)<\/think>/gi, (_, p1) => {
        thinking = p1.trim();
        return '';
    });
    let html = '';
    if (thinking) {
        html += `<details class="thought-block">
            <summary class="thought-summary">
                <span>✦</span> Réflexion interne
            </summary>
            <div class="thought-body">${escapeHtml(thinking)}</div>
        </details>`;
    }
    html += marked.parse(content.trim());
    return html;
}

function addCopyButtons(el) {
    el.querySelectorAll('pre').forEach(pre => {
        if (pre.parentElement.classList.contains('code-wrap')) return;
        const wrap = document.createElement('div');
        wrap.className = 'code-wrap';
        pre.replaceWith(wrap);
        wrap.appendChild(pre);
        const btn = document.createElement('button');
        btn.className = 'copy-btn';
        btn.textContent = 'Copier';
        btn.onclick = () => {
            navigator.clipboard.writeText(pre.innerText);
            btn.textContent = '✓ Copié';
            setTimeout(() => btn.textContent = 'Copier', 2000);
        };
        wrap.appendChild(btn);
    });
    el.querySelectorAll('pre code').forEach(b => hljs.highlightElement(b));
}

function escapeHtml(s) {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ─── Render Message ───
function renderMessage(role, content, animate = true) {
    if (welcomeScreen) welcomeScreen.style.display = 'none';

    const row = document.createElement('div');
    row.className = `msg-row ${role === 'user' ? 'user' : 'ai'}`;
    if (animate) row.style.animation = 'fadeUp 0.25s ease';

    const isUser = role === 'user';
    const avatarLetter = isUser ? (document.querySelector('.avatar')?.textContent || 'U') : 'AI';

    row.innerHTML = `
        <div class="msg-inner">
            <div class="msg-avatar ${isUser ? 'user-av' : 'ai-av'}">${avatarLetter}</div>
            <div class="msg-body">
                <div class="msg-author">${isUser ? 'Vous' : 'LiteAI'}</div>
                <div class="msg-content"></div>
                ${!isUser ? `<div class="msg-actions">
                    <button class="action-btn copy-all-btn">Copier</button>
                    <div class="export-btns">
                        <button class="export-btn" onclick="exportMsg(this, 'txt')">TXT</button>
                        <button class="export-btn" onclick="exportMsg(this, 'md')">MD</button>
                        <button class="export-btn" onclick="exportMsg(this, 'docx')">DOCX</button>
                        <button class="export-btn" onclick="exportMsg(this, 'xlsx')">XLSX</button>
                        <button class="export-btn" onclick="exportMsg(this, 'pptx')">PPTX</button>
                        <button class="export-btn" onclick="exportMsg(this, 'pdf')">PDF</button>
                    </div>
                </div>` : ''}
            </div>
        </div>`;

    const contentEl = row.querySelector('.msg-content');
    if (isUser) {
        contentEl.innerHTML = content;
    } else {
        contentEl.innerHTML = formatAIContent(content);
        addCopyButtons(contentEl);
    }

    // Wire copy-all button
    const copyAllBtn = row.querySelector('.copy-all-btn');
    if (copyAllBtn) {
        copyAllBtn.onclick = () => {
            navigator.clipboard.writeText(content);
            copyAllBtn.textContent = '✓ Copié';
            setTimeout(() => copyAllBtn.textContent = 'Copier', 2000);
        };
    }

    chatMessages.appendChild(row);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return contentEl;
}

// ─── Export Message ───
async function exportMsg(btn, fmt) {
    const content = btn.closest('.msg-body').querySelector('.msg-content').innerText;
    try {
        const res = await fetch(`/api/export/${fmt}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
            body: JSON.stringify({ content, filename: 'liteai_reponse' })
        });
        if (!res.ok) { alert('Erreur export'); return; }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `liteai_reponse.${fmt}`;
        a.click(); URL.revokeObjectURL(url);
    } catch (e) { alert('Erreur: ' + e.message); }
}

// ─── File Upload ───
async function onFileSelected(input) {
    const file = input.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
        const res = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'X-API-Key': API_KEY },
            body: formData
        });
        const data = await res.json();
        if (data.error) { alert(data.error); return; }
        pendingFileContent = data.content;
        pendingFileName = data.filename;
        pendingFileType = data.type;
        document.getElementById('file-preview').style.display = 'block';
        if (data.type === 'image') {
            document.getElementById('file-name-display').textContent = data.filename;
            document.getElementById('file-icon').innerHTML = `<img src="${data.content}" style="width: 24px; height: 24px; object-fit: cover; border-radius: 4px;">`;
        } else {
            document.getElementById('file-name-display').textContent = `${data.filename} (${(data.chars / 1000).toFixed(1)}k chars)`;
            const ext = data.filename.split('.').pop().toLowerCase();
            document.getElementById('file-icon').textContent = ext === 'pdf' ? '📄' : ext === 'csv' || ext === 'xlsx' ? '📊' : '📝';
        }
    } catch (e) { alert('Erreur upload: ' + e.message); }
    input.value = '';
}

function clearFile() {
    pendingFileContent = null;
    pendingFileName = null;
    pendingFileType = null;
    document.getElementById('file-preview').style.display = 'none';
}

// ─── Web Search ───
function toggleWebSearch() {
    webSearchEnabled = !webSearchEnabled;
    const btn = document.getElementById('web-search-btn');
    if (webSearchEnabled) {
        btn.classList.add('active');
    } else {
        btn.classList.remove('active');
    }
}

// ─── Send Message ───
async function handleSend() {
    if (isStreaming) return;
    const text = userInput.value.trim();
    if (!text && !pendingFileContent) return;

    let message = text;
    let payloadFileType = null;
    let payloadFileContent = null;

    if (pendingFileContent) {
        if (pendingFileType === 'image') {
            message = text || 'Décris cette image.';
            payloadFileType = 'image';
            payloadFileContent = pendingFileContent;
            renderMessage('user', `<img src="${pendingFileContent}" style="max-width: 250px; border-radius: 8px; margin-bottom: 8px; display: block;"><br>${escapeHtml(message)}`);
        } else {
            const prefix = `[Fichier: ${pendingFileName}]\n\`\`\`\n${pendingFileContent}\n\`\`\`\n\n`;
            message = prefix + (text || 'Analyse ce fichier et résume son contenu.');
            renderMessage('user', `📎 ${escapeHtml(pendingFileName)}${text ? '<br>' + escapeHtml(text) : ''}`);
        }
        clearFile();
    } else {
        renderMessage('user', escapeHtml(text));
    }
    userInput.value = '';
    userInput.style.height = 'auto';

    const aiContentEl = renderMessage('assistant', '');
    aiContentEl.classList.add('typing-cursor');
    isStreaming = true;
    sendBtn.disabled = true;

    let fullResponse = '';
    try {
        const res = await fetch('/api/chat/stream', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
            body: JSON.stringify({ 
                message: message, 
                session_id: currentSessionId, 
                model: currentModel,
                file_type: payloadFileType,
                fileContent: payloadFileContent,
                web_search: webSearchEnabled
            })
        });
        const reader = res.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            for (const line of chunk.split('\n')) {
                if (!line.startsWith('data: ')) continue;
                const raw = line.slice(6).trim();
                if (raw === '[DONE]') { loadSessions(); break; }
                try {
                    const d = JSON.parse(raw);
                    if (d.session_id) currentSessionId = d.session_id;
                    if (d.content) {
                        fullResponse += d.content;
                        aiContentEl.innerHTML = formatAIContent(fullResponse);
                        addCopyButtons(aiContentEl);
                        chatMessages.scrollTop = chatMessages.scrollHeight;
                    }
                } catch (_) {}
            }
        }
    } catch (e) {
        aiContentEl.textContent = 'Erreur de connexion.';
    }

    aiContentEl.classList.remove('typing-cursor');
    isStreaming = false;
    sendBtn.disabled = false;
}

// ─── Sessions ───
async function loadSessions() {
    try {
        const res = await fetch('/api/sessions');
        const sessions = await res.json();
        sessionsList.innerHTML = '';
        sessions.forEach(s => {
            const div = document.createElement('div');
            div.className = `session-item${s.id === currentSessionId ? ' active' : ''}`;
            div.innerHTML = `
                <span class="session-item-text">${s.title || 'Nouvelle discussion'}</span>
                <span class="session-model-tag">${s.model_name || s.model}</span>
                <button class="session-del" onclick="deleteSession(event,'${s.id}')">✕</button>`;
            div.onclick = (e) => { if (!e.target.classList.contains('session-del')) loadHistory(s.id); };
            sessionsList.appendChild(div);
        });
    } catch (e) { console.error(e); }
}

async function loadHistory(id) {
    currentSessionId = id;
    chatMessages.innerHTML = '';
    try {
        const res = await fetch(`/api/history/${id}`);
        const data = await res.json();
        if (data.model) { currentModel = data.model; modelSelect.value = data.model; updateModelCtx(data.model); }
        data.messages.forEach(m => renderMessage(m.role, m.content, false));
    } catch (e) { console.error(e); }
    loadSessions();
}

async function deleteSession(e, id) {
    e.stopPropagation();
    if (!confirm('Supprimer cette conversation ?')) return;
    await fetch(`/api/sessions/${id}`, { method: 'DELETE' });
    if (id === currentSessionId) startNewChat();
    else loadSessions();
}

function startNewChat() {
    currentSessionId = null;
    chatMessages.innerHTML = '';
    const w = document.createElement('div');
    w.id = 'welcome-screen';
    w.className = 'welcome';
    w.innerHTML = document.getElementById('welcome-screen')?.innerHTML || `
        <div class="welcome-icon">✦</div>
        <h2>Comment puis-je vous aider ?</h2>
        <p>Posez-moi n'importe quelle question pour commencer.</p>`;
    chatMessages.appendChild(w);
    loadSessions();
    userInput.focus();
}

function fillInput(text) {
    userInput.value = text;
    userInput.focus();
    userInput.style.height = 'auto';
    userInput.style.height = userInput.scrollHeight + 'px';
}
