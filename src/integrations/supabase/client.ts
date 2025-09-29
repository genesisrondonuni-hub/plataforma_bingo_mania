import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://tyiejzsvkhfbxsorxzrl.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5aWVqenN2a2hmYnhzb3J4enJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwMTk3NzQsImV4cCI6MjA3NDU5NTc3NH0._evEywZQs-qVBrOqR6b_hDTnLrSTqRLBgbCly3t7qIg'

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";
