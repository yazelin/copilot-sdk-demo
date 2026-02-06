/**
 * 步驟 9: Session Abort 測試
 * - session.abort() 中斷進行中的請求
 */

import { resolveProvider, createClient } from "../helpers.js";

const provider = resolveProvider();

console.log(`=== 步驟 9: Session Abort 測試 (${provider.name}) ===\n`);

const client = createClient(provider);

try {
  await client.start();
  console.log("✅ Client 啟動成功\n");

  const session = await client.createSession({
    workingDirectory: process.cwd(),
  });
  console.log("✅ Session 建立成功\n");

  let chunkCount = 0;
  let aborted = false;

  const unsubscribe = session.on((event) => {
    if (event.type === "assistant.message_delta") {
      chunkCount++;
      process.stdout.write(event.data.deltaContent || "");

      // 收到 3 個 chunk 後中斷
      if (chunkCount === 3 && !aborted) {
        aborted = true;
        console.log("\n\n🛑 收到 3 個 chunk，執行 abort()...\n");
        session.abort().catch(err => {
          console.log("   abort error:", err.message);
        });
      }
    } else if (event.type === "session.idle") {
      console.log("[IDLE]");
      if (unsubscribe) unsubscribe();
    }
  });

  // 發送會產生長回應的問題
  const prompt = "用 500 字詳細解釋什麼是機器學習，包括監督式學習、非監督式學習和強化學習。";
  console.log("發送:", prompt);
  console.log("\n--- 開始接收（預計在第 3 個 chunk 後中斷）---\n");

  await session.send({ prompt });

  // 等待一段時間看結果
  await new Promise(r => setTimeout(r, 5000));

  console.log("\n\n結果:");
  console.log(`   - 收到 chunk 數: ${chunkCount}`);
  console.log(`   - 是否執行 abort: ${aborted ? "是" : "否"}`);

  if (aborted && chunkCount <= 10) {
    console.log("\n   ✅ abort() 可能有效 - 只收到少量 chunk");
  } else if (aborted) {
    console.log("\n   ⚠️  abort() 已執行但收到較多 chunk - 可能不完全支援");
  } else {
    console.log("\n   ⚠️  未觸發 abort");
  }

  await client.stop();
  console.log("\n=== 步驟 9 測試完成 ===");

} catch (error) {
  console.error("❌ 測試失敗:", error.message);
  await client.forceStop();
  process.exit(1);
}
