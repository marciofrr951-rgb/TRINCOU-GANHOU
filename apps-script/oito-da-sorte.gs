/*════════════════════════════════════════════════════════════════════════
  08 DA SORTE — Código para o seu Apps Script (mesma planilha do Trincou)

  COMO INSTALAR:
  1) Extensões > Apps Script na planilha.
  2) Cole TODO este arquivo no FINAL do seu Código.gs (não apague o resto).
  3) No início da função doGet(e), tenha esta linha:
        var _o = handleOitoGet_(e);  if (_o) return _o;
  4) No início da função doPost(e), tenha esta linha:
        var _o = handleOitoPost_(e); if (_o) return _o;
  5) Salve e Implantar > Gerenciar implantações > Editar > Nova versão.

  Cria sozinho as abas: OitoRodadas, OitoDaSorte, OitoResultados.
════════════════════════════════════════════════════════════════════════*/

var OITO_RODADAS_ABA    = 'OitoRodadas';
var OITO_ABA            = 'OitoDaSorte';
var OITO_RESULTADOS_ABA = 'OitoResultados';
var OITO_CAMBISTAS_ABA  = 'Cambistas'; // aba dos PINs (a mesma do Trincou)
var OITO_CAMBISTA_COL_NOME = 1;        // coluna do NOME (A=1)
var OITO_CAMBISTA_COL_PIN  = 2;        // coluna do PIN (B=2)

var OITO_RODADAS_COLS = ['Rodada', 'Valor', 'TotalCotas', 'Status', 'DataCriacao', 'DataAtivacao'];
var OITO_COLS         = ['Rodada', 'Cota', 'ID', 'Nome', 'Telefone', 'Numeros', 'Status', 'Cambista', 'DataPag', 'DataCriacao', 'Cidade'];
var OITO_RES_COLS     = ['Data', 'Numeros', 'PublicadoEm'];

// % da premiação (60% pro 1º lugar, 10% pra menor pontuação)
var OITO_PCT_PRINCIPAL  = 0.60;
var OITO_PCT_CONSOLACAO = 0.10;

/*──────────────── ROTEADORES ────────────────────────────────────────────*/
function handleOitoGet_(e) {
  var acao = (e && e.parameter && e.parameter.acao) || '';
  if (acao === 'oito_rodadas_disponivel') return oitoJson_(oitoRodadasAtivas_());
  if (acao === 'oito_rodadas_admin')      return oitoJson_(oitoRodadasAtivas_());
  if (acao === 'oito_status')             return oitoJson_(oitoStatus_());
  if (acao === 'oito_resultado_listar')   return oitoJson_(oitoResultadoListar_());
  if (acao === 'oito_listar')             return oitoJson_(oitoListar_(e.parameter));
  if (acao === 'oito_meus')               return oitoJson_(oitoMeus_(e.parameter));
  if (acao === 'oito_premiacao_paga')     return oitoJson_({ premiacao_paga: PropertiesService.getScriptProperties().getProperty('OITO_PREMIACAO_PAGA') || '0' });
  if (acao === 'oito_verificarpin')       return oitoText_(oitoVerificarPin_(e.parameter.pin));
  if (acao === 'oito_statuscota')         return oitoText_(oitoStatusCota_(e.parameter.id));
  return null;
}

