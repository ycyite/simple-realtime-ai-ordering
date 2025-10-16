/**
 * Get headers for API requests including active restaurant ID
 */
export function getApiHeaders(): HeadersInit {
  const activeRestaurantId = typeof window !== 'undefined'
    ? localStorage.getItem('activeRestaurantId')
    : null;

  return {
    'Content-Type': 'application/json',
    ...(activeRestaurantId && { 'x-active-restaurant-id': activeRestaurantId })
  };
}

/**
 * Fetch wrapper that automatically includes active restaurant header
 */
export async function apiFetch(url: string, options: RequestInit = {}) {
  return fetch(url, {
    ...options,
    headers: {
      ...getApiHeaders(),
      ...options.headers,
    },
  });
}
