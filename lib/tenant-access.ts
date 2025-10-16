import { prisma } from '@/lib/prisma';

/**
 * Get tenant ID from active restaurant (from localStorage/header)
 * Verifies user has access to the tenant via user_tenants junction table
 */
export async function getActiveTenantId(
  userId: string,
  activeRestaurantId?: string | null
): Promise<{ tenantId: string; role: string } | null> {
  // If no active restaurant specified, return null
  if (!activeRestaurantId) {
    return null;
  }

  // Verify user has access to this tenant through user_tenants
  const userTenant = await prisma.user_tenants.findFirst({
    where: {
      users: { clerk_user_id: userId },
      tenant_id: activeRestaurantId
    },
    select: {
      tenant_id: true,
      role: true
    }
  });

  if (!userTenant) {
    return null;
  }

  return {
    tenantId: userTenant.tenant_id as string,
    role: userTenant.role || 'staff'
  };
}

/**
 * Get user's default or last active tenant
 */
export async function getUserDefaultTenant(userId: string): Promise<string | null> {
  const user = await prisma.users.findUnique({
    where: { clerk_user_id: userId },
    select: { last_active_tenant_id: true }
  });

  if (user?.last_active_tenant_id) {
    return user.last_active_tenant_id;
  }

  // Fallback: get user's first tenant
  const userTenant = await prisma.user_tenants.findFirst({
    where: {
      users: { clerk_user_id: userId }
    },
    select: { tenant_id: true }
  });

  return userTenant?.tenant_id || null;
}
