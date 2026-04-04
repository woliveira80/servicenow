gs.log('Backup US job iniciou', 'US_BACKUP');

// 1. Buscar update sets completos e ainda não exportados
var us = new GlideRecord('sys_update_set');
us.addQuery('state', 'complete');
us.addQuery('u_exported', false);
us.query();

while (us.next()) {

    // 2. Exportar esse update set para XML
    var updateSetExport = new UpdateSetExport();
    var tmpId = updateSetExport.exportUpdateSet(us);

    // 3. Chamar o processor que gera o XML (export_update_set.do)
    var rm = new sn_ws.RESTMessageV2();
    rm.setEndpoint(gs.getProperty('glide.servlet.uri') +
                   'export_update_set.do?sysparm_sys_id=' + tmpId);
    rm.setHttpMethod('get');
    var response = rm.execute();
    var xmlBody = response.getBody();

    // 4. Criar registro na tabela de backup
    var backup = new GlideRecord('u_update_set_backup');
    backup.initialize();
    backup.u_update_set = us.getUniqueValue();

    // ===== Gerar u_name já pronto para ser nome de arquivo no Windows =====
    var rawName  = us.name + '';  // ex: [AOOP][NGS][STRY0590115][ ajustes de UPDATE SETS - STRY0549405][v5]
    var safeName = rawName;

    // 1) Tentar extrair a versão como "[vX]" no final, com ou sem espaços
    var versionMatch = rawName.match(/\[v(\d+)\]\s*$/);  // pega [v3], [v4], [v5] com espaço depois
    var versionNum   = '';
    if (versionMatch) {
        versionNum = versionMatch[1]; // só "3","4","5"
    }

    // 2) Remover qualquer "[vX]" + espaços do fim para formar o nome base
    var baseName = rawName.replace(/\[v\d+\]\s*$/,'');

    // 3) Sanitizar o nome base
    safeName = baseName;

    // caracteres inválidos (\ / : * ? " < > | e colchetes) -> "_"
    safeName = safeName.replace(/[\\\/:\*\?"<>\|\[\]]/g, '_');

    // espaços -> "_"
    safeName = safeName.replace(/\s+/g, '_');

    // underscores duplicados + trims
    safeName = safeName.replace(/_+/g, '_');
    safeName = safeName.replace(/^_+|_+$/g, '');

    // 4) Reagrupar base + sufixo de versão, se existir
    if (versionNum) {
        safeName = safeName + '_v' + versionNum;  // ..._ajustes_de_UPDATE_SETS_-_STRY0549405_v5
    }

    // 5) (opcional) limitar tamanho – se quiser, reative aqui com um limite maior
    // if (safeName.length > 120) {
    //     safeName = safeName.substring(0, 120);
    // }

    backup.u_name        = safeName;
    backup.u_state       = us.state;
    backup.u_exported_on = new GlideDateTime();
    backup.insert();

    // 5. Anexar o XML a esse registro (usando o nome sanitizado)
    var sa = new GlideSysAttachment();
    sa.write(backup, safeName + '.xml', 'text/xml', xmlBody);

    // 6. Marcar o update set como exportado (para não repetir)
    us.u_exported = true;
    us.update();
}
