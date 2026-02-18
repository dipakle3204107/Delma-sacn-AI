import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { AuthForm } from './components/AuthForm';
import { Dashboard } from './components/Dashboard';
import { authService } from './services/authService';
import { User } from './types';
import { Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    // check for existing session
    const currentUser = authService.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
    }
    setInitializing(false);
  }, []);

  const handleAuthSuccess = (user: User) => {
    setUser(user);
  };

  const handleLogout = async () => {
    await authService.logout();
    setUser(null);
  };

  if (initializing) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-medical-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Navbar user={user} onLogout={handleLogout} />
      
      <main>
        {user ? (
          <Dashboard user={user} />
        ) : (
          <AuthForm onAuthSuccess={handleAuthSuccess} />
        )}
      </main>

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
    </div>
  );
};

export default App;