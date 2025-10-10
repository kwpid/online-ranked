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

// Helper function to send party system messages
async function sendPartySystemMessage(
  partyId: string, 
  displayName: string, 
  messageType: 'join' | 'leave' | 'promote' | 'kick'
) {
  let message = '';
  switch (messageType) {
    case 'join':
      message = `${displayName} joined the party`;
      break;
    case 'leave':
      message = `${displayName} left the party`;
      break;
    case 'promote':
      message = `${displayName} was promoted to party leader`;
      break;
    case 'kick':
      message = `${displayName} was removed from the party`;
      break;
  }
  
  await addDoc(collection(db, 'partyMessages'), {
    partyId,
    userId: null,
    displayName: 'System',
    message,
    isSystemMessage: true,
    systemMessageType: messageType,
    createdAt: Date.now(),
  });
}

// Party Operations
export const partyService = {
  async create(userId: string) {
    return await addDoc(collection(db, 'parties'), {
      leaderId: userId,
      memberIds: [userId],
      createdAt: Date.now(),
    });
  },

  async join(partyId: string, userId: string, userDisplayName: string) {
    const partyRef = doc(db, 'parties', partyId);
    await updateDoc(partyRef, {
      memberIds: arrayUnion(userId),
    });
    
    // Send system message
    await sendPartySystemMessage(partyId, userDisplayName, 'join');
  },

  async leave(partyId: string, userId: string, userDisplayName: string) {
    const partyRef = doc(db, 'parties', partyId);
    const partySnap = await getDoc(partyRef);
    
    if (!partySnap.exists()) return;
    
    const party = partySnap.data();
    const newMemberIds = party.memberIds.filter((id: string) => id !== userId);
    
    // Send leave system message before any cleanup
    await sendPartySystemMessage(partyId, userDisplayName, 'leave');
    
    // If no members left, delete party and cleanup messages
    if (newMemberIds.length === 0) {
      await deleteDoc(partyRef);
      
      // Cleanup party messages
      const { cleanupService } = await import('./firebaseService');
      await cleanupService.deletePartyMessages(partyId);
      return;
    }
    
    // If leader left, promote first member
    let updates: any = { memberIds: newMemberIds };
    let wasLeader = false;
    if (party.leaderId === userId) {
      updates.leaderId = newMemberIds[0];
      wasLeader = true;
    }
    
    await updateDoc(partyRef, updates);
    
    // Send promotion system message if leader left
    if (wasLeader) {
      // Get the new leader's display name
      const newLeaderRef = doc(db, 'users', newMemberIds[0]);
      const newLeaderSnap = await getDoc(newLeaderRef);
      if (newLeaderSnap.exists()) {
        const newLeaderData = newLeaderSnap.data();
        await sendPartySystemMessage(partyId, newLeaderData.displayName, 'promote');
      }
    }
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
    
    // Get kicked user's display name for system message
    const kickedUserRef = doc(db, 'users', userId);
    const kickedUserSnap = await getDoc(kickedUserRef);
    const kickedUserDisplayName = kickedUserSnap.exists() ? kickedUserSnap.data().displayName : 'Unknown';
    
    await updateDoc(partyRef, {
      memberIds: arrayRemove(userId),
    });
    
    // Send system message
    await sendPartySystemMessage(partyId, kickedUserDisplayName, 'kick');
    
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
    
    // Get new leader's display name for system message
    const newLeaderRef = doc(db, 'users', newLeaderId);
    const newLeaderSnap = await getDoc(newLeaderRef);
    const newLeaderDisplayName = newLeaderSnap.exists() ? newLeaderSnap.data().displayName : 'Unknown';
    
    await updateDoc(partyRef, {
      leaderId: newLeaderId,
    });
    
    // Send system message
    await sendPartySystemMessage(partyId, newLeaderDisplayName, 'promote');
  },

  async requestToJoin(partyId: string, userId: string, userDisplayName: string, userPhotoURL: string | null) {
    // Get party to find the leader
    const partyRef = doc(db, 'parties', partyId);
    const partySnap = await getDoc(partyRef);
    
    if (!partySnap.exists()) {
      throw new Error('Party no longer exists');
    }
    
    const party = partySnap.data();
    
    // Check if user is already in the party
    if (party.memberIds.includes(userId)) {
      throw new Error('Already in this party');
    }
    
    // Send notification to party leader
    await addDoc(collection(db, 'notifications'), {
      userId: party.leaderId,
      type: 'party_join_request',
      fromUserId: userId,
      fromUserDisplayName: userDisplayName,
      fromUserPhotoURL: userPhotoURL,
      partyId,
      message: `${userDisplayName} wants to join your party`,
      read: false,
      createdAt: Date.now(),
    });
  },

  async adminJoin(partyId: string, userId: string, userDisplayName: string) {
    // Admin can join any party without invitation
    const partyRef = doc(db, 'parties', partyId);
    await updateDoc(partyRef, {
      memberIds: arrayUnion(userId),
    });
    
    // Send system message
    await sendPartySystemMessage(partyId, `${userDisplayName} (Admin)`, 'join');
  },

  async adminPromoteSelf(partyId: string, userId: string, userDisplayName: string) {
    // Admin can promote themselves to leader
    const partyRef = doc(db, 'parties', partyId);
    await updateDoc(partyRef, {
      leaderId: userId,
    });
    
    // Send system message
    await sendPartySystemMessage(partyId, `${userDisplayName} (Admin)`, 'promote');
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

    // Get user's display name
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    const userDisplayName = userSnap.exists() ? userSnap.data().displayName : 'Unknown';
    
    // Join the party
    await partyService.join(notification.partyId, userId, userDisplayName);
    
    // Mark notification as read
    await updateDoc(notifRef, { read: true });

    return notification.partyId;
  },

  async acceptPartyJoinRequest(notificationId: string, requesterId: string) {
    const notifRef = doc(db, 'notifications', notificationId);
    const notifSnap = await getDoc(notifRef);
    
    if (!notifSnap.exists()) {
      throw new Error('Notification not found');
    }

    const notification = notifSnap.data();
    
    if (!notification.partyId || !notification.fromUserId) {
      throw new Error('Invalid party join request');
    }

    // Check if party still exists
    const partyRef = doc(db, 'parties', notification.partyId);
    const partySnap = await getDoc(partyRef);
    
    if (!partySnap.exists()) {
      throw new Error('Party no longer exists');
    }

    // Check if requester is already in a party
    const requesterPartiesQuery = query(
      collection(db, 'parties'),
      where('memberIds', 'array-contains', notification.fromUserId)
    );
    const requesterPartySnap = await getDocs(requesterPartiesQuery);
    
    if (!requesterPartySnap.empty) {
      throw new Error('User is already in a party');
    }

    // Get requester's display name
    const requesterRef = doc(db, 'users', notification.fromUserId);
    const requesterSnap = await getDoc(requesterRef);
    const requesterDisplayName = requesterSnap.exists() ? requesterSnap.data().displayName : 'Unknown';
    
    // Add requester to the party
    await partyService.join(notification.partyId, notification.fromUserId, requesterDisplayName);
    
    // Mark notification as read
    await updateDoc(notifRef, { read: true });

    return notification.partyId;
  },

  async declinePartyJoinRequest(notificationId: string) {
    const notifRef = doc(db, 'notifications', notificationId);
    await updateDoc(notifRef, { read: true });
  },

  async sendPartyJoinRequest(friendId: string, currentUserId: string, currentUserDisplayName: string, currentUserPhotoURL: string | null) {
    // Find the party the friend is in
    const partiesQuery = query(
      collection(db, 'parties'),
      where('memberIds', 'array-contains', friendId)
    );
    const partySnap = await getDocs(partiesQuery);
    
    if (partySnap.empty) {
      throw new Error('Friend is not in a party');
    }

    const party = partySnap.docs[0];
    const partyData = party.data();
    const partyId = party.id;
    const leaderId = partyData.leaderId;

    // Send notification to party leader
    await this.create({
      userId: leaderId,
      type: 'party_join_request',
      fromUserId: currentUserId,
      fromUserDisplayName: currentUserDisplayName,
      fromUserPhotoURL: currentUserPhotoURL,
      partyId: partyId,
      message: `${currentUserDisplayName} wants to join your party`,
    });
  },

  // Cleanup old read notifications (older than 7 days)
  async cleanupOldNotifications(userId: string) {
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      where('read', '==', true),
      where('createdAt', '<', sevenDaysAgo)
    );
    
    const snapshot = await getDocs(notificationsQuery);
    snapshot.forEach(doc => deleteDoc(doc.ref));
  },
};

// Cleanup Operations
export const cleanupService = {
  // Delete party messages when party is deleted
  async deletePartyMessages(partyId: string) {
    const messagesQuery = query(
      collection(db, 'partyMessages'),
      where('partyId', '==', partyId)
    );
    const snapshot = await getDocs(messagesQuery);
    snapshot.forEach(doc => deleteDoc(doc.ref));
  },

  // Cleanup old accepted/declined friend requests (older than 7 days)
  async cleanupOldFriendRequests(userId: string) {
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    
    // Clean sent requests
    const sentQuery = query(
      collection(db, 'friendRequests'),
      where('fromUserId', '==', userId),
      where('createdAt', '<', sevenDaysAgo)
    );
    const sentSnapshot = await getDocs(sentQuery);
    sentSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.status !== 'pending') {
        deleteDoc(doc.ref);
      }
    });

    // Clean received requests
    const receivedQuery = query(
      collection(db, 'friendRequests'),
      where('toUserId', '==', userId),
      where('createdAt', '<', sevenDaysAgo)
    );
    const receivedSnapshot = await getDocs(receivedQuery);
    receivedSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.status !== 'pending') {
        deleteDoc(doc.ref);
      }
    });
  },
};
