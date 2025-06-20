import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest, getQueryFn } from '@/lib/queryClient';
import type { Project, CreateProjectData } from '@/types';

export function useProjects() {
  return useQuery<Project[]>({
    queryKey: ['/api/projects'],
  });
}

export function useProject(id: number) {
  return useQuery<Project>({
    queryKey: ['/api/projects', id],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch project');
      }
      return response.json();
    },
    enabled: !!id && !isNaN(id),
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateProjectData) => {
      const response = await apiRequest('POST', '/api/projects', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<CreateProjectData> }) => {
      const response = await apiRequest('PUT', `/api/projects/${id}`, data);
      return response.json();
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', id] });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/projects/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
    },
  });
}

export function useSearchProjects(query: string) {
  return useQuery<Project[]>({
    queryKey: ['/api/projects/search', query],
    enabled: !!query,
  });
}

export function useProjectTitles() {
  return useQuery<string[]>({
    queryKey: ['/api/projects/titles'],
  });
}
