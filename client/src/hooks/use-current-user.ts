import { useQuery } from '@tanstack/react-query';

export interface CurrentUser {
  id: number;
  username: string;
  email: string;
  fullName: string;
  role: string;
  avatar?: string | null;
  color: string;
}

export function useCurrentUser() {
  return useQuery<CurrentUser>({
    queryKey: ['/api/auth/me'],
    queryFn: async () => {
      const response = await fetch('/api/auth/me');
      if (!response.ok) {
        throw new Error('Not authenticated');
      }
      return response.json();
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useLogout() {
  return async () => {
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (response.ok) {
        window.location.href = '/login';
      }
    } catch (error) {
      console.error('Logout failed:', error);
      // Force redirect even if logout fails
      window.location.href = '/login';
    }
  };
}