/**
 * 共用測試工具
 */

import { CopilotClient } from "@github/copilot-sdk";
import { providers } from "./providers.js";

/**
 * 從 ACP_PROVIDER 環境變數或 argv[2] 解析 provider
 * @returns {object} provider 設定
 */
export function resolveProvider() {
  const name = process.env.ACP_PROVIDER || process.argv[2] || "gemini";
  const provider = providers[name];
  if (!provider) {
    console.error(`❌ 未知的 provider: ${name}`);
    console.error(`   可用: ${Object.keys(providers).join(", ")}`);
    process.exit(1);
  }
  return provider;
}

/**
 * 建立 CopilotClient
 * @param {object} provider - provider 設定
 * @param {string[]} [extraCliArgs] - 額外的 CLI 參數
 * @returns {CopilotClient}
 */
export function createClient(provider, extraCliArgs = []) {
  return new CopilotClient({
    cliPath: provider.cliPath,
    cliArgs: [...provider.cliArgs, ...extraCliArgs],
    protocol: "acp",
    autoStart: false,
  });
}

/**
 * 等待 session.idle 事件
 * @param {object} session
 * @param {number} [timeout=60000]
 * @returns {Promise<void>}
 */
export function waitForIdle(session, timeout = 60000) {
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

/**
 * 等待 session.idle 或 error 事件
 * @param {object} session
 * @param {number} [timeout=60000]
 * @returns {Promise<void>}
 */
export function waitForIdleOrError(session, timeout = 60000) {
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
