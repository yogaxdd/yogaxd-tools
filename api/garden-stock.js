export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Fetch from the Grow a Garden API
        const apiUrl = 'https://api.ferdev.my.id/internet/growagarden?apikey=yogaapi28';
        const response = await fetch(apiUrl);

        if (!response.ok) {
            throw new Error(`External API error: ${response.status}`);
        }

        const data = await response.json();
        
        // Return the data as-is since it's already in the correct format
        res.status(200).json(data);

    } catch (error) {
        console.error('Garden Stock API Error:', error);
        res.status(500).json({ 
            error: 'Failed to fetch garden stock',
            details: error.message 
        });
    }
}
