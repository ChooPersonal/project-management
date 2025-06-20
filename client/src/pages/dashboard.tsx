import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Filter, ArrowUpDown, FolderOpen, Clock, CheckCircle, Users } from 'lucide-react';
import { useProjects } from '@/hooks/use-projects';
import { useTeamMembers } from '@/hooks/use-team-members';
import Sidebar from '@/components/sidebar';
import ProjectCard from '@/components/project-card';
import CreateProjectModal from '@/components/create-project-modal';
import ProfileDropdown from '@/components/profile-dropdown';
import TeamMemberAvatar from '@/components/team-member-avatar';
import { Skeleton } from '@/components/ui/skeleton';

export default function Dashboard() {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const { data: teamMembers = [] } = useTeamMembers();

  const stats = {
    total: projects.length,
    inProgress: projects.filter(p => p.status === 'in-progress').length,
    completed: projects.filter(p => p.status === 'completed').length,
    teamMembers: teamMembers.length,
  };

  const filteredProjects = projects.filter(project =>
    project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (typeof project.description === 'string' 
      ? project.description.toLowerCase().includes(searchQuery.toLowerCase())
      : JSON.stringify(project.description).toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar onCreateProject={() => setCreateModalOpen(true)} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2 className="text-2xl font-semibold text-gray-900">Projects Dashboard</h2>
            <div className="flex items-center space-x-2 bg-gray-100 rounded-md px-3 py-1">
              <Search className="w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none text-sm shadow-none focus-visible:ring-0"
              />
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="sm">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
            <Button variant="ghost" size="sm">
              <ArrowUpDown className="w-4 h-4 mr-2" />
              Sort
            </Button>
            <ProfileDropdown />
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Projects</p>
                    <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <FolderOpen className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">In Progress</p>
                    <p className="text-2xl font-semibold text-gray-900">{stats.inProgress}</p>
                  </div>
                  <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <Clock className="w-6 h-6 text-yellow-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Completed</p>
                    <p className="text-2xl font-semibold text-gray-900">{stats.completed}</p>
                  </div>
                  <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-emerald-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Team Members</p>
                    <p className="text-2xl font-semibold text-gray-900">{stats.teamMembers}</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Projects Grid */}
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

          {!projectsLoading && filteredProjects.length === 0 && (
            <div className="text-center py-12">
              <FolderOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No projects found</h3>
              <p className="text-gray-600 mb-4">
                {searchQuery ? 'Try adjusting your search query.' : 'Get started by creating your first project.'}
              </p>
              {!searchQuery && (
                <Button onClick={() => setCreateModalOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                  Create Project
                </Button>
              )}
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
