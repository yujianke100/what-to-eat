import fetch from 'node-fetch';

export default async function handler(req, res) {
    const { location, radius, type, keyword, key } = req.query;

    // Validate required query parameters
    if (!location || !radius || !type || !key) {
        console.error('Missing required query parameters:', req.query);
        return res.status(400).json({ error: 'Missing required query parameters' });
    }

    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${location}&radius=${radius}&type=${type}&keyword=${keyword || ''}&key=${key}`;

    try {
        const response = await fetch(url);

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Google API error: ${errorText}`);
            return res.status(response.status).json({ error: `Google API error: ${errorText}` });
        }

        const data = await response.json();
        res.status(200).json(data);
    } catch (error) {
        console.error('Error fetching data from Google Maps API:', error);
        res.status(500).json({ error: 'Failed to fetch data from Google Maps API' });
    }
}
