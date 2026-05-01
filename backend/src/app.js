require('dotenv').config();
const express = require('express');
const cors = require('cors');
const metaRoutes = require('./routes/meta');
const organisationRoutes = require('./routes/organisations');
const systemRoutes = require('./routes/systems');

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ data: { status: 'ok' }, error: null, meta: null });
});

app.use('/api/meta', metaRoutes);
app.use('/api/organisations', organisationRoutes);
app.use('/api/systems', systemRoutes);

module.exports = app;
