
import { GoogleGenAI } from "@google/genai";
import type { GeneratedMusic } from '../types';

const MIN_MUSIC_LENGTH_SECONDS = 150; // Minimum length for generated music

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
    console.error("VITE_GEMINI_API_KEY environment variable is not set. Please ensure it is configured correctly.");
    throw new Error("VITE_GEMINI_API_KEY environment variable is missing or invalid. Please configure your API key to use the Gemini API.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

function parseAbcResponse(abcText: string): { title: string; abcNotation: string } {
  // Clean up markdown code blocks if the model includes them
  let cleanedAbc = abcText.replace(/```(abc)?|```/g, '').trim();

  let title = "Untitled Composition";
  const titleMatch = cleanedAbc.match(/^T:\s*(.*)$/m);
  if (titleMatch && titleMatch[1]) {
    title = titleMatch[1];
  } else {
    // If no title, add a default
    cleanedAbc = `T:Untitled Composition\n${cleanedAbc}`;
    title = "Untitled Composition";
  }
  
  // Ensure X:1 is present, as it's required by abcjs
  if (!cleanedAbc.match(/^X:\s*1$/m)) {
    cleanedAbc = `X:1\n${cleanedAbc}`;
  }

  // Ensure K: is present
  if (!cleanedAbc.match(/^K:\s*.*\n/m)) {
    cleanedAbc = cleanedAbc.replace(/(^X:.*)/m, `$1\nK:C`);
  }

  // Ensure M: is present
  if (!cleanedAbc.match(/^M:\s*.*\n/m)) {
    cleanedAbc = cleanedAbc.replace(/(^X:.*)/m, `$1\nM:4/4`);
  }

  // Ensure Q: is present
  if (!cleanedAbc.match(/^Q:\s*.*\n/m)) {
    cleanedAbc = cleanedAbc.replace(/(^X:.*)/m, `$1\nQ:1/4=120`);
  }

  // Ensure there's at least one barline or some notes, if not, add a simple one
  if (!cleanedAbc.match(/\|/) && !cleanedAbc.match(/[a-gA-G]/)) {
    console.warn("Generated ABC had no discernible musical content. Appending a placeholder.");
    cleanedAbc += "\nC |"; // Add a simple C note in a bar
  }

  return { title, abcNotation: cleanedAbc };
}

export async function generateMusic(prompt: string): Promise<GeneratedMusic> {
  const textModel = 'gemini-3-flash-preview'; // Only need text model

  const musicPrompt = `You are an expert music composer specializing in ABC notation. Generate a single-voice instrumental melody in ABC notation based on the following theme: "${prompt}". The melody should be at least ${MIN_MUSIC_LENGTH_SECONDS} seconds long. Respond ONLY with the complete ABC notation code, starting with 'X:1'. You must include a title line (T:), a key line (K:), a meter line (M:), and a tempo line (Q:). Do not include any explanations, comments, or markdown formatting. Your entire response must be valid ABC notation.`;

  // Make only one API call for music generation
  const musicResponse = await ai.models.generateContent({
    model: textModel,
    contents: musicPrompt,
  });

  const musicText = musicResponse.text;
  if (!musicText) {
    throw new Error("Music generation failed to return any text.");
  }

  const { title, abcNotation } = parseAbcResponse(musicText);

  return {
    title,
    abcNotation,
  };
}
