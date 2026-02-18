import React, { useState } from 'react';
import { AnalysisResult } from '../types';
import { AlertTriangle, CheckCircle, Info, Activity, BarChart2, MapPin, Phone, Navigation, Loader2, Star, Clock, ExternalLink, Youtube, Search, BookOpen } from 'lucide-react';
import { findNearbyClinics, ClinicResult } from '../services/geminiService';

interface ResultCardProps {
  result: AnalysisResult;
  loading: boolean;
}

export const ResultCard: React.FC<ResultCardProps> = ({ result, loading }) => {
  const [findingLocation, setFindingLocation] = useState(false);
  const [clinicData, setClinicData] = useState<ClinicResult | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  const handleFindClinics = () => {
    setFindingLocation(true);
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      setFindingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const data = await findNearbyClinics(latitude, longitude);
          setClinicData(data);
        } catch (err) {
          setLocationError("Failed to fetch nearby clinics. Please try again.");
        } finally {
          setFindingLocation(false);
        }
      },
      (error) => {
        setLocationError("Unable to retrieve your location. Please allow location access.");
        setFindingLocation(false);
      }
    );
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-slate-100 border-t-medical-500 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Activity className="w-6 h-6 text-medical-600" />
          </div>
        </div>
        <h3 className="mt-6 text-lg font-medium text-slate-900">Analyzing Lesion Structure</h3>
        <p className="mt-2 text-sm text-slate-500 text-center max-w-xs">
          Running HAM10000 classification model features extraction...
        </p>
      </div>
    );
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-50 text-red-700 border-red-200';
      case 'medium': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'low': return 'bg-green-50 text-green-700 border-green-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getSeverityIcon = (severity: string) => {
     switch (severity) {
      case 'high': return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case 'medium': return <Info className="w-5 h-5 text-orange-600" />;
      case 'low': return <CheckCircle className="w-5 h-5 text-green-600" />;
      default: return <Info className="w-5 h-5" />;
    }
  };

  // Donut Chart configuration
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (result.confidence / 100) * circumference;

  // Search terms
  const searchTerm = result.category === 'Unknown / Non-skin' ? 'Skin lesion assessment' : result.category;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
      <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
        <h3 className="text-lg font-semibold text-slate-900">Clinical Prediction Results</h3>
        <span className="text-xs font-mono text-slate-400">ID: {Math.random().toString(36).substr(2, 9).toUpperCase()}</span>
      </div>

      <div className="p-6 space-y-8 flex-grow overflow-y-auto">
        
        {/* Top Section: Main Result & Donut */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-8 py-2">
          
          <div className="flex-1 w-full space-y-4">
             <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Primary Diagnosis</label>
                <div className="mt-1 text-3xl font-extrabold text-slate-900 leading-tight">
                  {result.category}
                </div>
             </div>
             
             <div className="flex items-center gap-4">
                <div className={`px-4 py-1.5 rounded-full text-sm font-bold border flex items-center gap-2 ${getSeverityColor(result.severity)}`}>
                  {getSeverityIcon(result.severity)}
                  <span className="capitalize">{result.severity} Risk</span>
                </div>
             </div>
          </div>

          {/* Confidence Donut Chart */}
          <div className="relative flex flex-col items-center">
             <div className="relative w-32 h-32">
               <svg className="w-full h-full transform -rotate-90 drop-shadow-sm">
                 <circle
                   cx="64"
                   cy="64"
                   r={radius}
                   className="text-slate-100 stroke-current"
                   strokeWidth="10"
                   fill="transparent"
                 />
                 <circle
                   cx="64"
                   cy="64"
                   r={radius}
                   className={`stroke-current transition-all duration-1000 ease-out ${
                     result.confidence > 80 ? 'text-medical-600' : 
                     result.confidence > 50 ? 'text-medical-400' : 'text-orange-400'
                   }`}
                   strokeWidth="10"
                   fill="transparent"
                   strokeDasharray={circumference}
                   strokeDashoffset={strokeDashoffset}
                   strokeLinecap="round"
                 />
               </svg>
               <div className="absolute inset-0 flex items-center justify-center flex-col">
                  <span className="text-2xl font-bold text-slate-900">{result.confidence}%</span>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wide">Confidence</span>
               </div>
             </div>
          </div>
        </div>

        {/* Probability Distribution Graph */}
        {result.probabilities && (
          <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
            <h4 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-medical-500" />
              Class Probabilities
            </h4>
            <div className="space-y-3">
              {Object.entries(result.probabilities)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 4) // Show top 4
                .map(([name, score]) => (
                  <div key={name}>
                     <div className="flex justify-between text-xs mb-1.5">
                       <span className={`font-medium ${name === result.category ? 'text-medical-700' : 'text-slate-600'}`}>
                         {name} {name === result.category && '(Detected)'}
                       </span>
                       <span className="text-slate-500 font-mono">{score}%</span>
                     </div>
                     <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                       <div 
                         className={`h-2.5 rounded-full transition-all duration-1000 ease-out ${
                           name === result.category ? 'bg-medical-500' : 'bg-slate-400'
                         }`} 
                         style={{ width: `${score}%` }}
                       ></div>
                     </div>
                  </div>
              ))}
            </div>
          </div>
        )}

        {/* Description & Recommendation Grid */}
        <div className="grid grid-cols-1 gap-4">
          <div className="p-4 rounded-xl border border-slate-200">
            <h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-2 text-sm">
              <Info className="w-4 h-4 text-medical-500" /> 
              Clinical Analysis
            </h4>
            <p className="text-sm text-slate-600 leading-relaxed">{result.description}</p>
          </div>
          <div className={`p-4 rounded-xl border ${result.severity === 'high' ? 'bg-red-50/50 border-red-100' : 'bg-blue-50/50 border-blue-100'}`}>
            <h4 className={`font-semibold mb-2 flex items-center gap-2 text-sm ${result.severity === 'high' ? 'text-red-900' : 'text-blue-900'}`}>
              <Activity className="w-4 h-4" /> 
              Recommendation
            </h4>
            <p className={`text-sm leading-relaxed ${result.severity === 'high' ? 'text-red-800' : 'text-blue-800'}`}>
              {result.recommendation}
            </p>
          </div>
        </div>

        {/* Nearby Clinics Section */}
        <div className="border-t border-slate-100 pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-medical-600" />
              Nearby Specialists
            </h3>
            {!clinicData && !findingLocation && (
              <button 
                onClick={handleFindClinics}
                className="text-sm text-medical-600 hover:text-medical-700 font-medium hover:underline"
              >
                Find Now
              </button>
            )}
          </div>

          {!clinicData && !findingLocation && (
             <div className="bg-slate-50 rounded-xl p-6 text-center border border-slate-100">
               <p className="text-sm text-slate-500 mb-3">
                 Need professional help? Locate dermatology clinics near you.
               </p>
               <button 
                 onClick={handleFindClinics}
                 className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-medical-600 rounded-lg hover:bg-medical-700 transition-colors shadow-sm"
               >
                 <Navigation className="w-4 h-4 mr-2" />
                 Find Nearby Clinics
               </button>
             </div>
          )}

          {findingLocation && (
             <div className="bg-slate-50 rounded-xl p-8 flex flex-col items-center justify-center border border-slate-100">
                <Loader2 className="w-6 h-6 text-medical-600 animate-spin mb-3" />
                <p className="text-sm text-slate-600">Accessing location & searching Google Maps...</p>
             </div>
          )}

          {locationError && (
             <div className="bg-red-50 rounded-xl p-4 text-center border border-red-100">
               <p className="text-sm text-red-700">{locationError}</p>
               <button onClick={handleFindClinics} className="text-xs text-red-800 underline mt-2">Try Again</button>
             </div>
          )}

          {clinicData && clinicData.clinics.length > 0 && (
            <div className="space-y-4">
              {clinicData.clinics.map((clinic, index) => {
                // Try to find a matching grounding chunk URI
                const mapLink = clinicData.groundingChunks?.find(chunk => 
                  chunk.maps?.title && clinic.name.toLowerCase().includes(chunk.maps.title.toLowerCase())
                )?.maps?.uri || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(clinic.name + " " + clinic.address)}`;

                return (
                  <div key={index} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                    <div className="p-4">
                      <div className="flex justify-between items-start mb-2">
                         <h4 className="text-sm font-bold text-slate-900 leading-tight">{clinic.name}</h4>
                         {clinic.rating > 0 && (
                           <div className="flex items-center gap-1 bg-yellow-50 px-1.5 py-0.5 rounded text-xs text-yellow-700 border border-yellow-100">
                             <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                             <span className="font-semibold">{clinic.rating}</span>
                             <span className="text-slate-400 font-normal">({clinic.reviews})</span>
                           </div>
                         )}
                      </div>
                      
                      <p className="text-xs text-slate-500 mb-3 line-clamp-2">{clinic.summary}</p>

                      <div className="space-y-2 text-xs text-slate-600 mb-4">
                        <div className="flex items-start gap-2">
                           <MapPin className="w-3.5 h-3.5 text-medical-500 mt-0.5 flex-shrink-0" />
                           <span>{clinic.address}</span>
                        </div>
                        <div className="flex items-center gap-2">
                           <Clock className="w-3.5 h-3.5 text-medical-500 flex-shrink-0" />
                           <span className={clinic.hours.toLowerCase().includes('closed') ? 'text-red-600' : 'text-green-700'}>
                             {clinic.hours}
                           </span>
                        </div>
                        {clinic.phone && clinic.phone !== 'N/A' && (
                          <div className="flex items-center gap-2">
                             <Phone className="w-3.5 h-3.5 text-medical-500 flex-shrink-0" />
                             <span>{clinic.phone}</span>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-50">
                        {clinic.phone && clinic.phone !== 'N/A' ? (
                          <a 
                            href={`tel:${clinic.phone}`}
                            className="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-slate-50 text-slate-700 text-xs font-medium hover:bg-slate-100 transition-colors border border-slate-100"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            Call Now
                          </a>
                        ) : (
                          <span className="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-slate-50 text-slate-400 text-xs border border-slate-100 cursor-not-allowed">
                             <Phone className="w-3.5 h-3.5" />
                             No Phone
                          </span>
                        )}
                        <a 
                          href={mapLink}
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-medical-50 text-medical-700 text-xs font-medium hover:bg-medical-100 transition-colors border border-medical-100"
                        >
                          <Navigation className="w-3.5 h-3.5" />
                          Directions
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
              
              <div className="text-center pt-2">
                <a 
                  href="https://www.google.com/maps/search/dermatologist+near+me" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-medical-600 hover:underline inline-flex items-center gap-1"
                >
                  View more on Google Maps <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}
          
          {clinicData && clinicData.clinics.length === 0 && (
             <div className="p-4 bg-slate-50 rounded-xl text-center text-sm text-slate-500">
               No clinics found nearby. Try searching directly on Google Maps.
             </div>
          )}
        </div>

        {/* Educational Resources */}
        <div className="border-t border-slate-100 pt-6">
          <h3 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-medical-600" />
            Learn More About {result.category}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             <a 
               href={`https://www.youtube.com/results?search_query=${encodeURIComponent(searchTerm + " skin cancer symptoms and treatment")}`}
               target="_blank"
               rel="noopener noreferrer"
               className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 bg-white hover:border-red-200 hover:bg-red-50/50 transition-all group"
             >
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 group-hover:bg-red-200 transition-colors">
                  <Youtube className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900 text-sm">Watch Videos</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Explanation & Treatment</p>
                </div>
                <ExternalLink className="w-4 h-4 text-slate-300 ml-auto group-hover:text-red-400" />
             </a>

             <a 
               href={`https://www.google.com/search?q=${encodeURIComponent(searchTerm + " skin cancer information and images")}`}
               target="_blank"
               rel="noopener noreferrer"
               className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50/50 transition-all group"
             >
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-200 transition-colors">
                  <Search className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900 text-sm">Google Search</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Detailed Medical Info</p>
                </div>
                <ExternalLink className="w-4 h-4 text-slate-300 ml-auto group-hover:text-blue-400" />
             </a>
          </div>
        </div>

      </div>
    </div>
  );
};