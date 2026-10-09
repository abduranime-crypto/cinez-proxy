const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());

// THE REAL CINEZ ENGINE (No Test Videos)
app.get('/api/get-link', async (req, res) => {
    const { id, s, e } = req.query; // id=1668, s=1, e=1
    
    if (!id || !s || !e) {
        return res.status(400).json({ error: "Missing parameters" });
    }

    try {
        console.log(`[REAL ENGINE] Fetching Show ID: ${id} | S${s} E${e}`);
        
        // STEP 1: Consumet TMDB Provider se show ki info nikalo
        const searchUrl = `https://api.consumet.org/meta/tmdb/info/${id}?type=tv`;
        const { data } = await axios.get(searchUrl, { timeout: 8000 });
        
        // STEP 2: Sahi episode ka ID dhundo
        const episode = data.episodes?.find(ep => ep.season == s && ep.number == e);
        if (!episode) throw new Error("Episode not found in API");

        // STEP 3: Episode ID se Raw m3u8 Link nikalo
        const watchUrl = `https://api.consumet.org/meta/tmdb/watch/${episode.id}?id=${id}`;
        const watchRes = await axios.get(watchUrl, { timeout: 8000 });

        if (watchRes.data.sources && watchRes.data.sources.length > 0) {
            // Quality filter (Auto ya 1080p dhundo)
            const bestSource = watchRes.data.sources.find(src => src.quality === 'auto' || src.quality === '1080p') || watchRes.data.sources[0];
            
            return res.json({ 
                success: true, 
                provider: "Consumet_TMDB", 
                sources: [{ url: bestSource.url }] 
            });
        }
        
        throw new Error("No playable sources found");

    } catch (error) {
        console.error("[ENGINE FAILED]", error.message);
        // TEST VIDEO HATA DI HAI! Ab seedha error aayega taaki Iframes kaam karein.
        res.status(500).json({ success: false, error: "Raw link extraction failed. Boot Iframes!" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`CineZ Live Server running on port ${PORT}`);
});
