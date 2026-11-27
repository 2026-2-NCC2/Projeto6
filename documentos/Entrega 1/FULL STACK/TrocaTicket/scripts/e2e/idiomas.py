"""Idiomas do site pela interface (etapa 7).

Instale com python -m pip install playwright e python -m playwright install chromium.
Com site e API já iniciados num banco local descartável, execute
python scripts/e2e/idiomas.py [--chromium caminho] [--fotos pasta] [--axe caminho/axe.min.js]
Se TT_ADMIN_EMAIL e TT_ADMIN_SENHA estiverem no ambiente (conta criada com npm run criar-admin),
o header da conta de administração também é medido em cada idioma. A senha não fica em arquivo.

O roteiro confere: troca de idioma pelo header (atributo lang, título da aba, escolha salva depois
de recarregar), erros da API traduzidos no site (login recusado e conta aguardando aprovação),
textos com valores e plurais, acessibilidade (axe) em outros idiomas e o header sem sobreposição
em todos os idiomas, perfis e larguras.
"""
import argparse
import json
import os
import re
import secrets
import subprocess
import sys
from datetime import date, timedelta
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from navegador import resposta  # noqa: E402
from repasse import AUDITORIA  # noqa: E402

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
IDIOMAS = ["pt-BR", "en", "es", "fr", "de", "it"]
NOMES = {"pt-BR": "Português (Brasil)", "en": "English", "es": "Español", "fr": "Français",
         "de": "Deutsch", "it": "Italiano"}
LARGURAS = [320, 390, 768, 900, 1024, 1100, 1280, 1366, 1440, 1920]


def carregar_dicionario():
    """Lê as linhas [pt, en, es, fr, de, it] do próprio site (src/i18n/textos/index.js), pelo
    Node, na mesma ordem usada no navegador: linhas posteriores substituem as anteriores."""
    codigo = ("import(process.argv[1]).then((m) => process.stdout.write(JSON.stringify(m.default)))"
              ".catch((e) => { console.error(e); process.exit(1); });")
    indice = Path(RAIZ, "src", "i18n", "textos", "index.js").as_uri()
    linhas = json.loads(subprocess.run(["node", "-e", codigo, indice], check=True, capture_output=True,
                                       text=True, encoding="utf-8").stdout)
    return {linha[0]: dict(zip(IDIOMAS, linha)) for linha in linhas}


DICIONARIO = carregar_dicionario()


def tr(texto, idioma, /, **valores):
    """Tradução esperada de um texto do site (o português é a chave)."""
    traduzido = DICIONARIO[texto][idioma] if idioma != "pt-BR" else texto
    for nome, valor in valores.items():
        traduzido = traduzido.replace("{" + nome + "}", str(valor))
    return traduzido


def contexto(browser, idioma=None, perfil_demo=None, largura=1366):
    ctx = browser.new_context(viewport={"width": largura, "height": 900})
    script = ""
    if idioma:
        script += f"localStorage.setItem('trocaticket-idioma', '{idioma}');"
    if perfil_demo:
        script += f"sessionStorage.setItem('trocaticket-role', '{perfil_demo}');"
    if script:
        ctx.add_init_script(script)
    return ctx


def escolher_idioma(page, idioma):
    """Troca o idioma pelo seletor do header, como uma pessoa faria."""
    botao = page.locator(".language-toggle:visible").first
    botao.click()
    lista = page.locator(".language-panel ul")
    expect(lista.locator("button")).to_have_count(6)
    lista.locator(f"button[lang='{idioma}']").click()
    expect(page.locator("html")).to_have_attribute("lang", idioma)
    expect(page.locator(".language-panel")).to_have_count(0)
    expect(botao).to_be_focused()


