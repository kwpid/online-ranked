import { useState, useEffect } from 'react';
import { User, Notification, FriendRequest } from '@shared/schema';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { X, UserPlus, UserMinus, Send, Check, XCircle, Users as UsersIcon } from 'lucide-react';
import { collection, query, where, onSnapshot, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { notificationService } from '@/lib/firebaseService';

interface FriendsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onInviteToParty: (userId: string) => void;
  onAddFriend: (username: string) => void;
  onRemoveFriend: (userId: string) => void;
  onAcceptFriendRequest: (requestId: string) => void;
  onDeclineFriendRequest: (requestId: string) => void;
}

export function FriendsSidebar({
  isOpen,
  onClose,
  onInviteToParty,
  onAddFriend,
  onRemoveFriend,
  onAcceptFriendRequest,
  onDeclineFriendRequest,
}: FriendsSidebarProps) {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('online');
  const [searchUsername, setSearchUsername] = useState('');
  const [friends, setFriends] = useState<User[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [recentlyPlayed, setRecentlyPlayed] = useState<User[]>([]);
  const [partyMembers, setPartyMembers] = useState<User[]>([]);
  const [isInParty, setIsInParty] = useState(false);

  // Real-time friends listener
  useEffect(() => {
    if (!currentUser) return;

    const friendshipsQuery = query(
      collection(db, 'friendships'),
      where('userId', '==', currentUser.id)
    );

    const unsubscribe = onSnapshot(friendshipsQuery, async (snapshot) => {
      const friendIds = snapshot.docs.map(doc => doc.data().friendId);
      
      if (friendIds.length === 0) {
        setFriends([]);
        return;
      }

      // Fetch friend user data
      const friendsData: User[] = [];
      for (const friendId of friendIds) {
        const userDocRef = doc(db, 'users', friendId);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
          friendsData.push({ ...userSnap.data(), id: userSnap.id } as User);
        }
      }
      setFriends(friendsData);
    });

    return unsubscribe;
  }, [currentUser]);

  // Real-time notifications listener
  useEffect(() => {
    if (!currentUser) return;

    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', currentUser.id),
      where('read', '==', false)
    );

    const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({ 
        ...doc.data(), 
        id: doc.id 
      } as Notification));
      setNotifications(notifs);
    });

    return unsubscribe;
  }, [currentUser]);

  // Real-time friend requests listener
  useEffect(() => {
    if (!currentUser) return;

    const requestsQuery = query(
      collection(db, 'friendRequests'),
      where('toUserId', '==', currentUser.id),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(requestsQuery, (snapshot) => {
      const requests = snapshot.docs.map(doc => ({ 
        ...doc.data(), 
        id: doc.id 
      } as FriendRequest));
      setFriendRequests(requests);
    });

    return unsubscribe;
  }, [currentUser]);

  // Real-time party listener
  useEffect(() => {
    if (!currentUser) return;

    const partiesQuery = query(
      collection(db, 'parties'),
      where('memberIds', 'array-contains', currentUser.id)
    );

    const unsubscribe = onSnapshot(partiesQuery, async (snapshot) => {
      if (snapshot.empty) {
        setIsInParty(false);
        setPartyMembers([]);
        return;
      }

      setIsInParty(true);
      const party = snapshot.docs[0].data();
      
      // Fetch party members
      const members: User[] = [];
      for (const memberId of party.memberIds) {
        const memberDocRef = doc(db, 'users', memberId);
        const memberSnap = await getDoc(memberDocRef);
        if (memberSnap.exists()) {
          members.push({ ...memberSnap.data(), id: memberSnap.id } as User);
        }
      }
      setPartyMembers(members);
    });

    return unsubscribe;
  }, [currentUser]);

  const onlineFriends = friends.filter(f => f.status === 'online');
  const unreadCount = notifications.length + friendRequests.length;

  const handleMarkNotificationRead = async (notificationId: string) => {
    const notifRef = doc(db, 'notifications', notificationId);
    await updateDoc(notifRef, { read: true });
  };

  const handleAcceptPartyInvite = async (notificationId: string) => {
    if (!currentUser) return;
    
    try {
      await notificationService.acceptPartyInvite(notificationId, currentUser.id);
      
      toast({
        title: 'Party Joined',
        description: 'You have joined the party!',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to join party',
        variant: 'destructive',
      });
    }
  };

  const handleDeclinePartyInvite = async (notificationId: string) => {
    try {
      await handleMarkNotificationRead(notificationId);
      
      toast({
        title: 'Invite Declined',
        description: 'Party invitation declined',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to decline invitation',
        variant: 'destructive',
      });
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
        onClick={onClose}
        data-testid="friends-sidebar-backdrop"
      />

      {/* Sidebar */}
      <div className="fixed right-0 top-0 h-screen w-96 bg-card border-l border-border z-50 flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-xl font-bold text-foreground">Friends</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            data-testid="button-close-friends"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent p-0 overflow-x-auto">
            {isInParty && (
              <TabsTrigger value="party" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary" data-testid="tab-party">
                Party ({partyMembers.length})
              </TabsTrigger>
            )}
            <TabsTrigger value="online" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary" data-testid="tab-online-friends">
              Online ({onlineFriends.length})
            </TabsTrigger>
            <TabsTrigger value="all" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary" data-testid="tab-all-friends">
              All ({friends.length})
            </TabsTrigger>
            <TabsTrigger value="notifications" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary relative" data-testid="tab-notifications">
              Notifications
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-chart-3 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="recent" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary" data-testid="tab-recently-played">
              Recent
            </TabsTrigger>
            <TabsTrigger value="add" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary" data-testid="tab-add-friend">
              Add
            </TabsTrigger>
          </TabsList>

          {/* Party Members */}
          {isInParty && (
            <TabsContent value="party" className="flex-1 overflow-y-auto p-2 space-y-2 mt-0">
              {partyMembers.map(member => (
                <div 
                  key={member.id}
                  className="flex items-center gap-3 p-2 rounded-lg bg-secondary/30"
                  data-testid={`party-member-${member.id}`}
                >
                  <div className="relative">
                    <Avatar className="h-10 w-10 border-2 border-primary/30">
                      <AvatarImage src={member.photoURL || undefined} />
                      <AvatarFallback className="bg-primary/20 text-primary">
                        {member.displayName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-card ${
                      member.status === 'online' ? 'bg-status-online' : 'bg-status-offline'
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{member.displayName}</p>
                    <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                      {member.currentActivity || 'Offline'}
                    </p>
                  </div>
                </div>
              ))}
            </TabsContent>
          )}

          {/* Online Friends */}
          <TabsContent value="online" className="flex-1 overflow-y-auto p-2 space-y-2 mt-0">
            {onlineFriends.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No friends online
              </div>
            ) : (
              onlineFriends.map(friend => (
                <FriendItem
                  key={friend.id}
                  friend={friend}
                  onInviteToParty={onInviteToParty}
                  onRemoveFriend={onRemoveFriend}
                />
              ))
            )}
          </TabsContent>

          {/* All Friends */}
          <TabsContent value="all" className="flex-1 overflow-y-auto p-2 space-y-2 mt-0">
            {friends.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No friends yet
              </div>
            ) : (
              friends.map(friend => (
                <FriendItem
                  key={friend.id}
                  friend={friend}
                  onInviteToParty={onInviteToParty}
                  onRemoveFriend={onRemoveFriend}
                />
              ))
            )}
          </TabsContent>

          {/* Notifications */}
          <TabsContent value="notifications" className="flex-1 overflow-y-auto p-2 space-y-2 mt-0">
            {/* Friend Requests */}
            {friendRequests.map(request => (
              <div 
                key={request.id} 
                className="p-3 rounded-lg bg-secondary/50 border border-border space-y-2"
                data-testid={`friend-request-${request.id}`}
              >
                <p className="text-sm text-foreground">
                  Friend request from <span className="font-semibold">{request.fromUserId}</span>
                </p>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    onClick={() => onAcceptFriendRequest(request.id)}
                    data-testid={`button-accept-${request.id}`}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Accept
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => onDeclineFriendRequest(request.id)}
                    data-testid={`button-decline-${request.id}`}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Decline
                  </Button>
                </div>
              </div>
            ))}

            {/* Other Notifications */}
            {notifications.map(notif => (
              <div 
                key={notif.id} 
                className="p-3 rounded-lg bg-secondary/50 border border-border"
                data-testid={`notification-${notif.id}`}
              >
                <p className="text-sm text-foreground">{notif.message}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(notif.createdAt).toLocaleTimeString()}
                </p>
                
                {notif.type === 'party_invite' && (
                  <div className="flex gap-2 mt-3">
                    <Button 
                      size="sm" 
                      onClick={() => handleAcceptPartyInvite(notif.id)}
                      data-testid={`button-accept-party-${notif.id}`}
                    >
                      <UsersIcon className="h-4 w-4 mr-1" />
                      Join Party
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleDeclinePartyInvite(notif.id)}
                      data-testid={`button-decline-party-${notif.id}`}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Decline
                    </Button>
                  </div>
                )}
                
                {notif.type !== 'party_invite' && (
                  <Button 
                    size="sm" 
                    variant="ghost"
                    className="mt-2"
                    onClick={() => handleMarkNotificationRead(notif.id)}
                  >
                    Mark as Read
                  </Button>
                )}
              </div>
            ))}

            {friendRequests.length === 0 && notifications.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No notifications
              </div>
            )}
          </TabsContent>

          {/* Recently Played */}
          <TabsContent value="recent" className="flex-1 overflow-y-auto p-2 space-y-2 mt-0">
            <div className="text-center py-12 px-4">
              <p className="text-muted-foreground mb-2">Recently Played With</p>
              <p className="text-sm text-muted-foreground/70">
                This feature will be available when gameplay is enabled.
                Players you match with will appear here.
              </p>
            </div>
          </TabsContent>

          {/* Add Friend */}
          <TabsContent value="add" className="flex-1 p-4 mt-0">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Enter Username
                </label>
                <Input
                  value={searchUsername}
                  onChange={(e) => setSearchUsername(e.target.value)}
                  placeholder="Username..."
                  className="bg-background"
                  data-testid="input-add-friend-username"
                />
              </div>
              <Button 
                className="w-full"
                onClick={() => {
                  if (searchUsername.trim()) {
                    onAddFriend(searchUsername.trim());
                    setSearchUsername('');
                  }
                }}
                data-testid="button-send-friend-request"
              >
                <Send className="h-4 w-4 mr-2" />
                Send Friend Request
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

function FriendItem({ 
  friend, 
  onInviteToParty, 
  onRemoveFriend 
}: { 
  friend: User;
  onInviteToParty: (userId: string) => void;
  onRemoveFriend: (userId: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div 
          className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 cursor-pointer transition-colors"
          data-testid={`friend-item-${friend.id}`}
        >
          <div className="relative">
            <Avatar className="h-10 w-10 border-2 border-primary/30">
              <AvatarImage src={friend.photoURL || undefined} />
              <AvatarFallback className="bg-primary/20 text-primary">
                {friend.displayName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-card ${
              friend.status === 'online' ? 'bg-status-online' : 'bg-status-offline'
            }`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground truncate">{friend.displayName}</p>
            <p className="text-xs text-muted-foreground truncate max-w-[180px]">
              {friend.currentActivity || 'Offline'}
            </p>
          </div>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => onInviteToParty(friend.id)} data-testid={`button-invite-${friend.id}`}>
          <UserPlus className="h-4 w-4 mr-2" />
          Invite to Party
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => onRemoveFriend(friend.id)}
          className="text-destructive"
          data-testid={`button-remove-friend-${friend.id}`}
        >
          <UserMinus className="h-4 w-4 mr-2" />
          Remove Friend
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
