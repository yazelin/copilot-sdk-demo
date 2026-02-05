/**
 * 步驟 7: CLI Args 測試
 * - 測試透過 cliArgs 傳遞額外參數
 * - 例如: --model, --approval-mode
 */

import { CopilotClient } from "@github/copilot-sdk";

console.log("=== 步驟 7: CLI Args 測試 ===\n");

// 使用 CLI args 設定 model 和 approval-mode
const client = new CopilotClient({
  cliPath: "gemini",
  cliArgs: [
    "--experimental-acp",
    "--model", "gemini-2.5-flash",  // 使用特定模型
    "--approval-mode", "auto_edit", // 自動批准編輯
  ],
  protocol: "acp",
  autoStart: false,
});

async function waitForIdle(session, timeout = 60000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("等待 idle 超時")), timeout);
    const handler = (event) => {
      if (event.type === "session.idle") {
        clearTimeout(timer);
        resolve();
      }
    };
    session.on(handler);
  });
}

try {
  await client.start();
  console.log("✅ Client 啟動成功 (使用 CLI args)");
  console.log("   - --model gemini-2.5-flash");
  console.log("   - --approval-mode auto_edit");
  console.log("");

  const session = await client.createSession({
    workingDirectory: process.cwd(),
  });
  console.log("✅ Session 建立成功\n");

  // 收集回應
  let responseText = "";
  session.on((event) => {
    if (event.type === "assistant.message_delta") {
      responseText += event.data.deltaContent || "";
    }
  });

  // 發送訊息詢問模型版本
  console.log("發送: 你是什麼模型？只需回答模型名稱，例如 gemini-2.5-flash。");

  const idlePromise = waitForIdle(session);
  await session.send({ prompt: "你是什麼模型？只需回答模型名稱，例如 gemini-2.5-flash。" });
  await idlePromise;

  console.log("\n回應:", responseText.trim().slice(0, 150));

  // 驗證 - 檢查回應是否包含 2.5
  const hasCorrectModel = responseText.toLowerCase().includes("2.5");
  if (hasCorrectModel) {
    console.log("\n✅ CLI Args 正確傳遞 - 確認使用 gemini-2.5-flash 模型");
  } else if (responseText.length > 0) {
    console.log("\n⚠️  收到回應但無法確認模型版本");
  } else {
    console.log("\n❌ 沒有收到回應");
  }

  await client.stop();
  console.log("\n=== 步驟 7 測試完成 ===");
  process.exit(0);

} catch (error) {
  console.error("❌ 測試失敗:", error.message);
  await client.forceStop();
  process.exit(1);
}
