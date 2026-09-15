/**
 * GNN Traffic Simulator - 原生 JS 移植版
 * 運用 D3.js v7 建構力導向圖，並實作波前擴散 (Wave-front) 邏輯
 */

class GNNTrafficSimulator {
    constructor() {
        // DOM 元件綁定
        this.svg = d3.select('#traffic-svg');
        this.ui = {
            densitySlider: document.getElementById('densitySlider'),
            densityDisp: document.getElementById('densityDisp'),
            triggerBtn: document.getElementById('triggerBtn'),
            resetBtn: document.getElementById('resetBtn'),
            affectedDisp: document.getElementById('affectedDisp'),
            systemLoadDisp: document.getElementById('systemLoadDisp')
        };

        // 狀態管理
        this.density = 0.5;
        this.affectedNodes = 0;
        this.systemLoad = 'Normal';
        this.intervals = [];
        this.simulation = null;
        this.nodes = [];
        this.links = [];

        this.init();
    }

    init() {
        this.bindEvents();
        this.renderGraph();
    }

    bindEvents() {
        this.ui.densitySlider.addEventListener('input', (e) => {
            this.density = parseFloat(e.target.value);
            this.ui.densityDisp.textContent = this.density.toFixed(1);
            this.resetSimulator();
        });

        this.ui.triggerBtn.addEventListener('click', () => {
            // 隨機選一個節點，或固定觸發 n22 模擬原始 React 邏輯
            this.triggerCongestionFromNode('n22');
        });

        this.ui.resetBtn.addEventListener('click', () => {
            this.resetSimulator();
        });
    }

    clearAllIntervals() {
        this.intervals.forEach(clearInterval);
        this.intervals = [];
    }

    updateStats() {
        this.ui.affectedDisp.textContent = this.affectedNodes;
        this.ui.systemLoadDisp.textContent = this.systemLoad;

        // 依據負載狀態改變顏色
        this.ui.systemLoadDisp.className = 'stat-value';
        if (this.systemLoad === 'Critical') {
            this.ui.systemLoadDisp.classList.add('text-red');
        } else if (this.systemLoad === 'Warning') {
            this.ui.systemLoadDisp.classList.add('text-yellow');
        } else {
            this.ui.systemLoadDisp.classList.add('text-blue');
        }
    }

    resetSimulator() {
        this.clearAllIntervals();
        if (this.simulation) this.simulation.stop();
        this.affectedNodes = 0;
        this.systemLoad = 'Normal';
        this.updateStats();
        this.renderGraph();
    }

    // --- D3 圖表建構邏輯 ---
    renderGraph() {
        const width = 800;
        const height = 350;
        
        this.svg.attr('viewBox', `0 0 ${width} ${height}`);
        this.svg.selectAll('*').remove(); // 清空畫布

        const cols = 9;
        const rows = 5;
        const xSpacing = 85;
        const ySpacing = 70;
        const xOffset = (width - (cols - 1) * xSpacing) / 2;
        const yOffset = (height - (rows - 1) * ySpacing) / 2;

        // 建立節點
        this.nodes = Array.from({ length: cols * rows }, (_, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            return {
                id: `n${i}`,
                isCongested: false,
                x: xOffset + col * xSpacing,
                y: yOffset + row * ySpacing,
                fx: xOffset + col * xSpacing,
                fy: yOffset + row * ySpacing
            };
        });

        // 建立連結 (包含依賴密度的對角線)
        this.links = [];
        for (let i = 0; i < this.nodes.length; i++) {
            const row = Math.floor(i / cols);
            const col = i % cols;
            
            if (col < cols - 1) this.links.push({ id: `l-${i}-h`, source: this.nodes[i].id, target: this.nodes[i + 1].id, weight: 1 });
            if (row < rows - 1) this.links.push({ id: `l-${i}-v`, source: this.nodes[i].id, target: this.nodes[i + cols].id, weight: 1 });
            
            if (Math.random() < this.density && col < cols - 1 && row < rows - 1) {
                this.links.push({ id: `l-${i}-d1`, source: this.nodes[i].id, target: this.nodes[i + cols + 1].id, weight: 1 });
                if (Math.random() > 0.5) {
                    this.links.push({ id: `l-${i}-d2`, source: this.nodes[i + 1].id, target: this.nodes[i + cols].id, weight: 1 });
                }
            }
        }

        // 啟動 D3 力導向模擬
        this.simulation = d3.forceSimulation(this.nodes)
            .force('link', d3.forceLink(this.links).id(d => d.id))
            .force('charge', d3.forceManyBody().strength(-50));

        // 建立圖層順序：線條 -> 粒子 -> 節點光暈與核心
        const linksLayer = this.svg.append('g').attr('class', 'links-layer');
        const particlesLayer = this.svg.append('g').attr('class', 'particles-layer');
        const nodesLayer = this.svg.append('g').attr('class', 'nodes-layer');

        const link = linksLayer.selectAll('line').data(this.links).enter().append('line')
            .attr('id', d => d.id)
            .attr('stroke', '#4ade80') // 預設安全綠色
            .attr('stroke-width', 2)
            .attr('class', 'road-link');

        // 拖曳行為
        const drag = d3.drag()
            .on('start', (event, d) => {
                if (!event.active) this.simulation.alphaTarget(0.3).restart();
            })
            .on('drag', (event, d) => {
                d.fx = event.x;
                d.fy = event.y;
            })
            .on('end', (event, d) => {
                if (!event.active) this.simulation.alphaTarget(0);
            });

        // 節點群組與點擊事件
        const nodeGroup = nodesLayer.selectAll('g').data(this.nodes).enter().append('g')
            .attr('class', 'cursor-grab')
            .call(drag)
            .on('click', (event, d) => {
                if (event.defaultPrevented) return;
                this.triggerCongestionFromNode(d.id);
            });

        // 節點外層光暈
        nodeGroup.append('circle')
            .attr('id', d => `glow-${d.id}`)
            .attr('r', 16)
            .attr('fill', 'none')
            .attr('stroke', 'rgba(255, 255, 255, 0.05)')
            .attr('stroke-width', 1)
            .style('transition', 'all 0.3s ease');

        // 節點中心實體
        nodeGroup.append('circle')
            .attr('id', d => `core-${d.id}`)
            .attr('r', 6)
            .attr('fill', '#475569')
            .attr('stroke', '#94a3b8')
            .attr('stroke-width', 2)
            .style('transition', 'all 0.3s ease');

        // 模擬刻度更新
        this.simulation.on('tick', () => {
            link.attr('x1', d => d.source.x).attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
            nodeGroup.attr('transform', d => `translate(${d.x},${d.y})`);
        });

        // 車流粒子特效
        const spawnParticle = () => {
            if (this.links.length === 0) return;
            const targetLink = this.links[Math.floor(Math.random() * this.links.length)];
            const source = targetLink.source;
            const target = targetLink.target;
            
            particlesLayer.append('circle')
                .attr('r', 1.5)
                .attr('fill', '#ffffff')
                .attr('cx', source.x)
                .attr('cy', source.y)
                .style('opacity', 0.8)
                .transition().duration(1500 + Math.random() * 1500).ease(d3.easeLinear)
                .attr('cx', target.x)
                .attr('cy', target.y)
                .on('end', function() { d3.select(this).remove(); });
        };

        const particleInterval = window.setInterval(spawnParticle, 150);
        this.intervals.push(particleInterval);
    }

