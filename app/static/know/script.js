class PestDetectionSystem {
    constructor() {
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.uploadBox = this.uploadArea.querySelector('.upload-box');
        this.resultArea = document.getElementById('resultArea');
        this.previewImage = document.getElementById('previewImage');
        this.resultCanvas = document.getElementById('resultCanvas');
        this.resultsBody = document.getElementById('resultsBody');
        this.resetBtn = document.getElementById('resetBtn');
        this.loading = document.getElementById('loading');
        this.CONFIDENCE_THRESHOLD = 0.40; // 置信度阈值
        this.IOU_THRESHOLD = 0.3; // NMS重叠阈值
        this.CLASS_NAMES = {
            0:"稻纵卷叶螟",
            1:"二化螟",
            2:"稻水象甲",
            3:"蛴螬",
            4:"蝼蛄",
            5:"金针虫",
            6:"小地老虎",
            7:"大地老虎",
            8:"黄地老虎",
            9:"红蜘蛛",
            10:"玉米螟",
            11:"粘虫",
            12:"蚜虫",
            13:"葡萄斑叶蝉",
            14:"桃蛀螟",
            15:"麦长管蚜",
            16:"跳甲",
            17:"菜青虫",
            18:"甜菜夜蛾",
            19:"甜菜象甲",
            20:"亚麻芽蛾",
            21:"苜蓿盲蝽",
            22:"牧草盲蝽",
            23:"蝗总科",
            24:"绿芫菁",
            25:"豆芫菁",
            26:"斑蝥",
            27:"刺蛾科",
            28:"十星瓢萤叶甲",
            29:"葡萄天蛾",
            30:"斑衣蜡蝉",
            31:"青杨脊虎天牛",
            32:"大青叶蝉",
            33:"盲蝽科",
            34:"吹绵蚧",
            35:"红蜡蚧",
            36:"褐圆蚧",
            37:"斜纹夜蛾",
            38:"碧蛾蜡蝉",
            39:"绿蛾蜡蝉",
            40:"叶蝉科",
        };
        
        this.initEventListeners();
    }

    initEventListeners() {
        // 拖放功能
        this.uploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
        this.uploadArea.addEventListener('dragleave', this.handleDragLeave.bind(this));
        this.uploadArea.addEventListener('drop', this.handleDrop.bind(this));
        
        // 点击上传
        this.uploadArea.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', this.handleFileChange.bind(this));
        
        // 重置按钮
        this.resetBtn.addEventListener('click', this.resetUI.bind(this));
    }

    handleDragOver(e) {
        e.preventDefault();
        this.uploadBox.style.borderColor = '#2980b9';
        this.uploadBox.style.backgroundColor = '#f8fafc';
    }

    handleDragLeave() {
        this.uploadBox.style.borderColor = '#3498db';
        this.uploadBox.style.backgroundColor = '';
    }

    handleDrop(e) {
        // 彻底阻止默认行为和事件传播
        e.preventDefault();
        e.stopPropagation();
        
        // 清除拖放样式
        this.handleDragLeave();
        
        // 确保有文件且是第一个文件
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            // 额外检查文件类型
            const file = e.dataTransfer.files[0];
            if (!file.type.match('image.*')) {
                alert('请上传图片文件');
                return;
            }
            
            // 处理文件上传
            this.fileInput.files = e.dataTransfer.files;
            this.handleFileUpload(file);
        }
    }

    handleFileChange() {
        if (this.fileInput.files.length) {
            this.handleFileUpload(this.fileInput.files[0]);
        }
    }

    async handleFileUpload(file) {
        try {
            if (!file.type.match('image.*')) {
                throw new Error('请上传图片文件');
            }

            const imageData = await this.readFileAsDataURL(file);
            this.previewImage.src = imageData;
            
            await new Promise((resolve) => {
                this.previewImage.onload = resolve;
            });

            this.uploadArea.style.display = 'none';
            this.loading.style.display = 'block';
            
            const results = await this.sendImageToServer(file);
            this.processDetectionResults(results);
        } catch (error) {
            this.handleError(error);
        }
    }

    readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('文件读取失败'));
            reader.readAsDataURL(file);
        });
    }

    async sendImageToServer(file) {
        try {
            const formData = new FormData();
            formData.append('file', file);

            const baseURL = window.location.origin;
            const response = await fetch(`${baseURL}/detect`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`服务器错误: ${response.status}`);
            }

            const data = await response.json();
            return data.results || [];
        } catch (error) {
            console.error('API请求失败:', error);
            throw new Error('检测失败，请重试');
        }
    }

    processDetectionResults(rawResults) {
        try {
            this.loading.style.display = 'none';
            if (!rawResults || rawResults.length === 0) {
                throw new Error('未检测到病虫害');
            }
            console.log('检测结果:', rawResults);////////////////////

            // 过滤低置信度结果并应用NMS
            const filteredResults = rawResults
                .filter(result => result.score >= this.CONFIDENCE_THRESHOLD);
                
            const finalResults = this.applyNMS(filteredResults, this.IOU_THRESHOLD);
            
            if (finalResults.length === 0) {
                throw new Error('未检测到有效的病虫害目标');
            }

            this.displayResults(finalResults);
        } catch (error) {
            this.handleError(error);
        }
    }

    applyNMS(results, iouThreshold) {
        if (!results || results.length === 0) return [];
        
        // 按置信度降序排序
        results.sort((a, b) => b.score - a.score);
        
        const finalResults = [];
        
        while (results.length > 0) {
            // 取出当前最高置信度的结果
            const current = results[0];
            finalResults.push(current);
            
            // 计算与剩余结果的IoU并过滤
            results = results.slice(1).filter(item => {
                return this.calculateIoU(current.bbox, item.bbox) < iouThreshold;
            });
        }
        
        return finalResults;
    }

    calculateIoU(box1, box2) {
        const formatBox = (box) => {
            return Array.isArray(box) && box.length === 4 
                ? [box[0], box[1], box[0] + box[2], box[1] + box[3]] 
                : box;
        };

        const [box1_x1, box1_y1, box1_x2, box1_y2] = formatBox(box1);
        const [box2_x1, box2_y1, box2_x2, box2_y2] = formatBox(box2);
        
        // 计算相交区域
        const x1 = Math.max(box1_x1, box2_x1);
        const y1 = Math.max(box1_y1, box2_y1);
        const x2 = Math.min(box1_x2, box2_x2);
        const y2 = Math.min(box1_y2, box2_y2);
        
        // 计算相交区域面积
        const intersection = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
        
        // 计算并集区域面积
        const area1 = (box1_x2 - box1_x1) * (box1_y2 - box1_y1);
        const area2 = (box2_x2 - box2_x1) * (box2_y2 - box2_y1);
        const union = area1 + area2 - intersection;
        
        return intersection / union;
    }

    displayResults(results) {
        this.resultArea.style.display = 'flex';
        this.resultsBody.innerHTML = '';
    
        // 使用新的封装方法绘图
        this.drawDetectionsOnCanvas(this.resultCanvas, this.previewImage, results);
    
        // 添加表格数据
        results.forEach(result => {
            const [x1, y1, x2, y2] = result.bbox.map(coord => Math.round(coord));
            const className = this.CLASS_NAMES[result.class_id] || `未知病虫害 (ID: ${result.class_id})`;
            const confidence = (result.score * 100).toFixed(2);
    
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${className}</td>
                <td>${confidence}%</td>
                <td>(${x1}, ${y1}) - (${x2}, ${y2})</td>
            `;
            this.resultsBody.appendChild(row);
        });
    }
    
    drawDetectionsOnCanvas(canvas, image, results) {
        const ctx = canvas.getContext("2d");
    
        // 使用图片原始尺寸，防止缩放影响绘制位置
        const imgWidth = image.naturalWidth;
        const imgHeight = image.naturalHeight;
    
        canvas.width = imgWidth;
        canvas.height = imgHeight;
    
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, 0, 0, imgWidth, imgHeight);
    
        results.forEach(result => {
            const [x1, y1, x2, y2] = result.bbox.map(coord => Math.round(coord));
            const className = this.CLASS_NAMES[result.class_id] || `未知病虫害 (ID: ${result.class_id})`;
            const confidence = (result.score * 100).toFixed(2);
            const text = `${className} ${confidence}%`;
    
            // 边框
            ctx.strokeStyle = "red";
            ctx.lineWidth = 2;
            ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
    
            // 标签背景
            ctx.font = "14px Arial";
            const textWidth = ctx.measureText(text).width;
            ctx.fillStyle = "red";
            ctx.fillRect(x1, y1 - 20, textWidth + 10, 20);
    
            // 标签文字
            ctx.fillStyle = "white";
            ctx.fillText(text, x1 + 5, y1 - 5);
        });
    }
    
    

    handleError(error) {
        console.error('Error:', error);
        this.loading.style.display = 'none';
        alert(error.message || '发生未知错误');
        this.resetUI();
    }

    resetUI() {
        this.fileInput.value = '';
        this.previewImage.src = '';
        this.resultCanvas.width = 0;
        this.resultCanvas.height = 0;
        this.resultsBody.innerHTML = '';
        this.resultArea.style.display = 'none';
        this.uploadArea.style.display = 'block';
    }
}

// 初始化系统
document.addEventListener('DOMContentLoaded', () => {
    new PestDetectionSystem();
});