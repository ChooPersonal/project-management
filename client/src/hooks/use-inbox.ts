import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function useInboxMessages(userId: number) {
  return useQuery({
    queryKey: ["/api/inbox", userId],
    enabled: !!userId,
  });
}

export function useUnreadMessageCount(userId: number) {
  return useQuery({
    queryKey: ["/api/inbox", userId, "unread-count"],
    enabled: !!userId,
  });
}

export function useMarkMessageAsRead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (messageId: string) => {
      const response = await fetch("/api/inbox/mark-read", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messageId }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to mark message as read");
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidate inbox queries to refresh unread count
      queryClient.invalidateQueries({ queryKey: ["/api/inbox"] });
    },
  });
}