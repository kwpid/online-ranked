import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const { currentUser, updateUserProfile } = useAuth();
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
  const [photoURL, setPhotoURL] = useState(currentUser?.photoURL || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!currentUser) return;
    
    if (displayName.trim().length < 1 || displayName.trim().length > 30) {
      toast({
        title: 'Invalid Display Name',
        description: 'Display name must be between 1 and 30 characters',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      await updateUserProfile({
        displayName: displayName.trim(),
        photoURL: photoURL.trim() || null,
      });
      
      toast({
        title: 'Profile Updated',
        description: 'Your profile has been updated successfully',
      });
      
      onClose();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update profile',
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
          <DialogTitle className="text-2xl font-bold text-foreground">Edit Profile</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Avatar Preview */}
          <div className="flex flex-col items-center gap-4">
            <Avatar className="h-32 w-32 border-4 border-primary/30">
              <AvatarImage src={photoURL || currentUser?.photoURL || undefined} />
              <AvatarFallback className="bg-primary/20 text-primary text-4xl">
                {displayName.slice(0, 2).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <p className="text-sm text-muted-foreground">
              Preview of your profile picture
            </p>
          </div>

          {/* Display Name */}
          <div className="space-y-2">
            <Label htmlFor="displayName" className="text-foreground font-medium">
              Display Name
            </Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="bg-background border-2 focus:ring-primary"
              maxLength={30}
              data-testid="input-display-name"
            />
            <p className="text-xs text-muted-foreground">
              {displayName.length}/30 characters
            </p>
          </div>

          {/* Photo URL */}
          <div className="space-y-2">
            <Label htmlFor="photoURL" className="text-foreground font-medium">
              Profile Picture URL (Optional)
            </Label>
            <Input
              id="photoURL"
              value={photoURL}
              onChange={(e) => setPhotoURL(e.target.value)}
              placeholder="https://example.com/photo.jpg"
              className="bg-background border-2 focus:ring-primary"
              data-testid="input-photo-url"
            />
            <p className="text-xs text-muted-foreground">
              Enter a custom profile picture URL or leave blank to use your Google photo
            </p>
          </div>

          {/* Title - Coming Soon */}
          <div className="space-y-2 opacity-50">
            <Label className="text-foreground font-medium">
              Title
            </Label>
            <Input
              disabled
              placeholder="Coming Soon"
              className="bg-background"
            />
          </div>

          {/* Banner - Coming Soon */}
          <div className="space-y-2 opacity-50">
            <Label className="text-foreground font-medium">
              Banner
            </Label>
            <Input
              disabled
              placeholder="Coming Soon"
              className="bg-background"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSaving}
            data-testid="button-cancel-profile"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            data-testid="button-save-profile"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
