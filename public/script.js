/* ===== State ===== */
const HISTORY_KEY = 'ai-chatbot-history';
const THEME_KEY = 'ai-chatbot-theme';
const TITLE_KEY = 'ai-chatbot-title';
let messages = [];
let isStreaming = false;
let streamContent = '';

/* ===== DOM refs ===== */
const chatBox = document.getElementById('chat-box');
const form = document.getElementById('chat-form');
const input = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const clearBtn = document.getElementById('clear-btn');
const loadingBar = document.getElementById('loading-bar');
const themeBtn = document.getElementById('theme-btn');
const titleEl = document.getElementById('conversation-title');
const hljsTheme = document.getElementById('hljs-theme');

/* ===== Init ===== */
initTheme();
loadHistory();
scrollToBottom();

/* ===== Events ===== */
form.addEventListener('submit', handleSubmit);
input.addEventListener('input', autoResize);
input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    form.dispatchEvent(new Event('submit'));
  }
});
input.addEventListener('input', toggleSendButton);
clearBtn.addEventListener('click', clearChat);
themeBtn.addEventListener('click', toggleTheme);
titleEl.addEventListener('click', startEditTitle);
titleEl.addEventListener('blur', finishEditTitle);
titleEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); titleEl.blur(); }
  if (e.key === 'Escape') { titleEl.blur(); loadTitle(); }
});

/* ===== Theme ===== */
function initTheme() {
  const saved = localStorage.getItem(THEME_KEY) || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  updateHljsTheme(saved);
}

function toggleTheme() {
  const cur = document.documentElement.getAttribute('data-theme');
  const next = cur === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem(THEME_KEY, next);
  updateHljsTheme(next);
}

function updateHljsTheme(theme) {
  const map = { dark: 'github-dark', light: 'github' };
  hljsTheme.href = `https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/${map[theme] || 'github-dark'}.min.css`;
}

/* ===== Title ===== */
function loadTitle() {
  const title = localStorage.getItem(TITLE_KEY) || '';
  if (title) {
    titleEl.textContent = title;
    titleEl.classList.remove('hidden');
  } else {
    titleEl.textContent = '';
    titleEl.classList.add('hidden');
  }
}

function saveTitle(title) {
  localStorage.setItem(TITLE_KEY, title);
}

