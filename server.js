import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import WebSocket from 'ws';

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

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    openaiConfigured: !!process.env.OPENAI_API_KEY
  });
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

// OpenAI SIP webhook - receives incoming call notifications
app.post('/api/openai-webhook', async (req, res) => {
  const { type, data } = req.body;

  console.log('\n' + '='.repeat(60));
  console.log('📞 OPENAI SIP WEBHOOK RECEIVED');
  console.log('='.repeat(60));
  console.log(`   Event Type: ${type}`);
  console.log(`   Call ID: ${data?.call_id}`);
  console.log(`   SIP Headers:`, JSON.stringify(data?.sip_headers, null, 2));
  console.log('='.repeat(60) + '\n');

  if (type === 'realtime.call.incoming') {
    const call_id = data.call_id;
    try {
      // Load menu for AI context
      const menuData = await fs.readFile(MENU_FILE, 'utf-8');
      const menu = JSON.parse(menuData);

      const menuContext = `You are a professional phone order-taking agent for ${menu.restaurant.name}.

IMPORTANT INSTRUCTIONS:
- Start the conversation immediately by greeting the customer: "Thank you for calling ${menu.restaurant.name}! How can I help you today?"
- Keep responses SHORT and CLEAR - use simple sentences
- Listen carefully to their order
- When the customer finishes telling you what they want, confirm it: "Got it, [item name]" and then ask "Anything else?"
- If they add more items, wait for them to finish, then confirm and ask "Anything else?" again
- Continue this pattern until customer says no, that's it, or that's all
- When customer says no/that's it/that's all, ASK FOR THEIR NAME: "Can I get a name for the order?"
- After getting name, ASK FOR PICKUP TIME: "What time would you like to pick it up?"
- After getting pickup time, REPEAT THE ENTIRE ORDER back clearly WITHOUT mentioning prices: "Let me confirm: [list items]. Pickup at [time]. Is that correct?"
- After customer confirms, CALL THE save_order function with all order details
- Then say: "Perfect, see you at [time]. Drive safe, bye!"

RESPONSE STYLE:
- Use short, direct sentences
- Avoid unnecessary elaboration
- Be friendly but concise
- Focus on getting the order efficiently
- ALWAYS ask for name before finalizing
- ALWAYS ask for pickup time
- ALWAYS repeat the full order back with pickup time before confirming
- Please say quickly

MENU ITEMS:
${menu.categories.map(cat =>
  `${cat.name}:\n${cat.items.map(item =>
    `- ${item.name}: $${item.price}${item.sizes ? ` (Sizes: ${item.sizes.join(', ')})` : ''}`
  ).join('\n')}`
).join('\n\n')}

Remember: BE BRIEF, CLEAR, and EFFICIENT. You must greet first before the customer speaks.`;
      // Accept the call with session configuration including save_order function
      const acceptResponse = await fetch(`https://api.openai.com/v1/realtime/calls/${call_id}/accept`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'realtime',
          model: 'gpt-realtime',
          instructions: menuContext,
          tools: [
            {
              type: 'function',
              name: 'save_order',
              description: 'Save the customer order to the database after order is confirmed',
              parameters: {
                type: 'object',
                properties: {
                  customerName: {
                    type: 'string',
                    description: 'Customer name for the order'
                  },
                  items: {
                    type: 'array',
                    description: 'List of ordered items',
                    items: {
                      type: 'object',
                      properties: {
                        name: { type: 'string' },
                        quantity: { type: 'number' },
                        price: { type: 'number' }
                      }
                    }
                  },
                  total: {
                    type: 'number',
                    description: 'Total order price'
                  },
                  pickupTime: {
                    type: 'string',
                    description: 'Pickup time'
                  }
                },
                required: ['customerName', 'items', 'total', 'pickupTime']
              }
            }
          ],
          tool_choice: 'auto'
        })
      });

      if (acceptResponse.ok) {
        console.log('✅ Call accepted successfully');
        res.json({ success: true });

        // Connect to WebSocket to listen for conversation events
        const ws = new WebSocket(`wss://api.openai.com/v1/realtime?call_id=${call_id}`, {
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
        });

        ws.on('open', () => {
          console.log('🔌 WebSocket connected for call:', call_id);
        });

        ws.on('message', async (data) => {
          const event = JSON.parse(data.toString());
          console.log('📨 WebSocket event:', event.type);

          // Print AI's speech transcript
          if (event.type === 'response.output_audio_transcript.done') {
            console.log('🤖 AI completed:', event.transcript);

            const transcript = event.transcript.toLowerCase();

            // Check if this is the final goodbye and hang up
            if (transcript.includes('drive safe') && transcript.includes('bye')) {
              try {
                // Hang up the call immediately
                await fetch(`https://api.openai.com/v1/realtime/calls/${call_id}/hangup`, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                  }
                });
                console.log('✅ Call ended via /hangup endpoint');
              } catch (error) {
                console.error('❌ Error hanging up call:', error);
              }
            }
          }

          // Handle function calls
          if (event.type === 'response.function_call_arguments.done') {
            const functionName = event.name;
            const args = JSON.parse(event.arguments);

            console.log(`🔧 Function call: ${functionName}`, args);

            if (functionName === 'save_order') {
              // Save order to file
              try {
                let orders = [];
                try {
                  const ordersData = await fs.readFile(ORDERS_FILE, 'utf-8');
                  orders = JSON.parse(ordersData);
                } catch (err) {
                  if (err.code !== 'ENOENT') throw err;
                }

                const newOrder = {
                  ...args,
                  source: 'phone',
                  timestamp: new Date().toISOString(),
                  id: `phone-order-${Date.now()}`
                };

                orders.push(newOrder);
                await fs.writeFile(ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf-8');

                console.log('✅ Phone order saved:', newOrder.id);

                // Send function result back to OpenAI
                ws.send(JSON.stringify({
                  type: 'conversation.item.create',
                  item: {
                    type: 'function_call_output',
                    call_id: event.call_id,
                    output: JSON.stringify({ success: true, orderId: newOrder.id })
                  }
                }));

                // Continue the conversation
                ws.send(JSON.stringify({
                  type: 'response.create'
                }));

              } catch (error) {
                console.error('❌ Error saving phone order:', error);

                // Send error back to OpenAI
                ws.send(JSON.stringify({
                  type: 'conversation.item.create',
                  item: {
                    type: 'function_call_output',
                    call_id: event.call_id,
                    output: JSON.stringify({ success: false, error: error.message })
                  }
                }));
              }
            }
          }

        });

        ws.on('error', (error) => {
          console.error('❌ WebSocket error:', error);
        });

        ws.on('close', () => {
          console.log('🔌 WebSocket closed for call:', call_id);
        });
      } else {
        const error = await acceptResponse.text();
        console.error('❌ Failed to accept call:', error);
        res.status(500).json({ error: 'Failed to accept call' });
      }

    } catch (error) {
      console.error('❌ Error handling webhook:', error);
      res.status(500).json({ error: error.message });
    }
  } else {
    // Acknowledge other event types
    res.json({ success: true });
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
    const menuContext = `You are a professional order-taking agent for ${menu.restaurant.name}.

IMPORTANT INSTRUCTIONS:
- Start the conversation immediately by greeting the customer: "Thank you for visiting ${menu.restaurant.name}! How can I help you today?"
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
- Please say quickly

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

// Start server
app.listen(PORT, () => {
  console.log('🚀 AI Audio Ordering System Started');
  console.log('='.repeat(60));
  console.log(`🌐 HTTP Server: http://localhost:${PORT}`);
  console.log('');
  console.log('📱 Browser Voice Ordering:');
  console.log(`   🎙️  Customer Interface: http://localhost:${PORT}`);
  console.log(`   🍽️  Menu Management:    http://localhost:${PORT}/menu`);
  console.log(`   📋 Order Management:    http://localhost:${PORT}/orders`);
  console.log('');
  console.log('🔗 Architecture:');
  console.log('   Browser: Browser WebRTC → OpenAI Realtime API');
  console.log('='.repeat(60));

  if (!process.env.OPENAI_API_KEY) {
    console.warn('⚠️  WARNING: OPENAI_API_KEY not configured');
  } else {
    console.log('✅ OpenAI API key configured');
  }

  console.log('✅ Browser voice ordering ready');
});