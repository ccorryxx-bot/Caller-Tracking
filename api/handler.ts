export default (req: any, res: any) => {
  res.json({
    ok: true,
    node: process.version,
    vercel: process.env.VERCEL ?? "not set",
    env: process.env.NODE_ENV,
    method: req.method,
    url: req.url,
  });
};
