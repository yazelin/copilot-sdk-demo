/**
 * 步驟 1: 基本連線測試
 * - client.start()
 * - client.ping()
 * - client.stop()
 */

import { CopilotClient } from "@github/copilot-sdk";

console.log("=== 步驟 1: 基本連線測試 ===\n");

const client = new CopilotClient({
  cliPath: "gemini",
  cliArgs: ["--experimental-acp"],
  protocol: "acp",
  autoStart: false,
});

try {
  // 測試 1: 啟動
  console.log("1. 啟動 client...");
  await client.start();
  console.log("   ✅ 啟動成功\n");

  // 測試 2: Ping
  console.log("2. 測試 ping...");
  const pingResult = await client.ping();
  console.log("   ✅ Ping 成功:", pingResult);
  console.log("   - protocolVersion:", pingResult.protocolVersion);
  console.log("   - message:", pingResult.message);
  console.log("");

  // 測試 3: 停止
  console.log("3. 停止 client...");
  await client.stop();
  console.log("   ✅ 停止成功\n");

  console.log("=== 步驟 1 測試通過 ✅ ===");
  process.exit(0);

} catch (error) {
  console.error("❌ 測試失敗:", error.message);
  await client.forceStop();
  process.exit(1);
}
