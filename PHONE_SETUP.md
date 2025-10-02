# 📞 Phone Call Integration Setup

This guide explains how to add phone call support to your AI ordering system using Twilio + Pure Node.js SIP Server.

## 🏗️ Architecture

```
Phone Call → Twilio PSTN → SIP/RTP → Your Server → WebRTC → OpenAI Realtime API
```

**No WebSocket!** Pure SIP + WebRTC for low latency.

---

## ✨ Features

- ✅ **No External Dependencies** - SIP server runs in Node.js
- ✅ **Railway Compatible** - Deploys as single service
- ✅ **No WebSocket** - Pure SIP/RTP → WebRTC
- ✅ **Works Alongside Browser** - Both browser and phone ordering in same app

---

## 🚀 Quick Setup

### Step 1: Install Dependencies

Dependencies are already installed:
- `sip` - Pure Node.js SIP library
- `sdp-transform` - SDP parsing/generation
- `@roamhq/wrtc` - Server-side WebRTC

### Step 2: Environment Variables

Add to `.env`:

```bash
# Required for phone integration
SIP_PORT=5060
SIP_DOMAIN=your-domain.com
PUBLIC_IP=your-domain.com
```

### Step 3: Deploy to Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up

# Set environment variables
railway variables set SIP_DOMAIN=your-app.railway.app
railway variables set PUBLIC_IP=your-app.railway.app
```

### Step 4: Configure Twilio

1. **Buy a Phone Number**
   - Go to [Twilio Console](https://console.twilio.com/)
   - Buy number with Voice capability

2. **Set Webhook**
   - Click your phone number
   - Voice Configuration → Webhook
   - URL: `https://your-app.railway.app/twilio/voice`
   - Method: POST

3. **Test**
   - Call your Twilio number
   - Talk to the AI agent!

---

## 📋 How It Works

### Call Flow

1. Customer calls your Twilio number
2. Twilio sends webhook to `/twilio/voice`
3. Server responds with TwiML to dial SIP endpoint
4. SIP server (port 5060) receives INVITE
5. Server creates WebRTC connection to OpenAI
6. Audio flows: Phone ↔ SIP/RTP ↔ Server ↔ WebRTC ↔ OpenAI

### Code Structure

```javascript
// Twilio webhook returns TwiML
app.post('/twilio/voice', ...)

// SIP server handles incoming calls
sip.start({ port: 5060 }, ...)

// Server-side WebRTC to OpenAI
async function createOpenAIWebRTCForPhone() {
  const pc = new RTCPeerConnection();
  // Connect to OpenAI via WebRTC...
}
```

---

## 🔍 Testing Locally

### Option 1: ngrok (Recommended)

```bash
# Install ngrok
npm install -g ngrok

# Start server
npm start

# In another terminal, expose port 3000
ngrok http 3000

# Use ngrok URL for Twilio webhook
# Example: https://abc123.ngrok.io/twilio/voice
```

### Option 2: Railway (Production)

Just deploy to Railway and use Railway domain.

---

## 🐛 Troubleshooting

### No Audio on Calls

**Problem**: Call connects but no audio

**Solutions**:
1. Check `PUBLIC_IP` matches your domain
2. Verify SIP server is running (check logs for "SIP Server: UDP Port 5060")
3. Check firewall allows UDP port 5060

### Twilio Can't Reach Webhook

**Problem**: Twilio returns error

**Solutions**:
1. Verify app is running and accessible
2. Check webhook URL is correct (include https://)
3. Review Twilio debugger: https://console.twilio.com/debugger

### OpenAI Connection Fails

**Problem**: SIP connects but WebRTC fails

**Solutions**:
1. Verify OPENAI_API_KEY is valid
2. Check Realtime API access
3. Review server logs for errors

---

## 💰 Costs

### Per Call
- Twilio incoming: $0.0085/min
- OpenAI Realtime: ~$0.30/min
- **Total**: ~$0.31/min

### Monthly
- Twilio phone number: $1/month
- Railway hosting: Free or $5/month

---

## 📡 API Endpoints

### For Twilio

```
POST /twilio/voice
```

Called by Twilio when call comes in. Returns TwiML.

### Health Check

```bash
curl https://your-app.railway.app/api/health

# Response includes sipServerRunning: true
```

---

## 🔧 Advanced Configuration

### Custom SIP Port

```bash
# .env
SIP_PORT=5080
```

Update Twilio webhook TwiML to use port 5080.

### Call Recording

Add to `/twilio/voice` endpoint:

```javascript
const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Record maxLength="3600" />
  <Dial>
    <Sip>sip:agent@${sipDomain}:${SIP_PORT}</Sip>
  </Dial>
</Response>`;
```

### Monitor Active Calls

```javascript
app.get('/api/active-calls', (req, res) => {
  res.json({
    count: activeCalls.size,
    calls: Array.from(activeCalls.keys())
  });
});
```

---

## 🌐 Dual Mode: Browser + Phone

This implementation supports **both**:

1. **Browser Voice Ordering**
   - Go to `http://localhost:3000`
   - Click microphone, talk to AI
   - Uses browser WebRTC directly

2. **Phone Voice Ordering**
   - Call your Twilio number
   - Talk to same AI agent
   - Uses Twilio → SIP → Server WebRTC

Same menu, same AI, same orders database!

---

## 📚 Resources

- [Twilio Voice](https://www.twilio.com/docs/voice)
- [OpenAI Realtime API](https://platform.openai.com/docs/guides/realtime)
- [Railway Deployment](https://docs.railway.app/)
- [SIP.js](https://sipjs.com/)

---

## ✅ Checklist

- [ ] Dependencies installed (`npm install`)
- [ ] Environment variables set (SIP_DOMAIN, PUBLIC_IP)
- [ ] Deployed to Railway
- [ ] Twilio phone number purchased
- [ ] Twilio webhook configured
- [ ] Test call successful

---

**Need Help?**
- Check server logs: `railway logs`
- Check Twilio debugger: https://console.twilio.com/debugger
- Verify health endpoint: `curl https://your-app/api/health`
