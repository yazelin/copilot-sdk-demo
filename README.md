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

### 為什麼需要 npm link？

官方 `@github/copilot-sdk` 尚未支援 ACP 協議，我們需要使用 fork 版本。但由於 SDK 位於 monorepo 的子目錄 (`nodejs/`)，npm 無法直接從 GitHub 安裝，因此使用 `npm link` 建立本地符號連結。

### 步驟 1: Clone 並安裝 ACP 版 Copilot SDK

```bash
# Clone SDK (ACP 版本)
git clone https://github.com/yazelin/copilot-sdk.git
cd copilot-sdk/nodejs

# 安裝依賴
npm install

# 編譯 TypeScript
npm run build

# 建立全域符號連結
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

# 連結到本地 ACP 版 SDK (取代 npm registry 的官方版)
npm link @github/copilot-sdk
```

### 驗證安裝

```bash
npm ls @github/copilot-sdk
```

**正確結果 (有箭頭 `->` 表示符號連結)：**
```
copilot-demo@1.0.0
└── @github/copilot-sdk@0.1.8 -> ./../copilot-sdk/nodejs
                                 ↑ 這個箭頭表示連結到本地 fork 版本
```

**錯誤結果 (沒有箭頭，使用官方版)：**
```
copilot-demo@1.0.0
└── @github/copilot-sdk@0.1.19
                        ↑ 沒有箭頭，是從 npm registry 安裝的官方版，不支援 ACP
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

如果找不到，重新安裝：

```bash
npm install -g @google/gemini-cli
```

### 認證問題

重新登入 Gemini：

```bash
gemini auth logout
gemini
```

### SDK 連結問題 (npm link 詳解)

#### npm link 運作原理

```
┌─────────────────────────────────────────────────────────────┐
│  步驟 1: npm link (在 SDK 目錄執行)                          │
│                                                              │
│  copilot-sdk/nodejs/                                         │
│       │                                                      │
│       └──► 建立全域符號連結                                   │
│            {global}/node_modules/@github/copilot-sdk         │
│                          ↓                                   │
│                    指向這個目錄                               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  步驟 2: npm link @github/copilot-sdk (在 Demo 目錄執行)     │
│                                                              │
│  copilot-sdk-demo/node_modules/@github/copilot-sdk          │
│       │                                                      │
│       └──► 連結到全域符號連結                                 │
│            → {global}/node_modules/@github/copilot-sdk       │
│            → copilot-sdk/nodejs/  (最終指向)                 │
└─────────────────────────────────────────────────────────────┘
```

#### 確認連結狀態

```bash
npm ls @github/copilot-sdk
```

#### 常見問題與解決方案

| 問題 | 原因 | 解決方案 |
|------|------|----------|
| `npm link` 失敗 | 沒有先編譯 | 先執行 `npm install` 和 `npm run build` |
| 連結後還是用官方版 | `npm install` 會覆蓋連結 | 每次 `npm install` 後要重新執行 `npm link @github/copilot-sdk` |
| `protocol` 選項無效 | 連結到官方版 | 確認 `npm ls` 有顯示 `->` 箭頭 |
| 找不到模組 | SDK 沒有編譯 | 在 SDK 目錄執行 `npm run build` |

#### 重新建立連結

如果遇到問題，完整重新連結：

```bash
# 1. 在 SDK 目錄重新建立全域連結
cd copilot-sdk/nodejs
npm install
npm run build
npm link

# 2. 在 Demo 目錄重新連結
cd ../../copilot-sdk-demo
npm link @github/copilot-sdk

