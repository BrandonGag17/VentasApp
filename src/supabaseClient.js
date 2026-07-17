import { createClient } from '@supabase/supabase-js'


const supabaseUrl = 'https://qlybtqctrfboaiuedzrk.supabase.co' 

const supabaseKey = 'sb_publishable_9DiaRN2iRgMIkv6yN2emeg_VZS2NS4x' 

export const supabase = createClient(supabaseUrl, supabaseKey)
