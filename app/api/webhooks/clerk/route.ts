import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { Webhook } from 'svix';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

// Clerk webhook to create tenant and user on signup
export async function POST(request: Request) {
  try {
    // Get the headers
    const headerPayload = await headers();
    const svix_id = headerPayload.get('svix-id');
    const svix_timestamp = headerPayload.get('svix-timestamp');
    const svix_signature = headerPayload.get('svix-signature');

    // If there are no headers, error out
    if (!svix_id || !svix_timestamp || !svix_signature) {
      return NextResponse.json({ error: 'Missing svix headers' }, { status: 400 });
    }

    // Get the body
    const payload = await request.json();
    const body = JSON.stringify(payload);

    // Get webhook secret from env
    const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

    if (!WEBHOOK_SECRET) {
      throw new Error('Please add CLERK_WEBHOOK_SECRET to .env');
    }

    // Create a new Svix instance with your secret
    const wh = new Webhook(WEBHOOK_SECRET);

    let evt: any;

    // Verify the payload with the headers
    try {
      evt = wh.verify(body, {
        'svix-id': svix_id,
        'svix-timestamp': svix_timestamp,
        'svix-signature': svix_signature,
      }) as any;
    } catch (err) {
      console.error('Error verifying webhook:', err);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // Handle the webhook
    const eventType = evt.type;

    if (eventType === 'user.created') {
      const { id, email_addresses, first_name, last_name } = evt.data;

      const email = email_addresses[0]?.email_address;
      const name = `${first_name || ''} ${last_name || ''}`.trim() || email?.split('@')[0] || 'User';

      // Just create user record without tenant
      // Tenant will be linked via user_tenants when creating/joining restaurant
      await prisma.users.create({
        data: {
          clerk_user_id: id,
          email: email || '',
          name,
        },
      });

      console.log(`✅ Created user ${email} (no tenant - will be linked when creating/joining restaurant)`);
    }

    if (eventType === 'user.deleted') {
      const { id } = evt.data;

      // Get user's tenant relationships
      const userTenants = await prisma.user_tenants.findMany({
        where: {
          users: { clerk_user_id: id }
        },
        select: { tenant_id: true, role: true }
      });

      // For each tenant where user is owner, check if there are other owners
      for (const ut of userTenants) {
        if (ut.role === 'owner') {
          const otherOwners = await prisma.user_tenants.count({
            where: {
              tenant_id: ut.tenant_id,
              role: 'owner',
              user_id: { not: (await prisma.users.findUnique({ where: { clerk_user_id: id } }))?.id }
            }
          });

          // If no other owners, delete the tenant (will cascade delete user_tenants)
          if (otherOwners === 0) {
            await prisma.tenants.delete({
              where: { id: ut.tenant_id as string }
            });
            console.log(`✅ Deleted tenant ${ut.tenant_id} (last owner removed)`);
          }
        }
      }

      // Delete user (will cascade delete user_tenants relationships)
      await prisma.users.delete({
        where: { clerk_user_id: id }
      });
      console.log(`✅ Deleted user ${id}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}
