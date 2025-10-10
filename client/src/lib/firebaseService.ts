// Firebase service layer for all Firestore operations
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc,
  getDocs,
  query, 
  where,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { db } from './firebase';

// Party Operations
export const partyService = {
  async create(userId: string) {
    return await addDoc(collection(db, 'parties'), {
      leaderId: userId,
      memberIds: [userId],
      createdAt: Date.now(),
    });
  },

  async join(partyId: string, userId: string) {
    const partyRef = doc(db, 'parties', partyId);
    await updateDoc(partyRef, {
      memberIds: arrayUnion(userId),
    });
  },

  async leave(partyId: string, userId: string) {
    const partyRef = doc(db, 'parties', partyId);
    const partySnap = await getDoc(partyRef);
    
    if (!partySnap.exists()) return;
    
    const party = partySnap.data();
    const newMemberIds = party.memberIds.filter((id: string) => id !== userId);
    
    // If no members left, delete party
    if (newMemberIds.length === 0) {
      await deleteDoc(partyRef);
      return;
    }
    
    // If leader left, promote first member
    let updates: any = { memberIds: newMemberIds };
    if (party.leaderId === userId) {
      updates.leaderId = newMemberIds[0];
    }
    
    await updateDoc(partyRef, updates);
  },

  async kick(partyId: string, userId: string, kickedBy: string) {
    const partyRef = doc(db, 'parties', partyId);
    const partySnap = await getDoc(partyRef);
    
    if (!partySnap.exists()) return;
    
    const party = partySnap.data();
    
    // Only leader can kick
    if (party.leaderId !== kickedBy) {
      throw new Error('Only party leader can kick members');
    }
    
    await updateDoc(partyRef, {
      memberIds: arrayRemove(userId),
    });
    
    // Send notification to kicked user
    await addDoc(collection(db, 'notifications'), {
      userId,
      type: 'party_kick',
      fromUserId: kickedBy,
      fromUserDisplayName: null,
      fromUserPhotoURL: null,
      partyId,
      message: 'You have been removed from the party',
      read: false,
      createdAt: Date.now(),
    });
  },

  async promote(partyId: string, newLeaderId: string, currentLeaderId: string) {
    const partyRef = doc(db, 'parties', partyId);
    const partySnap = await getDoc(partyRef);
    
    if (!partySnap.exists()) return;
    
    const party = partySnap.data();
    
    // Only current leader can promote
    if (party.leaderId !== currentLeaderId) {
      throw new Error('Only party leader can promote members');
    }
    
    await updateDoc(partyRef, {
      leaderId: newLeaderId,
    });
  },
};

// Friend Operations
export const friendService = {
  async sendRequest(fromUserId: string, toUsername: string) {
    // Find user by username
    const usersQuery = query(
      collection(db, 'users'),
      where('username', '==', toUsername.toLowerCase())
    );
    const userSnap = await getDocs(usersQuery);

    if (userSnap.empty) {
      throw new Error('User not found');
    }

    const targetUser = { ...userSnap.docs[0].data(), id: userSnap.docs[0].id };

    if (targetUser.id === fromUserId) {
      throw new Error('Cannot add yourself');
    }

    // Check if already friends
    const friendshipsQuery = query(
      collection(db, 'friendships'),
      where('userId', '==', fromUserId),
      where('friendId', '==', targetUser.id)
    );
    const friendshipSnap = await getDocs(friendshipsQuery);

    if (!friendshipSnap.empty) {
      throw new Error('Already friends');
    }

    // Check if request already sent
    const requestsQuery = query(
      collection(db, 'friendRequests'),
      where('fromUserId', '==', fromUserId),
      where('toUserId', '==', targetUser.id),
      where('status', '==', 'pending')
    );
    const requestSnap = await getDocs(requestsQuery);

    if (!requestSnap.empty) {
      throw new Error('Request already sent');
    }

    // Create friend request
    await addDoc(collection(db, 'friendRequests'), {
      fromUserId,
      toUserId: targetUser.id,
      status: 'pending',
      createdAt: Date.now(),
    });

    return targetUser;
  },

  async acceptRequest(requestId: string, currentUserId: string) {
    const requestRef = doc(db, 'friendRequests', requestId);
    const requestSnap = await getDoc(requestRef);
    
    if (!requestSnap.exists()) {
      throw new Error('Request not found');
    }

    const request = { ...requestSnap.data(), id: requestSnap.id } as { id: string; fromUserId: string; toUserId: string; status: string; createdAt: number; };

    // Create bidirectional friendships
    await addDoc(collection(db, 'friendships'), {
      userId: currentUserId,
      friendId: request.fromUserId,
      createdAt: Date.now(),
    });

    await addDoc(collection(db, 'friendships'), {
      userId: request.fromUserId,
      friendId: currentUserId,
      createdAt: Date.now(),
    });

    // Update request status
    await updateDoc(requestRef, { status: 'accepted' });

    return request.fromUserId;
  },

  async declineRequest(requestId: string) {
    const requestRef = doc(db, 'friendRequests', requestId);
    await updateDoc(requestRef, { status: 'declined' });
  },

  async remove(userId: string, friendId: string) {
    // Remove both friendships
    const friendship1Query = query(
      collection(db, 'friendships'),
      where('userId', '==', userId),
      where('friendId', '==', friendId)
    );
    const friendship1Snap = await getDocs(friendship1Query);
    friendship1Snap.forEach(doc => deleteDoc(doc.ref));

    const friendship2Query = query(
      collection(db, 'friendships'),
      where('userId', '==', friendId),
      where('friendId', '==', userId)
    );
    const friendship2Snap = await getDocs(friendship2Query);
    friendship2Snap.forEach(doc => deleteDoc(doc.ref));
  },
};

// Notification Operations
export const notificationService = {
  async create(notification: {
    userId: string;
    type: string;
    fromUserId: string | null;
    fromUserDisplayName: string | null;
    fromUserPhotoURL: string | null;
    partyId: string | null;
    message: string;
  }) {
    await addDoc(collection(db, 'notifications'), {
      ...notification,
      read: false,
      createdAt: Date.now(),
    });
  },

  async markAsRead(notificationId: string) {
    const notifRef = doc(db, 'notifications', notificationId);
    await updateDoc(notifRef, { read: true });
  },

  async acceptPartyInvite(notificationId: string, userId: string) {
    const notifRef = doc(db, 'notifications', notificationId);
    const notifSnap = await getDoc(notifRef);
    
    if (!notifSnap.exists()) {
      throw new Error('Notification not found');
    }

    const notification = notifSnap.data();
    
    if (!notification.partyId) {
      throw new Error('Invalid party invitation');
    }

    // Check if party still exists
    const partyRef = doc(db, 'parties', notification.partyId);
    const partySnap = await getDoc(partyRef);
    
    if (!partySnap.exists()) {
      throw new Error('Party no longer exists');
    }

    // Check if user is already in a party
    const userPartiesQuery = query(
      collection(db, 'parties'),
      where('memberIds', 'array-contains', userId)
    );
    const userPartySnap = await getDocs(userPartiesQuery);
    
    if (!userPartySnap.empty) {
      throw new Error('Already in a party');
    }

    // Join the party
    await partyService.join(notification.partyId, userId);
    
    // Mark notification as read
    await updateDoc(notifRef, { read: true });

    return notification.partyId;
  },
};
