// ======================= PARÂMETROS =======================
var slaQuery = 'collection=sn_si_incident^ORDERBYname'; // AJUSTE AQUI
var limit = 50;

// ======================= FUNÇÕES AUXILIARES =======================
function secondsToReadable(sec) {
    if (!sec || isNaN(parseInt(sec, 10))) {
        return '';
    }
    var total = parseInt(sec, 10);
    var days = Math.floor(total / 86400);
    total = total % 86400;
    var hours = Math.floor(total / 3600);
    total = total % 3600;
    var minutes = Math.floor(total / 60);
    var seconds = total % 60;

    var parts = [];
    if (days) parts.push(days + ' dia' + (days > 1 ? 's' : ''));
    if (hours) parts.push(hours + ' hora' + (hours > 1 ? 's' : ''));
    if (minutes) parts.push(minutes + ' minuto' + (minutes > 1 ? 's' : ''));
    if (seconds || parts.length === 0) parts.push(seconds + ' segundo' + (seconds !== 1 ? 's' : ''));

    return parts.join(', ');
}

function durationToSeconds(durValue) {
    if (!durValue) {
        return 0;
    }
    var gdt = new GlideDateTime(durValue);
    var epoch = new GlideDateTime('1970-01-01 00:00:00');
    var diff = gs.dateDiff(epoch.getDisplayValue(), gdt.getDisplayValue(), true); // segundos
    return parseInt(diff, 10);
}

// Converte encoded em display:
// active = true <b>AND</b> assignment_group = VR_ANALYST
// state = Closed <b>OR</b> priority = High
function encodedToDisplay(encoded, tableName) {
    if (!encoded || !tableName) {
        return '';
    }

    var parts = encoded.split('^');
    var tmpGr = new GlideRecord(tableName);
    var pieces = [];
    var currentLogical = 'AND';

    for (var i = 0; i < parts.length; i++) {
        var seg = parts[i];
        if (!seg) {
            continue;
        }

        // operador OR
        if (seg.indexOf('OR') === 0) {
            currentLogical = 'OR';
            seg = seg.substring(2); // remove "OR" do começo (ex.: ORstate=3)
            if (!seg) {
                continue;
            }
        } else {
            currentLogical = 'AND';
        }

        var bits = seg.split('=');
        if (bits.length < 2) {
            continue;
        }
        var field = bits[0];
        var val = bits.slice(1).join('=');

        var displayOnly = '';
        try {
            if (tmpGr.isValidField(field)) {
                tmpGr.setValue(field, val);
                var disp = tmpGr[field].getDisplayValue();
                if (disp) {
                    displayOnly = disp;
                }
            }
        } catch (e) {
            // ignora erro
        }

        var finalVal = displayOnly || val;
        var piece = field + ' = ' + finalVal;

        if (pieces.length === 0) {
            pieces.push(piece);
        } else {
            pieces.push(' <b>' + currentLogical + '</b> ' + piece);
        }
    }

    return pieces.join('');
}

// ======================= BUSCA NA contract_sla =======================
var grSLA = new GlideRecord('contract_sla');
if (slaQuery) {
    grSLA.addEncodedQuery(slaQuery);
}
grSLA.setLimit(limit);
grSLA.orderBy('name');
grSLA.query();

// ======================= MONTAGEM DO HTML =======================
var html = '';
html += '<html><head>';
html += '<meta charset="utf-8">';
html += '<title>Documentação de SLAs</title>';
html += '<style>';
html += 'body{font-family:Arial,Helvetica,sans-serif;font-size:13px;}';
html += 'h1{font-size:20px;}';
html += 'h2{font-size:16px;margin-top:25px;border-bottom:1px solid #ccc;padding-bottom:4px;}';
html += 'table{border-collapse:collapse;width:100%;margin-top:8px;margin-bottom:16px;}';
html += 'th,td{border:1px solid #ccc;padding:4px 6px;vertical-align:top;}';
html += 'th{background:#f0f0f0;text-align:left;}';
html += '.cond-title{font-weight:bold;}';
html += '.query{font-family:monospace;}';
html += '</style>';
html += '</head><body>';
html += '<h1>Documentação de SLAs (contract_sla)</h1>';
html += '<p>Filtro utilizado: <code>' + slaQuery + '</code></p>';

