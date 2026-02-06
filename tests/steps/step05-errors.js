/**
 * 步驟 5: 錯誤處理測試
 * - 不支援的方法應該正確拋出錯誤
 */

import { resolveProvider, createClient } from "../helpers.js";

const provider = resolveProvider();

console.log(`=== 步驟 5: 錯誤處理測試 (${provider.name}) ===\n`);

const client = createClient(provider);

let passed = 0;
let failed = 0;

async function testError(name, fn) {
  try {
    console.log(`測試 ${name}...`);
    await fn();
    console.log(`   ❌ 應該要拋出錯誤但沒有`);
    failed++;
  } catch (error) {
    if (error.message.includes("not supported in ACP mode")) {
      console.log(`   ✅ 正確拋出錯誤`);
      passed++;
    } else {
      console.log(`   ⚠️  錯誤訊息不符預期:`, error.message.slice(0, 50));
      failed++;
    }
  }
}

try {
  await client.start();
  console.log("✅ Client 啟動成功\n");

  // 測試不支援的方法
  await testError("listModels()", () => client.listModels());
  await testError("resumeSession()", () => client.resumeSession("fake-id"));

  // 測試 session 的不支援方法
  const session = await client.createSession();
  console.log("\n✅ Session 建立成功\n");

  await testError("session.getMessages()", () => session.getMessages());

  await client.stop();

  console.log("\n結果:");
  console.log(`   - 通過: ${passed}`);
  console.log(`   - 失敗: ${failed}`);
  console.log(`\n=== 步驟 5 測試${failed === 0 ? "通過 ✅" : "失敗 ❌"} ===`);

} catch (error) {
  console.error("❌ 測試失敗:", error.message);
  await client.forceStop();
  process.exit(1);
}
