/**
 * 測試執行器
 *
 * Usage:
 *   node tests/run-all.js gemini        # 全部 Gemini
 *   node tests/run-all.js claude        # 全部 Claude
 *   node tests/run-all.js gemini 3      # 只跑 step 3
 */

import { execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const stepsDir = join(__dirname, "steps");

const provider = process.argv[2] || "gemini";
const onlyStep = process.argv[3] ? parseInt(process.argv[3], 10) : null;

// 找出所有 step 檔案並排序
const stepFiles = readdirSync(stepsDir)
  .filter((f) => /^step\d+-.*\.js$/.test(f))
  .sort((a, b) => {
    const numA = parseInt(a.match(/^step(\d+)/)[1], 10);
    const numB = parseInt(b.match(/^step(\d+)/)[1], 10);
    return numA - numB;
  });

console.log(`\n🚀 執行測試 (provider: ${provider})\n`);
if (onlyStep) {
  console.log(`   只跑 step ${onlyStep}\n`);
}

const results = [];
const TIMEOUT = 2 * 60 * 1000; // 2 分鐘

for (const file of stepFiles) {
  const stepNum = parseInt(file.match(/^step(\d+)/)[1], 10);

  if (onlyStep && stepNum !== onlyStep) {
    continue;
  }

  const label = `step${String(stepNum).padStart(2, "0")}`;
  const filePath = join(stepsDir, file);

  process.stdout.write(`  ${label} ${file.replace(/^step\d+-/, "").replace(/\.js$/, "")} ... `);

  try {
    execFileSync("node", [filePath, provider], {
      timeout: TIMEOUT,
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, ACP_PROVIDER: provider },
    });
    console.log("PASS ✅");
    results.push({ step: label, status: "PASS" });
  } catch (error) {
    if (error.status === 0) {
      // exit code 0 但被 execFileSync 當錯誤（不太可能，但保險起見）
      console.log("PASS ✅");
      results.push({ step: label, status: "PASS" });
    } else if (error.status === 77) {
      console.log("SKIP ⏭️");
      results.push({ step: label, status: "SKIP" });
    } else {
      console.log("FAIL ❌");
      // 顯示錯誤輸出
      const stderr = error.stderr?.toString().trim();
      const stdout = error.stdout?.toString().trim();
      if (stderr) {
        console.log(`    stderr: ${stderr.split("\n").slice(-3).join("\n    ")}`);
      }
      if (stdout) {
        const lines = stdout.split("\n");
        console.log(`    stdout (last 5 lines):`);
        console.log(`    ${lines.slice(-5).join("\n    ")}`);
      }
      results.push({ step: label, status: "FAIL" });
    }
  }
}

// 結果摘要
console.log("\n--- 結果摘要 ---\n");

const passed = results.filter((r) => r.status === "PASS").length;
const failed = results.filter((r) => r.status === "FAIL").length;
const skipped = results.filter((r) => r.status === "SKIP").length;

console.log(`  PASS: ${passed}  FAIL: ${failed}  SKIP: ${skipped}  TOTAL: ${results.length}\n`);

if (failed > 0) {
  console.log("  失敗的測試:");
  for (const r of results.filter((r) => r.status === "FAIL")) {
    console.log(`    - ${r.step}`);
  }
  console.log("");
  process.exit(1);
}
