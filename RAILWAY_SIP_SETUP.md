# Railway SIP Server Setup Guide

This branch (`sip-server-railway`) implements a **standalone SIP server** that runs directly in your Node.js application - **no external dependencies needed**!

## Architecture

```
Phone Call → Twilio PSTN → SIP/RTP → Your Railway App → WebRTC → OpenAI Realtime API
```

✅ **No WebSocket** - Pure SIP + WebRTC
✅ **No external SIP server** - Everything runs in one Node.js process
✅ **Railway-compatible** - Deploys as a single service

---

## How It Works

1. **Customer calls your Twilio number**
2. **Twilio webhook** (`/twilio/voice`) returns TwiML that dials your SIP server
3. **SIP server** (running on port 5060) receives the call
4. **Server creates WebRTC connection** to OpenAI Realtime API
5. **Audio flows**: Phone ↔ Twilio ↔ SIP/RTP ↔ Your Server ↔ WebRTC ↔ OpenAI

---

## Prerequisites

1. **Twilio Account**: [Sign up here](https://www.twilio.com/try-twilio)
2. **Railway Account**: [Sign up here](https://railway.app/)
3. **OpenAI API Key**: With Realtime API access

---

## Step 1: Deploy to Railway

### Option A: Railway CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Create new project
railway init

# Deploy
railway up

# Get your app URL
railway domain
```

### Option B: Railway Dashboard

1. Go to [railway.app](https://railway.app/)
2. Click **New Project** → **Deploy from GitHub repo**
3. Select your repository and branch `sip-server-railway`
4. Railway will auto-detect and deploy

---

## Step 2: Configure Environment Variables

In Railway Dashboard, set these variables:

```bash
OPENAI_API_KEY=sk-proj-...
SIP_PORT=5060
SIP_DOMAIN=your-app.railway.app
PUBLIC_IP=your-app.railway.app
```

To get your Railway domain:
- Go to your project → **Settings** → **Domains**
- Copy the generated domain (e.g., `your-app.railway.app`)

---

## Step 3: Configure Railway Networking

**Important**: Railway needs to expose UDP port 5060 for SIP.

### Option A: Railway Proxy (Recommended)

Railway automatically handles this - no configuration needed! The SIP server will bind to `0.0.0.0:5060` and Railway will route traffic.

### Option B: Custom Domain (Advanced)

1. Go to **Settings** → **Networking**
2. Add custom domain
3. Configure DNS A record to point to Railway's IP

---

## Step 4: Configure Twilio

### 4.1 Buy a Phone Number

1. Go to [Twilio Console](https://console.twilio.com/)
2. **Phone Numbers** → **Buy a number**
3. Choose a number with **Voice** capability
4. Purchase it

### 4.2 Configure Voice Webhook

1. Click on your purchased number
2. Under **Voice Configuration**:
   - **A call comes in**: Webhook
   - **URL**: `https://your-app.railway.app/twilio/voice`
   - **HTTP**: POST

### 4.3 Configure SIP Domain (Important!)

1. Go to **Voice** → **SIP Domains**
2. Click **Create a new SIP Domain**
3. **SIP Domain**: `your-app.sip.twilio.com`
4. **Voice Configuration**:
   - **Request URL**: `https://your-app.railway.app/twilio/voice`
   - **HTTP**: POST
5. **Authentication**:
   - For simplicity: **None** (use IP allowlist)
   - For production: Set up credential lists

---

## Step 5: Test the Integration

### Test Call Flow

1. **Call your Twilio number** from your phone
2. **Check Railway logs**:
   ```bash
   railway logs
   ```

3. **Expected log output**:
   ```
   📞 Incoming call from: +1234567890
   📞 SIP INVITE received, Call-ID: abc123...
   🔑 Creating OpenAI WebRTC connection...
   ✅ OpenAI WebRTC connection established
   ✅ SIP call connected, bridging to OpenAI WebRTC
   ```

4. **Talk to the AI agent** - it should greet you and take your order!

---

## Troubleshooting

### Issue: "SIP server not receiving calls"

**Causes**:
1. Railway hasn't exposed UDP port 5060
2. Twilio can't reach your server

**Solution**:
```bash
# Check Railway logs
railway logs

# Verify SIP server is running
# You should see: "📞 SIP Server: UDP Port 5060"

# Test with curl
curl https://your-app.railway.app/api/health
# Should return: {"status":"healthy","sipServerRunning":true,...}
```

### Issue: "No audio on the call"

**Causes**:
1. RTP ports not accessible
2. NAT/firewall blocking UDP
3. SDP negotiation failed

**Solution**:
1. Check `PUBLIC_IP` environment variable matches your Railway domain
2. Review Railway logs for SDP errors
3. Verify WebRTC connection succeeded

### Issue: "Twilio returns error"

**Solution**:
1. Go to [Twilio Debugger](https://console.twilio.com/debugger)
2. Check recent errors
3. Verify webhook URL is correct
4. Ensure your app is deployed and running

### Issue: "OpenAI connection fails"

**Solution**:
1. Verify `OPENAI_API_KEY` is set correctly
2. Check you have Realtime API access
3. Review OpenAI API status page
4. Check Railway logs for specific error messages

---

## Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `OPENAI_API_KEY` | ✅ Yes | Your OpenAI API key | `sk-proj-...` |
| `SIP_PORT` | ⚠️ Optional | SIP server port | `5060` (default) |
| `SIP_DOMAIN` | ✅ Yes | Your public domain | `myapp.railway.app` |
| `PUBLIC_IP` | ✅ Yes | Public IP or domain | `myapp.railway.app` |
| `PORT` | ⚠️ Optional | HTTP server port | `3000` (Railway auto-assigns) |

---

## Cost Breakdown

### Per-Minute Costs
- **Twilio Incoming Call**: $0.0085/min
- **OpenAI Realtime API**: ~$0.30/min (input + output)
- **Railway Hosting**: Free tier available, then $5/month
- **Total**: ~$0.31/min per call

### Monthly Fixed Costs
- **Twilio Phone Number**: $1.00/month
- **Railway Pro** (optional): $5.00/month
- **Total Fixed**: $1-6/month

---

## Advanced Configuration

### Enable Call Recording

Update `/twilio/voice` endpoint to include recording:

```javascript
const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Record maxLength="3600" recordingStatusCallback="/recording-complete" />
  <Dial>
    <Sip>sip:agent@${sipDomain}:${sipPort}</Sip>
  </Dial>
</Response>`;
```

### Add Authentication

Set up SIP authentication in Twilio SIP Domain:

1. Create **Credential List** in Twilio
2. Add username/password
3. Attach to your SIP Domain
4. Update SIP server code to handle AUTH requests

### Monitor Active Calls

Add endpoint to check active calls:

```javascript
app.get('/api/active-calls', (req, res) => {
  res.json({
    count: activeCalls.size,
    calls: Array.from(activeCalls.keys())
  });
});
```

---

## Switching Back to Development Branch

To use the browser-only version (no phone calls):

```bash
git checkout development
npm install
npm start
```

---

## Support & Resources

- [Railway Documentation](https://docs.railway.app/)
- [Twilio SIP Documentation](https://www.twilio.com/docs/voice/sip)
- [OpenAI Realtime API](https://platform.openai.com/docs/guides/realtime)
- [SIP.js Documentation](https://sipjs.com/)

---

## What's Different from Development Branch?

| Feature | Development Branch | SIP Server Branch |
|---------|-------------------|-------------------|
| Voice Input | ✅ Browser WebRTC only | ✅ Browser + Phone Calls |
| Phone Integration | ❌ None | ✅ Twilio SIP |
| External Dependencies | None | None |
| Deployment | Any platform | Railway/any platform |
| WebSocket | ❌ Not used | ❌ Not used |
| SIP Server | ❌ None | ✅ Built-in (port 5060) |

---

## Next Steps

1. ✅ Deploy to Railway
2. ✅ Configure environment variables
3. ✅ Buy Twilio phone number
4. ✅ Set up Twilio webhooks
5. ✅ Test call flow
6. 🎉 Take orders via phone!

Need help? Check Railway logs and Twilio debugger for detailed error messages.
