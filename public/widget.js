(function () {
     'use strict';

     // Configuration
     const CONFIG = {
          apiUrl: 'https://chat.vigaia.ai/api/chat',
          theme: {
               primaryColor: '#10b981',
               primaryColorLight: '#34d399',
               primaryColorDark: '#059669'
          },
          position: {
               bottom: '24px',
               right: '24px'
          },
          mobile: {
               bottom: '16px',
               right: '16px'
          }
     };

     // CSS Styles
     const styles = `
    .vigaia-chat-widget * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    .vigaia-chat-widget {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      position: fixed;
      z-index: 999999;
      bottom: ${CONFIG.position.bottom};
      right: ${CONFIG.position.right};
    }

    .vigaia-chat-bubble {
      width: 56px;
      height: 56px;
      background: linear-gradient(135deg, ${CONFIG.theme.primaryColor} 0%, ${CONFIG.theme.primaryColorLight} 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      transition: all 0.3s ease;
      animation: vigaia-bounce 2s infinite;
    }

    .vigaia-chat-bubble:hover {
      transform: scale(1.1);
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
    }

    .vigaia-chat-bubble svg {
      width: 24px;
      height: 24px;
      fill: none;
      stroke: white;
      stroke-width: 2;
    }

    .vigaia-chat-window {
      position: fixed;
      bottom: ${CONFIG.position.bottom};
      right: ${CONFIG.position.right};
      width: 384px;
      height: 600px;
      max-height: 600px;
      background: white;
      border-radius: 24px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      border: 1px solid #e5e7eb;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      z-index: 999999;
    }

    .vigaia-chat-header {
      background: linear-gradient(135deg, ${CONFIG.theme.primaryColor} 0%, ${CONFIG.theme.primaryColorLight} 100%);
      padding: 16px 24px;
      color: white;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .vigaia-chat-header-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .vigaia-chat-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: linear-gradient(135deg, ${CONFIG.theme.primaryColor} 0%, ${CONFIG.theme.primaryColorLight} 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      animation: vigaia-float 3s ease-in-out infinite;
    }

    .vigaia-chat-title {
      font-weight: bold;
      font-size: 18px;
    }

    .vigaia-chat-subtitle {
      font-size: 14px;
      color: rgba(255, 255, 255, 0.8);
    }

    .vigaia-chat-close {
      background: none;
      border: none;
      color: white;
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      transition: background-color 0.2s;
    }

    .vigaia-chat-close:hover {
      background-color: rgba(255, 255, 255, 0.1);
    }

    .vigaia-chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .vigaia-message {
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }

    .vigaia-message.user {
      flex-direction: row-reverse;
    }

    .vigaia-message-bubble {
      max-width: 75%;
      padding: 12px 16px;
      border-radius: 18px;
      font-size: 14px;
      line-height: 1.5;
    }

    .vigaia-message-bubble.ai {
      background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);
      color: #1f2937;
      border: 1px solid #bbf7d0;
      border-bottom-left-radius: 6px;
    }

    .vigaia-message-bubble.user {
      background: linear-gradient(135deg, #374151 0%, #111827 100%);
      color: white;
      border-bottom-right-radius: 6px;
    }

    .vigaia-product-card {
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      margin-top: 16px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      transition: box-shadow 0.2s;
    }

    .vigaia-product-card:hover {
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }

    .vigaia-product-image {
      width: 100%;
      aspect-ratio: 1;
      object-fit: cover;
    }

    .vigaia-product-info {
      padding: 16px;
    }

    .vigaia-product-title {
      font-weight: 600;
      font-size: 14px;
      color: #111827;
      margin-bottom: 8px;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .vigaia-product-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .vigaia-product-price {
      font-size: 18px;
      font-weight: bold;
      color: ${CONFIG.theme.primaryColor};
    }

    .vigaia-add-to-cart {
      padding: 6px 12px;
      background: ${CONFIG.theme.primaryColor};
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .vigaia-add-to-cart:hover {
      background: ${CONFIG.theme.primaryColorDark};
    }

    .vigaia-add-to-cart:disabled {
      background: #d1d5db;
      cursor: not-allowed;
    }

    .vigaia-chat-input {
      padding: 16px;
      background: linear-gradient(90deg, #f0fdf4 0%, #ecfdf5 100%);
      border-top: 1px solid #bbf7d0;
    }

    .vigaia-input-container {
      display: flex;
      align-items: flex-end;
      gap: 8px;
    }

    .vigaia-voice-button {
      padding: 12px;
      background: #e5e7eb;
      color: #374151;
      border: none;
      border-radius: 18px;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .vigaia-voice-button:hover {
      background: #d1d5db;
    }

    .vigaia-voice-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .vigaia-voice-button.vigaia-listening {
      background: #ef4444;
      color: white;
      animation: pulse 1.5s ease-in-out infinite;
    }

    .vigaia-voice-button.vigaia-listening .vigaia-voice-icon {
      display: none;
    }

    .vigaia-voice-button.vigaia-listening .vigaia-voice-icon-recording {
      display: block !important;
    }

    .vigaia-voice-button .vigaia-voice-icon {
      width: 20px;
      height: 20px;
    }

    .vigaia-voice-button .vigaia-voice-icon-recording {
      width: 20px;
      height: 20px;
    }

    .vigaia-input-field.vigaia-listening {
      border-color: #ef4444;
      box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.2);
    }

    @keyframes pulse {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.7;
      }
    }

    .vigaia-input-field {
      flex: 1;
      padding: 12px 16px;
      border: 1px solid #bbf7d0;
      border-radius: 18px;
      font-size: 14px;
      resize: none;
      outline: none;
      transition: border-color 0.2s;
      min-height: 44px;
      max-height: 100px;
    }

    .vigaia-input-field:focus {
      border-color: ${CONFIG.theme.primaryColor};
      box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
    }

    .vigaia-send-button {
      padding: 12px;
      background: linear-gradient(135deg, ${CONFIG.theme.primaryColor} 0%, ${CONFIG.theme.primaryColorLight} 100%);
      color: white;
      border: none;
      border-radius: 18px;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .vigaia-send-button:hover {
      background: linear-gradient(135deg, ${CONFIG.theme.primaryColorDark} 0%, ${CONFIG.theme.primaryColor} 100%);
    }

    .vigaia-send-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .vigaia-send-button svg {
      width: 16px;
      height: 16px;
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
    }

    .vigaia-typing {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #6b7280;
      font-size: 12px;
    }

    .vigaia-typing-dots {
      display: flex;
      gap: 4px;
    }

    .vigaia-typing-dot {
      width: 8px;
      height: 8px;
      background: #9ca3af;
      border-radius: 50%;
      animation: vigaia-typing 1.4s infinite ease-in-out;
    }

    .vigaia-typing-dot:nth-child(2) {
      animation-delay: 0.2s;
    }

    .vigaia-typing-dot:nth-child(3) {
      animation-delay: 0.4s;
    }

    @keyframes vigaia-bounce {
      0%, 20%, 50%, 80%, 100% {
        transform: translateY(0);
      }
      40% {
        transform: translateY(-10px);
      }
      60% {
        transform: translateY(-5px);
      }
    }

    @keyframes vigaia-float {
      0%, 100% {
        transform: translateY(0px);
      }
      50% {
        transform: translateY(-10px);
      }
    }

    @keyframes vigaia-typing {
      0%, 60%, 100% {
        transform: translateY(0);
      }
      30% {
        transform: translateY(-10px);
      }
    }

    @keyframes vigaia-fadeInUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .vigaia-fade-in {
      animation: vigaia-fadeInUp 0.6s ease-out forwards;
    }

    /* Mobile Responsive */
    @media (max-width: 640px) {
      .vigaia-chat-widget {
        bottom: ${CONFIG.mobile.bottom};
        right: ${CONFIG.mobile.right};
      }

      .vigaia-chat-bubble {
        width: 48px;
        height: 48px;
      }

      .vigaia-chat-bubble svg {
        width: 20px;
        height: 20px;
      }

      .vigaia-chat-window {
        bottom: ${CONFIG.mobile.bottom};
        right: ${CONFIG.mobile.right};
        width: calc(100vw - 2rem);
        height: calc(100vh - 2rem);
        max-height: calc(100vh - 2rem);
        border-radius: 16px;
      }

      .vigaia-chat-header {
        padding: 12px 16px;
      }

      .vigaia-chat-messages {
        padding: 12px;
        gap: 12px;
      }

      .vigaia-chat-input {
        padding: 12px;
      }
    }
  `;

     // Widget Class
     class VigaiaChatWidget {
          constructor(options = {}) {
               this.config = { ...CONFIG, ...options };
               this.isOpen = false;
               this.messages = [
                    {
                         id: '1',
                         text: "Hello! I'm your AI Nutritionist 🥗✨ I'm here to help you with personalized nutrition advice, supplement recommendations, meal planning, and achieving your health goals. What would you like to know about your nutrition journey?",
                         isUser: false,
                         timestamp: new Date()
                    }
               ];
               this.isLoading = false;
               this.isListening = false;
               this.isVoiceSupported = false;
               this.recognition = null;
               this.init();
          }

          init() {
               this.injectStyles();
               this.createWidget();
               this.initSpeechRecognition();
               this.bindEvents();
          }

          initSpeechRecognition() {
               const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
               
               if (SpeechRecognition) {
                    this.isVoiceSupported = true;
                    this.recognition = new SpeechRecognition();
                    this.recognition.continuous = false;
                    // Enable interim results to display live transcripts
                    this.recognition.interimResults = true;
                    try {
                         const browserLang = (navigator && navigator.language) ? navigator.language : 'en-US';
                         this.recognition.lang = browserLang.toLowerCase().startsWith('fr') ? 'fr-FR' : browserLang;
                    } catch {
                         this.recognition.lang = 'en-US';
                    }

                    this.recognition.onstart = () => {
                         this.isListening = true;
                         this.updateVoiceButton();
                         const inputField = document.getElementById('vigaia-input-field');
                         if (inputField) {
                              // Capture the current input so we can append transcripts without duplication
                              this.inputBaseAtStart = inputField.value || '';
                              inputField.placeholder = 'Listening... Speak now...';
                              inputField.classList.add('vigaia-listening');
                         }
                    };

                    this.recognition.onresult = (event) => {
                         const inputField = document.getElementById('vigaia-input-field');
                         if (inputField) {
                              let interimTranscript = '';
                              let finalTranscript = '';
                              const startIndex = event.resultIndex || 0;
                              for (let i = startIndex; i < event.results.length; i++) {
                                   const result = event.results[i];
                                   const text = (result[0] && result[0].transcript) ? result[0].transcript : '';
                                   if (result.isFinal) {
                                        finalTranscript += text;
                                   } else {
                                        interimTranscript += text;
                                   }
                              }
                              const base = this.inputBaseAtStart || '';
                              const spacer = base ? ' ' : '';
                              inputField.value = (base + spacer + (finalTranscript + interimTranscript).trim()).trim();
                              // Trigger input event for auto-resize
                              inputField.dispatchEvent(new Event('input'));
                         }
                         // Do not end listening on partial results; onend will reset UI
                    };

                    this.recognition.onerror = (event) => {
                         this.isListening = false;
                         this.updateVoiceButton();
                         const inputField = document.getElementById('vigaia-input-field');
                         if (inputField) {
                              inputField.placeholder = 'Ask about nutrition, supplements...';
                              inputField.classList.remove('vigaia-listening');
                         }
                         
                         // Handle different error types
                         switch (event.error) {
                              case 'no-speech':
                                   // This is expected when user doesn't speak - don't log as error
                                   break;
                              case 'audio-capture':
                                   console.warn('No microphone found or microphone not accessible.');
                                   break;
                              case 'not-allowed':
                                   alert('Microphone access denied. Please enable microphone permissions in your browser settings.');
                                   break;
                              case 'network':
                                   console.warn('Network error occurred during speech recognition.');
                                   break;
                              case 'aborted':
                                   // User or system aborted - this is expected, don't log
                                   break;
                              default:
                                   // Log other unexpected errors
                                   console.error('Speech recognition error:', event.error);
                         }
                    };

                    this.recognition.onend = () => {
                         this.isListening = false;
                         this.updateVoiceButton();
                         const inputField = document.getElementById('vigaia-input-field');
                         if (inputField) {
                              inputField.placeholder = 'Ask about nutrition, supplements...';
                              inputField.classList.remove('vigaia-listening');
                         }
                         // Reset base for next recording
                         this.inputBaseAtStart = '';
                    };
               }
          }

          toggleVoiceInput() {
               if (!this.recognition) return;

               if (this.isListening) {
                    this.recognition.stop();
                    this.isListening = false;
                    this.updateVoiceButton();
               } else {
                    try {
                         // Capture base text before starting
                         const inputField = document.getElementById('vigaia-input-field');
                         this.inputBaseAtStart = inputField ? (inputField.value || '') : '';
                         this.recognition.start();
                    } catch (error) {
                         console.error('Error starting voice recognition:', error);
                    }
               }
          }

          updateVoiceButton() {
               const voiceButton = document.getElementById('vigaia-voice-button');
               if (voiceButton) {
                    const iconNormal = voiceButton.querySelector('.vigaia-voice-icon');
                    const iconRecording = voiceButton.querySelector('.vigaia-voice-icon-recording');
                    
                    if (this.isListening) {
                         voiceButton.classList.add('vigaia-listening');
                         voiceButton.title = 'Stop recording';
                         if (iconNormal) iconNormal.style.display = 'none';
                         if (iconRecording) iconRecording.style.display = 'block';
                    } else {
                         voiceButton.classList.remove('vigaia-listening');
                         voiceButton.title = 'Start voice input';
                         if (iconNormal) iconNormal.style.display = 'block';
                         if (iconRecording) iconRecording.style.display = 'none';
                    }
               }
          }

          injectStyles() {
               if (document.getElementById('vigaia-chat-styles')) return;

               const styleSheet = document.createElement('style');
               styleSheet.id = 'vigaia-chat-styles';
               styleSheet.textContent = styles;
               document.head.appendChild(styleSheet);
          }

          createWidget() {
               // Create container
               this.container = document.createElement('div');
               this.container.className = 'vigaia-chat-widget';
               this.container.innerHTML = this.getBubbleHTML();

               document.body.appendChild(this.container);
          }

          getBubbleHTML() {
               return `
        <button class="vigaia-chat-bubble" id="vigaia-chat-bubble">
          <svg viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </button>
      `;
          }

          getWindowHTML() {
               return `
        <div class="vigaia-chat-window" id="vigaia-chat-window">
          <div class="vigaia-chat-header">
            <div class="vigaia-chat-header-info">
              <div class="vigaia-chat-avatar">🥗</div>
              <div>
                <div class="vigaia-chat-title">AI Nutritionist</div>
                <div class="vigaia-chat-subtitle">Online • Ready to help</div>
              </div>
            </div>
            <button class="vigaia-chat-close" id="vigaia-chat-close">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div class="vigaia-chat-messages" id="vigaia-chat-messages">
            ${this.getMessagesHTML()}
          </div>
          <div class="vigaia-chat-input">
            <div class="vigaia-input-container">
              ${this.isVoiceSupported ? `
              <button class="vigaia-voice-button" id="vigaia-voice-button" title="Start voice input">
                <svg class="vigaia-voice-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                <svg class="vigaia-voice-icon-recording" viewBox="0 0 24 24" fill="currentColor" style="display: none;">
                  <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                </svg>
              </button>
              ` : ''}
              <textarea 
                class="vigaia-input-field" 
                id="vigaia-input-field" 
                placeholder="Ask about nutrition, supplements..."
                rows="1"
              ></textarea>
              <button class="vigaia-send-button" id="vigaia-send-button">
                <svg viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      `;
          }

          getMessagesHTML() {
               return this.messages.map((message, index) => `
        <div class="vigaia-message ${message.isUser ? 'user' : ''} vigaia-fade-in" style="animation-delay: ${index * 0.1}s">
          ${!message.isUser ? '<div class="vigaia-chat-avatar">🥗</div>' : ''}
          <div class="vigaia-message-bubble ${message.isUser ? 'user' : 'ai'}">
            <div>${this.escapeHtml(message.text)}</div>
            ${message.recommendedProducts && message.recommendedProducts.length > 0 ? this.getProductsHTML(message.recommendedProducts) : ''}
            <div style="font-size: 12px; margin-top: 12px; opacity: 0.7;">
              ${message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
          ${message.isUser ? '<div class="vigaia-chat-avatar">👤</div>' : ''}
        </div>
      `).join('');
          }

          getProductsHTML(products) {
               return `
        <div style="margin-top: 16px;">
          <div style="font-size: 12px; font-weight: 500; color: #6b7280; margin-bottom: 12px;">
            Recommended Products:
          </div>
          <div style="display: flex; flex-direction: column; gap: 12px;">
            ${products.map(product => `
              <div class="vigaia-product-card">
                <img src="${this.escapeHtml(product.image)}" alt="${this.escapeHtml(product.title)}" class="vigaia-product-image" />
                <div class="vigaia-product-info">
                  <div class="vigaia-product-title">${this.escapeHtml(product.title)}</div>
                  <div class="vigaia-product-footer">
                    <div class="vigaia-product-price">$${product.price.toFixed(2)}</div>
                    <button class="vigaia-add-to-cart" ${!product.available ? 'disabled' : ''} onclick="window.vigaiaChatWidget.addToCart('${product.variantId}')">
                      ${product.available ? 'Add to Cart' : 'Out of Stock'}
                    </button>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
          }

          bindEvents() {
               // Bubble click
               document.getElementById('vigaia-chat-bubble').addEventListener('click', () => {
                    this.openChat();
               });

               // Auto-resize textarea
               const inputField = document.getElementById('vigaia-input-field');
               if (inputField) {
                    inputField.addEventListener('input', (e) => {
                         e.target.style.height = 'auto';
                         e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
                    });

                    // Send on Enter
                    inputField.addEventListener('keypress', (e) => {
                         if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              this.sendMessage();
                         }
                    });
               }
          }

          openChat() {
               if (this.isOpen) return;

               this.isOpen = true;
               this.container.innerHTML = this.getWindowHTML();
               this.bindWindowEvents();
               this.scrollToBottom();
          }

          closeChat() {
               if (!this.isOpen) return;

               this.isOpen = false;
               this.container.innerHTML = this.getBubbleHTML();
               this.bindEvents();
          }

          bindWindowEvents() {
               // Close button
               document.getElementById('vigaia-chat-close').addEventListener('click', () => {
                    this.closeChat();
               });

               // Voice button
               if (this.isVoiceSupported) {
                    const voiceButton = document.getElementById('vigaia-voice-button');
                    if (voiceButton) {
                         voiceButton.addEventListener('click', () => {
                              this.toggleVoiceInput();
                         });
                    }
               }

               // Send button
               document.getElementById('vigaia-send-button').addEventListener('click', () => {
                    this.sendMessage();
               });

               // Auto-resize textarea
               const inputField = document.getElementById('vigaia-input-field');
               if (inputField) {
                    inputField.addEventListener('input', (e) => {
                         e.target.style.height = 'auto';
                         e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
                    });

                    // Send on Enter
                    inputField.addEventListener('keypress', (e) => {
                         if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              this.sendMessage();
                         }
                    });
               }
          }

          async sendMessage() {
               const inputField = document.getElementById('vigaia-input-field');
               const message = inputField.value.trim();

               if (!message || this.isLoading || this.isListening) return;

               // Add user message
               const userMessage = {
                    id: Date.now().toString(),
                    text: message,
                    isUser: true,
                    timestamp: new Date()
               };

               this.messages.push(userMessage);
               inputField.value = '';
               this.updateMessages();
               this.scrollToBottom();

               // Show loading
               this.isLoading = true;
               this.showTyping();

               try {
                    const response = await fetch(this.config.apiUrl, {
                         method: 'POST',
                         headers: {
                              'Content-Type': 'application/json',
                         },
                         body: JSON.stringify({ message })
                    });

                    if (!response.ok) {
                         throw new Error(`HTTP error! status: ${response.status}`);
                    }

                    const data = await response.json();

                    const aiMessage = {
                         id: (Date.now() + 1).toString(),
                         text: data.reply || "I'm sorry, I couldn't process your request. Please try again.",
                         isUser: false,
                         timestamp: new Date(),
                         recommendedProducts: data.recommendedProducts || []
                    };

                    this.messages.push(aiMessage);
               } catch (error) {
                    console.error('Error sending message:', error);
                    const errorMessage = {
                         id: (Date.now() + 1).toString(),
                         text: "Sorry, I encountered an error. Please try again.",
                         isUser: false,
                         timestamp: new Date()
                    };
                    this.messages.push(errorMessage);
               } finally {
                    this.isLoading = false;
                    this.updateMessages();
                    this.scrollToBottom();
               }
          }

          showTyping() {
               const messagesContainer = document.getElementById('vigaia-chat-messages');
               const typingHTML = `
        <div class="vigaia-message vigaia-fade-in">
          <div class="vigaia-chat-avatar">🥗</div>
          <div class="vigaia-message-bubble ai">
            <div class="vigaia-typing">
              <div class="vigaia-typing-dots">
                <div class="vigaia-typing-dot"></div>
                <div class="vigaia-typing-dot"></div>
                <div class="vigaia-typing-dot"></div>
              </div>
              <span>AI is thinking...</span>
            </div>
          </div>
        </div>
      `;
               messagesContainer.innerHTML = this.getMessagesHTML() + typingHTML;
               this.scrollToBottom();
          }

          updateMessages() {
               const messagesContainer = document.getElementById('vigaia-chat-messages');
               if (messagesContainer) {
                    messagesContainer.innerHTML = this.getMessagesHTML();
               }
          }

          scrollToBottom() {
               const messagesContainer = document.getElementById('vigaia-chat-messages');
               if (messagesContainer) {
                    messagesContainer.scrollTop = messagesContainer.scrollHeight;
               }
          }

          addToCart(variantId) {
               // This is a placeholder for cart functionality
               // You can integrate with Shopify's cart API or your preferred cart solution
               console.log('Adding to cart:', variantId);

               // Example: Add to Shopify cart
               // fetch('/cart/add.js', {
               //   method: 'POST',
               //   headers: { 'Content-Type': 'application/json' },
               //   body: JSON.stringify({ id: variantId, quantity: 1 })
               // });

               alert('Product added to cart! (This is a demo - integrate with your cart system)');
          }

          escapeHtml(text) {
               const div = document.createElement('div');
               div.textContent = text;
               return div.innerHTML;
          }

          // Public API methods
          open() {
               this.openChat();
          }

          close() {
               this.closeChat();
          }

          sendMessage(message) {
               if (typeof message === 'string') {
                    const inputField = document.getElementById('vigaia-input-field');
                    if (inputField) {
                         inputField.value = message;
                         this.sendMessage();
                    }
               } else {
                    this.sendMessage();
               }
          }
     }

     // Auto-initialize when script loads
     function initWidget() {
          // Check if already initialized
          if (window.vigaiaChatWidget) return;

          // Get configuration from data attributes or global config
          const script = document.currentScript || document.querySelector('script[src*="widget.js"]');
          const config = {};

          if (script) {
               // Parse data attributes
               Array.from(script.attributes).forEach(attr => {
                    if (attr.name.startsWith('data-')) {
                         const key = attr.name.replace('data-', '').replace(/-([a-z])/g, (g) => g[1].toUpperCase());
                         config[key] = attr.value;
                    }
               });
          }

          // Initialize widget
          window.vigaiaChatWidget = new VigaiaChatWidget(config);
     }

     // Initialize when DOM is ready
     if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', initWidget);
     } else {
          initWidget();
     }

     // Export for manual initialization
     window.VigaiaChatWidget = VigaiaChatWidget;

})();
