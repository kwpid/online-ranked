import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, MessageSquare, X } from 'lucide-react';
import { collection, addDoc, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { PartyMessage } from '@shared/schema';

interface PartyChatBoxProps {
  partyId: string;
}

export function PartyChatBox({ partyId }: PartyChatBoxProps) {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState<PartyMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Listen to party messages
  useEffect(() => {
    if (!partyId) return;

    const messagesQuery = query(
      collection(db, 'partyMessages'),
      where('partyId', '==', partyId),
      limit(50)
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      } as PartyMessage));
      // Sort by createdAt in JavaScript instead of Firestore
      msgs.sort((a, b) => a.createdAt - b.createdAt);
      setMessages(msgs);
    });

    return unsubscribe;
  }, [partyId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current && !isMinimized) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isMinimized]);

  const handleSendMessage = async () => {
    if (!currentUser || !newMessage.trim()) return;

    try {
      await addDoc(collection(db, 'partyMessages'), {
        partyId,
        userId: currentUser.id,
        displayName: currentUser.displayName,
        message: newMessage.trim(),
        createdAt: Date.now(),
      });

      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (isMinimized) {
    return (
      <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-40">
        <Button
          onClick={() => setIsMinimized(false)}
          className="h-12 w-12 md:h-14 md:w-14 rounded-full bg-primary hover:bg-primary/90 shadow-lg touch-manipulation"
          size="icon"
        >
          <MessageSquare className="h-6 w-6" />
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-20 md:bottom-6 right-2 md:right-6 left-2 md:left-auto w-auto md:w-96 h-[400px] md:h-[500px] bg-card border-2 border-border rounded-lg shadow-2xl z-40 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border bg-secondary/30">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          <h3 className="font-bold text-foreground">Party Chat</h3>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsMinimized(true)}
          className="h-8 w-8 touch-manipulation"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-3">
        <div ref={scrollRef} className="space-y-2">
          {messages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No messages yet. Start the conversation!
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`p-2 rounded-lg ${
                  msg.userId === currentUser?.id
                    ? 'bg-primary/10 ml-4'
                    : 'bg-secondary/50 mr-4'
                }`}
              >
                <p className="text-sm">
                  <span className="font-semibold text-foreground">
                    {msg.displayName}
                  </span>
                  <span className="text-muted-foreground"> : </span>
                  <span className="text-foreground">{msg.message}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(msg.createdAt).toLocaleTimeString()}
                </p>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-3 border-t border-border bg-secondary/20">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 bg-background text-foreground"
            maxLength={500}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
            size="icon"
            className="shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
