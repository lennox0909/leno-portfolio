/**
 * Pathfinding Visualizer - 原生 JS 移植版
 * 保留原本的 Dijkstra 與 A* 演算法，將 React 狀態抽離為類別屬性
 */

class PathfindingVisualizer {
    constructor() {
        // 常數定義
        this.ROWS = 15;
        this.COLS = 35;
        this.START_NODE_ROW = 7;
        this.START_NODE_COL = 5;
        this.END_NODE_ROW = 7;
        this.END_NODE_COL = 29;

        // 狀態管理
        this.grid = [];
        this.isMousePressed = false;
        this.dragType = null; // 'start' | 'end' | 'wall' | 'eraser'
        this.isRunning = false;
        this.animationTimeouts = [];

        // DOM 綁定
        this.gridContainer = document.getElementById('path-grid');
        this.algoSelect = document.getElementById('algoSelect');
        this.toolSelect = document.getElementById('toolSelect');
        this.runBtn = document.getElementById('runBtn');
        this.resetBtn = document.getElementById('resetBtn');
        this.visitedCountDisp = document.getElementById('visitedCount');
        this.pathCountDisp = document.getElementById('pathCount');

        this.init();
    }

    init() {
        this.bindEvents();
        this.resetGrid(true);
    }

    bindEvents() {
        this.runBtn.addEventListener('click', () => this.runAlgorithm());
        this.resetBtn.addEventListener('click', () => this.resetGrid(true));
        
        // 滑鼠離開網格時停止拖曳
        this.gridContainer.addEventListener('mouseleave', () => this.handleMouseUp());
        // 釋放滑鼠全域監聽
        window.addEventListener('mouseup', () => this.handleMouseUp());
    }

    createNode(col, row) {
        return {
            col, row,
            isStart: row === this.START_NODE_ROW && col === this.START_NODE_COL,
            isEnd: row === this.END_NODE_ROW && col === this.END_NODE_COL,
            isWall: false,
        };
    }

    resetGrid(fullReset = false) {
        this.clearAnimations();
        this.visitedCountDisp.innerText = '0';
        this.pathCountDisp.innerText = '0';
        this.isRunning = false;
        this.setUIState(false);

        if (fullReset) {
            this.grid = [];
            this.gridContainer.innerHTML = '';
            
            for (let row = 0; row < this.ROWS; row++) {
                const currentRow = [];
                for (let col = 0; col < this.COLS; col++) {
                    const node = this.createNode(col, row);
                    currentRow.push(node);
                    this.renderNode(node); // 生成 DOM
                }
                this.grid.push(currentRow);
            }
        } else {
            // 僅清除動畫類別
            for (let row = 0; row < this.ROWS; row++) {
                for (let col = 0; col < this.COLS; col++) {
                    const el = document.getElementById(`node-${row}-${col}`);
                    if (el) {
                        el.classList.remove('animate-visited', 'animate-path');
                    }
                }
            }
        }
    }

    clearAnimations() {
        this.animationTimeouts.forEach(clearTimeout);
        this.animationTimeouts = [];
    }

    setUIState(disabled) {
        this.runBtn.disabled = disabled;
        this.resetBtn.disabled = disabled;
        this.algoSelect.disabled = disabled;
        this.toolSelect.disabled = disabled;
    }

    // --- 網格 DOM 渲染與事件綁定 ---
    renderNode(node) {
        const div = document.createElement('div');
        div.id = `node-${node.row}-${node.col}`;
        div.className = 'node';
        
        if (node.isStart) {
            div.classList.add('node-start');
            div.innerHTML = '<div class="node-inner"></div>';
        } else if (node.isEnd) {
            div.classList.add('node-end');
            div.innerHTML = '<div class="node-inner"></div>';
        }

        // 綁定滑鼠互動
        div.addEventListener('mousedown', (e) => { e.preventDefault(); this.handleMouseDown(node.row, node.col); });
        div.addEventListener('mouseenter', () => this.handleMouseEnter(node.row, node.col));
        
        this.gridContainer.appendChild(div);
    }

    updateDOMNode(row, col) {
        const node = this.grid[row][col];
        const el = document.getElementById(`node-${row}-${col}`);
        
        el.className = 'node';
        el.innerHTML = '';

        if (node.isStart) {
            el.classList.add('node-start');
            el.innerHTML = '<div class="node-inner"></div>';
        } else if (node.isEnd) {
            el.classList.add('node-end');
            el.innerHTML = '<div class="node-inner"></div>';
        } else if (node.isWall) {
            el.classList.add('node-wall');
        }
    }

    // --- 滑鼠互動邏輯 ---
    handleMouseDown(row, col) {
        if (this.isRunning) return;
        this.isMousePressed = true;
        const node = this.grid[row][col];
        const tool = this.toolSelect.value;

        if (node.isStart) {
            this.dragType = 'start';
        } else if (node.isEnd) {
            this.dragType = 'end';
        } else {
            const isErasing = tool === 'Eraser' || node.isWall;
            this.dragType = isErasing ? 'eraser' : 'wall';
            this.updateGridWall(row, col, !isErasing);
        }
    }

    handleMouseEnter(row, col) {
        if (!this.isMousePressed || this.isRunning) return;

        if (this.dragType === 'start' || this.dragType === 'end') {
            // 尋找舊的起終點並重置
            for (let r = 0; r < this.ROWS; r++) {
                for (let c = 0; c < this.COLS; c++) {
                    if (this.dragType === 'start' && this.grid[r][c].isStart) {
                        this.grid[r][c].isStart = false;
                        this.updateDOMNode(r, c);
                    }
                    if (this.dragType === 'end' && this.grid[r][c].isEnd) {
                        this.grid[r][c].isEnd = false;
                        this.updateDOMNode(r, c);
                    }
                }
            }
            // 設定新位置
            if (this.dragType === 'start') this.grid[row][col].isStart = true;
            if (this.dragType === 'end') this.grid[row][col].isEnd = true;
            this.updateDOMNode(row, col);

        } else if (this.dragType === 'wall' || this.dragType === 'eraser') {
            this.updateGridWall(row, col, this.dragType === 'wall');
        }
    }

