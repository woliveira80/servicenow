// ============================================================
//  CONFIGURACOES — EDITE AQUI
// ============================================================
var CONFIG = {

    // Filtro de escopo — escolha UMA opcao (case-insensitive):
    // 'ALL'  → todas as regras
    // 'HOST' → apenas Vulnerable Item / Vulnerability Group / Exception Rule
    // 'APP'  → apenas Application Vulnerability (AppSec)
    ESCOPO: 'ALL',

    // Filtro por nome da Approval Rule (parcial, case-insensitive)
    // Deixe '' para não filtrar por nome
    // Exemplo: 'Exception' → traz só regras que contenham "Exception"
    FILTRO_NOME: '',

    // Mostrar regras sem aprovador configurado?
    MOSTRAR_SEM_APROVADOR: true,

    // Configuracoes da Task
    TASK_TABLE      : 'task',
    TASK_SHORT_DESC : 'VR Approval Rules - Relatorio de Aprovadores',
    TASK_ASSIGNED_TO: gs.getUserID()
};
// ============================================================
//  FIM DAS CONFIGURACOES
// ============================================================

// Tabelas por escopo
var HOST_TABLES = ['sn_vul_vulnerable_item', 'sn_vul_vulnerability', 'sn_vul_auto_exception_rule'];
var APP_TABLES  = ['sn_vul_app_vulnerable_item', 'sn_vul_app_vulnerability'];

function getScope(table) {
    if (!table) return 'none';
    for (var i = 0; i < APP_TABLES.length; i++)
        if (table === APP_TABLES[i]) return 'app';
    for (var j = 0; j < HOST_TABLES.length; j++)
        if (table === HOST_TABLES[j]) return 'host';
    return 'host'; // demais tabelas tratadas como host
}




// ------------------------------------------------------------
//  COLETA DOS DADOS
// ------------------------------------------------------------
var rows = [];

var ruleGR = new GlideRecord('sn_sec_cmn_approval_rule');
ruleGR.orderBy('name');
ruleGR.query();

while (ruleGR.next()) {
    var ruleName   = ruleGR.getDisplayValue('name');
    var ruleActive = ruleGR.getValue('active') == '1' ? 'true' : 'false';

    // Filtro por nome
    if (CONFIG.FILTRO_NOME !== '' &&
        ruleName.toLowerCase().indexOf(CONFIG.FILTRO_NOME.toLowerCase()) < 0) {
        continue;
    }

    var levelGR = new GlideRecord('sn_sec_cmn_approver_level');
    levelGR.addQuery('approval_rule', ruleGR.sys_id);
    levelGR.orderBy('order');
    levelGR.query();

    if (!levelGR.hasNext()) {

        if (!CONFIG.MOSTRAR_SEM_APROVADOR) continue;

        // Sem levels: so inclui quando escopo = ALL
        if (CONFIG.ESCOPO.toUpperCase() !== 'ALL') continue;

        rows.push({
            rule   : ruleName,
            active : ruleActive,
            lvlName: 'Nenhum aprovador configurado',
            order  : '',
            groups : '',
            users  : '',
            config : '',
            table  : '',
            atype  : '',
            scope  : 'none'
        });
        continue;
    }

    // Coleta levels e aplica filtro de escopo
    var levelRows = [];
    while (levelGR.next()) {
        var tbl   = levelGR.getValue('table');
        var scope = getScope(tbl);

        var escopoUpper = CONFIG.ESCOPO.toUpperCase();
        if (escopoUpper === 'HOST' && scope !== 'host') continue;
        if (escopoUpper === 'APP'  && scope !== 'app')  continue;

        levelRows.push({
            rule   : ruleName,
            active : ruleActive,
            lvlName: levelGR.getDisplayValue('name'),
            order  : levelGR.getValue('order'),
            groups : levelGR.getDisplayValue('groups'),
            users  : levelGR.getDisplayValue('users'),
            config : levelGR.getDisplayValue('approval_config'),
            table  : tbl,
            atype  : levelGR.getDisplayValue('type'),
            scope  : scope
        });
    }

    for (var lr = 0; lr < levelRows.length; lr++) {
        rows.push(levelRows[lr]);
    }
}




// ------------------------------------------------------------
//  MONTA HTML (SEM EMOJI)
// ------------------------------------------------------------
var prevRule  = '';
var tableRows = '';

for (var h = 0; h < rows.length; h++) {
    var d          = rows[h];
    var badgeLabel = d.scope === 'host' ? 'Host VR' :
                     d.scope === 'app'  ? 'AppSec'  :
                                           'Sem aprovador';
    var badgeClass = d.scope === 'host' ? 'badge-host' :
                     d.scope === 'app'  ? 'badge-app'  :
                                           'badge-none';

    var ruleCell   = '';
    if (d.rule !== prevRule) {
        ruleCell = '<strong>' + d.rule + '</strong>&nbsp;<span class="' + badgeClass + '">' + badgeLabel + '</span>';
        prevRule = d.rule;
    }

    var rowStyle = d.scope === 'none' ? ' style="background:#fff3f3"' : '';

    tableRows += '<tr' + rowStyle + '>'
        + '<td>'  + ruleCell  + '</td>'
        + '<td style="text-align:center">' + d.active + '</td>'
        + '<td>'  + d.lvlName + '</td>'
        + '<td style="text-align:center">' + d.order  + '</td>'
        + '<td>'  + d.groups  + '</td>'
        + '<td>'  + d.users   + '</td>'
        + '<td>'  + d.config  + '</td>'
        + '<td><code>' + d.table + '</code></td>'
        + '<td>'  + d.atype   + '</td>'
        + '</tr>';
}

