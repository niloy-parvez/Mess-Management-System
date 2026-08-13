import fetch from 'node-fetch';

(async ()=>{
  const base = 'http://localhost:5000/api';
  try{
    console.log('Fetching CSRF token');
    const r = await fetch(base + '/csrf-token', { method: 'GET' } as any);
    const body = await r.json().catch(()=>({}));
    console.log('csrf-token response status', r.status, body);
    const sessionId = body?.sessionId;
    const token = body?.token;
    if (!sessionId || !token) {
      console.error('No sessionId/token from csrf endpoint');
      process.exit(1);
    }

    console.log('Attempting POST /expenses without Authorization but with CSRF headers to test middleware');
    const postRes = await fetch(base + '/expenses', ({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-ID': sessionId,
        'X-CSRF-Token': token,
      },
      body: JSON.stringify({ category: 'maintenance', amount: 2500, description: 'Test CSRF' }),
    } as any));
    const postBody = await postRes.json().catch(()=>({}));
    console.log('POST /expenses status', postRes.status, postBody);

    console.log('Now attempt POST without CSRF headers (should return 403 CSRF token missing)');
    const badPost = await fetch(base + '/expenses', ({ method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({category:'maintenance',amount:1}) } as any));
    const badBody = await badPost.json().catch(()=>({}));
    console.log('POST no csrf status', badPost.status, badBody);

  } catch (e:any) {
    console.error('ERR', e?.message || e);
    process.exit(1);
  }
})();
