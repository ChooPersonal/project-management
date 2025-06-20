import { cn, getInitials, getAvatarColor } from '@/lib/utils';
import type { User } from '@/types';

interface TeamMemberAvatarProps {
  user: User;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function TeamMemberAvatar({ user, size = 'md', className }: TeamMemberAvatarProps) {
  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base'
  };

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center text-white font-medium border-2 border-white',
        getAvatarColor(user.color),
        sizeClasses[size],
        className
      )}
      title={user.fullName}
    >
      {user.avatar ? (
        <img
          src={user.avatar}
          alt={user.fullName}
          className="w-full h-full rounded-full object-cover"
        />
      ) : (
        getInitials(user.fullName)
      )}
    </div>
  );
}
