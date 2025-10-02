import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import twilio from 'twilio';
import { WebSocketServer, WebSocket } from 'ws';

// Load environment variables
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const MENU_FILE = path.join(__dirname, 'menu.json');
const ORDERS_FILE = path.join(__dirname, 'orders.json');

// Middleware
app.use(cors());
app.use(express.json());
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
    twilioConfigured: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
    sdkVersion: '0.0.9'
  });
});

// TwiML webhook for incoming phone calls
app.post('/twilio/voice', async (req, res) => {
  console.log('📞 Incoming call from:', req.body.From);

  const twiml = new twilio.twiml.VoiceResponse();

  // Start audio streaming to WebSocket
  const connect = twiml.connect();
  const host = req.headers.host;
  const protocol = host.includes('localhost') ? 'ws' : 'wss';

  connect.stream({
    url: `${protocol}://${host}/twilio/media-stream`
  });

  res.type('text/xml');
  res.send(twiml.toString());
});

// Start HTTP server
const server = app.listen(PORT, () => {
  console.log('🚀 OpenAI Voice Agent Server Started');
  console.log('='.repeat(50));
  console.log(`🌐 Server running on port ${PORT}`);
  console.log('');
  console.log('📱 Available Pages:');
  console.log(`   🎙️  Voice Agent (Customer):  http://localhost:${PORT}`);
  console.log(`   🍽️  Menu Management (Owner): http://localhost:${PORT}/menu`);
  console.log(`   📋 Order Management (Owner): http://localhost:${PORT}/orders`);
  console.log('');
  console.log('📞 Twilio Phone Integration:');
  console.log(`   Webhook URL: https://your-domain/twilio/voice`);
  console.log('');
  console.log('📚 Using Official OpenAI Agents JS SDK');
  console.log('🔧 RealtimeAgent + RealtimeSession pattern');
  console.log('='.repeat(50));

  if (!process.env.OPENAI_API_KEY) {
    console.warn('⚠️  WARNING: OPENAI_API_KEY not found in environment');
    console.warn('   Please check your .env file');
  } else {
    console.log('✅ OpenAI API key configured');
  }
});

// WebSocket server for Twilio Media Streams
const wss = new WebSocketServer({ server, path: '/twilio/media-stream' });

