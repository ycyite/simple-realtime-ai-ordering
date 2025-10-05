# 🎙️ AI Voice Ordering System

An AI-powered voice ordering system that supports both browser-based voice ordering and phone calls via OpenAI's native SIP integration.

## 🌟 Features

- **Browser Voice Ordering**: Customers can order directly from a web interface using their microphone
- **Phone Ordering**: AI handles phone calls through OpenAI's native SIP service
- **Smart Order Processing**: AI confirms orders, asks for customer details, and saves to database
- **Menu Management**: Easy-to-use web interface for managing restaurant menu
- **Order Tracking**: Real-time order dashboard with phone numbers and pickup times
- **Dual Architecture**: WebRTC for browser, SIP for phone calls

## 🏗️ Architecture

### Browser Orders
```
Customer Browser → WebRTC → OpenAI Realtime API → Server
```

### Phone Orders
```
Phone Call → OpenAI SIP Service → Webhook → Server
                                 ↓
                           WebSocket for tracking
```

## 📋 Requirements

- Node.js 18+
- OpenAI API key with Realtime API access
- (Optional) Twilio account for phone number

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create a `.env` file:

```bash
OPENAI_API_KEY=your_openai_api_key_here
PORT=3000
```

### 3. Set Up Menu

Edit `menu.json` to customize your restaurant menu with categories, items, prices, and descriptions.

### 4. Run the Server

```bash
npm start
```

The server will start on `http://localhost:3000`

## 📱 Usage

### Browser Voice Ordering

1. Navigate to `http://localhost:3000`
2. Click "Start Order"
3. Allow microphone access
4. Speak your order to the AI agent
5. Confirm your order details
6. View your order in the dashboard

### Phone Ordering (OpenAI Native SIP)

1. Configure OpenAI SIP webhook to point to your server:
   - Webhook URL: `https://your-domain.com/api/openai-webhook`
   - Function call URL: `https://your-domain.com/api/function-call` (optional)

2. Set up your phone number with OpenAI SIP service

3. Call the phone number - AI will:
   - Greet the customer
   - Take their order
   - Ask "Anything else?" after each item
   - Request customer name
   - Request pickup time
   - Confirm the entire order
   - Save order and hang up

## 🔌 API Endpoints

### Web UI
- `GET /` - Customer voice ordering interface
- `GET /menu` - Menu management page
- `GET /orders` - Order dashboard

### Menu API
- `GET /api/menu` - Get menu data
- `POST /api/menu` - Update menu

### Orders API
- `GET /api/orders` - Get all orders
- `POST /api/orders` - Create new order
- `DELETE /api/orders` - Clear all orders

### Phone Integration (OpenAI SIP)
- `POST /api/openai-webhook` - Receives incoming call notifications from OpenAI
- `POST /api/token` - Generates ephemeral token for browser WebRTC

### Health Check
- `GET /api/health` - Server health status

## 📁 Project Structure

```
.
├── server.js              # Main Express server
├── menu.json             # Restaurant menu configuration
├── orders.json           # Order storage
├── package.json          # Dependencies
├── public/
│   ├── index.html       # Customer ordering UI
│   ├── menu.html        # Menu management UI
│   └── orders.html      # Order dashboard UI
└── .env                 # Environment variables
```

## 🎯 How It Works

### Browser Voice Orders

1. Customer clicks "Start Order" on web interface
2. Browser requests ephemeral token from server
3. Browser connects to OpenAI Realtime API via WebRTC
4. AI agent greets customer and takes order
5. Customer speaks their order naturally
6. AI confirms items, asks for name and pickup time
7. AI calls `save_order` function via function calling
8. Order is saved to `orders.json`

### Phone Orders (SIP)

1. Customer calls the phone number
2. OpenAI SIP service sends webhook to `/api/openai-webhook`
3. Server accepts the call with session configuration
4. Server connects WebSocket to track conversation events
5. AI handles the conversation (greeting, ordering, confirmation)
6. AI calls `save_order` function with order details
7. Server saves order with phone number (extracted from SIP headers)
8. After "Drive safe, bye!" - server hangs up call (3 second delay)

## 📊 Order Data Structure

```json
{
  "customerName": "John Doe",
  "phoneNumber": "3651234567",
  "items": [
    {
      "name": "Classic Cheeseburger",
      "quantity": 2,
      "price": 8.99
    }
  ],
  "total": 17.98,
  "pickupTime": "6:30 PM",
  "source": "phone",
  "timestamp": "2025-01-15T18:25:00.000Z",
  "id": "phone-order-1736962500000"
}
```

## 🔧 Configuration

### AI Instructions

The AI agent follows these instructions:

1. **Greeting**: Immediately greets customer
2. **Order Taking**: Listens carefully and confirms each item
3. **Confirmation Loop**: Asks "Anything else?" after each item
4. **Customer Details**: Asks for name and pickup time
5. **Order Confirmation**: Repeats entire order with total and pickup time
6. **Finalization**: Calls `save_order` function and says goodbye

### Menu Configuration

Edit `menu.json`:

```json
{
  "restaurant": {
    "name": "Your Restaurant Name"
  },
  "categories": [
    {
      "name": "Category Name",
      "items": [
        {
          "name": "Item Name",
          "description": "Description",
          "price": 9.99,
          "sizes": ["Small", "Medium", "Large"]
        }
      ]
    }
  ]
}
```

## 🐛 Troubleshooting

### Browser Voice Issues
- Ensure microphone permissions are granted
- Check browser console for errors
- Verify OpenAI API key is valid

### Phone Call Issues
- Verify webhook URLs are correct in OpenAI dashboard
- Check SIP headers are being received
- Review server logs for call_id and events
- Ensure phone number format is correct (+1XXXXXXXXXX)

### WebSocket Errors
- 502 errors may occur if using call_id parameter incorrectly
- For SIP calls, WebSocket is for monitoring only
- Function calling happens via REST API responses

## 🚢 Deployment

### Railway / Render / Heroku

1. Set environment variable: `OPENAI_API_KEY`
2. Deploy the repository
3. Configure OpenAI SIP webhooks to point to your deployed URL

### Custom Server

1. Install Node.js 18+
2. Clone repository
3. Run `npm install`
4. Set environment variables
5. Run `npm start`
6. Use a reverse proxy (nginx) for HTTPS

## 📝 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENAI_API_KEY` | OpenAI API key with Realtime API access | Yes |
| `PORT` | Server port (default: 3000) | No |

## 🔐 Security Notes

- Never commit `.env` file to version control
- Keep OpenAI API key secure
- Use HTTPS in production
- Validate and sanitize all user inputs

## 📄 License

MIT

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📞 Support

For issues and questions:
- Check the troubleshooting section
- Review server logs
- Check OpenAI API documentation for Realtime API

---

Built with ❤️ using OpenAI Realtime API
