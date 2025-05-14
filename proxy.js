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
    const { location, radius, type, keyword, key } = req.query;

    // Validate required query parameters
    if (!location || !radius || !type || !key) {
        console.error('Missing required query parameters:', req.query);
        return res.status(400).send('Missing required query parameters');
    }

    // Add language parameter for Chinese map information
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${location}&radius=${radius}&type=${type}&keyword=${keyword || ''}&key=${key}&language=zh-CN`;

    try {
        const response = await fetch(url); // Use global fetch

        // Log response status for debugging
        console.log(`Google API response status: ${response.status}`);

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Google API error: ${errorText}`);
            return res.status(response.status).send(`Google API error: ${errorText}`);
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Error fetching data from Google Maps API:', error);
        res.status(500).send('Error fetching data from Google Maps API');
    }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Proxy server running on port ${PORT}`));