import { useState, useEffect, createContext, useContext } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    };

    getInitialSession();

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state change:', event, session?.user?.email);
        
        // Update state for normal auth events
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Handle token refresh outside the callback to avoid deadlocks
        if (event === 'TOKEN_REFRESHED') {
          console.log('[useAuth] Token refreshed successfully');
        }
        
        // If session is invalid, attempt refresh
        if (event === 'SIGNED_OUT' || !session) {
          console.log('[useAuth] Session ended or invalid');
        }
      }
    );

    // Set up periodic session check
    const sessionCheckInterval = setInterval(async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession && user) {
        console.warn('[useAuth] Session expired, attempting refresh...');
        const { data, error } = await supabase.auth.refreshSession();
        if (error) {
          console.error('[useAuth] Failed to refresh session:', error);
          setSession(null);
          setUser(null);
        } else if (data.session) {
          console.log('[useAuth] Session refreshed successfully');
          setSession(data.session);
          setUser(data.session.user);
        }
      }
    }, 60000); // Check every minute

    return () => {
      subscription.unsubscribe();
      clearInterval(sessionCheckInterval);
    };
  }, [user]);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    return { error };
  };

  const signOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setLoading(false);
  };

  const value = {
    user,
    session,
    signIn,
    signOut,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};