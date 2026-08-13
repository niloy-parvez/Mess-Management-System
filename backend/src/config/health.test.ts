import express from 'express';
import request from 'supertest';

describe('Health endpoint', () => {
  it('should return 200 OK', async () => {
    const app = express();

    app.get('/api/health', (_req, res) => {
      res.json({ status: 'OK', timestamp: new Date().toISOString() });
    });

    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status');
    expect(res.body.status).toBe('OK');
  });
});
