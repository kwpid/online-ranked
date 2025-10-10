import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { PartyMemberCard } from '@/components/PartyMemberCard';
import { FriendsSidebar } from '@/components/FriendsSidebar';
import { ProfileModal } from '@/components/ProfileModal';
import { SettingsModal } from '@/components/SettingsModal';
import { useToast } from '@/hooks/use-toast';
import { partyService } from '@/lib/firebaseService';
import { 
  Users, 
  LogOut,
  UserMinus,
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
import { User, Party } from '@shared/schema';

export default function HomePage() {
  const { currentUser, signOut } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [friendsSidebarOpen, setFriendsSidebarOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  
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

    const unsubNotifs = onSnapshot(notificationsQuery, (snapshot) => {
      const notifCount = snapshot.size;
      
      onSnapshot(friendRequestsQuery, (reqSnapshot) => {
        setUnreadNotifications(notifCount + reqSnapshot.size);
      });
    });

    return unsubNotifs;
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
      // Check if friend is already in a party
      const friendPartiesQuery = query(
        collection(db, 'parties'),
        where('memberIds', 'array-contains', friendId)
      );
      const friendPartySnap = await getDocs(friendPartiesQuery);
      
      if (!friendPartySnap.empty) {
        toast({
          title: 'Cannot Invite',
          description: 'This friend is already in a party',
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
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send party invitation',
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

      const request = { ...requestSnap.data(), id: requestSnap.id };

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
      await partyService.leave(currentParty.id, currentUser.id);
      
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
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-radial from-primary/5 via-background to-background"></div>

      {/* Top-right: Friends icon */}
      <div className="absolute top-6 right-6 z-30">
        <Button
          size="icon"
          variant="outline"
          className="relative h-12 w-12 border-2"
          onClick={() => setFriendsSidebarOpen(true)}
          data-testid="button-open-friends"
        >
          <Users className="h-6 w-6" />
          {unreadNotifications > 0 && (
            <span className="absolute -top-1 -right-1 bg-chart-3 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
              {unreadNotifications}
            </span>
          )}
        </Button>
      </div>

      {/* Top-left: Sign out */}
      <div className="absolute top-6 left-6 z-30">
        <Button
          size="icon"
          variant="outline"
          className="h-12 w-12 border-2"
          onClick={handleSignOut}
          data-testid="button-signout"
        >
          <LogOut className="h-5 w-5" />
        </Button>
      </div>

      {/* Center: Player cards */}
      <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-8">
            {partyMembers.length > 0 ? (
              partyMembers.map(member => (
                <div key={member.id} className="pointer-events-auto">
                  <PartyMemberCard
                    user={member}
                    isLocalPlayer={member.id === currentUser.id}
                    isPartyLeader={member.id === currentParty?.leaderId}
                    canManage={isPartyLeader}
                    scale={member.id === currentUser.id ? 1.2 : 1}
                    onKick={handleKickMember}
                    onPromote={handlePromoteMember}
                  />
                </div>
              ))
            ) : (
              <div className="pointer-events-auto">
                <PartyMemberCard
                  user={currentUser}
                  isLocalPlayer={true}
                  scale={1.2}
                />
              </div>
            )}
          </div>
          
          {/* Leave Party Button */}
          {currentParty && (
            <div className="pointer-events-auto">
              <Button
                variant="destructive"
                size="sm"
                onClick={handleLeaveParty}
                data-testid="button-leave-party"
              >
                <UserMinus className="h-4 w-4 mr-2" />
                Leave Party
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Bottom-left: Navigation buttons */}
      <div className="absolute bottom-8 left-8 flex flex-col gap-3 z-20">
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
    </div>
  );
}
