
## Project Tree

```text
📂 sci-fi-portfolio (GitHub Pages 專案結構)
├── 📁 .github
│   └── 📁 workflows
│       └── 📄 deploy.yml      # CI/CD 部署自動化 (SRP：專職發布)
├── 📁 _data
│   └── 📄 site_config.json    # 網站與導覽列資料 (OCP, DIP：內容與結構分離)
├── 📁 assets
│   ├── 📄 style.css           # 全域視覺樣式 (SRP：專職排版)
│   └── 📄 app.js              # 核心邏輯與動畫模組 (SRP：專職互動)
├── 📁 _includes
│   ├── 📄 head.html           # Meta 與樣式引入 (CARP：組件聚合)
│   └── 📄 nav.html            # 導覽列模板，讀取 _data 動態生成 (LSP：確保結構一致)
└── 📄 index.html              # 主頁面入口，負責拼裝各組件

```