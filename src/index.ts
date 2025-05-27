import http from 'http';
import app from './app';
import { connectDB } from './services/db';
import { intiSocket } from './services/socket';



const PORT = process.env.PORT || 4000;

connectDB()
  .then(() => {
    const server = http.createServer(app)
    const io = intiSocket(server);


    server.listen(PORT, () => console.log(`🚀  Server running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('DB connection failed:', err);
    process.exit(1);
  });
