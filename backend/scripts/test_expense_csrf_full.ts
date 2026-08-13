import fetch from 'node-fetch';
import jwt from 'jsonwebtoken';
import config from '../src/config';

(async ()=>{
  const base = 'http://localhost:5000/api';
  try{
    // Build admin JWT for existing admin user
    const adminId = '15cb42f7-1e50-49ad-b56c-359dca9004e4';
    const token = jwt.sign({ id: adminId, email: 'loginfix.admin.1786567055623@example.com', role: 'admin' }, (config as any).jwtSecret || 'your-secret-key');

    console.log('Generated admin JWT');

    // Get CSRF token
    const r = await fetch(base + '/csrf-token' , { method: 'GET' } as any);
    const body = await r.json().catch(()=>({}));
    const sessionId = body?.sessionId;
    const csrfToken = body?.token;
    console.log('csrf', sessionId, csrfToken);

    if (!sessionId || !csrfToken) { console.error('No csrf'); process.exit(1); }

    // Create expense
    console.log('Creating expense');
    const createRes = await fetch(base + '/expenses', ({ method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token, 'X-Session-ID': sessionId, 'X-CSRF-Token': csrfToken }, body: JSON.stringify({ category: 'maintenance', amount: 2500, description: 'Test admin expense via API' }) } as any));
    const createBody = await createRes.json().catch(()=>({}));
    console.log('create status', createRes.status, createBody);
    if (!createRes.ok) process.exit(1);
    const created = createBody?.data || createBody;
    const id = created?.id || (created && created[0] && created[0].id);
    console.log('created id', id);

    // Edit expense
    console.log('Editing expense');
    const editRes = await fetch(base + '/expenses/' + id, ({ method: 'PATCH', headers: { 'Content-Type':'application/json','Authorization': 'Bearer ' + token, 'X-Session-ID': sessionId, 'X-CSRF-Token': csrfToken }, body: JSON.stringify({ category: 'maintenance', amount: 2600, description: 'Updated by test' }) } as any));
    const editBody = await editRes.json().catch(()=>({}));
    console.log('edit status', editRes.status, editBody);

    // Delete expense
    console.log('Deleting expense');
    const delRes = await fetch(base + '/expenses/' + id, ({ method: 'DELETE', headers: { 'Authorization': 'Bearer ' + token, 'X-Session-ID': sessionId, 'X-CSRF-Token': csrfToken } } as any));
    const delBody = await delRes.json().catch(()=>({}));
    console.log('delete status', delRes.status, delBody);

  } catch (e:any) { console.error('ERR', e?.message || e); process.exit(1); }
})();
