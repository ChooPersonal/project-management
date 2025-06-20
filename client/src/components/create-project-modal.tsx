import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateProject, useProjectTitles } from '@/hooks/use-projects';
import { useTeamMembers, useUploadFiles } from '@/hooks/use-team-members';
import { useToast } from '@/hooks/use-toast';
import RichTextEditor from './rich-text-editor';
import TeamMemberAvatar from './team-member-avatar';
import { X, Upload, CloudUpload } from 'lucide-react';
import { formatFileSize } from '@/lib/utils';
import type { FileAttachment, CreateProjectData } from '@/types';

const createProjectSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.any(),
  status: z.string(),
  priority: z.string(),
  startDate: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  teamMembers: z.array(z.number()).default([]),
});

type CreateProjectForm = z.infer<typeof createProjectSchema>;

interface CreateProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateProjectModal({ open, onOpenChange }: CreateProjectModalProps) {
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const { toast } = useToast();
  const { data: teamMembers = [] } = useTeamMembers();
  const { data: projectTitles = [] } = useProjectTitles();
  const createProject = useCreateProject();
  const uploadFiles = useUploadFiles();

  const form = useForm<CreateProjectForm>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      title: '',
      description: { type: 'doc', content: [] },
      status: 'planning',
      priority: 'medium',
      teamMembers: [],
    },
  });

  const handleSubmit = async (data: CreateProjectForm) => {
    try {
      const currentUserId = 5; // Current user ID
      const teamMembersWithCreator = selectedMembers.includes(currentUserId) 
        ? selectedMembers 
        : [...selectedMembers, currentUserId];
      
      const submitData = {
        title: data.title,
        description: data.description || { type: 'doc', content: [] },
        status: data.status,
        priority: data.priority,
        startDate: data.startDate ? new Date(data.startDate) : null,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        createdBy: currentUserId,
        teamMembers: teamMembersWithCreator,
        attachments,
      } as CreateProjectData;
      console.log('Submitting project data:', submitData);
      await createProject.mutateAsync(submitData);
      
      toast({
        title: 'Project created',
        description: 'Your project has been created successfully.',
      });
      
      onOpenChange(false);
      form.reset();
      setSelectedMembers([]);
      setAttachments([]);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create project. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleMemberToggle = (memberId: number) => {
    setSelectedMembers(prev =>
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleFileUpload = async (files: FileList) => {
    try {
      const uploadedFiles = await uploadFiles.mutateAsync(files);
      setAttachments(prev => [...prev, ...uploadedFiles]);
      toast({
        title: 'Files uploaded',
        description: `${files.length} file(s) uploaded successfully.`,
      });
    } catch (error) {
      toast({
        title: 'Upload failed',
        description: 'Failed to upload files. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files);
    }
  };

  const removeAttachment = (attachmentId: string) => {
    setAttachments(prev => prev.filter(att => att.id !== attachmentId));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Project Title with Suggestions */}
          <div className="relative">
            <Label htmlFor="title">Project Title</Label>
            <Input
              id="title"
              placeholder="Enter project title..."
              {...form.register('title')}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              onChange={(e) => {
                form.setValue('title', e.target.value);
                setShowSuggestions(e.target.value.length > 0);
              }}
            />
            
            {/* Title Suggestions Dropdown */}
            {showSuggestions && projectTitles.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-40 overflow-y-auto">
                {projectTitles
                  .filter(title => 
                    title.toLowerCase().includes(form.watch('title').toLowerCase()) &&
                    title !== form.watch('title')
                  )
                  .slice(0, 5)
                  .map((title, index) => (
                    <button
                      key={index}
                      type="button"
                      className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm"
                      onClick={() => {
                        form.setValue('title', title);
                        setShowSuggestions(false);
                      }}
                    >
                      {title}
                    </button>
                  ))
                }
                {projectTitles.filter(title => 
                  title.toLowerCase().includes(form.watch('title').toLowerCase()) &&
                  title !== form.watch('title')
                ).length === 0 && form.watch('title').length > 0 && (
                  <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                    No matching suggestions
                  </div>
                )}
              </div>
            )}
            
            {form.formState.errors.title && (
              <p className="text-sm text-red-600 mt-1">{form.formState.errors.title.message}</p>
            )}
          </div>

          {/* Description with Rich Text Editor */}
          <div>
            <Label>Description</Label>
            <RichTextEditor
              content={form.watch('description')}
              onChange={(content) => form.setValue('description', content)}
              placeholder="Describe your project..."
            />
          </div>

          {/* Team Member Assignment */}
          <div>
            <Label>Assign Team Members</Label>
            <div className="flex flex-wrap gap-2 mb-3">
              {selectedMembers.map(memberId => {
                const member = teamMembers.find(m => m.id === memberId);
                if (!member) return null;
                
                return (
                  <Badge key={memberId} variant="secondary" className="flex items-center space-x-1">
                    <TeamMemberAvatar user={member} size="sm" />
                    <span>{member.fullName}</span>
                    <button
                      type="button"
                      onClick={() => handleMemberToggle(memberId)}
                      className="ml-1 hover:bg-gray-200 rounded-full p-1"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                );
              })}
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              {teamMembers.map(member => {
                const isSelected = selectedMembers.includes(member.id);
                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => handleMemberToggle(member.id)}
                    className={`flex items-center space-x-2 p-2 rounded-md border transition-colors ${
                      isSelected 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <TeamMemberAvatar user={member} size="sm" />
                    <span className="text-sm">{member.fullName}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Timeline */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                {...form.register('startDate')}
              />
            </div>
            <div>
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                {...form.register('dueDate')}
              />
            </div>
          </div>

          {/* File Upload */}
          <div>
            <Label>Attachments</Label>
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-500'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.multiple = true;
                input.accept = 'image/*,.pdf,.doc,.docx';
                input.onchange = (e) => {
                  const files = (e.target as HTMLInputElement).files;
                  if (files) handleFileUpload(files);
                };
                input.click();
              }}
            >
              <CloudUpload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600 mb-1">Drop files here or click to browse</p>
              <p className="text-xs text-gray-500">PNG, JPG, PDF up to 10MB</p>
            </div>
            
            {/* Show uploaded files */}
            {attachments.length > 0 && (
              <div className="mt-3 space-y-2">
                {attachments.map(attachment => (
                  <div key={attachment.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                    <div className="flex items-center space-x-2">
                      <Upload className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-700">{attachment.name}</span>
                      <span className="text-xs text-gray-500">({formatFileSize(attachment.size)})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAttachment(attachment.id)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Status and Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Status</Label>
              <Select value={form.watch('status')} onValueChange={(value) => form.setValue('status', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planning">Planning</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="review">Review</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={form.watch('priority')} onValueChange={(value) => form.setValue('priority', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createProject.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {createProject.isPending ? 'Creating...' : 'Create Project'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
