(function() {

    // ===== CONFIGURAÇÃO DE USO =====
    // mode: 'ENCODED'  => você passa a encodedQuery pronta
    //       'NAME'     => filtra por nome (STARTSWITH)
    //       'SYSID'    => um único sys_id de grupo
    var mode = 'NAME';              // ajuste aqui: 'ENCODED', 'NAME', 'SYSID'

    // valor usado conforme o mode:
    // ENCoded: "nameSTARTSWITHSECOPS -"
    // NAME:    "SECOPS -"  (será usado em nameSTARTSWITH)
    // SYSID:   "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
    var filterValue = 'SECOPS -';   // ajuste aqui

    // prefixo do nome do arquivo HTML que será anexado
    var filePrefix = 'grupos_update_set_';

    // quais itens devem ser incluídos no Update Set
    var dadosUpdateSet = {
        group: true,   // registro do grupo (sys_user_group)
        type: true,    // types vinculados (sys_user_group_type)
        users: true,   // membros (sys_user_grmember)
        roles: true    // roles do grupo (sys_group_has_role)
    };

    // ===== CONSTRUÇÃO DO groupQuery A PARTIR DO MODO =====
    var groupQuery;

    if (mode === 'ENCODED') {
        groupQuery = filterValue; // já é encodedQuery pronta
    } else if (mode === 'NAME') {
        groupQuery = 'nameSTARTSWITH' + filterValue;
    } else if (mode === 'SYSID') {
        groupQuery = 'sys_id=' + filterValue;
    } else {
        // fallback seguro: não retorna nada
        groupQuery = 'sys_idISEMPTY';
    }

    // ===== FUNÇÕES UTILITÁRIAS =====
    function getInstanceName() {
        var p = new GlideRecord('sys_properties');
        p.addQuery('name', 'instance_name');
        p.query();
        return p.next() ? (p.getValue('value') || '') : '';
    }

    function getDateStamp() {
        var gdt = new GlideDateTime();
        var date = gdt.getDate();
        var y = date.getYearUTC();
        var m = ('0' + (date.getMonthUTC() + 1)).slice(-2);
        var d = ('0' + date.getDayOfMonthUTC()).slice(-2);
        return y + '_' + m + '_' + d;
    }

    // ===== COLETA DE DADOS (GRUPOS + MEMBROS + ROLES + TYPES) =====
    var instanceName = getInstanceName();
    var today = getDateStamp();
    var um = new GlideUpdateManager2();
    var results = [];

    // para evitar salvar o mesmo type várias vezes
    var typeIdsIncluded = {};

    var grp = new GlideRecord('sys_user_group');
    grp.addEncodedQuery(groupQuery);
    grp.query();
    while (grp.next()) {

        // garante que o grupo entra no Update Set atual (se habilitado)
        if (dadosUpdateSet.group) {
            um.saveRecord(grp);
        }

        // captura o(s) type(s) usados neste grupo (campo list)
        var typeValue = grp.getValue('type') || '';
        var typeDisplay = grp.getDisplayValue('type') || '';
        if (typeValue) {
            var typeIds = typeValue.split(',');
            for (var i = 0; i < typeIds.length; i++) {
                var typeId = typeIds[i].trim();
                if (typeId && !typeIdsIncluded[typeId]) {
                    var typeGR = new GlideRecord('sys_user_group_type');
                    if (typeGR.get(typeId)) {
                        if (dadosUpdateSet.type) {
                            um.saveRecord(typeGR); // inclui o registro de type no update set
                        }
                        typeIdsIncluded[typeId] = true;
                    }
                }
            }
        }

        var row = {
            groupName: grp.getValue('name') || '',
            groupSysId: grp.getUniqueValue(),
            description: grp.getValue('description') || '',
            typeDisplay: typeDisplay,
            members: [],
            roles: []
        };

        // membros
        var mem = new GlideRecord('sys_user_grmember');
        mem.addQuery('group', grp.sys_id);
        mem.query();
        while (mem.next()) {
            if (dadosUpdateSet.users) {
                um.saveRecord(mem);
            }
            row.members.push({
                name: mem.user.getDisplayValue(),
                sysId: mem.user + ''
            });
        }

        // roles
        var grRole = new GlideRecord('sys_group_has_role');
        grRole.addQuery('group', grp.sys_id);
        grRole.query();
        while (grRole.next()) {
            if (dadosUpdateSet.roles) {
                um.saveRecord(grRole);
            }
            row.roles.push({
                name: grRole.role.getDisplayValue(),
                sysId: grRole.role + ''
            });
        }

        results.push(row);
    }

    // ===== MONTA HTML =====
    var html = [];
    html.push('<html><head><meta charset="UTF-8">');
    html.push('<style>');
    html.push('body, table, td, th { font-family: Arial, sans-serif; font-size: 14px; }');
    html.push('h2 { margin-top:20px; }');
    html.push('</style>');
    html.push('</head><body>');
    html.push('<h1>Grupos, membros, roles e types incluídos no Update Set</h1>');
    html.push('<p>Instância: ' + instanceName + ' | Data: ' + today + '</p>');
    html.push('<p>Modo de filtro: ' + mode + '</p>');
    html.push('<p>Filtro de grupos (encodedQuery utilizada): <code>' +
              GlideStringUtil.escapeHTML(groupQuery) + '</code></p>');

    if (results.length === 0) {
        html.push('<p><strong>Nenhum grupo encontrado para o filtro informado.</strong></p>');
    }

    results.forEach(function(r) {
        html.push('<h2>Grupo: ' + GlideStringUtil.escapeHTML(r.groupName) + '</h2>');
        html.push('<p><strong>sys_id:</strong> ' + r.groupSysId + '</p>');
        if (r.description) {
            html.push('<p><strong>Descrição:</strong> ' +
                      GlideStringUtil.escapeHTML(r.description) + '</p>');
        }

        // type em formato display, como aparece no registro
        html.push('<p><strong>Type:</strong> ' +
                  GlideStringUtil.escapeHTML(r.typeDisplay || '(sem tipo)') + '</p>');

        // membros
        html.push('<h3>Membros (' + r.members.length + ')</h3>');
        html.push('<table border="1" style="border-collapse:collapse;">');
        html.push('<tr style="font-weight:bold;background-color:#d9ead3;"><td>Nome</td><td>sys_id</td></tr>');
        r.members.forEach(function(m) {
            html.push('<tr><td>' + GlideStringUtil.escapeHTML(m.name) +
                      '</td><td>' + m.sysId + '</td></tr>');
        });
        if (r.members.length === 0)
            html.push('<tr><td colspan="2"><em>Sem membros</em></td></tr>');
        html.push('</table>');

        // roles
        html.push('<h3>Roles do grupo (' + r.roles.length + ')</h3>');
        html.push('<table border="1" style="border-collapse:collapse;">');
        html.push('<tr style="font-weight:bold;background-color:#fce5cd;"><td>Role</td><td>sys_id</td></tr>');
        r.roles.forEach(function(k) {
            html.push('<tr><td>' + GlideStringUtil.escapeHTML(k.name) +
                      '</td><td>' + k.sysId + '</td></tr>');
        });
        if (r.roles.length === 0)
            html.push('<tr><td colspan="2"><em>Sem roles atribuídas</em></td></tr>');
        html.push('</table>');
    });

    html.push('</body></html>');
    var htmlContent = html.join('\n');

    // ===== ANEXA DIRETO NO sys_update_set ATUAL =====
    var gus = new GlideUpdateSet();        // API para pegar o update set atual
    var currentUSysId = gus.get();         // sys_id do update set atual

    if (!currentUSysId) {
        gs.addErrorMessage('Nenhum Update Set atual encontrado. Defina um Update Set antes de rodar o script.');
        return;
    }

    var us = new GlideRecord('sys_update_set');
    if (!us.get(currentUSysId)) {
        gs.addErrorMessage('Falha ao abrir o registro do Update Set atual: ' + currentUSysId);
        return;
    }

    var fileName = filePrefix + instanceName + '_' + today + '.xls.html';
    new GlideSysAttachment().write(us, fileName, 'text/html', htmlContent);

    gs.print('HTML anexado ao Update Set: ' + us.name + ' | arquivo: ' + fileName);
})();
