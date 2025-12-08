import { GoogleGenAI } from "@google/genai";
import { Song } from "../types";

const getAIClient = () => {
  if (!process.env.API_KEY) {
    throw new Error("API Key not found");
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const fetchLyricsWithGemini = async (song: Song): Promise<string> => {
  try {
    const ai = getAIClient();
    const prompt = `Generate synchronized LRC lyrics for the song "${song.title}" by "${song.artist}". 
    Format STRICTLY as valid .LRC content. 
    If you don't know the exact timestamps, provide a best guess or just plain text lyrics formatted comfortably. 
    Do not wrap in markdown code blocks. Return ONLY the lyrics text.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text.trim();
  } catch (error) {
    console.error("Gemini Lyrics Error:", error);
    return "Could not fetch lyrics. Please check your API key or internet connection.";
  }
};

export const analyzeSongVibe = async (song: Song): Promise<string> => {
  try {
    const ai = getAIClient();
    const prompt = `Analyze the song "${song.title}" by "${song.artist}". 
    Provide a short, 2-sentence interesting fact or "vibe check" about this track suitable for a music player display.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text.trim();
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "Enjoy the music!";
  }
};