def seletor(browser, site, erros):
    ctx = contexto(browser)
    page = ctx.new_page()
    page.on("pageerror", lambda e: erros.append(f"seletor: {e}"))
    page.goto(site + "/")
    expect(page.locator("html")).to_have_attribute("lang", "pt-BR")
    titulo_pt = "TrocaTicket — Eventos & ingressos"
    expect(page).to_have_title(titulo_pt)
    botao = page.locator(".language-toggle:visible").first
    expect(botao).to_have_attribute("aria-label", "PT · Idioma do site: Português (Brasil)")
    expect(botao).to_have_attribute("aria-expanded", "false")

    # Painel: seis idiomas com o nome no próprio idioma, o atual marcado; Esc fecha.
    botao.click()
    expect(botao).to_have_attribute("aria-expanded", "true")
    opcoes = page.locator(".language-panel ul button")
    expect(opcoes).to_have_count(6)
    for codigo, nome in NOMES.items():
        expect(page.locator(f".language-panel button[lang='{codigo}']")).to_contain_text(nome)
    expect(page.locator(".language-panel button[aria-current='true']")).to_have_attribute("lang", "pt-BR")
    page.keyboard.press("Escape")
    expect(page.locator(".language-panel")).to_have_count(0)
    expect(botao).to_be_focused()
    # Clique fora fecha.
    botao.click()
    page.locator("main").click(position={"x": 5, "y": 5})
    expect(page.locator(".language-panel")).to_have_count(0)

    # Cada idioma: lang, título da aba e textos do header e da página.
    for idioma in IDIOMAS[1:] + ["pt-BR"]:
        escolher_idioma(page, idioma)
        expect(page).to_have_title(tr(titulo_pt, idioma))
        curto = "PT" if idioma == "pt-BR" else idioma.upper()
        expect(page.locator(".language-toggle:visible").first).to_have_attribute(
            "aria-label", f"{curto} · " + tr("Idioma do site: {idioma}", idioma, idioma=NOMES[idioma]))
        expect(page.get_by_role("link", name=tr("Comece na TrocaTicket", idioma))).to_be_visible()
        assert page.evaluate("localStorage.getItem('trocaticket-idioma')") == idioma

    # A escolha continua depois de recarregar e ao navegar.
    escolher_idioma(page, "es")
    page.reload()
    expect(page.locator("html")).to_have_attribute("lang", "es")
    expect(page).to_have_title(tr(titulo_pt, "es"))
    page.goto(site + "/eventos")
    expect(page.get_by_role("heading", name=tr("Recomendados para Você", "es"))).to_be_visible()
    ctx.close()
    print("seletor de idioma: ok (6 idiomas, Esc, clique fora, recarregar e navegar)")


def login_recusado(browser, site, erros):
    for idioma in ("en", "fr"):
        ctx = contexto(browser, idioma)
        page = ctx.new_page()
        page.on("pageerror", lambda e: erros.append(f"login {idioma}: {e}"))
        page.goto(site + "/entrar")
        page.locator("#email").fill(f"ninguem-{secrets.token_hex(3)}@example.test")
        page.locator("#password").fill(secrets.token_urlsafe(12))
        with resposta(page, "POST", "/login") as r:
            page.get_by_role("button", name=tr("Entrar na plataforma", idioma)).click()
        assert r.value.status == 401, r.value.status
        assert r.value.json()["error"] == "E-mail ou senha inválidos."  # a API continua em português
        expect(page.get_by_role("alert")).to_contain_text(tr("E-mail ou senha inválidos.", idioma))
        ctx.close()
    print("erro da API no login: ok (en, fr; a API responde em português)")


