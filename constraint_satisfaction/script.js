/**
 * 排班約束滿足模擬器 (Constraint Satisfaction Problem) - 原生 JS 版
 * 移植 React 的 evaluateScore 與 optimizeStep 演算法
 */

class ConstraintOptimizer {
    constructor() {
        // 常數設定 (對齊原始設定)
        this.EMPLOYEES = [
            { id: 'E1', name: '護理師 A', preferredOffDay: 5 }, 
            { id: 'E2', name: '護理師 B', preferredOffDay: 6 }, 
            { id: 'E3', name: '護理師 C', preferredOffDay: 2 },
            { id: 'E4', name: '護理師 D', preferredOffDay: 4 },
            { id: 'E5', name: '護理師 E', preferredOffDay: 0 }
        ];
        this.DAYS = ['週一', '週二', '週三', '週四', '週五', '週六', '週日'];
        this.SHIFT_TYPES = ['DAY', 'NIGHT', 'OFF'];
        this.ITERATIONS_PER_FRAME = 50;

        // 狀態
        this.grid = {};
        this.isOptimizing = false;
        this.strictLeave = true;
        this.score = { hard: 0, soft: 0, violations: new Set() };
        this.animationFrameId = null;
        
        // 用於高效更新 UI 的 DOM 快取
        this.domCells = {}; 

        // DOM 綁定
        this.ui = {
            gridContainer: document.getElementById('schedule-grid'),
            gridWrapper: document.querySelector('.grid-wrapper'),
            strictToggle: document.getElementById('strictLeaveToggle'),
            optBtn: document.getElementById('optimizeBtn'),
            optText: document.getElementById('optimizeText'),
            playIcon: document.querySelector('.play-icon'),
            pauseIcon: document.querySelector('.pause-icon'),
            resetBtn: document.getElementById('resetBtn'),
            hardScoreDisp: document.getElementById('hardScore'),
            softScoreDisp: document.getElementById('softScore')
        };

        this.init();
    }

    init() {
        this.buildGridDOM();
        this.bindEvents();
        this.initializeGrid();
    }

    bindEvents() {
        this.ui.strictToggle.addEventListener('change', (e) => {
            this.strictLeave = e.target.checked;
            this.updateEvaluation();
        });

        this.ui.optBtn.addEventListener('click', () => {
            this.isOptimizing = !this.isOptimizing;
            this.updateBtnUI();
            
            if (this.isOptimizing) {
                this.ui.gridWrapper.classList.add('optimizing');
                this.optimizeStep();
            } else {
                this.ui.gridWrapper.classList.remove('optimizing');
                cancelAnimationFrame(this.animationFrameId);
            }
        });

        this.ui.resetBtn.addEventListener('click', () => {
            this.isOptimizing = false;
            this.ui.gridWrapper.classList.remove('optimizing');
            this.updateBtnUI();
            cancelAnimationFrame(this.animationFrameId);
            this.initializeGrid();
        });
    }

    updateBtnUI() {
        if (this.isOptimizing) {
            this.ui.optBtn.classList.add('active');
            this.ui.optText.textContent = '暫停優化';
            this.ui.playIcon.classList.add('hidden');
            this.ui.pauseIcon.classList.remove('hidden');
        } else {
            this.ui.optBtn.classList.remove('active');
            this.ui.optText.textContent = '執行最佳化';
            this.ui.playIcon.classList.remove('hidden');
            this.ui.pauseIcon.classList.add('hidden');
        }
    }

