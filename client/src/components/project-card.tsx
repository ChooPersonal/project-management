import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Calendar, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { formatDate, getStatusColor } from '@/lib/utils';
import TeamMemberAvatar from './team-member-avatar';
import { useTeamMembers } from '@/hooks/use-team-members';
import { useDeleteProject } from '@/hooks/use-projects';
import { useToast } from '@/hooks/use-toast';
import type { Project } from '@/types';
import { Link } from 'wouter';

interface ProjectCardProps {
  project: Project;
}

export default function ProjectCard({ project }: ProjectCardProps) {
  const { data: teamMembers = [] } = useTeamMembers();
  const deleteProject = useDeleteProject();
  const { toast } = useToast();
  
  const assignedMembers = teamMembers.filter(member => 
    project.teamMembers && project.teamMembers.includes(member.id)
  );
  
  const primaryImage = project.attachments.find(attachment => 
    attachment.type.startsWith('image/')
  );

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      await deleteProject.mutateAsync(project.id);
      toast({
        title: "Project deleted",
        description: `${project.title} has been successfully deleted.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete project. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="notion-card group">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <Badge className={getStatusColor(project.status)}>
            {project.status.replace('-', ' ')}
          </Badge>
          
          <AlertDialog>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                >
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/project/${project.id}`} className="flex items-center w-full">
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Project
                  </Link>
                </DropdownMenuItem>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem className="text-red-600 focus:text-red-600">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Project
                  </DropdownMenuItem>
                </AlertDialogTrigger>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Project</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete "{project.title}"? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-red-600 hover:bg-red-700"
                  disabled={deleteProject.isPending}
                >
                  {deleteProject.isPending ? "Deleting..." : "Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        
        <Link href={`/project/${project.id}`} className="block">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {project.title}
          </h3>
          
          {project.client && (
            <p className="text-sm text-gray-600 font-medium mb-2">
              {project.client}
            </p>
          )}
          
          <p className="text-xs text-gray-500 mb-3">
            Created {formatDate(project.createdAt)}
          </p>
          
          {/* Due Date Display */}
          {project.dueDate && (
            <div className="text-sm text-gray-600 mb-4 flex items-center">
              <Calendar className="w-4 h-4 mr-2" />
              <span>Due: {formatDate(project.dueDate)}</span>
            </div>
          )}
          
          {/* Project Image */}
          {primaryImage && (
            <div className="mb-4 rounded-lg overflow-hidden">
              <img 
                src={primaryImage.url} 
                alt={project.title}
                className="w-full h-32 object-cover"
              />
            </div>
          )}
          
          {/* Team Members */}
          <div className="flex items-center space-x-2">
            <div className="flex -space-x-2">
              {assignedMembers.slice(0, 3).map((member) => (
                <TeamMemberAvatar 
                  key={member.id} 
                  user={member} 
                  size="sm"
                />
              ))}
            </div>
            {assignedMembers.length > 3 && (
              <span className="text-xs text-gray-500">
                +{assignedMembers.length - 3} more
              </span>
            )}
          </div>
        </Link>
      </CardContent>
    </Card>
  );
}