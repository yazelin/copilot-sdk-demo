/**
 * 步驟 8: Reasoning Delta 測試
 * - assistant.reasoning_delta 事件（AI 思考過程）
 * - 從 ACP 的 agent_thought_chunk 映射而來
 */

import { CopilotClient } from "@github/copilot-sdk";

console.log("=== 步驟 8: Reasoning Delta 測試 ===\n");

const client = new CopilotClient({
  cliPath: "gemini",
  cliArgs: ["--experimental-acp"],
  protocol: "acp",
  autoStart: false,
});

async function waitForIdle(session, timeout = 60000) {
  return new Promise((resolve, reject) => {
    let unsubscribe;
    const timer = setTimeout(() => {
      if (unsubscribe) unsubscribe();
      reject(new Error("等待 idle 超時"));
    }, timeout);
    unsubscribe = session.on((event) => {
      if (event.type === "session.idle") {
        clearTimeout(timer);
        if (unsubscribe) unsubscribe();
        resolve();
      }
    });
  });
}

try {
  await client.start();
  console.log("✅ Client 啟動成功\n");

  const session = await client.createSession({
    workingDirectory: process.cwd(),
  });
  console.log("✅ Session 建立成功\n");

  // 追蹤事件
  let reasoningChunks = [];
  let messageChunks = [];

  session.on((event) => {
    if (event.type === "assistant.reasoning_delta") {
      reasoningChunks.push(event.data.deltaContent || "");
      // 顯示思考過程（用不同顏色）
      process.stdout.write(`\x1b[35m${event.data.deltaContent || ""}\x1b[0m`);
    } else if (event.type === "assistant.message_delta") {
      messageChunks.push(event.data.deltaContent || "");
      // 顯示回應（正常顏色）
      process.stdout.write(`\x1b[36m${event.data.deltaContent || ""}\x1b[0m`);
    }
  });

  // 發送需要思考的問題
  const prompt = "請解釋為什麼 0.1 + 0.2 不等於 0.3 在大多數程式語言中？簡短回答。";
  console.log("發送:", prompt);
  console.log("\n--- 開始接收 (紫色=思考, 青色=回應) ---\n");

  const idlePromise = waitForIdle(session);
  await session.send({ prompt });
  await idlePromise;

  console.log("\n\n--- 結束 ---\n");

  // 結果統計
  const reasoningText = reasoningChunks.join("");
  const messageText = messageChunks.join("");

  console.log("結果:");
  console.log(`   - reasoning_delta 事件數: ${reasoningChunks.length}`);
  console.log(`   - message_delta 事件數: ${messageChunks.length}`);
  console.log(`   - 思考內容長度: ${reasoningText.length} 字元`);
  console.log(`   - 回應內容長度: ${messageText.length} 字元`);

  if (reasoningChunks.length > 0) {
    console.log("\n   ✅ reasoning_delta 有收到！AI 思考過程可見");
  } else {
    console.log("\n   ⚠️  沒有收到 reasoning_delta（可能 Gemini 不輸出思考過程）");
  }

  await client.stop();
  console.log("\n=== 步驟 8 測試完成 ===");

} catch (error) {
  console.error("❌ 測試失敗:", error.message);
  await client.forceStop();
  process.exit(1);
}