    // --- DOM 建立與更新 ---
    buildGridDOM() {
        this.ui.gridContainer.innerHTML = '';
        
        // 建立標題列
        const emptyHeader = document.createElement('div');
        emptyHeader.className = 'grid-header';
        emptyHeader.textContent = '人員 / 日期';
        this.ui.gridContainer.appendChild(emptyHeader);

        this.DAYS.forEach(day => {
            const el = document.createElement('div');
            el.className = 'grid-header';
            el.textContent = day;
            this.ui.gridContainer.appendChild(el);
        });

        // 建立每一列
        this.EMPLOYEES.forEach(emp => {
            this.domCells[emp.id] = [];
            
            // 姓名標題
            const nameEl = document.createElement('div');
            nameEl.className = 'row-header';
            nameEl.textContent = emp.name;
            this.ui.gridContainer.appendChild(nameEl);

            // 7天的班表儲存格
            for (let day = 0; day < 7; day++) {
                const cell = document.createElement('div');
                // 點擊切換班別
                cell.addEventListener('click', () => this.handleCellClick(emp.id, day));
                this.ui.gridContainer.appendChild(cell);
                this.domCells[emp.id].push(cell);
            }
        });
    }

    updateAllCells() {
        this.EMPLOYEES.forEach(emp => {
            for (let day = 0; day < 7; day++) {
                const shift = this.grid[emp.id][day];
                const isViolation = this.score.violations.has(`${emp.id}-${day}`);
                const cell = this.domCells[emp.id][day];
                
                cell.className = `shift-cell shift-${shift} ${isViolation ? 'violation' : ''}`;
                cell.textContent = shift === 'DAY' ? '日' : (shift === 'NIGHT' ? '夜' : '休');
            }
        });

        this.ui.hardScoreDisp.textContent = this.score.hard;
        this.ui.softScoreDisp.textContent = this.score.soft;
    }

    // --- 核心邏輯 ---
    initializeGrid() {
        this.grid = {};
        this.EMPLOYEES.forEach(emp => {
            this.grid[emp.id] = Array.from({ length: 7 }, () => 
                this.SHIFT_TYPES[Math.floor(Math.random() * this.SHIFT_TYPES.length)]
            );
        });
        this.updateEvaluation();
    }

    // 循環切換：日 -> 夜 -> 休 -> 日
    handleCellClick(empId, dayIdx) {
        if (this.isOptimizing) return;
        
        const currentShift = this.grid[empId][dayIdx];
        const nextShiftMap = { 'DAY': 'NIGHT', 'NIGHT': 'OFF', 'OFF': 'DAY' };
        
        this.grid[empId][dayIdx] = nextShiftMap[currentShift];
        this.updateEvaluation();
    }

    updateEvaluation() {
        this.score = this.evaluateScore(this.grid, this.strictLeave);
        this.updateAllCells();
    }

    evaluateScore(currentGrid, isStrictLeave) {
        let hardScore = 0;
        let softScore = 0;
        const violations = new Set();

        for (let day = 0; day < 7; day++) {
            let dayCount = 0;
            let nightCount = 0;
            
            this.EMPLOYEES.forEach(emp => {
                if (currentGrid[emp.id][day] === 'DAY') dayCount++;
                if (currentGrid[emp.id][day] === 'NIGHT') nightCount++;
            });

            // 每天至少 2 個日班
            if (dayCount < 2) {
                hardScore -= (2 - dayCount) * 10;
                this.EMPLOYEES.forEach(emp => {
                    if (currentGrid[emp.id][day] === 'OFF') violations.add(`${emp.id}-${day}`);
                });
            }
            // 每天至少 1 個夜班
            if (nightCount < 1) {
                hardScore -= (1 - nightCount) * 20;
                this.EMPLOYEES.forEach(emp => {
                    if (currentGrid[emp.id][day] === 'OFF' || currentGrid[emp.id][day] === 'DAY') violations.add(`${emp.id}-${day}`);
                });
            }
            // 超過 2 個日班扣軟分
            if (dayCount > 2) softScore -= (dayCount - 2) * 5;
        }

        this.EMPLOYEES.forEach(emp => {
            const schedule = currentGrid[emp.id];
            let consecutiveWork = 0;

            for (let day = 0; day < 7; day++) {
                const shift = schedule[day];
                
                // 違反夜班接日班 (N->D)
                if (day < 6 && shift === 'NIGHT' && schedule[day + 1] === 'DAY') {
                    hardScore -= 50;
                    violations.add(`${emp.id}-${day}`);
                    violations.add(`${emp.id}-${day + 1}`);
                }

                if (shift !== 'OFF') {
                    consecutiveWork++;
                    // 連續工作超過 5 天
                    if (consecutiveWork > 5) {
                        hardScore -= 30;
                        violations.add(`${emp.id}-${day}`);
                    }
                } else {
                    consecutiveWork = 0;
                }

                // 檢查偏好休假日
                if (day === emp.preferredOffDay) {
                    if (shift !== 'OFF') {
                        if (isStrictLeave) {
                            hardScore -= 40;
                            violations.add(`${emp.id}-${day}`);
                        } else {
                            softScore -= 20;
                        }
                    } else {
                        softScore += 10; 
                    }
                }
            }
            
            // 檢查每週休假天數
            const offDays = schedule.filter(s => s === 'OFF').length;
            if (offDays < 2) softScore -= (2 - offDays) * 10;
            else if (offDays > 2) softScore -= (offDays - 2) * 5;
        });

        return { hard: hardScore, soft: softScore, violations };
    }

