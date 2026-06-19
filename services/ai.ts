import { Song } from "../types";

const DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions";

export interface TaggingResult {
    id: string;
    tags: string[];
}

export const analyzeSongsWithAi = async (
    songs: Song[],
    apiKey: string,
    availableTags: string[] = []
): Promise<TaggingResult[]> => {
    if (!apiKey) throw new Error("DeepSeek API Key is missing");

    // Format song data for the prompt
    // We only send title, artist, album, and first 200 chars of lyrics to save tokens
    const songData = songs.map(s => ({
        id: s.id,
        title: s.title,
        artist: s.artist,
        album: s.album,
        lyricsSnippet: s.lyrics ? s.lyrics.slice(0, 300) + "..." : "No lyrics available"
    }));

    const systemPrompt = `You are a professional music librarian and AI tagging expert. 
Your task is to analyze the provided music metadata and assign relevant tags (mood, genre, style, etc.).

IMPORTANT CONSTRAINTS:
1. Return ONLY a valid JSON array of objects.
2. Each object must have "id" (matching the input) and "tags" (an array of strings).
3. If lyrics are provided, note they are partial snippets.
4. Try to use existing tags from this list if applicable: [${availableTags.join(", ")}].
5. You can also create new, creative tags if the song demands it.
6. Max 5 tags per song.

Format Example:
[
  { "id": "123", "tags": ["Relaxing", "Acoustic", "Morning"] }
]`;

    const userPrompt = `Analyze the following ${songs.length} songs and provide tags:
${JSON.stringify(songData, null, 2)}`;

    try {
        const response = await fetch(DEEPSEEK_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "deepseek-v4-flash",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                response_format: { type: "json_object" }, // If the API supports it, otherwise parse manually
                temperature: 0.3
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || "DeepSeek API request failed");
        }

        const data = await response.json();
        const content = data.choices[0].message.content;

        // DeepSeek might return JSON wrapped in markdown blocks
        const jsonStr = content.replace(/```json\n?|\n?```/g, "").trim();
        const result = JSON.parse(jsonStr);

        // Ensure it's an array (sometimes models wrap it in a root object)
        return Array.isArray(result) ? result : result.songs || [];
    } catch (error) {
        console.error("AI Tagging Error:", error);
        throw error;
    }
};

/**
 * Batch processor to handle large number of songs without hitting token limits or timeouts.
 */
export const bulkAiTagging = async (
    songs: Song[],
    apiKey: string,
    availableTags: string[],
    onProgress?: (count: number) => void
): Promise<TaggingResult[]> => {
    const BATCH_SIZE = 5;
    const allResults: TaggingResult[] = [];

    for (let i = 0; i < songs.length; i += BATCH_SIZE) {
        const batch = songs.slice(i, i + BATCH_SIZE);
        try {
            const results = await analyzeSongsWithAi(batch, apiKey, availableTags);
            allResults.push(...results);
            if (onProgress) onProgress(Math.min(i + BATCH_SIZE, songs.length));
        } catch (e) {
            console.warn(`Failed to tag batch starting at index ${i}`, e);
        }
    }

    return allResults;
};
