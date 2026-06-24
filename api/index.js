// Vercel serverless entry point.
// Vercel sets VERCEL=1 automatically, so index.js skips app.listen() and exports app.
import app from "../server/src/index.js";
export default app;
