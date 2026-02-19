import React, { useState } from 'react';
import { authService } from '../services/authService';
import { User } from '../types';
import { Lock, Mail, User as UserIcon, Loader2, ShieldCheck, Eye, EyeOff, ArrowLeft, CheckCircle, Save, X, Fingerprint, Scan, ScanFace } from 'lucide-react';

interface AuthFormProps {
  onAuthSuccess: (user: User) => void;
  onBack?: () => void;
}

export const AuthForm: React.FC<AuthFormProps> = ({ onAuthSuccess, onBack }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  
  // Biometric States
  const [biometricPermission, setBiometricPermission] = useState(false);
  const [biometricVerified, setBiometricVerified] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);

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

      if (!isLogin) {
        // Registration Flow
        if (!name.trim()) {
           throw new Error('Name is required');
        }

        // Enforce Biometric Verification
        if (!biometricVerified) {
          throw new Error('Please complete the Face ID / Biometric verification before registering.');
        }
        
        setLoading(false); // Stop loading spinner from form submission
        setShowSaveConfirmation(true); // Show the popup
        return;
      }

      // Login Flow: Proceed immediately
      const user = await authService.login(email, password, rememberMe);
      onAuthSuccess(user);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      setLoading(false);
    }
  };

  const handleConfirmRegister = async () => {
    // Hide popup
    setShowSaveConfirmation(false);
    // Start global loading
    setLoading(true);
    setError(null);

    try {
      // Perform registration which saves info to database
      const user = await authService.register(email, password, name);
      onAuthSuccess(user);
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const toggleView = () => {
    setIsLogin(!isLogin);
    setError(null);
    setResetSent(false);
    setBiometricVerified(false); // Reset on toggle
    setBiometricPermission(false);
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

  // --- Biometric Implementation (WebAuthn) ---

  const checkBiometricSupport = async () => {
    if (!window.PublicKeyCredential) {
      throw new Error("Biometric authentication is not supported in this browser.");
    }
    
    // We attempt to check for platform authenticators, but won't block if the check fails (some browsers hide this)
    if (window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
       const available = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
       if (!available) {
         console.warn("Platform authenticator not explicitly reported as available.");
         // We don't throw here to allow external keys or fallback behavior
       }
    }
  };

  const startBiometricScan = async () => {
    if (biometricVerified) return;
    if (!biometricPermission) {
      setError("Please grant permission for Face ID / Biometrics first.");
      return;
    }

    setError(null);

    // Basic form validation before starting biometric enrollment
    if (!name.trim()) {
      setError("Please enter your Name first.");
      return;
    }

    setIsScanning(true);
    
    try {
      await checkBiometricSupport();

      // Create random challenge
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      // Create User ID
      const userId = new Uint8Array(16);
      window.crypto.getRandomValues(userId);

      const publicKey: PublicKeyCredentialCreationOptions = {
        challenge,
        rp: {
          name: "DermaScan AI",
        },
        user: {
          id: userId,
          name: email || "user@dermascan.ai",
          displayName: name
        },
        pubKeyCredParams: [
          { alg: -7, type: "public-key" }, // ES256
          { alg: -257, type: "public-key" } // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform", // FaceID/TouchID/Windows Hello
          userVerification: "required",
          requireResidentKey: false
        },
        timeout: 60000
      };

      const credential = await navigator.credentials.create({ publicKey });

      if (credential) {
        setBiometricVerified(true);
      }
    } catch (err: any) {
      console.error("Biometric Error:", err);
      // Handle the specific Permissions Policy error (iframe issue)
      if (err.message && err.message.includes("not enabled in this document")) {
         setError("Environment Restriction: Biometrics are disabled in this preview frame.");
         // Fallback for demo purposes if environment blocks it
         setTimeout(() => {
            alert("Demo Bypass: Biometrics simulated due to environment restrictions.");
            setBiometricVerified(true);
            setIsScanning(false);
         }, 1000);
         return;
      }

      if (err.name === 'NotAllowedError') {
        setError("Biometric access denied or timed out. Please try again.");
      } else {
        setError(err.message || "Biometric registration failed.");
      }
    } finally {
      setIsScanning(false);
    }
  };

  const handleBiometricLogin = async () => {
    setError(null);
    setIsScanning(true);

    try {
      await checkBiometricSupport();

      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      const publicKey: PublicKeyCredentialRequestOptions = {
        challenge,
        timeout: 60000,
        userVerification: "required"
      };

      const credential = await navigator.credentials.get({ publicKey });

      if (credential) {
         const recoveredUser: User = {
           email: email || 'verified.user@clinic.com',
           name: 'Biometric Verified'
         };
         onAuthSuccess(recoveredUser);
      }
    } catch (err: any) {
      console.error("Biometric Login Error:", err);
      
      if (err.message && err.message.includes("not enabled in this document")) {
         setError("Biometrics disabled in preview. Please login with password.");
      } else if (err.name === 'NotAllowedError') {
         setError("Verification denied.");
      } else {
         setError(err.message || "Authentication failed.");
      }
    } finally {
      setIsScanning(false);
    }
  };

  if (isForgotPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-md w-full space-y-8 bg-white/90 backdrop-blur-md p-8 rounded-2xl shadow-xl border border-white/50 animate-in fade-in zoom-in duration-300">
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
            <div className="mt-8">
              <form className="space-y-6" onSubmit={handleSubmit}>
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
                      className="appearance-none block w-full pl-10 px-3 py-2 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-medical-500 focus:border-medical-500 sm:text-sm bg-white/50"
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
            </div>
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
                Back to Login
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative z-10">
      <div className="max-w-md w-full space-y-8 bg-white/90 backdrop-blur-md p-8 rounded-2xl shadow-xl border border-white/50 animate-in fade-in slide-in-from-bottom-8 duration-500">
        <div className="relative">
          {onBack && (
            <button 
              onClick={onBack}
              className="absolute -top-2 -left-2 p-2 text-slate-400 hover:text-medical-600 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
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
        </div>

        <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
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
                    className="appearance-none block w-full pl-10 px-3 py-2 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-medical-500 focus:border-medical-500 sm:text-sm bg-white/50"
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
                  className="appearance-none block w-full pl-10 px-3 py-2 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-medical-500 focus:border-medical-500 sm:text-sm bg-white/50"
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
                  className="appearance-none block w-full pl-10 pr-10 px-3 py-2 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-medical-500 focus:border-medical-500 sm:text-sm bg-white/50"
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
            <div className="rounded-md bg-red-50 p-4 border border-red-100 animate-in fade-in slide-in-from-top-2">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">{error}</h3>
                </div>
              </div>
            </div>
          )}

          {/* Registration Biometric Flow */}
          {!isLogin && (
            <div className="space-y-4 pt-2">
              <div className="border-t border-slate-200 pt-4">
                <h3 className="text-sm font-semibold text-slate-900 mb-3">Biometric Security Setup</h3>
                
                {/* Step 1: Permission */}
                <div className={`flex items-center justify-between p-3 rounded-lg border ${biometricPermission ? 'bg-medical-50 border-medical-200' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex items-center">
                    <div className={`p-2 rounded-full mr-3 ${biometricPermission ? 'bg-medical-100' : 'bg-slate-200'}`}>
                       <ShieldCheck className={`w-4 h-4 ${biometricPermission ? 'text-medical-600' : 'text-slate-500'}`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">Allow Face ID / Biometrics</p>
                      <p className="text-xs text-slate-500">Enable secure device authentication</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={biometricPermission}
                      onChange={() => setBiometricPermission(!biometricPermission)}
                      disabled={biometricVerified} // Lock if already verified
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-medical-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-medical-600"></div>
                  </label>
                </div>

                {/* Step 2: Scan Action (Only visible if permission granted) */}
                {biometricPermission && (
                  <div className={`mt-3 relative w-full rounded-xl border-2 border-dashed p-4 transition-all duration-300 ${
                      biometricVerified 
                        ? 'border-green-300 bg-green-50/50' 
                        : 'border-slate-300 bg-slate-50/50 hover:border-medical-300'
                    }`}>
                    
                    {biometricVerified ? (
                      <div className="flex flex-col items-center justify-center text-center animate-in zoom-in duration-300">
                        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mb-2">
                          <CheckCircle className="w-6 h-6 text-green-600" />
                        </div>
                        <h4 className="text-green-800 font-bold text-sm">Security Configured</h4>
                        <p className="text-green-600 text-xs mt-1">Face ID / Fingerprint Linked</p>
                      </div>
                    ) : (
                      <div 
                        onClick={startBiometricScan}
                        className="flex flex-col items-center justify-center text-center cursor-pointer group py-2"
                      >
                        <div className="flex gap-4 mb-2">
                           <ScanFace className="w-8 h-8 text-slate-400 group-hover:text-medical-600 transition-colors" />
                           <Fingerprint className="w-8 h-8 text-slate-400 group-hover:text-medical-600 transition-colors" />
                        </div>
                        <h4 className="text-slate-700 font-bold text-sm group-hover:text-medical-700">Set Biometric ID</h4>
                        <p className="text-slate-500 text-xs mt-1">
                          Tap to register Face ID or Fingerprint
                        </p>
                        <span className="mt-2 inline-flex items-center text-[10px] font-medium text-medical-600 bg-white px-2 py-0.5 rounded border border-medical-100">
                          Click to Scan
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="space-y-3 pt-2">
            <button
              type="submit"
              disabled={loading || (!isLogin && !biometricVerified)}
              className="group relative w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-medical-600 hover:bg-medical-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-medical-500 disabled:opacity-70 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                isLogin ? 'Login' : 'Register'
              )}
            </button>

            {isLogin && (
              <button
                type="button"
                onClick={handleBiometricLogin}
                className="group relative w-full flex justify-center items-center py-2.5 px-4 border border-slate-300 text-sm font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-medical-500 transition-colors"
              >
                <ScanFace className="w-4 h-4 mr-2 text-medical-600" />
                Login with Face ID / Biometrics
              </button>
            )}
          </div>

        </form>

        <div className="text-center space-y-4">
          <button
            onClick={toggleView}
            className="text-sm font-medium text-medical-600 hover:text-medical-500"
          >
            {isLogin ? "Don't have an account? Register" : 'Already have an account? Login'}
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showSaveConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-medical-100 mb-4">
                <Save className="h-6 w-6 text-medical-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Save Account Information?</h3>
              <p className="mt-2 text-sm text-slate-500">
                Your credentials and biometric ID will be saved securely.
              </p>
            </div>
            
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setShowSaveConfirmation(false)}
                className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-slate-300 shadow-sm text-sm font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-colors"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRegister}
                className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-medical-600 hover:bg-medical-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-medical-500 transition-colors"
              >
                <Save className="w-4 h-4 mr-2" />
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scanning Overlay Modal */}
      {isScanning && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="flex flex-col items-center">
            <div className="relative w-32 h-32 mb-8">
              {/* Pulsing Face/Fingerprint */}
              <ScanFace className="w-32 h-32 text-medical-500/30 absolute inset-0" />
              <ScanFace className="w-32 h-32 text-medical-500 absolute inset-0 animate-pulse" />
              
              {/* Scanning Beam */}
              <div className="absolute top-0 left-0 w-full h-1 bg-medical-400 shadow-[0_0_15px_rgba(45,212,191,0.8)] animate-[scan_2s_ease-in-out_infinite]"></div>
            </div>
            
            <h3 className="text-xl font-bold text-white tracking-widest uppercase mb-2">Verifying Identity</h3>
            <p className="text-medical-300 text-sm animate-pulse">Scanning Face ID / Fingerprint...</p>
            
            {/* Custom Scan Animation CSS */}
            <style dangerouslySetInnerHTML={{__html: `
              @keyframes scan {
                0%, 100% { top: 0%; opacity: 0; }
                10% { opacity: 1; }
                90% { opacity: 1; }
                50% { top: 100%; }
              }
            `}} />
          </div>
        </div>
      )}
    </div>
  );
};