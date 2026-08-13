# Comprehensive Feature Testing Plan - 2026-07-22

**Objective:** Verify core authentication and dashboard functionality  
**Status:** In Progress  
**Date:** 2026-07-22

---

## Test 1: Registration Flow

### Manual Testing Steps
```
1. Open http://localhost:3000/register
2. Enter email: testuser@example.com
3. Enter password: TestPassword123!
4. Click Register button
5. Expected outcomes:
   - Success message appears
   - Redirect to login page
   - User created in Supabase Auth
   - No console errors
```

### What to Check
- [ ] Form displays correctly
- [ ] Email validation works
- [ ] Password validation works
- [ ] Submit button works
- [ ] Loading state shows during submission
- [ ] Success message displays
- [ ] Redirect happens after success
- [ ] No errors in browser console

---

## Test 2: Login Flow

### Manual Testing Steps
```
1. Go to http://localhost:3000/login
2. Enter email: testuser@example.com
3. Enter password: TestPassword123!
4. Click Login button
5. Expected outcomes:
   - JWT token generated
   - Token stored in localStorage
   - Redirect to dashboard
   - Authorization header set correctly
```

### What to Check
- [ ] Form displays correctly
- [ ] Credentials validation works
- [ ] Submit button works
- [ ] Loading state shows during submission
- [ ] JWT token generated and stored
- [ ] localStorage has authToken key
- [ ] Redirect happens to dashboard
- [ ] No console errors

---

## Test 3: Protected Route Access

### Manual Testing Steps
```
1. After login, verify dashboard accessible
2. Check URL: should be http://localhost:3000/dashboard
3. Verify page content loads
4. Check Network tab in DevTools
5. Expected outcomes:
   - Dashboard page loads
   - API requests include Authorization header
   - Status codes are correct
   - No 401 errors
```

### What to Check
- [ ] Dashboard page layout displays
- [ ] All navigation links appear
- [ ] No console errors
- [ ] API calls in Network tab
- [ ] Authorization header present
- [ ] Response status codes correct

---

## Test 4: Token Handling

### Verify Token in localStorage
```javascript
// Open browser console and check:
localStorage.getItem('authToken')  // Should return JWT token
localStorage.getItem('csrfSessionId')  // Should exist
localStorage.getItem('csrfToken')  // Should exist
```

### Verify Token in API Requests
```
1. Open DevTools (F12)
2. Go to Network tab
3. Make any API request
4. Click on request
5. Go to Headers tab
6. Check Authorization header
7. Expected: "Bearer <JWT_TOKEN>"
```

### Check Token Format
```
Valid JWT has format: header.payload.signature
Example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Test 5: Dashboard Access

### Manual Testing Steps
```
1. After login, dashboard should load
2. Check for any loading indicators
3. Wait for data to load
4. Verify no console errors
5. Check Network tab for API calls
```

### What to Check
- [ ] Dashboard page displays
- [ ] Navigation menu visible
- [ ] Layout renders correctly
- [ ] All widgets display (even if showing 0)
- [ ] No JavaScript errors
- [ ] API calls are working

---

## Test 6: Logout Flow

### Manual Testing Steps
```
1. Click Logout button (in header/menu)
2. Expected outcomes:
   - authToken removed from localStorage
   - Redirect to login page
   - Next access to /dashboard redirects to /login
```

### What to Check
- [ ] Logout button works
- [ ] localStorage cleaned (authToken removed)
- [ ] Redirect to login happens
- [ ] Cannot access /dashboard without logging back in

---

## Test 7: Protected Route Redirect

### Manual Testing Steps
```
1. Clear localStorage: localStorage.clear()
2. Reload page: F5
3. Try to access http://localhost:3000/dashboard
4. Expected: Redirect to http://localhost:3000/login
```

### What to Check
- [ ] Auto-redirect to login works
- [ ] User cannot access protected routes
- [ ] Message displayed explaining redirect

---

## Test 8: API Authentication

### Test with curl
```bash
# Test 1: Without token (should fail)
curl http://localhost:5000/api/auth/me

# Expected: 401 Unauthorized

# Test 2: With token (will need valid JWT)
curl -H "Authorization: Bearer <TOKEN>" \
  http://localhost:5000/api/auth/me

# Expected: 200 OK with user data
```

### Check Network Requests
```
1. Open Network tab
2. Navigate dashboard
3. Look at requests to:
   - /api/dashboard
   - /api/members
   - /api/meals
   - /api/market
