const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';

app.use(cors({ origin: corsOrigin }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'heramb-demo-api', cors: corsOrigin });
});

app.get('/api/hello', (_req, res) => {
  res.json({
    message: 'Hello from Heramb demo backend!',
    deployedWith: 'heramb',
  });
});

app.listen(PORT, () => {
  console.log(`heramb-demo backend listening on ${PORT}`);
});
