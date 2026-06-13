import type { VercelRequest, VercelResponse } from '@vercel/node';

// Import the Express app from the server
let app: any = null;

async function getApp() {
  if (app) return app;
  
  try {
    // Dynamically import the server
    const { createServer } = await import('../server/_core/index');
    app = await createServer();
    return app;
  } catch (error) {
    console.error('Failed to initialize app:', error);
    throw error;
  }
}

export default async (req: VercelRequest, res: VercelResponse) => {
  try {
    const expressApp = await getApp();
    
    // Handle the request with Express
    return expressApp(req, res);
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
