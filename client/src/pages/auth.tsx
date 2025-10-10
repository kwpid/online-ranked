import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { FcGoogle } from 'react-icons/fc';

export default function AuthPage() {
  const { currentUser, signInWithGoogle, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (currentUser) {
      setLocation('/');
    }
  }, [currentUser, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse">
          <div className="h-12 w-48 bg-primary/20 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden px-4">
      {/* Background gradient effect */}
      <div className="absolute inset-0 bg-gradient-radial from-primary/10 via-background to-background"></div>
      
      <div className="relative z-10 flex flex-col items-center gap-6 md:gap-8 p-4 md:p-8 w-full max-w-lg">
        {/* Logo/Title */}
        <div className="text-center">
          <h1 className="font-display text-4xl md:text-6xl font-bold text-foreground uppercase tracking-wider mb-2">
            Ranked Poker
          </h1>
          <p className="text-muted-foreground text-base md:text-lg">
            Play Smart. Rise Fast. Own the Table.
          </p>
        </div>

        {/* Sign in button */}
        <Button
          onClick={signInWithGoogle}
          size="lg"
          className="bg-card hover:bg-card border-2 border-border hover:border-primary text-foreground px-8 md:px-12 py-5 md:py-6 text-base md:text-lg font-semibold transition-all duration-200 hover:scale-105 touch-manipulation w-full md:w-auto"
          data-testid="button-google-signin"
        >
          <FcGoogle className="mr-3 h-6 w-6" />
          Sign in with Google
        </Button>

        <p className="text-xs md:text-sm text-muted-foreground max-w-md text-center px-4">
          By signing in, you agree to our terms of service and privacy policy.
          Your Google profile will be used to create your gaming account.
        </p>
      </div>
    </div>
  );
}
