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
    console.log('Processing image with link:', link);
    
    // Proxy request to ferdev API
    const apiUrl = `https://api.ferdev.my.id/maker/tohitam?link=${encodeURIComponent(link)}&apikey=yogaapi28`;
    console.log('Calling API:', apiUrl);
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    console.log('API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API error response:', errorText);
      throw new Error(`API returned ${response.status}: ${errorText}`);
    }

    // Check if response is actually an image
    const contentType = response.headers.get('content-type');
    console.log('Response content-type:', contentType);
    
    if (!contentType || !contentType.startsWith('image/')) {
      const responseText = await response.text();
      console.error('Non-image response:', responseText);
      throw new Error('API did not return an image');
    }

    // Get the image buffer
    const imageBuffer = await response.arrayBuffer();
    console.log('Image buffer size:', imageBuffer.byteLength);
    
    // Set appropriate headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', imageBuffer.byteLength);
    res.setHeader('Cache-Control', 'no-cache');
    
    // Send the image
    res.status(200).send(Buffer.from(imageBuffer));

  } catch (error) {
    console.error('ToHitam proxy error:', error);
    res.status(500).json({ 
      error: 'Failed to process image',
      details: error.message,
      link: link
    });
  }
}
