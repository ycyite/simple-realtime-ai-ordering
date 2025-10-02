# 🎙️ AI Audio Ordering System

A real-time voice-based restaurant ordering system powered by OpenAI's Realtime API with WebRTC. Take orders through **browser voice** or **real phone calls** with natural AI-powered conversations.

## ✨ Features

- **Dual Input Modes**: Browser WebRTC OR real phone calls (Twilio + SIP)
- **Real-time Voice Conversations**: Natural order interactions using OpenAI's GPT-4o-mini Realtime model
- **Browser WebRTC Integration**: Low-latency audio streaming with client-side WebRTC
- **📞 Phone Call Support**: Customers can call a real phone number powered by Twilio (NO WebSocket!)
- **Smart Auto-Close**: Automatically ends conversation after "goodbye" detection or 10 seconds of inactivity
- **Automatic Order Parsing**: Extracts order details (items, quantities, customer name, pickup time, total) from AI conversation
- **Order Display**: View recent orders with customer names, items, pickup times, and totals
- **Dynamic Menu Management**: Easy-to-use web interface for managing menu items and categories
- **Cost Tracking**: Real-time token usage and cost monitoring with separate text/audio pricing in browser console
- **Professional Order Flow**:
  - AI greets customer immediately
  - Customer places order with "Anything else?" prompts after each item
  - AI confirms order content FIRST before asking for details
  - AI asks for customer name only after order confirmation
  - AI requests pickup time
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

## 📞 Phone Call Integration (Optional)

Want customers to call a real phone number? See **[PHONE_SETUP.md](PHONE_SETUP.md)** for:
- Twilio integration
- Pure Node.js SIP server (no external dependencies!)
- Railway deployment guide
- **No WebSocket** - uses SIP/RTP → WebRTC

Quick setup:
```bash
# Add to .env
SIP_DOMAIN=your-domain.com
PUBLIC_IP=your-domain.com

# Deploy to Railway
railway up

# Configure Twilio webhook
https://your-domain/twilio/voice
```

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
4. AI asks "Anything else?" after each item
5. When customer is done, AI confirms the order content and total
6. After customer confirms, AI asks for name
7. AI asks for pickup time
8. AI gives professional closing and conversation auto-closes after 3 seconds
9. Order automatically appears in "Recent Orders" section with all details

### Viewing Orders

Orders are automatically parsed and displayed showing:
- Customer name (👤)
- Order timestamp
- Items with quantities (e.g., "2x Classic Cheeseburgers")
- Pickup time (🕒)
- Total price

### Managing Menu

1. Navigate to: `http://localhost:3000/menu`
2. Add, edit, or delete menu categories and items
3. Update prices, descriptions, and availability
4. Click **Save Menu** to persist changes

### Monitoring Costs

Open browser DevTools (F12) → Console tab to see:
- Separate text and audio token usage
- Cached input tokens (menu/instructions sent once)
- Per-response cost breakdown
- Session total cost when disconnecting

Example output:
```
💰 Response Cost Breakdown:
📊 Token Usage:
   Text Input: 245 tokens × $0.000004 = $0.00098
   Text Cached Input: 1,520 tokens × $0.0000004 = $0.00061
   Audio Input: 890 tokens × $0.000032 = $0.02848
   Audio Cached Input: 0 tokens × $0.0000004 = $0.00000
   Text Output: 128 tokens × $0.000016 = $0.00205
   Audio Output: 672 tokens × $0.000064 = $0.04301

💵 Response cost: $0.07513
💵 Session total: $0.24856
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

Edit `server.js` to change the model or instructions:
```javascript
model: 'gpt-4o-mini-realtime-preview-2024-12-17'
```

### Pricing (OpenAI Realtime API)

**Text tokens:**
- Input: $4.00 per 1M tokens
- Cached input: $0.40 per 1M tokens (menu/instructions)
- Output: $16.00 per 1M tokens

**Audio tokens:**
- Input: $32.00 per 1M tokens
- Cached input: $0.40 per 1M tokens
- Output: $64.00 per 1M tokens

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
2. Server generates token with menu context and AI instructions
3. Client establishes WebRTC peer connection to OpenAI
4. Audio streams bidirectionally with low latency
5. AI responds in real-time through voice
6. Transcripts captured for both user and AI

### Smart Auto-Close

The system intelligently closes conversations:
- **Goodbye detection**: When AI says specific farewell phrases ("drive safe...bye", "see you...bye", "goodbye"), waits 3 seconds then closes
- **Inactivity timer**: Starts 10-second timer AFTER AI finishes speaking audio (not just when response is generated)
- **User activity**: Timer resets when customer speaks

### Automatic Order Parsing

The system automatically extracts order details from the AI's confirmation:
- **Customer name**: Captured from user's voice input when they provide their name
- **Items & quantities**: Parsed from AI's confirmation (e.g., "2 Classic Cheeseburgers, 1 French Fries")
- **Pickup time**: Captured from user input and AI confirmation
- **Total**: Extracted from AI's price confirmation
- **Storage**: Orders saved to browser localStorage and persist across refreshes

Detailed parsing logs available in browser console showing each extraction step.

### Order Display

- Orders displayed with customer name, timestamp, items, pickup time, and total
- Automatically refreshes when new order is parsed
- Shows most recent orders first
- Clean card-based UI with color-coded sections

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
- Audio tokens are 8x more expensive than text tokens
- Shorter conversations = lower cost
- Use disconnect button when done

**"No token received from server":**
- Verify `.env` file contains valid `OPENAI_API_KEY`
- Check server logs for token generation errors
- Restart server after changing `.env`

**Orders not displaying:**
- Check browser console for parsing logs
- Verify AI is following the confirmation format
- Check localStorage in DevTools → Application → Local Storage

**Auto-close not working:**
- Check console for "goodbye" detection logs
- Verify AI is using exact phrases: "drive safe...bye", "see you...bye", or "goodbye"
- Check for 3-second delay before disconnect

**Inactivity timer starting too early:**
- Timer now starts on `response.audio.done` (when AI finishes speaking)
- Not on `response.completed` (when response is generated)
- Check console logs: "AI finished speaking - starting 10 second inactivity timer"

## 📝 Recent Updates

- ✅ Added automatic order parsing from AI confirmations
- ✅ Implemented pickup time display in order cards
- ✅ Improved customer name and pickup time extraction from user input
- ✅ Added detailed console logging for debugging order parsing
- ✅ Enhanced UI with order footer showing pickup time and total
- ✅ Fixed inactivity timer to start after AI finishes speaking audio
- ✅ Separated text and audio token cost calculations
- ✅ Updated order confirmation flow to confirm content before asking for name

## 📝 License

MIT

## 🤝 Contributing

Feel free to fork, modify, and use for your own restaurant ordering system!

## 📚 Resources

- [OpenAI Realtime API Documentation](https://platform.openai.com/docs/guides/realtime-webrtc)
- [WebRTC API Reference](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
- [OpenAI API Keys](https://platform.openai.com/api-keys)
- [OpenAI Realtime API Pricing](https://openai.com/api/pricing/)

## 📧 Support

For issues with:
- OpenAI API: Check [OpenAI Documentation](https://platform.openai.com/docs)
- WebRTC: Verify browser compatibility
- This project: Check console logs for detailed error messages and parsing information
