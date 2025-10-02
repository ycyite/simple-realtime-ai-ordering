import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import sip from 'sip';
import sdpTransform from 'sdp-transform';
import wrtc from '@roamhq/wrtc';

const { RTCPeerConnection } = wrtc;

// Load environment variables
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const SIP_PORT = process.env.SIP_PORT || 5060;
const MENU_FILE = path.join(__dirname, 'menu.json');
const ORDERS_FILE = path.join(__dirname, 'orders.json');

// Store active phone calls
const activeCalls = new Map();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // For Twilio webhook data

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    openaiConfigured: !!process.env.OPENAI_API_KEY,
    sipServerRunning: true,
    activeCalls: activeCalls.size
  });
});

// Get menu data (for management)
app.get('/api/menu', async (req, res) => {
  try {
    const menuData = await fs.readFile(MENU_FILE, 'utf-8');
    res.json(JSON.parse(menuData));
  } catch (error) {
    console.error('❌ Error reading menu:', error);
    res.status(500).json({ error: 'Failed to load menu' });
  }
});

// Update menu data (for management)
app.post('/api/menu', async (req, res) => {
  try {
    const menuData = JSON.stringify(req.body, null, 2);
    await fs.writeFile(MENU_FILE, menuData, 'utf-8');
    console.log('✅ Menu updated successfully');
    res.json({ success: true, message: 'Menu updated' });
  } catch (error) {
    console.error('❌ Error updating menu:', error);
    res.status(500).json({ error: 'Failed to update menu' });
  }
});

// Get orders data (for management)
app.get('/api/orders', async (req, res) => {
  try {
    const ordersData = await fs.readFile(ORDERS_FILE, 'utf-8');
    res.json(JSON.parse(ordersData));
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.json([]);
    } else {
      console.error('❌ Error reading orders:', error);
      res.status(500).json({ error: 'Failed to load orders' });
    }
  }
});

