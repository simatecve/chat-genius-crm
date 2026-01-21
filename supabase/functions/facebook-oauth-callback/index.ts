import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const FACEBOOK_APP_ID = Deno.env.get('FACEBOOK_APP_ID')!
  const FACEBOOK_APP_SECRET = Deno.env.get('FACEBOOK_APP_SECRET')!
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  try {
    const url = new URL(req.url)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state') // Contains user_id
    const error = url.searchParams.get('error')
    const errorReason = url.searchParams.get('error_reason')

    console.log('OAuth callback received:', { code: !!code, state, error, errorReason })

    if (error) {
      console.error('OAuth error from Facebook:', error, errorReason)
      // Redirect to app with error
      return new Response(null, {
        status: 302,
        headers: {
          'Location': `https://conversacion-inteligente.lovable.app/settings?tab=sesiones&fb_error=${encodeURIComponent(error)}`,
        },
      })
    }

    if (!code || !state) {
      return new Response(JSON.stringify({ error: 'Missing code or state parameter' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // The redirect URI must match exactly what was used in the login dialog
    const redirectUri = `${SUPABASE_URL}/functions/v1/facebook-oauth-callback`

    // Exchange code for short-lived token
    const tokenUrl = `https://graph.facebook.com/v18.0/oauth/access_token?` +
      `client_id=${FACEBOOK_APP_ID}` +
      `&client_secret=${FACEBOOK_APP_SECRET}` +
      `&code=${code}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}`

    console.log('Exchanging code for token...')
    const tokenResponse = await fetch(tokenUrl)
    const tokenData = await tokenResponse.json()

    if (tokenData.error) {
      console.error('Error exchanging code for token:', tokenData.error)
      return new Response(null, {
        status: 302,
        headers: {
          'Location': `https://conversacion-inteligente.lovable.app/settings?tab=sesiones&fb_error=${encodeURIComponent(tokenData.error.message)}`,
        },
      })
    }

    const shortLivedToken = tokenData.access_token
    console.log('Got short-lived token')

    // Exchange for long-lived token
    const longLivedUrl = `https://graph.facebook.com/v18.0/oauth/access_token?` +
      `grant_type=fb_exchange_token` +
      `&client_id=${FACEBOOK_APP_ID}` +
      `&client_secret=${FACEBOOK_APP_SECRET}` +
      `&fb_exchange_token=${shortLivedToken}`

    console.log('Exchanging for long-lived token...')
    const longLivedResponse = await fetch(longLivedUrl)
    const longLivedData = await longLivedResponse.json()

    if (longLivedData.error) {
      console.error('Error getting long-lived token:', longLivedData.error)
      return new Response(null, {
        status: 302,
        headers: {
          'Location': `https://conversacion-inteligente.lovable.app/settings?tab=sesiones&fb_error=${encodeURIComponent(longLivedData.error.message)}`,
        },
      })
    }

    const userAccessToken = longLivedData.access_token
    console.log('Got long-lived token')

    // Get user's pages
    const pagesUrl = `https://graph.facebook.com/v18.0/me/accounts?` +
      `access_token=${userAccessToken}` +
      `&fields=id,name,access_token,category,instagram_business_account{id,username}`

    console.log('Fetching user pages...')
    const pagesResponse = await fetch(pagesUrl)
    const pagesData = await pagesResponse.json()

    if (pagesData.error) {
      console.error('Error fetching pages:', pagesData.error)
      return new Response(null, {
        status: 302,
        headers: {
          'Location': `https://conversacion-inteligente.lovable.app/settings?tab=sesiones&fb_error=${encodeURIComponent(pagesData.error.message)}`,
        },
      })
    }

    const pages = pagesData.data || []
    console.log('Found pages:', pages.length)

    // Store pages data temporarily in the database for the frontend to retrieve
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Create a temporary record to store the OAuth result
    const oauthResultId = crypto.randomUUID()
    
    // Store in a simple way - we'll use localStorage on the frontend via redirect params
    // Encode pages data as base64 for URL safety
    const pagesJson = JSON.stringify(pages.map((p: any) => ({
      id: p.id,
      name: p.name,
      access_token: p.access_token,
      category: p.category,
      instagram_account_id: p.instagram_business_account?.id,
      instagram_username: p.instagram_business_account?.username,
    })))
    
    const encodedPages = btoa(encodeURIComponent(pagesJson))

    // Redirect back to the app with the pages data
    const redirectUrl = `https://conversacion-inteligente.lovable.app/settings?tab=sesiones&fb_success=true&fb_pages=${encodedPages}&fb_user_id=${state}`
    
    console.log('Redirecting to app with pages data')
    return new Response(null, {
      status: 302,
      headers: {
        'Location': redirectUrl,
      },
    })
  } catch (error) {
    console.error('OAuth callback error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(null, {
      status: 302,
      headers: {
        'Location': `https://conversacion-inteligente.lovable.app/settings?tab=sesiones&fb_error=${encodeURIComponent(errorMessage)}`,
      },
    })
  }
})
