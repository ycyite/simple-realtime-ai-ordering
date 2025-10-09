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

      // Generate a unique slug for the tenant
      const baseSlug = (first_name || email?.split('@')[0] || 'restaurant')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .substring(0, 50);

      let slug = baseSlug;
      let counter = 1;

      // Make sure slug is unique
      while (await prisma.tenants.findUnique({ where: { slug } })) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }

      // Create tenant
      const tenant = await prisma.tenants.create({
        data: {
          name: `${name}'s Restaurant`,
          slug,
          wallet_balance: 10.00, // Give $10 starting credit
          status: 'active',
          is_open: true,
        },
      });

      // Create user linked to tenant
      await prisma.users.create({
        data: {
          tenant_id: tenant.id,
          clerk_user_id: id,
          email: email || '',
          name,
          role: 'owner',
        },
      });

      console.log(`✅ Created tenant "${tenant.name}" (${tenant.slug}) for user ${email}`);
    }

    if (eventType === 'user.deleted') {
      const { id } = evt.data;

      // Find and delete user (tenant will cascade delete due to FK)
      await prisma.users.delete({
        where: { clerk_user_id: id },
      });

      console.log(`✅ Deleted user ${id} and associated tenant`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}