    // --- 局部搜尋演算法 ---
    optimizeStep() {
        if (!this.isOptimizing) return;

        // 複製一份當前狀態
        let currentGrid = JSON.parse(JSON.stringify(this.grid));
        let currentScore = this.score;
        let improved = false;

        // 達到理想分數即停止
        if (currentScore.hard === 0 && currentScore.soft > 30) {
            this.isOptimizing = false;
            this.ui.gridWrapper.classList.remove('optimizing');
            this.updateBtnUI();
            return;
        }

        for (let iter = 0; iter < this.ITERATIONS_PER_FRAME; iter++) {
            const newGrid = JSON.parse(JSON.stringify(currentGrid));

            if (Math.random() > 0.4) {
                // 隨機突變：改變某人的某天班別
                const randomEmp = this.EMPLOYEES[Math.floor(Math.random() * this.EMPLOYEES.length)].id;
                const randomDay = Math.floor(Math.random() * 7);
                const currentShift = newGrid[randomEmp][randomDay];
                const otherShifts = this.SHIFT_TYPES.filter(s => s !== currentShift);
                newGrid[randomEmp][randomDay] = otherShifts[Math.floor(Math.random() * otherShifts.length)];
            } else {
                // 交換班別
                const isSameDaySwap = Math.random() > 0.5;
                if (isSameDaySwap) {
                    // 同一天，不同人交換
                    const emp1 = this.EMPLOYEES[Math.floor(Math.random() * this.EMPLOYEES.length)].id;
                    const emp2 = this.EMPLOYEES[Math.floor(Math.random() * this.EMPLOYEES.length)].id;
                    const day = Math.floor(Math.random() * 7);
                    const temp = newGrid[emp1][day];
                    newGrid[emp1][day] = newGrid[emp2][day];
                    newGrid[emp2][day] = temp;
                } else {
                    // 同一人，不同天交換
                    const emp = this.EMPLOYEES[Math.floor(Math.random() * this.EMPLOYEES.length)].id;
                    const day1 = Math.floor(Math.random() * 7);
                    const day2 = Math.floor(Math.random() * 7);
                    const temp = newGrid[emp][day1];
                    newGrid[emp][day1] = newGrid[emp][day2];
                    newGrid[emp][day2] = temp;
                }
            }

            const newScore = this.evaluateScore(newGrid, this.strictLeave);

            // 只有當新分數「更好或持平」時才接受新狀態
            if (newScore.hard > currentScore.hard || 
               (newScore.hard === currentScore.hard && newScore.soft >= currentScore.soft)) {
                currentGrid = newGrid;
                currentScore = newScore;
                improved = true;
            }
        }

        if (improved) {
            this.grid = currentGrid;
            this.score = currentScore;
            this.updateAllCells();
        }

        if (this.isOptimizing) {
            this.animationFrameId = requestAnimationFrame(() => this.optimizeStep());
        }
    }
}

// 啟動應用程式
document.addEventListener('DOMContentLoaded', () => {
    new ConstraintOptimizer();
});