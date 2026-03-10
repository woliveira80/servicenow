(function() {

    // ---------- Config ----------
    // HTML_TASK = cria task com anexo HTML (comportamento original)
    // CSV_PRINT = não cria registro, imprime CSV no resultado do Background Script
    var OUTPUT_MODE = "CSV_PRINT"; // troque para "HTML_TASK" quando quiser

    // ---------- Colunas a exibir ----------
    var colunasExibir = {
        group: true,
        group_sys_id: true,
        status: true,
        description: true,
        manager: true,
        type: true,
        users: true,
        roles: true,
        parent: true,
        instance: true
    };

    // ---------- Critérios de INCOMPLETO ----------
    var criteriosIncompleto = {
        description: true,
        manager: false,
        type: false,
        roles: true,
        parent: false
    };

    // ---------- Utils ----------
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

    function getManagerName(gr) {
        return gr.manager ? gr.manager.getDisplayValue() : '';
    }

    function getGroupTypeName(gr) {
        return gr.type ? gr.getDisplayValue('type') : '';
    }

    function getUserCount(gr) {
        var agg = new GlideAggregate('sys_user_grmember');
        agg.addQuery('group', gr.sys_id);
        agg.addAggregate('COUNT');
        agg.query();
        agg.next();
        return parseInt(agg.getAggregate('COUNT'), 10) || 0;
    }

    function getRoleNames(gr) {
        var roles = [];
        var grRole = new GlideRecord('sys_group_has_role');
        grRole.addQuery('group', gr.sys_id);
        grRole.query();
        while (grRole.next()) {
            var role = new GlideRecord('sys_user_role');
            if (role.get(grRole.role + '')) {
                roles.push(role.name);
            }
        }
        return roles.join(', ');
    }

    function getParentName(gr) {
        return gr.parent ? gr.parent.getDisplayValue() : '';
    }

    function isGroupIncomplete(grInfo, criterios) {
        if (criterios.description && (!grInfo.description || grInfo.description === '(empty)')) return true;
        if (criterios.manager && (!grInfo.manager || grInfo.manager === '(empty)')) return true;
        if (criterios.type && (!grInfo.type || grInfo.type === '(empty)')) return true;
        if (criterios.roles && (!grInfo.roles || grInfo.roles === '(empty)')) return true;
        if (criterios.parent && (!grInfo.parent || grInfo.parent === '(empty)')) return true;
        return false;
    }

    // ---------- Grupos ----------
    var groupNames = [
        'VR_ADMIN',
        'VR_ANALYST',
        'VR_IMPORT_ADMIN',
        'Vulnerability Mgmt Approval Group',
        'CISO/Vulnerability Executives',
        'VR_CRITICAL_RESPONSE',
        'VR_WINDOWS_TEAM',
        'VR_INFRA_TEAM',
        'DSEG',
        'ETIR',
        'Coordenador CGP',
        'Secretária da SETI'
    ];

    var instanceName = getInstanceName();
    var today = getDateStamp();

    // ---------- Monta dados ----------
    var results = [];

    groupNames.forEach(function(groupName) {
        var grGroup = new GlideRecord('sys_user_group');
        grGroup.addQuery('name', groupName);
        grGroup.query();

        var description = '';
        var manager = '';
        var typeName = '';
        var userCount = 0;
        var rolesList = '';
        var parentName = '';
        var status = '';
        var cor = '';
        var groupSysId = '';

        if (grGroup.next()) {
            description = grGroup.description || '';
            manager = getManagerName(grGroup);
            typeName = getGroupTypeName(grGroup);
            userCount = getUserCount(grGroup);
            rolesList = getRoleNames(grGroup);
            parentName = getParentName(grGroup);
            groupSysId = grGroup.sys_id + '';

            var infoObj = {
                description: description || '(empty)',
                manager: manager || '(empty)',
                type: typeName || '(empty)',
                roles: rolesList || '(empty)',
                parent: parentName || '(empty)'
            };

            if (isGroupIncomplete(infoObj, criteriosIncompleto)) {
                status = 'INCOMPLETO';
                cor = 'background-color:#fff2cc;';
            } else {
                status = 'EXISTE';
                cor = 'background-color:#d9ead3;';
            }
        } else {
            status = 'NÃO EXISTE';
            description = manager = typeName = rolesList = parentName = '(empty)';
            userCount = 0;
            cor = 'background-color:#f4cccc;';
        }

        results.push({
            group: groupName,
            group_sys_id: groupSysId,
            status: status,
            description: description || '(empty)',
            manager: manager || '(empty)',
            type: typeName || '(empty)',
            users: userCount,
            roles: rolesList || '(empty)',
            parent: parentName || '(empty)',
            instance: instanceName,
            cor: cor
        });
    });

    results.sort(function(a, b) {
        return a.group.toLowerCase().localeCompare(b.group.toLowerCase());
    });

    // ---------- Modo HTML_TASK ----------
    if (OUTPUT_MODE === "HTML_TASK") {

        var html = [];
        html.push('<html><head><meta charset="UTF-8">');
        html.push('<style>body, table, td, th { font-family: Arial, sans-serif; font-size: 16px; }</style>');
        html.push('</head><body>');
        html.push('<h3>Grupos do Projeto</h3>');
        html.push('<table border="1" style="border-collapse:collapse;">');

        // Cabeçalho
        html.push('<tr style="font-weight:bold;background-color:#d9ead3;">' +
            (colunasExibir.group        ? '<td>Grupo</td>'         : '') +
            (colunasExibir.group_sys_id ? '<td>Sys ID Grupo</td>'  : '') +
            (colunasExibir.status       ? '<td>Status</td>'        : '') +
            (colunasExibir.description  ? '<td>Description</td>'   : '') +
            (colunasExibir.manager      ? '<td>Manager</td>'       : '') +
            (colunasExibir.type         ? '<td>Type</td>'          : '') +
            (colunasExibir.users        ? '<td>Usuários</td>'      : '') +
            (colunasExibir.roles        ? '<td>Roles</td>'         : '') +
            (colunasExibir.parent       ? '<td>Parent</td>'        : '') +
            (colunasExibir.instance     ? '<td>Instância</td>'     : '') +
        '</tr>');

        // Linhas
        results.forEach(function(row) {
            html.push(
                '<tr style="' + row.cor + '">' +
                    (colunasExibir.group        ? '<td>' + row.group + '</td>' : '') +
                    (colunasExibir.group_sys_id ? '<td>' + (row.group_sys_id || '') + '</td>' : '') +
                    (colunasExibir.status       ? '<td>' + row.status + '</td>' : '') +
                    (colunasExibir.description  ? '<td>' + row.description + '</td>' : '') +
                    (colunasExibir.manager      ? '<td>' + row.manager + '</td>' : '') +
                    (colunasExibir.type         ? '<td>' + row.type + '</td>' : '') +
                    (colunasExibir.users        ? '<td>' + row.users + '</td>' : '') +
                    (colunasExibir.roles        ? '<td>' + row.roles + '</td>' : '') +
                    (colunasExibir.parent       ? '<td>' + row.parent + '</td>' : '') +
                    (colunasExibir.instance     ? '<td>' + row.instance + '</td>' : '') +
                '</tr>'
            );
        });

        html.push('</table>');

        html.push('<h4>Informações</h4>');
        html.push('<ul>');
        html.push('<li>Instância: ' + instanceName + '</li>');
        html.push('<li>Data de geração: ' + today + '</li>');
        html.push('<li>Tabelas consultadas: sys_user_group, sys_user_grmember, sys_group_has_role, sys_user_role</li>');
        html.push('</ul>');

        html.push('</body></html>');

        var htmlContent = html.join('');

        var task = new GlideRecord('task');
        task.initialize();
        task.short_description = '[Groups] - Validação de Grupos p/ Projeto';
        task.description = 'Arquivo de levantamento de grupos que fazem parte do projeto. Avaliar anexo associado.';
        var taskSysId = task.insert();

        var fileNameHtml = 'groups_validacao_' + instanceName + '_' + today + '.xls.html';
        new GlideSysAttachment().write(task, fileNameHtml, 'text/html', htmlContent);

        if (taskSysId) {
            task = new GlideRecord('task');
            if (task.get(taskSysId)) {
                task.state = '3';
                task.close_notes = 'Arquivo de levantamento anexado automaticamente: ' + fileNameHtml;
                task.update();
                gs.print('TASK criada/fechada com anexo: ' + fileNameHtml + ' | Número: ' + task.number + ' | Sys ID: ' + taskSysId);
            }
        }

    } else {
        // ---------- Modo CSV_PRINT ----------

        var csvLines = [];

        // Cabeçalho
        var header = [];
        if (colunasExibir.group)        header.push('Grupo');
        if (colunasExibir.group_sys_id) header.push('Sys ID Grupo');
        if (colunasExibir.status)       header.push('Status');
        if (colunasExibir.description)  header.push('Description');
        if (colunasExibir.manager)      header.push('Manager');
        if (colunasExibir.type)         header.push('Type');
        if (colunasExibir.users)        header.push('Usuarios');
        if (colunasExibir.roles)        header.push('Roles');
        if (colunasExibir.parent)       header.push('Parent');
        if (colunasExibir.instance)     header.push('Instancia');

        csvLines.push('"' + header.join('","') + '"');

        // Linhas
        results.forEach(function(row) {
            var cols = [];
            if (colunasExibir.group)        cols.push(row.group);
            if (colunasExibir.group_sys_id) cols.push(row.group_sys_id || '');
            if (colunasExibir.status)       cols.push(row.status);
            if (colunasExibir.description)  cols.push(row.description);
            if (colunasExibir.manager)      cols.push(row.manager);
            if (colunasExibir.type)         cols.push(row.type);
            if (colunasExibir.users)        cols.push(row.users);
            if (colunasExibir.roles)        cols.push(row.roles);
            if (colunasExibir.parent)       cols.push(row.parent);
            if (colunasExibir.instance)     cols.push(row.instance);

            var safeCols = cols.map(function(c) {
                var v = (c + '').replace(/"/g, '""');
                return v;
            });

            csvLines.push('"' + safeCols.join('","') + '"');
        });

        var csvContent = csvLines.join('\n');
        var fileNameCsv = 'groups_validacao_' + instanceName + '_' + today + '.csv';

        gs.print('*** Script: === INÍCIO RELATÓRIO CSV - ' + fileNameCsv + ' ===');
        gs.print(csvContent);
        gs.print('*** Script: === FIM RELATÓRIO CSV ===');
        gs.print('*** Script: Tabelas consultadas: sys_user_group, sys_user_grmember, sys_group_has_role, sys_user_role');
    }

})();
