# OpenAI Voice Agent - WebRTC

A real-time voice conversation application powered by OpenAI's Realtime API using WebRTC for browser-based speech-to-speech interactions.

## Features

- **Real-time Voice Conversations**: Speak naturally with ChatGPT using your microphone
- **WebRTC Technology**: Direct peer-to-peer connection for low-latency audio streaming
- **Secure Authentication**: Ephemeral tokens generated server-side for secure client connections
- **Live Transcription**: See both your speech and AI responses transcribed in real-time
- **Modern UI**: Clean, responsive interface with visual feedback

## Architecture

```
Browser (WebRTC) <--> Your Server (Token Generation) <--> OpenAI Realtime API
```

1. Client requests ephemeral token from your server
2. Server generates token using OpenAI API key
3. Client establishes WebRTC connection directly with OpenAI
4. Real-time bidirectional audio streaming begins

## Prerequisites

- Node.js (v18 or higher)
- OpenAI API key with Realtime API access
- Modern web browser with WebRTC support (Chrome, Edge, Firefox, Safari)

## Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd AI_Audio_Ordering_System
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**

   Create a `.env` file in the root directory:
   ```env
   OPENAI_API_KEY=your_openai_api_key_here
   PORT=3000
   ```

4. **Start the server**
   ```bash
   npm start
   ```

5. **Open in browser**

   Navigate to `http://localhost:3000`

## Usage

1. Click the microphone button to start
2. Allow microphone access when prompted
3. Wait for "Voice agent active" status
4. Start speaking naturally
5. The AI will respond with voice and text transcription
6. Click "Disconnect" to end the session

## Project Structure

```
.
├── server.js              # Express server for token generation
├── public/
│   └── index.html        # Client-side WebRTC implementation
├── .env                  # Environment configuration
├── package.json          # Dependencies
└── README.md            # This file
```

## API Endpoints

### `POST /api/token`
Generates an ephemeral token for client WebRTC connection.

**Response:**
```json
{
  "token": "ek_...",
  "expiresAt": 1234567890,
  "session": { ... }
}
```

### `GET /api/health`
Health check endpoint to verify server status.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-09-29T...",
  "openaiConfigured": true,
  "sdkVersion": "0.0.9"
}
```

## Technical Details

### WebRTC Connection Flow

1. **Peer Connection Setup**: Create `RTCPeerConnection` with audio tracks
2. **Data Channel**: Establish `oai-events` channel for sending/receiving events
3. **SDP Exchange**:
   - Generate SDP offer
   - Send to OpenAI with ephemeral token
   - Apply SDP answer from OpenAI
4. **Audio Streaming**: Bidirectional audio via WebRTC tracks

### Event Handling

The application listens for various server events via the data channel:

- `conversation.item.created` - New conversation item
- `response.audio_transcript.done` - Complete AI transcript
- `conversation.item.input_audio_transcription.completed` - User speech transcript
- `error` - Error events from the API

## Security Notes

- **Never expose your OpenAI API key in client-side code**
- Ephemeral tokens are short-lived and session-specific
- Server validates all requests before generating tokens
- CORS is enabled for development (configure for production)

## Troubleshooting

### "No token received from server"
- Verify your `.env` file contains a valid `OPENAI_API_KEY`
- Check server logs for token generation errors
- Ensure the server is running on the expected port

### "Failed to parse SessionDescription"
- This error occurs when using the Agents SDK incorrectly
- The current implementation uses raw WebRTC API (correct approach)

### Microphone not working
- Grant microphone permissions in your browser
- Check browser console for permission errors
- Verify your system microphone is working

### No audio output
- Check browser audio settings
- Verify speakers/headphones are connected
- Look for WebRTC track events in console logs

## Development

### Run with auto-reload
```bash
npm run dev
```

### View server logs
The server logs important events:
- Token generation
- API key configuration status
- Connection attempts

### Debug client
Open browser DevTools console to see:
- WebRTC connection status
- Data channel events
- Server event messages
- Transcription updates

## Dependencies

- **express** - Web server framework
- **dotenv** - Environment variable management
- **cors** - Cross-origin resource sharing
- **@openai/agents** - OpenAI Agents SDK (version info only)

## Browser Compatibility

- ✅ Chrome 90+
- ✅ Edge 90+
- ✅ Firefox 88+
- ✅ Safari 15+

Requires WebRTC support and microphone access.

## Resources

- [OpenAI Realtime API Documentation](https://platform.openai.com/docs/guides/realtime-webrtc)
- [WebRTC API Reference](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
- [OpenAI API Keys](https://platform.openai.com/api-keys)

## License

MIT

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## Support

For issues and questions:
- Check the troubleshooting section above
- Review OpenAI Realtime API documentation
- Open an issue in the repository