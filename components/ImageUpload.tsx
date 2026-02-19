import React, { useCallback, useState, useRef, useEffect } from 'react';
import { Upload, X, Image as ImageIcon, Camera, SwitchCamera, Sun, CheckCircle, AlertCircle } from 'lucide-react';

interface ImageUploadProps {
  onImageSelect: (file: File) => void;
  selectedImage: File | null;
  onClear: () => void;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({ onImageSelect, selectedImage, onClear }) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [lightingStatus, setLightingStatus] = useState<'good' | 'dark' | 'bright' | 'checking'>('checking');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lightingCheckInterval = useRef<number | null>(null);

  useEffect(() => {
    // Cleanup stream on unmount
    return () => {
      stopCamera();
    };
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      handleFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    // 200MB Limit Check
    const MAX_SIZE_BYTES = 200 * 1024 * 1024;
    if (file.size > MAX_SIZE_BYTES) {
      alert('File size exceeds the maximum limit of 200MB.');
      return;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    onImageSelect(file);
  };

  const clearImage = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    onClear();
  };

  // --- AR & Camera Logic ---

  const checkLighting = () => {
    if (!videoRef.current) return;
    
    const canvas = document.createElement('canvas');
    canvas.width = 100; // Small sample size
    canvas.height = 100;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      // Draw center crop of video
      const vid = videoRef.current;
      ctx.drawImage(vid, vid.videoWidth/2 - 50, vid.videoHeight/2 - 50, 100, 100, 0, 0, 100, 100);
      
      const frame = ctx.getImageData(0, 0, 100, 100);
      const data = frame.data;
      let r, g, b, avg;
      let colorSum = 0;

      for (let x = 0, len = data.length; x < len; x += 4) {
        r = data[x];
        g = data[x + 1];
        b = data[x + 2];
        avg = Math.floor((r + g + b) / 3);
        colorSum += avg;
      }

      const brightness = Math.floor(colorSum / (100 * 100));
      
      if (brightness < 60) {
        setLightingStatus('dark');
      } else if (brightness > 220) {
        setLightingStatus('bright');
      } else {
        setLightingStatus('good');
      }
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCameraOpen(true);
      
      // Start AR analysis loop
      lightingCheckInterval.current = window.setInterval(checkLighting, 500);

    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Could not access camera. Please ensure permissions are granted and no other app is using it.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (lightingCheckInterval.current) {
      clearInterval(lightingCheckInterval.current);
      lightingCheckInterval.current = null;
    }
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], "camera-capture.jpg", { type: "image/jpeg" });
            handleFile(file);
            stopCamera();
          }
        }, 'image/jpeg', 0.95);
      }
    }
  };

  if (isCameraOpen) {
    return (
      <div className="w-full h-96 bg-black rounded-xl overflow-hidden relative flex flex-col items-center justify-center">
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          className="w-full h-full object-cover"
        />
        
        {/* AR Overlay Guide */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
           {/* Center Target Circle */}
           <div className={`w-64 h-64 border-2 rounded-full flex items-center justify-center transition-colors duration-300 ${
             lightingStatus === 'good' ? 'border-green-400 bg-green-400/10' : 'border-white/50 border-dashed'
           }`}>
              <div className="w-4 h-4 bg-white/50 rounded-full"></div>
           </div>
           
           {/* Guidelines */}
           <div className="absolute top-1/2 left-4 right-4 h-0 border-t border-white/20"></div>
           <div className="absolute left-1/2 top-4 bottom-4 w-0 border-l border-white/20"></div>
        </div>

        {/* Lighting Indicator */}
        <div className="absolute top-4 left-0 right-0 flex justify-center z-10">
           <div className={`px-4 py-2 rounded-full backdrop-blur-md flex items-center gap-2 text-sm font-medium transition-colors duration-300 ${
              lightingStatus === 'good' ? 'bg-green-500/80 text-white' : 
              lightingStatus === 'dark' ? 'bg-yellow-500/80 text-white' :
              lightingStatus === 'bright' ? 'bg-orange-500/80 text-white' :
              'bg-black/50 text-white'
           }`}>
              {lightingStatus === 'good' && <CheckCircle className="w-4 h-4" />}
              {lightingStatus === 'dark' && <Sun className="w-4 h-4" />}
              {lightingStatus === 'bright' && <Sun className="w-4 h-4" />}
              
              <span>
                {lightingStatus === 'good' ? 'Perfect Lighting' : 
                 lightingStatus === 'dark' ? 'Too Dark - Add Light' : 
                 lightingStatus === 'bright' ? 'Too Bright - Reduce Glare' : 'Checking...'}
              </span>
           </div>
        </div>

        {/* Instruction Text */}
        <div className="absolute top-16 text-white/80 text-xs bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm">
           Keep lesion inside the circle at 10cm distance
        </div>

        <div className="absolute bottom-6 flex items-center gap-6 z-10">
           <button 
             onClick={stopCamera}
             className="p-3 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white transition-all"
           >
             <X className="w-6 h-6" />
           </button>
           <button 
             onClick={capturePhoto}
             disabled={lightingStatus === 'checking'}
             className={`p-1 rounded-full border-4 transition-all ${lightingStatus === 'good' ? 'border-green-400' : 'border-white/50'}`}
           >
             <div className="w-14 h-14 bg-white rounded-full hover:scale-95 transition-transform"></div>
           </button>
           <div className="w-12"></div> {/* Spacer for balance */}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {!selectedImage ? (
        <div className="w-full">
           <div 
             onDragOver={handleDragOver}
             onDrop={handleDrop}
             className="flex flex-col items-center justify-center w-full h-72 border-2 border-slate-300 border-dashed rounded-xl bg-slate-50 hover:bg-slate-100 hover:border-medical-400 transition-all duration-200"
           >
             <div className="flex flex-col items-center justify-center pt-5 pb-6 text-slate-500 w-full">
               <div className="p-4 bg-white rounded-full shadow-sm mb-4">
                  <Upload className="w-8 h-8 text-medical-500" />
               </div>
               <p className="mb-1 text-sm font-medium text-slate-700">Drag & Drop Image</p>
               <p className="text-xs text-slate-400 mb-6">PNG, JPG (Max 200MB)</p>
               
               <div className="flex items-center gap-3 w-full px-8 justify-center">
                  <label className="flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-medical-600 rounded-lg cursor-pointer hover:bg-medical-700 transition-colors shadow-sm">
                    <ImageIcon className="w-4 h-4 mr-2" />
                    Upload File
                    <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                  </label>
                  <span className="text-xs font-semibold text-slate-400 uppercase">Or</span>
                  <button 
                    onClick={startCamera}
                    className="flex items-center justify-center px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    AR Camera
                  </button>
               </div>
             </div>
           </div>
        </div>
      ) : (
        <div className="relative w-full h-80 rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-black group">
          <img 
            src={previewUrl || ''} 
            alt="Lesion preview" 
            className="w-full h-full object-contain opacity-90"
          />
          <div className="absolute top-2 right-2">
            <button
              onClick={clearImage}
              className="p-2 bg-white/90 backdrop-blur-sm rounded-full text-slate-700 hover:text-red-600 hover:bg-white transition-colors shadow-md"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white p-3 text-xs flex justify-between items-center backdrop-blur-sm">
             <span className="truncate max-w-[70%]">{selectedImage.name}</span>
             <span className="opacity-80">{(selectedImage.size / (1024 * 1024)).toFixed(2)} MB</span>
          </div>
        </div>
      )}
    </div>
  );
};