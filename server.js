require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.DEEPSEEK_API_KEY;
const API_URL = 'https://api.deepseek.com/chat/completions';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const SYSTEM_PROMPT = {
  role: 'system',
  content: 'あなたは親切なAIアシスタントです。ユーザーが話している言語で応答してください。',
};

app.post('/api/chat', async (req, res) => {
  const { message, history = [] } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Message is required' });
  }

  if (!API_KEY || API_KEY === 'your_deepseek_api_key_here') {
    return res.status(500).json({ error: 'API key not configured.' });
  }

  const messages = [SYSTEM_PROMPT, ...history, { role: 'user', content: message }];

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  const controller = new AbortController();
  let timedOut = false;
  let ended = false;

  const end = (data) => {
    if (ended) return;
    ended = true;
    if (data) res.write(`data: ${JSON.stringify(data)}\n\n`);
    res.end();
  };

  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, 30000);

  res.on('close', () => {
    controller.abort();
  });

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages,
        stream: true,
        temperature: 0.7,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      let detail = `API error (${response.status})`;
      try { const e = JSON.parse(errBody); detail = e.error?.message || detail; } catch {}
      end({ error: detail });
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
        if (payload === '[DONE]') continue;

        try {
          const parsed = JSON.parse(payload);
          const content = parsed.choices?.[0]?.delta?.content || '';
          if (content) {
            if (!res.destroyed) {
              res.write(`data: ${JSON.stringify({ content })}\n\n`);
            }
          }
        } catch {
          // skip malformed chunks
        }
      }
    }

    end({ done: true });
  } catch (err) {
    if (!res.destroyed) {
      if (err.name === 'AbortError') {
        end({ error: timedOut ? 'Request timed out' : 'Connection closed' });
      } else {
        end({ error: err.message });
      }
    }
  } finally {
    clearTimeout(timeout);
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  if (!API_KEY || API_KEY === 'your_deepseek_api_key_here') {
    console.warn('WARNING: DEEPSEEK_API_KEY is not set in .env');
  }
});
