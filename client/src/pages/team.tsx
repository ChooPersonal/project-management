import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { UserPlus, Search, Mail, Users, Settings, MoreVertical } from 'lucide-react';
import { useTeamMembers, useDeleteTeamMember } from '@/hooks/use-team-members';
import TeamMemberAvatar from '@/components/team-member-avatar';
import AddTeamMemberModal from '@/components/add-team-member-modal';
import { Skeleton } from '@/components/ui/skeleton';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from '@/hooks/use-toast';

export default function TeamPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const { data: teamMembers = [], isLoading } = useTeamMembers();
  const deleteTeamMember = useDeleteTeamMember();

  const filteredMembers = teamMembers.filter(member =>
    member.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRemoveMember = async (memberId: number, memberName: string) => {
    try {
      await deleteTeamMember.mutateAsync(memberId);
      toast({
        title: "Member removed",
        description: `${memberName} has been removed from the team.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove team member. Please try again.",
        variant: "destructive",
      });
    }
  };

  const stats = {
    total: teamMembers.length,
    online: Math.floor(teamMembers.length * 0.6),
    activeToday: Math.floor(teamMembers.length * 0.8),
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Team Members</h1>
            <p className="text-gray-600 mt-1">Manage your team and collaborate effectively</p>
          </div>
          <AddTeamMemberModal
            trigger={
              <Button className="bg-blue-600 hover:bg-blue-700">
                <UserPlus className="w-4 h-4 mr-2" />
                Add Member
              </Button>
            }
          />
        </div>

        {/* Team Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Members</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Online Now</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.online}</p>
                </div>
                <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Today</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.activeToday}</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Settings className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search team members..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline">
                Filter
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Team Members Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <Skeleton className="w-12 h-12 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <>
            {filteredMembers.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {searchQuery ? 'No members found' : 'No team members yet'}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {searchQuery 
                      ? 'Try adjusting your search query.' 
                      : 'Get started by adding your first team member.'
                    }
                  </p>
                  {!searchQuery && (
                    <AddTeamMemberModal
                      trigger={
                        <Button>
                          <UserPlus className="w-4 h-4 mr-2" />
                          Add First Member
                        </Button>
                      }
                    />
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredMembers.map((member) => (
                  <Card key={member.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <TeamMemberAvatar user={member} size="lg" />
                          <div>
                            <h3 className="font-semibold text-gray-900">{member.fullName}</h3>
                            <p className="text-sm text-gray-600">@{member.username}</p>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>View Profile</DropdownMenuItem>
                            <DropdownMenuItem>Send Message</DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-red-600"
                              onClick={() => handleRemoveMember(member.id, member.fullName)}
                              disabled={deleteTeamMember.isPending}
                            >
                              {deleteTeamMember.isPending ? 'Removing...' : 'Remove'}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center text-sm text-gray-600">
                          <Mail className="w-4 h-4 mr-2" />
                          {member.email}
                        </div>
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-xs">
                            Member
                          </Badge>
                          <div className="flex items-center space-x-1">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                            <span className="text-xs text-gray-500">Online</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}