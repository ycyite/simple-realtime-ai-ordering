import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

// Load environment variables
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const MENU_FILE = path.join(__dirname, 'menu.json');

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
          model: 'gpt-4o-mini-realtime-preview',
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
    sdkVersion: '0.0.9'
  });
});

// Start server
app.listen(PORT, () => {
  console.log('🚀 OpenAI Voice Agent Server Started');
  console.log('='.repeat(50));
  console.log(`🌐 Server: http://localhost:${PORT}`);
  console.log(`🎙️ Voice Agent: http://localhost:${PORT}`);
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