function handleOitoPost_(e) {
  var acao = (e && e.parameter && e.parameter.acao) || '';
  if (acao === 'oito_criar')          return oitoJson_(oitoCriar_(e.parameter));
  if (acao === 'oito_baixa')          return oitoJson_(oitoBaixa_(e.parameter)); // webhook PIX (protegido por token)
  // Ações de admin — exigem a senha do admin (OITO_ADMIN_SENHA nas Propriedades do Script)
  if (acao === 'oito_nova_rodada')    return oitoAdminOk_(e.parameter) ? oitoJson_(oitoNovaRodada_(e.parameter)) : oitoJson_({ erro: 'Senha do admin inválida.' });
  if (acao === 'oito_deletar_rodada') return oitoAdminOk_(e.parameter) ? oitoText_(oitoDeletarRodada_(e.parameter)) : oitoText_('ERRO: senha do admin invalida');
  if (acao === 'oito_resultado')      return oitoAdminOk_(e.parameter) ? oitoJson_(oitoResultado_(e.parameter)) : oitoJson_({ erro: 'Senha do admin inválida.' });
  if (acao === 'oito_ativar_rodada')  return oitoAdminOk_(e.parameter) ? oitoJson_(oitoAtivarRodada_(e.parameter)) : oitoJson_({ erro: 'Senha do admin inválida.' });
  if (acao === 'oito_set_premiacao')  return oitoAdminOk_(e.parameter) ? oitoJson_(oitoSetPremiacao_(e.parameter)) : oitoJson_({ erro: 'Senha do admin inválida.' });
  return null;
}

function oitoAdminOk_(p) {
  var s = PropertiesService.getScriptProperties().getProperty('OITO_ADMIN_SENHA') || '';
  if (!s) return true; // sem senha configurada → não bloqueia (defina OITO_ADMIN_SENHA p/ ativar)
  return String(p.senha || '') === s;
}
function oitoSetPremiacao_(p) {
  PropertiesService.getScriptProperties().setProperty('OITO_PREMIACAO_PAGA', String(p.valor || '0'));
  return { ok: true };
}

// Ativa um bolão: a partir da data definida, os resultados passam a contar pontos só dele.
function oitoAtivarRodada_(p) {
  var rodada = Number(p.rodada);
  if (!rodada) return { erro: 'Rodada inválida.' };
  var data = String(p.data || '').trim();
  if (data.indexOf('/') >= 0) { var pp = data.split('/'); if (pp.length === 3) data = pp[2] + '-' + ('0' + pp[1]).slice(-2) + '-' + ('0' + pp[0]).slice(-2); }
  if (data.indexOf('T') >= 0) data = data.split('T')[0]; // datetime-local -> yyyy-MM-dd
  if (!data) data = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'yyyy-MM-dd');
  var sh = oitoRodadasSheet_();
  var rows = sh.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (Number(rows[i][0]) === rodada) {
      sh.getRange(i + 1, 6).setValue(data); // DataAtivacao
      return { ok: true, rodada: rodada, dataAtivacao: data };
    }
  }
  return { erro: 'Rodada não encontrada.' };
}

/*──────────────── PLANILHAS ─────────────────────────────────────────────*/
function oitoAba_(nome, cols) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(nome);
  if (!sh) {
    sh = ss.insertSheet(nome);
    sh.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight('bold');
  }
  return sh;
}
function oitoRodadasSheet_()    { return oitoAba_(OITO_RODADAS_ABA, OITO_RODADAS_COLS); }
function oitoCotasSheet_()      { return oitoAba_(OITO_ABA, OITO_COLS); }
function oitoResultadosSheet_() { return oitoAba_(OITO_RESULTADOS_ABA, OITO_RES_COLS); }

function oitoPremios_(valor, totalCotas) {
  var total = Number(valor) * Number(totalCotas);
  return {
    principal: Math.floor(total * OITO_PCT_PRINCIPAL),
    consolacao: Math.floor(total * OITO_PCT_CONSOLACAO),
  };
}

// Conta cotas PAGAS de uma rodada
function oitoCotasPagas_(rodada) {
  var rows = oitoCotasSheet_().getDataRange().getValues();
  var n = 0;
  for (var i = 1; i < rows.length; i++) {
    if (Number(rows[i][0]) === Number(rodada) && String(rows[i][6]).toUpperCase().indexOf('PAGO') >= 0) n++;
  }
  return n;
}
// Conta TODAS as cotas de uma rodada (pagas + pendentes) — para numerar a próxima
function oitoCotasTotalReservadas_(rodada) {
  var rows = oitoCotasSheet_().getDataRange().getValues();
  var n = 0;
  for (var i = 1; i < rows.length; i++) { if (Number(rows[i][0]) === Number(rodada)) n++; }
  return n;
}

