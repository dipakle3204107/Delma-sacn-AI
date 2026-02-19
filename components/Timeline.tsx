import React from 'react';
import { AnalysisHistoryItem } from '../types';
import { Calendar, ChevronRight, Activity, ArrowUpRight } from 'lucide-react';

interface TimelineProps {
  history: AnalysisHistoryItem[];
  onSelect: (item: AnalysisHistoryItem) => void;
}

export const Timeline: React.FC<TimelineProps> = ({ history, onSelect }) => {
  if (history.length === 0) {
    return (
      <div className="p-8 text-center text-slate-400">
        <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>No history to display on timeline.</p>
      </div>
    );
  }

  return (
    <div className="relative border-l-2 border-slate-200 ml-4 space-y-8 py-4">
      {history.map((item, index) => (
        <div key={item.id} className="relative pl-6 group">
          {/* Timeline Dot */}
          <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-white shadow-sm transition-colors ${
            index === 0 ? 'bg-medical-500 ring-4 ring-medical-100' : 'bg-slate-300 group-hover:bg-medical-400'
          }`}></div>
          
          <button 
            onClick={() => onSelect(item)}
            className="w-full text-left bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-all hover:border-medical-200 group-hover:translate-x-1"
          >
             <div className="flex justify-between items-start mb-2">
               <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                 <Calendar className="w-3.5 h-3.5" />
                 {new Date(item.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
               </div>
               <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-medical-500" />
             </div>

             <div className="flex gap-4">
               <div className="w-20 h-20 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0 border border-slate-100">
                  <img src={item.imageUrl} alt="scan" className="w-full h-full object-cover" />
               </div>
               <div className="flex-1">
                 <h4 className="font-bold text-slate-900 leading-tight">{item.result.category}</h4>
                 <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        item.result.severity === 'high' ? 'bg-red-100 text-red-700' : 
                        item.result.severity === 'medium' ? 'bg-orange-100 text-orange-700' : 
                        'bg-green-100 text-green-700'
                    }`}>
                      {item.result.severity.toUpperCase()} Risk
                    </span>
                    <span className="text-xs text-slate-500">{item.result.confidence}% Conf.</span>
                 </div>
                 <p className="text-xs text-slate-500 mt-2 line-clamp-2">{item.result.description}</p>
               </div>
             </div>
          </button>
        </div>
      ))}
      
      <div className="relative pl-6">
         <div className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-slate-200"></div>
         <p className="text-xs text-slate-400 italic">Start of tracking</p>
      </div>
    </div>
  );
};