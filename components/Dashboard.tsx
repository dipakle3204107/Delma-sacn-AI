import React, { useState, useEffect } from 'react';
import { User, AnalysisResult, AnalysisHistoryItem } from '../types';
import { ImageUpload } from './ImageUpload';
import { ResultCard } from './ResultCard';
import { analyzeSkinLesion } from '../services/geminiService';
import { historyService } from '../services/historyService';
import { Microscope, History, ArrowRight, Activity, Calendar, Clock, ChevronRight } from 'lucide-react';

interface DashboardProps {
  user: User;
}

export const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<AnalysisHistoryItem[]>([]);

  useEffect(() => {
    if (user.email) {
      const savedHistory = historyService.getHistory(user.email);
      setHistory(savedHistory);
    }
  }, [user.email]);

  // Helper to convert dataURL to File for restoring history
  const dataURLtoFile = (dataurl: string, filename: string): File => {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  };

  // Process image: Resize and Compress if necessary to handle large files
  const processImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Resize large images to max 1024px dimension to ensure API compatibility and Storage limits
          const MAX_DIMENSION = 1024;
          
          if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
             if (width > height) {
               height = Math.round((height * MAX_DIMENSION) / width);
               width = MAX_DIMENSION;
             } else {
               width = Math.round((width * MAX_DIMENSION) / height);
               height = MAX_DIMENSION;
             }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            reject(new Error("Canvas context not available"));
            return;
          }
          
          ctx.drawImage(img, 0, 0, width, height);
          
          // Compress to JPEG 0.85 quality
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          resolve(dataUrl);
        };
        
        img.onerror = () => reject(new Error("Failed to load image"));
      };
      
      reader.onerror = (error) => reject(error);
    });
  };

  const handleAnalyze = async () => {
    if (!selectedImage) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Use processImage instead of raw fileToBase64 to handle large files
      const base64 = await processImage(selectedImage);
      const analysis = await analyzeSkinLesion(base64);
      setResult(analysis);

      // Save to History
      const newHistoryItem: AnalysisHistoryItem = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        imageUrl: base64,
        result: analysis
      };

      const updatedHistory = historyService.addHistoryItem(user.email, newHistoryItem);
      setHistory(updatedHistory);

    } catch (err: any) {
      setError(err.message || 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setSelectedImage(null);
    setResult(null);
    setError(null);
  };

  const handleHistoryClick = (item: AnalysisHistoryItem) => {
    setResult(item.result);
    // Restore image file from stored base64
    const file = dataURLtoFile(item.imageUrl, `history-${item.id}.jpg`);
    setSelectedImage(file);
    setError(null);
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Patient Examination Dashboard</h1>
        <p className="text-slate-500 mt-1">
          Upload high-resolution dermatoscopic images for HAM10000-based classification.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Upload & Actions & History */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Microscope className="w-5 h-5 text-medical-600" />
              Image Acquisition
            </h2>
            
            <ImageUpload 
              onImageSelect={setSelectedImage} 
              selectedImage={selectedImage}
              onClear={handleClear}
            />

            {error && (
              <div className="mt-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
                {error}
              </div>
            )}

            <button
              onClick={handleAnalyze}
              disabled={!selectedImage || loading}
              className={`mt-6 w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white transition-all
                ${!selectedImage || loading 
                  ? 'bg-slate-300 cursor-not-allowed' 
                  : 'bg-medical-600 hover:bg-medical-700 hover:shadow-md'
                }`}
            >
              {loading ? 'Processing Image...' : 'Run Diagnostics'}
              {!loading && <ArrowRight className="ml-2 w-4 h-4" />}
            </button>
          </div>

          {/* History Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
             <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
               <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                 <History className="w-4 h-4 text-medical-600" />
                 Recent Scans
               </h3>
               <span className="text-xs text-slate-500">{history.length} Saved</span>
             </div>
             
             <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
               {history.length === 0 ? (
                 <div className="p-8 text-center text-slate-400 text-sm">
                   <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                   No recent history found
                 </div>
               ) : (
                 history.map((item) => (
                   <button 
                     key={item.id}
                     onClick={() => handleHistoryClick(item)}
                     className="w-full p-4 hover:bg-slate-50 transition-colors flex items-center gap-4 text-left group"
                   >
                     <div className="w-12 h-12 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0 border border-slate-200">
                       <img src={item.imageUrl} alt="scan" className="w-full h-full object-cover" />
                     </div>
                     <div className="flex-1 min-w-0">
                       <p className="text-sm font-medium text-slate-900 truncate">
                         {item.result.category}
                       </p>
                       <div className="flex items-center gap-2 mt-1">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${
                            item.result.severity === 'high' ? 'bg-red-50 text-red-700 border-red-100' :
                            item.result.severity === 'medium' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                            'bg-green-50 text-green-700 border-green-100'
                          }`}>
                            {item.result.confidence}% Conf.
                          </span>
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            {new Date(item.date).toLocaleDateString()}
                          </span>
                       </div>
                     </div>
                     <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-medical-500 transition-colors" />
                   </button>
                 ))
               )}
             </div>
          </div>

          <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100">
            <h3 className="text-indigo-900 font-semibold mb-2 text-sm">Best Practices</h3>
            <ul className="text-xs text-indigo-700 space-y-2 list-disc pl-4">
              <li>Ensure consistent lighting without glare.</li>
              <li>Center the lesion in the frame.</li>
              <li>Include a reference scale if possible.</li>
              <li>Avoid blurry or out-of-focus images.</li>
            </ul>
          </div>
        </div>

        {/* Right Column: Results */}
        <div className="lg:col-span-7">
          {result || loading ? (
            <ResultCard result={result!} loading={loading} />
          ) : (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-slate-400 p-8 text-center">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                <Activity className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="text-lg font-medium text-slate-600">No Analysis Results</h3>
              <p className="max-w-sm mt-2 text-sm">
                Upload a lesion image and click "Run Diagnostics" to see the AI classification based on the HAM10000 dataset.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};