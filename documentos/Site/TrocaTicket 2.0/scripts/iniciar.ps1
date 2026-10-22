param([switch]$Reconfigurar, [string]$PastaConfiguracao='')
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
. (Join-Path $PSScriptRoot 'configuracao.ps1')
$raiz = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $raiz
if ([string]::IsNullOrWhiteSpace($PastaConfiguracao)) { $PastaConfiguracao = Join-Path $raiz 'config' }
$arquivo = Join-Path $PastaConfiguracao 'conexao.local.json'
$conexao = $null
$ponteiro = [IntPtr]::Zero
$anteriores = @{}
$nomes = @('DB_HOST','DB_PORT','DB_USER','DB_PASSWORD','DB_PASSWORD_EMPTY','DB_NAME','PORT')
foreach ($nome in $nomes) { $anteriores[$nome] = [Environment]::GetEnvironmentVariable($nome,'Process') }
try {
    $node = Get-Command node.exe -ErrorAction Stop
    Write-Host ''
    Write-Host 'TrocaTicket - projeto academico local'
    if ($Reconfigurar -or -not (Test-Path -LiteralPath $arquivo)) {
        Write-Host 'Primeira configuracao: use sua conexao habitual do MySQL Workbench.'
        Write-Host 'Ela fica protegida neste usuario Windows e nao sera incluida no ZIP.'
        $usuario = Read-Host 'Usuario MySQL'
        $portaTexto = Read-Host 'Porta (Enter para 3306)'
        if ([string]::IsNullOrWhiteSpace($portaTexto)) { $portaTexto = '3306' }
        if ($portaTexto -notmatch '^\d{1,5}$') { throw 'Porta invalida.' }
        $senha = Read-Host 'Senha MySQL (oculta; Enter se sua conexao nao possui senha)' -AsSecureString
        try { Salvar-ConexaoLocal -Caminho $arquivo -Usuario $usuario -Porta ([int]$portaTexto) -Senha $senha }
        finally { $senha.Dispose() }
    }
    $conexao = Ler-ConexaoLocal -Caminho $arquivo
    $env:DB_HOST = '127.0.0.1'
    $env:DB_PORT = [string]$conexao.Porta
    $env:DB_USER = $conexao.Usuario
    $env:DB_NAME = 'trocaticket_mvp_academico'
    $env:PORT = '3333'
    $ponteiro = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($conexao.Senha)
    $env:DB_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ponteiro)
    $env:DB_PASSWORD_EMPTY = $(if ($conexao.Senha.Length -eq 0) { '1' } else { '0' })
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ponteiro)
    $ponteiro = [IntPtr]::Zero
    & $node.Source (Join-Path $PSScriptRoot 'iniciar.mjs')
    if ($LASTEXITCODE -ne 0) { throw 'Inicio interrompido. Confira a mensagem acima. O banco nao foi apagado ou redefinido.' }
} catch {
    Write-Host ('Erro: ' + $_.Exception.Message) -ForegroundColor Red
    exit 1
} finally {
    if ($ponteiro -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ponteiro) }
    if ($null -ne $conexao) { $conexao.Senha.Dispose() }
    foreach ($nome in $nomes) { [Environment]::SetEnvironmentVariable($nome,$anteriores[$nome],'Process') }
}
