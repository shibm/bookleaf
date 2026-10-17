import { randomBytes } from 'node:crypto';
import { authenticate } from '../services/auth.service.js';
const publicUser = (u) => ({
  id: u._id,
  name: u.name,
  email: u.email,
  role: u.role,
});
export const csrf = (req, res) =>
  res.json({ data: { csrfToken: req.session.csrf } });
export const login = async (req, res, next) => {
  const user = await authenticate(req.body);
  req.session.regenerate((error) => {
    if (error) return next(error);
    req.session.userId = user._id;
    req.session.csrf = randomBytes(24).toString('hex');
    req.session.save((error) =>
      error
        ? next(error)
        : res.json({
            data: { user: publicUser(user), csrfToken: req.session.csrf },
          }),
    );
  });
};
export const logout = (req, res, next) =>
  req.session.destroy((error) => {
    if (error) return next(error);
    res.clearCookie('bookleaf.sid');
    res.status(204).end();
  });
export const me = (req, res) => res.json({ data: publicUser(req.user) });
