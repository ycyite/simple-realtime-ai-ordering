# AI Phone Ordering SIP Server

SIP server that connects Twilio phone calls to OpenAI Realtime API using WebRTC.

## Architecture

```
Phone Caller → Twilio PSTN → SIP/RTP → Server-side WebRTC → OpenAI Realtime API
```

## Requirements

- Node.js 18+
- OpenAI API key
- Twilio account with phone number
- Cloud platform with UDP support (Fly.io, AWS, DigitalOcean)
- **Note**: Railway does NOT support UDP - use Fly.io instead

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env`:

```bash
OPENAI_API_KEY=your_openai_api_key_here

SIP_PORT=5060
SIP_DOMAIN=your-app.fly.dev
PUBLIC_IP=your-app.fly.dev
```

### 3. Deploy to Fly.io

```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Login
fly auth login

# Create app
fly apps create ai-ordering-sip-server

# Set secrets
fly secrets set OPENAI_API_KEY=your-openai-key

# Deploy
fly deploy
```

### 4. Configure Twilio

1. Go to [Twilio Console](https://console.twilio.com/)
2. Navigate to Phone Numbers → Manage → Active Numbers
3. Select your phone number
4. Under "Voice Configuration":
   - Configure with: Webhooks, TwiML Bins, Functions, Studio, or Proxy
   - A call comes in: Webhook
   - URL: `https://your-app.fly.dev/twilio/voice`
   - HTTP: POST
5. Save

### 5. Test

Call your Twilio number. The AI agent should answer and take your order.

## API Endpoints

### Phone Integration

- `POST /twilio/voice` - Twilio webhook (receives incoming calls)
- SIP server on UDP port 5060

### Management API

- `GET /api/health` - Health check
- `GET /api/menu` - Get menu data
- `POST /api/menu` - Update menu
- `GET /api/orders` - Get orders
- `POST /api/orders` - Add order

## Files

- `server.js` - Main SIP server with WebRTC bridge to OpenAI
- `menu.json` - Restaurant menu configuration
- `orders.json` - Order history
- `fly.toml` - Fly.io deployment configuration
- `.env.example` - Environment variables template

## How It Works

1. Customer calls Twilio phone number
2. Twilio webhook forwards to `/twilio/voice`
3. Server responds with TwiML to dial SIP endpoint
4. Twilio sends SIP INVITE to server on UDP port 5060
5. Server creates WebRTC connection to OpenAI Realtime API
6. Server bridges SIP/RTP audio to WebRTC
7. AI agent handles the conversation
8. Order is saved to `orders.json`

## Monitoring

View logs:

```bash
fly logs
```

Check health:

```bash
curl https://your-app.fly.dev/api/health
```

## Troubleshooting

**SIP INVITE not received**
- Ensure UDP port 5060 is exposed (Fly.io does this automatically via `fly.toml`)
- Railway does NOT support UDP - must use Fly.io, AWS, or DigitalOcean

**Audio issues**
- Check codec compatibility (PCMU/PCMA)
- Verify WebRTC connection state in logs

**Twilio webhook fails**
- Verify webhook URL is correct
- Check Twilio debugger: https://console.twilio.com/monitor/debugger

## License

MIT
