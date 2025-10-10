import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Gamepad2, Trophy, Lock } from 'lucide-react';

interface PlayModeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMode: (mode: 'casual' | 'ranked' | 'private') => void;
}

export function PlayModeDialog({ isOpen, onClose, onSelectMode }: PlayModeDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-card border-2 border-primary/30">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl uppercase tracking-wider text-center">
            Select Game Mode
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-3 py-4">
          <Button
            onClick={() => {
              onSelectMode('casual');
              onClose();
            }}
            className="w-full h-20 font-display text-xl uppercase tracking-wider bg-primary/20 hover:bg-primary/30 border-2 border-primary/50 hover:border-primary hover:scale-105 transition-all duration-200"
            data-testid="button-casual-mode"
          >
            <Gamepad2 className="h-6 w-6 mr-3" />
            Casual
          </Button>

          <Button
            disabled
            className="w-full h-20 font-display text-xl uppercase tracking-wider bg-secondary/20 border-2 border-border/30 opacity-40 cursor-not-allowed relative"
            data-testid="button-ranked-mode"
          >
            <Trophy className="h-6 w-6 mr-3" />
            Ranked
            <span className="absolute top-2 right-2 text-xs bg-yellow-500/20 text-yellow-500 px-2 py-1 rounded">
              Coming Soon
            </span>
          </Button>

          <Button
            onClick={() => {
              onSelectMode('private');
              onClose();
            }}
            className="w-full h-20 font-display text-xl uppercase tracking-wider bg-primary/20 hover:bg-primary/30 border-2 border-primary/50 hover:border-primary hover:scale-105 transition-all duration-200"
            data-testid="button-private-mode"
          >
            <Lock className="h-6 w-6 mr-3" />
            Private Match
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
