import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Users } from 'lucide-react';

interface CasualQueueDialogProps {
  isOpen: boolean;
  onClose: () => void;
  partySize: number; // 0 means no party
}

export function CasualQueueDialog({ isOpen, onClose, partySize }: CasualQueueDialogProps) {
  // FFA: solo or no party (0 or 1)
  const canQueueFFA = partySize === 0 || partySize === 1;
  
  // 2V2: party of 2 or solo (0, 1, or 2)
  const canQueue2V2 = partySize === 0 || partySize === 1 || partySize === 2;
  
  // 3V3: party of 3, 2, or solo (0, 1, 2, or 3)
  const canQueue3V3 = partySize === 0 || partySize === 1 || partySize === 2 || partySize === 3;

  const getDisabledMessage = (requiredSize: string) => {
    if (partySize === 0) return '';
    return `Requires ${requiredSize}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-card border-2 border-primary/30">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl uppercase tracking-wider text-center">
            Casual Queue
          </DialogTitle>
          {partySize > 0 && (
            <p className="text-sm text-muted-foreground text-center">
              Current party size: {partySize}
            </p>
          )}
        </DialogHeader>
        
        <div className="space-y-3 py-4">
          <Button
            disabled={!canQueueFFA}
            onClick={() => {
              console.log('Queueing for FFA...');
              onClose();
            }}
            className="w-full h-20 font-display text-xl uppercase tracking-wider bg-primary/20 hover:bg-primary/30 border-2 border-primary/50 hover:border-primary hover:scale-105 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
            data-testid="button-queue-ffa"
          >
            <Users className="h-6 w-6 mr-3" />
            <div className="flex flex-col items-start">
              <span>FFA (Free For All)</span>
              {!canQueueFFA && (
                <span className="text-xs text-red-400 normal-case tracking-normal">
                  Solo or no party required
                </span>
              )}
            </div>
          </Button>

          <Button
            disabled={!canQueue2V2}
            onClick={() => {
              console.log('Queueing for 2V2...');
              onClose();
            }}
            className="w-full h-20 font-display text-xl uppercase tracking-wider bg-primary/20 hover:bg-primary/30 border-2 border-primary/50 hover:border-primary hover:scale-105 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
            data-testid="button-queue-2v2"
          >
            <Users className="h-6 w-6 mr-3" />
            <div className="flex flex-col items-start">
              <span>2V2 Doubles</span>
              {!canQueue2V2 && (
                <span className="text-xs text-red-400 normal-case tracking-normal">
                  Party of 2 or solo queue
                </span>
              )}
            </div>
          </Button>

          <Button
            disabled={!canQueue3V3}
            onClick={() => {
              console.log('Queueing for 3V3...');
              onClose();
            }}
            className="w-full h-20 font-display text-xl uppercase tracking-wider bg-primary/20 hover:bg-primary/30 border-2 border-primary/50 hover:border-primary hover:scale-105 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
            data-testid="button-queue-3v3"
          >
            <Users className="h-6 w-6 mr-3" />
            <div className="flex flex-col items-start">
              <span>3V3 Standard</span>
              {!canQueue3V3 && (
                <span className="text-xs text-red-400 normal-case tracking-normal">
                  Party of 2-3 or solo queue
                </span>
              )}
            </div>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
