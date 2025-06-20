import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, Calendar, Edit, Trash2, MoreVertical } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { apiRequest } from '@/lib/queryClient';
import { toast } from '@/hooks/use-toast';
import { ProjectDescription } from '@shared/schema';

interface ProjectDescriptionsProps {
  projectId: number;
}

export default function ProjectDescriptions({ projectId }: ProjectDescriptionsProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const queryClient = useQueryClient();

  const { data: descriptions = [], isLoading } = useQuery({
    queryKey: ['project-descriptions', projectId],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}/descriptions`);
      if (!response.ok) throw new Error('Failed to fetch descriptions');
      return response.json() as Promise<ProjectDescription[]>;
    }
  });

  const createDescription = useMutation({
    mutationFn: async (data: { title: string; content: string }) => {
      const response = await apiRequest('POST', `/api/projects/${projectId}/descriptions`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-descriptions', projectId] });
      setIsCreateOpen(false);
      setNewTitle('');
      setNewContent('');
      toast({
        title: "Description added",
        description: "New description block has been created.",
      });
    },
    onError: (error) => {
      console.error('Create description error:', error);
      toast({
        title: "Failed to create description",
        description: error?.message || "Unknown error occurred",
        variant: "destructive",
      });
    }
  });

  const updateDescription = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { title?: string; content?: string } }) => {
      const response = await apiRequest('PUT', `/api/project-descriptions/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-descriptions', projectId] });
      setEditingId(null);
      toast({
        title: "Description updated",
        description: "Description block has been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to update description",
        variant: "destructive",
      });
    }
  });

  const deleteDescription = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/project-descriptions/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-descriptions', projectId] });
      toast({
        title: "Description deleted",
        description: "Description block has been removed.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to delete description",
        variant: "destructive",
      });
    }
  });

  const handleCreate = () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    console.log('Creating description:', { title: newTitle.trim(), content: newContent.trim() });
    createDescription.mutate({ title: newTitle.trim(), content: newContent.trim() });
  };

  const handleEdit = (description: ProjectDescription) => {
    setEditingId(description.id);
    setNewTitle(description.title);
    setNewContent(description.content);
  };

  const handleUpdate = () => {
    if (!editingId || !newTitle.trim() || !newContent.trim()) return;
    updateDescription.mutate({
      id: editingId,
      data: { title: newTitle.trim(), content: newContent.trim() }
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setNewTitle('');
    setNewContent('');
  };

  const renderDescription = (content: string) => {
    const lines = content.split('\n');
    
    return (
      <div className="prose prose-sm max-w-none space-y-2">
        {lines.map((line, idx) => {
          // Handle images
          const imageMatch = line.match(/!\[([^\]]*)\]\(([^)]+)\)/);
          if (imageMatch) {
            const [, altText, imageUrl] = imageMatch;
            return (
              <div key={idx} className="my-4">
                <img
                  src={imageUrl}
                  alt={altText || 'image'}
                  className="max-w-full h-auto rounded-lg border shadow-sm"
                  loading="lazy"
                />
              </div>
            );
          }
          
          // Handle headings
          if (line.startsWith('###')) {
            return <h3 key={idx} className="text-lg font-semibold mt-4 mb-2">{line.substring(4)}</h3>;
          }
          if (line.startsWith('##')) {
            return <h2 key={idx} className="text-xl font-semibold mt-4 mb-2">{line.substring(3)}</h2>;
          }
          if (line.startsWith('#')) {
            return <h1 key={idx} className="text-2xl font-bold mt-4 mb-2">{line.substring(2)}</h1>;
          }
          
          // Handle bold text
          const boldFormatted = line.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
          
          // Handle empty lines
          if (line.trim() === '') {
            return <br key={idx} />;
          }
          
          return (
            <p key={idx} dangerouslySetInnerHTML={{ __html: boldFormatted }} />
          );
        })}
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Description Blocks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="animate-pulse bg-gray-200 h-32 rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg font-semibold">Description Blocks</CardTitle>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Description
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Description Block</DialogTitle>
              <DialogDescription>
                Add a timestamped description block to track project progress with a title and content.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Title</label>
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Enter description title..."
                />
              </div>
              <div>
                <label className="text-sm font-medium">Content</label>
                <Textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Enter description content..."
                  className="min-h-[200px]"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => setIsCreateOpen(false)}
                  disabled={createDescription.isPending}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreate}
                  disabled={createDescription.isPending || !newTitle.trim() || !newContent.trim()}
                >
                  {createDescription.isPending ? 'Creating...' : 'Create'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {descriptions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No description blocks yet</p>
            <p className="text-sm">Add timestamped descriptions to track project progress</p>
          </div>
        ) : (
          <div className="space-y-6">
            {descriptions.map((description) => (
              <Card key={description.id} className="border-l-4 border-l-blue-500">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-medium">
                        {editingId === description.id ? (
                          <Input
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            className="text-base font-medium"
                          />
                        ) : (
                          description.title
                        )}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          <Calendar className="w-3 h-3 mr-1" />
                          {formatDate(description.createdAt)}
                        </Badge>
                        {description.updatedAt !== description.createdAt && (
                          <Badge variant="secondary" className="text-xs">
                            Updated {formatDate(description.updatedAt)}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(description)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => deleteDescription.mutate(description.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  {editingId === description.id ? (
                    <div className="space-y-4">
                      <Textarea
                        value={newContent}
                        onChange={(e) => setNewContent(e.target.value)}
                        className="min-h-[150px]"
                      />
                      <div className="flex justify-end space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={handleCancelEdit}
                          disabled={updateDescription.isPending}
                        >
                          Cancel
                        </Button>
                        <Button 
                          size="sm"
                          onClick={handleUpdate}
                          disabled={updateDescription.isPending || !newTitle.trim() || !newContent.trim()}
                        >
                          {updateDescription.isPending ? 'Saving...' : 'Save'}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    renderDescription(description.content)
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}