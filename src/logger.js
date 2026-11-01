// Logs en formato JSON (una línea por evento), con correlationId cuando existe.
function log(level, message, extra = {}) {
  const line = {
    timestamp: new Date().toISOString(),
    level,
    service: 'ms-perfil-precios',
    message,
    ...extra,
  };
  const out = JSON.stringify(line);
  if (level === 'error') console.error(out);
  else console.log(out);
}

module.exports = {
  info: (m, e) => log('info', m, e),
  warn: (m, e) => log('warn', m, e),
  error: (m, e) => log('error', m, e),
};
