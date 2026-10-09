const express = require('express');
const cors = require('cors');
const axios = require('axios');
// Asli Sudo-Flix / Movie-Web Engine import kar rahe hain
const { makeProviders, makeStandardFetcher } = require('@movie-web/providers');

const app = express();
app.use(cors());

// Movie-Web Engine Setup
const fetcher = makeStandardFetcher(fetch);
const providers = makeProviders({
    fetcher,
    target: 'any', // Vercel (server) par chala rahe hain
});

app.get('/api/scrape', async (req, res) => {
    const { id, s, e } = req.query; // example: id=1668, s=1, e=1

    if (!id || !s || !e) {
        return res.status(400).json({ error: "Missing id, s, or e" });
    }

    try {
        console.log(`[MOVIE-WEB ENGINE] Starting attack on TMDB: ${id} | S${s} E${e}`);

        // STEP 1: Movie-Web ko exact IDs chahiye hoti hain. TMDB se nikalte hain.
        // TMDB ka free API key (publicly available for scraping tools)
        const tmdbUrl = `https://api.themoviedb.org/3/tv/${id}/season/${s}/episode/${e}?api_key=8d6d91941230817f7807d643736e8a49`;
        const showUrl = `https://api.themoviedb.org/3/tv/${id}?api_key=8d6d91941230817f7807d643736e8a49`;

        const [epRes, showRes] = await Promise.all([
            axios.get(tmdbUrl),
            axios.get(showUrl)
        ]);

        const epData = epRes.data;
        const showData = showRes.data;

        // STEP 2: Movie-Web ka Format Taiyar Karna
        const media = {
            type: 'show',
            title: showData.name,
            releaseYear: parseInt(showData.first_air_date.split('-')[0]),
            tmdbId: id.toString(),
            season: {
                number: parseInt(s),
                tmdbId: epData.season_number.toString()
            },
            episode: {
                number: parseInt(e),
                tmdbId: epData.id.toString()
            }
        };

        console.log("[MOVIE-WEB ENGINE] Target Locked! Unleashing Providers...");

        // STEP 3: Asli Scraping Shuru (Run All Scrapers)
        let finalStream = null;

        // runAll() saare scrapers ko ek sath daudata hai
        const stream = await providers.runAll({
            media: media,
            events: {
                init: (evt) => console.log(`Initializing:`, evt.sourceIds),
                start: (id) => console.log(`[ATTACK] Started scraper: ${id}`),
                update: (evt) => console.log(`[STATUS] ${evt.id}: ${evt.status}`),
                discoverEmbeds: (evt) => console.log(`[EMBED FOUND] ${evt.id}`),
            }
        });

        if (stream && stream.stream) {
            console.log("[SUCCESS] Movie-Web Engine ne stream faad li!");
            finalStream = stream.stream;
        }

        if (finalStream) {
            return res.json({
                success: true,
                provider: "Movie-Web_Sudo-Flix",
                stream: finalStream
            });
        } else {
            throw new Error("Movie-Web engine exhausted all providers. No link found.");
        }

    } catch (error) {
        console.error("[FATAL ERROR]", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`CineZ Movie-Web Server running on port ${PORT}`);
});
