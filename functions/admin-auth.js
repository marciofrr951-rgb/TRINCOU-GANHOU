// functions/admin-auth.js
// Verifica a senha do admin sem expor no código-fonte

export async function onRequestPost(context) {
  const { request, env } = context;

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  try {
    const { senha } = await request.json();
    const senhaCorreta = env.ADMIN_PASSWORD;

    if (!senhaCorreta) {
      return new Response(JSON.stringify({ ok: false, erro: 'Configuração ausente' }), { status: 500, headers });
    }

    if (senha === senhaCorreta) {
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
    } else {
      return new Response(JSON.stringify({ ok: false }), { status: 200, headers });
    }
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, erro: err.message }), { status: 500, headers });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}
