/*════════════════════════════════════════════════════════════════════════
  08 DA SORTE — Código para adicionar ao seu Apps Script existente
  (o mesmo projeto/planilha que o Trincou Ganhou já usa)

  COMO INSTALAR:
  1) Abra seu projeto do Apps Script (Extensões > Apps Script na planilha).
  2) Cole TODO este arquivo no final do seu Código.gs.
  3) No início da sua função doGet(e) já existente, adicione na 1ª linha:
        var _o = handleOitoGet_(e); if (_o) return _o;
  4) No início da sua função doPost(e) já existente, adicione na 1ª linha:
        var _o = handleOitoPost_(e); if (_o) return _o;
  5) Salve e faça "Implantar > Gerenciar implantações > Editar > Nova versão".
     (Não precisa mudar a URL — o site continua usando a mesma.)

  Ele cria sozinho as abas "OitoDaSorte" e "OitoConfig" na 1ª vez que rodar.
════════════════════════════════════════════════════════════════════════*/

// ── Ajuste se sua aba de cambistas tiver outro nome/colunas ──
var OITO_ABA          = 'OitoDaSorte';
var OITO_CONFIG_ABA   = 'OitoConfig';
var OITO_CAMBISTAS_ABA = 'Cambistas'; // aba onde ficam os PINs dos cambistas
var OITO_CAMBISTA_COL_NOME = 1;       // coluna do NOME do cambista (A = 1)
var OITO_CAMBISTA_COL_PIN  = 2;       // coluna do PIN do cambista   (B = 2)

// Colunas da aba OitoDaSorte (não precisa mexer)
var OITO_COLS = ['Rodada','Cota','ID','Nome','Telefone','Numeros','Status','Cambista','DataPag','DataCriacao'];

/*──────────────── ROTEADORES (chamados pelo seu doGet/doPost) ───────────*/
function handleOitoGet_(e) {
  var acao = (e && e.parameter && e.parameter.acao) || '';
  if (acao === 'oito_status')     return oitoJson_(oitoStatus_());
  if (acao === 'oito_listar')     return oitoJson_(oitoListar_());
  if (acao === 'oito_statuscota') return oitoText_(oitoStatusCota_(e.parameter.id));
  return null; // não é ação do 08 da Sorte → deixa seu doGet seguir normal
}

function handleOitoPost_(e) {
  var acao = (e && e.parameter && e.parameter.acao) || '';
  if (acao === 'oito_criar') return oitoJson_(oitoCriar_(e.parameter));
  if (acao === 'oito_baixa') return oitoJson_(oitoBaixa_(e.parameter));
  return null;
}

/*──────────────── PLANILHA / CONFIG ─────────────────────────────────────*/
function oitoSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(OITO_ABA);
  if (!sh) {
    sh = ss.insertSheet(OITO_ABA);
    sh.getRange(1, 1, 1, OITO_COLS.length).setValues([OITO_COLS]).setFontWeight('bold');
  }
  return sh;
}

function oitoConfigSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(OITO_CONFIG_ABA);
  if (!sh) {
    sh = ss.insertSheet(OITO_CONFIG_ABA);
    sh.getRange(1, 1, 1, 2).setValues([['chave', 'valor']]).setFontWeight('bold');
    // valores padrão (ajuste na planilha quando quiser)
    var def = [
      ['totalCotas', 100],
      ['valorCota', 20],
      ['premioPrincipal', 1200],
      ['premioConsolacao', 200],
      ['percOrganizador', 20],
      ['dataInicio', ''],   // formato AAAA-MM-DD — defina ao abrir a rodada
      ['rodada', 1],
    ];
    sh.getRange(2, 1, def.length, 2).setValues(def);
  }
  return sh;
}

function oitoConfig_() {
  var sh = oitoConfigSheet_();
  var vals = sh.getDataRange().getValues();
  var cfg = {};
  for (var i = 1; i < vals.length; i++) {
    var k = String(vals[i][0] || '').trim();
    if (k) cfg[k] = vals[i][1];
  }
  // normaliza dataInicio (pode vir como Date)
  if (cfg.dataInicio instanceof Date) {
    cfg.dataInicio = Utilities.formatDate(cfg.dataInicio, 'America/Sao_Paulo', 'yyyy-MM-dd');
  } else {
    cfg.dataInicio = String(cfg.dataInicio || '').trim();
  }
  return {
    totalCotas: Number(cfg.totalCotas) || 100,
    valorCota: Number(cfg.valorCota) || 20,
    premioPrincipal: Number(cfg.premioPrincipal) || 1200,
    premioConsolacao: Number(cfg.premioConsolacao) || 200,
    percOrganizador: Number(cfg.percOrganizador) || 0,
    dataInicio: cfg.dataInicio,
    rodada: Number(cfg.rodada) || 1,
  };
}