// Add new order (from phone calls)
app.post('/api/orders', async (req, res) => {
  try {
    let orders = [];

    // Read existing orders
    try {
      const ordersData = await fs.readFile(ORDERS_FILE, 'utf-8');
      orders = JSON.parse(ordersData);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }

    // Add new order with timestamp and ID
    const newOrder = {
      ...req.body,
      timestamp: new Date().toISOString(),
      id: `order-${Date.now()}`
    };

    orders.push(newOrder);

    // Save updated orders
    await fs.writeFile(ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf-8');
    console.log('✅ Order added successfully:', newOrder.id);

    res.json({ success: true, order: newOrder });
  } catch (error) {
    console.error('❌ Error adding order:', error);
    res.status(500).json({ error: 'Failed to add order' });
  }
});

// ============================================================================
// PHONE CALL INTEGRATION (Twilio SIP + OpenAI WebRTC)
// ============================================================================

// Twilio Voice webhook - Forward to SIP server
app.post('/twilio/voice', async (req, res) => {
  console.log('\n' + '='.repeat(60));
  console.log('📞 INCOMING CALL FROM TWILIO');
  console.log('='.repeat(60));
  console.log(`   From: ${req.body.From || 'undefined'}`);
  console.log(`   To: ${req.body.To || 'undefined'}`);
  console.log(`   Call SID: ${req.body.CallSid || 'undefined'}`);
  console.log(`   Call Status: ${req.body.CallStatus || 'undefined'}`);

  const sipDomain = process.env.SIP_DOMAIN || req.headers.host.split(':')[0];
  const sipEndpoint = `sip:agent@${sipDomain}:${SIP_PORT}`;

  console.log(`   → Forwarding to SIP: ${sipEndpoint}`);
  console.log('='.repeat(60) + '\n');

  // TwiML to dial our SIP server
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial>
    <Sip>${sipEndpoint}</Sip>
  </Dial>
</Response>`;

  res.type('text/xml');
  res.send(twiml);
});

// SIP Server - Handle incoming calls from Twilio
sip.start({
  port: SIP_PORT,
  udp: true,
  tcp: false,
  tls: false
}, (request) => {
  if (request.method === 'INVITE') {
    handleSipInvite(request);
  }
});

async function handleSipInvite(request) {
  const callId = request.headers['call-id'];

  console.log('\n' + '='.repeat(60));
  console.log('📡 SIP INVITE RECEIVED');
  console.log('='.repeat(60));
  console.log(`   Call-ID: ${callId}`);
  console.log(`   From: ${request.headers.from}`);
  console.log(`   To: ${request.headers.to}`);
  console.log('='.repeat(60) + '\n');

  try {
    // Create server-side WebRTC connection to OpenAI
    const { pc, sdp: openaiSdp } = await createOpenAIWebRTCForPhone();

    // Parse OpenAI's SDP to get media info
    const openaiSdpParsed = sdpTransform.parse(openaiSdp);
    const audioMedia = openaiSdpParsed.media.find(m => m.type === 'audio');

    if (!audioMedia) {
      throw new Error('No audio media in OpenAI SDP');
    }

    // Create SDP answer for Twilio
    const localSdp = {
      version: 0,
      origin: {
        username: 'agent',
        sessionId: Date.now(),
        sessionVersion: Date.now(),
        netType: 'IN',
        ipVer: 4,
        address: process.env.PUBLIC_IP || '0.0.0.0'
      },
      name: 'AI Agent',
      timing: { start: 0, stop: 0 },
      connection: { version: 4, ip: audioMedia.connection?.ip || process.env.PUBLIC_IP || '0.0.0.0' },
      media: [{
        type: 'audio',
        port: audioMedia.port,
        protocol: 'RTP/AVP',
        payloads: '0 8 101',
        rtp: [
          { payload: 0, codec: 'PCMU', rate: 8000 },
          { payload: 8, codec: 'PCMA', rate: 8000 },
          { payload: 101, codec: 'telephone-event', rate: 8000 }
        ],
        fmtp: [{ payload: 101, config: '0-16' }],
        connection: audioMedia.connection
      }]
    };

    const localSdpString = sdpTransform.write(localSdp);

    // Send 200 OK response to Twilio
    sip.send({
      method: 'OK',
      status: 200,
      reason: 'OK',
      headers: {
        to: request.headers.to,
        from: request.headers.from,
        'call-id': callId,
        cseq: request.headers.cseq,
        contact: request.headers.contact,
        'content-type': 'application/sdp'
      },
      content: localSdpString
    });

    console.log('\n' + '✅ '.repeat(30));
    console.log('🎉 PHONE CALL CONNECTED - BRIDGING TO OPENAI');
    console.log('✅ '.repeat(30));
    console.log(`   Active calls: ${activeCalls.size + 1}`);
    console.log('='.repeat(60) + '\n');

    // Store active call
    activeCalls.set(callId, { pc });

    // Listen for connection state changes
    pc.onconnectionstatechange = () => {
      console.log(`📡 WebRTC connection state: ${pc.connectionState}`);

      if (pc.connectionState === 'connected') {
        console.log('\n' + '✅ '.repeat(30));
        console.log('🎉 PHONE ↔ OPENAI AUDIO BRIDGE ACTIVE');
        console.log('📞 Customer can now talk to the AI agent');
        console.log('✅ '.repeat(30) + '\n');
      }

      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        console.log('❌ WebRTC connection lost');
        activeCalls.delete(callId);
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log(`🧊 ICE connection state: ${pc.iceConnectionState}`);
    };

  } catch (error) {
    console.error('❌ Error handling phone call:', error);

    // Send 500 error response
    sip.send({
      method: 'OK',
      status: 500,
      reason: 'Server Error',
      headers: {
        to: request.headers.to,
        from: request.headers.from,
        'call-id': callId,
        cseq: request.headers.cseq
      }
    });
  }
}

// Create server-side WebRTC connection to OpenAI for phone calls
async function createOpenAIWebRTCForPhone() {
  console.log('\n🔑 Creating OpenAI WebRTC connection for phone call...');

  // Load menu for AI context
  const menuData = await fs.readFile(MENU_FILE, 'utf-8');
  const menu = JSON.parse(menuData);
  console.log(`   Menu loaded: ${menu.restaurant.name}`);

  const menuContext = `You are a professional phone order-taking agent for ${menu.restaurant.name}.

IMPORTANT INSTRUCTIONS:
- Start immediately by greeting: "Thank you for calling ${menu.restaurant.name}! How can I help you today?"
- Keep responses SHORT and CLEAR
- Listen carefully to orders
- Confirm items briefly
- When done, ASK FOR NAME: "Can I get a name for the order?"
- After name, ASK FOR PICKUP TIME: "What time would you like to pick it up?"
- REPEAT THE ORDER back with total and pickup time
- End with: "Perfect, see you at [time]. Drive safe, bye!"

MENU:
${menu.categories.map(cat =>
  `${cat.name}:\n${cat.items.map(item =>
    `- ${item.name}: $${item.price}`
  ).join('\n')}`
).join('\n\n')}`;

  // Create ephemeral token for phone call session
  console.log('   Requesting ephemeral token from OpenAI...');
  const tokenResponse = await fetch('https://api.openai.com/v1/realtime/sessions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o-realtime-preview-2024-12-17',
      voice: 'verse',
      instructions: menuContext
    })
  });

  if (!tokenResponse.ok) {
    const error = await tokenResponse.text();
    console.error('❌ OpenAI token error:', error);
    throw new Error(`Failed to get OpenAI token: ${error}`);
  }

  const tokenData = await tokenResponse.json();
  const ephemeralKey = tokenData.client_secret.value;
  console.log('   ✅ Ephemeral token received');

  // Create WebRTC peer connection (server-side)
  const pc = new RTCPeerConnection();

  // Create data channel
  const dc = pc.createDataChannel('oai-events');

  dc.addEventListener('open', () => {
    console.log('\n' + '🎙️ '.repeat(30));
    console.log('✅ OPENAI REALTIME API CONNECTED - READY TO TALK!');
    console.log('🎙️ '.repeat(30) + '\n');
  });

  dc.addEventListener('message', (e) => {
    const event = JSON.parse(e.data);

    // Log when AI starts speaking
    if (event.type === 'response.audio.delta') {
      console.log('🔊 AI is speaking...');
    }

    // Log AI transcript when done
    if (event.type === 'response.audio_transcript.done') {
      console.log('🤖 AI said:', event.transcript);
    }

    // Log conversation events
    if (event.type === 'conversation.item.created') {
      console.log('💬 New conversation item created');
    }

    if (event.type === 'response.done') {
      console.log('✅ AI response completed');
    }
  });

  // Create SDP offer
  console.log('   Creating WebRTC offer...');
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  console.log('   ✅ SDP offer created');

  // Send to OpenAI Realtime API
  console.log('   Sending SDP to OpenAI Realtime API...');
  const sdpResponse = await fetch('https://api.openai.com/v1/realtime', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ephemeralKey}`,
      'Content-Type': 'application/sdp'
    },
    body: offer.sdp
  });

  if (!sdpResponse.ok) {
    const error = await sdpResponse.text();
    console.error('❌ OpenAI SDP error:', error);
    throw new Error(`Failed to negotiate SDP: ${error}`);
  }

  const answerSdp = await sdpResponse.text();
  await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });

  console.log('   ✅ OpenAI WebRTC connection established');
  console.log('   Data channel state:', dc.readyState);

  return { pc, dc, sdp: answerSdp };
}

