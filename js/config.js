/* Dreamz Planners — runtime config.
   The publishable key is designed to be public (Row Level Security protects data).
   Set USE_SUPABASE to false to run fully local (content JSON + localStorage). */
window.DP_CONFIG = {
  USE_SUPABASE: true,
  SUPABASE_URL: 'https://mbmmnswxuuegbloouuti.supabase.co',
  SUPABASE_KEY: 'sb_publishable_plO_blhkXeSbPN_pWKd0YA_bcD2ZfZt',
  CONTENT_URL: 'content/site-content.json',
  MEDIA_BASE: 'assets/media/',
  MEDIA_MANIFEST: 'assets/media/manifest.json',
  TIMEOUT_MS: 6000,
  CONTENT_TIMEOUT_MS: 3000
};
