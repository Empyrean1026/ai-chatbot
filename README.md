# AI Chatbot
     
  DeepSeek API を使用したシンプルな AI チャットボット Web
  アプリケーションです。ChatGPT のようなストリーミング対話体験を提供します。

  ## デモ

  ![デモ](https://img.shields.io/badge/theme-dark%20%7C%20light-19c37d)
  ![ライセンス](https://img.shields.io/badge/license-MIT-blue)

  ## 機能

  - 🚀 **ストリーミング応答** — SSE（Server-Sent Events）による逐次表示
  - 💬 **連続対話** — コンテキストを保持した複数ターンの会話
  - 📝 **Markdown 対応** — 見出し・リスト・表・引用などを美しくレンダリング
  - 💻 **コードハイライト** — `highlight.js` によるシンタックスハイライト
  - 🌗 **ダーク/ライトテーマ** — ワンクリックで切り替え可能
  - 📱 **レスポンシブ対応** — PC・タブレット・スマートフォンに最適化
  - 💾 **自動保存** — チャット履歴を `localStorage` に保存
  - ✏️  **会話タイトル** — 最初のメッセージから自動生成（クリックで編集可）
  - ⚡ **軽量設計** — フレームワーク不使用、Vanilla JS + Node.js + Express のみ

  ## 技術スタック

  ### フロントエンド
  - HTML5 / CSS3 / Vanilla JavaScript
  - [marked.js](https://marked.js.org/) — Markdown パース
  - [highlight.js](https://highlightjs.org/) — コードハイライト

  ### バックエンド
  - [Node.js](https://nodejs.org/) + [Express](https://expressjs.com/)
  - [dotenv](https://github.com/motdotla/dotenv) — 環境変数管理
  - ネイティブ `fetch` API によるストリーミングリクエスト

  ### 外部 API
  - [DeepSeek API](https://platform.deepseek.com/) — AI 対話生成

  ## アーキテクチャ

  ブラウザ                 Node.js サーバー            DeepSeek API
     │                         │                         │
     │  POST /api/chat         │                         │
     │  {message, history}     │                         │
     │ ──────────────────────▶ │                         │
     │                         │  POST /chat/completions  │
     │                         │  (stream: true)          │
     │                         │ ──────────────────────▶ │
     │                         │                         │
     │  SSE (text/event-stream)│  ストリーミングチャンク   │
     │ ◀────────────────────── │ ◀────────────────────── │
     │                         │                         │
     │  リアルタイム Markdown レンダリング                   │

  - **API キーはサーバー側のみ**で保持し、フロントエンドには一切露出しません
  - フロントエンドは自前のバックエンド `/api/chat` にのみリクエストを送信します

  ## プロジェクト構造

  ai-chatbot/
  ├── .env                # API キーとポート設定
  ├── package.json        # 依存パッケージ管理
  ├── server.js           # Express サーバー + DeepSeek API プロキシ
  └── public/
      ├── index.html      # ページ構造
      ├── style.css       # ダーク/ライトテーマ + レスポンシブスタイル
      └── script.js       # フロントエンドロジック

  ## クイックスタート

  ### 前提条件

  - [Node.js](https://nodejs.org/) v18 以上
  - [DeepSeek API キー](https://platform.deepseek.com/api_keys)

  ### インストール

  ```bash
  # リポジトリをクローン
  git clone https://github.com/your-username/ai-chatbot.git
  cd ai-chatbot

  # 依存パッケージをインストール
  npm install

  # .env ファイルを編集し、API キーを設定
  # DEEPSEEK_API_KEY=sk-your-api-key-here
  # PORT=3000

  起動
  
  # 通常起動
  npm start

  # 開発モード（ファイル変更時に自動再起動）
  npm run dev

  ブラウザで http://localhost:3000 を開きます。

  サーバーへのデプロイ

  前提条件

  - Ubuntu サーバー（パブリック IP あり）
  - サーバーのセキュリティグループ/ファイアウォールで TCP 3000 ポートを開放

  手順

  # 1. サーバーに接続
  ssh root@<あなたのパブリックIP>

  # 2. Node.js をインストール
  apt update && apt install nodejs npm -y

  # 3. プロジェクトをアップロード（ローカル Mac で実行）
  scp -r ~/Desktop/ai-chatbot root@<パブリックIP>:/root/ai-chatbot

  # 4. サーバー上で依存パッケージをインストール
  cd /root/ai-chatbot
  npm install

  # 5. API キーを設定
  nano .env

  # 6. 全インターフェースでリッスンするよう変更
  sed -i "s/app.listen(PORT, () => {/app.listen(PORT, '0.0.0.0', () => {/"
  server.js

  # 7. PM2 で永続化
  npm install -g pm2
  pm2 start server.js
  pm2 startup && pm2 save

  # 8. ファイアウォールを設定
  ufw allow 3000 && ufw enable

  ブラウザで http://<パブリックIP>:3000 を開くとチャットボットが利用可能です。

  PM2 管理コマンド

  pm2 status          # ステータス確認
  pm2 logs server     # ログ表示
  pm2 restart server  # 再起動
  pm2 stop server     # 停止

  環境変数

  ┌──────────────────┬───────────────────────────┬──────────────┐
  │      変数名      │           説明            │ デフォルト値 │
  ├──────────────────┼───────────────────────────┼──────────────┤
  │ DEEPSEEK_API_KEY │ DeepSeek API キー（必須） │ —            │
  ├──────────────────┼───────────────────────────┼──────────────┤
  │ PORT             │ サーバーポート            │ 3000         │
  └──────────────────┴───────────────────────────┴──────────────┘

  API リファレンス

  POST /api/chat

  チャットメッセージを送信し、ストリーミング応答を返します。

  リクエストボディ:

  {
    "message": "こんにちは",
    "history": [
      { "role": "user", "content": "前回のメッセージ" },
      { "role": "assistant", "content": "前回の応答" }
    ]
  }

  レスポンス: text/event-stream (SSE)

  data: {"content":"こんにちは"}
  data: {"content":"！"}
  data: {"content":"お手伝い"}
  data: {"content":"できることは"}
  ...
  data: {"done":true}

  エラー時:

  data: {"error":"エラーメッセージ"}

  ライセンス

  MIT © 2025

  ---

  上記をコピーして、GitHub のリポジトリに `README.md`
  として貼り付けてください。リポジトリ URL は `your-username` の部分を自分の
  GitHub ユーザー名に置き換えてください。
