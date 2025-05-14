const express = require('express');
const app = express();

// Add CORS headers to allow cross-origin requests
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*'); // Allow all origins
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS'); // Allow specific methods
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type'); // Allow specific headers
    next();
});

app.get('/proxy', async (req, res) => {
    const { mapProvider, location, radius, type, keyword, key } = req.query;

    let url;
    if (mapProvider === 'google') {
        url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${location}&radius=${radius}&type=${type}&keyword=${keyword || ''}&key=${key}`;
    } else if (mapProvider === 'amap') {
        url = `https://restapi.amap.com/v3/place/around?key=${key}&location=${location}&radius=${radius}&types=050000&keywords=${keyword || ''}`;
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