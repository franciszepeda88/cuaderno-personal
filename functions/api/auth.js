// Paso 1 del login con GitHub para el panel /admin (versión Cloudflare Pages).
// Es el mismo puente que teníamos en Netlify, adaptado a la sintaxis de
// Cloudflare Pages Functions (Workers runtime en vez de Node/Lambda).
//
// Requiere dos variables de entorno en Cloudflare Pages (Settings → Environment
// variables): OAUTH_CLIENT_ID y OAUTH_CLIENT_SECRET, de tu GitHub OAuth App.

export async function onRequestGet(context) {
  const clientId = context.env.OAUTH_CLIENT_ID;
  if (!clientId) {
    return new Response(
      "Falta configurar la variable de entorno OAUTH_CLIENT_ID en Cloudflare Pages.",
      { status: 500 }
    );
  }

  const url = new URL(context.request.url);
  const redirectUri = `${url.origin}/api/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "repo",
  });

  return Response.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`, 302);
}
