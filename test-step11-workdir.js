/**
 * 步驟 11: Working Directory 測試
 * - 驗證 workingDirectory 參數有正確傳遞給 CLI
 * - 讓 agent 讀取特定目錄的檔案來確認
 */

import { CopilotClient } from "@github/copilot-sdk";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";

console.log("=== 步驟 11: Working Directory 測試 ===\n");

// 建立測試目錄和檔案
const testDir = "/tmp/copilot-workdir-test";
const testFile = "secret-test-file.txt";
const testContent = "WORKDIR_TEST_12345";

try {
  rmSync(testDir, { recursive: true, force: true });
} catch {}
mkdirSync(testDir, { recursive: true });
writeFileSync(join(testDir, testFile), testContent);
console.log(`✅ 建立測試目錄: ${testDir}`);
console.log(`   測試檔案: ${testFile}`);
console.log(`   內容: ${testContent}\n`);

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

let testPassed = false;

try {
  await client.start();
  console.log("✅ Client 啟動成功\n");

  // 使用測試目錄作為 workingDirectory
  const session = await client.createSession({
    workingDirectory: testDir,
  });
  console.log(`✅ Session 建立成功 (workingDirectory: ${testDir})\n`);

  let responseText = "";
  const unsubscribe = session.on((event) => {
    if (event.type === "assistant.message_delta") {
      responseText += event.data.deltaContent || "";
    } else if (event.type === "tool.execution_start") {
      console.log("   🔧 Tool:", event.data.toolName);
    }
  });

  // 請 agent 讀取當前目錄的檔案（應該是 testDir）
  const prompt = `讀取當前目錄下的 ${testFile} 檔案，告訴我裡面的內容是什麼`;
  console.log("發送:", prompt);
  console.log("\n--- 等待回應 ---\n");

  const idlePromise = waitForIdle(session);
  await session.send({ prompt });
  await idlePromise;
  unsubscribe();

  console.log("回應:", responseText.trim().slice(0, 300));
  console.log("\n--- 結束 ---\n");

  // 檢查回應是否包含測試內容
  if (responseText.includes(testContent)) {
    console.log("✅ 測試通過！Agent 正確讀取了 workingDirectory 中的檔案");
    console.log(`   找到預期內容: ${testContent}`);
    testPassed = true;
  } else {
    console.log("❌ 測試失敗：回應中沒有找到預期內容");
    console.log(`   預期: ${testContent}`);
  }

  await client.stop();

} catch (error) {
  console.error("❌ 測試失敗:", error.message);
  await client.forceStop().catch(() => {});
} finally {
  // 清理測試目錄
  try {
    rmSync(testDir, { recursive: true, force: true });
    console.log("\n✅ 已清理測試目錄");
  } catch {}
}

console.log(`\n=== 步驟 11 測試${testPassed ? "通過 ✅" : "失敗 ❌"} ===`);

if (!testPassed) {
  process.exit(1);
}
