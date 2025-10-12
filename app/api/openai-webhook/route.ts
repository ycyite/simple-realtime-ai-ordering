// WebSocket handler for OpenAI Realtime API - Updated
import { NextResponse } from 'next/server';
import WebSocket from 'ws';
import { prisma } from '@/lib/prisma';
import { deductCallCost } from '@/lib/wallet';

// Force Node.js runtime (required for WebSocket)
export const runtime = 'nodejs';

export async function POST(request: Request) {
  // Log immediately when endpoint is hit
  console.log('🚨 WEBHOOK ENDPOINT HIT - Request received at', new Date().toISOString());

  const body = await request.json();
  const { type, data } = body;

  console.log('\n' + '='.repeat(60));
  console.log('📞 OPENAI SIP WEBHOOK RECEIVED');
  console.log('='.repeat(60));
  console.log("   Full Body:", JSON.stringify(body, null, 2));
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
      // Extract restaurant phone number from Diversion SIP header
      let restaurantPhoneNumber = "";
      const diversionHeader = data.sip_headers?.find((h: any) => h.name === "Diversion");

      if (diversionHeader) {
        // Extract phone number from format: <sip:+13659063275@twilio.com>;reason=unconditional
        const phoneMatch = diversionHeader.value.match(/(\+1\d+)/);
        if (phoneMatch) {
          restaurantPhoneNumber = phoneMatch[1]; // Store with +1
          console.log("🏪 Restaurant phone number (Diversion):", restaurantPhoneNumber);
        }
      }

      // Query tenant by restaurant phone number
      let tenant = null;

      if (restaurantPhoneNumber) {
        tenant = await prisma.tenants.findFirst({
          where: {
            phone_number: restaurantPhoneNumber,
            status: "active"
          }
        });

        if (tenant) {
          console.log("✅ Found tenant by phone number:", tenant.name);
        } else {
          console.log("⚠️  No tenant found with phone number:", restaurantPhoneNumber);
        }
      }

      // Fallback: if no Diversion header or no matching tenant, use first active tenant
      if (!tenant) {
        console.log("🔄 Falling back to first active tenant");
        tenant = await prisma.tenants.findFirst({
          where: { status: "active" }
        });
      }

      if (!tenant) {
        console.log("❌ No active tenant found");
        return NextResponse.json({ error: "No active restaurant" }, { status: 404 });
      }

      const isOpen = tenant.is_open ?? true;
      console.log('🏪 Restaurant status:', isOpen ? 'OPEN' : 'CLOSED');

      // If restaurant is closed, reject the call after 8 seconds
      if (!isOpen) {
        console.log('🔴 RESTAURANT CLOSED - Call will be rejected after 8 seconds');

        setTimeout(async () => {
          try {
            await fetch(`https://api.openai.com/v1/realtime/calls/${call_id}/reject`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ status_code: 486 })
            });
            console.log('✅ Call rejected with status code 486 (Busy Here)');
          } catch (error) {
            console.error('❌ Error rejecting call:', error);
          }
        }, 8000);

        return NextResponse.json({ success: true, message: 'Restaurant closed, call will be rejected' });
      }

      console.log('🟢 RESTAURANT OPEN - Accepting call');

      // Load menu from database
      const menuItems = await prisma.menu_items.findMany({
        where: {
          tenant_id: tenant.id,
          available: true
        },
        orderBy: { category: 'asc' }
      });

      // Group menu items by category
      const menuByCategory = menuItems.reduce((acc: any, item) => {
        const category = item.category || 'Other';
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push({
          name: item.name,
          price: item.price,
          description: item.description
        });
        return acc;
      }, {});

      const menuContext = `You are a professional phone order-taking agent for ${tenant.name}.

IMPORTANT INSTRUCTIONS:
- Start the conversation immediately by greeting the customer: "Thank you for calling ${tenant.name}! How can I help you today?"
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
${Object.entries(menuByCategory).map(([categoryName, items]: [string, any]) =>
  `${categoryName}:\n${items.map((item: any) =>
    `- ${item.name}: $${Number(item.price).toFixed(2)}`
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

          // Accumulate tokens across the entire call
          const callStats = {
            totalTokens: 0,
            totalInputTokens: 0,
            totalOutputTokens: 0,
            cachedTextTokens: 0,
            cachedAudioTokens: 0,
            uncachedTextTokens: 0,
            uncachedAudioTokens: 0,
            outputTextTokens: 0,
            outputAudioTokens: 0,
            responseCount: 0
          };

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

            // Log usage data when response is complete
            if (event.type === 'response.done') {
              callStats.responseCount++;
              console.log('\n' + '='.repeat(60));
              console.log('📊 RESPONSE USAGE STATS');
              console.log('='.repeat(60));
              if (event.response?.usage) {
                const usage = event.response.usage;
                const inputDetails = usage.input_token_details || {};
                const outputDetails = usage.output_token_details || {};

                // Input token breakdown
                const inputTextTokens = inputDetails.text_tokens || 0;
                const inputAudioTokens = inputDetails.audio_tokens || 0;
                const _inputCachedTokens = inputDetails.cached_tokens || 0;

                // Cached breakdown
                const cachedDetails = inputDetails.cached_tokens_details || {};
                const cachedTextTokens = cachedDetails.text_tokens || 0;
                const cachedAudioTokens = cachedDetails.audio_tokens || 0;

                // Uncached calculation
                const uncachedTextTokens = inputTextTokens - cachedTextTokens;
                const uncachedAudioTokens = inputAudioTokens - cachedAudioTokens;
                const _totalUncachedInput = uncachedTextTokens + uncachedAudioTokens;

                // Output token breakdown
                const outputTextTokens = outputDetails.text_tokens || 0;
                const outputAudioTokens = outputDetails.audio_tokens || 0;

                // Accumulate to call stats
                callStats.totalTokens += usage.total_tokens;
                callStats.totalInputTokens += usage.input_tokens;
                callStats.totalOutputTokens += usage.output_tokens;
                callStats.cachedTextTokens += cachedTextTokens;
                callStats.cachedAudioTokens += cachedAudioTokens;
                callStats.uncachedTextTokens += uncachedTextTokens;
                callStats.uncachedAudioTokens += uncachedAudioTokens;
                callStats.outputTextTokens += outputTextTokens;
                callStats.outputAudioTokens += outputAudioTokens;

                console.log('   📥 INPUT TOKENS (Total:', usage.input_tokens, ')');
                console.log('      ├─ Cached Text:', cachedTextTokens);
                console.log('      ├─ Cached Audio:', cachedAudioTokens);
                console.log('      ├─ Uncached Text:', uncachedTextTokens);
                console.log('      └─ Uncached Audio:', uncachedAudioTokens);
                console.log('');
                console.log('   📤 OUTPUT TOKENS (Total:', usage.output_tokens, ')');
                console.log('      ├─ Text:', outputTextTokens);
                console.log('      └─ Audio:', outputAudioTokens);
                console.log('');
                console.log('   💰 TOTAL TOKENS:', usage.total_tokens);
              } else {
                console.log('   No usage data available');
              }
              console.log('='.repeat(60) + '\n');
            }

            // Handle function calls
            if (event.type === 'response.function_call_arguments.done') {
              const functionName = event.name;
              const args = JSON.parse(event.arguments);

              console.log(`🔧 Function call: ${functionName}`, args);

              if (functionName === 'save_order') {
                // Save order to database
                try {
                  const newOrder = await prisma.orders.create({
                    data: {
                      tenant_id: tenant.id,
                      customer_name: args.customerName,
                      customer_phone: phoneNumber,
                      items: args.items, // JSONB field
                      total_amount: args.total,
                      status: 'undealt',
                      source: 'phone',
                      pickup_time: args.pickupTime
                    }
                  });

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
                    if (ws.readyState === WebSocket.OPEN) {

                      ws.send(responseMessage);

                    }

                    // Continue the conversation
                    const continueMessage = JSON.stringify({
                      type: 'response.create'
                    });
                    if (ws.readyState === WebSocket.OPEN) {

                      ws.send(continueMessage);

                    }
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
                    if (ws.readyState === WebSocket.OPEN) {

                      ws.send(errorMessage);

                    }
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
                    if (ws.readyState === WebSocket.OPEN) {

                      ws.send(endCallMessage);

                    }
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

          ws.on('close', async () => {
            console.log('🔌 WebSocket closed for call:', call_id);

            // Print final accumulated call statistics and save to database
            if (callStats.responseCount > 0) {
              // Calculate costs for gpt-realtime pricing
              const inputTextCost = (callStats.uncachedTextTokens * 4.00 / 1000000) + (callStats.cachedTextTokens * 0.40 / 1000000);
              const inputAudioCost = (callStats.uncachedAudioTokens * 32.00 / 1000000) + (callStats.cachedAudioTokens * 0.40 / 1000000);
              const outputTextCost = callStats.outputTextTokens * 16.00 / 1000000;
              const outputAudioCost = callStats.outputAudioTokens * 64.00 / 1000000;
              const totalCost = inputTextCost + inputAudioCost + outputTextCost + outputAudioCost;

              console.log('\n' + '='.repeat(60));
              console.log('🏁 FINAL CALL SUMMARY - Call ID:', call_id);
              console.log('='.repeat(60));
              console.log('   Total AI Responses:', callStats.responseCount);
              console.log('');
              console.log('   📥 TOTAL INPUT TOKENS:', callStats.totalInputTokens);
              console.log('      ├─ Cached Text:', callStats.cachedTextTokens, `($${(callStats.cachedTextTokens * 0.40 / 1000000).toFixed(6)})`);
              console.log('      ├─ Cached Audio:', callStats.cachedAudioTokens, `($${(callStats.cachedAudioTokens * 0.40 / 1000000).toFixed(6)})`);
              console.log('      ├─ Uncached Text:', callStats.uncachedTextTokens, `($${(callStats.uncachedTextTokens * 4.00 / 1000000).toFixed(6)})`);
              console.log('      └─ Uncached Audio:', callStats.uncachedAudioTokens, `($${(callStats.uncachedAudioTokens * 32.00 / 1000000).toFixed(6)})`);
              console.log('');
              console.log('   📤 TOTAL OUTPUT TOKENS:', callStats.totalOutputTokens);
              console.log('      ├─ Text:', callStats.outputTextTokens, `($${(callStats.outputTextTokens * 16.00 / 1000000).toFixed(6)})`);
              console.log('      └─ Audio:', callStats.outputAudioTokens, `($${(callStats.outputAudioTokens * 64.00 / 1000000).toFixed(6)})`);
              console.log('');
              console.log('   💰 GRAND TOTAL TOKENS:', callStats.totalTokens);
              console.log('   💵 TOTAL COST: $' + totalCost.toFixed(6), `(≈ $${totalCost.toFixed(4)})`);
              console.log('='.repeat(60) + '\n');

              // Save call log to database
              try {
                const callLog = await prisma.call_logs.create({
                  data: {
                    tenant_id: tenant.id,
                    call_sid: call_id,
                    from_number: phoneNumber,
                    cached_text_input_tokens: callStats.cachedTextTokens,
                    uncached_text_input_tokens: callStats.uncachedTextTokens,
                    cached_audio_input_tokens: callStats.cachedAudioTokens,
                    uncached_audio_input_tokens: callStats.uncachedAudioTokens,
                    text_output_tokens: callStats.outputTextTokens,
                    audio_output_tokens: callStats.outputAudioTokens,
                    total_tokens: callStats.totalTokens,
                    cost: totalCost
                  }
                });
                console.log('✅ Call log saved to database');
                // Deduct call cost from wallet
                await deductCallCost(tenant.id, callLog.id, totalCost);
              } catch (error) {
                console.error('❌ Error saving call log:', error);
              }
            }
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
