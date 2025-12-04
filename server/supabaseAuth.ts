import { createClient } from '@supabase/supabase-js'
import type { RequestHandler } from 'express'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

export const requireAuth: RequestHandler = async (req, res, next) => {
  const authHeader = req.headers.authorization

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  const token = authHeader.substring(7)

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      return res.status(401).json({ message: 'Invalid token' })
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email!,
    }

    next()
  } catch (error) {
    console.error('Auth error:', error)
    return res.status(401).json({ message: 'Authentication failed' })
  }
}
