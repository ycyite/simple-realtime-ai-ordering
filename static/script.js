// AI Audio Ordering System - Frontend JavaScript

class AudioToTextApp {
    constructor() {
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.recordingStream = null;
        this.recordedBlob = null;
        this.recordingStartTime = null;
        this.timerInterval = null;

        this.initializeElements();
        this.setupEventListeners();
        this.checkMicrophoneSupport();
        this.loadMenu();
        this.loadCategories();
    }

    initializeElements() {
        // Recording elements
        this.startRecordingBtn = document.getElementById('startRecording');
        this.stopRecordingBtn = document.getElementById('stopRecording');
        this.playRecordingBtn = document.getElementById('playRecording');
        this.recordingStatus = document.getElementById('recordingStatus');
        this.recordingTimer = document.getElementById('recordingTimer');
        this.audioPlayback = document.getElementById('audioPlayback');
        this.recordingActions = document.querySelector('.recording-actions');
        this.transcribeRecordingBtn = document.getElementById('transcribeRecording');
        this.translateRecordingBtn = document.getElementById('translateRecording');

        // Upload elements
        this.uploadArea = document.getElementById('uploadArea');
        this.audioFileInput = document.getElementById('audioFile');
        this.languageSelect = document.getElementById('language');
        this.uploadControls = document.querySelector('.upload-controls');
        this.transcribeFileBtn = document.getElementById('transcribeFile');
        this.translateFileBtn = document.getElementById('translateFile');
        this.clearFileBtn = document.getElementById('clearFile');

        // Menu management elements
        this.categoryFilter = document.getElementById('categoryFilter');
        this.menuDisplay = document.getElementById('menuDisplay');
        this.addItemForm = document.getElementById('addItemForm');
        this.addCategoryForm = document.getElementById('addCategoryForm');

        // Results elements
        this.loadingIndicator = document.getElementById('loadingIndicator');
        this.results = document.getElementById('results');
        this.orderAnalysis = document.getElementById('orderAnalysis');
        this.orderDetails = document.getElementById('orderDetails');
    }

    setupEventListeners() {
        // Recording controls
        this.startRecordingBtn.addEventListener('click', () => this.startRecording());
        this.stopRecordingBtn.addEventListener('click', () => this.stopRecording());
        this.playRecordingBtn.addEventListener('click', () => this.playRecording());
        this.transcribeRecordingBtn.addEventListener('click', () => this.transcribeRecording());
        this.translateRecordingBtn.addEventListener('click', () => this.translateRecording());

        // File upload
        this.uploadArea.addEventListener('click', () => this.audioFileInput.click());
        this.uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.uploadArea.addEventListener('drop', (e) => this.handleDrop(e));
        this.audioFileInput.addEventListener('change', (e) => this.handleFileSelect(e));

        // File controls
        this.transcribeFileBtn.addEventListener('click', () => this.transcribeFile());
        this.translateFileBtn.addEventListener('click', () => this.translateFile());
        this.clearFileBtn.addEventListener('click', () => this.clearFile());

        // Menu management
        this.addItemForm.addEventListener('submit', (e) => this.handleAddItem(e));
        this.addCategoryForm.addEventListener('submit', (e) => this.handleAddCategory(e));
    }

    async checkMicrophoneSupport() {
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                this.showRecordingStatus('Microphone not supported in this browser', 'error');
                this.startRecordingBtn.disabled = true;
                return;
            }

