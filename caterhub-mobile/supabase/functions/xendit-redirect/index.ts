// // Supabase Edge Function for Xendit Redirect Handler
// // Deploy: supabase functions deploy xendit-redirect
// // @ts-ignore - Deno is available in Supabase Edge Functions runtime
// Deno.serve(async (req)=>{
//   // Handle CORS preflight
//   if (req.method === 'OPTIONS') {
//     return new Response('ok', {
//       headers: {
//         'Access-Control-Allow-Origin': '*',
//         'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
//         'Access-Control-Allow-Headers': 'Content-Type, Authorization'
//       }
//     });
//   }
//   try {
//     const url = new URL(req.url);
//     const status = url.searchParams.get('status');
//     const bookingId = url.searchParams.get('booking_id');
//     console.log('Xendit redirect received:', {
//       status,
//       bookingId
//     });
//     // Create a simple HTML page that redirects back to the app
//     const html = `
//       <!DOCTYPE html>
//       <html>
//         <head>
//           <meta charset="utf-8">
//           <meta name="viewport" content="width=device-width, initial-scale=1">
//           <title>Payment ${status === 'success' ? 'Successful' : 'Failed'}</title>
//           <style>
//             body {
//               font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
//               display: flex;
//               align-items: center;
//               justify-content: center;
//               min-height: 100vh;
//               margin: 0;
//               background: ${status === 'success' ? '#f0fdf4' : '#fef2f2'};
//             }
//             .container {
//               text-align: center;
//               padding: 40px;
//               background: white;
//               border-radius: 12px;
//               box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
//               max-width: 400px;
//             }
//             .icon {
//               font-size: 64px;
//               margin-bottom: 20px;
//             }
//             .success { color: #22c55e; }
//             .failed { color: #dc2626; }
//             h1 {
//               font-size: 24px;
//               margin: 0 0 12px 0;
//               color: #1e293b;
//             }
//             p {
//               color: #64748b;
//               margin: 0 0 24px 0;
//               line-height: 1.6;
//             }
//             .button {
//               display: inline-block;
//               padding: 12px 24px;
//               background: #FF8000;
//               color: white;
//               text-decoration: none;
//               border-radius: 8px;
//               font-weight: 600;
//               transition: background 0.2s;
//             }
//             .button:hover {
//               background: #e67300;
//             }
//             .info {
//               margin-top: 20px;
//               padding: 12px;
//               background: #f8fafc;
//               border-radius: 6px;
//               font-size: 14px;
//               color: #64748b;
//             }
//             .logo {
//               width: 80px;
//               height: 80px;
//               margin: 0 auto 20px;
//               background: #FF8000;
//               border-radius: 50%;
//               display: flex;
//               align-items: center;
//               justify-content: center;
//               color: white;
//               font-weight: bold;
//               font-size: 18px;
//             }
//           </style>
//         </head>
//         <body>
//           <div class="container">
//             <div class="logo">CH</div>
//             ${status === 'success' ? `
//               <div class="icon success">✓</div>
//               <h1>Payment Successful!</h1>
//               <p>Your deposit payment has been processed successfully via Xendit. You can now close this window and return to the CaterHub app.</p>
//             ` : `
//               <div class="icon failed">✗</div>
//               <h1>Payment Failed</h1>
//               <p>Unfortunately, your payment could not be processed. Please try again or contact support if the problem persists.</p>
//             `}
//             <div class="info">
//               ${status === 'success' ? 'Your booking is confirmed. Check your app for details.' : 'No charges were made to your account. You can try a different payment method.'}
//             </div>
//             <p style="margin-top: 24px; font-size: 14px;">
//               You can close this window now and return to CaterHub.
//             </p>
//           </div>
//           <script>
//             // Auto-close after 5 seconds
//             setTimeout(() => {
//               window.close();
//             }, 5000);
//             // Try to communicate with the app (if in webview)
//             if (window.ReactNativeWebView) {
//               window.ReactNativeWebView.postMessage(JSON.stringify({
//                 type: 'payment_redirect',
//                 status: '${status}',
//                 bookingId: '${bookingId}',
//                 provider: 'xendit'
//               }));
//             }
//             // Try to redirect to app deep link
//             setTimeout(() => {
//               const deepLink = 'caterhub://payment/${status}?bookingId=${bookingId}';
//               window.location.href = deepLink;
//             }, 2000);
//           </script>
//         </body>
//       </html>
//     `;
//     return new Response(html, {
//       headers: {
//         'Content-Type': 'text/html; charset=utf-8',
//         'Access-Control-Allow-Origin': '*'
//       }
//     });
//   } catch (error) {
//     console.error('Error in xendit-redirect:', error);
//     const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
//     return new Response(JSON.stringify({
//       error: errorMessage
//     }), {
//       status: 500,
//       headers: {
//         'Content-Type': 'application/json',
//         'Access-Control-Allow-Origin': '*'
//       }
//     });
//   }
// });
// Supabase Edge Function for Xendit Redirect Handler
// Deploy: supabase functions deploy xendit-redirect
// xendit-redirect/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};
serve(async (req)=>{
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    const url = new URL(req.url);
    const status = url.searchParams.get('status');
    const bookingId = url.searchParams.get('booking_id');
    console.log('Xendit redirect received:', {
      status,
      bookingId,
      method: req.method,
      url: req.url
    });
    // Supabase Edge Functions don't support HTML without custom domains
    // Return JSON with redirect instructions instead
    console.log('Payment redirect for mobile app:', { status, bookingId });
    
    const isSuccess = status === 'success';
    const redirectUrls = [
      `exp://127.0.0.1:19000/--/payment/${status}?bookingId=${bookingId}`,
      `caterhub://payment/${status}?bookingId=${bookingId}`,
      `exp://exp.host/@anonymous/caterhub-mobile/--/payment/${status}?bookingId=${bookingId}`
    ];
    
    // Return JSON response with redirect information
    const response = {
      success: true,
      payment_status: status,
      booking_id: bookingId,
      message: isSuccess 
        ? 'Payment successful! Your booking is confirmed.' 
        : 'Payment failed. No charges were made.',
      redirect_urls: redirectUrls,
      instructions: 'Please return to your CaterHub app to continue.',
      timestamp: new Date().toISOString()
    };
    
    return new Response(JSON.stringify(response), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  } catch (error) {
    console.error('Error in xendit-redirect:', error);
    return new Response(JSON.stringify({
      error: error.message || 'Internal server error'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
});
