<<<<<<< HEAD
# 🎙️ AI Audio Ordering System - STABLE BRANCH

**✅ STABLE BRANCH - Production-ready version (v1.0.0-stable)**
=======
# 🎙️ AI Audio Ordering System - DEVELOPMENT BRANCH
>>>>>>> development

**⚠️ DEVELOPMENT BRANCH - Active development for new features and improvements**

A sophisticated conversational AI ordering system that combines speech-to-text, RAG (Retrieval-Augmented Generation), and ChatGPT for natural language food ordering. Features complete order state management, dedicated menu management interface, and robust JSON response handling.

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
   - **🎙️ Realtime AI Restaurant:** http://localhost:5000
   - **🍽️ Menu Management:** http://localhost:5000/menu

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
│   ├── realtime_ordering.html  # Realtime AI Restaurant (Main)
│   └── menu_management.html    # Menu Management Interface
├── static/                  # CSS and JavaScript files
└── uploads/                 # Temporary audio files
```

## 🎯 Features

### **🔄 Advanced Order Management:**
- **Complete State Updates**: LLM manages entire order state (not incremental changes)
- **Automatic Total Validation**: Validates and corrects order totals in real-time
- **Robust JSON Processing**: Handles mixed text+JSON responses from LLM
- **Visual Feedback**: Real-time order updates with animations and highlighting

### **🎙️ Voice Ordering Flow:**
1. **Audio Input** → Speech-to-text (OpenAI Whisper)
2. **Semantic Search** → RAG finds relevant menu items
3. **Order Processing** → LLM returns complete order state
4. **Visual Updates** → Real-time order display with validation
5. **Order Completion** → Final summary with accurate totals

### **Two Core Interfaces:**

#### **🎙️ Realtime Ordering** (`/`)
- **Voice Recognition**: OpenAI Whisper speech-to-text
- **Natural Conversation**: ChatGPT with menu context
- **Smart Order Updates**: Complete state management by LLM
- **Real-time Display**: Visual order tracking with animations
- **Error Recovery**: Robust handling of malformed responses

#### **🍽️ Menu Management** (`/menu`)
- **CRUD Operations**: Add, edit, delete categories and items
- **Visual Organization**: Category-based menu display
- **Data Export**: Download menu as JSON
- **AI Integration**: Refresh embeddings for better understanding
- **Responsive Design**: Works on desktop and mobile

## 🔧 Configuration

### Required API Keys:
- **OpenAI API Key** - For speech-to-text and ChatGPT responses

### Menu Management:
- Add/edit items in `menu.json`
- Embeddings automatically refresh when menu changes
- RAG system provides semantic search

## 🎨 Usage Examples

### **Realtime Ordering Flow:**
```
Customer: [Speaks] "I want something spicy for lunch"
AI: "Great! I'd recommend our Chicken Wings - they're spicy buffalo wings for $8.99. Would you like those?"

Customer: [Speaks] "Yes, and add a coke too"
AI: "Perfect! So that's 1x Chicken Wings and 1x Coca-Cola. Your total is $11.98. Anything else?"

Customer: [Speaks] "That's all"
AI: "Excellent! Your order is ready for checkout."
```

### **Menu Management Examples:**
- **Categories**: Create "Appetizers", "Main Dishes", "Beverages", "Desserts"
- **Items**: Add "Cheeseburger ($9.99)", "Large Pizza ($18.99)", etc.
- **Bulk Operations**: Edit multiple items, delete entire categories
- **Export/Import**: Download menu as JSON, refresh AI embeddings
- **Real-time Updates**: Changes immediately available to ordering system

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
- **Complete State Management**: LLM returns entire order state, not incremental changes
- **Semantic Understanding**: Embeddings understand intent like "something spicy" → finds relevant items
- **JSON Response Processing**: Robust parsing handles mixed text+JSON responses
- **Real-time Validation**: Automatic total calculation and error correction
- **Multi-Modal Context**: Combines menu embeddings, conversation history, and current order state
- **Fallback Layers**: Graceful degradation when components fail

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

## 🆕 Recent Improvements (Development Branch)

### **🔧 Order Management Overhaul:**
- **Complete State Updates**: LLM now manages entire order state instead of incremental changes
- **Total Validation**: Automatic calculation verification and correction
- **Robust JSON Parsing**: Handles mixed text+JSON responses from LLM
- **Enhanced Error Recovery**: Graceful handling of malformed responses

### **🎨 User Experience:**
- **Visual Feedback**: Order updates with animations and highlighting
- **Better Navigation**: Simplified interface with clear separation of concerns
- **Responsive Design**: Works seamlessly on desktop and mobile
- **Real-time Updates**: Immediate visual feedback for all order changes

### **🍽️ Menu Management:**
- **Dedicated Interface**: Separate menu management page (`/menu`)
- **Full CRUD Operations**: Add, edit, delete categories and items
- **AI Integration**: Refresh embeddings for better natural language understanding
- **Data Export**: Download complete menu as JSON

### **🔄 System Reliability:**
- **Simplified Architecture**: Focused on two core interfaces
- **Better Error Handling**: User-friendly error messages and recovery
- **Debug Logging**: Comprehensive console logging for troubleshooting
- **State Validation**: Multiple layers of order validation

---

Ready to order with AI! 🎉