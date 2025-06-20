import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserPlus, Mail, User } from 'lucide-react';
import { useTeamMembers } from '@/hooks/use-team-members';
import TeamMemberAvatar from '@/components/team-member-avatar';
import AddTeamMemberModal from '@/components/add-team-member-modal';
import { Skeleton } from '@/components/ui/skeleton';

export default function TeamMembersSection() {
  const { data: teamMembers = [], isLoading } = useTeamMembers();

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center">
            <User className="w-5 h-5 mr-2" />
            Team Members
          </CardTitle>
          <Skeleton className="h-9 w-24" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center space-x-3">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center">
          <User className="w-5 h-5 mr-2" />
          Team Members
          <Badge variant="secondary" className="ml-2">
            {teamMembers.length}
          </Badge>
        </CardTitle>
        <AddTeamMemberModal
          trigger={
            <Button variant="outline" size="sm">
              <UserPlus className="w-4 h-4 mr-2" />
              Add Member
            </Button>
          }
        />
      </CardHeader>
      <CardContent>
        {teamMembers.length === 0 ? (
          <div className="text-center py-8">
            <User className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 mb-4">No team members yet</p>
            <AddTeamMemberModal
              trigger={
                <Button variant="outline">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add First Member
                </Button>
              }
            />
          </div>
        ) : (
          <div className="space-y-4">
            {teamMembers.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <TeamMemberAvatar user={member} size="md" />
                  <div>
                    <h4 className="font-medium text-sm">{member.fullName}</h4>
                    <div className="flex items-center text-xs text-gray-500">
                      <Mail className="w-3 h-3 mr-1" />
                      {member.email}
                    </div>
                    <p className="text-xs text-gray-400">@{member.username}</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">
                  Member
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}