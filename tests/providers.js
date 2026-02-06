/**
 * Provider 設定
 * 定義每個 provider 的 cliPath、cliArgs、capabilities
 */

export const providers = {
  gemini: {
    name: "gemini",
    cliPath: "gemini",
    cliArgs: ["--experimental-acp"],
    capabilities: {
      modelFlag: "--model",
      approvalModeFlag: "--approval-mode",
    },
  },
  claude: {
    name: "claude",
    cliPath: process.env.CLAUDE_ACP_PATH || "claude-code-acp",
    cliArgs: [],
    capabilities: {
      modelFlag: null,
      approvalModeFlag: null,
    },
  },
};
