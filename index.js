import express from 'express';
import cors from 'cors';
import { makeProviders, makeStandardFetcher } from '@movie-web/providers';

const app = express();
app.use(cors());

// Vercel server-side fetcher setup
const fetcher = makeStandardFetcher(fetch);
const providers = makeProviders({
    fetcher,
    target: 'server',
});

// Root check
app.get('/', (req, res) => {
    res.json({ status: "CineZ Vercel Engine is Online!" });
});

// Scraper Endpoint
app.get('/api/stream', async (req, res) => {
    const { id, s, e, imdb } = req.query; // s=season, e=episode, imdb=tt0108778

    if (!s || !e) {
        return res.status(400).json({ error: "Season and Episode required!" });
    }

    try {
        console.log(`[VERCEL ENGINE] Request received for S${s} E${e} (IMDb: ${imdb || id})`);

        // Media object for movie-web providers (Using IMDb to bypass India TMDB blocks)
        const media = {
            type: 'show',
            title: 'Friends',
            releaseYear: 1994,
            imdbId: imdb || "tt0108778",
            season: { number: parseInt(s) },
            episode: { number: parseInt(e) }
        };

        const streamRes = await providers.runAll({
            media: media,
            events: {
                start: (id) => console.log(`[PROVIDER START] ${id}`),
                update: (evt) => console.log(`[STATUS] ${evt.id}: ${evt.status}`),
            }
        });

        if (streamRes && streamRes.stream) {
            console.log("[SUCCESS] Stream found by Vercel backend!");
            return res.json({
                success: true,
                stream: streamRes.stream
            });
        } else {
            throw new Error("All providers exhausted. No streams found.");
        }

    } catch (error) {
        console.error("[SCRAPE ERROR]", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
