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
app.use(express.static('public'));

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve the menu management page
app.get('/menu', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'menu.html'));
});

// Serve the orders page
app.get('/orders', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'orders.html'));
});

// Get menu data
app.get('/api/menu', async (req, res) => {
  try {
    const menuData = await fs.readFile(MENU_FILE, 'utf-8');
    res.json(JSON.parse(menuData));
  } catch (error) {
    console.error('❌ Error reading menu:', error);
    res.status(500).json({ error: 'Failed to load menu' });
  }
});

// Update menu data
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

// Get orders data
app.get('/api/orders', async (req, res) => {
  try {
    const ordersData = await fs.readFile(ORDERS_FILE, 'utf-8');
    res.json(JSON.parse(ordersData));
  } catch (error) {
    // If file doesn't exist, return empty array
    if (error.code === 'ENOENT') {
      res.json([]);
    } else {
      console.error('❌ Error reading orders:', error);
      res.status(500).json({ error: 'Failed to load orders' });
    }
  }
});

// Add new order
app.post('/api/orders', async (req, res) => {
  try {
    let orders = [];

    // Read existing orders
    try {
      const ordersData = await fs.readFile(ORDERS_FILE, 'utf-8');
      orders = JSON.parse(ordersData);
    } catch (error) {
      // If file doesn't exist, start with empty array
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

// Clear all orders
app.delete('/api/orders', async (req, res) => {
  try {
    await fs.writeFile(ORDERS_FILE, JSON.stringify([], null, 2), 'utf-8');
    console.log('✅ All orders cleared');
    res.json({ success: true, message: 'Orders cleared' });
  } catch (error) {
    console.error('❌ Error clearing orders:', error);
    res.status(500).json({ error: 'Failed to clear orders' });
  }
});

// Endpoint to get ephemeral token for client-side RealtimeSession
app.post('/api/token', async (req, res) => {
  console.log('🔑 Creating ephemeral token for RealtimeSession...');

  try {
    // Load menu for AI context
    const menuData = await fs.readFile(MENU_FILE, 'utf-8');
    const menu = JSON.parse(menuData);

    // Build menu context for AI
    const menuContext = `You are a professional phone order-taking agent for ${menu.restaurant.name}.

IMPORTANT INSTRUCTIONS:
- Start the conversation immediately by greeting the customer: "Thank you for calling ${menu.restaurant.name}! How can I help you today?"
- Keep responses SHORT and CLEAR - use simple sentences
- Listen carefully to their order
- Confirm items briefly: "Got it, [item name]"
- Ask only essential clarifying questions (size, quantity, customizations)
- When customer is done ordering, ASK FOR THEIR NAME: "Can I get a name for the order?"
- After getting name, ASK FOR PICKUP TIME: "What time would you like to pick it up?"
- After getting pickup time, REPEAT THE ENTIRE ORDER back clearly:
  Example: "Let me confirm your order: 2 Classic Cheeseburgers, 1 French Fries, and 1 Coca-Cola. Your total is $28.47. Pickup at 6:30 PM. Is that correct?"
  DO NOT mention individual item prices - only the final total
- After customer confirms, say EXACTLY: "Perfect, see you at [time]. Drive safe, bye!"

RESPONSE STYLE:
- Use short, direct sentences
- Avoid unnecessary elaboration
- Be friendly but concise
- Focus on getting the order efficiently
- ALWAYS ask for name before finalizing
- ALWAYS ask for pickup time
- ALWAYS repeat the full order back with pickup time before confirming

MENU ITEMS:
${menu.categories.map(cat =>
  `${cat.name}:\n${cat.items.map(item =>
    `- ${item.name}: $${item.price} - ${item.description}${item.sizes ? ` (Sizes: ${item.sizes.join(', ')})` : ''}`
  ).join('\n')}`
).join('\n\n')}

Remember: BE BRIEF, CLEAR, and EFFICIENT. You must greet first before the customer speaks.`;

    const response = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session: {
          type: 'realtime',
          model: 'gpt-realtime',
          instructions: menuContext
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Token generation error:', response.status, errorText);
      return res.status(response.status).json({
        error: 'Failed to generate token',
        details: errorText
      });
    }

    const data = await response.json();
    console.log('✅ Ephemeral token created successfully');

    // Return the token in the format expected by the SDK
    // OpenAI API returns: { "value": "ek_...", "expires_at": ..., "session": {...} }
    res.json({
      token: data.value,
      expiresAt: data.expires_at,
      session: data.session
    });

  } catch (error) {
    console.error('❌ Token generation error:', error);
    res.status(500).json({
      error: 'Failed to generate token',
      details: error.message
    });
  }
});


// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    openaiConfigured: !!process.env.OPENAI_API_KEY,
    sipServerRunning: true,
    sdkVersion: '0.0.9'
  });
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
    console.log('✅ '.repeat(30) + '\n');

    // Store active call
    activeCalls.set(callId, { pc });

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
  console.log('🔑 Creating OpenAI WebRTC connection for phone call...');

  // Load menu for AI context
  const menuData = await fs.readFile(MENU_FILE, 'utf-8');
  const menu = JSON.parse(menuData);

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

  const tokenData = await tokenResponse.json();
  const ephemeralKey = tokenData.client_secret.value;

  // Create WebRTC peer connection (server-side)
  const pc = new RTCPeerConnection();

  // Create data channel
  const dc = pc.createDataChannel('oai-events');

  dc.addEventListener('open', () => {
    console.log('✅ OpenAI data channel opened (phone call)');
  });

  dc.addEventListener('message', (e) => {
    const event = JSON.parse(e.data);
    if (event.type === 'response.audio_transcript.done') {
      console.log('🤖 AI (phone):', event.transcript);
    }
  });

  // Create SDP offer
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  // Send to OpenAI Realtime API
  const sdpResponse = await fetch('https://api.openai.com/v1/realtime', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ephemeralKey}`,
      'Content-Type': 'application/sdp'
    },
    body: offer.sdp
  });

  const answerSdp = await sdpResponse.text();
  await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });

  console.log('✅ OpenAI WebRTC connection established (phone call)');

  return { pc, dc, sdp: answerSdp };
}

// ============================================================================
// END PHONE CALL INTEGRATION
// ============================================================================

// Start server
app.listen(PORT, () => {
  console.log('🚀 AI Audio Ordering System Started');
  console.log('='.repeat(60));
  console.log(`🌐 HTTP Server: http://localhost:${PORT}`);
  console.log(`📞 SIP Server: UDP Port ${SIP_PORT}`);
  console.log('');
  console.log('📱 Browser Voice Ordering:');
  console.log(`   🎙️  Customer Interface: http://localhost:${PORT}`);
  console.log(`   🍽️  Menu Management:    http://localhost:${PORT}/menu`);
  console.log(`   📋 Order Management:    http://localhost:${PORT}/orders`);
  console.log('');
  console.log('📞 Phone Call Integration (Twilio):');
  console.log(`   Webhook URL: https://your-domain/twilio/voice`);
  console.log(`   SIP Endpoint: sip:agent@${process.env.SIP_DOMAIN || 'your-domain'}:${SIP_PORT}`);
  console.log(`   Mode: Pure SIP + WebRTC (No WebSocket)`);
  console.log('');
  console.log('🔗 Architecture:');
  console.log('   Browser: Browser WebRTC → OpenAI Realtime API');
  console.log('   Phone:   Twilio → SIP/RTP → Server WebRTC → OpenAI');
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

  console.log('✅ Browser voice ordering ready');
  console.log('✅ Phone SIP server running (Railway-compatible)');
});