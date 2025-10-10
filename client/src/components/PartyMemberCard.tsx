import { User } from '@shared/schema';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Crown, UserX, UserCheck } from 'lucide-react';

interface PartyMemberCardProps {
  user: User;
  isLocalPlayer?: boolean;
  isPartyLeader?: boolean;
  canManage?: boolean;
  scale?: number;
  onKick?: (userId: string) => void;
  onPromote?: (userId: string) => void;
}

export function PartyMemberCard({ 
  user, 
  isLocalPlayer = false, 
  isPartyLeader = false,
  canManage = false,
  scale = 1,
  onKick,
  onPromote,
}: PartyMemberCardProps) {
  const sizeClass = scale > 1 ? 'w-32 h-32' : 'w-24 h-24';
  const borderWidth = scale > 1 ? 'border-4' : 'border-2';

  const CardContent = (
    <div 
      className="flex flex-col items-center gap-3 transition-all duration-300"
      style={{ transform: `scale(${scale})` }}
      data-testid={`player-card-${user.id}`}
    >
      <div className="relative">
        <Avatar className={`${sizeClass} ${borderWidth} border-primary/50 transition-all duration-200 hover:border-primary`}>
          <AvatarImage src={user.photoURL || undefined} alt={user.displayName} />
          <AvatarFallback className="bg-primary/20 text-primary text-2xl font-bold">
            {user.displayName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        {isPartyLeader && (
          <div className="absolute -top-2 -right-2 bg-chart-3 rounded-full p-1.5">
            <Crown className="w-4 h-4 text-white" />
          </div>
        )}
        
        <div className={`absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-background ${
          user.status === 'online' ? 'bg-status-online' :
          user.status === 'away' ? 'bg-status-away' :
          user.status === 'busy' ? 'bg-status-busy' :
          'bg-status-offline'
        }`} />
      </div>

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

  if (canManage && !isLocalPlayer && !isPartyLeader) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div className="cursor-pointer hover:opacity-80 transition-opacity">
            {CardContent}
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center">
          <DropdownMenuItem onClick={() => onPromote?.(user.id)} data-testid={`button-promote-${user.id}`}>
            <UserCheck className="h-4 w-4 mr-2" />
            Promote to Leader
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => onKick?.(user.id)}
            className="text-destructive"
            data-testid={`button-kick-${user.id}`}
          >
            <UserX className="h-4 w-4 mr-2" />
            Kick from Party
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return CardContent;
}
