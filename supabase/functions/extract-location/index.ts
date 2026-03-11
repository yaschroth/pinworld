import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

import { createClient} from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Verify user authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Check if user can extract (usage limits)
    const { data: usageCheck, error: checkError } = await supabase
      .rpc('can_user_extract', { p_user_id: user.id })
      .single()

    if (checkError) {
      console.error('Usage check error:', checkError)
      // If check fails, allow extraction (fail open for now)
    } else if (!usageCheck?.can_extract) {
      return new Response(
        JSON.stringify({
          error: 'extraction_limit_reached',
          message: 'Monthly extraction limit reached. Upgrade to Pro for unlimited extractions.',
          current_count: usageCheck?.current_count || 0,
          monthly_limit: usageCheck?.monthly_limit || 5,
          tier: usageCheck?.tier || 'free'
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { url, description } = await req.json()

    if (!url && !description) {
      return new Response(
        JSON.stringify({ error: 'URL or description is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let pageContent = ''
    let extractedTitle = ''
    let extractedLocation = ''

    // Try to fetch content based on URL type
    if (url) {
      const urlType = detectUrlType(url)
      console.log(`Detected URL type: ${urlType}`)

      try {
        if (urlType === 'instagram') {
          // Always try Reel scraper first (includes transcript for video content)
          // This works for both /reel/ URLs and /p/ URLs that are actually videos
          const data = await fetchInstagramReelData(url)
          if (data) {
            extractedTitle = data.title || ''
            extractedLocation = data.location || ''
            pageContent = data.content
          }
        } else if (urlType === 'tiktok') {
          const data = await fetchTikTokData(url)
          if (data) {
            extractedTitle = data.title || ''
            extractedLocation = data.location || ''
            pageContent = data.content
          }
        } else if (urlType === 'youtube') {
          const data = await fetchYouTubeData(url)
          if (data) {
            extractedTitle = data.title || ''
            extractedLocation = data.location || ''
            pageContent = data.content
          }
        } else {
          const data = await fetchWebContent(url)
          if (data) {
            extractedTitle = data.title || ''
            pageContent = data.content
          }
        }
      } catch (fetchError) {
        console.error('Content fetch error:', fetchError)
      }
    }

    // If we got location directly from Apify, return it without calling Claude
    if (extractedLocation) {
      console.log(`Location found directly: ${extractedLocation}`)

      // Increment usage after successful extraction
      await supabase.rpc('increment_extraction_usage', { p_user_id: user.id })

      return new Response(
        JSON.stringify({
          locations: [{ name: extractedLocation, type: 'other', confidence: 'high' }],
          location_name: extractedLocation, // backward compatibility
          title: extractedLocation, // Use location as title, not video title
          confidence: 'high'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Try to detect location from hashtags (free fallback)
    const hashtagLocation = detectLocationFromHashtags(pageContent)
    if (hashtagLocation) {
      console.log(`Location detected from hashtags: ${hashtagLocation}`)

      await supabase.rpc('increment_extraction_usage', { p_user_id: user.id })

      return new Response(
        JSON.stringify({
          locations: [{ name: hashtagLocation, type: 'city', confidence: 'medium' }],
          location_name: hashtagLocation, // backward compatibility
          title: hashtagLocation, // Use location as title, not video title
          confidence: 'medium'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Add user-provided description/caption
    if (description) {
      pageContent = `User-provided caption/description:\n${description}\n\n${pageContent}`
    }

    // If we have no content at all, return early
    if (!pageContent.trim() && !url) {
      return new Response(
        JSON.stringify({
          locations: [],
          location_name: null,
          title: extractedTitle || null,
          confidence: 'none'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fall back to Claude API only if no direct location found
    const claudeApiKey = Deno.env.get('CLAUDE_API_KEY')
    if (!claudeApiKey) {
      // No Claude key - return what we have from Apify
      console.log('No Claude API key, returning Apify data only')
      return new Response(
        JSON.stringify({
          locations: [],
          location_name: null,
          title: extractedTitle || null,
          confidence: 'none',
          note: 'No location tag found. Add Claude API key for caption analysis.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('No direct location found, falling back to Claude API')
    console.log('Content being sent to Claude (first 500 chars):', pageContent.substring(0, 500))
    console.log('Content length:', pageContent.length)
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': claudeApiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: `Extract ALL geographic locations mentioned in this social media post. Be THOROUGH - find every single place mentioned, even if there are 10+ locations.

URL: ${url || 'N/A'}

Content:
${pageContent || '(No content available)'}

IMPORTANT: Find EVERY location mentioned, including:
- Specific places (restaurants, cafes, hotels, bars, clubs, shops)
- Attractions, landmarks, monuments, viewpoints
- Beaches, parks, neighborhoods, streets
- Cities, regions, countries
- Numbered lists ("1. Place A, 2. Place B, 3. Place C...")
- Places mentioned in hashtags
- Places in any language (translate to English if needed)

Organize the response hierarchically:
1. continent - The continent (e.g. "Europe", "Asia", "North America")
2. country - The country (e.g. "Italy", "Japan", "USA")
3. locations - Array of cities and specific sights/places

For each location in the array:
- name: Just the place name (e.g. "Venice" not "Venice, Italy")
- type: "city" for cities, or specific type for sights (restaurant, cafe, bar, hotel, attraction, beach, viewpoint, neighborhood, museum, shop, park)

Respond ONLY with valid JSON:
{
  "continent": "Europe",
  "country": "Italy",
  "locations": [
    {"name": "Venice", "type": "city"},
    {"name": "Colosseum", "type": "attraction"},
    {"name": "Trattoria da Mario", "type": "restaurant"}
  ],
  "title": "Italy"
}

Return ALL locations found - do not limit or summarize. If there are 10 places, return all 10.`
          }
        ]
      })
    })

    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text()
      console.error('Claude API error:', errorText)
      // Return what we have instead of failing
      return new Response(
        JSON.stringify({
          locations: [],
          title: extractedTitle || null,
          location_name: null, // backward compatibility
          confidence: 'none'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const claudeData = await claudeResponse.json()
    const content = claudeData.content?.[0]?.text
    console.log('Claude raw response:', content)

    if (content) {
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[0])
          console.log('Parsed locations:', JSON.stringify(result.locations))
          // Title comes from Claude response (should be the main location)

          // Ensure locations array exists
          if (!result.locations) {
            result.locations = result.location_name
              ? [{ name: result.location_name, type: 'other', confidence: result.confidence || 'medium' }]
              : []
          }

          // Add backward compatibility field
          result.location_name = result.locations[0]?.name || null
          result.confidence = result.locations[0]?.confidence || 'none'

          console.log(`Claude extracted ${result.locations.length} location(s)`)

          // Increment usage after successful extraction
          await supabase.rpc('increment_extraction_usage', { p_user_id: user.id })

          return new Response(
            JSON.stringify(result),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      } catch (parseError) {
        console.error('Failed to parse Claude response:', parseError)
      }
    }

    return new Response(
      JSON.stringify({
        locations: [],
        location_name: null,
        title: extractedTitle || null,
        confidence: 'none'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// Detect URL type
function detectUrlType(url: string): 'instagram' | 'tiktok' | 'youtube' | 'other' {
  const lowerUrl = url.toLowerCase()
  if (lowerUrl.includes('instagram.com')) return 'instagram'
  if (lowerUrl.includes('tiktok.com') || lowerUrl.includes('vm.tiktok.com')) return 'tiktok'
  if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) return 'youtube'
  return 'other'
}

// Check if Instagram URL is a Reel
function isInstagramReel(url: string): boolean {
  const lowerUrl = url.toLowerCase()
  return lowerUrl.includes('/reel/') || lowerUrl.includes('/reels/')
}

// Common location hashtags mapping
const HASHTAG_LOCATIONS: Record<string, string> = {
  // South America
  'cusco': 'Cusco, Peru', 'cuzco': 'Cusco, Peru', 'machupicchu': 'Machu Picchu, Peru', 'lima': 'Lima, Peru',
  'buenosaires': 'Buenos Aires, Argentina', 'patagonia': 'Patagonia, Argentina',
  'riodejaneiro': 'Rio de Janeiro, Brazil', 'copacabana': 'Copacabana, Brazil', 'saopaulo': 'São Paulo, Brazil',
  'bogota': 'Bogotá, Colombia', 'cartagena': 'Cartagena, Colombia', 'medellin': 'Medellín, Colombia',
  // Europe
  'paris': 'Paris, France', 'eiffeltower': 'Paris, France', 'montmartre': 'Paris, France',
  'london': 'London, UK', 'bigben': 'London, UK',
  'barcelona': 'Barcelona, Spain', 'madrid': 'Madrid, Spain', 'ibiza': 'Ibiza, Spain',
  'rome': 'Rome, Italy', 'roma': 'Rome, Italy', 'venice': 'Venice, Italy', 'venezia': 'Venice, Italy', 'milan': 'Milan, Italy', 'milano': 'Milan, Italy', 'florence': 'Florence, Italy', 'firenze': 'Florence, Italy', 'amalficoast': 'Amalfi Coast, Italy',
  'amsterdam': 'Amsterdam, Netherlands', 'berlin': 'Berlin, Germany', 'munich': 'Munich, Germany',
  'vienna': 'Vienna, Austria', 'prague': 'Prague, Czech Republic', 'budapest': 'Budapest, Hungary',
  'lisbon': 'Lisbon, Portugal', 'porto': 'Porto, Portugal',
  'santorini': 'Santorini, Greece', 'mykonos': 'Mykonos, Greece', 'athens': 'Athens, Greece',
  'dubrovnik': 'Dubrovnik, Croatia', 'reykjavik': 'Reykjavik, Iceland',
  // Asia
  'tokyo': 'Tokyo, Japan', 'kyoto': 'Kyoto, Japan', 'osaka': 'Osaka, Japan',
  'bangkok': 'Bangkok, Thailand', 'phuket': 'Phuket, Thailand', 'chiangmai': 'Chiang Mai, Thailand',
  'bali': 'Bali, Indonesia', 'ubud': 'Ubud, Bali', 'jakarta': 'Jakarta, Indonesia',
  'singapore': 'Singapore', 'hongkong': 'Hong Kong', 'seoul': 'Seoul, South Korea',
  'hanoi': 'Hanoi, Vietnam', 'hochiminh': 'Ho Chi Minh City, Vietnam', 'danang': 'Da Nang, Vietnam',
  'mumbai': 'Mumbai, India', 'delhi': 'Delhi, India', 'goa': 'Goa, India', 'jaipur': 'Jaipur, India',
  'dubai': 'Dubai, UAE', 'abudhabi': 'Abu Dhabi, UAE',
  // North America
  'newyork': 'New York, USA', 'nyc': 'New York, USA', 'manhattan': 'New York, USA', 'brooklyn': 'New York, USA',
  'losangeles': 'Los Angeles, USA', 'la': 'Los Angeles, USA', 'hollywood': 'Los Angeles, USA',
  'sanfrancisco': 'San Francisco, USA', 'sf': 'San Francisco, USA',
  'miami': 'Miami, USA', 'vegas': 'Las Vegas, USA', 'lasvegas': 'Las Vegas, USA',
  'chicago': 'Chicago, USA', 'seattle': 'Seattle, USA', 'austin': 'Austin, USA',
  'toronto': 'Toronto, Canada', 'vancouver': 'Vancouver, Canada', 'montreal': 'Montreal, Canada',
  'cancun': 'Cancun, Mexico', 'tulum': 'Tulum, Mexico', 'mexicocity': 'Mexico City, Mexico', 'cdmx': 'Mexico City, Mexico',
  // Australia & Oceania
  'sydney': 'Sydney, Australia', 'melbourne': 'Melbourne, Australia', 'brisbane': 'Brisbane, Australia',
  'auckland': 'Auckland, New Zealand', 'queenstown': 'Queenstown, New Zealand',
  // Africa
  'capetown': 'Cape Town, South Africa', 'johannesburg': 'Johannesburg, South Africa',
  'marrakech': 'Marrakech, Morocco', 'cairo': 'Cairo, Egypt',
  // Middle East
  'istanbul': 'Istanbul, Turkey', 'cappadocia': 'Cappadocia, Turkey',
  'telaviv': 'Tel Aviv, Israel', 'jerusalem': 'Jerusalem, Israel',
}

function detectLocationFromHashtags(content: string): string | null {
  const lowerContent = content.toLowerCase()

  // Extract hashtags from content
  const hashtagMatch = lowerContent.match(/hashtags?:\s*([^\n]+)/i)
  if (!hashtagMatch) return null

  const hashtagsStr = hashtagMatch[1]

  // Check each known location hashtag
  for (const [hashtag, location] of Object.entries(HASHTAG_LOCATIONS)) {
    if (hashtagsStr.includes(hashtag)) {
      return location
    }
  }

  return null
}

// Fetch Instagram Reel data using dedicated Reel scraper with transcript
async function fetchInstagramReelData(url: string): Promise<{ title: string; location: string; content: string } | null> {
  const apifyToken = Deno.env.get('APIFY_API_TOKEN')
  if (!apifyToken) {
    console.error('APIFY_API_TOKEN not configured')
    return null
  }

  try {
    console.log('Fetching Instagram Reel data via Apify Reel Scraper...')
    const response = await fetch(
      `https://api.apify.com/v2/acts/apify~instagram-reel-scraper/run-sync-get-dataset-items?token=${apifyToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: [url],
          resultsLimit: 1,
          includeTranscript: true // Get audio transcript for verbal mentions
        })
      }
    )

    if (!response.ok) {
      console.error('Apify Instagram Reel error:', await response.text())
      // Fall back to regular post scraper
      return await fetchInstagramData(url)
    }

    const data = await response.json()
    if (data && data.length > 0) {
      const reel = data[0]
      console.log('Instagram Reel data:', JSON.stringify({
        hasCaption: !!reel.caption,
        captionLength: reel.caption?.length || 0,
        hasTranscript: !!reel.transcript,
        transcriptLength: reel.transcript?.length || 0,
        locationName: reel.locationName,
        hashtags: reel.hashtags?.slice(0, 5),
        mentions: reel.mentions?.slice(0, 5)
      }))

      // Try to get location from reel metadata
      const location = reel.locationName || reel.location?.name || ''

      return {
        title: reel.caption?.substring(0, 60) || reel.ownerFullName || '',
        location: typeof location === 'string' ? location : '',
        content: buildInstagramReelContent(reel)
      }
    }
  } catch (error) {
    console.error('Instagram Reel fetch error:', error)
  }

  // Fall back to regular post scraper
  return await fetchInstagramData(url)
}

function buildInstagramReelContent(reel: any): string {
  const parts: string[] = []

  // Caption is most important - often contains place lists
  if (reel.caption) parts.push(`Caption: ${reel.caption}`)

  // Transcript captures verbal mentions of places
  if (reel.transcript) parts.push(`Audio Transcript: ${reel.transcript}`)

  if (reel.ownerUsername) parts.push(`Author: @${reel.ownerUsername}`)
  if (reel.locationName) parts.push(`Location Tag: ${reel.locationName}`)
  if (reel.hashtags?.length) parts.push(`Hashtags: ${reel.hashtags.join(', ')}`)
  if (reel.mentions?.length) parts.push(`Mentions: ${reel.mentions.join(', ')}`)
  if (reel.taggedUsers?.length) parts.push(`Tagged Users: ${reel.taggedUsers.map(u => u.username || u).join(', ')}`)

  return parts.join('\n')
}

// Fetch Instagram data using Apify - returns location directly if available
async function fetchInstagramData(url: string): Promise<{ title: string; location: string; content: string } | null> {
  const apifyToken = Deno.env.get('APIFY_API_TOKEN')
  if (!apifyToken) {
    console.error('APIFY_API_TOKEN not configured')
    return null
  }

  try {
    const response = await fetch(
      `https://api.apify.com/v2/acts/apify~instagram-post-scraper/run-sync-get-dataset-items?token=${apifyToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: [url],
          resultsLimit: 1
        })
      }
    )

    if (!response.ok) {
      console.error('Apify Instagram error:', await response.text())
      return null
    }

    const data = await response.json()
    if (data && data.length > 0) {
      const post = data[0]
      // Log all available fields to find full caption
      console.log('Instagram post fields:', Object.keys(post).join(', '))
      console.log('Caption length:', post.caption?.length || 0)
      console.log('Alt text:', post.alt?.substring(0, 100))
      console.log('Description:', post.description?.substring(0, 100))
      console.log('Instagram post data:', JSON.stringify({
        locationName: post.locationName,
        locationId: post.locationId,
        location: post.location,
        locationSlug: post.locationSlug,
        hasCaption: !!post.caption,
        hashtags: post.hashtags?.slice(0, 5)
      }))

      // Try multiple location fields
      const location = post.locationName || post.location?.name || post.location || ''

      return {
        title: post.caption?.substring(0, 60) || post.ownerFullName || '',
        location: typeof location === 'string' ? location : '',
        content: buildInstagramContent(post)
      }
    }
  } catch (error) {
    console.error('Instagram fetch error:', error)
  }
  return null
}

function buildInstagramContent(post: any): string {
  const parts: string[] = []

  // Try multiple fields for the full caption
  const fullCaption = post.caption || post.description || post.text || post.alt || ''
  if (fullCaption) parts.push(`Caption: ${fullCaption}`)
  if (post.ownerUsername) parts.push(`Author: @${post.ownerUsername}`)
  if (post.locationName) parts.push(`Location Tag: ${post.locationName}`)
  if (post.hashtags?.length) parts.push(`Hashtags: ${post.hashtags.join(', ')}`)
  if (post.mentions?.length) parts.push(`Mentions: ${post.mentions.join(', ')}`)

  return parts.join('\n')
}

// Fetch TikTok data using Apify - returns location directly if available
async function fetchTikTokData(url: string): Promise<{ title: string; location: string; content: string } | null> {
  const apifyToken = Deno.env.get('APIFY_API_TOKEN')
  if (!apifyToken) {
    console.error('APIFY_API_TOKEN not configured')
    return null
  }

  try {
    const response = await fetch(
      `https://api.apify.com/v2/acts/clockworks~tiktok-scraper/run-sync-get-dataset-items?token=${apifyToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postURLs: [url],
          resultsPerPage: 1
        })
      }
    )

    if (!response.ok) {
      console.error('Apify TikTok error:', await response.text())
      return null
    }

    const data = await response.json()
    if (data && data.length > 0) {
      const video = data[0]
      console.log('TikTok video data:', JSON.stringify({
        locationCreated: video.locationCreated,
        hasText: !!video.text,
        hashtags: video.hashtags?.slice(0, 5)
      }))

      return {
        title: video.text?.substring(0, 60) || '',
        location: video.locationCreated || '', // Direct location from TikTok
        content: buildTikTokContent(video)
      }
    }
  } catch (error) {
    console.error('TikTok fetch error:', error)
  }
  return null
}

function buildTikTokContent(video: any): string {
  const parts: string[] = []

  if (video.text) parts.push(`Caption: ${video.text}`)
  if (video.authorMeta?.name) parts.push(`Author: @${video.authorMeta.name}`)
  if (video.hashtags?.length) {
    parts.push(`Hashtags: ${video.hashtags.map((h: any) => h.name || h).join(', ')}`)
  }
  if (video.locationCreated) parts.push(`Location: ${video.locationCreated}`)

  return parts.join('\n')
}

// Fetch YouTube data using Apify for full description and transcript
async function fetchYouTubeData(url: string): Promise<{ title: string; location: string; content: string } | null> {
  const apifyToken = Deno.env.get('APIFY_API_TOKEN')
  if (!apifyToken) {
    console.log('No Apify token, falling back to oEmbed for YouTube')
    return await fetchYouTubeOEmbed(url)
  }

  try {
    console.log('Fetching YouTube data via Apify...')
    const response = await fetch(
      `https://api.apify.com/v2/acts/deanter~youtube-video-details-scraper/run-sync-get-dataset-items?token=${apifyToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: url
        })
      }
    )

    if (!response.ok) {
      console.error('Apify YouTube error:', await response.text())
      return await fetchYouTubeOEmbed(url)
    }

    const data = await response.json()
    if (data && data.length > 0) {
      const video = data[0]
      console.log('YouTube video data received:', JSON.stringify({
        hasTitle: !!video.title,
        hasDescription: !!video.description,
        descriptionLength: video.description?.length || 0,
        hasTranscript: !!video.transcript || !!video.subtitles,
        transcriptLength: (video.transcript || video.subtitles || '').length
      }))

      // Build comprehensive content for Claude to analyze
      const contentParts: string[] = []
      if (video.title) contentParts.push(`Video Title: ${video.title}`)
      if (video.description) contentParts.push(`Video Description: ${video.description}`)
      if (video.transcript) contentParts.push(`Video Transcript: ${video.transcript}`)
      if (video.subtitles) contentParts.push(`Video Subtitles: ${video.subtitles}`)

      return {
        title: video.title?.substring(0, 60) || '',
        location: '', // YouTube doesn't have direct location tags
        content: contentParts.join('\n\n')
      }
    }
  } catch (error) {
    console.error('YouTube Apify fetch error:', error)
  }

  // Fall back to oEmbed
  return await fetchYouTubeOEmbed(url)
}

// Fetch YouTube content using oEmbed as fallback
async function fetchYouTubeOEmbed(url: string): Promise<{ title: string; location: string; content: string } | null> {
  try {
    const oEmbedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
    const response = await fetch(oEmbedUrl)
    if (response.ok) {
      const data = await response.json()
      return {
        title: data.title || '',
        location: '',
        content: `YouTube Video Title: ${data.title || 'N/A'}\nAuthor: ${data.author_name || 'N/A'}`
      }
    }
  } catch (error) {
    console.error('YouTube oEmbed error:', error)
  }
  return null
}


// Fetch general web content using Apify RAG Web Browser
async function fetchWebContent(url: string): Promise<{ title: string; content: string } | null> {
  const apifyToken = Deno.env.get('APIFY_API_TOKEN')
  if (!apifyToken) {
    // Fallback to basic fetch
    return await fetchBasicWebContent(url)
  }

  try {
    // Use RAG Web Browser for reliable content extraction
    const response = await fetch(
      `https://api.apify.com/v2/acts/apify~rag-web-browser/run-sync-get-dataset-items?token=${apifyToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: url,
          maxResults: 1,
          outputFormats: ['markdown']
        })
      }
    )

    if (!response.ok) {
      console.error('Apify RAG error:', await response.text())
      return await fetchBasicWebContent(url)
    }

    const data = await response.json()
    if (data && data.length > 0) {
      const page = data[0]
      return {
        title: page.metadata?.title || '',
        content: page.markdown?.substring(0, 3000) || page.text?.substring(0, 3000) || ''
      }
    }
  } catch (error) {
    console.error('RAG Web Browser error:', error)
  }

  return await fetchBasicWebContent(url)
}

// Basic web content fetch as fallback
async function fetchBasicWebContent(url: string): Promise<{ title: string; content: string } | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    })

    if (!response.ok) return null

    const html = await response.text()
    return extractFromHtml(html, url)
  } catch (error) {
    console.error('Basic fetch error:', error)
    return null
  }
}

function extractFromHtml(html: string, url: string): { title: string; content: string } {
  const content: string[] = []
  let title = ''

  // Extract title
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  if (titleMatch) {
    title = titleMatch[1].trim()
    content.push(`Title: ${title}`)
  }

  // Extract meta description
  const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)
  if (descMatch) {
    content.push(`Description: ${descMatch[1].trim()}`)
  }

  // Extract Open Graph tags
  const ogTags = ['og:title', 'og:description', 'og:site_name']
  for (const tag of ogTags) {
    const ogMatch = html.match(new RegExp(`<meta[^>]*property=["']${tag}["'][^>]*content=["']([^"']+)["']`, 'i'))
    if (ogMatch) {
      content.push(`${tag}: ${ogMatch[1].trim()}`)
    }
  }

  // Extract location meta tags
  const locationTags = ['geo.placename', 'geo.region', 'place:location:latitude']
  for (const tag of locationTags) {
    const locMatch = html.match(new RegExp(`<meta[^>]*(?:name|property)=["']${tag}["'][^>]*content=["']([^"']+)["']`, 'i'))
    if (locMatch) {
      content.push(`${tag}: ${locMatch[1].trim()}`)
    }
  }

  // Extract visible text (first 1000 chars)
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)
  if (bodyMatch) {
    const textContent = bodyMatch[1]
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 1000)

    if (textContent) {
      content.push(`Content: ${textContent}`)
    }
  }

  content.push(`URL: ${url}`)

  return {
    title,
    content: content.join('\n\n').substring(0, 3000)
  }
}
