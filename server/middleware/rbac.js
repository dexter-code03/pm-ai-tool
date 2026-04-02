/** Role guard — JWT must include `role` (see routes/auth.js). */
export function requireRole(...allowed) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const role = req.user.role;
    if (!allowed.includes(role)) {
      return res.status(403).json({ error: 'Forbidden', requiredRoles: allowed });
    }
    next();
  };
}
