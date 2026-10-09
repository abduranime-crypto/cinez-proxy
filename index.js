const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors()); // CORS error ko ye line hamesha ke liye khatam kar degi!

// Consumet API (FlixHQ provider) ko hit karne ka endpoint
app.get('/api/get-link', async (req, res) => {
    const tmdbId = req.query.id;      // TV show ka TMDB ID (Friends: 1668)
    const season = req.query.s;       // Season
    const episode = req.query.e;      // Episode
    const type = req.query.type || 'tv';

    if (!tmdbId || !season || !episode) {
        return res.status(400).json({ error: "Missing id, s, or e parameters" });
    }

    try {
        // STEP 1: TMDB ID se FlixHQ ka movie/show ID nikalo
        // (Consumet API ka format thoda complex hota hai, pehle search karna padta hai)
        const searchUrl = `https://api.consumet.org/movies/flixhq/friends`; // Hardcoded for demo, normally dynamic based on TMDB
        const searchResponse = await axios.get(searchUrl);
        const showData = searchResponse.data.results[0]; // Assume first result is correct

        if(!showData) throw new Error("Show not found on FlixHQ");

        // STEP 2: Show info fetch karo jisme seasons/episodes honge
        const infoUrl = `https://api.consumet.org/movies/flixhq/info?id=${showData.id}`;
        const infoResponse = await axios.get(infoUrl);

        // STEP 3: Sahi episode ka ID dhundo
        const episodesList = infoResponse.data.episodes;
        const targetEpisode = episodesList.find(ep => ep.season == season && ep.number == episode);

        if(!targetEpisode) throw new Error("Episode not found");

        // STEP 4: Episode ID se final streaming link nikalo
        const watchUrl = `https://api.consumet.org/movies/flixhq/watch?episodeId=${targetEpisode.id}&mediaId=${showData.id}`;
        const watchResponse = await axios.get(watchUrl);

        // Return successful links!
        res.json({
            success: true,
            sources: watchResponse.data.sources, // Isme .m3u8 links honge
            subtitles: watchResponse.data.subtitles
        });

    } catch (error) {
        console.error("Scraper Error:", error.message);
        res.status(500).json({ success: false, error: "Link fetch failed", details: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`CineZ Proxy is running on port ${PORT}`);
});
