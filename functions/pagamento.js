export async function onRequestPost(context) {
  const { request, env } = context;

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  try {
    const { bilhete_id, valor, descricao, telefone } = await request.json();

    const extRef = telefone ? `${bilhete_id}|${telefone}` : bilhete_id;
    const siteUrl = new URL(request.url).origin;

    const payload = {
      transaction_amount: valor || 2.50,
      description: descricao || `Trincou Ganhou - Bilhete ${bilhete_id}`,
      payment_method_id: 'pix',
      payer: {
        email: 'pagador@trincouganhou.com',
        first_name: 'Cliente',
        last_name: 'Trincou Ganhou',
        identification: { type: 'CPF', number: '00000000000' },
      },
      notification_url: `${siteUrl}/webhook`,
      external_reference: extRef,
      date_of_expiration: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    };

    const mpResp = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.MP_ACCESS_TOKEN}`,
        'X-Idempotency-Key': `bilhete-${bilhete_id}-${Date.now()}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await mpResp.json();

    if (mpResp.status !== 201) {
      return new Response(JSON.stringify({ error: 'Erro ao gerar pagamento', detail: data }), { status: 500, headers });
    }

    const pix = data.point_of_interaction?.transaction_data;
    return new Response(JSON.stringify({
      link: pix?.ticket_url,
      qr_code: pix?.qr_code,
      payment_id: data.id,
    }), { status: 200, headers });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
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
