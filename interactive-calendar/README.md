# 在线交互日历

简洁的在线交互日历：查看任意月份、点选日期、快速回到今天。

- 纯原生 HTML + CSS + JavaScript，单文件 `index.html`，无任何框架与依赖
- 周一作为一周开始，自动高亮"今天"
- 支持上/下月切换与"今天"按钮，日期计算使用 UTC 正午避免时区边界错误
- 支持键盘操作（Tab + Enter/空格 选择日期）

源自 ChatGPT 分享页 [interactive-calendar-preview](https://interactive-calendar-preview.beltrandoherty7681.chatgpt.site) 的本地开源复刻版。

## 本地运行

直接用浏览器打开 `index.html`，或：

```bash
python3 -m http.server 8080
# 访问 http://localhost:8080/interactive-calendar/
```
