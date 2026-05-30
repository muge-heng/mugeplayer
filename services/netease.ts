/**
 * Netease Cloud Music API Service for Muse.ai
 * Implements smart mirror fallback and data normalization.
 */

export const NETEASE_MIRRORS = [
    "https://netease-cloud-music-api-rho-sable.vercel.app",
    "https://music-api.heheda.top",
    "https://netease-cloud-music-api-lilac-six-11.vercel.app",
    "https://music.cyrilstudio.top"
];

export interface NeteaseSong {
    id: number | string;
    name: string;
    ar?: { name: string }[];
    artists?: { name: string }[];
    al?: { picUrl: string; name?: string };
    dt?: number; // Duration in ms
    url?: string; // Direct playback link if provided by API
    lrc?: string; // Lyrics URL or content if provided by API (Meting)
}

export const fetchPlaylistSongs = async (playlistId: string, customMirror?: string) => {
    let lastError = null;
    let mirrors = customMirror ? [customMirror, ...NETEASE_MIRRORS] : NETEASE_MIRRORS;

    // Meting API Special Case
    if (customMirror?.includes('meting')) {
        try {
            console.log(`[NeteaseService] Fetching from Meting API: ${customMirror}`);
            const response = await fetch(`${customMirror}?server=netease&type=playlist&id=${playlistId}`);
            const data = await response.json();
            const rawSongs = Array.isArray(data) ? data : (data.songs || data.data || []);

            if (Array.isArray(rawSongs)) {
                const normalizedSongs: NeteaseSong[] = rawSongs.map((s, idx) => ({
                    id: s.id || s.song_id || s.url_id || `meting-${playlistId}-${idx}`,
                    name: s.title || s.name || 'Unknown Title',
                    ar: [{ name: s.artist || s.author || (s.ar?.[0]?.name) || 'Unknown Artist' }],
                    al: { picUrl: s.pic || s.cover || s.img || (s.al?.picUrl), name: s.album || (s.al?.name) || 'Netease Album' },
                    dt: s.dt || 0,
                    url: s.url || s.link,
                    lrc: s.lrc
                }));

                return {
                    songs: normalizedSongs,
                    playlistName: data.name || `Meting-${playlistId}`,
                    mirrorUsed: customMirror
                };
            }
        } catch (error) {
            console.warn(`[NeteaseService] Meting API failed:`, error);
        }
    }

    for (const mirror of mirrors) {
        if (mirror.includes('meting')) continue;
        try {
            console.log(`[NeteaseService] Fetching from mirror: ${mirror}`);

            // Paugram Special Case
            if (mirror.includes('paugram.com')) {
                if (playlistId.length < 15) {
                    const resp = await fetch(`${mirror}?id=${playlistId}`);
                    const s = await resp.json();
                    if (s.id) {
                        const singleSong: NeteaseSong = {
                            id: s.id,
                            name: s.title,
                            ar: [{ name: s.artist }],
                            al: { picUrl: s.cover, name: s.album },
                            dt: 0,
                            url: s.link
                        };
                        return {
                            songs: [singleSong],
                            playlistName: "Single Download",
                            mirrorUsed: mirror
                        };
                    }
                }
            }

            let response = await fetch(`${mirror}/playlist/track/all?id=${playlistId}`).catch(() => null);

            if (!response || !response.ok) {
                response = await fetch(`${mirror}/playlist/detail?id=${playlistId}`);
            }

            const data = await response.json();
            const rawSongs = data.songs || (data.playlist && data.playlist.tracks);
            const playlistName = data.playlist?.name || `Netease-${playlistId}`;

            if (rawSongs && Array.isArray(rawSongs)) {
                return {
                    songs: rawSongs as NeteaseSong[],
                    playlistName,
                    mirrorUsed: mirror
                };
            }
        } catch (error) {
            console.warn(`[NeteaseService] Mirror ${mirror} failed:`, error);
            lastError = error;
            continue;
        }
    }

    throw lastError || new Error("All mirrors failed or invalid playlist ID");
};

export const getLyric = async (songId: number | string, mirror: string) => {
    try {
        let url = `${mirror}/lyric?id=${songId}`;

        if (mirror.includes('meting')) {
            url = `${mirror}?server=netease&type=lrc&id=${songId}`;
            const response = await fetch(url);
            return await response.text();
        }

        if (mirror.includes('paugram.com')) {
            url = mirror.endsWith('/') ? `${mirror}?id=${songId}` : `${mirror}/?id=${songId}`;
            const response = await fetch(url);
            const data = await response.json();
            return data.lyric || "";
        }

        const response = await fetch(url);
        const data = await response.json();
        return data.lrc?.lyric || "";
    } catch (e) {
        console.error("[NeteaseService] Failed to fetch lyrics:", e);
        return "";
    }
};

export const getSongUrl = async (songId: number | string, mirror?: string): Promise<string | undefined> => {
    try {
        if (!mirror) {
            // Default to official outer chain if no mirror provided
            return `https://music.163.com/song/media/outer/url?id=${songId}.mp3`;
        }

        console.log(`[NeteaseService] Fetching song URL for ${songId} from ${mirror}`);

        // Meting API Case
        if (mirror.includes('meting')) {
            const response = await fetch(`${mirror}?server=netease&type=url&id=${songId}`);
            const data = await response.json();
            return data.url || data.link || data.data?.[0]?.url;
        }

        // Paugram API Case
        if (mirror.includes('paugram.com')) {
            const response = await fetch(`${mirror}?id=${songId}`);
            const data = await response.json();
            return data.link || data.url;
        }

        // Official Mirror Case
        const response = await fetch(`${mirror}/song/url?id=${songId}`);
        const data = await response.json();
        return data.data?.[0]?.url;
    } catch (error) {
        console.warn(`[NeteaseService] Failed to get song URL from ${mirror}:`, error);
        // Fallback to official outer chain on error
        return `https://music.163.com/song/media/outer/url?id=${songId}.mp3`;
    }
};
