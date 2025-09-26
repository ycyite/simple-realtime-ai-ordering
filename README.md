# 🎙️ AI Audio Ordering System - DEVELOPMENT BRANCH

**⚠️ DEVELOPMENT BRANCH - Active development for new features and improvements**

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

### **Multi-Layered LLM-Menu Interaction Design:**

The system uses a sophisticated **3-tier approach** for natural language menu processing:

#### **1. Menu Manager** (`menu_manager.py`)
- **Static Menu Storage**: JSON-based menu with items, categories, prices, keywords
- **Basic Text Parsing**: Simple keyword matching for order detection
- **Rule-based Quantity Detection**: Maps words like "two", "three" to numbers

#### **2. RAG-Enhanced Menu System** (`menu_rag.py`)
- **Semantic Search**: Uses SentenceTransformers to create embeddings for menu items
- **FAISS Vector Database**: Fast similarity search for natural language queries
- **Rich Item Descriptions**: Combines name, category, description, price context for better embeddings
- **Smart Order Parsing**: Extracts quantities, sizes, preferences from customer text

#### **3. LLM Integration Layer** (Two approaches)

**A. Direct OpenAI API** (`menu_rag.py`)
- **Structured Prompting**: System prompt defines order management rules (add/remove/clear/update)
- **Context Building**: RAG analysis + menu items + customer request → rich context
- **JSON Order Extraction**: Parses `ORDER_JSON: {...}` from LLM responses

**B. LangChain Approach** (`langchain_manager.py`)
- **Memory Management**: ConversationBufferWindowMemory keeps conversation context
- **Vector Store**: Chroma DB for menu items and FAQ retrieval
- **Conversational Chain**: ConversationalRetrievalChain for context-aware responses

#### **4. Enhanced Conversation Manager** (`conversation_manager.py`)
- **Persistent Memory**: Saves conversation history to disk
- **Context Enrichment**: Builds comprehensive context from memory + current order + menu
- **Order State Tracking**: Maintains current order state across interactions

### **Key Design Patterns:**
- **Semantic Understanding**: Instead of exact keyword matching, uses embeddings to understand intent like "something spicy" → finds relevant items
- **Multi-Modal Context**: Combines menu embeddings, conversation history, current order state, and customer preferences
- **Structured Output**: Forces LLM to output JSON for reliable order processing while maintaining natural conversation
- **Fallback Layers**: If semantic search fails, falls back to keyword matching; if LangChain fails, uses direct API

### **Technical Stack:**
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