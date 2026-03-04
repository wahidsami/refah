/**
 * Next.js API Route to proxy images from backend
 * This bypasses CORS issues by serving images through Next.js
 * Backend origin from NEXT_PUBLIC_API_URL (e.g. http://localhost:5000 or https://api.rifah.sa)
 */

const BACKEND_ORIGIN = process.env.NEXT_PUBLIC_API_URL
    ? process.env.NEXT_PUBLIC_API_URL.replace(/\/api\/v1\/?$/, '')
    : 'http://localhost:5000';

export async function GET(
    request: Request,
    { params }: { params: { path: string[] } }
) {
    const resolvedParams = await Promise.resolve(params);
    const imagePath = resolvedParams.path.join('/');
    const backendUrl = BACKEND_ORIGIN;
    
    // The path already includes 'uploads/profiles/...' so don't add /uploads again
    const imageUrl = `${backendUrl}/${imagePath}`;

    console.log('Proxying image:', imageUrl);

    try {
        const response = await fetch(imageUrl);
        
        if (!response.ok) {
            console.error('Backend returned:', response.status, response.statusText);
            return new Response('Image not found', { status: 404 });
        }

        const imageBuffer = await response.arrayBuffer();
        const contentType = response.headers.get('content-type') || 'image/png';

        return new Response(imageBuffer, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=31536000, immutable',
            },
        });
    } catch (error) {
        console.error('Error proxying image:', error);
        return new Response('Error loading image', { status: 500 });
    }
}

