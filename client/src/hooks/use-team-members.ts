import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import type { User } from '@/types';

export function useTeamMembers() {
  return useQuery<User[]>({
    queryKey: ['/api/users'],
  });
}

export function useUploadFile() {
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      
      return response.json();
    },
  });
}

export function useCreateTeamMember() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: {
      fullName: string;
      email: string;
      username: string;
      password: string;
      avatar: string | null;
      color: string;
    }) => {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to create team member');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
    },
  });
}

export function useDeleteTeamMember() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (userId: number) => {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete team member');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
    },
  });
}

export function useUploadFiles() {
  return useMutation({
    mutationFn: async (files: FileList) => {
      const formData = new FormData();
      Array.from(files).forEach(file => {
        formData.append('files', file);
      });
      
      const response = await fetch('/api/upload/multiple', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      
      return response.json();
    },
  });
}
