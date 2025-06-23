// supabase.ts
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jshhkgurxhxuyflnptwp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzaGhrZ3VyeGh4dXlmbG5wdHdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAzOTEyMjUsImV4cCI6MjA2NTk2NzIyNX0.9Ira5bkTot8Ik6jWmNzwBv30_38VaiOFKozJo6ayU4o';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