def aprovacao_pendente(browser, site, api, pw, erros, fotos):
    """Organizador recém-cadastrado tenta publicar: a API recusa com APPROVAL_REQUIRED (em
    português) e o site mostra a mensagem no idioma escolhido."""
    idioma = "en"
    cliente = pw.request.new_context(extra_http_headers={"Origin": site})
    email, senha = f"idioma-org-{secrets.token_hex(4)}@example.test", secrets.token_urlsafe(18)
    try:
        r = cliente.post(api + "/usuarios", data={
            "nome": "Olga Idiomas", "tipo_perfil": 2, "email": email, "senha": senha,
            "documento": str(secrets.randbelow(10**13)).zfill(14)})
        assert r.status == 201, r.status
    finally:
        cliente.dispose()
    ctx = contexto(browser, idioma)
    page = ctx.new_page()
    page.on("pageerror", lambda e: erros.append(f"aprovação: {e}"))
    page.goto(site + "/entrar")
    page.locator("#email").fill(email)
    page.locator("#password").fill(senha)
    with resposta(page, "POST", "/login") as r:
        page.get_by_role("button", name=tr("Entrar na plataforma", idioma)).click()
    assert r.value.status == 200
    aviso = page.get_by_role("complementary", name=tr("Situação da conta", idioma))
    expect(aviso).to_contain_text(tr("Conta aguardando aprovação da administração", idioma))

    page.goto(site + "/organizador/novo")
    dia = (date.today() + timedelta(days=25)).isoformat()
    page.locator("#title").fill(f"Festival Idiomas {secrets.token_hex(3)}")
    page.locator("#location").fill("São Paulo, SP")
    page.locator("#date").fill(dia)
    page.locator("#time").fill("18:00")
    page.locator("#endDate").fill(dia)
    page.locator("#endTime").fill("23:00")
    page.locator("#capacity").fill("80")
    page.locator("#price").fill("60")
    with resposta(page, "POST", "/eventos") as r:
        page.get_by_role("button", name=tr("Continuar para custos →", idioma)).click()
    assert r.value.status == 201, r.value.status
    evento_id = r.value.json()["id"]
    expect(page).to_have_url(re.compile(r"/organizador/eventos/\d+/consolidar$"))
    with resposta(page, "PUT", f"/eventos/{evento_id}") as r:
        page.get_by_role("button", name=tr("Consolidar e publicar", idioma)).click()
    assert r.value.status == 403
    corpo = r.value.json()
    assert corpo["code"] == "APPROVAL_REQUIRED"
    assert corpo["error"].startswith("Sua conta aguarda aprovação")  # API em português
    expect(page.locator(".toast")).to_contain_text(tr(corpo["error"], idioma))
    if fotos:
        page.screenshot(path=os.path.join(fotos, "i1-aprovacao-ingles.png"), full_page=True)
    erros[:] = [e for e in erros if f"/eventos/{evento_id}" not in e]
    ctx.close()
    print("conta aguardando aprovação: ok (403 APPROVAL_REQUIRED traduzido no site)")


def valores_e_plurais(browser, site, erros):
    """Telas da demonstração com números: plural, contagem de páginas e formatos."""
    ctx = contexto(browser, "en", perfil_demo="admin")
    page = ctx.new_page()
    page.on("pageerror", lambda e: erros.append(f"valores: {e}"))
    page.route("**/api/**", lambda rota: rota.abort())
    page.goto(site + "/admin")
    expect(page.locator(".pager-summary").first).to_contain_text(
        re.compile(r"\d+ records · page \d+ of \d+"))
    expect(page.get_by_text(re.compile(r"^\d+ pending$")).first).to_be_visible()
    page.goto(site + "/admin/relatorios/tim-maia")
    descricao = page.locator("canvas[role=img]").first.get_attribute("aria-label")
    assert descricao.startswith("Ticket distribution by sector: "), descricao
    ctx.close()
    ctx = contexto(browser, "de", perfil_demo="organizador")
    page = ctx.new_page()
    page.route("**/api/**", lambda rota: rota.abort())
    page.goto(site + "/organizador")
    expect(page.locator(".metric").first).to_contain_text(tr("Eventos cadastrados", "de"))
    ctx.close()
    print("valores e plurais: ok")


def acessibilidade(browser, site, erros):
    if not AUDITORIA["axe"]:
        print("acessibilidade: axe não informado (--axe), auditoria pulada")
        return
    telas = [("visitante", None, ["/", "/eventos", "/entrar", "/cadastro"]),
             ("usuário (demo)", "comprador", ["/", "/repasses"]),
             ("organizador (demo)", "organizador", ["/organizador", "/organizador/fornecedores"]),
             ("fornecedor (demo)", "fornecedor", ["/fornecedor", "/fornecedor/inventario"]),
             ("admin (demo)", "admin", ["/admin", "/admin/relatorios/tim-maia"])]
    for idioma in IDIOMAS[1:]:
        for rotulo, perfil, rotas in telas:
            ctx = contexto(browser, idioma, perfil_demo=perfil)
            if perfil:
                ctx.route("**/api/**", lambda rota: rota.abort())
            page = ctx.new_page()
            page.on("pageerror", lambda e: erros.append(f"axe {idioma}: {e}"))
            for rota in rotas:
                page.goto(site + rota, wait_until="networkidle")
                auditar_tela(page, f"{idioma} · {rotulo} {rota}")
            # Painel de idiomas aberto.
            page.locator(".language-toggle:visible").first.click()
            auditar_tela(page, f"{idioma} · {rotulo} · seletor aberto", larguras=((1366, 900),))
            ctx.close()