    handleMouseUp() {
        this.isMousePressed = false;
        this.dragType = null;
    }

    updateGridWall(row, col, isWall) {
        const node = this.grid[row][col];
        if (!node.isStart && !node.isEnd) {
            node.isWall = isWall;
            this.updateDOMNode(row, col);
        }
    }

    // --- 演算法實作 ---
    runAlgorithm() {
        if (this.isRunning) return;
        this.resetGrid(false); // 僅清除舊動畫
        this.isRunning = true;
        this.setUIState(true);

        const algorithm = this.algoSelect.value;
        let startNode, endNode;

        for (const row of this.grid) {
            for (const node of row) {
                if (node.isStart) startNode = node;
                if (node.isEnd) endNode = node;
            }
        }
        if (!startNode || !endNode) return;

        const visitedNodesInOrder = [];
        const unvisitedNodes = [];
        const distances = new Map();
        const previousNodes = new Map();
        
        // 初始化參數
        for (const row of this.grid) {
            for (const node of row) {
                const id = `${node.row}-${node.col}`;
                distances.set(id, Infinity);
                previousNodes.set(id, null);
                unvisitedNodes.push(node);
            }
        }
        distances.set(`${startNode.row}-${startNode.col}`, 0);

        // A* 曼哈頓距離估算
        const heuristic = (node, target) => {
            return algorithm === 'AStar' ? Math.abs(node.row - target.row) + Math.abs(node.col - target.col) : 0;
        };

        // 核心迴圈
        while (unvisitedNodes.length > 0) {
            unvisitedNodes.sort((a, b) => {
                const distA = distances.get(`${a.row}-${a.col}`) + heuristic(a, endNode);
                const distB = distances.get(`${b.row}-${b.col}`) + heuristic(b, endNode);
                return distA - distB;
            });

            const closestNode = unvisitedNodes.shift();
            if (closestNode.isWall) continue;
            // 若被圍死則結束尋路
            if (distances.get(`${closestNode.row}-${closestNode.col}`) === Infinity) break;

            visitedNodesInOrder.push(closestNode);
            if (closestNode === endNode) break;

            // 尋找四周鄰居
            const { row, col } = closestNode;
            const neighbors = [];
            if (row > 0) neighbors.push(this.grid[row - 1][col]);
            if (row < this.ROWS - 1) neighbors.push(this.grid[row + 1][col]);
            if (col > 0) neighbors.push(this.grid[row][col - 1]);
            if (col < this.COLS - 1) neighbors.push(this.grid[row][col + 1]);

            for (const neighbor of neighbors.filter(n => !n.isWall)) {
                const alt = distances.get(`${closestNode.row}-${closestNode.col}`) + 1;
                if (alt < distances.get(`${neighbor.row}-${neighbor.col}`)) {
                    distances.set(`${neighbor.row}-${neighbor.col}`, alt);
                    previousNodes.set(`${neighbor.row}-${neighbor.col}`, closestNode);
                }
            }
        }

        // 回溯最短路徑
        const nodesInShortestPathOrder = [];
        let currentNode = endNode;
        // 確認是否真的有找到路 (有 previous 紀錄或它就是起點)
        if (previousNodes.get(`${currentNode.row}-${currentNode.col}`) || currentNode === startNode) {
             while (currentNode !== null) {
                nodesInShortestPathOrder.unshift(currentNode);
                currentNode = previousNodes.get(`${currentNode.row}-${currentNode.col}`) || null;
            }
        }

        this.animateAlgorithm(visitedNodesInOrder, nodesInShortestPathOrder);
    }

    animateAlgorithm(visitedNodes, pathNodes) {
        for (let i = 0; i <= visitedNodes.length; i++) {
            if (i === visitedNodes.length) {
                const t = setTimeout(() => {
                    this.animatePath(pathNodes);
                }, i * 15);
                this.animationTimeouts.push(t);
                return;
            }
            
            const t = setTimeout(() => {
                const node = visitedNodes[i];
                if (!node.isStart && !node.isEnd) {
                    const el = document.getElementById(`node-${node.row}-${node.col}`);
                    if (el) el.classList.add('animate-visited');
                }
                this.visitedCountDisp.innerText = i;
            }, i * 15);
            this.animationTimeouts.push(t);
        }
    }

    animatePath(pathNodes) {
        // 如果長度 > 1，代表成功找到路徑
        if (pathNodes.length > 1) {
            for (let i = 0; i < pathNodes.length; i++) {
                const t = setTimeout(() => {
                    const node = pathNodes[i];
                    if (!node.isStart && !node.isEnd) {
                        const el = document.getElementById(`node-${node.row}-${node.col}`);
                        if (el) el.classList.add('animate-path');
                    }
                    this.pathCountDisp.innerText = i;
                }, i * 30);
                this.animationTimeouts.push(t);
            }
        }
        
        // 動畫結束，解除按鈕鎖定
        const finalDelay = Math.max(0, pathNodes.length * 30);
        setTimeout(() => {
            this.isRunning = false;
            this.setUIState(false);
        }, finalDelay + 100);
    }
}

// 確保 DOM 載入後啟動
document.addEventListener('DOMContentLoaded', () => {
    new PathfindingVisualizer();
});