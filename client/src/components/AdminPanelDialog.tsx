import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { collection, query, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { partyService } from '@/lib/firebaseService';
import { User } from '@shared/schema';
import { Users, Crown, Shield, DoorOpen, UserX } from 'lucide-react';

interface PartyWithMembers {
  id: string;
  leaderId: string;
  memberIds: string[];
  members: User[];
}

interface AdminPanelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AdminPanelDialog({ open, onOpenChange }: AdminPanelDialogProps) {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [parties, setParties] = useState<PartyWithMembers[]>([]);

  // Listen to all parties
  useEffect(() => {
    if (!open || !currentUser?.isAdmin) return;

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
  }, [open, currentUser]);

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

  if (!currentUser?.isAdmin) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-red-500" />
            Admin Panel
          </DialogTitle>
          <DialogDescription>
            Manage parties and banned users
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
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

          {/* Banned Users Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserX className="h-5 w-5" />
                Banned Users (0)
              </CardTitle>
              <CardDescription>Manage banned users</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center py-8">No banned users</p>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
