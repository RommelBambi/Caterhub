/**
 * Comprehensive Environment Variables Diagnostic Tool
 * Run this to check if .env variables are loaded correctly
 */

export function diagnoseEnvironment() {
  console.log('========================================');
  console.log('🔍 ENVIRONMENT VARIABLES DIAGNOSTIC');
  console.log('========================================\n');

  // Check Xendit Public Key
  const publicKey = process.env.EXPO_PUBLIC_XENDIT_PUBLIC_KEY;
  const secretKey = process.env.XENDIT_SECRET_KEY;

  console.log('1️⃣ Xendit Keys:');
  console.log('   ──────────────────────────────────');
  
  if (publicKey) {
    console.log('   ✅ EXPO_PUBLIC_XENDIT_PUBLIC_KEY: FOUND');
    console.log(`      Value: ${publicKey.substring(0, 20)}...`);
    console.log(`      Type: ${publicKey.startsWith('xnd_public_development') ? 'TEST' : publicKey.startsWith('xnd_public_production') ? 'LIVE' : 'UNKNOWN FORMAT'}`);
    console.log(`      Length: ${publicKey.length} characters`);
  } else {
    console.log('   ❌ EXPO_PUBLIC_XENDIT_PUBLIC_KEY: NOT FOUND');
    console.log('      ⚠️  This is REQUIRED for payments to work!');
    console.log('      📝 Create .env file in project root with:');
    console.log('         EXPO_PUBLIC_XENDIT_PUBLIC_KEY=xnd_public_development_your_key_here');
  }

  if (secretKey) {
    console.log('   ⚠️  XENDIT_SECRET_KEY: FOUND in mobile app');
    console.log('      ⚠️  WARNING: Secret key should NOT be in mobile app!');
    console.log('      📝 Secret key is only for backend/webhooks');
    console.log('      ✅ Remove it from .env - it\'s a security risk!');
  } else {
    console.log('   ✅ XENDIT_SECRET_KEY: Not found (CORRECT for mobile app)');
    console.log('      ℹ️  Secret key is only needed for:');
    console.log('         - Supabase Edge Functions (webhooks)');
    console.log('         - Backend server operations');
    console.log('      ✅ Mobile app only needs PUBLIC key');
  }

  console.log('\n2️⃣ All EXPO_PUBLIC_ Variables:');
  console.log('   ──────────────────────────────────');
  const expoPublicVars = Object.keys(process.env).filter(k => k.startsWith('EXPO_PUBLIC_'));
  if (expoPublicVars.length > 0) {
    expoPublicVars.forEach(key => {
      const value = process.env[key];
      const preview = value ? (value.length > 30 ? value.substring(0, 30) + '...' : value) : 'undefined';
      console.log(`   ✅ ${key}: ${preview}`);
    });
  } else {
    console.log('   ❌ No EXPO_PUBLIC_ variables found!');
    console.log('      ⚠️  This means .env file is not being loaded');
  }

  console.log('\n3️⃣ Environment Info:');
  console.log('   ──────────────────────────────────');
  console.log(`   Platform: ${process.env.EXPO_PUBLIC_PROJECT_ROOT ? 'Expo' : 'Unknown'}`);
  console.log(`   Node Env: ${process.env.NODE_ENV || 'Not set'}`);
  console.log(`   Total env vars: ${Object.keys(process.env).length}`);

  console.log('\n4️⃣ Recommendations:');
  console.log('   ──────────────────────────────────');
  
  if (!publicKey) {
    console.log('   ❌ CRITICAL: Xendit Public Key is missing!');
    console.log('   📝 Action Required:');
    console.log('      1. Create .env file in project root');
    console.log('      2. Add: EXPO_PUBLIC_XENDIT_PUBLIC_KEY=xnd_public_development_...');
    console.log('      3. Restart Expo server (npm start)');
    console.log('      4. Check console logs again');
  } else if (!publicKey.startsWith('xnd_public_development') && !publicKey.startsWith('xnd_public_production')) {
    console.log('   ⚠️  WARNING: Public key format looks incorrect');
    console.log('      Should start with xnd_public_development or xnd_public_production');
  } else {
    console.log('   ✅ Xendit configuration looks good!');
    console.log('   ✅ You should be able to process payments');
  }

  console.log('\n========================================');
  console.log('End of Diagnostic');
  console.log('========================================\n');

  return {
    hasPublicKey: !!publicKey,
    hasSecretKey: !!secretKey,
    publicKeyType: publicKey?.startsWith('xnd_public_development') ? 'TEST' : publicKey?.startsWith('xnd_public_production') ? 'LIVE' : 'UNKNOWN',
    allExpoPublicVars: expoPublicVars,
    isValid: !!publicKey && (publicKey.startsWith('xnd_public_development') || publicKey.startsWith('xnd_public_production')),
  };
}

