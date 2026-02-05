/**
 * 步驟 2: Session 建立與簡單對話
 * - createSession()
 * - session.send()
 * - assistant.message_delta 事件
 * - session.idle 事件
 */

import { CopilotClient } from "@github/copilot-sdk";

console.log("=== 步驟 2: Session 與對話測試 ===\n");

const client = new CopilotClient({
  cliPath: "gemini",
  cliArgs: ["--experimental-acp"],
  protocol: "acp",
  autoStart: false,
});

try {
  await client.start();
  console.log("✅ Client 啟動成功\n");

  // 測試 1: 建立 Session
  console.log("1. 建立 Session...");
  const session = await client.createSession({
    workingDirectory: process.cwd(),
  });
  console.log("   ✅ Session 建立成功");
  console.log("   - sessionId:", session.sessionId);
  console.log("");

  // 測試 2: 監聽事件並發送訊息
  console.log("2. 發送訊息並監聽事件...");

  let deltaCount = 0;
  let idleReceived = false;
  let responseText = "";

  session.on((event) => {
    if (event.type === "assistant.message_delta") {
      deltaCount++;
      responseText += event.data.deltaContent || "";
    } else if (event.type === "session.idle") {
      idleReceived = true;
    }
  });

  const prompt = "回答 1+1=? 只需要回答數字";
  console.log("   發送:", prompt);

  await session.send({ prompt });

  // 等待 idle (簡單 polling)
  const timeout = 30000;
  const start = Date.now();
  while (!idleReceived && Date.now() - start < timeout) {
    await new Promise(r => setTimeout(r, 100));
  }

  if (!idleReceived) {
    throw new Error("等待 idle 超時");
  }

  console.log("\n   ✅ 收到回應");
  console.log("   - delta 事件數:", deltaCount);
  console.log("   - 回應內容:", responseText.trim().slice(0, 100));
  console.log("   - idle 事件: ✅");
  console.log("");

  // 清理
  console.log("3. 停止 client...");
  await client.stop();
  console.log("   ✅ 停止成功\n");

  console.log("=== 步驟 2 測試通過 ✅ ===");

} catch (error) {
  console.error("❌ 測試失敗:", error.message);
  await client.forceStop();
  process.exit(1);
}
