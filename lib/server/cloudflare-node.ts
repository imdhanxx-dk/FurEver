// Next.js/Vercel adapter: private Supabase Storage replaces the Workers R2 binding.
export async function runtimeEnv() {
  return process.env;
}
