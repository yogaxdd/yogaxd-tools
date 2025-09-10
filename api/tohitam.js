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

  const { link } = req.query;

  if (!link) {
    return res.status(400).json({ error: 'Missing link parameter' });
  }

  try {
    // Proxy request to ferdev API
    const apiUrl = `https://api.ferdev.my.id/maker/tohitam?link=${encodeURIComponent(link)}&apikey=yogaapi28`;
    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    // Get the image buffer
    const imageBuffer = await response.arrayBuffer();
    
    // Set appropriate headers
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Content-Length', imageBuffer.byteLength);
    
    // Send the image
    res.status(200).send(Buffer.from(imageBuffer));

  } catch (error) {
    console.error('ToHitam proxy error:', error);
    res.status(500).json({ error: 'Failed to process image' });
  }
}