function generateTitle(text) {
  // Take first meaningful line, up to 28 chars
  let t = text.replace(/^["""'"「『]+/, '').trim();
  if (t.length > 28) t = t.slice(0, 26) + '...';
  return t;
}

function startEditTitle() {
  if (!titleEl.textContent) return;
  titleEl.contentEditable = 'true';
  titleEl.classList.add('editing');
  // Select all text
  const range = document.createRange();
  range.selectNodeContents(titleEl);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
}

function finishEditTitle() {
  titleEl.contentEditable = 'false';
  titleEl.classList.remove('editing');
  const val = titleEl.textContent.trim();
  if (val) {
    saveTitle(val);
  } else {
    loadTitle(); // restore
  }
}

/* ===== Auto resize ===== */
function autoResize() {
  input.style.height = 'auto';
  input.style.height = Math.min(input.scrollHeight, 200) + 'px';
}

/* ===== Toggle send button ===== */
function toggleSendButton() {
  sendBtn.disabled = !input.value.trim() || isStreaming;
}

/* ===== Load / Save history ===== */
function loadHistory() {
  try {
    const saved = localStorage.getItem(HISTORY_KEY);
    if (saved) {
      messages = JSON.parse(saved);
      renderAllMessages();
      loadTitle();
      if (messages.length > 0) {
        document.querySelector('.welcome')?.remove();
      }
    }
  } catch {
    messages = [];
  }
}

function saveHistory() {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(messages));
  } catch {}
}

/* ===== Render ===== */
function renderAllMessages() {
  document.querySelector('.welcome')?.remove();
  document.querySelectorAll('.message').forEach((el) => el.remove());
  for (const msg of messages) {
    appendMessage(msg.role, msg.content, false);
  }
}

function appendMessage(role, content, save = true) {
  const welcome = document.querySelector('.welcome');
  if (welcome) welcome.remove();

  const div = document.createElement('div');
  div.className = `message ${role}`;
  div.dataset.role = role;

  const avatarLabel = role === 'user' ? 'U' : 'AI';
  div.innerHTML = `
    <div class="avatar ${role}">${avatarLabel}</div>
    <div class="msg-body">
      <div class="msg-role">${role === 'user' ? 'あなた' : 'AI'}</div>
      <div class="msg-content">${renderContent(content)}</div>
    </div>
  `;

  chatBox.appendChild(div);
  scrollToBottom();

  if (save && role === 'user') {
    // Generate title from first user message
    if (messages.length === 0) {
      const t = generateTitle(content);
      titleEl.textContent = t;
      titleEl.classList.remove('hidden');
      saveTitle(t);
    }
    messages.push({ role, content });
    saveHistory();
  }

  return div;
}

function renderContent(content) {
  if (!content) return '';
  const html = marked.parse(content, { breaks: true });
  const container = document.createElement('div');
  container.innerHTML = html;
  container.querySelectorAll('pre code').forEach((block) => {
    hljs.highlightElement(block);
  });
  return container.innerHTML;
}

/* ===== Streaming ===== */
function updateAiMessage(content, done = false) {
  streamContent += content;

  let msgEl = document.querySelector('.message[data-streaming="true"]');

  if (!msgEl) {
    msgEl = document.createElement('div');
    msgEl.className = 'message assistant';
    msgEl.dataset.role = 'assistant';
    msgEl.dataset.streaming = 'true';
    msgEl.innerHTML = `
      <div class="avatar assistant">AI</div>
      <div class="msg-body">
        <div class="msg-role">AI</div>
        <div class="msg-content"></div>
      </div>
    `;
    chatBox.appendChild(msgEl);
  }

  const contentEl = msgEl.querySelector('.msg-content');
  contentEl.innerHTML = renderContent(streamContent);
  scrollToBottom();

  if (done) {
    delete msgEl.dataset.streaming;
    messages.push({ role: 'assistant', content: streamContent });
    saveHistory();
    streamContent = '';
  }
}

/* ===== Submit ===== */
async function handleSubmit(e) {
  e.preventDefault();
  const text = input.value.trim();
  if (!text || isStreaming) return;

  input.value = '';
  input.style.height = 'auto';
  sendBtn.disabled = true;

  appendMessage('user', text, true);

  isStreaming = true;
  streamContent = '';
  loadingBar.classList.remove('hidden');
  toggleSendButton();

  try {
    const history = messages.slice(0, -1);
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, history }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Request failed' }));
      showError(err.error || `HTTP ${response.status}`);
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;
        const payload = trimmed.slice(5).trim();
        if (!payload) continue;

        try {
          const data = JSON.parse(payload);
          if (data.content) updateAiMessage(data.content);
          if (data.error && !data.content) showError(data.error);
        } catch {}
      }
    }

    if (streamContent) updateAiMessage('', true);
  } catch (err) {
    if (streamContent) {
      updateAiMessage('', true);
    } else {
      showError('ネットワーク接続に失敗しました。サーバーが起動しているか確認してください');
    }
  } finally {
    isStreaming = false;
    loadingBar.classList.add('hidden');
    toggleSendButton();
    input.focus();
  }
}

/* ===== Error ===== */
function showError(msg) {
  const div = document.createElement('div');
  div.className = 'message error';
  div.innerHTML = `
    <div class="avatar assistant">AI</div>
    <div class="msg-body">
      <div class="msg-role">エラー</div>
      <div class="msg-content"><p>${escapeHtml(msg)}</p></div>
    </div>
  `;
  chatBox.appendChild(div);
  scrollToBottom();
}

/* ===== Clear chat ===== */
function clearChat() {
  if (isStreaming) return;
  if (messages.length === 0) return;
  if (!confirm('チャット履歴をすべて削除しますか？')) return;

  messages = [];
  localStorage.removeItem(HISTORY_KEY);
  localStorage.removeItem(TITLE_KEY);
  document.querySelectorAll('.message').forEach((el) => el.remove());

  // Reset title
  titleEl.textContent = '';
  titleEl.classList.add('hidden');

  // Re-add welcome
  const welcome = document.createElement('div');
  welcome.className = 'welcome';
  welcome.innerHTML = `
    <div class="welcome-icon">🤖</div>
    <h2>どのようなご用件ですか？</h2>
    <p class="welcome-hint">質問を入力してください。Markdownとコードハイライトに対応しています</p>
  `;
  chatBox.appendChild(welcome);

  showToast('チャット履歴を削除しました');
}

/* ===== Toast ===== */
function showToast(msg) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);

  setTimeout(() => {
    el.classList.add('fade-out');
    setTimeout(() => el.remove(), 300);
  }, 2000);
}

/* ===== Scroll ===== */
function scrollToBottom() {
  requestAnimationFrame(() => {
    chatBox.scrollTop = chatBox.scrollHeight;
  });
}

/* ===== Utils ===== */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
