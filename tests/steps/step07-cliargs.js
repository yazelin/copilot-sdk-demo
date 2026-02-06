/**
 * 步驟 7: CLI Args / Session Model 測試
 * - 路徑 A (modelFlag): 透過 cliArgs 傳遞 --model 參數（Gemini）
 * - 路徑 B (supportsSessionModel): 透過 createSession({ model }) 設定（Claude）
 * - 都不支援 → SKIP (exit 77)
 */

import { resolveProvider, createClient, waitForIdleOrError, waitForIdle } from "../helpers.js";

const provider = resolveProvider();

console.log(`=== 步驟 7: CLI Args / Session Model 測試 (${provider.name}) ===\n`);

const hasModelFlag = !!provider.capabilities.modelFlag;
const hasSessionModel = !!provider.capabilities.supportsSessionModel;

if (!hasModelFlag && !hasSessionModel) {
  console.log(`⏭️  ${provider.name} 不支援 model 設定，跳過此測試\n`);
  process.exit(77);
}

// ============================================================================
// 路徑 A: CLI args --model（Gemini）
// ============================================================================
if (hasModelFlag) {
  // 測試 1: 使用無效的 model 名稱，驗證 --model 參數有正確傳遞
  console.log("測試 1: 驗證 --model 參數傳遞（CLI args 路徑）");
  console.log(`   使用無效的 model 名稱 '${provider.capabilities.invalidModel}'`);
  console.log("   若出現 'not found' 錯誤，表示 CLI 嘗試使用該 model（參數有傳遞）\n");

  const invalidClient = createClient(provider, [
    provider.capabilities.modelFlag, provider.capabilities.invalidModel,
  ]);

  let test1Passed = false;

  try {
    await invalidClient.start();
    const session = await invalidClient.createSession({
      workingDirectory: process.cwd(),
    });

    await session.send({ prompt: "hi" });
    await new Promise(r => setTimeout(r, 3000));

    await invalidClient.stop();
    console.log("   ❌ 預期應該報錯但沒有\n");
  } catch (error) {
    const errorMsg = error.message.toLowerCase();
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

  const validClient = createClient(provider, [
    provider.capabilities.modelFlag, provider.capabilities.validModel,
    provider.capabilities.approvalModeFlag, "auto_edit",
  ]);

  let test2Passed = false;

  try {
    await validClient.start();
    console.log("   ✅ Client 啟動成功");
    console.log(`      ${provider.capabilities.modelFlag} ${provider.capabilities.validModel}`);
    console.log(`      ${provider.capabilities.approvalModeFlag} auto_edit`);

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
}

// ============================================================================
// 路徑 B: Session model（Claude via session/set_model）
// ============================================================================
if (hasSessionModel) {
  // 測試 1: 使用無效的 model，驗證 session/set_model 有正確傳遞
  console.log("測試 1: 驗證 session/set_model 傳遞（Session model 路徑）");
  console.log(`   使用無效的 model 名稱 '${provider.capabilities.invalidModel}'`);
  console.log("   若出現錯誤，表示 ACP server 嘗試設定該 model\n");

  const invalidClient = createClient(provider);

  let test1Passed = false;

  try {
    await invalidClient.start();
    const session = await invalidClient.createSession({
      workingDirectory: process.cwd(),
      model: provider.capabilities.invalidModel,
    });

    // 如果 set_model 沒有報錯，試著發送訊息看看
    await session.send({ prompt: "hi" });
    await new Promise(r => setTimeout(r, 3000));

    await invalidClient.stop();
    console.log("   ❌ 預期應該報錯但沒有\n");
  } catch (error) {
    const errorMsg = error.message.toLowerCase();
    if (errorMsg.includes("not found") || errorMsg.includes("invalid") || errorMsg.includes("model") || errorMsg.includes("error")) {
      console.log("   ✅ ACP server 正確拒絕無效的 model");
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

  // 測試 2: 使用有效的 model
  console.log("測試 2: 驗證有效的 session model");
  console.log(`   model: ${provider.capabilities.validModel}\n`);

  const validClient = createClient(provider);

  let test2Passed = false;

  try {
    await validClient.start();
    console.log("   ✅ Client 啟動成功");

    const session = await validClient.createSession({
      workingDirectory: process.cwd(),
      model: provider.capabilities.validModel,
    });
    console.log(`   ✅ Session 建立成功 (model: ${provider.capabilities.validModel})`);

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
  console.log(`   - 測試 2 (有效 session model): ${test2Passed ? "✅" : "❌"}`);

  const allPassed = test1Passed && test2Passed;
  console.log(`\n=== 步驟 7 測試${allPassed ? "通過 ✅" : "失敗 ❌"} ===`);

  if (!allPassed) {
    process.exit(1);
  }
}