// Resumo dos filtros aplicados
var filtroDesc = 'Escopo: <strong>' + CONFIG.ESCOPO.toUpperCase() + '</strong>';
if (CONFIG.FILTRO_NOME !== '') filtroDesc += ' | Nome contem: <strong>' + CONFIG.FILTRO_NOME + '</strong>';
filtroDesc += ' | Incluir sem aprovador: <strong>' + (CONFIG.MOSTRAR_SEM_APROVADOR ? 'Sim' : 'Nao') + '</strong>';

var html = '<!DOCTYPE html><html lang=\"pt-BR\"><head><meta charset=\"UTF-8\">'
    + '<title>VR Approval Rules</title><style>'
    + 'body{font-family:Arial,sans-serif;font-size:13px;margin:20px;background:#f5f5f5}'
    + 'h1{color:#1a1a2e;margin-bottom:4px}'
    + 'p{margin:4px 0 8px 0;color:#555}'
    + '.filters{background:#e8f0fe;border-left:4px solid #1565c0;padding:8px 12px;margin-bottom:12px;border-radius:3px;font-size:12px}'
    + 'table{border-collapse:collapse;width:100%;background:#fff;box-shadow:0 2px 6px rgba(0,0,0,.1)}'
    + 'th{background:#1a1a2e;color:#fff;padding:10px 8px;text-align:left;white-space:nowrap}'
    + 'td{padding:8px;border-bottom:1px solid:#ddd;vertical-align:top}'
    + 'tr:hover td{background:#f0f4ff}'
    + '.badge-host{background:#2e7d32;color:#fff;padding:2px 8px;border-radius:10px;font-size:11px}'
    + '.badge-app{background:#1565c0;color:#fff;padding:2px 8px;border-radius:10px;font-size:11px}'
    + '.badge-none{background:#c62828;color:#fff;padding:2px 8px;border-radius:10px;font-size:11px}'
    + 'code{background:#eee;padding:1px 5px;border-radius:3px;font-size:12px}'
    + '.legend{display:flex;gap:16px;margin-bottom:12px;flex-wrap:wrap}'
    + '.legend span{font-size:12px;display:flex;align-items:center;gap:6px}'
    + '</style></head><body>'
    + '<h1>VR Approval Rules - Niveis de Aprovacao</h1>'
    + '<p>Gerado em: ' + new GlideDateTime().getDisplayValue()
    + ' | Usuario: ' + gs.getUserDisplayName()
    + ' | Total de linhas: ' + rows.length + '</p>'
    + '<div class=\"filters\">Filtros aplicados: ' + filtroDesc + '</div>'
    + '<div class=\"legend\">'
    + '<span><span class=\"badge-host\">Host VR</span> Vulnerable Item / Vulnerability Group</span>'
    + '<span><span class=\"badge-app\">AppSec</span> Application Vulnerability</span>'
    + '<span><span class=\"badge-none\">Sem aprovador</span> Nenhum nivel configurado</span>'
    + '</div>'
    + '<table><tr>'
    + '<th>Approval Rule</th><th>Active</th><th>Level Name</th><th>Order</th>'
    + '<th>Grupo</th><th>Usuario</th><th>Approval Config</th><th>Tabela</th><th>Approval Type</th>'
    + '</tr>' + tableRows + '</table></body></html>';




// ------------------------------------------------------------
//  CRIA TASK E ANEXA HTML
// ------------------------------------------------------------
var taskGR = new GlideRecord(CONFIG.TASK_TABLE);
taskGR.initialize();
taskGR.short_description = CONFIG.TASK_SHORT_DESC;
taskGR.description       = 'Relatorio de Approval Rules do Vulnerability Response.'
                         + '\nGerado em: ' + new GlideDateTime().getDisplayValue()
                         + '\nUsuario: ' + gs.getUserDisplayName()
                         + '\nEscopo: ' + CONFIG.ESCOPO.toUpperCase()
                         + '\nFiltro nome: ' + (CONFIG.FILTRO_NOME || 'Nenhum')
                         + '\nTotal de linhas: ' + rows.length;
taskGR.assigned_to       = CONFIG.TASK_ASSIGNED_TO;
var taskSysId = taskGR.insert();

taskGR.get(taskSysId);
var taskNumber = taskGR.getDisplayValue('number');

var attachment = new GlideSysAttachment();
attachment.write(taskGR, 'vr_approval_rules.html', 'text/html', html);




// ------------------------------------------------------------
//  RESULTADO FINAL
// ------------------------------------------------------------
gs.print('');
gs.print('================================================');
gs.print('  CONCLUIDO COM SUCESSO!');
gs.print('------------------------------------------------');
gs.print('  Numero  : ' + taskNumber);
gs.print('  SysID   : ' + taskSysId);
gs.print('  Anexo   : vr_approval_rules.html');
gs.print('  Linhas  : ' + rows.length);
gs.print('  Escopo  : ' + CONFIG.ESCOPO.toUpperCase());
gs.print('  Filtro  : ' + (CONFIG.FILTRO_NOME || 'Nenhum'));
gs.print('  URL     : /nav_to.do?uri=' + CONFIG.TASK_TABLE + '.do?sys_id=' + taskSysId);
gs.print('================================================');
gs.print('');