/*──────────────── RODADAS ───────────────────────────────────────────────*/
function oitoRodadasAtivas_() {
  var rows = oitoRodadasSheet_().getDataRange().getValues();
  var out = [];
  for (var i = 1; i < rows.length; i++) {
    var status = String(rows[i][3] || '').toLowerCase();
    if (status === 'deletada') continue;
    var rodada = Number(rows[i][0]);
    var valor = Number(rows[i][1]) || 0;
    var totalCotas = Number(rows[i][2]) || 0;
    var pr = oitoPremios_(valor, totalCotas);
    var dc = rows[i][4];
    var dataInicio = dc instanceof Date ? Utilities.formatDate(dc, 'America/Sao_Paulo', 'dd/MM/yyyy') : String(dc || '');
    var da = rows[i][5];
    var dataAtivacao = da instanceof Date ? Utilities.formatDate(da, 'America/Sao_Paulo', 'yyyy-MM-dd') : String(da || '').trim();
    out.push({
      rodada: rodada,
      valor: valor,
      totalCotas: totalCotas,
      cotasVendidas: oitoCotasPagas_(rodada),
      premioPrincipal: pr.principal,
      premioConsolacao: pr.consolacao,
      dataInicio: dataInicio,
      dataAtivacao: dataAtivacao,
      ativado: !!dataAtivacao,
    });
  }
  out.sort(function (a, b) { return a.rodada - b.rodada; });
  return out;
}

function oitoNovaRodada_(p) {
  var valor = Number(p.valor) || 0;
  var total = Number(p.total) || 0;
  if (valor <= 0) return { erro: 'Valor inválido.' };
  if (total <= 0) return { erro: 'Total de cotas inválido.' };

  var sh = oitoRodadasSheet_();
  var rows = sh.getDataRange().getValues();
  var maxR = 0;
  for (var i = 1; i < rows.length; i++) { if (Number(rows[i][0]) > maxR) maxR = Number(rows[i][0]); }
  var rodada = maxR + 1;
  var agora = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm');
  sh.appendRow([rodada, valor, total, 'ativa', agora, '']);
  return { ok: true, rodada: rodada };
}

function oitoDeletarRodada_(p) {
  var rodada = Number(p.rodada);
  if (!rodada) return 'ERRO: rodada inválida';
  var sh = oitoRodadasSheet_();
  var rows = sh.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (Number(rows[i][0]) === rodada) {
      sh.getRange(i + 1, 4).setValue('deletada'); // Status
      return 'OK';
    }
  }
  return 'ERRO: rodada não encontrada';
}

/*──────────────── RESULTADOS (globais — valem p/ todas as rodadas) ───────*/
function oitoResultado_(p) {
  var numeros = String(p.numeros || '').trim();
  if (!numeros) return { erro: 'Informe os números sorteados.' };
  var hoje = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'yyyy-MM-dd');
  var agora = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm');
  oitoResultadosSheet_().appendRow([hoje, numeros, agora]);
  return { ok: true };
}

function oitoResultadoListar_() {
  var vals = oitoResultadosSheet_().getDataRange().getValues();
  var out = [];
  for (var i = 1; i < vals.length; i++) {
    var d = vals[i][0];
    var ds = d instanceof Date ? Utilities.formatDate(d, 'America/Sao_Paulo', 'yyyy-MM-dd') : String(d);
    if (!vals[i][1]) continue;
    out.push({ data: ds, numeros: String(vals[i][1] || '') });
  }
  out.sort(function (a, b) { return String(b.data).localeCompare(String(a.data)); });
  return out;
}

