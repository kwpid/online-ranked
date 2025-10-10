import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  User as FirebaseUser, 
  onAuthStateChanged, 
  signInWithPopup,
  signOut as firebaseSignOut
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, googleProvider, db } from '@/lib/firebase';
import { User, InsertUser } from '@shared/schema';
import { notificationService, cleanupService } from '@/lib/firebaseService';

interface AuthContextType {
  currentUser: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateUserProfile: (updates: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Generate username from email (remove @gmail.com or @domain.com)
  const generateUsername = (email: string): string => {
    return email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  };

  // Create or get user profile from Firestore
  const createOrGetUserProfile = async (firebaseUser: FirebaseUser): Promise<User> => {
    const userRef = doc(db, 'users', firebaseUser.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const userData = userSnap.data() as User;
      // Update status to online
      await updateDoc(userRef, { 
        status: 'online',
        currentActivity: 'In Menu'
      });
      return { ...userData, status: 'online', currentActivity: 'In Menu' };
    }

    // Create new user profile
    const username = generateUsername(firebaseUser.email || '');
    const newUser: User = {
      id: firebaseUser.uid,
      email: firebaseUser.email || '',
      username,
      displayName: firebaseUser.displayName || username,
      photoURL: firebaseUser.photoURL,
      lastUsernameChange: null,
      title: null,
      banner: null,
      status: 'online',
      currentActivity: 'In Menu',
      createdAt: Date.now(),
    };

    await setDoc(userRef, newUser);
    return newUser;
  };


  // Listen to auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setFirebaseUser(firebaseUser);
      
      if (firebaseUser) {
        try {
          const userProfile = await createOrGetUserProfile(firebaseUser);
          setCurrentUser(userProfile);
        } catch (error) {
          console.error('Error loading user profile:', error);
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Handle tab visibility changes - set offline when tab is not visible
  useEffect(() => {
    if (!currentUser) return;

    const userId = currentUser.id;

    const handleVisibilityChange = async () => {
      const userRef = doc(db, 'users', userId);
      
      if (document.hidden) {
        // Tab is hidden, set status to offline
        await updateDoc(userRef, { 
          status: 'offline'
        });
      } else {
        // Tab is visible, set status to online
        await updateDoc(userRef, { 
          status: 'online',
          currentActivity: 'In Menu'
        });
      }
    };

    // Set initial status
    if (!document.hidden) {
      const userRef = doc(db, 'users', userId);
      updateDoc(userRef, { 
        status: 'online',
        currentActivity: 'In Menu'
      });
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Only set offline on unmount, not on every re-render
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentUser?.id]);

  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result?.user) {
        const userProfile = await createOrGetUserProfile(result.user);
        setCurrentUser(userProfile);
      }
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      if (currentUser) {
        // Update status to offline before signing out
        const userRef = doc(db, 'users', currentUser.id);
        await updateDoc(userRef, { status: 'offline' });
      }
      await firebaseSignOut(auth);
      setCurrentUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const updateUserProfile = async (updates: Partial<User>) => {
    if (!currentUser) return;
    
    const userRef = doc(db, 'users', currentUser.id);
    await updateDoc(userRef, updates);
    setCurrentUser({ ...currentUser, ...updates });
  };

  const value: AuthContextType = {
    currentUser,
    firebaseUser,
    loading,
    signInWithGoogle,
    signOut,
    updateUserProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
