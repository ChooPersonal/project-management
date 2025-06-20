import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { LogOut, Settings, User } from 'lucide-react';
import { useTeamMembers } from '@/hooks/use-team-members';

export default function ProfileDropdown() {
  const { data: teamMembers = [] } = useTeamMembers();
  
  // For now, we'll determine the current user based on login state
  // This should be replaced with proper session management
  const currentUser = teamMembers.find(member => member.username === 'choo') || 
                     teamMembers.find(member => member.id === 9) ||
                     teamMembers[0];

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleLogout = () => {
    console.log('Logging out...');
    window.location.href = '/login';
  };

  if (!currentUser) {
    return (
      <Button variant="ghost" className="relative h-8 w-8 rounded-full">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-gray-400 text-white text-xs">
            --
          </AvatarFallback>
        </Avatar>
      </Button>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <DropdownMenu>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={currentUser.avatar || undefined} alt={currentUser.fullName} />
                  <AvatarFallback className="bg-blue-600 text-white text-xs">
                    {getInitials(currentUser.fullName)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>{currentUser.fullName} (@{currentUser.username})</p>
          </TooltipContent>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{currentUser.fullName}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {currentUser.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </Tooltip>
    </TooltipProvider>
  );
}