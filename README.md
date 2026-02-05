# 網頁分析代理人 (Gemini 版)

使用 GitHub Copilot SDK + **Gemini CLI** 開發的智能網頁分析代理人。透過 ACP (Agent Client Protocol) 協議，直接連接 Google Gemini，無需 GitHub Copilot 訂閱。

> **分支說明**: 此為 `gemini` 分支，使用 Gemini CLI 作為 AI 後端。若要使用 GitHub Copilot，請切換到 `main` 分支。

## 前置需求

### 1. 安裝 Gemini CLI

```bash
npm install -g @google/gemini-cli
```

### 2. 登入 Gemini

```bash
gemini
```

首次執行會引導你登入 Google 帳號並授權。

### 3. 驗證 Gemini CLI 正常運作

```bash
gemini --version
```

## 安裝專案

### 步驟 1: Clone 並安裝 ACP 版 Copilot SDK

由於官方 `@github/copilot-sdk` 尚未支援 ACP 協議，需要先安裝支援 ACP 的 fork 版本：

```bash
# Clone SDK (ACP 版本)
git clone https://github.com/yazelin/copilot-sdk.git
cd copilot-sdk/nodejs

# 安裝 SDK 依賴並建立全域連結
npm install
npm run build
npm link

cd ../..
```

### 步驟 2: Clone 並設定 Demo 專案

```bash
# Clone Demo 專案
git clone https://github.com/doggy8088/copilot-sdk-demo.git
cd copilot-sdk-demo

# 切換到 gemini 分支
git checkout gemini

# 安裝依賴
npm install

# 連結 ACP 版 SDK
npm link @github/copilot-sdk
```

### 驗證安裝

```bash
npm ls @github/copilot-sdk
# 應該顯示:
# copilot-demo@1.0.0
# └── @github/copilot-sdk@0.1.8 -> ./../copilot-sdk/nodejs
```

## 使用方式

### 基本用法

```bash
node webpage-analyzer-agent.js <網址>
```

### 範例

```bash
# 分析新聞文章
node webpage-analyzer-agent.js https://example.com

# 使用 npm script
npm start
```

## 功能特點

- **自動下載網頁** - 支援任何公開網址
- **智能內容提取** - 自動識別並提取網頁主要內容
- **AI 內容總結** - 使用 Gemini 生成精確摘要
- **多風格貼文生成** - 3 種不同風格的繁體中文臉書貼文
- **自動翻譯** - 將所有貼文翻譯為英文

## 程式碼說明

關鍵程式碼 - 初始化 Gemini 連線：

```javascript
import { CopilotClient } from "@github/copilot-sdk";

const client = new CopilotClient({
  cliPath: "gemini",                    // 使用 Gemini CLI
  cliArgs: ["--experimental-acp"],      // 啟用 ACP 模式
  protocol: "acp"                       // 使用 ACP 協議
});

await client.start();
const session = await client.createSession();

// 監聽串流回應
session.on((event) => {
  if (event.type === "assistant.message_delta") {
    process.stdout.write(event.data.deltaContent);
  }
});

// 發送訊息
await session.send({ prompt: "你好！" });
```

## 技術架構

| 項目 | 說明 |
|------|------|
| 語言 | JavaScript (ESM) |
| AI SDK | GitHub Copilot SDK (ACP fork) |
| AI 後端 | Google Gemini (via Gemini CLI) |
| 協議 | ACP (Agent Client Protocol) |
| 網頁抓取 | axios + cheerio |

## 輸出範例

程式會依序執行以下步驟：

1. 📥 下載網頁
2. 🔍 提取主要內容
3. 📊 生成內容摘要
4. ✍️ 生成 3 種風格繁體中文貼文
5. 🌐 翻譯成英文

## 疑難排解

### Gemini CLI 找不到

確認 Gemini CLI 已全域安裝：

```bash
which gemini
# 應該顯示路徑，如 /usr/local/bin/gemini
```

### 認證問題

重新登入 Gemini：

```bash
gemini auth logout
gemini
```

### SDK 連結問題

確認使用的是 ACP 版 SDK：

```bash
npm ls @github/copilot-sdk
```

如果沒有顯示連結到 `copilot-sdk/nodejs`，重新連結：

```bash
# 在 copilot-sdk/nodejs 目錄
npm link

# 在 demo 專案目錄
npm link @github/copilot-sdk
```

### "protocol" 選項無效

這表示使用的是官方版 SDK，而非 ACP fork 版本。請確認：

1. 已 clone yazelin/copilot-sdk
2. 已執行 `npm link` 建立連結
3. 已在 demo 專案執行 `npm link @github/copilot-sdk`

## ACP 版 SDK 新增功能

此 fork 版本相較官方版新增了：

| 功能 | 說明 |
|------|------|
| `protocol: "acp"` | 啟用 ACP 協議模式 |
| Gemini CLI 支援 | 完整支援 `gemini --experimental-acp` |
| Tool calls | 工具呼叫事件 (`tool.execution_start/complete`) |
| Permission requests | 權限請求處理 |
| NDJSON transport | ACP 協議的傳輸層實作 |

> 追蹤官方合併進度：[PR #379](https://github.com/github/copilot-sdk/pull/379)

## 系統需求

- Node.js 18+
- Gemini CLI (已認證)
- 網路連線

## 相關連結

- [Gemini CLI](https://github.com/google-gemini/gemini-cli)
- [ACP 協議規範](https://agentclientprotocol.com/)
- [Copilot SDK ACP 支援 PR](https://github.com/github/copilot-sdk/pull/379)
- [Copilot SDK ACP Fork](https://github.com/yazelin/copilot-sdk)

## 授權

MIT License

## 作者

Will 保哥 <doggy.huang@gmail.com>
