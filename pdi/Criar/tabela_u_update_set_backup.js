// === Criar/ajustar tabela u_update_set_backup ===

// 1) Garantir que a tabela exista
var tableName  = 'u_update_set_backup';
var tableLabel = 'Update Set Backup';

var tableGr = new GlideRecord('sys_db_object');
tableGr.addQuery('name', tableName);
tableGr.query();

if (!tableGr.next()) {
    tableGr.initialize();
    tableGr.name        = tableName;
    tableGr.label       = tableLabel;
    tableGr.super_class = 'task';     // ou deixe vazio se quiser tabela "solta"
    tableGr.is_extendable = false;
    tableGr.update();
    gs.print('Tabela criada: ' + tableName);
} else {
    gs.print('Tabela já existia: ' + tableName);
}

// 2) Criar/ajustar campos principais (dictionary entries)
function upsertStringField(table, element, label, maxLen, isDisplay) {
    var d = new GlideRecord('sys_dictionary');
    d.addQuery('name', table);
    d.addQuery('element', element);
    d.query();

    if (!d.next()) {
        d.initialize();
        d.name    = table;
        d.element = element;
        d.label   = label;
        d.internal_type = 'string';
    }

    d.max_length = maxLen;
    d.display    = isDisplay ? true : false;
    d.mandatory  = false;
    d.update();
    gs.print('Campo ' + element + ' ajustado. max_length=' + maxLen);
}

// u_name com 120 caracteres e como display=false (se quiser display, passe true)
upsertStringField(tableName, 'u_name', 'Name', 120, false);

// u_state (40)
upsertStringField(tableName, 'u_state', 'State', 40, false);

// u_created_by, u_updated_by etc. se quiser
upsertStringField(tableName, 'u_created_by', 'Created by', 40, false);
upsertStringField(tableName, 'u_updated_by', 'Updated by', 40, false);

// 3) Campo referência para o Update Set
var dictRef = new GlideRecord('sys_dictionary');
dictRef.addQuery('name', tableName);
dictRef.addQuery('element', 'u_update_set');
dictRef.query();

if (!dictRef.next()) {
    dictRef.initialize();
    dictRef.name          = tableName;
    dictRef.element       = 'u_update_set';
    dictRef.label         = 'Update set';
    dictRef.internal_type = 'reference';
    dictRef.reference     = 'sys_update_set';
    dictRef.mandatory     = false;
    dictRef.update();
    gs.print('Campo referência u_update_set criado.');
} else {
    dictRef.internal_type = 'reference';
    dictRef.reference     = 'sys_update_set';
    dictRef.update();
    gs.print('Campo referência u_update_set já existia (ajustado se necessário).');
}

// 4) Campo boolean u_downloaded
var dictBool = new GlideRecord('sys_dictionary');
dictBool.addQuery('name', tableName);
dictBool.addQuery('element', 'u_downloaded');
dictBool.query();

if (!dictBool.next()) {
    dictBool.initialize();
    dictBool.name          = tableName;
    dictBool.element       = 'u_downloaded';
    dictBool.label         = 'Downloaded';
    dictBool.internal_type = 'boolean';
    dictBool.mandatory     = false;
    dictBool.update();
    gs.print('Campo boolean u_downloaded criado.');
} else {
    dictBool.internal_type = 'boolean';
    dictBool.update();
    gs.print('Campo boolean u_downloaded já existia.');
}

// 5) Campo data/hora u_exported_on
var dictDate = new GlideRecord('sys_dictionary');
dictDate.addQuery('name', tableName);
dictDate.addQuery('element', 'u_exported_on');
dictDate.query();

if (!dictDate.next()) {
    dictDate.initialize();
    dictDate.name          = tableName;
    dictDate.element       = 'u_exported_on';
    dictDate.label         = 'Exported on';
    dictDate.internal_type = 'glide_date_time';
    dictDate.mandatory     = false;
    dictDate.update();
    gs.print('Campo data/hora u_exported_on criado.');
} else {
    dictDate.internal_type = 'glide_date_time';
    dictDate.update();
    gs.print('Campo data/hora u_exported_on já existia.');
}

gs.print('Configuração da tabela ' + tableName + ' concluída (u_name max_length=120).');
