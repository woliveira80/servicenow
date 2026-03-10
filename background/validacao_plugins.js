(function() {

    // ---------- Config ----------
    // HTML_TASK = cria task com anexo HTML (comportamento original)
    // CSV_PRINT = não cria registro, imprime CSV no resultado do Background Script
    var OUTPUT_MODE = "CSV_PRINT"; // troque para "HTML_TASK" quando quiser

    var SHOW_PROGRESS_TABLE = false;

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
        return y + '' + m + '' + d;
    }

    function parseVer(v) {
        if (!v) return [0];
        return ('' + v).split('.').map(function(n) {
            var x = parseInt(n, 10);
            return isNaN(x) ? 0 : x;
        });
    }

    function cmpVer(a, b) {
        var A = parseVer(a), B = parseVer(b);
        var len = Math.max(A.length, B.length);
        for (var i = 0; i < len; i++) {
            var ai = A[i] || 0, bi = B[i] || 0;
            if (ai > bi) return 1;
            if (ai < bi) return -1;
        }
        return 0;
    }

    function findInPluginsBySource(code) {
        var field = 'source';
        var best = null;

        var g1 = new GlideRecord('sys_plugins');
        if (!g1.isValidField(field)) return {found: false, name: ''};
        g1.addQuery(field, code);
        g1.query();
        if (g1.next()) {
            return {
                found: true,
                type: 'Plugin',
                version: g1.getValue('version') || '',
                name: g1.getValue('name') || ''
            };
        }

        var g2 = new GlideRecord('sys_plugins');
        g2.addQuery(field, 'STARTSWITH', code);
        g2.query();
        while (g2.next()) {
            var v = g2.getValue('version') || '';
            if (!best || cmpVer(v, best.version) > 0) {
                best = {
                    found: true,
                    type: 'Plugin',
                    version: v,
                    name: g2.getValue('name') || ''
                };
            }
        }
        return best || {found: false, name: ''};
    }

    function findInScopes(code) {
        var gr = new GlideRecord('sys_scope');
        gr.addQuery('scope', code);
        gr.query();
        if (gr.next()) {
            return {
                found: true,
                type: 'App Scope',
                version: gr.getValue('version') || '',
                name: gr.getValue('name') || ''
            };
        }
        return {found: false, name: ''};
    }

    function findInStoreApps(code) {
        var gr = new GlideRecord('sys_store_app');
        gr.addQuery('scope', code);
        gr.query();
        if (gr.next()) {
            var v = gr.getValue('version') || '';
            var lv = gr.getValue('latest_version') || '';
            return {
                latest: lv,
                outdated: lv && lv != v,
                name: gr.getValue('name') || ''
            };
        }
        return {latest: '', outdated: false, name: ''};
    }

    function diffHHMM(startStr, endStr) {
        if (!startStr || !endStr) return '';
        try {
            var gStart = new GlideDateTime();
            gStart.setDisplayValue(startStr);
            var gEnd = new GlideDateTime();
            gEnd.setDisplayValue(endStr);
            var diff = GlideDateTime.subtract(gEnd, gStart);
            var seconds = Math.abs(diff.getNumericValue() / 1000);
            var hours = Math.floor(seconds / 3600);
            var minutes = Math.floor((seconds % 3600) / 60);
            var hh = (hours < 10 ? '0' : '') + hours;
            var mm = (minutes < 10 ? '0' : '') + minutes;
            return hh + ':' + mm;
        } catch (e) {
            return '';
        }
    }

    function getProgressByPluginName(pluginName) {
        var info = {
            found: false,
            name: '',
            start_time: '',
            completion_time: '',
            install_time_hhmm: '',
            message: '',
            mode: '',
            load_demo_data: ''
        };
        if (!pluginName) return info;

        var gr = new GlideRecord('sn_appclient_progress_tracker');
        if (!gr.isValid()) return info;

        gr.addQuery('name', 'CONTAINS', pluginName);
        gr.orderByDesc('start_time');
        gr.setLimit(1);
        gr.query();
        if (!gr.next()) return info;

        info.found = true;
        info.name = gr.getValue('name') || '';
        info.start_time = gr.isValidField('start_time') ? gr.getDisplayValue('start_time') : '';
        info.completion_time = gr.isValidField('completion_time') ? gr.getDisplayValue('completion_time') : '';
        info.message = gr.isValidField('message') ? gr.getValue('message') : '';
        info.mode = gr.isValidField('mode') ? gr.getValue('mode') : '';

        if (gr.isValidField('payload')) {
            var payloadStr = gr.getValue('payload') || '';
            try {
                var payloadObj = JSON.parse(payloadStr);
                if (payloadObj && payloadObj.hasOwnProperty('load_demo_data')) {
                    var v = payloadObj.load_demo_data;
                    if (v === true || v === 'true') {
                        info.load_demo_data = 'true';
                    } else if (v === false || v === 'false') {
                        info.load_demo_data = 'false';
                    } else {
                        info.load_demo_data = '' + v;
                    }
                }
            } catch (e) {}
        }

        info.install_time_hhmm = diffHHMM(info.start_time, info.completion_time);
        return info;
    }

    // ---------- Lista de plugins / scopes ----------
    var itemsRaw = [
        'sn_si',
        'com.snc.si_dep',
        'sn_secops_setup',
        'sn_si_aw',
        'sn_ti',
        'sn_sec_cmn_orch',
        'sn_sec_spoke',
        'sn_sec_int',
        'sn_sec_cmn',
        'sn_app_secops_ui',
        'sn_event_ingestion',
        'sn_ti_ac',
        'sn_ti_seismic',
        'sn_bod',
        'sn_ciso_dashboard',
        'sn_sir_analytics',
        'sn_msi',
        'sn_chat_collab',
        'sn_msi_evam_card',
        'sn_msi_evam_card',
        'sn_msim_status_rpt',
        'sn_fe',
        'sn_playbook_exp',
        'sn_msim_evam_task',
        'com.glide.hub.dynamic_inputs',
        'com.glide.hub.action_step.rest',
        'com.glide.hub.action_type.datastream',
        'com.glide.hub.integration.runtime',
        'com.glide.hub.integrations',
        'sn_vul_nvd',
        'sn_vul_tenable',
        'sn_sec_panfw',
        'sn_sec_sentinel',
        'sn_ms_ad_v2_spoke',
        'sn_fe_sharepoint',
        'sn_mst_connector',
        'sn_msteams_com_spk',
        'com.snc.notify',
        'sn_notify_msteams',
        'sn_vul',
        'sn_sec_analytics',
        'sn_vul_cmn',
        'sn_vul_cmn_ws',
        'com.snc.vul_dep',
        'sn_vul_licensing',
        'sn_vul_analytics',
        'sn_vul_recom',
        'sn_vul_analyst',
        'sn_vul_patch_orch',
        'sn_vul_solution'
    ];

    var items = itemsRaw
        .map(function(s) { return (s || '').trim(); })
        .filter(function(s, i, arr) {
            return s.length > 0 && arr.indexOf(s) === i;
        });

    var instanceName = getInstanceName();
    var today = getDateStamp();

    // ---------- Monta dados ----------
    var pluginRows = [];

    items.forEach(function(code) {
        var tipo = 'Não encontrado',
            versao = '',
            cor = '',
            name = '',
            storeName = '',
            status = 'OK';

        var rPlugin = findInPluginsBySource(code);
        if (rPlugin.found) {
            tipo = rPlugin.type;
            versao = rPlugin.version;
            name = rPlugin.name;
        } else {
            var rScope = findInScopes(code);
            if (rScope.found) {
                tipo = rScope.type;
                versao = rScope.version;
                name = rScope.name;
            }
        }

        var store = findInStoreApps(code);
        if (store.name) storeName = store.name;

        if (tipo === 'Não encontrado') {
            status = 'Instalar';
            cor = 'background-color:#f4cccc;';
        } else if (store.outdated) {
            status = 'Atualizar';
            cor = 'background-color:#fff2cc;';
        }

        var finalName = name || storeName || '';

        pluginRows.push({
            code: code,
            name: finalName,
            status: status,
            instance: instanceName,
            tipo: tipo,
            versao: versao || '',
            latest: store.latest || '',
            cor: cor
        });
    });

    pluginRows.sort(function(a, b) {
        return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
    });

    var progressRows = [];
    if (SHOW_PROGRESS_TABLE) {
        pluginRows.forEach(function(row) {
            var progress = getProgressByPluginName(row.name);
            if (!progress.found) return;

            progressRows.push({
                scope: row.code,
                name: row.name || progress.name || '',
                inicio: progress.start_time || '',
                conclusao: progress.completion_time || '',
                tempo: progress.install_time_hhmm || '',
                load_demo_data: progress.load_demo_data || '',
                mensagem: progress.message || '',
                modo: progress.mode || ''
            });
        });

        if (progressRows.length > 0) {
            progressRows.sort(function(a, b) {
                if (!a.conclusao && !b.conclusao) return 0;
                if (!a.conclusao) return -1;
                if (!b.conclusao) return 1;
                return a.conclusao.localeCompare(b.conclusao);
            });
        }
    }

    // ---------- Modo HTML_TASK ----------
    if (OUTPUT_MODE === "HTML_TASK") {

        var html = [];
        html.push('<html><head><meta charset="UTF-8">');
        html.push('<style>body, table, td, th { font-family: Arial, sans-serif; font-size: 16px; }</style>');
        html.push('</head><body>');

        html.push('<h3>Plugins / App Scopes</h3>');
        html.push('<table border="1" style="border-collapse:collapse;">');
        html.push(
            '<tr style="font-weight:bold;background-color:#d9ead3;">' +
            '<td>Scope/Plugin</td>' +
            '<td>Nome</td>' +
            '<td>Status</td>' +
            '<td>Instância</td>' +
            '<td>Tipo</td>' +
            '<td>Versão</td>' +
            '<td>Última Versão Store</td>' +
            '</tr>'
        );

        pluginRows.forEach(function(row) {
            html.push(
                '<tr style="' + row.cor + '">' +
                '<td>' + row.code + '</td>' +
                '<td>' + row.name + '</td>' +
                '<td>' + row.status + '</td>' +
                '<td>' + row.instance + '</td>' +
                '<td>' + row.tipo + '</td>' +
                '<td>' + row.versao + '</td>' +
                '<td>' + row.latest + '</td>' +
                '</tr>'
            );
        });

        html.push('</table>');

        if (SHOW_PROGRESS_TABLE && progressRows.length > 0) {
            html.push('<h3>Informações de Progresso</h3>');
            html.push('<table border="1" style="border-collapse:collapse;">');
            html.push(
                '<tr style="font-weight:bold;background-color:#d9ead3;">' +
                '<td>Scope/Plugin</td>' +
                '<td>Nome</td>' +
                '<td>Início</td>' +
                '<td>Conclusão</td>' +
                '<td>Tempo de instalação (hh:mm)</td>' +
                '<td>Carregar dados de demonstração</td>' +
                '<td>Mensagem</td>' +
                '<td>Modo</td>' +
                '</tr>'
            );

            progressRows.forEach(function(r) {
                html.push(
                    '<tr>' +
                    '<td>' + r.scope + '</td>' +
                    '<td>' + r.name + '</td>' +
                    '<td>' + r.inicio + '</td>' +
                    '<td>' + r.conclusao + '</td>' +
                    '<td>' + r.tempo + '</td>' +
                    '<td>' + r.load_demo_data + '</td>' +
                    '<td>' + r.mensagem + '</td>' +
                    '<td>' + r.modo + '</td>' +
                    '</tr>'
                );
            });

            html.push('</table>');
        }

        html.push('<h4>Tabelas consultadas</h4>');
        html.push('<ul>');
        html.push('<li>sys_plugins</li>');
        html.push('<li>sys_scope</li>');
        html.push('<li>sys_store_app</li>');
        html.push('<li>sn_appclient_progress_tracker</li>');
        html.push('</ul>');

        html.push('</body></html>');

        var htmlContent = html.join('');

        var task = new GlideRecord('task');
        task.initialize();
        task.short_description = '[Plugins] - Validação de Plugins p/ Projeto';
        task.description = 'Relatório de plugins e informações de progresso de instalação.';
        var taskSysId = task.insert();

        var fileNameHtml = 'pluginsvalidacao' + instanceName + '_' + today + '.xls.html';
        new GlideSysAttachment().write(task, fileNameHtml, 'text/html', htmlContent);

        if (taskSysId) {
            task = new GlideRecord('task');
            if (task.get(taskSysId)) {
                task.state = '3'; // Closed Complete
                task.close_notes = 'Arquivo de levantamento anexado automaticamente: ' + fileNameHtml;
                task.update();
                gs.print('TASK criada/fechada com anexo: ' + fileNameHtml + ' | Número: ' + task.number + ' | Sys ID: ' + taskSysId);
            }
        }

    } else { // ---------- Modo CSV_PRINT ----------

        var csvLines = [];
        csvLines.push('"Scope/Plugin","Nome","Status","Instância","Tipo","Versão","Última Versão Store"');

        pluginRows.forEach(function(row) {
            csvLines.push(
                '"' + row.code.replace(/"/g, '""') + '",' +
                '"' + row.name.replace(/"/g, '""') + '",' +
                '"' + row.status + '",' +
                '"' + row.instance.replace(/"/g, '""') + '",' +
                '"' + row.tipo.replace(/"/g, '""') + '",' +
                '"' + row.versao.replace(/"/g, '""') + '",' +
                '"' + row.latest.replace(/"/g, '""') + '"'
            );
        });

        if (SHOW_PROGRESS_TABLE && progressRows.length > 0) {
            csvLines.push('');
            csvLines.push('"=== INFORMAÇÕES DE PROGRESSO ==="');
            csvLines.push('"Scope/Plugin","Nome","Início","Conclusão","Tempo (hh:mm)","Load Demo Data","Mensagem","Modo"');

            progressRows.forEach(function(r) {
                csvLines.push(
                    '"' + r.scope.replace(/"/g, '""') + '",' +
                    '"' + r.name.replace(/"/g, '""') + '",' +
                    '"' + r.inicio.replace(/"/g, '""') + '",' +
                    '"' + r.conclusao.replace(/"/g, '""') + '",' +
                    '"' + r.tempo.replace(/"/g, '""') + '",' +
                    '"' + r.load_demo_data.replace(/"/g, '""') + '",' +
                    '"' + r.mensagem.replace(/"/g, '""') + '",' +
                    '"' + r.modo.replace(/"/g, '""') + '"'
                );
            });
        }

        var csvContent = csvLines.join('\n');
        var fileNameCsv = 'pluginsvalidacao' + instanceName + '_' + today + '.csv';

        gs.print('*** Script: === INÍCIO RELATÓRIO CSV - ' + fileNameCsv + ' ===');
        gs.print(csvContent);
        gs.print('*** Script: === FIM RELATÓRIO CSV ===');
        gs.print('*** Script: Tabelas consultadas: sys_plugins, sys_scope, sys_store_app, sn_appclient_progress_tracker');
    }

})();
