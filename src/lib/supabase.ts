import { createClient } from '@supabase/supabase-js'
const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
export const supabase = url && key ? createClient(url, key) : null
export function db() {
  if (!supabase) throw new Error('Supabase 연결 정보가 필요합니다. 관리자에게 알려주세요.')
  return supabase
}
