# AI 资源导航（数据驱动）

AI 资源站点导航：**AI 资讯 / AI 工具 / AI 充值 / 音效素材** 等分类收录，支持搜索与分类筛选。

## 数据驱动（核心）

**所有内容来自 `data.json`**——增删改站点只需编辑这个文件，刷新页面即生效，不用碰任何代码：

```jsonc
{
  "site": { "title": "...", "subtitle": "..." },
  "categories": [
    {
      "id": "news",              // 分类 id（唯一）
      "name": "AI 资讯",          // 分类显示名
      "icon": "📰",              // 分类图标（emoji）
      "items": [                  // 该分类下的站点
        {
          "name": "站点名",
          "url":  "https://…",
          "desc": "一句话介绍",
          "tags": ["标签1", "标签2"]
        }
      ]
    }
  ]
}
```

- **新增分类**：往 `categories` 加一个对象
- **新增站点**：往某分类 `items` 加一条
- **删除**：删掉对应对象即可

> `data-fallback.js` 是 data.json 的镜像兜底（直接双击 index.html 用 file:// 打开时 fetch 会失败，自动用它渲染）。改完 data.json 后同步跑一下仓库里生成它的命令即可（README 未提供的可直接复制内容）。

## 当前收录

- 📰 AI 资讯：ai-bot.cn 每日资讯 / 量子位 / 机器之心…
- 🛠️ AI 工具：devs.li / ChatGPT / Claude / Gemini / Hugging Face
- 💰 AI 充值：bewild.ai/subscribe
- 🎧 音效素材：Pixabay / Taira Komori / 爱给网 / ear0 / Freesound

## 运行

```bash
python3 -m http.server 8080
# 访问 http://localhost:8080/ai-nav/
```

直接双击 index.html 也能看（使用内置兜底数据）。
