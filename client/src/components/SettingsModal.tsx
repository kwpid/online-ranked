import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { currentUser, updateUserProfile } = useAuth();
  const { toast } = useToast();
  const [newUsername, setNewUsername] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const canChangeUsername = () => {
    if (!currentUser?.lastUsernameChange) return true;
    const timeSinceLastChange = Date.now() - currentUser.lastUsernameChange;
    return timeSinceLastChange >= ONE_WEEK_MS;
  };

  const getDaysUntilUsernameChange = () => {
    if (!currentUser?.lastUsernameChange) return 0;
    const timeSinceLastChange = Date.now() - currentUser.lastUsernameChange;
    const timeRemaining = ONE_WEEK_MS - timeSinceLastChange;
    return Math.ceil(timeRemaining / (24 * 60 * 60 * 1000));
  };

  const handleUsernameChange = async () => {
    if (!currentUser) return;
    
    if (!canChangeUsername()) {
      toast({
        title: 'Cannot Change Username',
        description: `You can change your username again in ${getDaysUntilUsernameChange()} days`,
        variant: 'destructive',
      });
      return;
    }

    const username = newUsername.trim().toLowerCase();
    
    if (username.length < 3 || username.length > 20) {
      toast({
        title: 'Invalid Username',
        description: 'Username must be between 3 and 20 characters',
        variant: 'destructive',
      });
      return;
    }

    if (!/^[a-z0-9]+$/.test(username)) {
      toast({
        title: 'Invalid Username',
        description: 'Username can only contain letters and numbers',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      // Check if username already exists
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('username', '==', username));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty && querySnapshot.docs[0].id !== currentUser.id) {
        toast({
          title: 'Username Taken',
          description: 'This username is already in use',
          variant: 'destructive',
        });
        setIsSaving(false);
        return;
      }

      // Update username
      const userRef = doc(db, 'users', currentUser.id);
      await updateDoc(userRef, {
        username,
        lastUsernameChange: Date.now(),
      });

      await updateUserProfile({
        username,
        lastUsernameChange: Date.now(),
      });

      toast({
        title: 'Username Updated',
        description: 'Your username has been changed successfully',
      });

      setNewUsername('');
      onClose();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update username',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl bg-card text-card-foreground border-border">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-foreground">Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Current Username */}
          <div className="space-y-2">
            <Label className="text-foreground font-medium">Current Username</Label>
            <div className="p-3 bg-secondary/50 rounded-lg border border-border">
              <p className="text-foreground font-mono">{currentUser?.username}</p>
            </div>
          </div>

          {/* Change Username */}
          <div className="space-y-2">
            <Label htmlFor="newUsername" className="text-foreground font-medium">
              New Username
            </Label>
            <Input
              id="newUsername"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder="Enter new username"
              className="bg-background border-2 focus:ring-primary"
              disabled={!canChangeUsername()}
              data-testid="input-new-username"
            />
            {!canChangeUsername() ? (
              <p className="text-sm text-chart-3 font-medium">
                ⚠️ You can change your username again in {getDaysUntilUsernameChange()} days
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                You can change your username once per week
              </p>
            )}
          </div>

          {/* Friend Settings - Coming Soon */}
          <div className="space-y-2 opacity-50">
            <Label className="text-foreground font-medium">Friend Settings</Label>
            <div className="p-3 bg-secondary/20 rounded-lg border border-border">
              <p className="text-sm text-muted-foreground">Coming Soon</p>
            </div>
          </div>

          {/* Party Settings - Coming Soon */}
          <div className="space-y-2 opacity-50">
            <Label className="text-foreground font-medium">Party Settings</Label>
            <div className="p-3 bg-secondary/20 rounded-lg border border-border">
              <p className="text-sm text-muted-foreground">Coming Soon</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSaving}
            data-testid="button-cancel-settings"
          >
            Close
          </Button>
          <Button
            onClick={handleUsernameChange}
            disabled={isSaving || !canChangeUsername() || !newUsername.trim()}
            data-testid="button-save-username"
          >
            {isSaving ? 'Saving...' : 'Change Username'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