            // Test microphone access
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop());
            this.showRecordingStatus('Microphone ready', 'success');

        } catch (error) {
            this.showRecordingStatus('Microphone access denied', 'error');
            this.startRecordingBtn.disabled = true;
        }
    }

    async startRecording() {
        try {
            this.recordingStream = await navigator.mediaDevices.getUserMedia({ audio: true });

            this.mediaRecorder = new MediaRecorder(this.recordingStream);
            this.audioChunks = [];

            this.mediaRecorder.addEventListener('dataavailable', (event) => {
                this.audioChunks.push(event.data);
            });

            this.mediaRecorder.addEventListener('stop', () => {
                this.recordedBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
                this.audioPlayback.src = URL.createObjectURL(this.recordedBlob);
                this.audioPlayback.style.display = 'block';
                this.playRecordingBtn.disabled = false;
                this.recordingActions.style.display = 'block';
            });

            this.mediaRecorder.start();
            this.recordingStartTime = Date.now();
            this.startTimer();

            this.startRecordingBtn.disabled = true;
            this.stopRecordingBtn.disabled = false;
            this.showRecordingStatus('Recording...', 'recording');

        } catch (error) {
            this.showRecordingStatus('Failed to start recording: ' + error.message, 'error');
        }
    }

    stopRecording() {
        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
            this.mediaRecorder.stop();
            this.recordingStream.getTracks().forEach(track => track.stop());
            this.stopTimer();

            this.startRecordingBtn.disabled = false;
            this.stopRecordingBtn.disabled = true;
            this.showRecordingStatus('Recording completed', 'success');
        }
    }

    playRecording() {
        if (this.audioPlayback.src) {
            this.audioPlayback.play();
        }
    }

    startTimer() {
        this.timerInterval = setInterval(() => {
            const elapsed = Date.now() - this.recordingStartTime;
            const minutes = Math.floor(elapsed / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);
            this.recordingTimer.textContent =
                `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
    }

    showRecordingStatus(message, type) {
        this.recordingStatus.textContent = message;
        this.recordingStatus.className = `status-message status-${type}`;
    }

    handleDragOver(e) {
        e.preventDefault();
        this.uploadArea.classList.add('drag-over');
    }

    handleDrop(e) {
        e.preventDefault();
        this.uploadArea.classList.remove('drag-over');

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.handleFileSelect({ target: { files: files } });
        }
    }

    handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            if (this.isValidAudioFile(file)) {
                this.uploadArea.querySelector('.upload-content').innerHTML =
                    `<div class="file-selected">
                        <div class="file-icon">🎵</div>
                        <p><strong>Selected:</strong> ${file.name}</p>
                        <p>Size: ${this.formatFileSize(file.size)}</p>
                    </div>`;
                this.uploadControls.style.display = 'block';
            } else {
                this.showError('Please select a valid audio file (MP3, WAV, M4A, etc.)');
            }
        }
    }

    isValidAudioFile(file) {
        const validTypes = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/x-m4a',
                           'audio/webm', 'audio/ogg', 'audio/flac'];
        return validTypes.includes(file.type) || /\.(mp3|wav|m4a|mp4|webm|ogg|flac)$/i.test(file.name);
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    clearFile() {
        this.audioFileInput.value = '';
        this.uploadArea.querySelector('.upload-content').innerHTML =
            `<div class="upload-icon">🎵</div>
             <p>Drag and drop an audio file here, or click to select</p>
             <p class="upload-formats">Supported: MP3, WAV, M4A, MP4, WebM, OGG, FLAC</p>`;
        this.uploadControls.style.display = 'none';
    }

    async transcribeRecording() {
        if (!this.recordedBlob) return;

        const formData = new FormData();
        formData.append('audio', this.recordedBlob, 'recording.wav');

        await this.sendTranscriptionRequest('/api/transcribe', formData);
    }

    async translateRecording() {
        if (!this.recordedBlob) return;

        const formData = new FormData();
        formData.append('audio', this.recordedBlob, 'recording.wav');

        await this.sendTranscriptionRequest('/api/translate', formData);
    }

    async transcribeFile() {
        const file = this.audioFileInput.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('audio', file);
        formData.append('language', this.languageSelect.value);

        await this.sendTranscriptionRequest('/api/transcribe', formData);
    }

    async translateFile() {
        const file = this.audioFileInput.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('audio', file);

        await this.sendTranscriptionRequest('/api/translate', formData);
    }

    async sendTranscriptionRequest(endpoint, formData) {
        this.showLoading(true);

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                body: formData
            });

            const result = await response.json();
            this.displayResults(result);

            if (result.success) {
                this.analyzeOrder(result.text);
            }

        } catch (error) {
            this.showError('Network error: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }

    displayResults(result) {
        if (result.success) {
            const isTranslation = result.translated_to_english;
            this.results.innerHTML = `
                <div class="result-success">
                    <h3>${isTranslation ? '🌐 Translation Result' : '📝 Transcription Result'}</h3>
                    <div class="transcription-text">"${result.text}"</div>
                    ${result.language ? `<p class="language-info">Language: ${result.language}</p>` : ''}
                    <p class="timestamp">Processed: ${new Date(result.timestamp).toLocaleString()}</p>
                </div>
            `;
        } else {
            this.results.innerHTML = `
                <div class="result-error">
                    <h3>❌ Error</h3>
                    <p>${result.error}</p>
                </div>
            `;
        }
    }

    async analyzeOrder(text) {
        try {
            // Check if OpenAI API key is provided for ChatGPT enhancement
            const openaiKey = document.getElementById('openaiKey')?.value?.trim();

            let endpoint = '/api/menu/rag-parse-order';
            let requestBody = { text: text };

            // Use ChatGPT-enhanced endpoint if API key is provided
            if (openaiKey) {
                endpoint = '/api/menu/rag-chatgpt-order';
                requestBody.openai_api_key = openaiKey;
            }

            let response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            const result = await response.json();

            if (result.success) {
                const analysis = result.analysis;
                const isRagEnhanced = result.is_rag_enhanced || false;
                const chatgptResult = result.chatgpt_result || null;

                // Handle RAG-enhanced results
                if (isRagEnhanced && analysis.parsed_order && analysis.parsed_order.items.length > 0) {
                    this.displayRagOrderAnalysis(analysis, text, chatgptResult);
                }
                // Handle basic results or RAG with recommendations
                else if (analysis.detected_items && analysis.detected_items.length > 0) {
                    this.displayBasicOrderAnalysis(analysis, text, isRagEnhanced);
                }
                // Handle RAG recommendations without clear order
                else if (isRagEnhanced && analysis.recommendations) {
                    this.displayRagRecommendations(analysis, text);
                } else {
                    this.orderAnalysis.style.display = 'block';
                    this.orderDetails.innerHTML = `
                        <div class="no-items-detected">
                            <p>No menu items detected in: "${text}"</p>
                            <p>Try mentioning specific items from your menu, like "pepperoni pizza" or "cheeseburger".</p>
                        </div>
                    `;
                }
            } else {
                console.error('Order analysis failed:', result.error);
                this.fallbackOrderAnalysis(text);
            }

        } catch (error) {
            console.error('Error analyzing order:', error);
            this.fallbackOrderAnalysis(text);
        }
    }

    displayRagOrderAnalysis(analysis, text, chatgptResult = null) {
        this.orderAnalysis.style.display = 'block';

        const parsedOrder = analysis.parsed_order;
        const recommendations = analysis.recommendations;

        let itemsHtml = parsedOrder.items.map(orderItem => `
            <div class="order-item rag-enhanced">
                <div class="item-details">
                    <span class="item-name">${orderItem.item.name}</span>
                    ${orderItem.item.size ? `<span class="item-size">(${orderItem.item.size})</span>` : ''}
                    <span class="item-quantity">x ${orderItem.quantity}</span>
                    <span class="confidence-badge">AI Confidence: ${Math.round(orderItem.confidence * 100)}%</span>
                </div>
                <div class="item-price">$${orderItem.subtotal.toFixed(2)}</div>
            </div>
        `).join('');

        // ChatGPT-enhanced response section
        let chatgptHtml = '';
        if (chatgptResult && chatgptResult.success && chatgptResult.chatgpt_response) {
            chatgptHtml = `
                <div class="chatgpt-response">
                    <h4>🤖 AI Assistant Response:</h4>
                    <div class="chatgpt-message">
                        ${chatgptResult.chatgpt_response}
                    </div>
                </div>
            `;
        } else if (chatgptResult && !chatgptResult.success) {
            chatgptHtml = `
                <div class="chatgpt-error">
                    <p><em>ChatGPT enhancement failed: ${chatgptResult.error}</em></p>
                </div>
            `;
        }

        let recommendationsHtml = '';
        if (recommendations && recommendations.found_items && recommendations.found_items.length > parsedOrder.items.length) {
            const additionalItems = recommendations.found_items.slice(parsedOrder.items.length, parsedOrder.items.length + 2);
            if (additionalItems.length > 0) {
                recommendationsHtml = `
                    <div class="additional-recommendations">
                        <h5>You might also like:</h5>
                        ${additionalItems.map(item => `
                            <div class="recommendation-item">
                                ${item.name} ($${item.price.toFixed(2)}) - ${item.relevance}
                            </div>
                        `).join('')}
                    </div>
                `;
            }
        }

        this.orderDetails.innerHTML = `
            <div class="rag-order-analysis">
                <div class="rag-badge">🤖 AI-Enhanced Analysis</div>
                ${chatgptHtml}
                <div class="order-items">
                    <h4>Detected Order (${parsedOrder.item_count} items):</h4>
                    ${itemsHtml}
                </div>
                <div class="order-total">
                    <strong>Total: $${parsedOrder.total_price.toFixed(2)}</strong>
                    <small>Overall Confidence: ${Math.round(analysis.confidence * 100)}%</small>
                </div>
                ${recommendationsHtml}
                <div class="original-text">
                    <p><strong>Customer said:</strong> "${text}"</p>
                </div>
                <div class="order-note">
                    <em>🎯 AI-powered semantic analysis using RAG technology. Understanding intent, not just keywords!</em>
                </div>
            </div>
        `;
    }

    displayBasicOrderAnalysis(analysis, text, isRagEnhanced) {
        this.orderAnalysis.style.display = 'block';

        let itemsHtml = analysis.detected_items.map(item => `
            <div class="order-item">
                <div class="item-details">
                    <span class="item-name">${item.item.name}</span>
                    ${item.item.size ? `<span class="item-size">(${item.item.size})</span>` : ''}
                    <span class="item-quantity">x ${item.quantity}</span>
                </div>
                <div class="item-price">$${item.subtotal.toFixed(2)}</div>
            </div>
        `).join('');

        this.orderDetails.innerHTML = `
            <div class="smart-order-analysis">
                ${isRagEnhanced ? '<div class="rag-badge">🤖 AI-Enhanced Analysis</div>' : ''}
                <div class="order-items">
                    <h4>Detected Items (${analysis.item_count}):</h4>
                    ${itemsHtml}
                </div>
                <div class="order-total">
                    <strong>Total: $${analysis.total_price.toFixed(2)}</strong>
                </div>
                <div class="original-text">
                    <p><strong>Customer said:</strong> "${analysis.original_text || text}"</p>
                </div>
                <div class="order-note">
                    <em>${isRagEnhanced ? '🎯 AI-powered analysis with menu matching' : 'Smart analysis using your menu database'}.</em>
                </div>
            </div>
        `;
    }

    displayRagRecommendations(analysis, text) {
        this.orderAnalysis.style.display = 'block';

        const recommendations = analysis.recommendations;

        let recommendationsHtml = '';
        if (recommendations.found_items && recommendations.found_items.length > 0) {
            recommendationsHtml = recommendations.found_items.slice(0, 5).map(item => `
                <div class="recommendation-item">
                    <div class="rec-header">
                        <span class="item-name">${item.name}</span>
                        <span class="item-price">$${item.price.toFixed(2)}</span>
                    </div>
                    <div class="rec-details">
                        <span class="relevance-badge">${item.relevance}</span>
                        ${item.description ? `<p class="item-desc">${item.description}</p>` : ''}
                    </div>
                </div>
            `).join('');
        }

        this.orderDetails.innerHTML = `
            <div class="rag-recommendations">
                <div class="rag-badge">🤖 AI Menu Recommendations</div>
                <div class="ai-response">
                    <h4>AI Assistant:</h4>
                    <p class="ai-text">"${recommendations.recommendations}"</p>
                </div>
                ${recommendationsHtml ? `
                    <div class="recommendations-list">
                        <h5>Matching Items:</h5>
                        ${recommendationsHtml}
                    </div>
                ` : ''}
                <div class="original-text">
                    <p><strong>You asked:</strong> "${text}"</p>
                </div>
                <div class="order-note">
                    <em>🎯 AI understands your preferences and suggests the best matches from our menu!</em>
                </div>
            </div>
        `;
    }

    fallbackOrderAnalysis(text) {
        // Fallback to basic analysis if API fails
        this.orderAnalysis.style.display = 'block';
        this.orderDetails.innerHTML = `
            <div class="basic-analysis">
                <p><strong>Customer said:</strong> "${text}"</p>
                <p><em>Smart analysis temporarily unavailable. Using basic detection.</em></p>
            </div>
        `;
    }

    // ========== MENU MANAGEMENT METHODS ==========

    async loadCategories() {
        try {
            console.log('Loading categories...');
            const response = await fetch('/api/menu/categories');
            const result = await response.json();

            if (result.success) {
                console.log('Categories loaded:', result.categories.length);

                // Update category filter dropdown
                this.categoryFilter.innerHTML = '<option value="">All Categories</option>';

                // Update add item category dropdown
                const itemCategorySelect = document.getElementById('itemCategory');
                if (itemCategorySelect) {
                    itemCategorySelect.innerHTML = '<option value="">Select Category</option>';

                    result.categories.forEach(category => {
                        const option1 = new Option(category.name, category.id);
                        const option2 = new Option(category.name, category.id);

                        this.categoryFilter.appendChild(option1);
                        itemCategorySelect.appendChild(option2);
                    });
                } else {
                    console.error('itemCategory select element not found');
                }
            } else {
                console.error('Failed to load categories:', result.error);
            }
        } catch (error) {
            console.error('Error loading categories:', error);
        }
    }

    async loadMenu() {
        try {
            const response = await fetch('/api/menu/items');
            const result = await response.json();

            if (result.success) {
                this.displayMenu(result.items);
            } else {
                this.menuDisplay.innerHTML = `<p class="error">Error loading menu: ${result.error}</p>`;
            }
        } catch (error) {
            console.error('Error loading menu:', error);
            this.menuDisplay.innerHTML = `<p class="error">Error loading menu: ${error.message}</p>`;
        }
    }

    displayMenu(items) {
        if (items.length === 0) {
            this.menuDisplay.innerHTML = '<p class="no-items">No menu items found.</p>';
            return;
        }

        // Group items by category
        const itemsByCategory = {};
        items.forEach(item => {
            if (!itemsByCategory[item.category]) {
                itemsByCategory[item.category] = [];
            }
            itemsByCategory[item.category].push(item);
        });

        let html = '';
        for (const [categoryId, categoryItems] of Object.entries(itemsByCategory)) {
            // Get category name
            const categoryName = this.getCategoryName(categoryId);

            html += `
                <div class="menu-category">
                    <h3 class="category-title">${categoryName}</h3>
                    <div class="menu-items">
                        ${categoryItems.map(item => `
                            <div class="menu-item">
                                <div class="item-header">
                                    <span class="item-name">${item.name}</span>
                                    ${item.size ? `<span class="item-size">${item.size}</span>` : ''}
                                    <span class="item-price">$${item.price.toFixed(2)}</span>
                                </div>
                                ${item.description ? `<p class="item-description">${item.description}</p>` : ''}
                                <div class="item-actions">
                                    <button class="btn-small btn-danger" onclick="deleteMenuItem('${item.id}')">Delete</button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        this.menuDisplay.innerHTML = html;
    }

    getCategoryName(categoryId) {
        const options = this.categoryFilter.options;
        for (let i = 0; i < options.length; i++) {
            if (options[i].value === categoryId) {
                return options[i].text;
            }
        }
        return categoryId;
    }

    async filterMenuByCategory() {
        const selectedCategory = this.categoryFilter.value;

        try {
            const url = selectedCategory ?
                `/api/menu/items?category=${selectedCategory}` :
                '/api/menu/items';

            const response = await fetch(url);
            const result = await response.json();

            if (result.success) {
                this.displayMenu(result.items);
            }
        } catch (error) {
            console.error('Error filtering menu:', error);
        }
    }

    async handleAddItem(e) {
        e.preventDefault();

        // Get form values
        const itemId = document.getElementById('itemId').value.trim();
        const itemName = document.getElementById('itemName').value.trim();
        const itemCategory = document.getElementById('itemCategory').value;
        const itemPriceStr = document.getElementById('itemPrice').value;
        const itemSize = document.getElementById('itemSize').value.trim();
        const itemDescription = document.getElementById('itemDescription').value.trim();
        const keywords = document.getElementById('itemKeywords').value.trim();

        // Validate required fields
        if (!itemId || !itemName || !itemCategory || !itemPriceStr) {
            this.showError('Please fill in all required fields (ID, Name, Category, Price)');
            return;
        }

        // Validate price
        const itemPrice = parseFloat(itemPriceStr);
        if (isNaN(itemPrice) || itemPrice <= 0) {
            this.showError('Please enter a valid price greater than 0');
            return;
        }

        const itemData = {
            id: itemId,
            name: itemName,
            category: itemCategory,
            price: itemPrice,
            size: itemSize || undefined,
            description: itemDescription || undefined,
            keywords: keywords ? keywords.split(',').map(k => k.trim()).filter(k => k) : []
        };

        try {
            const response = await fetch('/api/menu/items', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(itemData)
            });

            const result = await response.json();

            if (result.success) {
                this.showSuccess('Item added successfully!');
                this.addItemForm.reset();
                this.loadMenu();
            } else {
                this.showError(result.error);
            }
        } catch (error) {
            this.showError('Error adding item: ' + error.message);
        }
    }

    async handleAddCategory(e) {
        e.preventDefault();

        const categoryData = {
            id: document.getElementById('categoryId').value,
            name: document.getElementById('categoryName').value,
            description: document.getElementById('categoryDescription').value
        };

        try {
            const response = await fetch('/api/menu/categories', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(categoryData)
            });

            const result = await response.json();

            if (result.success) {
                this.showSuccess('Category added successfully!');
                this.addCategoryForm.reset();
                this.loadCategories();
            } else {
                this.showError(result.error);
            }
        } catch (error) {
            this.showError('Error adding category: ' + error.message);
        }
    }

    showSuccess(message) {
        // Create a temporary success message
        const successDiv = document.createElement('div');
        successDiv.className = 'alert alert-success';
        successDiv.textContent = message;
        successDiv.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 1000; background: #d4edda; color: #155724; padding: 15px; border-radius: 5px; border: 1px solid #c3e6cb;';

        document.body.appendChild(successDiv);
        setTimeout(() => successDiv.remove(), 3000);
    }

    showLoading(show) {
        this.loadingIndicator.style.display = show ? 'flex' : 'none';
    }

    showError(message) {
        // Create a temporary error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'alert alert-error';
        errorDiv.textContent = message;
        errorDiv.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 1000; background: #f8d7da; color: #721c24; padding: 15px; border-radius: 5px; border: 1px solid #f5c6cb;';

        document.body.appendChild(errorDiv);
        setTimeout(() => errorDiv.remove(), 5000);

        // Also update results section if it exists
        if (this.results) {
            this.results.innerHTML = `
                <div class="result-error">
                    <h3>Error</h3>
                    <p>${message}</p>
                </div>
            `;
        }
    }
}

// Global functions for menu management
let audioToTextApp;

function switchTab(tabName) {
    // Remove active class from all tabs and content
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    // Add active class to selected tab and content
    document.querySelector(`button[onclick="switchTab('${tabName}')"]`).classList.add('active');
    document.getElementById(tabName).classList.add('active');
}

function filterMenuByCategory() {
    if (audioToTextApp) {
        audioToTextApp.filterMenuByCategory();
    }
}

function loadMenu() {
    if (audioToTextApp) {
        audioToTextApp.loadMenu();
    }
}

async function deleteMenuItem(itemId) {
    if (!confirm('Are you sure you want to delete this item?')) {
        return;
    }

    try {
        const response = await fetch(`/api/menu/items/${itemId}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (result.success) {
            audioToTextApp.showSuccess('Item deleted successfully!');
            audioToTextApp.loadMenu();
        } else {
            audioToTextApp.showError(result.error);
        }
    } catch (error) {
        audioToTextApp.showError('Error deleting item: ' + error.message);
    }
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
    audioToTextApp = new AudioToTextApp();
});