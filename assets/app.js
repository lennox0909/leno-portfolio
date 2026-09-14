/* 檔案路徑：assets/app.js */

/**
 * 系統啟動動畫控制器 (封裝動畫邏輯，落實 LoD 原則)
 */
class SystemBootAnimation {
    constructor(elements) {
        // 僅接收必要的 DOM 元素，對外部系統零知識
        this.svg = elements.svg;
        this.text = elements.text;
        this.clipRect = elements.clipRect;
        this.beam = elements.beam;
        this.spark = elements.spark;
        this.statusMsg = elements.statusMsg;
        this.contactLink = elements.contactLink;
        this.duration = 3500;
    }

    start() {
        const bbox = this.text.getBBox();
        this.text.setAttribute('clip-path', 'url(#text-clip)');
        this.clipRect.setAttribute('x', 0);
        this.clipRect.setAttribute('y', bbox.y - 100);

        const startX = bbox.x - 40;
        const endX = bbox.x + bbox.width + 40;
        const textCenterY = bbox.y + bbox.height / 2;

        let startTime = null;

        setTimeout(() => {
            this.beam.style.opacity = 1;
            this.spark.style.opacity = 1;
            
            // 使用箭頭函數保持 this 指向
            const drawFrame = (time) => {
                if (!startTime) startTime = time;
                let elapsed = time - startTime;
                let progress = Math.min(elapsed / this.duration, 1);

                let currentX = startX + (endX - startX) * progress;
                this.clipRect.setAttribute('width', currentX + 20);

                let mainFreq = 25;
                let jitterFreq = 60;
                let scribbleY = textCenterY
                    + Math.sin(progress * Math.PI * mainFreq) * (bbox.height * 0.45)
                    + Math.cos(progress * Math.PI * jitterFreq) * (bbox.height * 0.1);

                this.beam.setAttribute('x1', currentX);
                this.beam.setAttribute('y1', 0);
                this.beam.setAttribute('x2', currentX);
                this.beam.setAttribute('y2', scribbleY);

                this.spark.setAttribute('cx', currentX);
                this.spark.setAttribute('cy', scribbleY);
                this.spark.setAttribute('r', 5 + Math.random() * 6);

                if (progress < 1) {
                    requestAnimationFrame(drawFrame);
                } else {
                    this.finishAnimation();
                }
            };
            
            requestAnimationFrame(drawFrame);
        }, 400);
    }

    finishAnimation() {
        this.beam.style.opacity = 0;
        this.spark.style.opacity = 0;
        this.statusMsg.innerText = "IDENTITY COMPILED";

        setTimeout(() => {
            this.text.classList.add('filled');

            setTimeout(() => {
                this.statusMsg.innerText = "DATA UPLOADING...";
                this.text.removeAttribute('clip-path');

                // 如果聯絡節點存在，執行上傳動畫
                if (this.contactLink) {
                    const rect = this.contactLink.getBoundingClientRect();
                    const targetX = rect.left + rect.width / 2;
                    const targetY = rect.top + rect.height / 2;

                    const pt = this.svg.createSVGPoint();
                    pt.x = targetX;
                    pt.y = targetY;
                    const svgPt = pt.matrixTransform(this.svg.getScreenCTM().inverse());

                    const dx = svgPt.x - 600;
                    const dy = svgPt.y - 420;

                    this.text.style.transform = `translate(${dx}px, ${dy}px) scale(0.015)`;
                    this.text.style.opacity = '0';

                    setTimeout(() => {
                        this.contactLink.classList.add('flash-active');
                        this.statusMsg.innerText = "ACCESS GRANTED";

                        setTimeout(() => {
                            this.contactLink.classList.remove('flash-active');
                            this.statusMsg.innerText = "SYSTEM SECURE";
                        }, 800);
                    }, 800);
                }
            }, 1800);
        }, 400);
    }
}

// 主程式進入點
window.addEventListener('load', () => {
    document.fonts.ready.then(() => {
        const statusMsg = document.getElementById('status-msg');
        
        // 初始化動畫依賴元件
        const elements = {
            svg: document.getElementById('main-svg'),
            text: document.getElementById('target-text'),
            clipRect: document.getElementById('clip-rect'),
            beam: document.getElementById('laser-beam'),
            spark: document.getElementById('spark'),
            statusMsg: statusMsg,
            contactLink: document.getElementById('contact-link')
        };

        const bootSequence = new SystemBootAnimation(elements);

        setTimeout(() => {
            statusMsg.innerText = "ENGAGING PROTOCOL";
            bootSequence.start();
        }, 1200);
    });
});