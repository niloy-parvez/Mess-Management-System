(async () => {
  const loginResp = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'debugtest+1@example.com', password: 'Password123!' })
  });
  const loginJson = await loginResp.json();
  console.log('LOGIN RAW:', JSON.stringify(loginJson, null, 2));
  const token = loginJson?.data?.token;
  if (!token) {
    console.error('No token in login response');
    process.exit(1);
  }

  // Acquire CSRF token
  const csrfResp = await fetch('http://localhost:5000/api/csrf-token', { method: 'GET' });
  const csrfJson = await csrfResp.json();
  const sessionId = csrfJson?.sessionId;
  const csrfToken = csrfJson?.token;
  console.log('CSRF:', csrfJson);

  // Call debug mapping endpoint to show JWT and DB mapping
  const debugResp = await fetch('http://localhost:5000/api/auth/debug/auth-map', { method: 'GET', headers: { Authorization: `Bearer ${token}` } });
  const debugJson = await debugResp.json();
  console.log('DEBUG MAPPING:', JSON.stringify(debugJson, null, 2));

  const resolveResp = await fetch('http://localhost:5000/api/auth/debug/resolve-created-by', { method: 'GET', headers: { Authorization: `Bearer ${token}` } });
  const resolveJson = await resolveResp.json();
  console.log('RESOLVE CREATED BY:', JSON.stringify(resolveJson, null, 2));

  const marketPayload = {
    items: [ { name: 'Rice', quantity: 10, price: 40 } ],
    description: 'Debug market entry',
    total_cost: 400,
  };

  const marketResp = await fetch('http://localhost:5000/api/market', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'x-session-id': sessionId, 'x-csrf-token': csrfToken },
    body: JSON.stringify(marketPayload)
  });
  const marketJson = await marketResp.json();
  console.log('MARKET RAW:', JSON.stringify(marketJson, null, 2));
})();
