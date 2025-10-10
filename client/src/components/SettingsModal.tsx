import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  
  // Settings state
  const [allowFriendRequests, setAllowFriendRequests] = useState(true);
  const [allowPartyInvites, setAllowPartyInvites] = useState(true);
  const [appearanceStatus, setAppearanceStatus] = useState<'online' | 'offline' | 'dnd'>('online');

  // Load user settings when modal opens
  useEffect(() => {
    if (currentUser?.settings) {
      setAllowFriendRequests(currentUser.settings.allowFriendRequests ?? true);
      setAllowPartyInvites(currentUser.settings.allowPartyInvites ?? true);
      setAppearanceStatus(currentUser.settings.appearanceStatus ?? 'online');
    }
  }, [currentUser]);

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

  const handleSettingChange = async (setting: string, value: any) => {
    if (!currentUser) return;
    
    try {
      const userRef = doc(db, 'users', currentUser.id);
      const updateData: any = {
        [`settings.${setting}`]: value
      };
      
      await updateDoc(userRef, updateData);
      
      // Update local state
      const newSettings = {
        ...currentUser.settings,
        [setting]: value
      };
      
      await updateUserProfile({ settings: newSettings });
      
      toast({
        title: 'Settings Updated',
        description: 'Your preferences have been saved',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update settings',
        variant: 'destructive',
      });
    }
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
      <DialogContent className="w-[95vw] max-w-2xl bg-card text-card-foreground border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl md:text-2xl font-bold text-foreground">Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 md:space-y-6 py-2 md:py-4">
          {/* Current Username */}
          <div className="space-y-2">
            <Label className="text-foreground font-medium">Current Username</Label>
            <div className="p-3 bg-secondary/50 rounded-lg border border-border">
              <p className="text-foreground font-mono">{currentUser?.username}</p>
            </div>
          </div>

          {/* Change Username */}
          <div className="space-y-2">
            <Label htmlFor="newUsername" className="text-sm md:text-base text-foreground font-medium">
              New Username
            </Label>
            <Input
              id="newUsername"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder="Enter new username"
              className="bg-background border-2 focus:ring-primary text-base touch-manipulation h-12"
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

          {/* Privacy Settings */}
          <div className="space-y-4">
            <Label className="text-foreground font-medium text-lg">Privacy Settings</Label>
            
            {/* Allow Friend Requests */}
            <div className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg border border-border">
              <div className="space-y-0.5">
                <Label className="text-foreground">Allow Friend Requests</Label>
                <p className="text-sm text-muted-foreground">Let others send you friend requests</p>
              </div>
              <Switch
                checked={allowFriendRequests}
                onCheckedChange={(checked) => {
                  setAllowFriendRequests(checked);
                  handleSettingChange('allowFriendRequests', checked);
                }}
                data-testid="switch-allow-friend-requests"
              />
            </div>

            {/* Allow Party Invites */}
            <div className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg border border-border">
              <div className="space-y-0.5">
                <Label className="text-foreground">Allow Party Invites</Label>
                <p className="text-sm text-muted-foreground">Let others invite you to parties</p>
              </div>
              <Switch
                checked={allowPartyInvites}
                onCheckedChange={(checked) => {
                  setAllowPartyInvites(checked);
                  handleSettingChange('allowPartyInvites', checked);
                }}
                data-testid="switch-allow-party-invites"
              />
            </div>

            {/* Appearance Status */}
            <div className="space-y-2 p-3 bg-secondary/20 rounded-lg border border-border">
              <Label className="text-foreground">Appearance Status</Label>
              <p className="text-sm text-muted-foreground mb-2">Choose how you appear to others</p>
              <Select
                value={appearanceStatus}
                onValueChange={(value: 'online' | 'offline' | 'dnd') => {
                  setAppearanceStatus(value);
                  handleSettingChange('appearanceStatus', value);
                }}
              >
                <SelectTrigger className="w-full bg-background" data-testid="select-appearance-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="online">Online - Appear as online to everyone</SelectItem>
                  <SelectItem value="offline">Offline - Appear as offline to everyone</SelectItem>
                  <SelectItem value="dnd">Do Not Disturb - Appear as busy</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-4 border-t border-border">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSaving}
            className="touch-manipulation h-11"
            data-testid="button-cancel-settings"
          >
            Close
          </Button>
          <Button
            onClick={handleUsernameChange}
            disabled={isSaving || !canChangeUsername() || !newUsername.trim()}
            className="touch-manipulation h-11"
            data-testid="button-save-username"
          >
            {isSaving ? 'Saving...' : 'Change Username'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
