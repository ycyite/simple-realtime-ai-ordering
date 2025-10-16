import { prisma } from '@/lib/prisma';

/**
 * Deduct call costs from restaurant wallet
 * Applies 50% markup to OpenAI costs
 */
export async function deductCallCost(
  tenantId: string,
  callId: string,
  openaiCost: number,
  durationSeconds?: number
) {
  try {
    // Get current wallet balance
    const tenant = await prisma.tenants.findUnique({
      where: { id: tenantId },
      select: { wallet_balance: true, low_balance_threshold: true }
    });

    if (!tenant) {
      console.error('❌ Tenant not found for cost deduction:', tenantId);
      return;
    }

    const currentBalance = Number(tenant.wallet_balance) || 0;

    // Apply 50% markup to OpenAI cost (your profit)
    const openaiCharged = openaiCost * 1.5;
    const platformMarkup = openaiCharged - openaiCost;

    // Calculate Twilio cost (if duration provided)
    let twilioCharged = 0;
    if (durationSeconds) {
      const minutes = durationSeconds / 60;
      twilioCharged = minutes * 0.013 * 2; // Inbound + outbound at $0.013/min
    }

    const totalCharge = openaiCharged + twilioCharged;
    const newBalance = currentBalance - totalCharge;

    // Check for low balance warning
    const lowBalanceThreshold = Number(tenant.low_balance_threshold) || 10;
    if (newBalance < lowBalanceThreshold) {
      console.log(`⚠️  Low balance warning for tenant ${tenantId}: $${newBalance.toFixed(2)}`);
      // TODO: Send low balance alert email
    }

    // Deduct from wallet (atomic transaction)
    await prisma.$transaction([
      // Update tenant balance
      prisma.tenants.update({
        where: { id: tenantId },
        data: { wallet_balance: newBalance }
      }),

      // Record AI cost transaction
      prisma.wallet_transactions.create({
        data: {
          tenant_id: tenantId,
          amount: -openaiCharged,
          type: 'ai_call_cost',
          description: `AI processing cost for call ${callId}`,
          related_call_log_id: callId,
          openai_cost: openaiCost,
          openai_charged: openaiCharged,
          platform_markup: platformMarkup,
          twilio_cost: 0, // Twilio recorded separately
          balance_before: currentBalance,
          balance_after: currentBalance - openaiCharged
        }
      }),

      // Record Twilio cost transaction (if applicable)
      ...(twilioCharged > 0 ? [
        prisma.wallet_transactions.create({
          data: {
            tenant_id: tenantId,
            amount: -twilioCharged,
            type: 'twilio_call_cost',
            description: `Twilio voice cost for call ${callId} (${(durationSeconds! / 60).toFixed(2)} min)`,
            related_call_log_id: callId,
            twilio_cost: twilioCharged,
            platform_markup: 0, // No markup on Twilio
            balance_before: currentBalance - openaiCharged,
            balance_after: newBalance
          }
        })
      ] : [])
    ]);

    console.log(`💰 Call cost deducted:`);
    console.log(`   AI: $${openaiCharged.toFixed(6)} (cost: $${openaiCost.toFixed(6)}, markup: $${platformMarkup.toFixed(6)})`);
    if (twilioCharged > 0) {
      console.log(`   Twilio: $${twilioCharged.toFixed(6)} (pass-through)`);
    }
    console.log(`   Total: $${totalCharge.toFixed(6)}`);
    console.log(`   New balance: $${newBalance.toFixed(2)}`);
  } catch (error) {
    console.error('❌ Error deducting call cost:', error);
  }
}
