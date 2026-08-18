// Paso 2 del login con GitHub: GitHub redirige aquí con un "code" temporal después
// de que autorizas la aplicación. Esta función lo intercambia por un token de acceso
// (usando el client secret, que nunca sale del servidor) y se lo pasa de regreso a
// la ventana del panel /admin mediante postMessage, tal como lo espera Decap CMS.

exports.handler = async (event) => {
  const code = event.queryStringParameters && event.queryStringParameters.code;
  const clientId = process.env.OAUTH_CLIENT_ID;
  const clientSecret = process.env.OAUTH_CLIENT_SECRET;

  if (!code) {
    return { statusCode: 400, body: "Falta el parámetro 'code' en la URL." };
  }
  if (!clientId || !clientSecret) {
    return {
      statusCode: 500,
      body: "Faltan OAUTH_CLIENT_ID / OAUTH_CLIENT_SECRET en las variables de entorno de Netlify.",
    };
  }

  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
  });
  const tokenData = await tokenRes.json();

  if (!tokenRes.ok || tokenData.error) {
    return {
      statusCode: 401,
      body: `Error de autenticación con GitHub: ${tokenData.error_description || tokenData.error || tokenRes.status}`,
    };
  }

  const payload = JSON.stringify({ token: tokenData.access_token, provider: "github" });

  // Handshake estándar que Decap CMS espera desde una ventana emergente de OAuth.
  const html = `<!doctype html>
<html><body>
<script>
  (function () {
    function receiveMessage() {
      window.opener.postMessage("authorization:github:success:${payload}", "*");
      window.removeEventListener("message", receiveMessage, false);
    }
    window.addEventListener("message", receiveMessage, false);
    window.opener.postMessage("authorizing:github", "*");
  })();
</script>
</body></html>`;

  return {
    statusCode: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
    body: html,
  };
};
