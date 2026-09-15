const contentData = {
    model: {
        title: "資料模型 (Data Model) // 專有名詞解析",
        body: `
            <p>Matter 的核心在於其高度標準化的資料模型，所有設備皆須遵循這套由上而下的階層架構：</p>
            <ul>
                <li><span class="highlight">Node (節點)</span>：網路上的一個實體或邏輯設備（例如：智慧插座、橋接器）。它是網路定址（IPv6）的基本單位。</li>
                <li><span class="highlight">Endpoint (端點)</span>：Node 內部的功能實體。如果 Node 是一條多孔延長線，每個獨立的插座就是一個 Endpoint。Endpoint 0 保留給設備本身的管理（Utility）功能。</li>
                <li><span class="highlight">Cluster (叢集)</span>：特定功能的集合。例如 <code>On/Off Cluster</code> 負責開關控制，<code>Level Control Cluster</code> 負責亮度或音量。Cluster 分為 Server（提供狀態）與 Client（發送指令）。</li>
                <li><span class="highlight">Attribute (屬性) & Command (指令)</span>：Cluster 內部的具體資料。Attribute 記錄當前狀態（如：電量 80%），Command 則是動作觸發（如：Toggle 切換）。</li>
            </ul>`
    },
    integration: {
        title: "生態系整合 // Apple / Google / HA",
        body: `
            <p>將 Matter 設備整合至市面主流平台（如 Apple HomeKit, Google Home, Home Assistant）不再需要針對各家開發專屬 SDK。其運作機制如下：</p>
            <h3>1. 發現與配對 (mDNS & BLE)</h3>
            <p>設備上電後，透過 <span class="cyan-text">Bluetooth LE (BLE)</span> 廣播配對訊號。手機上的 Home App 或 Google Home App 接收後，透過掃描 QR Code 或輸入設定碼（Setup Payload）建立初始安全通道 (PASE)。設備加入 Wi-Fi/Thread 網路後，改用 <span class="cyan-text">mDNS (Multicast DNS)</span> 進行區域網路內的服務發現。</p>
            <h3>2. 憑證與認證 (Device Attestation)</h3>
            <p>各大平台在配對時，會向 DCL (分散式合規帳本) 驗證設備的 DAC（設備認證憑證）。通過後，平台（如 Apple 軟體路由器或 Google Nest Hub）會簽發一張該生態系專屬的 Node Operational Certificate (NOC) 給設備，正式納入該生態系（Fabric）。</p>
            <h3>3. 開放原始碼整合 (Home Assistant)</h3>
            <p>對於 Home Assistant 玩家，Matter 整合需要運行 <code>Matter Server</code> 附加元件。透過 WebSocket 與 HA Core 通訊，直接將 IPv6 網路中的 Matter Endpoint 對映為 HA 的標準 Entity（如 <code>light</code>, <code>switch</code>）。</p>`
    },
    hardware: {
        title: "硬體架構 // MCU 特殊需求",
        body: `
            <p>Matter 協定極為龐大，對終端設備（Edge Devices）的微控制器（MCU）提出了嚴苛的要求，遠高於傳統的 ESP8266 或一般 Zigbee 晶片：</p>
            <ul>
                <li><span class="highlight">Flash 記憶體 (ROM)</span>：至少需要 <span class="cyan-text">1MB ~ 2MB</span> 甚至更高。Matter SDK 核心堆疊加上加密庫（mbedTLS）佔用極大。若支援雙分區 OTA（Over-the-Air）升級，容量需求直接翻倍。</li>
                <li><span class="highlight">SRAM (記憶體)</span>：至少需要 <span class="cyan-text">256KB ~ 320KB</span> 以上。若設備需要支援多個 Fabric（Multi-Admin），每個 Fabric 的連線與加密狀態都需要消耗額外的 RAM。</li>
                <li><span class="highlight">加密硬體加速器</span>：強烈建議 MCU 具備硬體 AES, ECC, SHA256 加速單元，否則在 PASE/CASE 安全交握階段會導致嚴重的延遲（Timeout）。</li>
                <li><span class="highlight">雙模通訊晶片</span>：若為 Thread 設備，晶片必須支援 802.15.4 (Thread) + BLE (用於配網)。例如 ESP32-H2 或 NXP K32W 系統。</li>
            </ul>`
    },
    network: {
        title: "網通特殊需求 // IPv6 與 Thread",
        body: `
            <p>Matter 拋棄了傳統特定協定的限制，完全建構於 IP 網路之上：</p>
            <h3>1. 絕對的 IPv6 依賴</h3>
            <p>Matter <span class="highlight">不支援 IPv4</span>。局域網內的路由器必須支援並正確派發 IPv6 本地鏈路位址（Link-Local Address）與 ULA。多播（Multicast）功能對於 mDNS 發現至關重要，若企業級 AP 阻擋多播，Matter 將無法配對與通訊。</p>
            <h3>2. 邊界路由器 (Border Router)</h3>
            <p>若是基於 Thread 的 Matter 設備，無法直接連上 Wi-Fi。環境中必須存在至少一台 <span class="cyan-text">Thread Border Router (TBR)</span>（例如 Apple HomePod mini、Google Nest Hub 或配置好 HA 的自建 TBR）。TBR 負責將 802.15.4 網狀網路的封包，無縫轉譯為區域網路的 IPv6 封包，不涉及應用層的轉譯，實現真正的端到端通訊。</p>`
    },
    multiadmin: {
        title: "Multi-Admin // 多網域控制架構",
        body: `
            <p>這是 Matter 最具革命性的功能，允許同一個設備「同時」被加入多個生態系（Fabrics），而不需要解綁。</p>
            <ul>
                <li><span class="highlight">Fabric (網域/生態系)</span>：每個平台（如 HomeKit）都會在設備內建立一個獨立的 Fabric 空間。</li>
                <li><span class="highlight">ACL (存取控制串列)</span>：Matter 透過 ACL 確保安全性。Google 的 Fabric 無法讀取 Apple Fabric 的私有金鑰或配置。</li>
                <li><span class="highlight">ECW (Enhanced Commissioning Window)</span>：當設備已加入 HomeKit，使用者可從 Home App 開啟「配對模式」，設備會產生一組新的配對碼。此時打開 Google Home App 輸入該碼，設備即可利用既有的 Wi-Fi/Thread 網路，與 Google 建立第二組 CASE 加密通道。</li>
            </ul>`
    },
    software: {
        title: "軟體架構 // 依賴與 SDK",
        body: `
            <p>Matter 的軟體層不再是簡單的迴圈，而是需要完整的作業系統支援：</p>
            <h3>1. 嵌入式作業系統 (RTOS)</h3>
            <p>Matter SDK (Connectedhomeip) 高度依賴多執行緒，必須運行於 FreeRTOS、Zephyr 或 Linux 之上，用於處理並發的網路請求、加密交握與實體硬體控制。</p>
            <h3>2. ZCL (Zigbee Cluster Library) 的繼承</h3>
            <p>Matter 應用層的資料模型大量借鑒了 Zigbee 的架構。開發者需要使用 XML 定義設備的 Endpoint 與 Cluster，然後透過 Matter 的腳本工具（如 ZAP Tool）自動生成 C++ 程式碼架構，大幅改變了傳統物聯網設備的開發流程。</p>`
    }
};

// 處理選單點擊與面板切換
function loadContent(key) {
    const data = contentData[key];
    if(!data) return;
    
    // 隱藏中央的 MATTER 發光文字
    document.getElementById('main-svg').style.opacity = '0';
    document.getElementById('main-svg').style.pointerEvents = 'none';

    // 更新並顯示內容面板
    const panel = document.getElementById('content-panel');
    document.getElementById('panel-title').innerText = data.title;
    document.getElementById('panel-body').innerHTML = data.body;
    
    // 觸發重新渲染以重啟淡入動畫
    panel.classList.remove('active');
    void panel.offsetWidth; 
    panel.classList.add('active');
}