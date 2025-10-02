# 📞 SIP Server for Phone Ordering

**Branch**: `sip-server`

Standalone SIP server that bridges Twilio phone calls to OpenAI Realtime API using WebRTC. **No WebSocket** - pure SIP + WebRTC.

> **Note**: This branch is for deploying the SIP server on platforms that support UDP (like Fly.io, AWS EC2, DigitalOcean). For browser-only voice ordering on Railway, use the `development` branch.

## 🏗️ Architecture

```
Customer Phone → Twilio PSTN → SIP/RTP (UDP 5060) → This Server → WebRTC → OpenAI
```

## ✨ Features

- ✅ **Pure SIP Server** - UDP port 5060
- ✅ **No WebSocket** - Direct SIP/RTP → WebRTC bridge
- ✅ **Server-Side WebRTC** - Connects to OpenAI Realtime API
- ✅ **Browser Support** - Also includes browser voice ordering
- ✅ **Fly.io Ready** - Pre-configured for deployment

## 🚀 Deploy to Fly.io

### Prerequisites

- Fly.io account ([signup](https://fly.io/app/sign-up))
- Twilio account ([signup](https://www.twilio.com/try-twilio))
- OpenAI API key

### Step 1: Install Fly CLI

```bash
# macOS/Linux
curl -L https://fly.io/install.sh | sh

# Windows
powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"
```

### Step 2: Login to Fly.io

```bash
fly auth login
```

### Step 3: Create App

```bash
# This will use the fly.toml configuration
fly apps create ai-ordering-sip-server
```

### Step 4: Set Secrets

```bash
fly secrets set OPENAI_API_KEY=sk-proj-your-key-here
```

### Step 5: Deploy

```bash
fly deploy
```

### Step 6: Get Your Domain

```bash
fly info
# Look for "Hostname" - e.g., ai-ordering-sip-server.fly.dev
```

### Step 7: Set Environment Variables

```bash
fly secrets set SIP_DOMAIN=ai-ordering-sip-server.fly.dev
fly secrets set PUBLIC_IP=ai-ordering-sip-server.fly.dev
```

## 📞 Configure Twilio

### 1. Buy Phone Number

1. Go to [Twilio Console](https://console.twilio.com/)
2. **Phone Numbers** → **Buy a number**
3. Choose Voice capability
4. Purchase

### 2. Set Webhook

1. Click your phone number
2. **Voice Configuration**:
   - A CALL COMES IN: Webhook
   - URL: `https://ai-ordering-sip-server.fly.dev/twilio/voice`
   - Method: POST
3. Save

### 3. Test

Call your Twilio number - you should talk to the AI!

## 🔍 Monitoring

```bash
# View logs
fly logs

# Check status
fly status

# SSH into machine
fly ssh console
```

## 💰 Costs

### Fly.io
- **Free tier**: 3 shared-cpu VMs
- **Paid**: ~$5/month for dedicated resources

### Twilio
- **Phone number**: $1/month
- **Incoming calls**: $0.0085/min

### OpenAI
- **Realtime API**: ~$0.30/min

**Total**: ~$0.31/min per call + $6/month fixed

## 🐛 Troubleshooting

### UDP Port Not Working

```bash
# Check if UDP port is open
fly checks list

# Restart app
fly apps restart ai-ordering-sip-server
```

### Twilio Can't Reach Webhook

```bash
# Test webhook
curl https://ai-ordering-sip-server.fly.dev/api/health

# Check Twilio debugger
# https://console.twilio.com/debugger
```

### No Audio on Calls

1. Check `SIP_DOMAIN` and `PUBLIC_IP` are set correctly
2. Verify UDP port 5060 is accessible
3. Review logs: `fly logs`

## 📁 Project Structure

```
├── server.js           # Main server (HTTP + SIP + WebRTC)
├── public/             # Browser UI (optional)
├── menu.json           # Restaurant menu
├── orders.json         # Order storage
├── fly.toml            # Fly.io configuration
├── package.json        # Dependencies
└── README_SIP.md       # This file
```

## 🔧 Local Development

```bash
# Install dependencies
npm install

# Start server
npm start

# Server runs on:
# - HTTP: localhost:3000
# - SIP: UDP 5060
```

For local testing with Twilio, use ngrok:

```bash
ngrok http 3000
# Use ngrok URL for Twilio webhook
```

## 🌳 Branches

- **`development`**: Browser-only (Railway-compatible, no SIP)
- **`sip-server`**: This branch (SIP server for Fly.io/AWS/DO)

## 📚 Resources

- [Fly.io Docs](https://fly.io/docs/)
- [Twilio Voice Docs](https://www.twilio.com/docs/voice)
- [OpenAI Realtime API](https://platform.openai.com/docs/guides/realtime)

## 📝 License

MIT

---

**Questions?**
- Fly.io logs: `fly logs`
- Twilio debugger: https://console.twilio.com/debugger
- OpenAI status: https://status.openai.com/
