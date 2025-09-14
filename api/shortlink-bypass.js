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
        const { url } = req.query;

        if (!url) {
            return res.status(400).json({ 
                error: 'URL parameter is required',
                message: 'Silakan masukkan URL shortlink yang ingin di-bypass' 
            });
        }

        // Validate URL format
        try {
            new URL(url);
        } catch (e) {
            return res.status(400).json({ 
                error: 'Invalid URL format',
                message: 'Format URL tidak valid' 
            });
        }

        // Fetch from the shortlink bypass API
        const apiUrl = `https://api.siputzx.my.id/api/tools/skiplink?url=${encodeURIComponent(url)}`;
        const response = await fetch(apiUrl, {
            headers: {
                'accept': '*/*'
            }
        });

        if (!response.ok) {
            if (response.status === 404) {
                return res.status(404).json({ 
                    error: 'URL not supported',
                    message: 'URL ini tidak didukung atau tidak dapat di-bypass' 
                });
            }
            throw new Error(`External API error: ${response.status}`);
        }

        const data = await response.json();
        
        // Return the data as-is since it's already in the correct format
        res.status(200).json(data);

    } catch (error) {
        console.error('Shortlink Bypass API Error:', error);
        res.status(500).json({ 
            error: 'Failed to bypass shortlink',
            message: 'Gagal mem-bypass shortlink',
            details: error.message 
        });
    }
}
