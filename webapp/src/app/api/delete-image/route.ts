import {cloudinary} from "@/lib/cloudinary";

export async function POST(request: Request) {
    const publicId = await request.json()
    try {
        await cloudinary.v2.uploader.destroy(publicId);
        return new Response(null, {status: 200})
    } catch (e) {
        console.log('Cloudinary delete failed', e)
        return new Response('Failed to delete', {status: 500})
    }
}