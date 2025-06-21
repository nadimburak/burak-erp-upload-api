// server.ts
import dotenv from 'dotenv';
import App from './app';

dotenv.config();

const PORT = parseInt(process.env.PORT || '3000', 10);
const app = new App();
app.start(PORT);