# A senha fica protegida pelo Windows para este usuario. Nao vai para o ZIP.
# Carrega o modulo da propria versao, mesmo quando iniciado pelo PowerShell 7.
Import-Module (Join-Path $PSHOME 'Modules/Microsoft.PowerShell.Security') -ErrorAction Stop
function Salvar-ConexaoLocal {
    param([string]$Caminho, [string]$Usuario, [int]$Porta, [Security.SecureString]$Senha)
    if ([string]::IsNullOrWhiteSpace($Usuario) -or $Porta -lt 1 -or $Porta -gt 65535) {
        throw 'Informe o usuario e uma porta MySQL valida.'
    }
    $protegida = ''
    if ($Senha.Length -gt 0) { $protegida = ConvertFrom-SecureString -SecureString $Senha }
    $dados = [ordered]@{versao=1; usuario=$Usuario.Trim(); porta=$Porta; senhaVazia=($Senha.Length -eq 0); senhaProtegida=$protegida}
    $pasta = Split-Path -Parent $Caminho
    if (-not (Test-Path -LiteralPath $pasta)) { New-Item -ItemType Directory -Path $pasta | Out-Null }
    $dados | ConvertTo-Json | Set-Content -LiteralPath $Caminho -Encoding UTF8
}

function Ler-ConexaoLocal {
    param([string]$Caminho)
    try {
        $dados = Get-Content -LiteralPath $Caminho -Raw | ConvertFrom-Json
        if ($dados.versao -ne 1 -or [string]::IsNullOrWhiteSpace($dados.usuario) -or $dados.porta -lt 1 -or $dados.porta -gt 65535) {
            throw 'Formato invalido.'
        }
        if ($dados.senhaVazia -eq $true) {
            $senha = New-Object Security.SecureString
        } else {
            $senha = ConvertTo-SecureString -String $dados.senhaProtegida
        }
        return @{Usuario=$dados.usuario; Porta=[int]$dados.porta; Senha=$senha}
    } catch {
        throw 'Nao foi possivel ler a conexao neste usuario Windows. Abra Iniciar-TrocaTicket.cmd configurar para cadastrar novamente.'
    }
}