if (!grSLA.hasNext()) {
    html += '<p><strong>Nenhum SLA encontrado para a query informada.</strong></p>';
} else {
    while (grSLA.next()) {

        var name = grSLA.getDisplayValue('name');
        var sys_id = grSLA.getUniqueValue();
        var active = grSLA.getDisplayValue('active');

        // Target: Response / Resolution / None
        var target = '';
        if (grSLA.isValidField('target')) {
            target = grSLA.getDisplayValue('target');
        }

        // Tabela alvo
        var tableNameRaw = grSLA.getValue('table');
        var collectionRaw = grSLA.isValidField('collection') ? grSLA.getValue('collection') : '';
        var baseTable = tableNameRaw || collectionRaw;
        var alvoLabel = baseTable || 'Não definido';

        // Duration legível
        var durValue = grSLA.duration;
        var durationRawSeconds = durationToSeconds(durValue);
        var durationReadable = secondsToReadable(durationRawSeconds);

        // Schedule
        var schedule = grSLA.getDisplayValue('schedule');
        var scheduleSource = grSLA.getDisplayValue('schedule_source');

        // Warn / Breach
        var warn = grSLA.isValidField('warn') ? grSLA.getDisplayValue('warn') : '';
        var breach = grSLA.isValidField('breach') ? grSLA.getDisplayValue('breach') : '';

        // Condições principais (encoded)
        var startCond  = grSLA.start_condition;
        var pauseCond  = grSLA.pause_condition;
        var stopCond   = grSLA.stop_condition;
        var resetCond  = grSLA.reset_condition;
        var cancelCond = grSLA.cancel_condition;
        var resumeCond = grSLA.resume_condition;

        // Display das condições
        var startDisplay  = encodedToDisplay(startCond,  baseTable);
        var pauseDisplay  = encodedToDisplay(pauseCond,  baseTable);
        var stopDisplay   = encodedToDisplay(stopCond,   baseTable);
        var resetDisplay  = encodedToDisplay(resetCond,  baseTable);
        var cancelDisplay = encodedToDisplay(cancelCond, baseTable);
        var resumeDisplay = encodedToDisplay(resumeCond, baseTable);

        html += '<h2>' + name + ' <span style="font-size:11px;color:#777;">[' + sys_id + ']</span></h2>';

        // Tabela geral de propriedades
        html += '<table>';
        html += '<tr><th style="width:22%;">Propriedade</th><th>Valor</th></tr>';
        html += '<tr><td>Ativo</td><td>' + active + '</td></tr>';
        html += '<tr><td>Target</td><td>' + (target || 'None') + '</td></tr>';
        html += '<tr><td>Tabela alvo</td><td><code>' + alvoLabel + '</code></td></tr>';
        html += '<tr><td>Duração</td><td>' + (durationReadable || 'Não definido / relativa') + '</td></tr>';
        html += '<tr><td>Schedule</td><td>' + (schedule || '') + '</td></tr>';
        html += '<tr><td>Schedule source</td><td>' + (scheduleSource || '') + '</td></tr>';
        if (warn || breach) {
            html += '<tr><td>Warn / Breach</td><td>';
            html += (warn ? 'Aviso em: ' + warn + '% ' : '');
            if (warn && breach) html += ' | ';
            html += (breach ? 'Breach em: ' + breach + '% ' : '');
            html += '</td></tr>';
        }
        html += '</table>';

        // Tabela de condições (sem descrição em linguagem natural)
        html += '<table>';
        html += '<tr><th style="width:20%;">Tipo de condição</th><th style="width:35%;">Query (encoded)</th><th style="width:45%;">Query (display)</th></tr>';

        // START
        html += '<tr>';
        html += '<td class="cond-title">Início (Start)</td>';
        html += '<td class="query"><code>' + (startCond || '&nbsp;') + '</code></td>';
        html += '<td>' + (startDisplay || '&nbsp;') + '</td>';
        html += '</tr>';

        // PAUSE
        html += '<tr>';
        html += '<td class="cond-title">Pausa (Pause)</td>';
        html += '<td class="query"><code>' + (pauseCond || '&nbsp;') + '</code></td>';
        html += '<td>' + (pauseDisplay || '&nbsp;') + '</td>';
        html += '</tr>';

        // STOP
        html += '<tr>';
        html += '<td class="cond-title">Parada / Conclusão (Stop)</td>';
        html += '<td class="query"><code>' + (stopCond || '&nbsp;') + '</code></td>';
        html += '<td>' + (stopDisplay || '&nbsp;') + '</td>';
        html += '</tr>';

        // RESET
        html += '<tr>';
        html += '<td class="cond-title">Reset (Reinício)</td>';
        html += '<td class="query"><code>' + (resetCond || '&nbsp;') + '</code></td>';
        html += '<td>' + (resetDisplay || '&nbsp;') + '</td>';
        html += '</tr>';

        // CANCEL
        html += '<tr>';
        html += '<td class="cond-title">Cancelamento (Cancel)</td>';
        html += '<td class="query"><code>' + (cancelCond || '&nbsp;') + '</code></td>';
        html += '<td>' + (cancelDisplay || '&nbsp;') + '</td>';
        html += '</tr>';

        // RESUME
        html += '<tr>';
        html += '<td class="cond-title">Retomada (Resume)</td>';
        html += '<td class="query"><code>' + (resumeCond || '&nbsp;') + '</code></td>';
        html += '<td>' + (resumeDisplay || '&nbsp;') + '</td>';
        html += '</tr>';

        html += '</table>';
    }
}

html += '</body></html>';

gs.print(html);