# 3. 驗證
npm ls @github/copilot-sdk
# 確認有 -> 箭頭指向本地路徑
```

### "protocol" 選項無效

錯誤訊息類似：
```
TypeError: "protocol" is not a valid option
```

這表示使用的是官方版 SDK (不支援 ACP)，而非 fork 版本。

**解決方案：**

1. 確認已 clone `yazelin/copilot-sdk`
2. 確認已在 SDK 目錄執行 `npm link`
3. 確認已在 Demo 目錄執行 `npm link @github/copilot-sdk`
4. 用 `npm ls @github/copilot-sdk` 驗證有 `->` 箭頭

## ACP 協議支援狀態

此 fork 版本實作了 ACP (Agent Client Protocol) 的部分功能。以下是完整的支援狀態：

### Client → Agent (SDK 發送給 Gemini)

| ACP Method | 功能 | 狀態 |
|------------|------|------|
| `initialize` | 版本協商、能力交換 | ✅ 已實作 (via `ping`) |
| `session/new` | 建立會話 | ✅ 已實作 |
| `session/prompt` | 發送訊息 | ✅ 已實作 |
| `session/cancel` | 取消操作 | ⚠️ 部分 (有 `session/abort`) |
| `authenticate` | 認證 | ❌ 未實作 |
| `session/load` | 載入現有會話 | ❌ 未實作 |
| `session/set_mode` | 切換模式 | ❌ 未實作 |

### Agent → Client (Gemini 請求 SDK)

| ACP Method | 功能 | 狀態 |
|------------|------|------|
| `session/request_permission` | 權限請求 | ✅ 已實作 |
| `fs/read_text_file` | 讀取檔案 | ❌ 未實作 |
| `fs/write_text_file` | 寫入檔案 | ❌ 未實作 |
| `terminal/create` | 建立終端機 | ❌ 未實作 |
| `terminal/output` | 取得終端輸出 | ❌ 未實作 |
| `terminal/release` | 釋放終端機 | ❌ 未實作 |
| `terminal/wait_for_exit` | 等待終端完成 | ❌ 未實作 |
| `terminal/kill` | 終止終端 | ❌ 未實作 |

### Notifications (Gemini → SDK)

| ACP Notification | 功能 | 狀態 |
|------------------|------|------|
| `session/update` - `agent_message_chunk` | 串流文字 | ✅ 已實作 |
| `session/update` - `agent_thought_chunk` | 串流思考 | ✅ 已實作 |
| `session/update` - `agent_message` | 完整訊息 | ✅ 已實作 |
| `session/update` - `end_turn` | 回合結束 | ✅ 已實作 |
| `session/update` - `error` | 錯誤 | ✅ 已實作 |
| `session/update` - `tool_call` | 工具呼叫開始 | ✅ 已實作 |
| `session/update` - `tool_call_update` | 工具呼叫更新 | ✅ 已實作 |

### SDK 語言支援

| 語言 | 狀態 |
|------|------|
| TypeScript/Node.js | ✅ 已實作 |
| Python | ❌ 未實作 |
| Go | ❌ 未實作 |
| .NET | ❌ 未實作 |

### 可透過 CLI 參數使用的功能

以下功能雖然 ACP 協議沒有定義，但可以透過 Gemini CLI 的命令列參數使用：

| 功能 | 官方 SDK | Gemini CLI 參數 | 使用方式 |
|------|----------|-----------------|----------|
| 選擇模型 | `model` | `--model` | `cliArgs: ["--model", "gemini-2.5-flash"]` |
| 恢復 Session | `resumeSession()` | `--resume` | `cliArgs: ["--resume", "latest"]` |
| 自動批准模式 | - | `--approval-mode` | `cliArgs: ["--approval-mode", "auto_edit"]` |
| YOLO 模式 | - | `--yolo` | `cliArgs: ["--yolo"]` |
| 允許的工具 | `availableTools` | `--allowed-tools` | `cliArgs: ["--allowed-tools", "Read", "Write"]` |
| 沙箱模式 | - | `--sandbox` | `cliArgs: ["--sandbox"]` |
| 額外目錄 | - | `--include-directories` | `cliArgs: ["--include-directories", "/path"]` |
| MCP Servers | - | `--allowed-mcp-server-names` | `cliArgs: ["--allowed-mcp-server-names", "server1"]` |

#### 範例：使用多個 CLI 參數

```javascript
const client = new CopilotClient({
  cliPath: "gemini",
  cliArgs: [
    "--experimental-acp",
    "--model", "gemini-2.5-flash",
    "--approval-mode", "auto_edit",
    "--allowed-tools", "Read", "Write", "Bash"
  ],
  protocol: "acp"
});
```

#### MCP Servers 設定

MCP Servers 需要先用 Gemini CLI 預先設定，然後在 ACP 模式中過濾使用：

```bash
# 1. 先設定 MCP Server
gemini mcp add my-server npx -y @anthropic/my-mcp-server

# 2. 查看已設定的 servers
gemini mcp list

