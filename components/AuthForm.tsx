import React, { useState } from 'react';
import { authService } from '../services/authService';
import { User } from '../types';
import { Lock, Mail, User as UserIcon, Loader2, ShieldCheck, Eye, EyeOff, ArrowLeft, CheckCircle } from 'lucide-react';

interface AuthFormProps {
  onAuthSuccess: (user: User) => void;
}

export const AuthForm: React.FC<AuthFormProps> = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isForgotPassword) {
        await authService.resetPassword(email);
        setResetSent(true);
        setLoading(false);
        return;
      }

      let user: User;
      if (isLogin) {
        user = await authService.login(email, password, rememberMe);
      } else {
        if (!name.trim()) throw new Error('Name is required');
        user = await authService.register(email, password, name);
      }
      onAuthSuccess(user);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const toggleView = () => {
    setIsLogin(!isLogin);
    setError(null);
    setResetSent(false);
  };

  const handleForgotPasswordClick = () => {
    setIsForgotPassword(true);
    setError(null);
    setResetSent(false);
  };

  const handleBackToLogin = () => {
    setIsForgotPassword(false);
    setIsLogin(true);
    setError(null);
    setResetSent(false);
  };

  if (isForgotPassword) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50">
        <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
          <div className="text-center">
            <div className="mx-auto h-16 w-16 bg-medical-50 rounded-full flex items-center justify-center mb-4">
               {resetSent ? <CheckCircle className="h-10 w-10 text-green-600" /> : <ShieldCheck className="h-10 w-10 text-medical-600" />}
            </div>
            <h2 className="text-3xl font-extrabold text-slate-900">
              {resetSent ? 'Check your email' : 'Reset Password'}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              {resetSent 
                ? `We've sent password reset instructions to ${email}`
                : 'Enter your email address and we will send you a link to reset your password.'}
            </p>
          </div>

          {!resetSent ? (
            <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="reset-email">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    id="reset-email"
                    type="email"
                    name="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="appearance-none block w-full pl-10 px-3 py-2 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-medical-500 focus:border-medical-500 sm:text-sm"
                    placeholder="name@clinic.com"
                  />
                </div>
              </div>

              {error && (
                <div className="rounded-md bg-red-50 p-4 border border-red-100">
                  <div className="flex">
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">{error}</h3>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-medical-600 hover:bg-medical-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-medical-500 disabled:opacity-70 transition-colors"
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    'Send Reset Link'
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="mt-8">
              <button
                onClick={handleBackToLogin}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-medical-600 hover:bg-medical-700 focus:outline-none transition-colors"
              >
                Return to login
              </button>
            </div>
          )}

          {!resetSent && (
            <div className="text-center mt-4">
              <button
                type="button"
                onClick={handleBackToLogin}
                className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-700"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Sign in
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-medical-50 rounded-full flex items-center justify-center mb-4">
             <ShieldCheck className="h-10 w-10 text-medical-600" />
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Secure Skin Lesion Analysis Portal
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="name">Full Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <UserIcon className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    id="name"
                    type="text"
                    name="name"
                    autoComplete="name"
                    required={!isLogin}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="appearance-none block w-full pl-10 px-3 py-2 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-medical-500 focus:border-medical-500 sm:text-sm"
                    placeholder="Dr. Jane Doe"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="email">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  name="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full pl-10 px-3 py-2 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-medical-500 focus:border-medical-500 sm:text-sm"
                  placeholder="name@clinic.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="password">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full pl-10 pr-10 px-3 py-2 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-medical-500 focus:border-medical-500 sm:text-sm"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            {isLogin && (
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-medical-600 focus:ring-medical-500 border-slate-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-900">
                  Remember me
                </label>
              </div>
            )}

            {isLogin && (
              <div className="text-sm">
                <button
                  type="button"
                  onClick={handleForgotPasswordClick}
                  className="font-medium text-medical-600 hover:text-medical-500"
                >
                  Forgot password?
                </button>
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4 border border-red-100">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">{error}</h3>
                </div>
              </div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-medical-600 hover:bg-medical-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-medical-500 disabled:opacity-70 transition-colors"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                isLogin ? 'Sign in' : 'Register'
              )}
            </button>
          </div>
        </form>

        <div className="text-center space-y-4">
          <button
            onClick={toggleView}
            className="text-sm font-medium text-medical-600 hover:text-medical-500"
          >
            {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>
          
          {isLogin && (
             <div className="text-xs text-slate-400 pt-2 border-t border-slate-100">
                <p>Demo Credentials:</p>
                <p className="font-mono mt-1">doctor@clinic.com / password123</p>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};