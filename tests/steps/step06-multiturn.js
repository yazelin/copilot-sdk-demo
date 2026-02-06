/**
 * 步驟 6: 多輪對話測試
 * - 同一個 session 發送多個訊息
 * - 確認 context 是否保留
 */

import { resolveProvider, createClient, waitForIdle } from "../helpers.js";

const provider = resolveProvider();

console.log(`=== 步驟 6: 多輪對話測試 (${provider.name}) ===\n`);

const client = createClient(provider);

try {
  await client.start();
  console.log("✅ Client 啟動成功\n");

  const session = await client.createSession({
    workingDirectory: process.cwd(),
  });
  console.log("✅ Session 建立成功:", session.sessionId, "\n");

  // 收集回應
  let currentResponse = "";
  session.on((event) => {
    if (event.type === "assistant.message_delta") {
      currentResponse += event.data.deltaContent || "";
    }
  });

  // 第一輪：設定 context
  console.log("1. 第一輪對話 - 設定 context");
  console.log("   發送: 我最喜歡的數字是 42，請記住這個數字。只需回答 OK。");

  currentResponse = "";
  const idlePromise1 = waitForIdle(session);
  await session.send({ prompt: "我最喜歡的數字是 42，請記住這個數字。只需回答 OK。" });
  await idlePromise1;

  console.log("   回應:", currentResponse.trim().slice(0, 50));
  console.log("");

  // 第二輪：驗證 context
  console.log("2. 第二輪對話 - 驗證 context");
  console.log("   發送: 我剛才說的數字是多少？只需回答數字。");

  currentResponse = "";
  const idlePromise2 = waitForIdle(session);
  await session.send({ prompt: "我剛才說的數字是多少？只需回答數字。" });
  await idlePromise2;

  console.log("   回應:", currentResponse.trim().slice(0, 50));

  // 驗證結果
  const hasContext = currentResponse.includes("42");
  console.log("");

  if (hasContext) {
    console.log("   ✅ Context 正確保留 - 記住了數字 42");
  } else {
    console.log("   ⚠️  Context 可能未保留 - 回應中沒有 42");
  }

  await client.stop();
  console.log("\n=== 步驟 6 測試完成 ===");

} catch (error) {
  console.error("❌ 測試失敗:", error.message);
  await client.forceStop();
  process.exit(1);
}
