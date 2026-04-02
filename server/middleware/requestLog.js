/**
 * One JSON line per HTTP response (enable with default; set REQUEST_LOG=0 to disable).
 */
export function requestLog(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    if (process.env.REQUEST_LOG === '0') return;
    const path = req.originalUrl?.split('?')[0] || req.url;
    if (path === '/health' && process.env.REQUEST_LOG_HEALTH === '0') return;
    const line = JSON.stringify({
      t: new Date().toISOString(),
      method: req.method,
      path,
      status: res.statusCode,
      ms: Date.now() - start
    });
    console.log(line);
  });
  next();
}