    // --- 波前雙色壅塞擴散動畫 ---
    triggerCongestionFromNode(startNodeId) {
        const visitedNodes = new Set([startNodeId]);
        const visitedLinks = new Set();
        
        let currentLevel = [startNodeId];
        let affectedCount = 1;

        this.systemLoad = 'Warning';
        this.affectedNodes = affectedCount;
        this.updateStats();
        
        // 初始起點染為黃色 (Warning 前導波)
        this.svg.select(`#core-${startNodeId}`).attr('fill', '#fbbf24').attr('stroke', '#f59e0b');
        this.svg.select(`#glow-${startNodeId}`).attr('stroke', '#fbbf24').attr('r', 20).style('opacity', 0.6).attr('stroke-width', 2);

        const interval = window.setInterval(() => {
            if (currentLevel.length === 0) {
                clearInterval(interval);
                if (affectedCount > 15) {
                    this.systemLoad = 'Critical';
                    this.updateStats();
                }
                return;
            }
            
            // 1. 將上一波的黃色 (Warning) 轉為紅色 (Critical)
            currentLevel.forEach(id => {
                this.svg.select(`#core-${id}`).transition().duration(400).attr('fill', '#fca5a5').attr('stroke', '#f87171');
                this.svg.select(`#glow-${id}`).transition().duration(400).attr('stroke', '#fca5a5').attr('r', 24).style('opacity', 0.3).attr('stroke-width', 6);
            });

            const nextLevel = [];
            
            this.svg.selectAll('.road-link').each((d, i, nodes) => {
                const element = nodes[i];
                const sourceId = d.source.id;
                const targetId = d.target.id;
                const isSourceCurrent = currentLevel.includes(sourceId);
                const isTargetCurrent = currentLevel.includes(targetId);

                if ((isSourceCurrent || isTargetCurrent) && !visitedLinks.has(d.id)) {
                    // 線段變為壅塞前導色 (黃色)
                    d3.select(element).transition().duration(300).attr('stroke', '#fbbf24').attr('stroke-width', 4);
                    visitedLinks.add(d.id);
                    
                    // 後續轉為紅色
                    d3.select(element).transition().delay(400).duration(400).attr('stroke', '#fca5a5');
                }

                if (isSourceCurrent && !visitedNodes.has(targetId)) {
                    this.svg.select(`#core-${targetId}`).transition().delay(150).duration(300).attr('fill', '#fbbf24').attr('stroke', '#f59e0b');
                    this.svg.select(`#glow-${targetId}`).transition().delay(150).duration(300).attr('stroke', '#fbbf24').attr('r', 20).style('opacity', 0.6).attr('stroke-width', 2);
                    visitedNodes.add(targetId);
                    nextLevel.push(targetId);
                    affectedCount++;
                } else if (isTargetCurrent && !visitedNodes.has(sourceId)) {
                    this.svg.select(`#core-${sourceId}`).transition().delay(150).duration(300).attr('fill', '#fbbf24').attr('stroke', '#f59e0b');
                    this.svg.select(`#glow-${sourceId}`).transition().delay(150).duration(300).attr('stroke', '#fbbf24').attr('r', 20).style('opacity', 0.6).attr('stroke-width', 2);
                    visitedNodes.add(sourceId);
                    nextLevel.push(sourceId);
                    affectedCount++;
                }
            });

            currentLevel = nextLevel;
            this.affectedNodes = affectedCount;
            this.updateStats();

        }, 600); // 擴散速度
        
        this.intervals.push(interval);
    }
}

// 啟動應用程式
document.addEventListener('DOMContentLoaded', () => {
    new GNNTrafficSimulator();
});