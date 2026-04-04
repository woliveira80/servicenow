# ===== CONFIGURAÇÃO =====
$instance = "dev290477"            # só o prefixo, sem .service-now.com
$user     = "admin"                # seu usuário
$pass     = "ezRf-7gLG2L="         # sua senha

# Pasta base onde os XML serão salvos
$baseFolder = "C:\SN\PDI-Backups"

# ===== HEADERS (Basic Auth) =====
$pair    = "{0}:{1}" -f $user, $pass
$bytes   = [System.Text.Encoding]::ASCII.GetBytes($pair)
$base64  = [Convert]::ToBase64String($bytes)
$headers = @{
    Authorization = "Basic $base64"
    Accept        = "application/json"
}

$baseUri = "https://$instance.service-now.com"

# ===== 1. Buscar registros de backup ainda não baixados =====
$backupUrl = "$baseUri/api/now/table/u_update_set_backup" +
             "?sysparm_query=u_downloaded%3Dfalse" +
             "&sysparm_limit=100"

$backups = (Invoke-RestMethod -Uri $backupUrl -Method Get -Headers $headers).result

if (-not $backups -or $backups.Count -eq 0) {
    Write-Host "Nenhum backup novo para baixar."
    return
}

foreach ($b in $backups) {

    $backupSysId = $b.sys_id

    # Usar o u_name do backup como base do nome
    $usName = if ($b.u_name) { $b.u_name } else { "update_set_$backupSysId" }

    # Pasta por data (Exported on) ou por hoje
    $datePart = (Get-Date).ToString("yyyy-MM-dd")
    if ($b.u_exported_on) {
        $dt = Get-Date $b.u_exported_on
        $datePart = $dt.ToString("yyyy-MM-dd")
    }
    $folder = Join-Path $baseFolder $datePart
    if (-not (Test-Path $folder)) {
        New-Item -ItemType Directory -Path $folder | Out-Null
    }

    # ===== 2. Buscar attachments ligados a esse backup =====
    $attUrl = "$baseUri/api/now/attachment" +
              "?sysparm_query=table_name%3Du_update_set_backup%5Etable_sys_id%3D$backupSysId" +
              "&sysparm_limit=10"

    $attachments = (Invoke-RestMethod -Uri $attUrl -Method Get -Headers $headers).result

    if (-not $attachments) {
        Write-Host "Nenhum attachment para backup $backupSysId"
        continue
    }

    foreach ($att in $attachments) {

        $attId   = $att.sys_id
        $fileExt = [IO.Path]::GetExtension($att.file_name)
        if (-not $fileExt) { $fileExt = ".xml" }

        # ===== Nome de arquivo local baseado no u_name =====
        # Como o u_name já vem sanitizado do ServiceNow, aqui só garantimos
        # que nada muito estranho passe e que o caminho não estoure.
        $safeName = $usName

        # 1) Trocar somente caracteres ilegais de Windows por "_"
        $safeName = $safeName -replace '[\\/:*?"<>|]', '_'

        # 2) Remover underscores duplicados e trims
        $safeName = $safeName -replace '_+', '_'
        $safeName = $safeName.Trim('_')

        # 3) Limitar tamanho para proteger o caminho inteiro (aumentei para 120)
        if ($safeName.Length -gt 120) {
            $safeName = $safeName.Substring(0,120)
        }

        $fileName = "$safeName$fileExt"
        $filePath = Join-Path $folder $fileName

        Write-Host "NOME GERADO: '$fileName'"

        # ===== 3. Baixar o arquivo =====
        $downloadUrl = "$baseUri/sys_attachment.do?sys_id=$attId"
        Write-Host "Baixando $downloadUrl -> $filePath"

        Invoke-WebRequest -Uri $downloadUrl -OutFile $filePath -Headers @{
            Authorization = "Basic $base64"
        }
    }

    # ===== 4. Marcar backup como baixado =====
    $updateUrl = "$baseUri/api/now/table/u_update_set_backup/$backupSysId"
    $body      = @{ u_downloaded = "true" } | ConvertTo-Json

    Invoke-RestMethod -Uri $updateUrl -Method Patch -Headers $headers `
                      -ContentType "application/json" -Body $body

    Write-Host "Backup $backupSysId marcado como baixado."
}
