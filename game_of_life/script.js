window.onload = function () {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const container = document.getElementById('canvas-container');

    // 遊戲設定
    const resolution = 7.5; // 每個細胞的像素大小
    let cols, rows;
    let grid;
    let isPlaying = false;
    let animationId;
    let isDrawing = false;
    let lastDrawPos = { col: -1, row: -1 };
    let drawMode = 1; // 1: 畫筆, 0: 橡皮擦 (Debug優化: 支援擦除)

    // 規則拉桿設定
    const sMinInput = document.getElementById('surviveMin');
    const sMaxInput = document.getElementById('surviveMax');
    const rMinInput = document.getElementById('reproduceMin');
    const rMaxInput = document.getElementById('reproduceMax');

    function updateRuleLabels(e) {
        // 確保拉桿數值的「最少」不會大於「最多」
        if (e && e.target === sMinInput && parseInt(sMinInput.value) > parseInt(sMaxInput.value)) sMaxInput.value = sMinInput.value;
        if (e && e.target === sMaxInput && parseInt(sMaxInput.value) < parseInt(sMinInput.value)) sMinInput.value = sMaxInput.value;
        if (e && e.target === rMinInput && parseInt(rMinInput.value) > parseInt(rMaxInput.value)) rMaxInput.value = rMinInput.value;
        if (e && e.target === rMaxInput && parseInt(rMaxInput.value) < parseInt(rMinInput.value)) rMinInput.value = rMaxInput.value;

        document.getElementById('surviveMinVal').textContent = sMinInput.value;
        document.getElementById('surviveMaxVal').textContent = sMaxInput.value;
        document.getElementById('reproduceMinVal').textContent = rMinInput.value;
        document.getElementById('reproduceMaxVal').textContent = rMaxInput.value;
    }

    [sMinInput, sMaxInput, rMinInput, rMaxInput].forEach(input => {
        input.addEventListener('input', updateRuleLabels);
    });

    // 初始化畫布尺寸與網格
    function init(isInitial = false) {
        const rect = container.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;

        cols = Math.ceil(canvas.width / resolution);
        rows = Math.ceil(canvas.height / resolution);

        grid = buildGrid();
        if (isInitial) {
            randomizeGrid();
        }
        drawGrid();
    }

    // 建立空網格
    function buildGrid() {
        return new Array(cols).fill(null).map(() => new Array(rows).fill(0));
    }

    // 隨機填充網格
    function randomizeGrid() {
        for (let c = 0; c < cols; c++) {
            for (let r = 0; r < rows; r++) {
                grid[c][r] = Math.random() > 0.85 ? 1 : 0;
            }
        }
    }

    // 繪製畫面
    function drawGrid() {
        // 背景填黑
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 繪製活細胞
        ctx.fillStyle = '#4ADE80'; // Tailwind green-400
        for (let c = 0; c < cols; c++) {
            for (let r = 0; r < rows; r++) {
                if (grid[c][r] === 1) {
                    ctx.fillRect(c * resolution, r * resolution, resolution - 1, resolution - 1);
                }
            }
        }
    }

    // 計算下一代
    function nextGen() {
        const nextGrid = buildGrid();
        const sMin = parseInt(sMinInput.value);
        const sMax = parseInt(sMaxInput.value);
        const rMin = parseInt(rMinInput.value);
        const rMax = parseInt(rMaxInput.value);

        for (let c = 0; c < cols; c++) {
            for (let r = 0; r < rows; r++) {
                const state = grid[c][r];
                let neighbors = countNeighbors(grid, c, r);

                // 動態核心規則：依據拉桿數值判斷
                if (state === 0 && neighbors >= rMin && neighbors <= rMax) {
                    nextGrid[c][r] = 1; // 繁殖
                } else if (state === 1 && (neighbors < sMin || neighbors > sMax)) {
                    nextGrid[c][r] = 0; // 死亡 (孤獨或擁擠)
                } else {
                    nextGrid[c][r] = state; // 保持
                }
            }
        }
        grid = nextGrid;
    }

    // 計算鄰居數量 (包含邊界環繞邏輯)
    function countNeighbors(grid, x, y) {
        let sum = 0;
        for (let i = -1; i < 2; i++) {
            for (let j = -1; j < 2; j++) {
                const col = (x + i + cols) % cols;
                const row = (y + j + rows) % rows;
                sum += grid[col][row];
            }
        }
        sum -= grid[x][y];
        return sum;
    }

    // 遊戲迴圈 (控制更新速度)
    let lastTime = 0;
    let fps = 15; // 預設每秒演化次數
    let interval = 1000 / fps;

    const speedSlider = document.getElementById('speedSlider');
    const speedVal = document.getElementById('speedVal');
    speedSlider.addEventListener('input', (e) => {
        fps = parseInt(e.target.value);
        speedVal.textContent = fps;
        interval = 1000 / fps;
    });

    function update(time) {
        if (!isPlaying) return;

        if (time - lastTime > interval) {
            nextGen();
            drawGrid();
            lastTime = time;
        }
        animationId = requestAnimationFrame(update);
    }

    // --- 互動邏輯 (支援滑鼠與觸控) ---
    function getEventPos(e) {
        const rect = canvas.getBoundingClientRect();
        const clientX = (e.touches && e.touches.length > 0) ? e.touches[0].clientX : e.clientX;
        const clientY = (e.touches && e.touches.length > 0) ? e.touches[0].clientY : e.clientY;

        if (clientX === undefined || clientY === undefined) return null;

        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        const x = (clientX - rect.left) * scaleX;
        const y = (clientY - rect.top) * scaleY;

        return {
            col: Math.floor(x / resolution),
            row: Math.floor(y / resolution)
        };
    }

    function startDraw(e) {
        isDrawing = true;
        lastDrawPos = { col: -1, row: -1 };

        const pos = getEventPos(e);
        if (pos && pos.col >= 0 && pos.col < cols && pos.row >= 0 && pos.row < rows) {
            drawMode = grid[pos.col][pos.row] === 1 ? 0 : 1;
        }

        handleDraw(e);
    }

    function handleDraw(e) {
        if (!isDrawing) return;
        if (e.cancelable) e.preventDefault(); 

        const pos = getEventPos(e);
        if (!pos) return;

        if (pos.col >= 0 && pos.col < cols && pos.row >= 0 && pos.row < rows) {
            if (pos.col !== lastDrawPos.col || pos.row !== lastDrawPos.row) {
                grid[pos.col][pos.row] = drawMode; 
                drawGrid();
                lastDrawPos = pos;
            }
        }
    }

    function endDraw() {
        isDrawing = false;
    }

    canvas.addEventListener('mousedown', startDraw);
    canvas.addEventListener('mousemove', handleDraw);
    window.addEventListener('mouseup', endDraw); 

    canvas.addEventListener('touchstart', startDraw, { passive: false });
    canvas.addEventListener('touchmove', handleDraw, { passive: false });
    window.addEventListener('touchend', endDraw);
    window.addEventListener('touchcancel', endDraw);

    // --- 按鈕事件綁定 ---
    const startBtn = document.getElementById('startBtn');

    startBtn.addEventListener('click', () => {
        isPlaying = !isPlaying;
        startBtn.textContent = isPlaying ? 'Pause' : 'Auto / Pause';
        startBtn.className = isPlaying
            ? "flex-1 min-w-[120px] bg-yellow-600 hover:bg-yellow-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors shadow-lg"
            : "flex-1 min-w-[120px] bg-green-600 hover:bg-green-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors shadow-lg";

        if (isPlaying) {
            lastTime = performance.now();
            animationId = requestAnimationFrame(update);
        } else {
            cancelAnimationFrame(animationId);
        }
    });

    document.getElementById('stepBtn').addEventListener('click', () => {
        if (isPlaying) {
            isPlaying = false; 
            startBtn.textContent = 'Auto / Pause';
            startBtn.className = "flex-1 min-w-[120px] bg-green-600 hover:bg-green-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors shadow-lg";
            cancelAnimationFrame(animationId);
        }
        nextGen();
        drawGrid();
    });

    document.getElementById('randomBtn').addEventListener('click', () => {
        randomizeGrid();
        drawGrid();
    });

    document.getElementById('clearBtn').addEventListener('click', () => {
        isPlaying = false;
        startBtn.textContent = 'Auto / Pause';
        startBtn.className = "flex-1 min-w-[120px] bg-green-600 hover:bg-green-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors shadow-lg";
        cancelAnimationFrame(animationId);
        grid = buildGrid();
        drawGrid();
    });

    // 視窗大小改變時重新調整畫布
    window.addEventListener('resize', () => {
        const oldGrid = grid;
        const oldCols = cols;
        const oldRows = rows;

        init(false);

        for (let c = 0; c < Math.min(cols, oldCols); c++) {
            for (let r = 0; r < Math.min(rows, oldRows); r++) {
                grid[c][r] = oldGrid[c][r];
            }
        }
        drawGrid();
    });

    init(true);
};