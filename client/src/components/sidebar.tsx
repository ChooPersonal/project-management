import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Plus, Home, FolderOpen, Users, Calendar, Settings, Box, Inbox, Download } from 'lucide-react';
import { useTeamMembers } from '@/hooks/use-team-members';
import { useUnreadMessageCount } from '@/hooks/use-inbox';
import { useQuery } from '@tanstack/react-query';
import TeamMemberAvatar from './team-member-avatar';
import { ThemeToggle } from './theme-toggle';
import { Link, useLocation } from 'wouter';
import NotionImportModal from './notion-import-modal';

interface SidebarProps {
  onCreateProject: () => void;
}

export default function Sidebar({ onCreateProject }: SidebarProps) {
  const [location] = useLocation();
  const [notionImportOpen, setNotionImportOpen] = useState(false);
  const { data: teamMembers = [] } = useTeamMembers();
  
  // For demo purposes, using user ID 5 (current user)
  const { data: unreadCount } = useUnreadMessageCount(5);
  const unreadCountValue = (unreadCount as { count: number })?.count || 0;

  // Fetch workspace settings
  const { data: settings } = useQuery({
    queryKey: ['/api/settings'],
    queryFn: async () => {
      const response = await fetch('/api/settings');
      if (!response.ok) throw new Error('Failed to fetch settings');
      return response.json();
    }
  });

  const navigationItems = [
    { path: '/', label: 'Dashboard', icon: Home },
    { path: '/projects', label: 'All Projects', icon: FolderOpen },
    { 
      path: '/inbox', 
      label: 'Inbox', 
      icon: Inbox, 
      badge: unreadCountValue > 0 ? unreadCountValue : undefined 
    },
    { path: '/team', label: 'Team', icon: Users },
    { path: '/timeline', label: 'Timeline', icon: Calendar },
    { path: '/admin', label: 'Admin Panel', icon: Settings },
  ];

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2 mb-4">
          {settings?.companyLogo ? (
            <div className="w-8 h-8 rounded-lg overflow-hidden">
              <img 
                src={settings.companyLogo} 
                alt="Company logo" 
                className="w-full h-full object-contain"
              />
            </div>
          ) : (
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Box className="w-4 h-4 text-white" />
            </div>
          )}
          <h1 className="font-semibold text-gray-900">
            {settings?.workspaceName || 'Project Manager'}
          </h1>
        </div>
        <div className="space-y-2">
          <Button 
            onClick={onCreateProject}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </Button>
          
          <Button 
            onClick={() => setNotionImportOpen(true)}
            variant="outline"
            className="w-full"
          >
            <Download className="w-4 h-4 mr-2" />
            Import from Notion
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <div className="space-y-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.path;
            
            return (
              <Link key={item.path} href={item.path}>
                <div className={`flex items-center justify-between px-3 py-2 rounded-md transition-colors cursor-pointer ${
                  isActive 
                    ? 'bg-gray-100 text-gray-900 font-medium' 
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}>
                  <div className="flex items-center space-x-3">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <Badge variant="destructive" className="h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center">
                      {item.badge}
                    </Badge>
                  )}
                </div>
              </Link>
            );
          })}
        </div>

        {/* Team Members */}
        <div className="mt-8">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Team Members
          </h3>
          <div className="space-y-2">
            {teamMembers.map((member) => (
              <Link
                key={member.id}
                href={`/member/${member.id}/projects`}
                className="flex items-center space-x-3 px-3 py-2 rounded-md hover:bg-gray-100 transition-colors cursor-pointer block"
              >
                <TeamMemberAvatar user={member} size="sm" />
                <span className="text-sm text-gray-700">{member.fullName}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Theme Toggle */}
        <div className="mt-8 px-3">
          <ThemeToggle />
        </div>
      </nav>

      <NotionImportModal 
        open={notionImportOpen} 
        onOpenChange={setNotionImportOpen} 
      />
    </div>
  );
}
