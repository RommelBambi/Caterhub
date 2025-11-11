/**
 * Diagnostic utility to check if PayMongo keys are loaded correctly
 * Call this from your app to verify environment variables are working
 */

export function checkPayMongoKeys() {
  const publicKey = process.env.EXPO_PUBLIC_PAYMONGO_PUBLIC_KEY || '';
  const secretKey = process.env.PAYMONGO_SECRET_KEY || '';

  console.log('========================================');
  console.log('PayMongo Keys Diagnostic');
  console.log('========================================');
  
  if (publicKey) {
    console.log('✅ Public Key found:', publicKey.substring(0, 20) + '...');
    console.log('   Key type:', publicKey.startsWith('pk_test_') ? 'TEST' : publicKey.startsWith('pk_live_') ? 'LIVE' : 'UNKNOWN');
  } else {
    console.error('❌ Public Key NOT FOUND');
    console.error('   Make sure your .env file has:');
    console.error('   EXPO_PUBLIC_PAYMONGO_PUBLIC_KEY=pk_test_...');
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
    publicKeyType: publicKey.startsWith('pk_test_') ? 'TEST' : publicKey.startsWith('pk_live_') ? 'LIVE' : 'UNKNOWN',
  };
}

