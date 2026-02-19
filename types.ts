export interface User {
  email: string;
  name: string;
}

export enum HAM10000Class {
  AKIEC = 'Actinic keratoses',
  BCC = 'Basal cell carcinoma',
  BKL = 'Benign keratosis-like lesions',
  DF = 'Dermatofibroma',
  MEL = 'Melanoma',
  NV = 'Melanocytic nevi',
  VASC = 'Vascular lesions',
  UNKNOWN = 'Unknown / Non-skin'
}

export interface AnalysisResult {
  category: HAM10000Class;
  confidence: number;
  probabilities?: Record<string, number>;
  description: string;
  recommendation: string;
  severity: 'low' | 'medium' | 'high';
  heatmap?: {
    x: number; // 0-100 percentage (center x)
    y: number; // 0-100 percentage (center y)
    radius: number; // 0-100 percentage (size of attention)
  };
}

export interface AnalysisHistoryItem {
  id: string;
  date: string;
  imageUrl: string;
  result: AnalysisResult;
}