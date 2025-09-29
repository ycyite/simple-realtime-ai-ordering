import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Endpoint to get ephemeral token for client-side RealtimeSession
app.post('/api/token', async (req, res) => {
  console.log('🔑 Creating ephemeral token for RealtimeSession...');

  try {
    const response = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session: {
          type: 'realtime',
          model: 'gpt-realtime'
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