wss.on('connection', (twilioWs) => {
  console.log('🔌 Twilio Media Stream connected');

  let streamSid = null;
  let openaiWs = null;

  twilioWs.on('message', async (message) => {
    try {
      const msg = JSON.parse(message);

      switch (msg.event) {
        case 'start':
          streamSid = msg.start.streamSid;
          console.log(`📞 Call started - Stream SID: ${streamSid}`);

          // Connect to OpenAI Realtime API via WebSocket
          openaiWs = new WebSocket('wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01', {
            headers: {
              'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
              'OpenAI-Beta': 'realtime=v1',
            },
          });

          openaiWs.on('open', async () => {
            console.log('✅ Connected to OpenAI Realtime API');

            // Load menu for AI context
            const menuData = await fs.readFile(MENU_FILE, 'utf-8');
            const menu = JSON.parse(menuData);

            const menuContext = `You are a professional phone order-taking agent for ${menu.restaurant.name}.

IMPORTANT INSTRUCTIONS:
- Start the conversation immediately by greeting the customer: "Thank you for calling ${menu.restaurant.name}! How can I help you today?"
- Keep responses SHORT and CLEAR - use simple sentences
- Listen carefully to their order
- Confirm items briefly: "Got it, [item name]"
- Ask only essential clarifying questions (size, quantity, customizations)
- When customer is done ordering, ASK FOR THEIR NAME: "Can I get a name for the order?"
- After getting name, ASK FOR PICKUP TIME: "What time would you like to pick it up?"
- After getting pickup time, REPEAT THE ENTIRE ORDER back clearly
- After customer confirms, say: "Perfect, see you at [time]. Drive safe, bye!"

MENU ITEMS:
${menu.categories.map(cat =>
  `${cat.name}:\n${cat.items.map(item =>
    `- ${item.name}: $${item.price}${item.sizes ? ` (Sizes: ${item.sizes.join(', ')})` : ''}`
  ).join('\n')}`
).join('\n\n')}`;

            // Configure session
            openaiWs.send(JSON.stringify({
              type: 'session.update',
              session: {
                modalities: ['text', 'audio'],
                instructions: menuContext,
                voice: 'alloy',
                input_audio_format: 'g711_ulaw',
                output_audio_format: 'g711_ulaw',
                input_audio_transcription: {
                  model: 'whisper-1',
                },
                turn_detection: {
                  type: 'server_vad',
                  threshold: 0.5,
                  prefix_padding_ms: 300,
                  silence_duration_ms: 500,
                },
              },
            }));

            // Trigger AI to greet first
            openaiWs.send(JSON.stringify({
              type: 'response.create',
            }));
          });

          openaiWs.on('message', (data) => {
            try {
              const event = JSON.parse(data.toString());

              if (event.type === 'response.audio.delta' && event.delta) {
                // Send AI audio back to Twilio
                twilioWs.send(JSON.stringify({
                  event: 'media',
                  streamSid: streamSid,
                  media: {
                    payload: event.delta
                  }
                }));
              }

              if (event.type === 'response.audio_transcript.done') {
                console.log('🤖 AI:', event.transcript);
              }

              // Check for hangup only when the ENTIRE response is done (not just transcript chunks)
              if (event.type === 'response.done') {
                // Get full transcript from response output
                const outputs = event.response?.output || [];
                const fullTranscript = outputs
                  .filter(item => item.type === 'message')
                  .flatMap(item => item.content || [])
                  .filter(content => content.type === 'audio' && content.transcript)
                  .map(content => content.transcript)
                  .join(' ')
                  .toLowerCase()
                  .trim();

                if (fullTranscript) {
                  const farewellPhrases = [
                    'drive safe, bye',
                    'drive safe. bye',
                    'see you then. drive safe, bye',
                    'see you at',
                    'perfect, see you',
                  ];

                  const matchedPhrase = farewellPhrases.find(phrase =>
                    fullTranscript.includes(phrase)
                  );

                  if (matchedPhrase) {
                    console.log('\n' + '='.repeat(60));
                    console.log('👋 AUTO-HANGUP TRIGGERED');
                    console.log('='.repeat(60));
                    console.log(`Full AI response: "${fullTranscript}"`);
                    console.log(`Matched phrase: "${matchedPhrase}"`);
                    console.log('Hanging up in 3 seconds...');
                    console.log('='.repeat(60) + '\n');

                    // Wait 3 seconds for audio to finish, then hang up
                    setTimeout(() => {
                      console.log('🔌 Closing connections...');
                      if (openaiWs) {
                        openaiWs.close();
                      }
                      if (twilioWs && twilioWs.readyState === WebSocket.OPEN) {
                        twilioWs.close();
                      }
                      console.log('✅ Call ended by auto-hangup');
                    }, 3000);
                  }
                }
              }

              if (event.type === 'conversation.item.input_audio_transcription.completed') {
                console.log('👤 User:', event.transcript);
              }
            } catch (error) {
              console.error('❌ Error processing OpenAI message:', error);
            }
          });

          openaiWs.on('error', (error) => {
            console.error('❌ OpenAI WebSocket error:', error);
          });

          openaiWs.on('close', () => {
            console.log('🔌 OpenAI WebSocket closed');
          });
          break;

        case 'media':
          // Forward audio from Twilio to OpenAI
          if (openaiWs && openaiWs.readyState === WebSocket.OPEN) {
            openaiWs.send(JSON.stringify({
              type: 'input_audio_buffer.append',
              audio: msg.media.payload
            }));
          }
          break;

        case 'stop':
          console.log('📞 Call ended');
          if (openaiWs) {
            openaiWs.close();
          }
          break;
      }
    } catch (error) {
      console.error('❌ Error processing Twilio message:', error);
    }
  });

  twilioWs.on('close', () => {
    console.log('🔌 Twilio Media Stream disconnected');
    if (openaiWs) {
      openaiWs.close();
    }
  });

  twilioWs.on('error', (error) => {
    console.error('❌ Twilio WebSocket error:', error);
  });
});