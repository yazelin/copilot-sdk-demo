/**
 * 步驟 7: CLI Args 測試
 * - 測試透過 cliArgs 傳遞額外參數
 * - 驗證方式：用無效的 model 名稱，確認 CLI 有收到參數並報錯
 */

import { CopilotClient } from "@github/copilot-sdk";

console.log("=== 步驟 7: CLI Args 測試 ===\n");

// 測試 1: 使用無效的 model 名稱，驗證 --model 參數有正確傳遞
console.log("測試 1: 驗證 --model 參數傳遞");
console.log("   使用無效的 model 名稱 'invalid-model-12345'");
console.log("   若出現 'not found' 錯誤，表示 CLI 嘗試使用該 model（參數有傳遞）\n");

const invalidClient = new CopilotClient({
  cliPath: "gemini",
  cliArgs: [
    "--experimental-acp",
    "--model", "invalid-model-12345",
  ],
  protocol: "acp",
  autoStart: false,
});

let test1Passed = false;

try {
  await invalidClient.start();
  const session = await invalidClient.createSession({
    workingDirectory: process.cwd(),
  });

  // 如果能建立 session，試著發送訊息
  await session.send({ prompt: "hi" });

  // 等一下看有沒有錯誤
  await new Promise(r => setTimeout(r, 3000));

  await invalidClient.stop();
  console.log("   ❌ 預期應該報錯但沒有\n");
} catch (error) {
  const errorMsg = error.message.toLowerCase();
  // Check for model-related errors: "not found", "entity", "invalid", etc.
  if (errorMsg.includes("not found") || errorMsg.includes("entity") || errorMsg.includes("invalid") || errorMsg.includes("model")) {
    console.log("   ✅ CLI 正確拒絕無效的 model");
    console.log("   錯誤訊息:", error.message.slice(0, 150));
    test1Passed = true;
  } else {
    console.log("   ❌ 錯誤訊息不符預期");
    console.log("   錯誤:", error.message.slice(0, 150));
    test1Passed = false;
  }
  await invalidClient.forceStop().catch(() => {});
}

console.log("");

// 測試 2: 使用有效的參數組合
console.log("測試 2: 驗證有效的 CLI args 組合");

const validClient = new CopilotClient({
  cliPath: "gemini",
  cliArgs: [
    "--experimental-acp",
    "--model", "gemini-3-flash-preview",
    "--approval-mode", "auto_edit",
  ],
  protocol: "acp",
  autoStart: false,
});

let test2Passed = false;

async function waitForIdleOrError(session, timeout = 60000) {
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
      } else if (event.type === "session.error" || event.type === "error") {
        clearTimeout(timer);
        if (unsubscribe) unsubscribe();
        reject(new Error(event.data?.message || "Session error"));
      }
    });
  });
}

try {
  await validClient.start();
  console.log("   ✅ Client 啟動成功");
  console.log("      --model gemini-3-flash-preview");
  console.log("      --approval-mode auto_edit");

  const session = await validClient.createSession({
    workingDirectory: process.cwd(),
  });
  console.log("   ✅ Session 建立成功");

  let responseText = "";
  session.on((event) => {
    if (event.type === "assistant.message_delta") {
      responseText += event.data.deltaContent || "";
    }
  });

  const idlePromise = waitForIdleOrError(session);
  await session.send({ prompt: "回答 2+2=? 只要數字" });
  await idlePromise;

  if (responseText.includes("4")) {
    console.log("   ✅ 收到正確回應:", responseText.trim());
    test2Passed = true;
  } else {
    console.log("   ⚠️  回應:", responseText.trim());
    test2Passed = responseText.length > 0;
  }

  await validClient.stop();
} catch (error) {
  console.error("   ❌ 測試失敗:", error.message);
  await validClient.forceStop().catch(() => {});
}

// 結果
console.log("\n結果:");
console.log(`   - 測試 1 (無效 model 檢測): ${test1Passed ? "✅" : "❌"}`);
console.log(`   - 測試 2 (有效參數組合): ${test2Passed ? "✅" : "❌"}`);

const allPassed = test1Passed && test2Passed;
console.log(`\n=== 步驟 7 測試${allPassed ? "通過 ✅" : "失敗 ❌"} ===`);

if (!allPassed) {
  process.exit(1);
}
