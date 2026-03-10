# Script: validacao_plugins.js

Arquivo de script: `background/validacao_plugins.js`  
Tipo: Script de **Background** para ServiceNow.

---

## Objetivo

Gerar um relatório dos plugins / app scopes relacionados a Security / VR, mostrando:  

- Se o plugin/scope está instalado ou não.  
- Versão instalada e última versão disponível na Store (quando aplicável).  
- Status sugerido: `OK`, `Instalar` ou `Atualizar`.  

Opcionalmente, o script também pode montar uma tabela de **progresso de instalação** (tempo, mensagens etc.), caso a flag de configuração esteja ativada.

---

## Configuração no script

No topo do arquivo existem duas flags principais:

```javascript
// HTML_TASK = cria task com anexo HTML (comportamento original)
// CSV_PRINT = não cria registro, imprime CSV no resultado do Background Script
var OUTPUT_MODE = "CSV_PRINT"; // troque para "HTML_TASK" quando quiser

var SHOW_PROGRESS_TABLE = false; // true = inclui tabela de progresso
```

- `OUTPUT_MODE`
  - `"CSV_PRINT"`: imprime um CSV no resultado do Background Script, para copiar/colar em planilha.
  - `"HTML_TASK"`: cria uma Task com um arquivo HTML anexado (formato de relatório tabular).

- `SHOW_PROGRESS_TABLE`
  - `false`: não consulta `sn_appclient_progress_tracker` (script mais rápido e saída menor).
  - `true`: adiciona uma segunda tabela com informações de tempo de instalação, mensagem, modo, etc.

---

## Como executar (modo CSV_PRINT)

1. Acesse a instância ServiceNow desejada.  
2. Vá em: **System Definition → Scripts - Background**.  
3. Copie o conteúdo de `validacao_plugins.js` deste repositório (aba **Raw** facilita copiar).  
4. Cole no campo de script do Background.  
5. Confirme que no topo está:

   ```javascript
   var OUTPUT_MODE = "CSV_PRINT";
   ```

6. Clique em **Run script**.

### Onde copiar o CSV

Na saída do Script Background, localize as linhas:

- Início:  
  `*** Script: === INÍCIO RELATÓRIO CSV - pluginsvalidacao<instância>_<data>.csv ===`
- Fim:  
  `*** Script: === FIM RELATÓRIO CSV ===`

Selecione **apenas o conteúdo entre essas duas linhas** (incluindo cabeçalho `Scope/Plugin, Nome, ...`), copie e cole no Excel ou em outra planilha.

---

## Como executar (modo HTML_TASK)

1. No próprio script, altere:

   ```javascript
   var OUTPUT_MODE = "HTML_TASK";
   ```

2. Execute em **Scripts - Background** normalmente.  
3. Ao final, a saída mostrará algo como:

   `TASK criada/fechada com anexo: pluginsvalidacao<instância>_<data>.xls.html | Número: TASKXXXX | Sys ID: ...`

4. Abra a Task indicada pelo número, vá em **Attachments** e baixe o arquivo `.xls.html`.  
5. Abra o arquivo no Excel; as tabelas serão exibidas com formatação tabular.

---

## Tabelas consultadas

O script lê apenas dados (não altera nada) das tabelas:

- `sys_plugins`  
- `sys_scope`  
- `sys_store_app`  
- `sn_appclient_progress_tracker` (apenas se `SHOW_PROGRESS_TABLE = true`)

---

## Lista de plugins / scopes cobertos

A lista atual do script inclui, entre outros:

- `sn_si`, `sn_secops_setup`, `sn_ti`, `sn_sec_cmn`, `sn_app_secops_ui`  
- `sn_vul`, `sn_vul_cmn`, `sn_vul_analytics`, `sn_vul_recom`, `sn_vul_analyst`, `sn_vul_solution`  
- Vários spokes / integrações (`sn_ms_ad_v2_spoke`, `sn_mst_connector`, `sn_msteams_com_spk`, etc.)

Para adicionar ou remover itens, edite o array `itemsRaw` dentro do script.

---

## Observações

- O script foi pensado para ser seguro em produção, pois apenas **lê** registros.  
- Recomenda-se sempre testar primeiro em instância de **desenvolvimento**.  
- Caso a tabela `sn_appclient_progress_tracker` não exista na instância, basta manter `SHOW_PROGRESS_TABLE = false`.
