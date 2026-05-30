import { Song, AppSettings } from "../types";
import { fetchLyricsWithGemini } from "./geminiService";

export const fetchLyricsFromLrcCx = async (title: string, artist: string): Promise<string> => {
    try {
        const query = new URLSearchParams({
            title,
            artist
        }).toString();

        const response = await fetch(`https://api.lrc.cx/lyrics?${query}`);
        if (!response.ok) throw new Error("Lrc.cx fetch failed");

        const lrc = await response.text();
        return lrc.trim();
    } catch (e) {
        console.error("[LyricService] lrc.cx error:", e);
        return "";
    }
};

export const fetchLyricsFromPaugram = async (neteaseId: string | number): Promise<string> => {
    try {
        const response = await fetch(`https://api.paugram.com/netease/?id=${neteaseId}`);
        if (!response.ok) throw new Error("Paugram fetch failed");

        const data = await response.json();
        return data.lyric || "";
    } catch (e) {
        console.error("[LyricService] Paugram error:", e);
        return "";
    }
};

export const fetchLyricsFromMeting = async (neteaseId: string | number): Promise<string> => {
    try {
        const response = await fetch(`https://api.qijieya.cn/meting/?server=netease&type=lrc&id=${neteaseId}`);
        if (!response.ok) throw new Error("Meting fetch failed");

        const lrc = await response.text();
        return lrc.trim();
    } catch (e) {
        console.error("[LyricService] Meting error:", e);
        return "";
    }
};

export const fetchLyrics = async (song: Song, settings: AppSettings): Promise<string> => {
    // 1. Try lrc.cx if selected or as a fallback
    if (settings.lyricSource === 'lrccx') {
        const lrccx = await fetchLyricsFromLrcCx(song.title, song.artist);
        if (lrccx) return lrccx;
    }

    // 2. Try Paugram if it's the chosen source
    if (settings.neteaseSource === 'paugram' && song.neteaseId) {
        const paugram = await fetchLyricsFromPaugram(song.neteaseId);
        if (paugram) return paugram;
    }

    // 3. Try Meting if it's the chosen source
    if (settings.neteaseSource === 'meting' && song.neteaseId) {
        const meting = await fetchLyricsFromMeting(song.neteaseId);
        if (meting) return meting;
    }

    // 3. Fallback to Gemini if selected
    if (settings.lyricSource === 'gemini') {
        return await fetchLyricsWithGemini(song);
    }

    return "No lyrics found.";
};