// ============================================================================
// END PHONE CALL INTEGRATION
// ============================================================================

// Start server
app.listen(PORT, () => {
  console.log('🚀 AI Phone Ordering SIP Server');
  console.log('='.repeat(60));
  console.log(`🌐 HTTP Server: http://localhost:${PORT}`);
  console.log(`📞 SIP Server: UDP Port ${SIP_PORT}`);
  console.log('');
  console.log('📞 Phone Call Integration (Twilio):');
  console.log(`   Webhook URL: https://your-domain/twilio/voice`);
  console.log(`   SIP Endpoint: sip:agent@${process.env.SIP_DOMAIN || 'your-domain'}:${SIP_PORT}`);
  console.log(`   Mode: Pure SIP + WebRTC (No WebSocket)`);
  console.log('');
  console.log('🔗 Architecture:');
  console.log('   Phone: Twilio → SIP/RTP → Server WebRTC → OpenAI');
  console.log('='.repeat(60));

  if (!process.env.OPENAI_API_KEY) {
    console.warn('⚠️  WARNING: OPENAI_API_KEY not configured');
  } else {
    console.log('✅ OpenAI API key configured');
  }

  if (!process.env.SIP_DOMAIN) {
    console.warn('⚠️  Phone integration: Set SIP_DOMAIN in .env for deployment');
  } else {
    console.log(`✅ Phone integration configured: ${process.env.SIP_DOMAIN}`);
  }

  console.log('✅ Phone SIP server running');
});
