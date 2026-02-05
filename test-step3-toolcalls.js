/**
 * 步驟 3: Tool Calls 事件測試
 * - tool.execution_start 事件
 * - tool.execution_complete 事件
 */

import { CopilotClient } from "@github/copilot-sdk";

console.log("=== 步驟 3: Tool Calls 測試 ===\n");

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
  console.log("✅ Session 建立成功:", session.sessionId, "\n");

  // 追蹤事件
  let idleReceived = false;
  const toolEvents = [];
  let responseText = "";

  session.on((event) => {
    if (event.type === "assistant.message_delta") {
      responseText += event.data.deltaContent || "";
    } else if (event.type === "tool.execution_start") {
      console.log("   🔧 Tool 開始:", event.data.toolName);
      toolEvents.push({ type: "start", ...event.data });
    } else if (event.type === "tool.execution_complete") {
      console.log("   ✅ Tool 完成:", event.data.toolCallId, event.data.success ? "成功" : "失敗");
      toolEvents.push({ type: "complete", ...event.data });
    } else if (event.type === "session.idle") {
      idleReceived = true;
    }
  });

  // 發送會觸發 tool call 的訊息
  const prompt = "請讀取 package.json 檔案，只告訴我 name 欄位的值是什麼";
  console.log("發送:", prompt);
  console.log("");

  await session.send({ prompt });

  // 等待 idle
  const timeout = 60000;
  const start = Date.now();
  while (!idleReceived && Date.now() - start < timeout) {
    await new Promise(r => setTimeout(r, 100));
  }

  if (!idleReceived) {
    throw new Error("等待 idle 超時");
  }

  console.log("\n結果:");
  console.log("   - Tool 事件數:", toolEvents.length);
  console.log("   - Tool start:", toolEvents.filter(e => e.type === "start").length);
  console.log("   - Tool complete:", toolEvents.filter(e => e.type === "complete").length);
  console.log("   - 回應:", responseText.trim().slice(0, 100));

  if (toolEvents.length > 0) {
    console.log("\n   ✅ Tool calls 正常運作");
  } else {
    console.log("\n   ⚠️  沒有收到 tool 事件 (Gemini 可能直接回答)");
  }

  await client.stop();
  console.log("\n=== 步驟 3 測試完成 ===");

} catch (error) {
  console.error("❌ 測試失敗:", error.message);
  await client.forceStop();
  process.exit(1);
}
