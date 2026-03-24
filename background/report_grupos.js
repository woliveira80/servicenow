(function() {

    // ===== CONFIGURAÇÃO DE USO =====
    // mode: 'ENCODED'  => você passa a encodedQuery pronta
    //       'NAME'     => filtra por nome (STARTSWITH)
    //       'SYSID'    => um único sys_id de grupo
    var mode = 'ENCODED';              // ajuste aqui: 'ENCODED', 'NAME', 'SYSID'

    // valor usado conforme o mode:
    // ENCoded: "nameSTARTSWITHSECOPS -"
    // NAME:    "SECOPS -"  (será usado em nameSTARTSWITH)
    // SYSID:   "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
    var filterValue = 'GOTOnameLIKEVulnerability^ORnameLIKEException Approver^ORnameLIKERemediation^ORnameLIKEOrca^ORDERBYDESCname';   // ajuste aqui

    // prefixo do nome do arquivo HTML que será anexado na task
    var filePrefix = 'grupos_';

    // ===== CONFIGURAÇÃO DE NÍVEL DE DETALHE DO RELATÓRIO =====
    // marque true/false conforme o que você quer ver no HTML
    var reportConfig = {
        showSysId:       true,  // sys_id do grupo
        showDescription: false,  // descrição do grupo
        showType:        true,  // campo type do grupo
        showManager:     false,  // manager (nome + sys_id)
        showParent:      false,  // parent group (nome + sys_id)
        showMembers:     true,  // tabela de membros
        showRoles:       true   // tabela de roles
    };

    // ===== CONSTRUÇÃO DE groupQuery A PARTIR DO MODO =====
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

    // ===== COLETA DE DADOS (GRUPOS + MANAGER + PARENT + MEMBROS + ROLES) =====
    var instanceName = getInstanceName();
    var today = getDateStamp();
    var results = [];

    var grp = new GlideRecord('sys_user_group');
    grp.addEncodedQuery(groupQuery);
    grp.query();
    while (grp.next()) {

        // type como aparece no registro (display value)
        var typeDisplay = grp.getDisplayValue('type');

        // manager (display e sys_id)
        var managerDisplay = grp.manager.getDisplayValue();
        var managerSysId   = grp.getValue('manager') || '';

        // parent (display e sys_id) [web:32][web:33]
        var parentDisplay = grp.parent.getDisplayValue();
        var parentSysId   = grp.getValue('parent') || '';

        var row = {
            groupName: grp.getValue('name') || '',
            groupSysId: grp.getUniqueValue(),
            description: grp.getValue('description') || '',
            typeDisplay: typeDisplay || '',
            managerName: managerDisplay || '',
            managerSysId: managerSysId,
            parentName: parentDisplay || '',
            parentSysId: parentSysId,
            members: [],
            roles: []
        };

        // membros
        if (reportConfig.showMembers) {
            var mem = new GlideRecord('sys_user_grmember');
            mem.addQuery('group', grp.sys_id);
            mem.query();
            while (mem.next()) {
                row.members.push({
                    name: mem.user.getDisplayValue(),
                    sysId: mem.user + ''
                });
            }
        }

        // roles
        if (reportConfig.showRoles) {
            var grRole = new GlideRecord('sys_group_has_role');
            grRole.addQuery('group', grp.sys_id);
            grRole.query();
            while (grRole.next()) {
                row.roles.push({
                    name: grRole.role.getDisplayValue(),
                    sysId: grRole.role + ''
                });
            }
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
    html.push('<h1>Grupos - Relatório configurável</h1>');
    html.push('<p>Instância: ' + instanceName + ' | Data: ' + today + '</p>');
    html.push('<p>Modo de filtro: ' + mode + '</p>');
    html.push('<p>Filtro de grupos (encodedQuery utilizada): <code>' +
              GlideStringUtil.escapeHTML(groupQuery) + '</code></p>');

    // mostra a configuração usada
    html.push('<p><strong>Configuração do relatório:</strong> ' +
              'sys_id=' + reportConfig.showSysId +
              ', description=' + reportConfig.showDescription +
              ', type=' + reportConfig.showType +
              ', manager=' + reportConfig.showManager +
              ', parent=' + reportConfig.showParent +
              ', members=' + reportConfig.showMembers +
              ', roles=' + reportConfig.showRoles +
              '</p>');

    if (results.length === 0) {
        html.push('<p><strong>Nenhum grupo encontrado para o filtro informado.</strong></p>');
    }

    results.forEach(function(r) {
        html.push('<h2>Grupo: ' + GlideStringUtil.escapeHTML(r.groupName) + '</h2>');

        if (reportConfig.showSysId) {
            html.push('<p><strong>sys_id:</strong> ' + r.groupSysId + '</p>');
        }

        if (reportConfig.showDescription && r.description) {
            html.push('<p><strong>Descrição:</strong> ' +
                      GlideStringUtil.escapeHTML(r.description) + '</p>');
        }

        if (reportConfig.showManager) {
            if (r.managerName || r.managerSysId) {
                html.push('<p><strong>Manager:</strong> ' +
                          GlideStringUtil.escapeHTML(r.managerName || '(sem manager)') +
                          ' | <strong>sys_id manager:</strong> ' +
                          GlideStringUtil.escapeHTML(r.managerSysId || '') +
                          '</p>');
            } else {
                html.push('<p><strong>Manager:</strong> (sem manager)</p>');
            }
        }

        if (reportConfig.showParent) {
            if (r.parentName || r.parentSysId) {
                html.push('<p><strong>Parent group:</strong> ' +
                          GlideStringUtil.escapeHTML(r.parentName || '(sem parent)') +
                          ' | <strong>sys_id parent:</strong> ' +
                          GlideStringUtil.escapeHTML(r.parentSysId || '') +
                          '</p>');
            } else {
                html.push('<p><strong>Parent group:</strong> (sem parent)</p>');
            }
        }

        if (reportConfig.showType) {
            html.push('<p><strong>Type:</strong> ' +
                      GlideStringUtil.escapeHTML(r.typeDisplay || '(sem tipo)') + '</p>');
        }

        // membros
        if (reportConfig.showMembers) {
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
        }

        // roles
        if (reportConfig.showRoles) {
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
        }
    });

    html.push('</body></html>');
    var htmlContent = html.join('\n');

    // ===== CRIA TASK, ANEXA E FECHA =====
    var task = new GlideRecord('task');
    task.initialize();
    task.short_description = '[Groups] - Validação de Grupos p/ Projeto';
    task.description = 'Arquivo de levantamento de grupos com nível de detalhe configurável (sys_id, descrição, type, manager, parent, membros, roles). Avaliar anexo associado.';
    var taskSysId = task.insert();

    var fileName = filePrefix + instanceName + '_' + today + '.xls.html';
    new GlideSysAttachment().write(task, fileName, 'text/html', htmlContent); // [web:48]

    if (taskSysId) {
        task = new GlideRecord('task');
        if (task.get(taskSysId)) {
            // 3 normalmente é um estado fechado na tabela task [web:20]
            task.state = '3';
            task.close_notes = 'Arquivo de levantamento anexado automaticamente: ' + fileName;
            task.update();
            gs.print('Número da Task: ' + task.number + ' | Sys ID: ' + taskSysId);
        }
    }

    gs.print('TASK criada/fechada com anexo: ' + fileName);

})();
