(function() {

    // ======================= CONFIG =======================
    var OUTPUT_MODE = "CSV_PRINT";

    var tableName = 'sn_si_incident';
    var viewName  = 'sirw';   // '' para default

    // ======================= UTILS =======================
    function getInstanceName() {
        var p = new GlideRecord('sys_properties');
        p.addQuery('name', 'instance_name');
        p.query();
        return p.next() ? (p.getValue('value') || '') : '';
    }

    function getDateStamp() {
        var gdt  = new GlideDateTime();
        var date = gdt.getDate();
        var y = date.getYearUTC();
        var m = ('0' + (date.getMonthUTC() + 1)).slice(-2);
        var d = ('0' + date.getDayOfMonthUTC()).slice(-2);
        return y + '_' + m + '_' + d;
    }

    function s(val) {
        return (val === null || val === undefined) ? '' : String(val);
    }

    function getViewSysId(viewName) {
        if (!viewName)
            return '';
        var viewGR = new GlideRecord('sys_ui_view');
        viewGR.addQuery('name', viewName);
        viewGR.setLimit(1);
        viewGR.query();
        if (viewGR.next())
            return String(viewGR.getUniqueValue() || '');
        return null;
    }

    // pega sys_id da tabela e tabela-pai (extends)
    function getTableParent(currentTable) {
        var info = { table: currentTable, parent: '' };
        var t = new GlideRecord('sys_db_object');
        t.addQuery('name', currentTable);
        t.setLimit(1);
        t.query();
        if (t.next()) {
            var parent = t.getValue('super_class') || t.getValue('extends');
            info.parent = parent || '';
        }
        return info;
    }

    /**
     * Busca label com fallback:
     * 1) sys_documentation.table = tableName + element + language
     * 2) sys_documentation.name  = tableName + element + language
     * 3) Repete subindo na hierarquia de tabelas (incident, task, etc.)
     * 4) Idioma: tenta langPrimary, se não achar tenta langFallback
     */
    function getLabelWithFallback(tableName, field, langPrimary, langFallback) {
        if (!field)
            return '';

        // monta cadeia de tabelas (tabela + pais)
        var chain = [];
        var current = tableName;

        var safety = 0;
        while (current && safety < 10) {
            chain.push(current);
            var info = getTableParent(current);
            if (!info.parent || info.parent === current)
                break;
            current = info.parent;
            safety++;
        }

        function tryOneLanguage(lang) {
            for (var i = 0; i < chain.length; i++) {
                var tbl = chain[i];

                // 1) tentar por table
                var doc = new GlideRecord('sys_documentation');
                doc.addQuery('table', tbl);
                doc.addQuery('element', field);
                doc.addQuery('language', lang);
                doc.setLimit(1);
                doc.query();
                if (doc.next())
                    return doc.getValue('label') || '';

                // 2) tentar por name (compatibilidade)
                doc = new GlideRecord('sys_documentation');
                doc.addQuery('name', tbl);
                doc.addQuery('element', field);
                doc.addQuery('language', lang);
                doc.setLimit(1);
                doc.query();
                if (doc.next())
                    return doc.getValue('label') || '';
            }
            return '';
        }

        // tenta idioma primário
        var lbl = tryOneLanguage(langPrimary);
        if (lbl)
            return lbl;

        // fallback de idioma
        if (langFallback) {
            lbl = tryOneLanguage(langFallback);
            if (lbl)
                return lbl;
        }

        return '';
    }

    function csvEscape(val) {
        val = s(val);
        val = val.replace(/"/g, '""');
        return '"' + val + '"';
    }

    // ======================= COLETA CAMPOS/SEÇÕES =======================
    var instanceName = getInstanceName();
    var today        = getDateStamp();
    var viewSysId    = getViewSysId(viewName);

    if (viewSysId === null) {
        gs.print('*** Script: ERRO: View não encontrada: ' + viewName);
        return;
    }

    var resultados = []; // {secao, campo, label_en, label_pt}

    var secGR = new GlideRecord('sys_ui_section');
    secGR.addQuery('name', tableName);
    if (viewName) {
        secGR.addQuery('view', viewSysId);
    } else {
        secGR.addNullQuery('view');
    }
    secGR.orderBy('position');
    secGR.query();

    while (secGR.next()) {
        var caption = s(secGR.getDisplayValue('caption') || 'null');

        var elGR = new GlideRecord('sys_ui_element');
        elGR.addQuery('sys_ui_section', secGR.getUniqueValue());
        elGR.orderBy('position');
        elGR.query();

        while (elGR.next()) {
            var field = s(elGR.getValue('element'));
            if (!field)
                continue;

            // pula decoradores e activity.xml
            if (field.startsWith('.') || field === 'activity.xml')
                continue;

            // PT (pb) com fallback EN
            var labelPT = s(getLabelWithFallback(tableName, field, 'pb', 'en') || '(sem tradução)');
            // EN puro
            var labelEN = s(getLabelWithFallback(tableName, field, 'en', null) || '(sem tradução)');

            resultados.push({
                secao:     caption,
                campo:     field,
                label_en:  labelEN,
                label_pt:  labelPT,
                tabela:    tableName,
                view:      viewName || 'default',
                instancia: instanceName
            });
        }
    }

    // ======================= MODO CSV_PRINT =======================
    if (OUTPUT_MODE === "CSV_PRINT") {
        var csvLines = [];
        csvLines.push('"Secao","Campo","Label_EN","Label_PT","Tabela","View","Instancia"');

        for (var i = 0; i < resultados.length; i++) {
            var row = resultados[i];
            var cols = [
                row.secao,
                row.campo,
                row.label_en,
                row.label_pt,
                row.tabela,
                row.view,
                row.instancia
            ];
            var safe = cols.map(function(c) {
                var v = (c + '').replace(/"/g, '""');
                return '"' + v + '"';
            });
            csvLines.push(safe.join(','));
        }

        var csvContent = csvLines.join('\n');
        var fileNameCsv = 'campos_' + tableName + '_' + (viewName || 'default') + '_' + today + '.csv';

        gs.print('*** Script: === INÍCIO RELATÓRIO CSV - ' + fileNameCsv + ' ===');
        gs.print(csvContent);
        gs.print('*** Script: === FIM RELATÓRIO CSV ===');
        return;
    }

    // Se quiser, aqui você pode reaproveitar o HTML_TASK do script anterior

})();