# 3. 在 ACP 模式中指定要使用的 servers
```

```javascript
const client = new CopilotClient({
  cliPath: "gemini",
  cliArgs: [
    "--experimental-acp",
    "--allowed-mcp-server-names", "my-server"
  ],
  protocol: "acp"
});
```

#### Approval Mode 選項

| 模式 | 說明 |
|------|------|
| `default` | 預設，每次操作都詢問 |
| `auto_edit` | 自動批准編輯操作 |
| `yolo` | 自動批准所有操作 (危險!) |
| `plan` | 唯讀模式 |

> 追蹤官方合併進度：[PR #379](https://github.com/github/copilot-sdk/pull/379)

## 測試套件

本專案包含完整的 SDK + ACP 功能測試，可驗證 Gemini CLI 整合是否正常運作：

```bash
# 執行單一測試
node test-step1-connection.js

# 執行所有測試
for f in test-step*.js; do echo "=== $f ===" && node "$f" && echo; done
```

### 測試清單

| 測試檔案 | 功能 | 說明 |
|----------|------|------|
| `test-step1-connection.js` | 連線測試 | 驗證 Client 與 Gemini CLI 連線 |
| `test-step2-session.js` | Session 建立 | 建立會話並發送訊息 |
| `test-step3-toolcalls.js` | Tool 呼叫 | 單一工具執行 |
| `test-step4-multi-tools.js` | 多工具呼叫 | 多個工具連續執行 |
| `test-step5-errors.js` | 錯誤處理 | 錯誤訊息正確傳遞 |
| `test-step6-multiturn.js` | 多輪對話 | 上下文記憶測試 |
| `test-step7-cliargs.js` | CLI 參數 | `--model`, `--approval-mode` 等參數 |
| `test-step8-reasoning.js` | 思考過程 | `assistant.reasoning_delta` 事件 |
| `test-step9-abort.js` | 中斷請求 | `session.abort()` (Gemini 不支援) |
| `test-step10-permission.js` | 權限請求 | `permission.request` 事件 |
| `test-step11-workdir.js` | 工作目錄 | `workingDirectory` 參數傳遞 |
| `test-step12-multi-session.js` | 多 Session | 同時多個獨立會話 |
| `test-step13-mcp.js` | MCP Servers | `mcpServers` 參數傳遞 |
| `test-step14-sendandwait.js` | sendAndWait | 便利方法自動等待 idle |
| `test-step15-destroy.js` | Session Destroy | 明確銷毀 session |
| `test-step16-typed-events.js` | Typed Events | `on("event.type", handler)` 語法 |

### Claude Code ACP 測試

除了 Gemini CLI，SDK 也通過了 [Claude Code ACP](https://pypi.org/project/claude-code-acp/) 的整合測試：

| 測試檔案 | 功能 | 說明 |
|----------|------|------|
| `test-claude-acp.js` | Claude ACP 整合 | 連線、sendAndWait、多輪對話 |

> 需要先安裝：`pip install claude-code-acp`，並完成 Claude 登入 (`claude /login`)

**Gemini vs Claude ACP 行為差異：**

| 行為 | Gemini CLI | Claude Code ACP |
|------|-----------|-----------------|
| `assistant.message_delta` | ✅ | ✅ |
| `assistant.message` (完整訊息) | ❌ SDK 合成 | ✅ 原生發送 |
| `session.idle` | ❌ SDK 合成 | ✅ 原生發送 |
| `session.abort` | ❌ 不支援 | 未測試 |
| `permission.request` | ❌ 自動批准 | 未測試 |

### 測試結果

所有測試皆已通過 ✅ (部分功能 Gemini CLI 不支援，但 SDK 正確處理)

## 系統需求

- Node.js 18+
- Gemini CLI (已認證)
- 網路連線

> ⚠️ 目前只在 **Ubuntu** 測試過，Windows / macOS 尚未測試，歡迎回報問題。

## 相關連結

- [Gemini CLI](https://github.com/google-gemini/gemini-cli)
- [ACP 協議規範](https://agentclientprotocol.com/)
- [Copilot SDK ACP 支援 PR](https://github.com/github/copilot-sdk/pull/379)
- [Copilot SDK ACP Fork](https://github.com/yazelin/copilot-sdk)

## 授權

MIT License

## 作者

Will 保哥 <doggy.huang@gmail.com>
