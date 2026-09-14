
## Project Tree

```text
📂 leno-portfolio (GitHub Pages 專案結構)
├── 📁 .github
│   └── 📁 workflows
│       └── 📄 jekyll-gh-pages.yml      # CI/CD 部署自動化 (SRP：專職發布)
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

GitHub Actions 透過 Workflow 協助開發者自動化建置、測試與部署（CI/CD）等軟體開發生命週期。以下是 Workflow 的架構解析與運作原理。

## 核心運作架構

```mermaid
graph TD
    Event["Event (觸發事件)"] -->|啟動| WF["Workflow (工作流程)"]
    WF --> J1["Job 1: 測試 (Test)"]
    WF --> J2["Job 2: 部署 (Deploy)"]
    
    J1 -. "needs (相依性)" .-> J2
    
    subgraph "執行於 Runner A (例如 ubuntu-latest)"
        J1 --> S1["Step 1: uses (呼叫 Checkout Action)"]
        S1 --> S2["Step 2: run (執行測試腳本)"]
    end
    
    subgraph "執行於 Runner B"
        J2 --> S3["Step 1: uses (呼叫 Download Action)"]
        S3 --> S4["Step 2: run (執行部署指令)"]
    end
```
## 核心元件解析

| 元件名稱 | 英文 | 說明與職責 |
| :--- | :--- | :--- |
| **工作流程** | Workflow | 頂層的自動化程序，定義在 `.github/workflows/` 目錄下的 YAML 檔案中，可包含一個或多個任務。 |
| **觸發事件** | Event | 啟動流程的條件。常見如程式碼推送 (`push`)、建立合併請求 (`pull_request`)、定時排程 (`schedule`) 或手動觸發 (`workflow_dispatch`)。 |
| **任務** | Job | Workflow 內的執行單元。多個 Job 預設會在各自的獨立環境中**平行**執行，但可透過 `needs` 屬性設定嚴格的先後順序。 |
| **步驟** | Step | Job 內的單個指令。所有 Step 會按照順序在同一個環境上執行，彼此之間能共享資料夾（Workspace）與環境變數。 |
| **動作** | Action | 最基礎的模組化封裝單元，能重複呼叫以減少冗餘程式碼。例如官方提供的 `actions/checkout@v4`，用來自動拉取儲存庫代碼。 |
| **執行器** | Runner | 負責運行 Job 的伺服器虛擬機。可直接使用 GitHub 託管的機器（如 `ubuntu-latest`、`windows-latest`），也可自行架設（Self-hosted）。 |

## YAML 配置實戰結構
以下為一個標準的 CI/CD 流程範例，展示各元件如何組合：

```yaml
# 定義 Workflow 名稱
name: 生產環境自動化部署

# 定義 Event：當 main 分支有程式碼推送時觸發
on:
  push:
    branches: [ "main" ]

jobs:
  # 定義 Job 1：建置與測試
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - name: 檢出代碼 (呼叫 Action)
        uses: actions/checkout@v4
      
      - name: 執行編譯與測試 (執行腳本)
        run: |
          echo "開始編譯專案..."
          npm install
          npm run test

  # 定義 Job 2：部署
  deploy:
    needs: build-and-test # 設定相依，必須等 build-and-test 成功才會執行
    runs-on: ubuntu-latest
    steps:
      - name: 執行正式機發布
        run: echo "將產物部署至遠端伺服器"
```