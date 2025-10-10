import { User } from '@shared/schema';

export function getDisplayStatus(user: User): 'online' | 'offline' | 'dnd' {
  return user.settings?.appearanceStatus ?? 'online';
}

export function getStatusColor(status: 'online' | 'offline' | 'dnd'): string {
  switch (status) {
    case 'online':
      return 'bg-status-online';
    case 'offline':
      return 'bg-status-offline';
    case 'dnd':
      return 'bg-status-dnd';
    default:
      return 'bg-status-offline';
  }
}

export function getStatusText(status: 'online' | 'offline' | 'dnd', currentActivity?: string | null): string {
  switch (status) {
    case 'online':
      return currentActivity || 'In Menu';
    case 'offline':
      return 'Offline';
    case 'dnd':
      return 'Do Not Disturb';
    default:
      return 'Offline';
  }
}
