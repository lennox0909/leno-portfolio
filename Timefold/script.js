/**
 * Timefold VRP 啟發式演算法 - 原生 JS 移植版
 * 沿用局部搜尋 (Local Search) 演算法邏輯，移除 React 依賴以優化 Canvas 效能
 */

class VRPSimulator {
    constructor() {
        this.canvas = document.getElementById('vrpCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // 常數設定
        this.NODE_COUNT = 35;
        // 替換為高對比的賽博龐克螢光色系
        this.VEHICLE_COLORS = ['#ff0055', '#00e5ff', '#39ff14', '#ffaa00', '#b800ff'];
        this.ITERATIONS_PER_FRAME = 200;

        // 狀態變數
        this.vehicleCount = 3;
        this.isOptimizing = false;
        this.totalDistance = 0;
        this.iterationCount = 0;
        this.animationFrameId = null;

        // 資料結構
        this.depot = { id: 0, x: 0.5, y: 0.5, isDepot: true };
        this.nodes = [];
        this.routes = [];

        // DOM 元件綁定
        this.ui = {
            slider: document.getElementById('vehicleSlider'),
            countDisp: document.getElementById('vehicleCountDisp'),
            optBtn: document.getElementById('optimizeBtn'),
            optText: document.getElementById('optimizeText'),
            playIcon: document.querySelector('.play-icon'),
            pauseIcon: document.querySelector('.pause-icon'),
            resetBtn: document.getElementById('resetBtn'),
            distDisp: document.getElementById('totalDistanceDisp'),
            iterDisp: document.getElementById('iterationDisp'),
            nodeDisp: document.getElementById('nodeCountDisp')
        };

        this.init();
    }

    init() {
        this.ui.nodeDisp.textContent = this.NODE_COUNT;
        this.bindEvents();
        this.handleResize();
        window.addEventListener('resize', () => this.handleResize());
        this.reset();
    }

    bindEvents() {
        this.ui.slider.addEventListener('input', (e) => {
            this.vehicleCount = parseInt(e.target.value);
            this.ui.countDisp.textContent = this.vehicleCount;
            this.stopOptimization();
            this.generateInitialRoutes();
            this.draw();
        });

        this.ui.optBtn.addEventListener('click', () => {
            this.isOptimizing = !this.isOptimizing;
            this.updateBtnUI();
            if (this.isOptimizing) {
                this.optimizeStep();
            } else {
                cancelAnimationFrame(this.animationFrameId);
            }
        });

        this.ui.resetBtn.addEventListener('click', () => this.reset());
    }

    updateBtnUI() {
        if (this.isOptimizing) {
            this.ui.optBtn.classList.replace('primary', 'secondary');
            this.ui.optBtn.style.borderColor = 'var(--tron-orange)';
            this.ui.optBtn.style.color = 'var(--tron-orange)';
            this.ui.optText.textContent = '暫停優化';
            this.ui.playIcon.classList.add('hidden');
            this.ui.pauseIcon.classList.remove('hidden');
        } else {
            this.ui.optBtn.classList.replace('secondary', 'primary');
            this.ui.optBtn.style.borderColor = '';
            this.ui.optBtn.style.color = '';
            this.ui.optText.textContent = '執行最佳化';
            this.ui.playIcon.classList.remove('hidden');
            this.ui.pauseIcon.classList.add('hidden');
        }
    }

    reset() {
        this.stopOptimization();
        this.initializeNodes();
        this.generateInitialRoutes();
        this.draw();
    }

    stopOptimization() {
        this.isOptimizing = false;
        this.updateBtnUI();
        cancelAnimationFrame(this.animationFrameId);
    }

    handleResize() {
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = window.innerWidth * dpr;
        this.canvas.height = window.innerHeight * dpr;
        this.ctx.scale(dpr, dpr);
        this.draw();
    }

    // 計算兩點距離
    calculateDistance(p1, p2) {
        return Math.hypot(p1.x - p2.x, p1.y - p2.y);
    }

    // 計算總路徑長
    calculateTotalDistance(routes) {
        let total = 0;
        routes.forEach(route => {
            if (route.length === 0) return;
            total += this.calculateDistance(this.depot, route[0]);
            for (let i = 0; i < route.length - 1; i++) {
                total += this.calculateDistance(route[i], route[i + 1]);
            }
            total += this.calculateDistance(route[route.length - 1], this.depot);
        });
        return total;
    }

    // 初始化隨機節點
    initializeNodes() {
        this.nodes = [];
        // 保留中央區域給 UI，將點散佈在畫面上 (避開邊緣與面板)
        for (let i = 1; i <= this.NODE_COUNT; i++) {
            this.nodes.push({
                id: i,
                x: 0.1 + Math.random() * 0.8,
                y: 0.2 + Math.random() * 0.6,
                isDepot: false
            });
        }
    }

    // 產生初始解 (故意隨機以凸顯優化過程)
    generateInitialRoutes() {
        this.routes = Array.from({ length: this.vehicleCount }, () => []);
        const shuffledNodes = [...this.nodes].sort(() => Math.random() - 0.5);
        shuffledNodes.forEach((node, index) => {
            this.routes[index % this.vehicleCount].push(node);
        });

        this.totalDistance = this.calculateTotalDistance(this.routes);
        this.iterationCount = 0;
        this.updateStatsUI();
    }

    updateStatsUI() {
        this.ui.distDisp.textContent = Math.round(this.totalDistance * 1000).toLocaleString();
        this.ui.iterDisp.textContent = this.iterationCount.toLocaleString();
    }

    // 核心演算法：局部搜尋
    optimizeStep() {
        if (!this.isOptimizing) return;

        let currentRoutes = this.routes.map(route => [...route]);
        let currentDist = this.totalDistance;
        let improved = false;

        for (let iter = 0; iter < this.ITERATIONS_PER_FRAME; iter++) {
            const v1Index = Math.floor(Math.random() * this.vehicleCount);
            const v2Index = Math.floor(Math.random() * this.vehicleCount);
            const newRoutes = currentRoutes.map(route => [...route]);
            
            if (v1Index === v2Index) {
                // 2-opt 交換 (解開交叉線)
                const route = newRoutes[v1Index];
                if (route.length > 2) {
                    let i = Math.floor(Math.random() * route.length);
                    let j = Math.floor(Math.random() * route.length);
                    if (i > j) [i, j] = [j, i];
                    
                    const segment = route.slice(i, j + 1).reverse();
                    newRoutes[v1Index] = [
                        ...route.slice(0, i),
                        ...segment,
                        ...route.slice(j + 1)
                    ];
                }
            } else {
                // 跨路線轉移 (Relocate)
                if (newRoutes[v1Index].length > 0) {
                    const fromIndex = Math.floor(Math.random() * newRoutes[v1Index].length);
                    const toIndex = Math.floor(Math.random() * (newRoutes[v2Index].length + 1));
                    const node = newRoutes[v1Index].splice(fromIndex, 1)[0];
                    newRoutes[v2Index].splice(toIndex, 0, node);
                }
            }

            const newDist = this.calculateTotalDistance(newRoutes);
            if (newDist < currentDist) {
                currentRoutes = newRoutes;
                currentDist = newDist;
                improved = true;
            }
        }

        if (improved) {
            this.routes = currentRoutes;
            this.totalDistance = currentDist;
        }

        this.iterationCount += this.ITERATIONS_PER_FRAME;
        this.updateStatsUI();
        this.draw();

        if (this.isOptimizing) {
            this.animationFrameId = requestAnimationFrame(() => this.optimizeStep());
        }
    }

    // 繪製畫面
    draw() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        // 為了讓 CSS 的賽博龐克背景透射出來，我們只清空畫布，不填滿底色
        this.ctx.clearRect(0, 0, width, height);

        this.ctx.lineWidth = 2.5;
        this.ctx.lineJoin = 'round';
        this.ctx.lineCap = 'round';

        // 繪製路線
        this.routes.forEach((route, index) => {
            if (route.length === 0) return;
            const color = this.VEHICLE_COLORS[index % this.VEHICLE_COLORS.length];
            
            this.ctx.beginPath();
            // 發光線條效果
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = color;
            this.ctx.strokeStyle = color + 'AA'; // 帶點透明
            
            this.ctx.moveTo(this.depot.x * width, this.depot.y * height);
            route.forEach(node => {
                this.ctx.lineTo(node.x * width, node.y * height);
            });
            this.ctx.lineTo(this.depot.x * width, this.depot.y * height);
            this.ctx.stroke();
            this.ctx.shadowBlur = 0; // 重置陰影避免影響節點繪製

            // 繪製節點
            route.forEach(node => {
                this.ctx.beginPath();
                this.ctx.arc(node.x * width, node.y * height, 5, 0, Math.PI * 2);
                this.ctx.fillStyle = '#020205'; 
                this.ctx.fill();
                this.ctx.lineWidth = 2;
                this.ctx.strokeStyle = color;
                this.ctx.stroke();
            });
        });

        // 繪製中央集散地 (Depot)
        const dx = this.depot.x * width;
        const dy = this.depot.y * height;
        
        const gradient = this.ctx.createRadialGradient(dx, dy, 2, dx, dy, 25);
        gradient.addColorStop(0, 'rgba(0, 255, 255, 0.8)');
        gradient.addColorStop(1, 'rgba(0, 255, 255, 0)');
        this.ctx.beginPath();
        this.ctx.arc(dx, dy, 25, 0, Math.PI * 2);
        this.ctx.fillStyle = gradient;
        this.ctx.fill();

        this.ctx.beginPath();
        this.ctx.rect(dx - 8, dy - 8, 16, 16);
        this.ctx.fillStyle = '#fff';
        this.ctx.fill();
        this.ctx.strokeStyle = '#0ff';
        this.ctx.lineWidth = 3;
        this.ctx.stroke();
    }
}

// 確保 DOM 載入後啟動程式
document.addEventListener('DOMContentLoaded', () => {
    new VRPSimulator();
});