import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { password } = await req.json();

    if (!password || typeof password !== 'string') {
      return new Response(
        JSON.stringify({ 
          error: 'Password is required',
          breached: false 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Checking password against Have I Been Pwned API');

    // Hash the password using SHA-1
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();

    // Use k-anonymity: send only first 5 chars of hash
    const hashPrefix = hashHex.substring(0, 5);
    const hashSuffix = hashHex.substring(5);

    console.log(`Checking hash prefix: ${hashPrefix}`);

    // Call Have I Been Pwned API with k-anonymity
    const response = await fetch(
      `https://api.pwnedpasswords.com/range/${hashPrefix}`,
      {
        headers: {
          'Add-Padding': 'true', // Additional security measure
        },
      }
    );

    if (!response.ok) {
      console.error('HIBP API error:', response.status);
      // If API fails, allow the password (fail open for availability)
      return new Response(
        JSON.stringify({ 
          breached: false,
          message: 'Password check service unavailable, proceeding with signup'
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const text = await response.text();
    const lines = text.split('\n');

    // Check if our hash suffix appears in the results
    let breachCount = 0;
    for (const line of lines) {
      const [suffix, count] = line.split(':');
      if (suffix.trim() === hashSuffix) {
        breachCount = parseInt(count.trim(), 10);
        break;
      }
    }

    if (breachCount > 0) {
      console.log(`Password found in ${breachCount} breaches`);
      return new Response(
        JSON.stringify({ 
          breached: true,
          count: breachCount,
          message: 'This password has been exposed in data breaches. Please choose a different password.'
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Password not found in breaches');
    return new Response(
      JSON.stringify({ 
        breached: false,
        message: 'Password is safe to use'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('Error in check-password-breach:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        breached: false // Fail open if there's an error
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
