import { useParams } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, User, Users } from 'lucide-react';
import { Link } from 'wouter';
import { useTeamMembers } from '@/hooks/use-team-members';
import { getStatusColor, getPriorityColor, formatDate } from '@/lib/utils';
import TeamMemberAvatar from '@/components/team-member-avatar';
import { Project } from '@/types';

export default function MemberProjectsPage() {
  const params = useParams();
  const memberId = parseInt(params.memberId as string);
  
  const { data: teamMembers = [] } = useTeamMembers();
  const member = teamMembers.find(m => m.id === memberId);

  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: [`/api/projects/by-member/${memberId}`],
    enabled: !isNaN(memberId),
  });

  if (!member) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-20">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Member not found
            </h2>
            <Link href="/">
              <Button>Return to Dashboard</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          
          <div className="flex items-center space-x-4 mb-4">
            <TeamMemberAvatar user={member} size="lg" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {member.fullName}'s Projects
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                @{member.username} • {member.email}
              </p>
            </div>
          </div>
        </div>

        {/* Project Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Projects</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {projects.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                  <Calendar className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Active Projects</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {projects.filter(p => p.status === 'in-progress').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                  <Users className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Created Projects</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {projects.filter(p => p.createdBy === memberId).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                  <Calendar className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Completed</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {projects.filter(p => p.status === 'completed').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Projects Grid */}
        {isLoading ? (
          <div className="text-center py-20">
            <p className="text-gray-600 dark:text-gray-400">Loading projects...</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-20">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No projects found
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {member.fullName} hasn't created or been assigned to any projects yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <Link key={project.id} href={`/project/${project.id}`}>
                <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg line-clamp-2">{project.title}</CardTitle>
                      <div className="flex space-x-1 ml-2">
                        <Badge className={getStatusColor(project.status)}>
                          {project.status}
                        </Badge>
                        <Badge variant="outline" className={getPriorityColor(project.priority)}>
                          {project.priority}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {project.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
                          {typeof project.description === 'string' 
                            ? project.description 
                            : 'Rich text content'
                          }
                        </p>
                      )}
                      
                      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                        <span>
                          {project.createdBy === memberId ? 'Created' : 'Team Member'}
                        </span>
                        <span>{formatDate(project.createdAt)}</span>
                      </div>
                      
                      {project.dueDate && (
                        <div className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400">
                          <Calendar className="h-3 w-3" />
                          <span>Due: {formatDate(project.dueDate)}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}