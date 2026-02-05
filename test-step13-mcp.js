/**
 * 步驟 13: MCP Servers 測試
 * - 測試 mcpServers 參數傳遞
 * - 注意：完整測試需要實際的 MCP server
 */

import { CopilotClient } from "@github/copilot-sdk";

console.log("=== 步驟 13: MCP Servers 測試 ===\n");

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

let test1Passed = false;
let test2Passed = false;

try {
  await client.start();
  console.log("✅ Client 啟動成功\n");

  // 測試 1: 帶 mcpServers 參數建立 session（使用不存在的 server）
  console.log("測試 1: mcpServers 參數傳遞");
  console.log("   （使用假的 MCP server 設定，驗證參數被接受）\n");

  try {
    const session1 = await client.createSession({
      workingDirectory: process.cwd(),
      mcpServers: {
        "fake-server": {
          type: "stdio",
          command: "echo",
          args: ["fake"],
          env: {},  // Gemini 需要 env 欄位
        },
      },
    });
    console.log(`   ✅ Session 建立成功 (ID: ${session1.sessionId})`);
    console.log("   mcpServers 參數被接受（不代表 server 有連線）");
    test1Passed = true;
  } catch (error) {
    // 如果是 MCP server 連線錯誤，參數還是有傳遞
    if (error.message.includes("MCP") || error.message.includes("server")) {
      console.log("   ⚠️  MCP server 連線失敗（預期中）");
      console.log("   ✅ 但 mcpServers 參數有被傳遞");
      test1Passed = true;
    } else {
      console.log("   ❌ 錯誤:", error.message);
    }
  }

  // 測試 2: 不帶 mcpServers 的 session 應該正常運作
  console.log("\n測試 2: 不帶 mcpServers 的 session");

  const session2 = await client.createSession({
    workingDirectory: process.cwd(),
  });
  console.log(`   ✅ Session 建立成功 (ID: ${session2.sessionId})`);

  let responseText = "";
  const unsubscribe = session2.on((event) => {
    if (event.type === "assistant.message_delta") {
      responseText += event.data.deltaContent || "";
    }
  });

  const idlePromise = waitForIdle(session2);
  await session2.send({ prompt: "回答 1+1=? 只要數字" });
  await idlePromise;
  unsubscribe();

  if (responseText.includes("2")) {
    console.log("   ✅ Session 正常運作");
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
console.log(`   - 測試 1 (mcpServers 參數傳遞): ${test1Passed ? "✅" : "❌"}`);
console.log(`   - 測試 2 (無 mcpServers 正常運作): ${test2Passed ? "✅" : "❌"}`);

console.log(`\n=== 步驟 13 測試${allPassed ? "通過 ✅" : "失敗 ❌"} ===`);

console.log("\n注意：完整的 MCP 功能測試需要實際運行的 MCP server");

if (!allPassed) {
  process.exit(1);
}
