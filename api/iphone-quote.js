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
        const { time, messageText, carrierName, batteryPercentage, signalStrength } = req.query;

        if (!messageText) {
            return res.status(400).json({ error: 'messageText parameter is required' });
        }

        // Build the external API URL
        const apiUrl = `https://brat.siputzx.my.id/iphone-quoted?` +
            `time=${encodeURIComponent(time || '11:26')}&` +
            `messageText=${encodeURIComponent(messageText)}&` +
            `carrierName=${encodeURIComponent(carrierName || 'XL OOREDOO')}&` +
            `batteryPercentage=${encodeURIComponent(batteryPercentage || '88')}&` +
            `signalStrength=${encodeURIComponent(signalStrength || '4')}&` +
            `emojiStyle=apple`;

        // Fetch from external API
        const response = await fetch(apiUrl);

        if (!response.ok) {
            throw new Error(`External API error: ${response.status}`);
        }

        // Get the image buffer
        const imageBuffer = await response.arrayBuffer();
        
        // Set appropriate headers for image response
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Content-Length', imageBuffer.byteLength);
        
        // Send the image
        res.status(200).send(Buffer.from(imageBuffer));

    } catch (error) {
        console.error('iPhone Quote API Error:', error);
        res.status(500).json({ 
            error: 'Failed to generate iPhone quote',
            details: error.message 
        });
    }
}
