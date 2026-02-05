/**
 * 網頁分析代理人
 * 功能：下載網頁 → 提取內容 → 總結 → 生成 3 種風格臉書貼文 → 翻譯成英文
 */

import { CopilotClient } from "@github/copilot-sdk";
import axios from "axios";
import * as cheerio from "cheerio";

class WebpageAnalyzerAgent {
  constructor() {
    this.client = null;
  }

  /**
   * 初始化 Copilot 客戶端
   */
  async initialize() {
    console.log("🚀 初始化 Copilot 客戶端...");
    this.client = new CopilotClient({
      cliPath: "gemini",
      cliArgs: ["--experimental-acp"],
      protocol: "acp",
    });
    await this.client.start();
    console.log("✅ Copilot 客戶端已啟動\n");
  }

  /**
   * 下載網頁內容
   */
  async downloadWebpage(url) {
    console.log(`📥 正在下載網頁: ${url}`);
    try {
      const response = await axios.get(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        },
        timeout: 15000
      });
      console.log(`✅ 網頁下載成功 (${response.data.length} bytes)\n`);
      return response.data;
    } catch (error) {
      throw new Error(`下載網頁失敗: ${error.message}`);
    }
  }

  /**
   * 解析 HTML 並提取主要內容
   */
  extractMainContent(html) {
    console.log("🔍 正在分析 HTML 並提取主要內容...");
    const $ = cheerio.load(html);

    // 移除不需要的元素
    $("script, style, nav, header, footer, iframe, noscript").remove();

    // 嘗試找到主要內容區域
    let mainContent = "";
    const possibleSelectors = [
      "article",
      "main",
      '[role="main"]',
      ".content",
      ".main-content",
      "#content",
      ".post-content",
      ".entry-content"
    ];

    for (const selector of possibleSelectors) {
      const element = $(selector);
      if (element.length > 0) {
        mainContent = element.text();
        break;
      }
    }

    // 如果沒找到特定區域，使用 body
    if (!mainContent) {
      mainContent = $("body").text();
    }

    // 清理文字：移除多餘空白、換行
    mainContent = mainContent
      .replace(/\s+/g, " ")
      .replace(/\n+/g, "\n")
      .trim();

    // 提取標題
    const title = $("title").text() || $("h1").first().text() || "無標題";

    // 限制內容長度避免超出 token 限制
    const maxLength = 3000;
    if (mainContent.length > maxLength) {
      mainContent = mainContent.substring(0, maxLength) + "...";
    }

    console.log(`✅ 提取完成 - 標題: ${title}`);
    console.log(`📝 內容長度: ${mainContent.length} 字元\n`);

    return { title, content: mainContent };
  }

  /**
   * 使用 Copilot 進行內容處理
   */
  async processWithCopilot(prompt) {
    let session = null;
    
    try {
      // 創建新會話
      session = await this.client.createSession();

      // 使用 Promise 來處理事件回調
      const result = await new Promise((resolve, reject) => {
        let responseContent = "";

        // 註冊事件處理器（必須在 send 之前）
        session.on((event) => {
          if (event.type === "assistant.message_delta") {
            // 累積串流的 chunk 內容
            responseContent += event.data.deltaContent || "";
          } else if (event.type === "assistant.message") {
            // 完整訊息（如果有的話）
            responseContent = event.data.content || "";
          } else if (event.type === "session.idle") {
            resolve(responseContent);
          } else if (event.type === "session.error") {
            reject(new Error(event.data?.message || "處理時發生錯誤"));
          }
        });

        // 發送提示
        session.send({ prompt }).catch(reject);
      });

      return result;

    } finally {
      // 確保每個會話都被清理
      if (session) {
        try {
          await session.destroy();
        } catch (error) {
          console.warn("⚠️  會話清理警告:", error.message);
        }
      }
    }
  }

  /**
   * 總結網頁內容
   */
  async summarizeContent(title, content) {
    console.log("📊 正在總結內容...");
    
    const prompt = `請總結以下網頁內容，用繁體中文（zh-tw）回答：

標題：${title}

內容：
${content}

請提供一個完整、精確的摘要（約 200-300 字），涵蓋所有重點。`;

    const summary = await this.processWithCopilot(prompt);
    console.log("✅ 內容總結完成\n");
    return summary;
  }

  /**
   * 生成 3 種風格的臉書貼文（繁體中文）
   */
  async generateFacebookPosts(title, summary) {
    console.log("✍️  正在生成 3 種風格的繁體中文臉書貼文...");
    
    const prompt = `基於以下內容，請用繁體中文（zh-tw）撰寫 3 份不同風格的臉書貼文：

標題：${title}
摘要：${summary}

請分別用以下 3 種風格撰寫，每篇約 150-200 字：

1. 【專業新聞報導風格】- 正式、客觀、條理清晰
2. 【輕鬆搞笑風格】- 幽默、有趣、使用流行用語或梗
3. 【朋友聊天語氣】- 親切、口語化、像朋友分享

請按照以下格式輸出：

---風格一：專業新聞報導---
[內容]

---風格二：輕鬆搞笑---
[內容]

---風格三：朋友聊天---
[內容]`;

    const posts = await this.processWithCopilot(prompt);
    console.log("✅ 繁體中文貼文生成完成\n");
    return posts;
  }

  /**
   * 翻譯貼文為英文
   */
  async translateToEnglish(posts) {
    console.log("🌐 正在將貼文翻譯為英文...");
    
    const prompt = `請將以下 3 份繁體中文臉書貼文翻譯成英文，保持原有的風格和語氣：

${posts}

請保持相同的格式輸出，但標題改為英文：

---Style 1: Professional News Report---
[Content]

---Style 2: Casual & Humorous---
[Content]

---Style 3: Friendly Chat---
[Content]`;

    const translatedPosts = await this.processWithCopilot(prompt);
    console.log("✅ 英文翻譯完成\n");
    return translatedPosts;
  }

  /**
   * 清理資源
   */
  async cleanup() {
    if (this.client) {
      try {
        await this.client.stop();
      } catch (error) {
        console.warn("⚠️  客戶端清理警告:", error.message);
      }
      this.client = null;
    }
  }

  /**
   * 執行完整流程
   */
  async analyze(url) {
    try {
      // 1. 初始化
      await this.initialize();

      // 2. 下載網頁
      const html = await this.downloadWebpage(url);

      // 3. 提取主要內容
      const { title, content } = this.extractMainContent(html);

      // 4. 總結內容
      const summary = await this.summarizeContent(title, content);

      // 5. 生成繁體中文貼文
      const chinesePosts = await this.generateFacebookPosts(title, summary);

      // 6. 翻譯成英文
      const englishPosts = await this.translateToEnglish(chinesePosts);

      // 輸出結果
      console.log("═══════════════════════════════════════");
      console.log("📋 分析結果");
      console.log("═══════════════════════════════════════\n");
      
      console.log("🔖 標題:");
      console.log(title);
      console.log("\n" + "─".repeat(50) + "\n");
      
      console.log("📝 摘要:");
      console.log(summary);
      console.log("\n" + "─".repeat(50) + "\n");
      
      console.log("🇹🇼 繁體中文貼文:");
      console.log(chinesePosts);
      console.log("\n" + "─".repeat(50) + "\n");
      
      console.log("🇬🇧 英文貼文:");
      console.log(englishPosts);
      console.log("\n" + "═".repeat(50) + "\n");

      return {
        title,
        summary,
        chinesePosts,
        englishPosts
      };

    } catch (error) {
      console.error("❌ 錯誤:", error.message);
      throw error;
    } finally {
      // 確保資源被清理
      await this.cleanup();
      console.log("🧹 資源清理完成");
    }
  }
}

// 主程式
async function main() {
  const url = process.argv[2];

  if (!url) {
    console.error("❌ 請提供網址！");
    console.log("\n使用方式:");
    console.log("  node webpage-analyzer-agent.js <URL>");
    console.log("\n範例:");
    console.log("  node webpage-analyzer-agent.js https://example.com/article");
    process.exit(1);
  }

  // 驗證 URL 格式
  try {
    new URL(url);
  } catch {
    console.error("❌ 無效的 URL 格式！");
    process.exit(1);
  }

  console.log("\n╔══════════════════════════════════════╗");
  console.log("║     網頁分析代理人 v1.0              ║");
  console.log("╚══════════════════════════════════════╝\n");

  const agent = new WebpageAnalyzerAgent();
  
  try {
    await agent.analyze(url);
    console.log("✅ 所有任務完成！");
  } catch (error) {
    console.error("\n❌ 執行失敗:", error.message);
    process.exit(1);
  }
}

// 執行主程式
main().catch((error) => {
  console.error("\n💥 未預期的錯誤:", error);
  process.exit(1);
});
