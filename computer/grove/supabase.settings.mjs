// Grove Store remote catalog (Alexis's Supabase).
// Values are left empty on purpose — set by Alexis.
// Do not guess or commit live credentials.
// The local Grove registry and already-installed apps work without these.
// Env names, if she prefers env instead of this file:
//   SUPABASE_PRIMARY_URL or SUPABASE_URL
//   SUPABASE_ANON_KEY (or SUPABASE_PRIMARY_KEY / SUPABASE_SERVICE_ROLE_KEY / SUPABASE_KEY)
//   optional SUPABASE_APP_BUCKET (defaults to synthia-apps, from her Synthai2 app-runner)

export const groveSupabaseSettings = {
  // set by Alexis
  url: '',
  // set by Alexis
  anonKey: '',
  // optional; her existing default from Synthai2. Leave or set by Alexis.
  bucket: 'synthia-apps',
};