def auditar_tela(page, rotulo, larguras=((1366, 900), (390, 844))):
    """axe em duas larguras e dois temas. O tema muda pelo botão do header (rótulo traduzido),
    identificado pela classe."""
    if not page.evaluate("Boolean(window.axe)"):
        page.add_script_tag(content=AUDITORIA["axe"])
    for largura, altura in larguras:
        for tema in ("light", "dark"):
            page.set_viewport_size({"width": largura, "height": altura})
            if page.evaluate("document.documentElement.dataset.theme") != tema:
                botao = page.locator(".theme-toggle:visible").first
                if botao.count():
                    botao.click()
                else:
                    page.evaluate("t => { document.documentElement.dataset.theme = t; }", tema)
                page.wait_for_function("t => document.documentElement.dataset.theme === t", arg=tema)
            page.wait_for_timeout(400)
            violacoes = page.evaluate("""async () => (await axe.run(document, {resultTypes: ['violations']}))
                .violations.map(v => `${v.id} (${v.impact}): ${v.nodes.slice(0, 3).map(n => n.target.join(' ')).join(' | ')}`)""")
            AUDITORIA["resultados"].append((f"{rotulo} · {largura}px · {tema}", violacoes))
    page.set_viewport_size({"width": 1366, "height": 900})


MEDIR_HEADER = """() => {
  const h = document.querySelector('.header');
  if (!h) return {semHeader: true};
  const box = (e) => e.getBoundingClientRect();
  const visivel = (e) => e && getComputedStyle(e).display !== 'none' && getComputedStyle(e).visibility !== 'hidden' && box(e).width > 0;
  const nav = h.querySelector('.app-navigation');
  const tools = h.querySelector('.header-tools');
  const brand = h.querySelector('.brand');
  const navAberto = nav && nav.classList.contains('is-open');
  const navNaLinha = visivel(nav) && !navAberto && box(nav).height < 80;
  const links = navNaLinha ? [...nav.querySelectorAll('a')].filter(visivel).map(box) : [];
  const t = tools ? box(tools) : null, b = brand ? box(brand) : null;
  const sobreposto = links.some((l) => (t && l.right > t.left + 1 && l.left < t.right) || (b && l.left < b.right - 1 && l.right > b.left));
  const quebrado = links.some((l) => l.height > 40);
  const idioma = [...h.querySelectorAll('.language-toggle')].find(visivel);
  const idiomaForaDaTela = !idioma || box(idioma).right > innerWidth + 1 || box(idioma).left < 0;
  const ferramentasSobreMarca = t && b && t.left < b.right - 1 && t.top < b.bottom && t.bottom > b.top;
  return {overflow: document.documentElement.scrollWidth > innerWidth + 1, sobreposto, quebrado,
          idiomaForaDaTela, ferramentasSobreMarca, altura: Math.round(box(h).height)};
}"""


