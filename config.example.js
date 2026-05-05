window.WARDROBE_CONFIG = {
  supabaseUrl: "https://YOUR_PROJECT.supabase.co",
  supabaseAnonKey: "YOUR_SUPABASE_ANON_KEY",
  imageStorage: {
    provider: "supabase-storage",
    bucket: "wardrobe-images",
    signedUrlExpiresInSeconds: 3600
  }
};