4. Verify status codes and responses
```

---

## Test 9: Error Handling

### Test Invalid Credentials
```
1. Go to login
2. Enter wrong password
3. Expected: Error message
4. Check what error is displayed
```

### Test Empty Fields
```
1. Go to register
2. Leave fields empty
3. Click submit
4. Expected: Validation error messages
```

### Test Network Error
```
1. Stop backend
2. Try to login
3. Expected: Network error message
4. Restart backend and verify recovery
```

---

## Test 10: Browser Compatibility

### Check in Different Scenarios
- [ ] Firefox DevTools - All features work
- [ ] Chrome DevTools - All features work
- [ ] Edge DevTools - All features work
- [ ] Mobile viewport (F12 responsive) - Layout responsive

---

## Database Verification

### Check Supabase Dashboard
1. Go to https://app.supabase.com
2. Select project
3. Go to SQL Editor
4. Run queries:

```sql
-- Check users table (Supabase Auth)
SELECT COUNT(*) as total_users FROM auth.users;

-- Check if your test account exists
SELECT email, created_at FROM auth.users 
WHERE email = 'testuser@example.com';

-- Check public.users table if exists
SELECT * FROM public.users LIMIT 1;
```

---

## Performance Checks

### Load Time
```
1. Clear browser cache (or use Incognito)
2. Open DevTools
3. Go to Network tab
4. Filter: All
5. Reload page
6. Check:
   - Total page load time
   - Largest assets
   - Request counts
```

### API Response Times
```
1. Network tab
2. Filter: XHR/Fetch
3. Make API calls
4. Check response times
   - Should be < 500ms
   - Health check < 10ms
```

---

## Security Checks

### CORS Headers
```
1. Network tab
2. Filter: XHR/Fetch
3. Click on API request
4. Headers tab
5. Response Headers should show:
   - access-control-allow-origin: http://localhost:3000
   - access-control-allow-credentials: true
```

### HTTPS (for production)
- [ ] Plan SSL certificates
- [ ] HTTPS redirection
- [ ] Secure cookie flags

---

## Known Issues to Watch For

1. **Token Expiry**
   - After 7 days, token will expire
   - Need to re-login
   - (Optional: implement auto-refresh)

2. **CORS Issues**
   - If frontend on different URL, update CORS_ORIGIN
   - Restart backend after changing .env

3. **Database Not Updated**
   - If schema not deployed, API calls might fail
   - Check Supabase SQL migrations

4. **Port Already in Use**
   - Auto-fallback should handle it
   - Check console output for actual port

---

## Testing Checklist

### Phase 1: Basic Authentication (Today)
- [ ] Registration works
- [ ] Login works
- [ ] Token stored correctly
- [ ] Dashboard accessible
- [ ] Logout works

### Phase 2: API Integration (This Week)
- [ ] All API endpoints callable with token
- [ ] Without token, returns 401
- [ ] Response data format correct
- [ ] Error handling works

### Phase 3: Feature Testing (This Week)
- [ ] Members CRUD
- [ ] Meals CRUD
- [ ] Market CRUD
- [ ] Dashboard statistics
- [ ] Reports generation

### Phase 4: Production Readiness (Next Week)
- [ ] All tests passing
- [ ] Performance acceptable
- [ ] Security verified
- [ ] Documentation complete
- [ ] Ready to deploy

---

## Success Criteria

### Minimum (Must Have)
- [x] Backend running without errors
- [x] Frontend accessible
- [x] Authentication working
- [x] Protected routes enforced
- [ ] Dashboard loads without console errors
- [ ] At least one CRUD operation working

### Target (Should Have)
- [ ] All CRUD operations working
- [ ] Dashboard shows real data
- [ ] All modules functional
- [ ] No console errors or warnings
- [ ] All API calls working with auth

### Optimal (Nice to Have)
- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] Performance metrics good
- [ ] Mobile responsive
- [ ] Accessibility score high

---

## Next Actions

### If All Tests Pass:
1. ✅ Mark infrastructure complete
2. ✅ Move to feature testing
3. ✅ Plan deployment

### If Any Test Fails:
1. Document the failure
2. Check logs in console
3. Check backend logs
4. Check Network tab
5. Debug and fix
6. Re-run test

---

## Testing Tools

### Browser DevTools
- F12 to open
- Network tab for API calls
- Console tab for errors
- Storage tab for localStorage
- Application tab for cookies

### Postman (Optional)
- Import API collection
- Test endpoints directly
- Add Bearer token manually
- Test various scenarios

### Curl (Optional)
- Quick CLI testing
- Useful for API verification
- Easy token testing

---

## Notes

- Keep browser console open while testing
- Check Network tab for all requests
- Monitor backend logs for errors
- Test with both valid and invalid inputs
- Document any issues found
- Screenshot errors for reference

---

**Status:** Ready to Test  
**Start Date:** 2026-07-22  
**Expected Completion:** 2026-07-22  
**Priority:** HIGH

All tests should be completed today to move forward with feature implementation.
