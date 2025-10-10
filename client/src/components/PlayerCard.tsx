import { User } from '@shared/schema';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Crown } from 'lucide-react';
import { getDisplayStatus, getStatusColor } from '@/lib/statusUtils';

interface PlayerCardProps {
  user: User;
  isLocalPlayer?: boolean;
  isPartyLeader?: boolean;
  scale?: number;
}

export function PlayerCard({ user, isLocalPlayer = false, isPartyLeader = false, scale = 1 }: PlayerCardProps) {
  const sizeClass = scale > 1 ? 'w-32 h-32' : 'w-24 h-24';
  const borderWidth = scale > 1 ? 'border-4' : 'border-2';

  return (
    <div 
      className="flex flex-col items-center gap-3 transition-all duration-300"
      style={{ transform: `scale(${scale})` }}
      data-testid={`player-card-${user.id}`}
    >
      {/* Avatar with online status */}
      <div className="relative">
        <Avatar className={`${sizeClass} ${borderWidth} border-primary/50 transition-all duration-200 hover:border-primary`}>
          <AvatarImage src={user.photoURL || undefined} alt={user.displayName} />
          <AvatarFallback className="bg-primary/20 text-primary text-2xl font-bold">
            {user.displayName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        {/* Party leader crown */}
        {isPartyLeader && (
          <div className="absolute -top-2 -right-2 bg-chart-3 rounded-full p-1.5">
            <Crown className="w-4 h-4 text-white" />
          </div>
        )}
        
        {/* Online status indicator */}
        <div className={`absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-background ${
          getStatusColor(getDisplayStatus(user))
        }`} />
      </div>

      {/* Display name */}
      <div className="text-center">
        <p className="text-lg font-semibold text-foreground" data-testid={`text-displayname-${user.id}`}>
          {user.displayName}
        </p>
        {user.currentActivity && (
          <p className="text-sm text-muted-foreground truncate max-w-[180px]">
            {user.currentActivity}
          </p>
        )}
      </div>
    </div>
  );
}
