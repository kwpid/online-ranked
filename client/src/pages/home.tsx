import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { PartyMemberCard } from '@/components/PartyMemberCard';
import { FriendsSidebar } from '@/components/FriendsSidebar';
import { ProfileModal } from '@/components/ProfileModal';
import { SettingsModal } from '@/components/SettingsModal';
import { PartyChatBox } from '@/components/PartyChatBox';
import AdminPanelDialog from '@/components/AdminPanelDialog';
import { useToast } from '@/hooks/use-toast';
import { partyService } from '@/lib/firebaseService';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  LogOut,
  UserMinus,
  Shield,
} from 'lucide-react';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  getDocs,
  getDoc,
  onSnapshot,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { User, Party, FriendRequest } from '@shared/schema';

export default function HomePage() {
  const { currentUser, signOut } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [friendsSidebarOpen, setFriendsSidebarOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);
  
  const [currentParty, setCurrentParty] = useState<Party | null>(null);
  const [partyMembers, setPartyMembers] = useState<User[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  // Listen to current party
  useEffect(() => {
    if (!currentUser) return;

    const partiesQuery = query(
      collection(db, 'parties'),
      where('memberIds', 'array-contains', currentUser.id)
    );

    const unsubscribe = onSnapshot(partiesQuery, (snapshot) => {
      if (snapshot.empty) {
        setCurrentParty(null);
        setPartyMembers([]);
        return;
      }

      const partyData = { ...snapshot.docs[0].data(), id: snapshot.docs[0].id } as Party;
      setCurrentParty(partyData);

      // Load party members
      const loadMembers = async () => {
        const members: User[] = [];
        for (const memberId of partyData.memberIds) {
          const memberDoc = await getDoc(doc(db, 'users', memberId));
          if (memberDoc.exists()) {
            members.push({ ...memberDoc.data(), id: memberDoc.id } as User);
          }
        }
        setPartyMembers(members);
      };

      loadMembers();
    });

    return unsubscribe;
  }, [currentUser]);

  // Listen to notifications count
  useEffect(() => {
    if (!currentUser) return;

    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', currentUser.id),
      where('read', '==', false)
    );

    const friendRequestsQuery = query(
      collection(db, 'friendRequests'),
      where('toUserId', '==', currentUser.id),
      where('status', '==', 'pending')
    );

    let notifCount = 0;
    let requestCount = 0;

    const unsubNotifs = onSnapshot(notificationsQuery, (snapshot) => {
      notifCount = snapshot.size;
      setUnreadNotifications(notifCount + requestCount);
    });

    const unsubRequests = onSnapshot(friendRequestsQuery, (snapshot) => {
      requestCount = snapshot.size;
      setUnreadNotifications(notifCount + requestCount);
    });

    return () => {
      unsubNotifs();
      unsubRequests();
    };
  }, [currentUser]);

  const handleSignOut = async () => {
    try {
      await signOut();
      setLocation('/auth');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to sign out',
        variant: 'destructive',
      });
    }
  };

  const handleInviteToParty = async (friendId: string) => {
    if (!currentUser) return;

    try {
      // Get friend's data to check settings
      const friendDoc = await getDoc(doc(db, 'users', friendId));
      if (!friendDoc.exists()) {
        toast({
          title: 'Error',
          description: 'User not found',
          variant: 'destructive',
        });
        return;
      }

      const friendData = { ...friendDoc.data(), id: friendDoc.id } as User;

      // Check if friend allows party invites
      if (friendData.settings?.allowPartyInvites === false) {
        toast({
          title: 'Cannot Send Invite',
          description: 'This user is not accepting party invites',
          variant: 'destructive',
        });
        return;
      }

      // Check if friend is already in YOUR party
      if (currentParty && currentParty.memberIds.includes(friendId)) {
        toast({
          title: 'Already in Party',
          description: 'This friend is already in your party',
          variant: 'destructive',
        });
        return;
      }

      // Check if friend is already in a different party
      const friendPartiesQuery = query(
        collection(db, 'parties'),
        where('memberIds', 'array-contains', friendId)
      );
      const friendPartySnap = await getDocs(friendPartiesQuery);
      
      if (!friendPartySnap.empty) {
        toast({
          title: 'Cannot Invite',
          description: 'This friend is already in another party',
          variant: 'destructive',
        });
        return;
      }

      // Create party if not in one
      if (!currentParty) {
        const newParty = await addDoc(collection(db, 'parties'), {
          leaderId: currentUser.id,
          memberIds: [currentUser.id],
          createdAt: Date.now(),
        });
        
        // Send notification
        await addDoc(collection(db, 'notifications'), {
          userId: friendId,
          type: 'party_invite',
          fromUserId: currentUser.id,
          fromUserDisplayName: currentUser.displayName,
          fromUserPhotoURL: currentUser.photoURL,
          partyId: newParty.id,
          message: `${currentUser.displayName} invited you to join their party`,
          read: false,
          createdAt: Date.now(),
        });
      } else {
        // Send notification
        await addDoc(collection(db, 'notifications'), {
          userId: friendId,
          type: 'party_invite',
          fromUserId: currentUser.id,
          fromUserDisplayName: currentUser.displayName,
          fromUserPhotoURL: currentUser.photoURL,
          partyId: currentParty.id,
          message: `${currentUser.displayName} invited you to join their party`,
          read: false,
          createdAt: Date.now(),
        });
      }

      toast({
        title: 'Invitation Sent',
        description: 'Party invitation sent successfully',
      });
    } catch (error: any) {
      console.error('Party invitation error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send party invitation',
        variant: 'destructive',
      });
    }
  };

  const handleAddFriend = async (username: string) => {
    if (!currentUser) return;

    try {
      // Find user by username
      const usersQuery = query(
        collection(db, 'users'),
        where('username', '==', username.toLowerCase())
      );
      const userSnap = await getDocs(usersQuery);

      if (userSnap.empty) {
        toast({
          title: 'User Not Found',
          description: 'No user exists with that username',
          variant: 'destructive',
        });
        return;
      }

      const targetUser = { ...userSnap.docs[0].data(), id: userSnap.docs[0].id } as User;

      if (targetUser.id === currentUser.id) {
        toast({
          title: 'Cannot Add Yourself',
          description: 'You cannot send a friend request to yourself',
          variant: 'destructive',
        });
        return;
      }

      // Check if target user allows friend requests
      if (targetUser.settings?.allowFriendRequests === false) {
        toast({
          title: 'Cannot Send Request',
          description: 'This user is not accepting friend requests',
          variant: 'destructive',
        });
        return;
      }

      // Check if already friends
      const friendshipsQuery = query(
        collection(db, 'friendships'),
        where('userId', '==', currentUser.id),
        where('friendId', '==', targetUser.id)
      );
      const friendshipSnap = await getDocs(friendshipsQuery);

      if (!friendshipSnap.empty) {
        toast({
          title: 'Already Friends',
          description: 'You are already friends with this user',
          variant: 'destructive',
        });
        return;
      }

      // Check if request already sent
      const requestsQuery = query(
        collection(db, 'friendRequests'),
        where('fromUserId', '==', currentUser.id),
        where('toUserId', '==', targetUser.id),
        where('status', '==', 'pending')
      );
      const requestSnap = await getDocs(requestsQuery);

      if (!requestSnap.empty) {
        toast({
          title: 'Request Already Sent',
          description: 'You have already sent a friend request to this user',
          variant: 'destructive',
        });
        return;
      }

      // Create friend request
      await addDoc(collection(db, 'friendRequests'), {
        fromUserId: currentUser.id,
        toUserId: targetUser.id,
        status: 'pending',
        createdAt: Date.now(),
      });

      toast({
        title: 'Request Sent',
        description: `Friend request sent to ${targetUser.displayName}`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send friend request',
        variant: 'destructive',
      });
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    if (!currentUser) return;

    try {
      // Remove both friendships
      const friendship1Query = query(
        collection(db, 'friendships'),
        where('userId', '==', currentUser.id),
        where('friendId', '==', friendId)
      );
      const friendship1Snap = await getDocs(friendship1Query);
      friendship1Snap.forEach(doc => deleteDoc(doc.ref));

      const friendship2Query = query(
        collection(db, 'friendships'),
        where('userId', '==', friendId),
        where('friendId', '==', currentUser.id)
      );
      const friendship2Snap = await getDocs(friendship2Query);
      friendship2Snap.forEach(doc => deleteDoc(doc.ref));

      toast({
        title: 'Friend Removed',
        description: 'Friend has been removed',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to remove friend',
        variant: 'destructive',
      });
    }
  };

  const handleAcceptFriendRequest = async (requestId: string) => {
    if (!currentUser) return;

    try {
      const requestRef = doc(db, 'friendRequests', requestId);
      const requestSnap = await getDoc(requestRef);
      
      if (!requestSnap.exists()) return;

      const request = { ...requestSnap.data(), id: requestSnap.id } as FriendRequest;

      // Create bidirectional friendships
      await addDoc(collection(db, 'friendships'), {
        userId: currentUser.id,
        friendId: request.fromUserId,
        createdAt: Date.now(),
      });

      await addDoc(collection(db, 'friendships'), {
        userId: request.fromUserId,
        friendId: currentUser.id,
        createdAt: Date.now(),
      });

      // Update request status
      await updateDoc(requestRef, { status: 'accepted' });

      // Send notification to requester
      await addDoc(collection(db, 'notifications'), {
        userId: request.fromUserId,
        type: 'friend_accepted',
        fromUserId: currentUser.id,
        fromUserDisplayName: currentUser.displayName,
        fromUserPhotoURL: currentUser.photoURL,
        partyId: null,
        message: `${currentUser.displayName} accepted your friend request`,
        read: false,
        createdAt: Date.now(),
      });

      toast({
        title: 'Friend Added',
        description: 'You are now friends!',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to accept friend request',
        variant: 'destructive',
      });
    }
  };

  const handleDeclineFriendRequest = async (requestId: string) => {
    try {
      const requestRef = doc(db, 'friendRequests', requestId);
      await updateDoc(requestRef, { status: 'declined' });

      toast({
        title: 'Request Declined',
        description: 'Friend request has been declined',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to decline friend request',
        variant: 'destructive',
      });
    }
  };

  const handleLeaveParty = async () => {
    if (!currentUser || !currentParty) return;

    try {
      await partyService.leave(currentParty.id, currentUser.id, currentUser.displayName);
      
      toast({
        title: 'Left Party',
        description: 'You have left the party',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to leave party',
        variant: 'destructive',
      });
    }
  };

  const handleKickMember = async (memberId: string) => {
    if (!currentUser || !currentParty) return;

    try {
      await partyService.kick(currentParty.id, memberId, currentUser.id);
      
      toast({
        title: 'Member Kicked',
        description: 'Member has been removed from the party',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to kick member',
        variant: 'destructive',
      });
    }
  };

  const handlePromoteMember = async (memberId: string) => {
    if (!currentUser || !currentParty) return;

    try {
      await partyService.promote(currentParty.id, memberId, currentUser.id);
      
      toast({
        title: 'Member Promoted',
        description: 'New party leader has been assigned',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to promote member',
        variant: 'destructive',
      });
    }
  };

  if (!currentUser) {
    return null;
  }

  const isPartyLeader = currentParty?.leaderId === currentUser.id;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-radial from-primary/5 via-background to-background"></div>

      {/* Mobile-responsive header */}
      <div className="relative z-30 flex justify-between items-center p-4 md:p-6">
        {/* Sign out button */}
        <Button
          size="icon"
          variant="outline"
          className="h-10 w-10 md:h-12 md:w-12 border-2 touch-manipulation"
          onClick={handleSignOut}
          data-testid="button-signout"
        >
          <LogOut className="h-4 w-4 md:h-5 md:w-5 text-foreground" />
        </Button>

        {/* Friends button */}
        <Button
          size="icon"
          variant="outline"
          className="relative h-10 w-10 md:h-12 md:w-12 border-2 touch-manipulation"
          onClick={() => setFriendsSidebarOpen(true)}
          data-testid="button-open-friends"
        >
          <Users className="h-5 w-5 md:h-6 md:w-6 text-foreground" />
          {unreadNotifications > 0 && (
            <span className="absolute -top-1 -right-1 bg-chart-3 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
              {unreadNotifications}
            </span>
          )}
        </Button>
      </div>

      {/* Center: Player cards - Responsive layout */}
      <div className="relative flex-1 flex items-center justify-center z-10 px-4 py-8 md:py-0 pb-32 md:pb-0">
        <div className="flex flex-col items-center gap-4 w-full max-w-6xl">
          {/* Player cards - horizontal on desktop, vertical stack on mobile */}
          <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8 w-full justify-center">
            <AnimatePresence mode="popLayout">
              {partyMembers.length > 0 ? (
                partyMembers.map(member => (
                  <motion.div
                    key={member.id}
                    initial={{ opacity: 0, scale: 0.8, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className="w-full md:w-auto max-w-sm md:max-w-none"
                  >
                    <PartyMemberCard
                      user={member}
                      isLocalPlayer={member.id === currentUser.id}
                      isPartyLeader={member.id === currentParty?.leaderId}
                      canManage={isPartyLeader}
                      scale={member.id === currentUser.id ? 1.1 : 1}
                      onKick={handleKickMember}
                      onPromote={handlePromoteMember}
                    />
                  </motion.div>
                ))
              ) : (
                <motion.div
                  key="solo-player"
                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="w-full md:w-auto max-w-sm md:max-w-none"
                >
                  <PartyMemberCard
                    user={currentUser}
                    isLocalPlayer={true}
                    scale={1.1}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {/* Leave Party Button */}
          {currentParty && (
            <Button
              variant="destructive"
              size="sm"
              className="touch-manipulation"
              onClick={handleLeaveParty}
              data-testid="button-leave-party"
            >
              <UserMinus className="h-4 w-4 mr-2" />
              Leave Party
            </Button>
          )}
        </div>
      </div>

      {/* Desktop Navigation - Hidden on mobile */}
      <div className="hidden md:flex absolute bottom-8 left-8 flex-col gap-3 z-20">
        <Button
          disabled
          className="font-display text-lg font-bold uppercase tracking-wider px-8 py-6 bg-secondary/20 backdrop-blur-sm border-2 border-border/30 opacity-40 cursor-not-allowed"
          data-testid="button-play"
        >
          Play
        </Button>
        <Button
          disabled
          className="font-display text-lg font-bold uppercase tracking-wider px-8 py-6 bg-secondary/20 backdrop-blur-sm border-2 border-border/30 opacity-40 cursor-not-allowed"
          data-testid="button-item-shop"
        >
          Item Shop
        </Button>
        <Button
          disabled
          className="font-display text-lg font-bold uppercase tracking-wider px-8 py-6 bg-secondary/20 backdrop-blur-sm border-2 border-border/30 opacity-40 cursor-not-allowed"
          data-testid="button-inventory"
        >
          Inventory
        </Button>
        <Button
          disabled
          className="font-display text-lg font-bold uppercase tracking-wider px-8 py-6 bg-secondary/20 backdrop-blur-sm border-2 border-border/30 opacity-40 cursor-not-allowed"
          data-testid="button-season-pass"
        >
          Season Pass
        </Button>
        <Button
          onClick={() => setProfileModalOpen(true)}
          className="font-display text-lg font-bold uppercase tracking-wider px-8 py-6 bg-card/80 backdrop-blur-sm border-2 border-primary/30 hover:border-primary hover:scale-105 transition-all duration-200"
          data-testid="button-profile"
        >
          Profile
        </Button>
        <Button
          onClick={() => setSettingsModalOpen(true)}
          className="font-display text-lg font-bold uppercase tracking-wider px-8 py-6 bg-card/80 backdrop-blur-sm border-2 border-primary/30 hover:border-primary hover:scale-105 transition-all duration-200"
          data-testid="button-settings"
        >
          Settings
        </Button>
        {currentUser.isAdmin && (
          <Button
            onClick={() => setAdminPanelOpen(true)}
            className="font-display text-lg font-bold uppercase tracking-wider px-8 py-6 bg-red-500/20 backdrop-blur-sm border-2 border-red-500/50 hover:border-red-500 hover:scale-105 transition-all duration-200"
            data-testid="button-admin-panel"
          >
            <Shield className="h-5 w-5 mr-2" />
            Admin Panel
          </Button>
        )}
      </div>

      {/* Mobile Bottom Navigation - Only visible on mobile */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border z-20 safe-area-inset-bottom">
        <div className="grid grid-cols-6 gap-1 p-2">
          <Button
            disabled
            variant="ghost"
            className="flex flex-col items-center justify-center gap-1 h-16 text-xs font-medium opacity-40 cursor-not-allowed"
            data-testid="button-play-mobile"
          >
            <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-xs">▶</span>
            </div>
            <span>Play</span>
          </Button>
          <Button
            disabled
            variant="ghost"
            className="flex flex-col items-center justify-center gap-1 h-16 text-xs font-medium opacity-40 cursor-not-allowed"
            data-testid="button-shop-mobile"
          >
            <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-xs">🛒</span>
            </div>
            <span>Shop</span>
          </Button>
          <Button
            disabled
            variant="ghost"
            className="flex flex-col items-center justify-center gap-1 h-16 text-xs font-medium opacity-40 cursor-not-allowed"
            data-testid="button-inventory-mobile"
          >
            <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-xs">📦</span>
            </div>
            <span>Items</span>
          </Button>
          <Button
            disabled
            variant="ghost"
            className="flex flex-col items-center justify-center gap-1 h-16 text-xs font-medium opacity-40 cursor-not-allowed"
            data-testid="button-pass-mobile"
          >
            <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-xs">⭐</span>
            </div>
            <span>Pass</span>
          </Button>
          <Button
            onClick={() => setProfileModalOpen(true)}
            variant="ghost"
            className="flex flex-col items-center justify-center gap-1 h-16 text-xs font-medium touch-manipulation hover:bg-primary/10"
            data-testid="button-profile-mobile"
          >
            <div className="h-6 w-6 rounded-full bg-primary/30 flex items-center justify-center">
              <span className="text-xs">👤</span>
            </div>
            <span>Profile</span>
          </Button>
          <Button
            onClick={() => setSettingsModalOpen(true)}
            variant="ghost"
            className="flex flex-col items-center justify-center gap-1 h-16 text-xs font-medium touch-manipulation hover:bg-primary/10"
            data-testid="button-settings-mobile"
          >
            <div className="h-6 w-6 rounded-full bg-primary/30 flex items-center justify-center">
              <span className="text-xs">⚙️</span>
            </div>
            <span>Settings</span>
          </Button>
        </div>
      </div>

      {/* Modals and Sidebars */}
      <FriendsSidebar
        isOpen={friendsSidebarOpen}
        onClose={() => setFriendsSidebarOpen(false)}
        onInviteToParty={handleInviteToParty}
        onAddFriend={handleAddFriend}
        onRemoveFriend={handleRemoveFriend}
        onAcceptFriendRequest={handleAcceptFriendRequest}
        onDeclineFriendRequest={handleDeclineFriendRequest}
      />

      <ProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
      />

      <SettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
      />

      <AdminPanelDialog
        open={adminPanelOpen}
        onOpenChange={setAdminPanelOpen}
      />

      {/* Party Chat - Only show when in a party */}
      {currentParty && (
        <PartyChatBox partyId={currentParty.id} />
      )}
    </div>
  );
}
