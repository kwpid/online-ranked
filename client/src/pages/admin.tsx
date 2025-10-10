import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { collection, query, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { partyService } from '@/lib/firebaseService';
import { User } from '@shared/schema';
import { Users, Crown, Shield, DoorOpen } from 'lucide-react';
import { Redirect } from 'wouter';

interface PartyWithMembers {
  id: string;
  leaderId: string;
  memberIds: string[];
  members: User[];
}

export default function AdminPanel() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [parties, setParties] = useState<PartyWithMembers[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);

  // Redirect if not admin
  if (!currentUser?.isAdmin) {
    return <Redirect to="/" />;
  }

  // Listen to all parties
  useEffect(() => {
    const partiesQuery = query(collection(db, 'parties'));
    
    const unsubscribe = onSnapshot(partiesQuery, async (snapshot) => {
      const partiesData = await Promise.all(
        snapshot.docs.map(async (partyDoc) => {
          const party = partyDoc.data();
          
          // Fetch member details
          const members = await Promise.all(
            party.memberIds.map(async (memberId: string) => {
              const userDoc = await getDoc(doc(db, 'users', memberId));
              return { ...userDoc.data(), id: userDoc.id } as User;
            })
          );

          return {
            id: partyDoc.id,
            leaderId: party.leaderId,
            memberIds: party.memberIds,
            members
          };
        })
      );
      
      setParties(partiesData);
    });

    return unsubscribe;
  }, []);

  // Listen to all users
  useEffect(() => {
    const usersQuery = query(collection(db, 'users'));
    
    const unsubscribe = onSnapshot(usersQuery, (snapshot) => {
      const users = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as User));
      setAllUsers(users);
    });

    return unsubscribe;
  }, []);

  const handleAdminJoinParty = async (partyId: string) => {
    if (!currentUser) return;
    
    try {
      await partyService.adminJoin(partyId, currentUser.id, currentUser.displayName);
      toast({
        title: 'Success',
        description: 'Joined party as admin',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to join party',
        variant: 'destructive',
      });
    }
  };

  const handleAdminHijackParty = async (partyId: string) => {
    if (!currentUser) return;
    
    try {
      // First join if not already in party
      const party = parties.find(p => p.id === partyId);
      if (party && !party.memberIds.includes(currentUser.id)) {
        await partyService.adminJoin(partyId, currentUser.id, currentUser.displayName);
      }
      
      // Then promote self to leader
      await partyService.adminPromoteSelf(partyId, currentUser.id, currentUser.displayName);
      toast({
        title: 'Success',
        description: 'Hijacked party as admin',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to hijack party',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-red-500" />
          <div>
            <h1 className="text-3xl font-bold text-foreground">Admin Panel</h1>
            <p className="text-muted-foreground">Manage parties and users</p>
          </div>
        </div>

        {/* Parties Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Active Parties ({parties.length})
            </CardTitle>
            <CardDescription>View and manage all active parties</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {parties.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No active parties</p>
            ) : (
              parties.map(party => {
                const leader = party.members.find(m => m.id === party.leaderId);
                const isInParty = party.memberIds.includes(currentUser?.id || '');
                const isLeader = party.leaderId === currentUser?.id;

                return (
                  <div
                    key={party.id}
                    className="p-4 border border-border rounded-lg space-y-3"
                    data-testid={`admin-party-${party.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Crown className="h-5 w-5 text-chart-3" />
                        <div>
                          <p className="font-semibold text-foreground">
                            {leader?.displayName || 'Unknown'}'s Party
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {party.members.length} member{party.members.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {!isInParty && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAdminJoinParty(party.id)}
                            data-testid={`button-admin-join-${party.id}`}
                          >
                            <DoorOpen className="h-4 w-4 mr-2" />
                            Join Party
                          </Button>
                        )}
                        {!isLeader && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleAdminHijackParty(party.id)}
                            data-testid={`button-admin-hijack-${party.id}`}
                          >
                            <Shield className="h-4 w-4 mr-2" />
                            Hijack Party
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {party.members.map(member => (
                        <div
                          key={member.id}
                          className="px-3 py-1 bg-secondary rounded-full text-sm flex items-center gap-2"
                        >
                          <span>{member.displayName}</span>
                          {member.id === party.leaderId && (
                            <Crown className="h-3 w-3 text-chart-3" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Users Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              All Users ({allUsers.length})
            </CardTitle>
            <CardDescription>View all registered users</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {allUsers.map(user => (
                <div
                  key={user.id}
                  className="p-3 border border-border rounded-lg flex items-center gap-3"
                  data-testid={`admin-user-${user.id}`}
                >
                  <div className={`w-2 h-2 rounded-full ${
                    user.status === 'online' ? 'bg-status-online' : 'bg-status-offline'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate flex items-center gap-2">
                      {user.displayName}
                      {user.isAdmin && (
                        <span className="text-xs px-1.5 py-0.5 bg-red-500/20 text-red-500 border border-red-500/50 rounded">
                          ADMIN
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
