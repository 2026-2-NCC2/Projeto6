import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('../', import.meta.url));
async function pastaDoTeste(t) {
  const pasta = await mkdtemp(join(tmpdir(), 'trocaticket-polimento-'));
  t.after(async () => {
    assert.equal(resolve(pasta).startsWith(resolve(tmpdir())), true);
    assert.ok(basename(pasta).startsWith('trocaticket-polimento-'));
    await rm(pasta, { recursive: true, force: true });
  });
  return pasta;
}

test(
  'fechar o canal do iniciador encerra seu processo, preservando outro servidor',
  { timeout: 10000 },
  async (t) => {
    const pasta = await pastaDoTeste(t);
    const arquivo = join(pasta, 'servidor-ficticio.mjs');
    await writeFile(
      arquivo,
      "import {createServer} from 'node:http';const s=createServer((q,r)=>r.end('demo'));s.listen(0,'127.0.0.1',()=>console.log(s.address().port));",
    );
    const outro = createServer((req, res) => res.end('preservado'));
    outro.listen(0, '127.0.0.1');
    await once(outro, 'listening');
    t.after(() => new Promise((done) => outro.close(done)));
    const child = spawn(process.execPath, [join(raiz, 'scripts/processo-local.mjs'), arquivo], {
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
    });
    t.after(() => {
      if (child.exitCode === null) child.kill();
    });
    const [saida] = await once(child.stdout, 'data');
    const porta = Number(String(saida).trim());
    assert.equal(await fetch(`http://127.0.0.1:${porta}`).then((r) => r.text()), 'demo');
    const encerrado = once(child, 'exit');
    child.disconnect();
    const [codigo] = await encerrado;
    assert.equal(codigo, 0);
    await assert.rejects(fetch(`http://127.0.0.1:${porta}`, { signal: AbortSignal.timeout(1000) }));
    assert.equal(
      await fetch(`http://127.0.0.1:${outro.address().port}`).then((r) => r.text()),
      'preservado',
    );
  },
);

test(
  'Windows protege a senha local e restaura conexões com senha e senha vazia',
  { skip: process.platform !== 'win32', timeout: 20000 },
  async (t) => {
    const pasta = await pastaDoTeste(t);
    const arquivo = join(pasta, 'verificar.ps1');
    await writeFile(
      arquivo,
      `param([string]$Raiz,[string]$Pasta)
$ErrorActionPreference='Stop'
. (Join-Path $Raiz 'scripts/configuracao.ps1')
$caminho=Join-Path $Pasta 'conexao.local.json'
$segredo=ConvertTo-SecureString 'Senha-ficticia-apenas-teste-2026!' -AsPlainText -Force
Salvar-ConexaoLocal -Caminho $caminho -Usuario 'conta_ficticia' -Porta 34763 -Senha $segredo
$dados=Ler-ConexaoLocal -Caminho $caminho
$p=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($dados.Senha)
try {
 if ([Runtime.InteropServices.Marshal]::PtrToStringBSTR($p) -ne 'Senha-ficticia-apenas-teste-2026!') { throw 'Senha nao restaurada' }
 if ($dados.Usuario -ne 'conta_ficticia' -or $dados.Porta -ne 34763) { throw 'Conexao divergente' }
} finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($p);$dados.Senha.Dispose();$segredo.Dispose() }
$vazia=New-Object Security.SecureString
Salvar-ConexaoLocal -Caminho (Join-Path $Pasta 'vazia.local.json') -Usuario 'conta_ficticia' -Porta 34763 -Senha $vazia
$dados=Ler-ConexaoLocal -Caminho (Join-Path $Pasta 'vazia.local.json')
if ($dados.Senha.Length -ne 0) { throw 'Senha vazia divergente' }
$dados.Senha.Dispose();$vazia.Dispose()
Write-Output 'OK'
`,
    );
    const child = spawn(
      'powershell.exe',
      [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        arquivo,
        '-Raiz',
        raiz,
        '-Pasta',
        pasta,
      ],
      { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] },
    );
    let erros = '';
    child.stderr.on('data', (chunk) => {
      erros += chunk;
    });
    const [codigo] = await once(child, 'exit');
    assert.equal(codigo, 0, erros);
    const salvo = await readFile(join(pasta, 'conexao.local.json'), 'utf8');
    assert.equal(salvo.includes('Senha-ficticia-apenas-teste-2026!'), false);
    assert.ok(JSON.parse(salvo.replace(/^\uFEFF/, '')).senhaProtegida.length > 40);
  },
);