/*──────────────── AÇÕES ─────────────────────────────────────────────────*/
function oitoStatus_() {
  var cfg = oitoConfig_();
  var rows = oitoSheet_().getDataRange().getValues();
  var pagas = 0;
  for (var i = 1; i < rows.length; i++) {
    if (Number(rows[i][0]) === cfg.rodada && String(rows[i][6]).toUpperCase().indexOf('PAGO') >= 0) pagas++;
  }
  return {
    totalCotas: cfg.totalCotas,
    valorCota: cfg.valorCota,
    premioPrincipal: cfg.premioPrincipal,
    premioConsolacao: cfg.premioConsolacao,
    percOrganizador: cfg.percOrganizador,
    dataInicio: cfg.dataInicio,
    rodada: cfg.rodada,
    cotasVendidas: pagas,
  };
}

// Lista pública — NÃO inclui telefone (privacidade)
function oitoListar_() {
  var cfg = oitoConfig_();
  var rows = oitoSheet_().getDataRange().getValues();
  var out = [];
  for (var i = 1; i < rows.length; i++) {
    if (Number(rows[i][0]) !== cfg.rodada) continue;
    out.push({
      cota: rows[i][1],
      nome: String(rows[i][3] || ''),
      numeros: String(rows[i][5] || ''),
      status: String(rows[i][6] || ''),
    });
  }
  return out;
}

function oitoStatusCota_(id) {
  id = String(id || '').trim();
  if (!id) return 'PENDENTE';
  var rows = oitoSheet_().getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][2]).trim() === id) {
      return String(rows[i][6]).toUpperCase().indexOf('PAGO') >= 0 ? 'PAGO' : 'PENDENTE';
    }
  }
  return 'PENDENTE';
}

function oitoCriar_(p) {
  var cfg = oitoConfig_();
  var nome = String(p.nome || '').trim();
  var telefone = String(p.telefone || '').replace(/\D/g, '');
  var numeros = String(p.numeros || '').trim();
  var metodo = String(p.metodo || 'pix').toLowerCase();
  var pin = String(p.pin || '').trim();

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

  var sh = oitoSheet_();
  var rows = sh.getDataRange().getValues();
  var naRodada = 0;
  for (var i = 1; i < rows.length; i++) { if (Number(rows[i][0]) === cfg.rodada) naRodada++; }
  if (naRodada >= cfg.totalCotas) return { erro: 'Todas as cotas desta rodada já foram preenchidas.' };

  var cota = naRodada + 1;
  var id = 'R' + cfg.rodada + 'C' + cota;
  var agora = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm');

  var status, cambista, dataPag;
  if (metodo === 'dinheiro') {
    var nomeCambista = oitoVerificarPin_(pin);
    if (!nomeCambista) return { erro: 'PIN do cambista inválido.' };
    status = 'PAGO DINHEIRO';
    cambista = nomeCambista;
    dataPag = agora;
  } else {
    status = 'PENDENTE';
    cambista = 'ONLINE';
    dataPag = '';
  }

  // ordena os números pra exibir bonito (05-12-17-...)
  var numerosFmt = nums.sort(function (a, b) { return a - b; }).map(function (n) { return ('0' + n).slice(-2); }).join('-');

  sh.appendRow([cfg.rodada, cota, id, nome, telefone, numerosFmt, status, cambista, dataPag, agora]);
  return { cota: cota, id: id, status: status };
}

// Chamado pelo webhook do Mercado Pago quando o PIX é aprovado
function oitoBaixa_(p) {
  var id = String(p.id || '').trim();
  if (!id) return { erro: 'id ausente' };
  var sh = oitoSheet_();
  var rows = sh.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][2]).trim() === id) {
      var linha = i + 1;
      sh.getRange(linha, 7).setValue('PAGO'); // Status
      if (!rows[i][8]) sh.getRange(linha, 9).setValue(Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm')); // DataPag
      if (p.telefone) sh.getRange(linha, 5).setValue(String(p.telefone));
      if (p.cambista) sh.getRange(linha, 8).setValue(String(p.cambista));
      return { ok: true };
    }
  }
  return { erro: 'cota não encontrada' };
}

// Verifica o PIN na aba de cambistas. Retorna o nome do cambista ou '' se inválido.
function oitoVerificarPin_(pin) {
  pin = String(pin || '').trim();
  if (!pin) return '';
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(OITO_CAMBISTAS_ABA);
  if (!sh) return '';
  var vals = sh.getDataRange().getValues();
  for (var i = 1; i < vals.length; i++) {
    var p = String(vals[i][OITO_CAMBISTA_COL_PIN - 1] || '').trim();
    if (p && p === pin) return String(vals[i][OITO_CAMBISTA_COL_NOME - 1] || 'Cambista').trim();
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