/*──────────────── COTAS ─────────────────────────────────────────────────*/
// Quadro público — sem telefone. Aceita ?rodada= opcional.
function oitoListar_(p) {
  var filtroRodada = p && p.rodada ? Number(p.rodada) : null;
  // rodadas ativas (para esconder cotas de rodadas deletadas)
  var ativas = {};
  oitoRodadasAtivas_().forEach(function (r) { ativas[r.rodada] = true; });

  var rows = oitoCotasSheet_().getDataRange().getValues();
  var out = [];
  for (var i = 1; i < rows.length; i++) {
    var rod = Number(rows[i][0]);
    if (filtroRodada && rod !== filtroRodada) continue;
    if (!filtroRodada && !ativas[rod]) continue;
    out.push({
      rodada: rod,
      cota: rows[i][1],
      nome: String(rows[i][3] || ''),
      numeros: String(rows[i][5] || ''),
      status: String(rows[i][6] || ''),
      cidade: String(rows[i][10] || ''),
    });
  }
  return out;
}

// Cotas de um participante (por WhatsApp), em todas as rodadas. Para "Meus Bolões".
function oitoMeus_(p) {
  var tel = String(p.telefone || '').replace(/\D/g, '');
  if (tel.length < 8) return [];
  var rows = oitoCotasSheet_().getDataRange().getValues();
  var out = [];
  for (var i = 1; i < rows.length; i++) {
    var rowTel = String(rows[i][4] || '').replace(/\D/g, '');
    if (!rowTel) continue;
    var bate = rowTel === tel || (rowTel.length >= 9 && tel.length >= 9 && rowTel.slice(-9) === tel.slice(-9));
    if (!bate) continue;
    out.push({
      rodada: Number(rows[i][0]),
      cota: rows[i][1],
      id: String(rows[i][2] || ''),
      nome: String(rows[i][3] || ''),
      numeros: String(rows[i][5] || ''),
      status: String(rows[i][6] || ''),
      cambista: String(rows[i][7] || ''),
      cidade: String(rows[i][10] || ''),
    });
  }
  return out;
}

function oitoStatusCota_(id) {
  id = String(id || '').trim();
  if (!id) return 'PENDENTE';
  var rows = oitoCotasSheet_().getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][2]).trim() === id) {
      return String(rows[i][6]).toUpperCase().indexOf('PAGO') >= 0 ? 'PAGO' : 'PENDENTE';
    }
  }
  return 'PENDENTE';
}

function oitoCriar_(p) {
  var rodada = Number(p.rodada);
  var nome = String(p.nome || '').trim();
  var telefone = String(p.telefone || '').replace(/\D/g, '');
  var cidade = String(p.cidade || '').trim();
  var numeros = String(p.numeros || '').trim();
  var metodo = String(p.metodo || 'pix').toLowerCase();
  var pin = String(p.pin || '').trim();

  if (!rodada) return { erro: 'Rodada não selecionada.' };
  if (!nome) return { erro: 'Informe seu nome.' };
  if (telefone.length < 10) return { erro: 'WhatsApp inválido.' };

  // valida 8 números distintos de 1 a 80
  var nums = numeros.split(/[-,\s]+/).map(function (n) { return parseInt(n, 10); }).filter(function (n) { return !isNaN(n); });
  var distintos = {};
  for (var k = 0; k < nums.length; k++) {
    if (nums[k] < 1 || nums[k] > 80) return { erro: 'Números devem ser de 01 a 80.' };
    distintos[nums[k]] = true;
  }
  if (nums.length !== 8 || Object.keys(distintos).length !== 8) return { erro: 'Escolha exatamente 8 números diferentes.' };

  // confere se a rodada existe e está ativa, e pega o total de cotas
  var rrows = oitoRodadasSheet_().getDataRange().getValues();
  var totalCotas = 0, achou = false;
  for (var r = 1; r < rrows.length; r++) {
    if (Number(rrows[r][0]) === rodada) {
      if (String(rrows[r][3] || '').toLowerCase() === 'deletada') return { erro: 'Esta rodada não está mais disponível.' };
      totalCotas = Number(rrows[r][2]) || 0;
      achou = true;
      break;
    }
  }
  if (!achou) return { erro: 'Rodada não encontrada.' };

  var reservadas = oitoCotasTotalReservadas_(rodada);
  if (reservadas >= totalCotas) return { erro: 'Todas as cotas desta rodada já foram preenchidas.' };

  var cota = reservadas + 1;
  var id = 'R' + rodada + 'C' + cota;
  var agora = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm');

  var status, cambista, dataPag;
  if (metodo === 'dinheiro') {
    var nomeCambista = oitoVerificarPin_(pin);
    if (!nomeCambista) return { erro: 'PIN do cambista inválido.' };
    status = 'PAGO DINHEIRO'; cambista = nomeCambista; dataPag = agora;
  } else {
    status = 'PENDENTE'; cambista = 'ONLINE'; dataPag = '';
  }

  var numerosFmt = nums.sort(function (a, b) { return a - b; }).map(function (n) { return ('0' + n).slice(-2); }).join('-');
  oitoCotasSheet_().appendRow([rodada, cota, id, nome, telefone, numerosFmt, status, cambista, dataPag, agora, cidade]);
  return { cota: cota, id: id, status: status };
}

