import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

// Get all restaurants user belongs to
export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's restaurants via user_tenants junction table
    const userTenants = await prisma.user_tenants.findMany({
      where: {
        users: { clerk_user_id: userId }
      },
      include: {
        tenants: true
      }
    });

    // Map to restaurant array
    const restaurants = userTenants
      .filter(ut => ut.tenants !== null)
      .map(ut => ({
        id: ut.tenants!.id,
        name: ut.tenants!.name,
        slug: ut.tenants!.slug,
        address: ut.tenants!.address,
        phone_number: ut.tenants!.phone_number,
        is_open: ut.tenants!.is_open,
        role: ut.role || 'staff',
        wallet_balance: ut.tenants!.wallet_balance
      }));

    return NextResponse.json(restaurants);
  } catch (error) {
    console.error('Error fetching restaurants:', error);
    return NextResponse.json({ error: 'Failed to fetch restaurants' }, { status: 500 });
  }
}

// Create new restaurant
export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { restaurantName, phoneNumber, address } = await request.json();

    if (!restaurantName) {
      return NextResponse.json({ error: 'Restaurant name is required' }, { status: 400 });
    }

    const email = user.emailAddresses[0]?.emailAddress || '';
    const name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || email.split('@')[0];

    // Generate unique slug
    const baseSlug = restaurantName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 50);

    let slug = baseSlug;
    let counter = 1;

    while (await prisma.tenants.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Generate invite code for this restaurant
    const inviteCode = generateInviteCode();

    // Create tenant
    const tenant = await prisma.tenants.create({
      data: {
        name: restaurantName,
        slug,
        phone_number: phoneNumber || null,
        address: address || null,
        wallet_balance: 10.00, // $10 starting credit
        status: 'active',
        is_open: true,
        settings: { invite_code: inviteCode },
      },
    });

    // Check if user exists
    const existingUser = await prisma.users.findUnique({
      where: { clerk_user_id: userId }
    });

    if (!existingUser) {
      // Create user if doesn't exist
      const newUser = await prisma.users.create({
        data: {
          clerk_user_id: userId,
          email,
          name,
        },
      });

      // Create user_tenant relationship
      await prisma.user_tenants.create({
        data: {
          user_id: newUser.id,
          tenant_id: tenant.id,
          role: 'owner'
        }
      });
    } else {
      // User exists, just create the relationship
      await prisma.user_tenants.create({
        data: {
          user_id: existingUser.id,
          tenant_id: tenant.id,
          role: 'owner'
        }
      });
    }

    console.log(`✅ Created restaurant "${restaurantName}" with invite code: ${inviteCode}`);

    return NextResponse.json({
      success: true,
      restaurant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        inviteCode
      }
    });
  } catch (error) {
    console.error('Restaurant creation error:', error);
    return NextResponse.json({ error: 'Failed to create restaurant' }, { status: 500 });
  }
}

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 9; i++) {
    if (i === 3 || i === 6) {
      code += '-';
    } else {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  }
  return code; // Format: ABC-DEF-123
}
