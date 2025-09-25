# 🎙️ AI Audio Ordering System

A conversational AI ordering system that combines speech-to-text, RAG (Retrieval-Augmented Generation), and ChatGPT for natural language food ordering.

## 🚀 Quick Start

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Set up OpenAI API key:**
   - Add your OpenAI API key to `.env` file
   - Or enter it directly in the web interface

3. **Run the application:**
   ```bash
   python app.py
   # Serves on http://localhost:5000
   ```

4. **Access the interfaces:**
   - **🎙️ Realtime AI Restaurant:** http://localhost:5000/realtime
   - **🎙️ Conversational Ordering:** http://localhost:5000/conversation
   - **🤖 Automation Testing:** http://localhost:5000/automation
   - **🔧 Manual Testing:** http://localhost:5000

## 📁 Project Structure

```
├── app.py                    # Main Flask application
├── conversation_manager.py   # Enhanced conversation with memory
├── simple_audio_to_text.py   # Speech-to-text using OpenAI Whisper
├── menu_manager.py           # Menu CRUD operations
├── menu_rag.py              # RAG system with ChatGPT integration
├── menu.json                # Menu database
├── menu_embeddings.npy      # Pre-computed embeddings
├── menu_index.faiss         # FAISS search index
├── conversation_memory.pkl  # Persistent conversation memory
├── chroma_db/               # Vector database storage
├── .env                     # Environment variables (API keys)
├── requirements.txt         # Python dependencies
├── templates/               # HTML templates
│   ├── index.html          # Manual testing interface
│   ├── automation.html     # Automation testing
│   ├── conversational_ordering.html  # Enhanced conversation
│   └── realtime_ordering.html        # Realtime AI Restaurant (Main)
├── static/                  # CSS and JavaScript files
└── uploads/                 # Temporary audio files
```

## 🎯 Features

### **Conversational Ordering Flow:**
1. **Audio Input** → Speech-to-text (OpenAI Whisper)
2. **Text Processing** → RAG semantic search
3. **AI Response** → ChatGPT conversational responses
4. **Order Building** → Context-aware order management
5. **Order Completion** → Final order summary

### **Three Interfaces:**

1. **🎙️ Conversational Ordering** (`/conversation`)
   - Natural voice conversations
   - Context-aware responses
   - Real-time order building

2. **🤖 Automation Testing** (`/automation`)
   - Pre-defined test scenarios
   - Batch testing capabilities
   - Performance metrics

3. **🔧 Manual Testing** (`/`)
   - Direct audio upload/recording
   - Menu management
   - System debugging

## 🔧 Configuration

### Required API Keys:
- **OpenAI API Key** - For speech-to-text and ChatGPT responses

### Menu Management:
- Add/edit items in `menu.json`
- Embeddings automatically refresh when menu changes
- RAG system provides semantic search

## 🎨 Usage Examples

### Conversational Flow:
```
User: "I want something spicy for lunch"
AI: "Great! I'd recommend our Chicken Wings - they're spicy buffalo wings for $8.99. Would you like those?"

User: "Yes, and add a coke too"
AI: "Perfect! So that's 1x Chicken Wings and 1x Coca-Cola. Your total is $11.98. Anything else?"

User: "That's all"
AI: "Excellent! Let me finalize your order."
```

## 🏗️ Architecture

- **Frontend:** HTML/CSS/JavaScript with real-time audio recording
- **Backend:** Flask with REST API endpoints
- **AI Components:**
  - OpenAI Whisper for speech recognition
  - Sentence transformers for embeddings
  - FAISS for vector similarity search
  - OpenAI ChatGPT for conversational responses
- **Storage:** JSON file database with vector embeddings

## 🌟 Key Technologies

- **Flask** - Web framework
- **OpenAI APIs** - Speech-to-text and ChatGPT
- **Sentence Transformers** - Text embeddings
- **FAISS** - Vector similarity search
- **RAG** - Retrieval-Augmented Generation
- **JavaScript** - Real-time audio processing

Ready to order with AI! 🎉