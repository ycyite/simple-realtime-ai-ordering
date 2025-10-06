import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import WebSocket from 'ws';

// Force Node.js runtime (required for WebSocket)
export const runtime = 'nodejs';

const MENU_FILE = path.join(process.cwd(), 'menu.json');
const ORDERS_FILE = path.join(process.cwd(), 'orders.json');

export async function POST(request: Request) {
  const { type, data } = await request.json();

  console.log('\n' + '='.repeat(60));
  console.log('📞 OPENAI SIP WEBHOOK RECEIVED');
  console.log('='.repeat(60));
  console.log(`   Event Type: ${type}`);
  console.log(`   Call ID: ${data?.call_id}`);
  console.log(`   SIP Headers:`, JSON.stringify(data?.sip_headers, null, 2));
  console.log('='.repeat(60) + '\n');

  if (type === 'realtime.call.incoming') {
    const call_id = data.call_id;

    // Extract phone number from SIP headers
    let phoneNumber = '';
    const fromHeader = data.sip_headers?.find((h: any) => h.name === 'From');
    if (fromHeader) {
      const phoneMatch = fromHeader.value.match(/\+1(\d+)/);
      if (phoneMatch) {
        phoneNumber = phoneMatch[1]; // Store without +1
        console.log('📞 Caller phone number:', phoneNumber);
      }
    }

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
- When customer says no/that's it/that's all, READ BACK THE COMPLETE ORDER LIST: "Let me confirm your order: [list all items with quantities]"
- After confirming the order list, ASK FOR THEIR NAME: "Can I get a name for the order?"
- After getting name, ASK FOR PICKUP TIME: "What time would you like to pick it up?"
- After getting pickup time, REPEAT THE ENTIRE ORDER back clearly WITHOUT mentioning prices: "Your order: [list items]. Pickup at [time]. Is that correct?"
- After customer confirms, say: "Perfect, see you at [time]. Drive safe, bye!"
- Then CALL THE save_order function with all order details
- Then CALL THE end_call function to hang up the phone

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
${menu.categories.map((cat: any) =>
  `${cat.name}:\n${cat.items.map((item: any) =>
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
            },
            {
              type: 'function',
              name: 'end_call',
              description: 'End the phone call after saying goodbye to the customer',
              parameters: {
                type: 'object',
                properties: {},
                required: []
              }
            }
          ],
          tool_choice: 'auto'
        })
      });

      if (acceptResponse.ok) {
        console.log('✅ Call accepted successfully');

        // Try to connect to WebSocket to listen for conversation events (optional)
        try {
          const ws = new WebSocket(`wss://api.openai.com/v1/realtime?call_id=${call_id}`, {
            headers: {
              Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            },
          });

          ws.on('open', () => {
            console.log('🔌 WebSocket connected for call:', call_id);
          });

          ws.on('message', async (data: any) => {
            const event = JSON.parse(data.toString());
            console.log('📨 WebSocket event:', event.type);

            // Print AI's speech transcript
            if (event.type === 'response.output_audio_transcript.done') {
              console.log('🤖 AI says:', event.transcript);
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
                  } catch (err: any) {
                    if (err.code !== 'ENOENT') throw err;
                  }

                  const newOrder = {
                    ...args,
                    phoneNumber: phoneNumber,
                    source: 'phone',
                    timestamp: new Date().toISOString(),
                    id: `phone-order-${Date.now()}`
                  };

                  orders.push(newOrder);
                  await fs.writeFile(ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf-8');

                  console.log('✅ Phone order saved:', newOrder.id);

                  // Send function result back to OpenAI
                  try {
                    const responseMessage = JSON.stringify({
                      type: 'conversation.item.create',
                      item: {
                        type: 'function_call_output',
                        call_id: event.call_id,
                        output: JSON.stringify({ success: true, orderId: newOrder.id })
                      }
                    });
                    ws.send(responseMessage, { binary: false });

                    // Continue the conversation
                    const continueMessage = JSON.stringify({
                      type: 'response.create'
                    });
                    ws.send(continueMessage, { binary: false });
                  } catch (sendError: any) {
                    console.error('❌ Error sending WebSocket message:', sendError);
                  }

                } catch (error: any) {
                  console.error('❌ Error saving phone order:', error);

                  // Send error back to OpenAI
                  try {
                    const errorMessage = JSON.stringify({
                      type: 'conversation.item.create',
                      item: {
                        type: 'function_call_output',
                        call_id: event.call_id,
                        output: JSON.stringify({ success: false, error: error.message })
                      }
                    });
                    ws.send(errorMessage, { binary: false });
                  } catch (sendError: any) {
                    console.error('❌ Error sending WebSocket error message:', sendError);
                  }
                }
              }

              if (functionName === 'end_call') {
                // End the call after a delay to allow goodbye message to play
                try {
                  console.log('📞 AI requested to end call');

                  // Send function result back to OpenAI
                  try {
                    const endCallMessage = JSON.stringify({
                      type: 'conversation.item.create',
                      item: {
                        type: 'function_call_output',
                        call_id: event.call_id,
                        output: JSON.stringify({ success: true })
                      }
                    });
                    ws.send(endCallMessage, { binary: false });
                  } catch (sendError: any) {
                    console.error('❌ Error sending end_call WebSocket message:', sendError);
                  }

                  // Wait 5 seconds for goodbye message to finish playing, then hang up
                  setTimeout(async () => {
                    try {
                      await fetch(`https://api.openai.com/v1/realtime/calls/${call_id}/hangup`, {
                        method: 'POST',
                        headers: {
                          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                          'Content-Type': 'application/json'
                        }
                      });
                      console.log('✅ Call ended via /hangup endpoint (after 5s delay)');
                    } catch (error) {
                      console.error('❌ Error hanging up call:', error);
                    }
                  }, 5000);
                } catch (error) {
                  console.error('❌ Error ending call:', error);
                }
              }
            }
          });

          ws.on('error', (error: any) => {
            console.error('❌ WebSocket error (non-critical):', error.message);
            console.log('ℹ️  Call will continue without WebSocket monitoring');
          });

          ws.on('close', () => {
            console.log('🔌 WebSocket closed for call:', call_id);
          });
        } catch (wsError: any) {
          console.error('❌ WebSocket connection failed (non-critical):', wsError.message);
          console.log('ℹ️  Call will continue without WebSocket monitoring');
        }

        return NextResponse.json({ success: true });
      } else {
        const error = await acceptResponse.text();
        console.error('❌ Failed to accept call:', error);
        return NextResponse.json({ error: 'Failed to accept call' }, { status: 500 });
      }

    } catch (error: any) {
      console.error('❌ Error handling webhook:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } else {
    // Acknowledge other event types
    return NextResponse.json({ success: true });
  }
}
