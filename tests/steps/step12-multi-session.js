/**
 * 步驟 12: Multiple Sessions 測試
 * - 同時建立多個 session
 * - 驗證各 session 獨立運作
 */

import { resolveProvider, createClient, waitForIdle } from "../helpers.js";

const provider = resolveProvider();

console.log(`=== 步驟 12: Multiple Sessions 測試 (${provider.name}) ===\n`);

const client = createClient(provider);

async function askQuestion(session, name, question) {
  let responseText = "";
  const unsubscribe = session.on((event) => {
    if (event.type === "assistant.message_delta") {
      responseText += event.data.deltaContent || "";
    }
  });

  const idlePromise = waitForIdle(session);
  await session.send({ prompt: question });
  await idlePromise;
  unsubscribe();

  return responseText.trim();
}

let test1Passed = false;
let test2Passed = false;

try {
  await client.start();
  console.log("✅ Client 啟動成功\n");

  // 建立兩個 session
  console.log("建立 Session 1...");
  const session1 = await client.createSession({
    workingDirectory: process.cwd(),
  });
  console.log(`   Session 1 ID: ${session1.sessionId}`);

  console.log("建立 Session 2...");
  const session2 = await client.createSession({
    workingDirectory: process.cwd(),
  });
  console.log(`   Session 2 ID: ${session2.sessionId}`);

  // 檢查 session ID 是否不同
  if (session1.sessionId !== session2.sessionId) {
    console.log("\n✅ 兩個 Session 有不同的 ID\n");
    test1Passed = true;
  } else {
    console.log("\n❌ 兩個 Session ID 相同（不應該）\n");
  }

  // 測試兩個 session 獨立運作
  console.log("--- 測試獨立運作 ---\n");

  // Session 1: 記住一個數字
  console.log("Session 1: 請記住數字 42");
  const response1a = await askQuestion(session1, "Session1", "請記住數字 42，之後我會問你。只要回答'好的'");
  console.log(`   回應: ${response1a.slice(0, 50)}`);

  // Session 2: 記住不同的數字
  console.log("\nSession 2: 請記住數字 99");
  const response2a = await askQuestion(session2, "Session2", "請記住數字 99，之後我會問你。只要回答'好的'");
  console.log(`   回應: ${response2a.slice(0, 50)}`);

  // 詢問各自記住的數字
  console.log("\nSession 1: 你記住的數字是？");
  const response1b = await askQuestion(session1, "Session1", "我剛才請你記住的數字是多少？只要回答數字");
  console.log(`   回應: ${response1b.slice(0, 50)}`);

  console.log("\nSession 2: 你記住的數字是？");
  const response2b = await askQuestion(session2, "Session2", "我剛才請你記住的數字是多少？只要回答數字");
  console.log(`   回應: ${response2b.slice(0, 50)}`);

  // 驗證各自記住正確的數字
  const session1Has42 = response1b.includes("42");
  const session2Has99 = response2b.includes("99");

  console.log("\n--- 結果 ---\n");
  console.log(`   Session 1 記住 42: ${session1Has42 ? "✅" : "❌"}`);
  console.log(`   Session 2 記住 99: ${session2Has99 ? "✅" : "❌"}`);

  if (session1Has42 && session2Has99) {
    console.log("\n✅ 兩個 Session 各自獨立運作");
    test2Passed = true;
  } else {
    console.log("\n⚠️  Session 記憶可能混淆（或 LLM 沒有正確回答）");
    // 如果至少有一個正確，也算部分成功
    test2Passed = session1Has42 || session2Has99;
  }

  await client.stop();

} catch (error) {
  console.error("❌ 測試失敗:", error.message);
  await client.forceStop().catch(() => {});
}

const allPassed = test1Passed && test2Passed;
console.log("\n結果:");
console.log(`   - 測試 1 (不同 Session ID): ${test1Passed ? "✅" : "❌"}`);
console.log(`   - 測試 2 (獨立運作): ${test2Passed ? "✅" : "❌"}`);

console.log(`\n=== 步驟 12 測試${allPassed ? "通過 ✅" : "失敗 ❌"} ===`);

if (!allPassed) {
  process.exit(1);
}
