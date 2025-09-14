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
        const { uid } = req.query;

        if (!uid) {
            return res.status(400).json({ 
                error: 'UID parameter is required',
                message: 'Silakan masukkan UID Genshin Impact' 
            });
        }

        // Validate UID format (should be 9 digits)
        if (!/^\d{9}$/.test(uid)) {
            return res.status(400).json({ 
                error: 'Invalid UID format',
                message: 'UID harus berupa 9 digit angka' 
            });
        }

        // Fetch from the Genshin UID checker API
        const apiUrl = `https://api.siputzx.my.id/api/check/genshin?uid=${uid}`;
        const response = await fetch(apiUrl, {
            headers: {
                'accept': '*/*'
            }
        });

        if (!response.ok) {
            if (response.status === 404) {
                return res.status(404).json({ 
                    error: 'UID not found',
                    message: 'UID tidak ditemukan atau tidak valid' 
                });
            }
            throw new Error(`External API error: ${response.status}`);
        }

        const data = await response.json();
        
        // Return the data as-is since it's already in the correct format
        res.status(200).json(data);

    } catch (error) {
        console.error('Genshin UID API Error:', error);
        res.status(500).json({ 
            error: 'Failed to fetch Genshin UID data',
            message: 'Gagal mengambil data UID Genshin Impact',
            details: error.message 
        });
    }
}
