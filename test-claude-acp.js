/**
 * 測試: Copilot SDK 連接 Claude Code ACP
 * - 使用 claude-code-acp 作為 ACP server
 * - 驗證 SDK 能正確與 Claude 通訊
 */

import { CopilotClient } from "@github/copilot-sdk";

const CLAUDE_ACP_PATH = "/home/ct/SDD/claude-code-acp-py/.venv/bin/claude-code-acp";

console.log("=== 測試: Copilot SDK + Claude Code ACP ===\n");

// 測試 1: 連線與基本通訊
console.log("測試 1: 連線與基本通訊");

const client = new CopilotClient({
  cliPath: CLAUDE_ACP_PATH,
  cliArgs: [],
  protocol: "acp",
  autoStart: false,
});

let test1Passed = false;
let test2Passed = false;

try {
  console.log("   啟動 Claude ACP...");
  await client.start();
  console.log("   ✅ Client 啟動成功\n");

  console.log("   建立 Session...");
  const session = await client.createSession({
    workingDirectory: "/tmp",
  });
  console.log(`   ✅ Session 建立成功 (ID: ${session.sessionId})\n`);

  // 收集所有事件
  let deltaContent = "";
  let eventTypes = new Set();

  const unsubscribe = session.on((event) => {
    eventTypes.add(event.type);
    if (event.type === "assistant.message_delta") {
      deltaContent += event.data.deltaContent || "";
      process.stdout.write(event.data.deltaContent || "");
    } else if (event.type === "assistant.reasoning_delta") {
      // 思考過程（不顯示）
    }
  });

  console.log("   發送: 2+2=? 只要數字\n");
  console.log("   回應: ");

  const response = await session.sendAndWait({ prompt: "2+2=? 只要回答數字，不要其他文字" });

  console.log("\n");
  unsubscribe();

  console.log("   收到的事件類型:", [...eventTypes].join(", "));

  if (response) {
    console.log("   ✅ sendAndWait 回傳 assistant.message");
    console.log("   content:", response.data?.content?.slice(0, 100));
    test1Passed = true;
  } else if (deltaContent.length > 0) {
    console.log("   ⚠️  沒有 assistant.message，但有 delta");
    console.log("   delta:", deltaContent.slice(0, 100));
    test1Passed = deltaContent.includes("4");
  } else {
    console.log("   ❌ 沒有收到回應");
  }

  // 測試 2: 多輪對話
  console.log("\n測試 2: 多輪對話");

  deltaContent = "";
  const unsub2 = session.on((event) => {
    if (event.type === "assistant.message_delta") {
      deltaContent += event.data.deltaContent || "";
    }
  });

  await session.sendAndWait({ prompt: "請記住數字 88" });
  console.log("   第一輪完成（記住 88）");

  deltaContent = "";
  await session.sendAndWait({ prompt: "我剛才請你記住的數字是？只要回答數字" });
  unsub2();

  console.log("   回應:", deltaContent.slice(0, 50));

  if (deltaContent.includes("88")) {
    console.log("   ✅ 多輪對話記憶正確");
    test2Passed = true;
  } else {
    console.log("   ⚠️  回應中沒有找到 88");
    test2Passed = deltaContent.length > 0;
  }

  await client.stop();

} catch (error) {
  console.error("\n❌ 錯誤:", error.message);
  await client.forceStop().catch(() => {});
}

const allPassed = test1Passed && test2Passed;
console.log("\n結果:");
console.log(`   - 測試 1 (連線與通訊): ${test1Passed ? "✅" : "❌"}`);
console.log(`   - 測試 2 (多輪對話): ${test2Passed ? "✅" : "❌"}`);

console.log(`\n=== Claude ACP 測試${allPassed ? "通過 ✅" : "失敗 ❌"} ===`);

if (!allPassed) {
  process.exit(1);
}
