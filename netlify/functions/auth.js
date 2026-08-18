// Paso 1 del login con GitHub para el panel /admin.
// Decap CMS abre una ventana emergente hacia /api/auth (ver netlify.toml), y esta
// función la reenvía a la pantalla de autorización de GitHub.
//
// Requiere dos variables de entorno configuradas en Netlify (Project configuration
// → Environment variables): OAUTH_CLIENT_ID y OAUTH_CLIENT_SECRET, que vienen de tu
// propia GitHub OAuth App (ver README.md para el paso a paso).

exports.handler = async (event) => {
  const clientId = process.env.OAUTH_CLIENT_ID;
  if (!clientId) {
    return {
      statusCode: 500,
      body: "Falta configurar la variable de entorno OAUTH_CLIENT_ID en Netlify.",
    };
  }

  const site = process.env.URL || `https://${event.headers.host}`;
  const redirectUri = `${site}/api/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "repo",
  });

  return {
    statusCode: 302,
    headers: {
      Location: `https://github.com/login/oauth/authorize?${params.toString()}`,
    },
  };
};
