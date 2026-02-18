import React from 'react';
import { User } from '../types';
import { LogOut, Activity, User as UserIcon } from 'lucide-react';

interface NavbarProps {
  user: User | null;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ user, onLogout }) => {
  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center gap-2 text-medical-600">
              <Activity className="h-8 w-8" />
              <span className="font-bold text-xl tracking-tight text-slate-800">DermaScan AI</span>
            </div>
            <div className="hidden md:flex ml-4 px-2 py-1 bg-medical-50 text-medical-700 text-xs font-medium rounded-full border border-medical-100">
              HAM10000 Model
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <div className="flex items-center gap-2 text-sm text-slate-600 hidden sm:flex">
                  <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                    <UserIcon className="h-4 w-4 text-slate-500" />
                  </div>
                  <span>{user.name}</span>
                </div>
                <button
                  onClick={onLogout}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-slate-500 hover:text-red-600 hover:bg-red-50 focus:outline-none transition-colors"
                >
                  <LogOut className="h-4 w-4 mr-1.5" />
                  Logout
                </button>
              </>
            ) : (
              <span className="text-sm text-slate-500 italic">Medical Assistant Portal</span>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};