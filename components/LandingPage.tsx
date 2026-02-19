import React from 'react';
import { ArrowRight, ShieldCheck, Activity, Brain } from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
  return (
    <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 sm:px-6 lg:px-8 text-center animate-in fade-in duration-700">
      
      {/* Hero Icon */}
      <div className="mb-8 relative">
        <div className="absolute inset-0 bg-medical-400 blur-2xl opacity-20 rounded-full animate-pulse"></div>
        <div className="relative bg-white p-4 rounded-2xl shadow-xl border border-medical-100 transform hover:scale-105 transition-transform duration-300">
          <Activity className="w-16 h-16 text-medical-600" />
        </div>
      </div>

      {/* Main Heading */}
      <h1 className="text-5xl sm:text-6xl font-extrabold text-slate-900 tracking-tight mb-4 drop-shadow-sm">
        DermaScan <span className="text-medical-600">AI</span>
      </h1>
      
      <p className="text-xl sm:text-2xl font-medium text-slate-600 mb-8 max-w-2xl mx-auto">
        Advanced Skin Lesion Classification powered by HAM10000 Dataset & Future Vision.
      </p>

      {/* Feature Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto mb-12 text-left">
        <div className="bg-white/60 backdrop-blur-sm p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
          <ShieldCheck className="w-8 h-8 text-medical-600 mb-3" />
          <h3 className="font-bold text-slate-900 mb-1">Medical Grade Security</h3>
          <p className="text-sm text-slate-600">Secure biometric login and encrypted patient data storage.</p>
        </div>
        <div className="bg-white/60 backdrop-blur-sm p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
          <Brain className="w-8 h-8 text-medical-600 mb-3" />
          <h3 className="font-bold text-slate-900 mb-1">AI Analysis</h3>
          <p className="text-sm text-slate-600">Instant classification into 7 diagnostic categories with high accuracy.</p>
        </div>
        <div className="bg-white/60 backdrop-blur-sm p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
          <Activity className="w-8 h-8 text-medical-600 mb-3" />
          <h3 className="font-bold text-slate-900 mb-1">Instant Results</h3>
          <p className="text-sm text-slate-600">Real-time processing and nearest clinic recommendations.</p>
        </div>
      </div>

      {/* CTA Button */}
      <button
        onClick={onGetStarted}
        className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white transition-all duration-200 bg-medical-600 rounded-full hover:bg-medical-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-medical-500 shadow-lg hover:shadow-medical-500/30 hover:-translate-y-1"
      >
        Get Started
        <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
        <div className="absolute inset-0 rounded-full ring-4 ring-white/20 group-hover:ring-white/40 transition-all"></div>
      </button>

      <p className="mt-8 text-xs text-slate-400 font-medium">
        Trusted by Dermatologists • HIPAA Compliant Standards • 24/7 Availability
      </p>
    </div>
  );
};