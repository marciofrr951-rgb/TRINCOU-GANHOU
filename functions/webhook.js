export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();
    if (body.type !== 'payment' || !body.data?.id) {
      return new Response('OK', { status: 200 });
    }

    const paymentId = body.data.id;
    await new Promise(r => setTimeout(r, 3000));

    const mpResp = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { 'Authorization': `Bearer ${env.MP_ACCESS_TOKEN}` }
    });
    const payment = await mpResp.json();

    if (payment.status !== 'approved') return new Response('OK', { status: 200 });
    if (!payment.external_reference) return new Response('OK', { status: 200 });

    // external_reference: "ids|telefone|cambista"
    // ids pode vir prefixado com o jogo: "oito:R1C05" ou, no Trincou, só "12345"
    const parts = payment.external_reference.split('|');
    let idsStr   = parts[0];
    const telefone = parts[1] || '';
    const cambista = parts[2] || '';

    // Detecta o jogo pelo prefixo "<jogo>:"
    let jogo = '';
    const sep = idsStr.indexOf(':');
    if (sep > 0) {
      jogo = idsStr.slice(0, sep).toLowerCase();
      idsStr = idsStr.slice(sep + 1);
    }
    const ids = idsStr.split(',').map(id => id.trim()).filter(Boolean);

    const scriptUrl = env.APPS_SCRIPT_URL;
    for (const id of ids) {
      const body = jogo === 'oito'
        ? `acao=oito_baixa&id=${encodeURIComponent(id)}&status=PAGO&telefone=${encodeURIComponent(telefone)}&cambista=${encodeURIComponent(cambista)}`
        : `bilhete=${encodeURIComponent(id)}&status=PAGO&telefone=${encodeURIComponent(telefone)}&cambista=${encodeURIComponent(cambista)}`;
      await fetch(scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });
    }

    return new Response('OK', { status: 200 });
  } catch (err) {
    return new Response(err.message, { status: 500 });
  }
}
