import fs from 'node:fs';
import path from 'node:path';
import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  // Security check: Only allow this in dev mode!
  if (!import.meta.env.DEV) {
    return new Response(JSON.stringify({ error: 'Unauthorized: Can only write to disk in local development mode.' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const data = await request.json();
    
    // Write Tour Data
    if (data.tour) {
      const tourPath = path.resolve('./src/data/tour.json');
      fs.writeFileSync(tourPath, JSON.stringify(data.tour, null, 2));
    }
    
    // Write Audio Data
    if (data.audio) {
      const audioPath = path.resolve('./src/data/audio.json');
      fs.writeFileSync(audioPath, JSON.stringify(data.audio, null, 2));
    }
    
    return new Response(JSON.stringify({ success: true, message: 'Data saved successfully.' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
