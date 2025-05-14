const express = require('express');
const fetch = require('node-fetch'); // Ensure fetch is available
const app = express();

// Add CORS headers to allow cross-origin requests
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*'); // Allow all origins
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS'); // Allow specific methods
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type'); // Allow specific headers
    next();
});

app.get('/proxy', async (req, res) => {
    const { mapProvider, location, radius, type, keyword, key, maxPages = 1000 } = req.query;

    let url;
    if (mapProvider === 'google') {
        url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${location}&radius=${radius}&type=${type}&keyword=${keyword || ''}&key=${key}`;
    } else if (mapProvider === 'amap') {
        const results = [];
        let pageNum = 1;
        let hasMoreResults = true;

        while (hasMoreResults && pageNum <= maxPages) {
            const amapUrl = `https://restapi.amap.com/v5/place/around?key=${key}&location=${location}&radius=${radius}&type=餐饮服务&page_size=25&page_num=${pageNum}&keywords=${keyword || ''}`;
            try {
                const response = await fetch(amapUrl);
                const data = await response.json();

                if (data.status !== '1') {
                    console.error(`Amap API error: ${data.info}`);
                    return res.status(500).send(`Amap API error: ${data.info}`);
                }

                // Filter results where the first type is "餐饮服务"
                const filteredPois = data.pois.filter(poi => poi.type.split(';')[0] === '餐饮服务');
                results.push(...filteredPois);

                // Check if there are more results
                if (data.pois.length < 25) {
                    hasMoreResults = false; // No more results
                } else {
                    pageNum++;
                }
            } catch (error) {
                console.error('Error fetching data from Amap API:', error);
                return res.status(500).send('Error fetching data from Amap API');
            }
        }

        return res.json({ pois: results });
    } else {
        return res.status(400).send('Invalid map provider');
    }

    try {
        const response = await fetch(url);
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Error fetching data from map API:', error);
        res.status(500).send('Error fetching data from map API');
    }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Proxy server running on port ${PORT}`));