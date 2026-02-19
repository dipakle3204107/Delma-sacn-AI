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
1. Actinic keratoses (akiec)
2. Basal cell carcinoma (bcc)
3. Benign keratosis-like lesions (bkl)
4. Dermatofibroma (df)
5. Melanoma (mel)
6. Melanocytic nevi (nv)
7. Vascular lesions (vasc)

If the image is NOT a skin lesion, classify it as "Unknown".

Analyze the visual features (asymmetry, border, color, diameter, evolution) and provide the output in the following JSON format.
CRITICAL: The "confidence" field MUST match the value of the highest category in "probabilities".

EXPLAINABLE AI (XAI) INSTRUCTIONS:
Identify the specific region of the image that contributes most to this diagnosis (e.g., irregular border, specific discoloration area, or the lesion center).
Return "heatmap_coords" with x, y (0-100 percentages from top-left) and radius (0-100 percentage of image width) to highlight the lesion area.

{
  "category": "The exact name of the category with the highest probability",
  "confidence": number (0-100),
  "probabilities": {
    "Melanoma": number (0-100),
    "Nevi": number (0-100),
    "Benign Keratosis": number (0-100),
    "Basal Cell Carcinoma": number (0-100),
    "Actinic keratoses": number (0-100),
    "Dermatofibroma": number (0-100),
    "Vascular lesions": number (0-100)
    // You MUST include probability scores for all relevant classes.
  },
  "description": "string (brief description of visual features)",
  "recommendation": "string",
  "severity": "one of: low, medium, high",
  "heatmap_coords": {
    "x": number,
    "y": number,
    "radius": number
  }
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

// Helper function to ensure data consistency
const normalizeAnalysisResult = (rawResult: any): AnalysisResult => {
  // 1. Sanitize Probabilities
  let probs: Record<string, number> = {};
  
  if (rawResult.probabilities) {
    // Normalize values to numbers (handle strings like "80%")
    for (const [key, val] of Object.entries(rawResult.probabilities)) {
      let numVal = 0;
      if (typeof val === 'string') {
        numVal = parseFloat((val as string).replace('%', ''));
      } else if (typeof val === 'number') {
        numVal = val;
      }
      
      // Normalize 0-1 scale to 0-100
      if (numVal > 0 && numVal <= 1) {
        numVal = numVal * 100;
      }
      
      probs[key] = Math.round(numVal * 10) / 10; // Round to 1 decimal place
    }
  } else {
    // Fallback if model didn't return probabilities
    probs = { [rawResult.category]: rawResult.confidence };
  }

  // 2. Find the mathematical winner
  let maxScore = -1;
  let winnerCategory = rawResult.category;

  // We loop through probabilities to find the actual highest number
  for (const [cat, score] of Object.entries(probs)) {
    if (score > maxScore) {
      maxScore = score;
      winnerCategory = cat;
    }
  }

  // 3. Force Consistency
  const finalCategory = winnerCategory;
  const finalConfidence = maxScore > 0 ? maxScore : (rawResult.confidence || 0);

  // 4. AI Confidence Calibration Safety Check
  // If confidence is below 60%, the model is uncertain. We explicitly flag this.
  let finalRecommendation = rawResult.recommendation || "Consult a dermatologist.";
  let finalSeverity = rawResult.severity || "low";

  if (finalConfidence < 60) {
    finalRecommendation = "UNCERTAIN RESULT — GET MEDICAL REVIEW. The AI confidence is low. This may be due to image quality, lighting, or complex lesion features. Clinical dermatoscopy is mandatory.";
    // We don't necessarily set severity to high, but we treat it seriously.
    // However, if the prediction was Benign but low confidence, we keep it as is but warn.
  }

  return {
    category: finalCategory as HAM10000Class, // Cast to enum
    confidence: finalConfidence,
    probabilities: probs,
    description: rawResult.description || "Analysis complete.",
    recommendation: finalRecommendation,
    severity: finalSeverity,
    heatmap: rawResult.heatmap_coords ? {
      x: rawResult.heatmap_coords.x,
      y: rawResult.heatmap_coords.y,
      radius: rawResult.heatmap_coords.radius || 30
    } : { x: 50, y: 50, radius: 30 } // Default center if model fails to coordinate
  };
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

    let rawAnalysis;
    try {
      rawAnalysis = JSON.parse(cleanedText);
    } catch (e) {
      console.error("Failed to parse AI response", e);
      throw new Error("Invalid response format from AI");
    }

    // Apply strict normalization to ensure Probability Distribution matches Confidence
    const consistentAnalysis = normalizeAnalysisResult(rawAnalysis);
    
    return consistentAnalysis;

  } catch (error) {
    console.error("AI Analysis Error:", error);
    throw new Error("Failed to analyze image. Please try again.");
  }
};

// --- Chat Service ---
export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export const chatWithHealthAssistant = async (
  currentMessage: string, 
  history: ChatMessage[], 
  contextResult?: AnalysisResult
): Promise<string> => {
  try {
    if (!process.env.API_KEY) {
      throw new Error("API Key not found.");
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Construct system context
    let systemPrompt = `You are "DermaBot", a helpful, empathetic medical AI assistant specialized in dermatology.
    Your goal is to explain skin cancer concepts, the ABCDE rule, and general skin health in simple, reassuring language.
    
    IMPORTANT SAFETY RULES:
    1. NEVER provide a definitive new diagnosis.
    2. ALWAYS recommend consulting a real doctor for medical advice.
    3. Keep answers concise (under 100 words) unless asked for details.
    `;

    if (contextResult) {
      systemPrompt += `
      
      CONTEXT: The user has just performed a scan with the following result:
      - Diagnosis: ${contextResult.category}
      - Confidence: ${contextResult.confidence}%
      - Severity: ${contextResult.severity}
      - Notes: ${contextResult.description}
      
      Use this context to answer questions about the specific result, but remind them it is an AI screening tool, not a biopsy.
      `;
    }

    const chat = ai.chats.create({
      model: 'gemini-3-flash-preview', // Good for conversational text
      config: {
        systemInstruction: systemPrompt,
      },
      history: history.map(h => ({
        role: h.role,
        parts: [{ text: h.text }]
      }))
    });

    const result = await chat.sendMessage({ message: currentMessage });
    return result.text;

  } catch (error) {
    console.error("Chat Error:", error);
    return "I'm having trouble connecting right now. Please try again later.";
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