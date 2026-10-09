const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio'); // Yeh website ka HTML parse karega

const app = express();
app.use(cors());

// THE "CASTLE-STYLE" DIRECT EXTRACTOR
app.get('/api/extract', async (req, res) => {
    const { id, s, e } = req.query; // TMDB ID, Season, Episode

    if (!id || !s || !e) return res.status(400).json({ error: "Parameters missing bhai" });

    console.log(`[EXTRACTOR] Hunting S${s} E${e} for TMDB: ${id}`);

    try {
        // STEP 1: Bhes Badal Kar Jana (Spoofing)
        // Hum Vidsrc ko dikhayenge ki hum koi bot nahi, balki ek real Windows Google Chrome user hain.
        const targetUrl = `https://vidsrc.net/embed/tv?tmdb=${id}&season=${s}&episode=${e}`;
        
        const response = await axios.get(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
                'Referer': 'https://google.com/'
            }
        });

        // STEP 2: HTML ko Cheerio (Parser) mein load karna
        const $ = cheerio.load(response.data);
        
        // STEP 3: Page ke andar hidden elements dhundna
        // Vidsrc aksar apna player ek iframe ke andar chhipata hai. Hum usko dhund rahe hain.
        let iframeUrl = $('iframe').attr('src');
        
        // Agar iframe nahi mila, toh ho sakta hai unhone javascript ('token') ke andar link chhipaya ho.
        let secretToken = null;
        if (!iframeUrl) {
            const pageScripts = $('script').text();
            // Regex se token dhundne ki koshish
            const tokenMatch = pageScripts.match(/data-hash=['"]([^'"]+)['"]/);
            if(tokenMatch) {
                secretToken = tokenMatch[1];
            }
        }

        // Fix relative URLs (agar link // se shuru hota hai)
        if (iframeUrl && iframeUrl.startsWith('//')) {
            iframeUrl = 'https:' + iframeUrl;
        }

        // STEP 4: Asliyat dikhana
        // Yahan par Castle jaise apps us secretToken ko decrypt (AES/RC4) karke .m3u8 nikalte hain.
        res.json({
            success: true,
            message: "Scraping Operation Successful!",
            target_hit: targetUrl,
            extracted_data: {
                raw_iframe: iframeUrl || "No Iframe Found",
                encrypted_token: secretToken || "No Token Found"
            },
            next_step: "Is iframe ya token ko decrypt karke HLS link nikalna hoga."
        });

    } catch (error) {
        console.error("[SCRAPE FAILED]", error.message);
        res.status(500).json({ 
            success: false, 
            error: "Scraping Blocked! Cloudflare ne bot pakad liya ya IP ban kar di." 
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`CineZ Direct Extractor running on port ${PORT}`);
});
