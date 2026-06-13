export const ENV = {
  jwtSecret: process.env.JWT_SECRET ?? "dev-secret-please-change-in-production",
  supabaseUrl: process.env.SUPABASE_URL ?? "",
  supabaseServiceRole: process.env.SUPABASE_SERVICE_ROLE ?? "",
  isProduction: process.env.NODE_ENV === "production",
};
