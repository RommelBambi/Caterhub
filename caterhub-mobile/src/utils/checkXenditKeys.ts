/**
 * Diagnostic utility to check if Xendit keys are loaded correctly
 * Call this from your app to verify environment variables are working
 */

export function checkXenditKeys() {
  const publicKey = process.env.EXPO_PUBLIC_XENDIT_PUBLIC_KEY || '';
  const secretKey = process.env.XENDIT_SECRET_KEY || '';

  console.log('========================================');
  console.log('Xendit Keys Diagnostic');
  console.log('========================================');
  
  if (publicKey) {
    console.log('✅ Public Key found:', publicKey.substring(0, 20) + '...');
    console.log('   Key type:', publicKey.startsWith('xnd_public_development') ? 'TEST' : publicKey.startsWith('xnd_public_production') ? 'LIVE' : 'UNKNOWN');
  } else {
    console.error('❌ Public Key NOT FOUND');
    console.error('   Make sure your .env file has:');
    console.error('   EXPO_PUBLIC_XENDIT_PUBLIC_KEY=xnd_public_development_...');
  }

  if (secretKey) {
    console.log('✅ Secret Key found:', secretKey.substring(0, 20) + '...');
    console.log('   ⚠️ Note: Secret key should NOT be used in mobile app');
  } else {
    console.log('ℹ️  Secret Key not found (this is OK for mobile app)');
  }

  console.log('========================================');
  console.log('Environment Variables Check:');
  console.log('========================================');
  console.log('All EXPO_PUBLIC_ variables:', Object.keys(process.env).filter(k => k.startsWith('EXPO_PUBLIC_')));
  
  return {
    hasPublicKey: !!publicKey,
    hasSecretKey: !!secretKey,
    publicKeyType: publicKey.startsWith('xnd_public_development') ? 'TEST' : publicKey.startsWith('xnd_public_production') ? 'LIVE' : 'UNKNOWN',
  };
}
