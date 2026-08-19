// Paso 2 del login con GitHub (versión Cloudflare Pages) — misma lógica que la
// función de Netlify: intercambia el "code" por un token y se lo pasa de
// regreso al panel /admin por postMessage.

function popupHtml(message) {
  // JSON.stringify(message) escapa correctamente las comillas del token/JSON —
  // sin esto el <script> se rompe y la ventana de login se queda en blanco.
  return `<!doctype html>
<html><body>
<script>
  (function () {
    function receiveMessage() {
      window.opener.postMessage(${JSON.stringify(message)}, "*");
      window.removeEventListener("message", receiveMessage, false);
    }
    window.addEventListener("message", receiveMessage, false);
    window.opener.postMessage("authorizing:github", "*");
  })();
</script>
</body></html>`;
}

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const code = url.searchParams.get("code");
  const clientId = context.env.OAUTH_CLIENT_ID;
  const clientSecret = context.env.OAUTH_CLIENT_SECRET;

  if (!code) {
    return new Response("Falta el parámetro 'code' en la URL.", { status: 400 });
  }
  if (!clientId || !clientSecret) {
    return new Response(
      "Faltan OAUTH_CLIENT_ID / OAUTH_CLIENT_SECRET en las variables de entorno de Cloudflare Pages.",
      { status: 500 }
    );
  }

  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
  });
  const tokenData = await tokenRes.json();

  if (!tokenRes.ok || tokenData.error) {
    const errorPayload = JSON.stringify({
      message: tokenData.error_description || tokenData.error || `HTTP ${tokenRes.status}`,
    });
    return new Response(popupHtml(`authorization:github:error:${errorPayload}`), {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const successPayload = JSON.stringify({ token: tokenData.access_token, provider: "github" });
  return new Response(popupHtml(`authorization:github:success:${successPayload}`), {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
