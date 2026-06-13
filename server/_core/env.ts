export const ENV = {
  jwtSecret: process.env.JWT_SECRET ?? "dev-secret-please-change-in-production",
  databaseUrl: process.env.DATABASE_URL ?? "",
  isProduction: process.env.NODE_ENV === "production",
};
