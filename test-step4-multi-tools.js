/**
 * 步驟 4: 多重 Tool Calls 測試
 * - 觸發多個 tool 呼叫
 */

import { CopilotClient } from "@github/copilot-sdk";

console.log("=== 步驟 4: 多重 Tool Calls 測試 ===\n");

const client = new CopilotClient({
  cliPath: "gemini",
  cliArgs: ["--experimental-acp"],
  protocol: "acp",
  autoStart: false,
});

try {
  await client.start();
  console.log("✅ Client 啟動成功\n");

  const session = await client.createSession({
    workingDirectory: process.cwd(),
  });
  console.log("✅ Session 建立成功\n");

  // 追蹤事件
  let idleReceived = false;
  const toolStarts = [];
  const toolCompletes = [];

  session.on((event) => {
    if (event.type === "tool.execution_start") {
      console.log("   🔧 Tool 開始:", event.data.toolName);
      toolStarts.push(event.data);
    } else if (event.type === "tool.execution_complete") {
      console.log("   ✅ Tool 完成:", event.data.success ? "成功" : "失敗");
      toolCompletes.push(event.data);
    } else if (event.type === "session.idle") {
      idleReceived = true;
    }
  });

  // 發送會觸發多個 tool calls 的訊息
  const prompt = "列出當前目錄的檔案，然後讀取 README.md 的前 3 行。簡短回答。";
  console.log("發送:", prompt);
  console.log("");

  await session.send({ prompt });

  // 等待 idle
  const timeout = 90000;
  const start = Date.now();
  while (!idleReceived && Date.now() - start < timeout) {
    await new Promise(r => setTimeout(r, 100));
  }

  if (!idleReceived) {
    throw new Error("等待 idle 超時");
  }

  console.log("\n結果:");
  console.log("   - Tool starts:", toolStarts.length);
  console.log("   - Tool completes:", toolCompletes.length);
  console.log("   - 工具名稱:", [...new Set(toolStarts.map(t => t.toolName))].join(", "));

  if (toolStarts.length >= 2) {
    console.log("\n   ✅ 多重 Tool calls 正常運作");
  } else if (toolStarts.length === 1) {
    console.log("\n   ⚠️  只觸發 1 個 tool (可能 Gemini 合併處理)");
  } else {
    console.log("\n   ⚠️  沒有收到 tool 事件");
  }

  await client.stop();
  console.log("\n=== 步驟 4 測試完成 ===");
  process.exit(0);

} catch (error) {
  console.error("❌ 測試失敗:", error.message);
  await client.forceStop();
  process.exit(1);
}
