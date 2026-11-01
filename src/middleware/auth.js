const { HttpError } = require('../errors');

// APIM ya validó la firma del JWT de Google (validate-jwt). Aquí solo se lee el claim `sub`.
module.exports = function auth(req, _res, next) {
  const header = req.get('Authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return next(new HttpError(401, 'Falta el token Bearer'));

  try {
    const payload = JSON.parse(Buffer.from(match[1].split('.')[1], 'base64url').toString('utf8'));
    if (!payload.sub) throw new Error('sin sub');
    req.user = { sub: String(payload.sub), name: payload.name, picture: payload.picture };
    return next();
  } catch {
    return next(new HttpError(401, 'Token inválido'));
  }
};
