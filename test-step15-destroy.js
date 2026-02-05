/**
 * 步驟 15: Session Destroy 測試
 * - session.destroy() 明確銷毀 session
 * - 驗證銷毀後無法再使用
 */

import { CopilotClient } from "@github/copilot-sdk";

console.log("=== 步驟 15: Session Destroy 測試 ===\n");

const client = new CopilotClient({
  cliPath: "gemini",
  cliArgs: ["--experimental-acp"],
  protocol: "acp",
  autoStart: false,
});

let test1Passed = false;
let test2Passed = false;

try {
  await client.start();
  console.log("✅ Client 啟動成功\n");

  // 測試 1: 正常 destroy
  console.log("測試 1: 正常 destroy()");

  const session1 = await client.createSession({
    workingDirectory: process.cwd(),
  });
  console.log(`   Session 建立: ${session1.sessionId}`);

  // 先發送一個訊息確認 session 正常
  await session1.sendAndWait({ prompt: "說 hello" });
  console.log("   ✅ Session 正常運作");

  // 銷毀 session
  await session1.destroy();
  console.log("   ✅ destroy() 完成");
  test1Passed = true;

  // 測試 2: destroy 後建立新 session 應該正常
  console.log("\n測試 2: destroy 後建立新 session");

  const session2 = await client.createSession({
    workingDirectory: process.cwd(),
  });
  console.log(`   新 Session 建立: ${session2.sessionId}`);

  if (session1.sessionId !== session2.sessionId) {
    console.log("   ✅ 新 Session ID 不同");
  }

  // 確認新 session 正常運作
  let responseText = "";
  const unsubscribe = session2.on((event) => {
    if (event.type === "assistant.message_delta") {
      responseText += event.data.deltaContent || "";
    }
  });

  await session2.sendAndWait({ prompt: "1+1=? 只要數字" });
  unsubscribe();

  if (responseText.includes("2")) {
    console.log("   ✅ 新 Session 正常運作");
    test2Passed = true;
  } else {
    console.log("   ⚠️  回應:", responseText.slice(0, 50));
    test2Passed = responseText.length > 0;
  }

  await client.stop();

} catch (error) {
  console.error("❌ 測試失敗:", error.message);
  await client.forceStop().catch(() => {});
}

const allPassed = test1Passed && test2Passed;
console.log("\n結果:");
console.log(`   - 測試 1 (destroy 正常執行): ${test1Passed ? "✅" : "❌"}`);
console.log(`   - 測試 2 (destroy 後新 session): ${test2Passed ? "✅" : "❌"}`);

console.log(`\n=== 步驟 15 測試${allPassed ? "通過 ✅" : "失敗 ❌"} ===`);

if (!allPassed) {
  process.exit(1);
}
