export async function onRequestPost(context) {
  const { request, env } = context;
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };
  try {
    const body = await request.json();
    const senhaDigitada = body.senha || '';
    const senhaCorreta = env.ADMIN_PASSWORD || '';
    return new Response(JSON.stringify({
      ok: senhaDigitada === senhaCorreta,
      recebeu: senhaDigitada.length + ' chars',
      esperava: senhaCorreta.length + ' chars',
      temVar: !!senhaCorreta,
    }), { status: 200, headers });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, erro: err.message }), { status: 500, headers });
  }
}
export async function onRequestOptions() {
  return new Response(null, { headers: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }});
}
