import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Filter, ArrowUpDown, FolderOpen, LayoutGrid, List, Plus } from 'lucide-react';
import { useProjects } from '@/hooks/use-projects';
import { useTeamMembers } from '@/hooks/use-team-members';
import Sidebar from '@/components/sidebar';
import ProjectCard from '@/components/project-card';
import CreateProjectModal from '@/components/create-project-modal';
import ProfileDropdown from '@/components/profile-dropdown';
import TeamMemberAvatar from '@/components/team-member-avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn, getStatusColor, getPriorityColor, formatDate } from '@/lib/utils';

export default function AllProjectsPage() {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  
  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const { data: teamMembers = [] } = useTeamMembers();

  // Filter and sort projects
  let filteredProjects = projects.filter(project => {
    const matchesSearch = project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (typeof project.description === 'string' 
        ? project.description.toLowerCase().includes(searchQuery.toLowerCase())
        : JSON.stringify(project.description).toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || project.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  // Sort projects
  filteredProjects = filteredProjects.sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'oldest':
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case 'title':
        return a.title.localeCompare(b.title);
      case 'priority':
        const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
        return (priorityOrder[b.priority as keyof typeof priorityOrder] || 0) - 
               (priorityOrder[a.priority as keyof typeof priorityOrder] || 0);
      case 'status':
        return a.status.localeCompare(b.status);
      case 'dueDate':
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      default:
        return 0;
    }
  });

  const getTeamMemberById = (id: number) => {
    return teamMembers.find(member => member.id === id);
  };

  const ProjectListItem = ({ project }: { project: any }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{project.title}</h3>
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="outline" className={cn("text-xs", getStatusColor(project.status))}>
                {project.status}
              </Badge>
              <Badge variant="outline" className={cn("text-xs", getPriorityColor(project.priority))}>
                {project.priority}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {project.teamMembers?.slice(0, 3).map((memberId: number) => {
              const member = getTeamMemberById(memberId);
              return member ? (
                <TeamMemberAvatar key={member.id} user={member} size="sm" />
              ) : null;
            })}
            {project.teamMembers?.length > 3 && (
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-600">
                +{project.teamMembers.length - 3}
              </div>
            )}
          </div>
        </div>
        
        <div className="text-sm text-gray-600 mb-4 line-clamp-2">
          {typeof project.description === 'string' 
            ? project.description 
            : 'Rich text description'}
        </div>
        
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center gap-4">
            <span>Created: {formatDate(project.createdAt)}</span>
            {project.dueDate && (
              <span>Due: {formatDate(project.dueDate)}</span>
            )}
          </div>
          <span>{project.attachments?.length || 0} attachments</span>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar onCreateProject={() => setCreateModalOpen(true)} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold text-gray-900">All Projects</h2>
            <div className="flex items-center space-x-3">
              <Button onClick={() => setCreateModalOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                New Project
              </Button>
              <ProfileDropdown />
            </div>
          </div>
          
          {/* Filters and Search */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center space-x-2 bg-gray-100 rounded-md px-3 py-2 flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none text-sm shadow-none focus-visible:ring-0"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="planning">Planning</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="review">Review</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="title">Title A-Z</SelectItem>
                <SelectItem value="priority">Priority</SelectItem>
                <SelectItem value="status">Status</SelectItem>
                <SelectItem value="dueDate">Due Date</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-6">
          <div className="mb-6">
            <p className="text-gray-600">
              Showing {filteredProjects.length} of {projects.length} projects
            </p>
          </div>

          {/* View Tabs */}
          <Tabs defaultValue="list" className="w-full">
            <TabsList className="grid w-[300px] grid-cols-2">
              <TabsTrigger value="list" className="flex items-center gap-2">
                <List className="w-4 h-4" />
                List View
              </TabsTrigger>
              <TabsTrigger value="grid" className="flex items-center gap-2">
                <LayoutGrid className="w-4 h-4" />
                Grid View
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="list" className="mt-6">
              {projectsLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Card key={i}>
                      <CardContent className="p-6">
                        <Skeleton className="h-6 w-48 mb-4" />
                        <Skeleton className="h-4 w-full mb-2" />
                        <Skeleton className="h-4 w-3/4 mb-4" />
                        <div className="flex justify-between">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-4 w-24" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredProjects.map((project) => (
                    <ProjectListItem key={project.id} project={project} />
                  ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="grid" className="mt-6">
              {projectsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Card key={i}>
                      <CardContent className="p-6">
                        <Skeleton className="h-6 w-20 mb-4" />
                        <Skeleton className="h-6 w-full mb-2" />
                        <Skeleton className="h-4 w-full mb-2" />
                        <Skeleton className="h-4 w-3/4 mb-4" />
                        <Skeleton className="h-32 w-full mb-4" />
                        <div className="flex justify-between">
                          <div className="flex -space-x-2">
                            <Skeleton className="h-8 w-8 rounded-full" />
                            <Skeleton className="h-8 w-8 rounded-full" />
                          </div>
                          <Skeleton className="h-4 w-16" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredProjects.map((project) => (
                    <ProjectCard key={project.id} project={project} />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>

          {!projectsLoading && filteredProjects.length === 0 && (
            <div className="text-center py-12">
              <FolderOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No projects found</h3>
              <p className="text-gray-600 mb-4">
                {searchQuery || statusFilter !== 'all' || priorityFilter !== 'all' 
                  ? 'Try adjusting your filters or search query.' 
                  : 'Get started by creating your first project.'}
              </p>
              <Button onClick={() => setCreateModalOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Create Project
              </Button>
            </div>
          )}
        </main>
      </div>

      <CreateProjectModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
      />
    </div>
  );
}