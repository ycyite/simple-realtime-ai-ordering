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

    // Round OpenAI cost to 2 decimal places, then apply 50% markup
    const openaiCostRounded = Math.round(openaiCost * 100) / 100;
    const openaiCharged = Math.round(openaiCostRounded * 1.5 * 100) / 100;
    const platformMarkup = openaiCharged - openaiCostRounded;

    // Calculate Twilio telecommunication costs (if duration provided), rounded UP to 2 decimals
    let twilioCharged = 0;
    if (durationSeconds) {
      const minutes = Math.ceil(durationSeconds / 60); // Round up: 1min 10sec = 2min, 45sec = 1min
      const voiceCost = minutes * 0.0045; // SIP trunking at $0.0045/min
      const smsCost = 3 * 0.0083; // 3 SMS messages at $0.0083/SMS
      const smsCarrierFee = 3 * 0.0087; // 3 SMS carrier fees at $0.0087/SMS
      twilioCharged = Math.ceil((voiceCost + smsCost + smsCarrierFee) * 100) / 100; // Round UP to 2 decimals
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
          openai_cost: openaiCostRounded,
          openai_charged: openaiCharged,
          platform_markup: platformMarkup,
          twilio_cost: 0, // Twilio recorded separately
          balance_before: currentBalance,
          balance_after: twilioCharged > 0 ? currentBalance - openaiCharged : newBalance
        }
      }),

      // Record Twilio telecommunication cost transaction (if applicable)
      ...(twilioCharged > 0 ? [
        prisma.wallet_transactions.create({
          data: {
            tenant_id: tenantId,
            amount: -twilioCharged,
            type: 'telecom_cost',
            description: `Telecommunication cost for call ${callId} (${Math.ceil(durationSeconds! / 60)} min voice + 3 SMS)`,
            related_call_log_id: callId,
            twilio_cost: twilioCharged,
            platform_markup: 0, // No markup on telecom
            balance_before: currentBalance - openaiCharged,
            balance_after: newBalance
          }
        })
      ] : [])
    ]);

    console.log(`💰 Call cost deducted:`);
    console.log(`   AI: $${openaiCharged.toFixed(2)} (cost: $${openaiCostRounded.toFixed(2)}, markup: $${platformMarkup.toFixed(2)})`);
    if (twilioCharged > 0) {
      console.log(`   Telecommunication: $${twilioCharged.toFixed(2)} (voice + 3 SMS, pass-through)`);
    }
    console.log(`   Total: $${totalCharge.toFixed(2)}`);
    console.log(`   New balance: $${newBalance.toFixed(2)}`);
  } catch (error) {
    console.error('❌ Error deducting call cost:', error);
  }
}
