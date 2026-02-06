/**
 * 步驟 14: sendAndWait 測試
 * - session.sendAndWait() 便利方法
 * - 自動等待 session.idle 並回傳最終訊息
 */

import { resolveProvider, createClient } from "../helpers.js";

const provider = resolveProvider();

console.log(`=== 步驟 14: sendAndWait 測試 (${provider.name}) ===\n`);

const client = createClient(provider);

let test1Passed = false;

try {
  await client.start();
  console.log("✅ Client 啟動成功\n");

  const session = await client.createSession({
    workingDirectory: process.cwd(),
  });
  console.log("✅ Session 建立成功\n");

  // 測試: 基本 sendAndWait
  console.log("測試: sendAndWait() 自動等待完成");
  console.log("   發送: 2+3=? 只要數字\n");

  // 同時用 event handler 收集 delta
  let deltaContent = "";
  const unsubscribe = session.on((event) => {
    if (event.type === "assistant.message_delta") {
      deltaContent += event.data.deltaContent || "";
    }
  });

  const response = await session.sendAndWait({ prompt: "2+3=? 只要數字" });
  unsubscribe();

  console.log("   sendAndWait() 已返回");

  if (response) {
    console.log("   ✅ 收到 assistant.message");
    console.log("   type:", response.type);
    console.log("   content:", response.data?.content?.slice(0, 100));
    test1Passed = true;
  } else if (deltaContent.length > 0) {
    console.log("   ⚠️  沒有 assistant.message，但有 delta");
    console.log("   delta:", deltaContent.slice(0, 100));
    // 可能不發送完整的 assistant.message
    test1Passed = deltaContent.includes("5");
  } else {
    console.log("   ❌ 沒有收到任何回應");
  }

  await client.stop();

} catch (error) {
  console.error("❌ 測試失敗:", error.message);
  await client.forceStop().catch(() => {});
}

console.log("\n結果:");
console.log(`   - sendAndWait 測試: ${test1Passed ? "✅" : "❌"}`);

console.log(`\n=== 步驟 14 測試${test1Passed ? "通過 ✅" : "失敗 ❌"} ===`);

if (!test1Passed) {
  process.exit(1);
}
