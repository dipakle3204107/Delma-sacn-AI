import { AnalysisHistoryItem } from '../types';

const HISTORY_KEY_PREFIX = 'dermascan_history_';

export const historyService = {
  getHistory: (userEmail: string): AnalysisHistoryItem[] => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY_PREFIX + userEmail);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error("Failed to load history", e);
      return [];
    }
  },

  addHistoryItem: (userEmail: string, item: AnalysisHistoryItem): AnalysisHistoryItem[] => {
    try {
      const currentHistory = historyService.getHistory(userEmail);
      // Prepend new item
      const updatedHistory = [item, ...currentHistory];
      
      // Limit to last 50 items. 
      // Since we primarily use Supabase URLs now, the size footprint is small.
      const trimmedHistory = updatedHistory.slice(0, 50);
      
      localStorage.setItem(HISTORY_KEY_PREFIX + userEmail, JSON.stringify(trimmedHistory));
      return trimmedHistory;
    } catch (e) {
      console.warn("Failed to save history. Quota exceeded?", e);
      // Fallback: Try to save just the new item if quota is full
      try {
           const singleItemHistory = [item];
           localStorage.setItem(HISTORY_KEY_PREFIX + userEmail, JSON.stringify(singleItemHistory));
           return singleItemHistory;
       } catch (retryError) {
           console.error("Storage completely full", retryError);
           return [];
       }
    }
  },
  
  clearHistory: (userEmail: string) => {
    localStorage.removeItem(HISTORY_KEY_PREFIX + userEmail);
  }
};