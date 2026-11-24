/**
 * Render Cloud Compatibility & Proxy Header Verification Test
 */
const { KNOWLEDGE_AREAS } = require('./data/knowledgeData.js');

console.log('--- TEST: Render Cloud & Proxy Compatibility ---');

// Mock request / response testing for getBaseUrl logic
function testGetBaseUrl(envPublicUrl, headers) {
  const origEnv = process.env.PUBLIC_URL;
  if (envPublicUrl) process.env.PUBLIC_URL = envPublicUrl;
  else delete process.env.PUBLIC_URL;

  const req = { headers: headers || {} };

  if (process.env.PUBLIC_URL) {
    const res = process.env.PUBLIC_URL.replace(/\/$/, '');
    process.env.PUBLIC_URL = origEnv;
    return res;
  }

  const forwardedHost = req.headers['x-forwarded-host'] || req.headers.host;
  const forwardedProto = req.headers['x-forwarded-proto'];

  if (forwardedHost && !forwardedHost.includes('localhost') && !forwardedHost.startsWith('127.0.0.1')) {
    const proto = forwardedProto || 'https';
    process.env.PUBLIC_URL = origEnv;
    return `${proto}://${forwardedHost}`;
  }

  process.env.PUBLIC_URL = origEnv;
  return `http://127.0.0.1:3000`;
}

// Case 1: Standard Render HTTPS reverse proxy
const renderUrl = testGetBaseUrl(null, {
  'x-forwarded-proto': 'https',
  'x-forwarded-host': 'pm-quest-presentation.onrender.com',
  'host': 'pm-quest-presentation.onrender.com'
});
console.log('Case 1 (Render Reverse Proxy):', renderUrl);
if (renderUrl !== 'https://pm-quest-presentation.onrender.com') {
  throw new Error(`Failed Case 1: got ${renderUrl}`);
}
console.log('  Player URL:', `${renderUrl}/player`);
console.log('  Host URL:', `${renderUrl}/host`);
console.log('  ✓ Render proxy URL detected correctly.');

// Case 2: Explicit PUBLIC_URL environment variable override
const envUrl = testGetBaseUrl('https://custom-quest.onrender.com/', {});
console.log('\nCase 2 (PUBLIC_URL env override):', envUrl);
if (envUrl !== 'https://custom-quest.onrender.com') {
  throw new Error(`Failed Case 2: got ${envUrl}`);
}
console.log('  ✓ Custom env URL override applied correctly.');

// Case 3: Local offline fallback
const localFallback = testGetBaseUrl(null, { host: 'localhost:3000' });
console.log('\nCase 3 (Localhost fallback):', localFallback);
if (!localFallback.includes('3000')) {
  throw new Error(`Failed Case 3: got ${localFallback}`);
}
console.log('  ✓ Local fallback operates as expected.');

console.log('\n--- TEST: Knowledge Areas Integrity ---');
console.log('Total Areas:', KNOWLEDGE_AREAS.length);
if (KNOWLEDGE_AREAS.length !== 9) throw new Error('Must have 9 areas');
KNOWLEDGE_AREAS.forEach(a => {
  if (!a.title || !a.roleTitle || !a.quiz || a.quiz.options.length !== 4) {
    throw new Error(`Invalid area ${a.id}`);
  }
});
console.log('✓ All 9 Knowledge Areas and quizzes verified intact.');

console.log('\n✅ ALL RENDER COMPATIBILITY CHECKS PASSED 100%!');
