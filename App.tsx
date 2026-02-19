import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { AuthForm } from './components/AuthForm';
import { Dashboard } from './components/Dashboard';
import { LandingPage } from './components/LandingPage';
import { AnimatedBackground } from './components/AnimatedBackground';
import { authService } from './services/authService';
import { User } from './types';
import { Loader2 } from 'lucide-react';
import { supabase } from './lib/supabaseClient';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [showAuth, setShowAuth] = useState(false); // State to toggle between Landing and Auth

  useEffect(() => {
    // 1. Check for initial session
    authService.getCurrentSession().then((currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      }
      setInitializing(false);
    });

    // 2. Listen for auth changes (Login, Logout, Token Refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser({
          email: session.user.email || '',
          name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User'
        });
      } else {
        setUser(null);
        // Do not automatically reset to landing page on logout, or do so if preferred.
        // Let's reset to show landing page if logged out
        setShowAuth(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleAuthSuccess = (user: User) => {
    setUser(user);
  };

  const handleLogout = async () => {
    await authService.logout();
    setUser(null);
    setShowAuth(false);
  };

  if (initializing) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-medical-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen font-sans text-slate-900 bg-slate-50">
      
      {/* Show Navbar on Dashboard, or if preferred, hide on Landing/Auth */}
      <Navbar user={user} onLogout={handleLogout} />
      
      <main>
        {user ? (
          <Dashboard user={user} />
        ) : (
          <>
            <AnimatedBackground />
            {showAuth ? (
              <AuthForm 
                onAuthSuccess={handleAuthSuccess} 
                onBack={() => setShowAuth(false)}
              />
            ) : (
              <LandingPage onGetStarted={() => setShowAuth(true)} />
            )}
          </>
        )}
      </main>

      {/* Footer only on dashboard or static bottom, 
          but for full screen landing/auth it's better to hide or stick to bottom.
          Currently keeping it simple. */}
      {user && (
        <footer className="bg-white border-t border-slate-200 mt-auto py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <p className="text-slate-400 text-sm">
              © {new Date().getFullYear()} DermaScan AI. Powered by HAM10000 & Gemini 2.5 Vision.
            </p>
            <p className="text-xs text-slate-300 mt-2">
              Research Use Only. Not for clinical diagnosis.
            </p>
          </div>
        </footer>
      )}
    </div>
  );
};

export default App;