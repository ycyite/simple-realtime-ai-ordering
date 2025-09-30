# 🎙️ AI Audio Ordering System

A real-time voice-based restaurant ordering system powered by OpenAI's Realtime API with WebRTC. Take phone orders naturally through AI-powered voice conversations.

## ✨ Features

- **Real-time Voice Conversations**: Natural phone order interactions using OpenAI's GPT-4o-mini Realtime model
- **WebRTC Integration**: Low-latency audio streaming with client-side WebRTC implementation
- **Dynamic Menu Management**: Easy-to-use web interface for managing menu items and categories
- **Order Display**: View recent orders with customer names, items, and totals
- **Cost Tracking**: Real-time token usage and cost monitoring in browser console
- **Professional Order Flow**:
  - AI asks for customer name
  - AI requests pickup time
  - AI confirms full order with total price
  - Professional closing: "Perfect, see you at [time]. Drive safe, bye!"

## 🚀 Quick Start

### Prerequisites

- Node.js (v18 or higher recommended)
- OpenAI API key with access to Realtime API
- Modern web browser with WebRTC support (Chrome, Firefox, Edge)

### Installation

1. **Clone or download the project**
   ```bash
   cd AI_Audio_Ordering_System
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create environment file**

   Create a `.env` file in the project root:
   ```env
   OPENAI_API_KEY=your_openai_api_key_here
   PORT=3000
   ```

4. **Start the server**
   ```bash
   npm start
   ```

   For development with auto-reload:
   ```bash
   npm run dev
   ```

5. **Open in browser**

   Navigate to: `http://localhost:3000`

## 📦 Dependencies

```json
{
  "@openai/agents": "^0.0.9",     // OpenAI Agents SDK for Realtime API
  "express": "^4.18.2",            // Web server framework
  "dotenv": "^16.3.1",             // Environment variable management
  "cors": "^2.8.5",                // Cross-origin resource sharing
  "zod": "^3.22.4"                 // Schema validation
}
```

### Install all dependencies:
```bash
npm install express dotenv cors zod @openai/agents
```

## 📁 Project Structure

```
AI_Audio_Ordering_System/
├── server.js              # Express server with token generation
├── public/
│   ├── index.html         # Main voice ordering interface
│   └── menu.html          # Menu management interface
├── menu.json              # Restaurant menu data
├── .env                   # Environment variables (create this)
├── package.json           # Project dependencies
└── README.md              # This file
```

## 🎯 Usage

### Taking Orders

1. Click the **microphone button** to start a voice session
2. The AI will greet the customer immediately
3. Customer places their order naturally through voice
4. AI asks for customer name and pickup time
5. AI confirms the complete order with total price
6. Click **Disconnect** button to end the session

### Managing Menu

1. Navigate to: `http://localhost:3000/menu`
2. Add, edit, or delete menu categories and items
3. Update prices, descriptions, and availability
4. Click **Save Menu** to persist changes

### Monitoring Costs

Open browser DevTools (F12) → Console tab to see:
- Per-response token usage and cost
- Session total cost when disconnecting

Example output:
```
💰 Response Cost Breakdown:
   Input tokens:  1,250 × $0.000032 = $0.000040
   Output tokens: 850 × $0.000064 = $0.000054
   Response cost: $0.000094
   Session total: $0.000094
```

## ⚙️ Configuration

### Menu Structure (`menu.json`)

```json
{
  "restaurant": {
    "name": "Joe's Diner",
    "phone": "(555) 123-4567",
    "hours": "Mon-Sun: 10am-10pm"
  },
  "categories": [
    {
      "id": "burgers",
      "name": "Burgers",
      "items": [
        {
          "id": "classic-burger",
          "name": "Classic Cheeseburger",
          "description": "Beef patty with cheese, lettuce, tomato, and pickles",
          "price": 10.99,
          "available": true
        }
      ]
    }
  ]
}
```

### AI Model Settings

Edit `server.js` line 109 to change the model:
```javascript
model: 'gpt-4o-mini-realtime-preview'  // Current model
```

### Pricing (as of current implementation)

- Input tokens: $32.00 per 1M tokens ($0.000032 per token)
- Output tokens: $64.00 per 1M tokens ($0.000064 per token)

## 🔧 API Endpoints

- `GET /` - Voice ordering interface
- `GET /menu` - Menu management interface
- `GET /api/menu` - Get menu data (JSON)
- `POST /api/menu` - Update menu data
- `POST /api/token` - Generate ephemeral token for Realtime API
- `GET /api/health` - Health check

## 🎨 Features in Detail

### WebRTC Connection Flow

1. Client requests ephemeral token from server
2. Server generates token with menu context
3. Client establishes WebRTC peer connection
4. Audio streams bidirectionally with low latency
5. AI responds in real-time through voice

### Order Display

- Orders stored in browser localStorage
- Displays customer name, items, and total
- Shows timestamp for each order
- Persists across page refreshes

## 🐛 Troubleshooting

**Port already in use:**
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <process_id> /F

# Mac/Linux
lsof -ti:3000 | xargs kill -9
```

**No microphone access:**
- Ensure browser has microphone permissions
- Check system microphone settings
- Try HTTPS if having issues (WebRTC prefers secure contexts)

**High API costs:**
- Monitor console for token usage
- Shorter conversations = lower cost
- Use disconnect button when done

**"No token received from server":**
- Verify `.env` file contains valid `OPENAI_API_KEY`
- Check server logs for token generation errors
- Restart server after changing `.env`

## 📝 License

MIT

## 🤝 Contributing

Feel free to fork, modify, and use for your own restaurant ordering system!

## 📚 Resources

- [OpenAI Realtime API Documentation](https://platform.openai.com/docs/guides/realtime-webrtc)
- [WebRTC API Reference](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
- [OpenAI API Keys](https://platform.openai.com/api-keys)

## 📧 Support

For issues with:
- OpenAI API: Check [OpenAI Documentation](https://platform.openai.com/docs)
- WebRTC: Verify browser compatibility
- This project: Check console logs for detailed error messages