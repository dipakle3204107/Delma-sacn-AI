import { GoogleGenAI } from "@google/genai";
import { HAM10000Class, AnalysisResult } from "../types";

// In a real production app with a custom trained .h5 model, 
// this service would upload the image to a Python backend (Flask/Django/FastAPI)
// where the TensorFlow model is hosted. 
// For this client-side demo, we use Gemini 2.5 Flash Image to simulate the expert dermatologist analysis
// based on the HAM10000 dataset criteria.

const HAM10000_PROMPT = `
You are an expert dermatologist and oncologist AI assistant. 
Your task is to analyze the provided image of a skin lesion and classify it into one of the 7 categories defined in the HAM10000 dataset.

The 7 Categories are:
1. Actinic keratoses and intraepithelial carcinoma / Bowen's disease (akiec)
2. Basal cell carcinoma (bcc)
3. Benign keratosis-like lesions (bkl)
4. Dermatofibroma (df)
5. Melanoma (mel)
6. Melanocytic nevi (nv)
7. Vascular lesions (vasc)

If the image is NOT a skin lesion, classify it as "Unknown".

Analyze the visual features (asymmetry, border, color, diameter, evolution) and provide the output in the following JSON format:

{
  "category": "One of: Actinic keratoses, Basal cell carcinoma, Benign keratosis-like lesions, Dermatofibroma, Melanoma, Melanocytic nevi, Vascular lesions, Unknown / Non-skin",
  "confidence": number (0-100),
  "probabilities": {
    "Melanoma": number,
    "Nevi": number,
    "Benign Keratosis": number,
    "Basal Cell Carcinoma": number
    // Include top 4 most likely classes with their percentages (sum doesn't need to be 100, just relative confidence)
  },
  "description": "string (brief description of visual features)",
  "recommendation": "string",
  "severity": "one of: low, medium, high"
}

Return ONLY valid JSON. Do not include markdown code blocks.
`;

// Helper to generate a consistent integer seed from the image content
// This ensures that the same image always results in the same API response "randomness"
const getImageHash = (str: string): number => {
  let hash = 0;
  if (str.length === 0) return hash;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
};

export const analyzeSkinLesion = async (base64Image: string): Promise<AnalysisResult> => {
  try {
    if (!process.env.API_KEY) {
      throw new Error("API Key not found in environment variables.");
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    // Clean base64 string if it contains metadata header
    const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');
    
    // Generate a deterministic seed based on the image content
    const imageSeed = getImageHash(cleanBase64);

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image', // Efficient vision model
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: cleanBase64
            }
          },
          {
            text: HAM10000_PROMPT
          }
        ]
      },
      config: {
        temperature: 0, // Disable random sampling
        seed: imageSeed, // Fix the seed to the image content for reproducibility
      }
    });

    const resultText = response.text;
    if (!resultText) throw new Error("No response from AI model");

    // Clean potential markdown code blocks (```json ... ```)
    const cleanedText = resultText.replace(/```json\n?|\n?```/g, '').trim();

    const analysis = JSON.parse(cleanedText) as AnalysisResult;
    return analysis;

  } catch (error) {
    console.error("AI Analysis Error:", error);
    throw new Error("Failed to analyze image. Please try again.");
  }
};

export interface Clinic {
  name: string;
  address: string;
  rating: number;
  reviews: number;
  hours: string;
  phone: string;
  summary: string;
}

export interface ClinicResult {
  clinics: Clinic[];
  groundingChunks: any[];
}

export const findNearbyClinics = async (latitude: number, longitude: number): Promise<ClinicResult> => {
  try {
    if (!process.env.API_KEY) {
      throw new Error("API Key not found.");
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const prompt = `
      Find 3 top-rated dermatology clinics, skin cancer centers, or hospitals near the provided location.
      
      Return a JSON object with a key "clinics" containing an array of exactly 3 objects.
      Each object must have these exact keys:
      - name: string
      - address: string
      - rating: number (e.g., 4.5, use 0 if not available)
      - reviews: number (e.g., 120, use 0 if not available)
      - hours: string (e.g., "Open until 5 PM", "Closed", or "09:00 - 17:00")
      - phone: string (use "N/A" if not available)
      - summary: string (very short 5-8 word description of specialty)

      Ensure the data is accurate based on the Google Maps search.
      Return ONLY valid JSON. Do not include markdown formatting like \`\`\`json.
    `;

    // Use Gemini 2.5 Flash with Google Maps Grounding
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: {
          retrievalConfig: {
            latLng: {
              latitude: latitude,
              longitude: longitude
            }
          }
        }
      },
    });

    const resultText = response.text || "{}";
    const cleanText = resultText.replace(/```json\n?|\n?```/g, '').trim();
    
    let parsedClinics: Clinic[] = [];
    try {
      const parsed = JSON.parse(cleanText);
      parsedClinics = parsed.clinics || [];
    } catch (e) {
      console.warn("Failed to parse clinic JSON", e);
      // Fallback or empty array
    }

    return {
      clinics: parsedClinics,
      groundingChunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
    };

  } catch (error) {
    console.error("Location Search Error:", error);
    throw new Error("Failed to find nearby clinics.");
  }
};