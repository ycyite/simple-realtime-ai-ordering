# Railway Deployment Instructions

## Quick Deploy via Dashboard

1. **Go to Railway Dashboard**
   - Visit: https://railway.app/dashboard
   - Click "New Project"

2. **Deploy from GitHub (Recommended)**
   - Select "Deploy from GitHub repo"
   - Choose: `ycyite/simple-realtime-ai-ordering`
   - Branch: `development`

3. **Set Environment Variables**
   Click on your service → "Variables" → Add:
   ```
   OPENAI_API_KEY=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
   ```

4. **Generate Domain**
   - Go to "Settings" → "Networking"
   - Click "Generate Domain"
   - Copy the URL (e.g., `https://ai-voice-ordering.up.railway.app`)

5. **Access Your App**
   - Browser: `https://your-app.up.railway.app/`
   - Menu: `https://your-app.up.railway.app/menu`
   - Orders: `https://your-app.up.railway.app/orders`

## Twilio Phone Setup

1. **Get Twilio Number**
   - Go to: https://www.twilio.com/console
   - Buy a phone number with Voice capability

2. **Configure Webhook**
   - Phone Numbers → Your Number
   - Under "Voice & Fax" → "A CALL COMES IN"
   - Webhook URL: `https://your-app.up.railway.app/twilio/voice`
   - Method: `HTTP POST`
   - Save

3. **Test**
   - Call your Twilio number
   - AI will answer and take your order!

## Environment Variables Needed

- `OPENAI_API_KEY` - Your OpenAI API key (required)
- `PORT` - Auto-set by Railway (optional)

## Features

✅ Browser voice agent (WebRTC)
✅ Phone call support (Twilio + WebSocket)
✅ Menu management
✅ Order tracking
✅ Low latency
✅ Interruption support