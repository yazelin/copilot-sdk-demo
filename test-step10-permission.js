/**
 * 步驟 10: Permission Request 測試
 * - 當 Agent 需要執行敏感操作時會請求權限
 * - SDK 處理 session/request_permission
 */

import { CopilotClient } from "@github/copilot-sdk";

console.log("=== 步驟 10: Permission Request 測試 ===\n");

const client = new CopilotClient({
  cliPath: "gemini",
  cliArgs: [
    "--experimental-acp",
    "--approval-mode", "default",  // 使用預設模式，需要請求權限
  ],
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

try {
  await client.start();
  console.log("✅ Client 啟動成功 (approval-mode: default)\n");

  const session = await client.createSession({
    workingDirectory: process.cwd(),
  });
  console.log("✅ Session 建立成功\n");

  // 追蹤事件
  let permissionRequests = [];
  let toolEvents = [];

  const unsubscribeEvents = session.on((event) => {
    if (event.type === "permission.request") {
      console.log("\n🔐 收到 Permission Request!");
      console.log("   Title:", event.data?.title);
      console.log("   Kind:", event.data?.kind);
      permissionRequests.push(event.data);

      // 自動批准（在實際應用中可以讓使用者選擇）
      // 這裡我們回傳同意
      return { result: { optionId: "allow" } };
    } else if (event.type === "tool.execution_start") {
      console.log("   🔧 Tool 開始:", event.data.toolName);
      toolEvents.push({ type: "start", ...event.data });
    } else if (event.type === "tool.execution_complete") {
      console.log("   ✅ Tool 完成");
      toolEvents.push({ type: "complete", ...event.data });
    } else if (event.type === "assistant.message_delta") {
      process.stdout.write(event.data.deltaContent || "");
    }
  });

  // 發送會觸發讀取操作的請求（較安全的測試）
  const prompt = "讀取 package.json 檔案並告訴我 name 欄位的值";
  console.log("發送:", prompt);
  console.log("\n--- 等待回應 ---\n");

  const idlePromise = waitForIdle(session);
  await session.send({ prompt });
  await idlePromise;

  console.log("\n\n--- 結束 ---\n");

  console.log("結果:");
  console.log(`   - Permission requests: ${permissionRequests.length}`);
  console.log(`   - Tool events: ${toolEvents.length}`);

  if (permissionRequests.length > 0) {
    console.log("\n   ✅ 有收到 Permission Request！");
    console.log("   請求詳情:", JSON.stringify(permissionRequests[0], null, 2).slice(0, 200));
  } else {
    console.log("\n   ⚠️  沒有收到 Permission Request");
    console.log("   （可能因為 approval-mode 設定或 Gemini 直接執行）");
  }


  unsubscribeEvents();
  await client.stop();
  console.log("\n=== 步驟 10 測試完成 ===");

} catch (error) {
  console.error("❌ 測試失敗:", error.message);
  await client.forceStop();
  process.exit(1);
}