// Baixa do PIX (chamada pelo webhook do Mercado Pago)
function oitoBaixa_(p) {
  // Só aceita a baixa com a chave secreta (configure OITO_WEBHOOK_TOKEN nas Propriedades do Script).
  // Se a propriedade não estiver definida, não bloqueia (compatibilidade).
  var tk = PropertiesService.getScriptProperties().getProperty('OITO_WEBHOOK_TOKEN') || '';
  if (tk && String(p.token || '') !== tk) return { erro: 'nao autorizado' };
  var id = String(p.id || '').trim();
  if (!id) return { erro: 'id ausente' };
  var sh = oitoCotasSheet_();
  var rows = sh.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][2]).trim() === id) {
      var linha = i + 1;
      sh.getRange(linha, 7).setValue('PAGO');
      if (!rows[i][8]) sh.getRange(linha, 9).setValue(Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm'));
      if (p.telefone) sh.getRange(linha, 5).setValue(String(p.telefone));
      if (p.cambista) sh.getRange(linha, 8).setValue(String(p.cambista));
      return { ok: true };
    }
  }
  return { erro: 'cota não encontrada' };
}

// Compatibilidade: status "legado" (1ª rodada ativa) usado como fallback no site
function oitoStatus_() {
  var ativas = oitoRodadasAtivas_();
  if (ativas.length > 0) {
    var r = ativas[0];
    return {
      totalCotas: r.totalCotas, valorCota: r.valor,
      premioPrincipal: r.premioPrincipal, premioConsolacao: r.premioConsolacao,
      percOrganizador: 30, dataInicio: '', rodada: r.rodada, cotasVendidas: r.cotasVendidas,
    };
  }
  return { totalCotas: 100, valorCota: 20, premioPrincipal: 1200, premioConsolacao: 200, percOrganizador: 30, dataInicio: '', rodada: 1, cotasVendidas: 0 };
}

// Verifica o PIN na aba de cambistas → nome do cambista ou '' (inválido)
function oitoVerificarPin_(pin) {
  pin = String(pin || '').trim();
  if (!pin) return '';
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(OITO_CAMBISTAS_ABA);
  if (!sh) return '';
  var vals = sh.getDataRange().getValues();
  for (var i = 1; i < vals.length; i++) {
    var pp = String(vals[i][OITO_CAMBISTA_COL_PIN - 1] || '').trim();
    if (pp && pp === pin) return String(vals[i][OITO_CAMBISTA_COL_NOME - 1] || 'Cambista').trim();
  }
  return '';
}

/*──────────────── RESPOSTAS ─────────────────────────────────────────────*/
function oitoJson_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function oitoText_(str) {
  return ContentService.createTextOutput(String(str)).setMimeType(ContentService.MimeType.TEXT);
}
