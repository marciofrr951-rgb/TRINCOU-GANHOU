// functions/script.js
// Proxy para esconder a URL do Google Apps Script do código-fonte do site

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function onRequestOptions() {
  return new Response(null, { headers: CORS_HEADERS });
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const scriptUrl = env.APPS_SCRIPT_URL;
  if (!scriptUrl) {
    return new Response('Configuração ausente', { status: 500, headers: CORS_HEADERS });
  }

  // Repassa todos os query params para o Apps Script
  const url = new URL(request.url);
  const targetUrl = scriptUrl + url.search;

  const resp = await fetch(targetUrl);
  const body = await resp.text();

  return new Response(body, {
    status: resp.status,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': resp.headers.get('Content-Type') || 'application/json',
    },
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const scriptUrl = env.APPS_SCRIPT_URL;
  if (!scriptUrl) {
    return new Response('Configuração ausente', { status: 500, headers: CORS_HEADERS });
  }

  const body = await request.text();

  const resp = await fetch(scriptUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body,
  });
  const respBody = await resp.text();

  return new Response(respBody, {
    status: resp.status,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': resp.headers.get('Content-Type') || 'application/json',
    },
  });
}