def cabecalho(browser, site, api, pw, erros):
    """Header sem sobreposição em todos os idiomas, perfis (demonstração e contas) e larguras."""
    perfis = [("visitante", None, "/"), ("usuário demo", "comprador", "/"),
              ("organizador demo", "organizador", "/organizador"),
              ("fornecedor demo", "fornecedor", "/fornecedor"), ("admin demo", "admin", "/admin")]
    contas = criar_contas(site, api, pw)
    problemas, medidas = [], 0
    for idioma in IDIOMAS:
        cenarios = [(rotulo, contexto(browser, idioma, perfil_demo=perfil), destino, None)
                    for rotulo, perfil, destino in perfis]
        cenarios += [(f"conta {nome}", contexto(browser, idioma), destino, credenciais)
                     for nome, (destino, credenciais) in contas.items()]
        for rotulo, ctx, destino, credenciais in cenarios:
            page = ctx.new_page()
            page.on("pageerror", lambda e: erros.append(f"header {idioma}: {e}"))
            if credenciais:
                page.goto(site + "/entrar")
                page.locator("#email").fill(credenciais[0])
                page.locator("#password").fill(credenciais[1])
                with resposta(page, "POST", "/login") as r:
                    page.locator("form button[type=submit]").first.click()
                assert r.value.status == 200, (rotulo, r.value.status)
            page.goto(site + destino, wait_until="networkidle")
            for tema in ("light", "dark"):
                page.evaluate("t => { document.documentElement.dataset.theme = t; }", tema)
                for largura in LARGURAS:
                    page.set_viewport_size({"width": largura, "height": 900})
                    page.wait_for_timeout(120)
                    m = page.evaluate(MEDIR_HEADER)
                    medidas += 1
                    if m.get("semHeader") or any(m.get(k) for k in ("overflow", "sobreposto", "quebrado",
                                                                       "idiomaForaDaTela", "ferramentasSobreMarca")):
                        problemas.append((idioma, rotulo, tema, largura, m))
            ctx.close()
    if problemas:
        for p in problemas[:30]:
            print("  header:", p)
    print(f"header: {medidas} medições ({len(IDIOMAS)} idiomas × perfis × 2 temas × {len(LARGURAS)} larguras),"
          f" {len(problemas)} problema(s)")
    return problemas


def criar_contas(site, api, pw):
    """Contas reais para medir os menus com banco: usuário, organizador (aguardando) e
    fornecedor (aguardando); administração só se a conta estiver no ambiente."""
    cliente = pw.request.new_context(extra_http_headers={"Origin": site})
    contas = {}
    try:
        for tipo, nome, destino in ((1, "usuário", "/"), (2, "organizador", "/organizador"),
                                    (3, "fornecedor", "/fornecedor")):
            email, senha = f"idioma-{tipo}-{secrets.token_hex(4)}@example.test", secrets.token_urlsafe(18)
            r = cliente.post(api + "/usuarios", data={
                "nome": f"Pessoa {nome.title()}", "tipo_perfil": tipo, "email": email, "senha": senha,
                "documento": str(secrets.randbelow(10**13)).zfill(14 if tipo != 1 else 11)})
            assert r.status == 201, (nome, r.status)
            cliente.post(api + "/logout", headers={"X-CSRF-Token": r.json()["csrfToken"]})
            contas[nome] = (destino, (email, senha))
    finally:
        cliente.dispose()
    if os.environ.get("TT_ADMIN_EMAIL") and os.environ.get("TT_ADMIN_SENHA"):
        contas["administração"] = ("/admin", (os.environ["TT_ADMIN_EMAIL"], os.environ["TT_ADMIN_SENHA"]))
    return contas


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--site", default="http://127.0.0.1:5173")
    parser.add_argument("--api", default="http://127.0.0.1:3000/api")
    parser.add_argument("--chromium", help="caminho de um Chromium já instalado")
    parser.add_argument("--fotos", help="pasta para salvar capturas de tela")
    parser.add_argument("--axe", help="caminho do axe.min.js para a auditoria de acessibilidade")
    args = parser.parse_args()
    if args.axe:
        with open(args.axe, encoding="utf-8") as arquivo:
            AUDITORIA["axe"] = arquivo.read()
    if args.fotos:
        os.makedirs(args.fotos, exist_ok=True)
    erros = []
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=args.chromium) if args.chromium else pw.chromium.launch()
        seletor(browser, args.site, erros)
        login_recusado(browser, args.site, erros)
        aprovacao_pendente(browser, args.site, args.api, pw, erros, args.fotos)
        valores_e_plurais(browser, args.site, erros)
        acessibilidade(browser, args.site, erros)
        problemas = cabecalho(browser, args.site, args.api, pw, erros)
        browser.close()
    falhas = [(rotulo, v) for rotulo, v in AUDITORIA["resultados"] if v]
    if AUDITORIA["axe"]:
        print(f"axe: {len(AUDITORIA['resultados'])} combinações, {len(falhas)} com violações")
        for rotulo, violacoes in falhas:
            print("  ", rotulo, violacoes)
    if erros:
        print("erros de página:", erros)
    if falhas or erros or problemas:
        raise SystemExit(1)
    print("idiomas: tudo certo")


if __name__ == "__main__":
    main()
