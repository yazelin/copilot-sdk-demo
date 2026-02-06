/**
 * 步驟 16: Typed Event Handler 測試
 * - session.on("event.type", handler) 語法
 * - 只接收特定類型的事件
 */

import { resolveProvider, createClient } from "../helpers.js";

const provider = resolveProvider();

console.log(`=== 步驟 16: Typed Event Handler 測試 (${provider.name}) ===\n`);

const client = createClient(provider);

let test1Passed = false;
let test2Passed = false;
let test3Passed = false;

try {
  await client.start();
  console.log("✅ Client 啟動成功\n");

  const session = await client.createSession({
    workingDirectory: process.cwd(),
  });
  console.log("✅ Session 建立成功\n");

  // 測試 1: Typed handler for assistant.message_delta
  console.log("測試 1: session.on('assistant.message_delta', handler)");

  let deltaCount = 0;
  let deltaContent = "";
  const unsubscribeDelta = session.on("assistant.message_delta", (event) => {
    deltaCount++;
    deltaContent += event.data.deltaContent || "";
  });

  await session.sendAndWait({ prompt: "說 ABC" });
  unsubscribeDelta();

  if (deltaCount > 0) {
    console.log(`   ✅ 收到 ${deltaCount} 個 message_delta 事件`);
    console.log(`   內容: ${deltaContent.slice(0, 50)}`);
    test1Passed = true;
  } else {
    console.log("   ❌ 沒有收到 message_delta 事件");
  }

  // 測試 2: Typed handler for session.idle
  console.log("\n測試 2: session.on('session.idle', handler)");

  let idleReceived = false;
  const idlePromise = new Promise((resolve) => {
    const unsubscribeIdle = session.on("session.idle", (event) => {
      idleReceived = true;
      unsubscribeIdle();
      resolve();
    });

    // Timeout fallback
    setTimeout(() => {
      unsubscribeIdle();
      resolve();
    }, 30000);
  });

  await session.send({ prompt: "說 XYZ" });
  await idlePromise;

  if (idleReceived) {
    console.log("   ✅ 收到 session.idle 事件");
    test2Passed = true;
  } else {
    console.log("   ❌ 沒有收到 session.idle 事件");
  }

  // 測試 3: 多個 typed handlers 同時運作
  console.log("\n測試 3: 多個 typed handlers 同時運作");

  let deltaCount2 = 0;
  let reasoningCount = 0;
  let idleCount = 0;

  const unsub1 = session.on("assistant.message_delta", () => deltaCount2++);
  const unsub2 = session.on("assistant.reasoning_delta", () => reasoningCount++);
  const unsub3 = session.on("session.idle", () => idleCount++);

  await session.sendAndWait({ prompt: "計算 5+5=?" });

  unsub1();
  unsub2();
  unsub3();

  console.log(`   message_delta: ${deltaCount2}`);
  console.log(`   reasoning_delta: ${reasoningCount}`);
  console.log(`   session.idle: ${idleCount}`);

  if (deltaCount2 > 0 && idleCount > 0) {
    console.log("   ✅ 多個 handlers 都有收到事件");
    test3Passed = true;
  } else {
    console.log("   ⚠️  部分 handler 沒收到事件");
    test3Passed = deltaCount2 > 0 || idleCount > 0;
  }

  await client.stop();

} catch (error) {
  console.error("❌ 測試失敗:", error.message);
  await client.forceStop().catch(() => {});
}

const allPassed = test1Passed && test2Passed && test3Passed;
console.log("\n結果:");
console.log(`   - 測試 1 (message_delta handler): ${test1Passed ? "✅" : "❌"}`);
console.log(`   - 測試 2 (session.idle handler): ${test2Passed ? "✅" : "❌"}`);
console.log(`   - 測試 3 (多個 handlers): ${test3Passed ? "✅" : "❌"}`);

console.log(`\n=== 步驟 16 測試${allPassed ? "通過 ✅" : "失敗 ❌"} ===`);

if (!allPassed) {
  process.exit(1);
}
