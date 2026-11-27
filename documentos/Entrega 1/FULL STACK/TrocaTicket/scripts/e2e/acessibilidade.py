"""Ferramentas de acessibilidade pela interface (etapa 8).

Instale com python -m pip install playwright e python -m playwright install chromium.
Com o site iniciado (a API não é necessária: o roteiro usa o modo demonstração), execute
python scripts/e2e/acessibilidade.py [--chromium caminho] [--fotos pasta] [--axe caminho/axe.min.js]
    [--vlibras-real]
Sem --vlibras-real, o roteiro não acessa vlibras.gov.br: a falha de rede e o carregamento são
simulados no navegador. Com --vlibras-real, também tenta carregar o script oficial.
"""
import argparse
import json
import os
import re

from playwright.sync_api import expect, sync_playwright

CHAVE = "trocaticket-acessibilidade"
VLIBRAS = "https://vlibras.gov.br/app/vlibras-plugin.js"
AXE = {"codigo": None, "resultados": []}


def contexto(browser, perfil=None, idioma=None, largura=1366, **opcoes):
    ctx = browser.new_context(viewport={"width": largura, "height": 900}, **opcoes)
    script = ""
    if perfil:
        script += f"sessionStorage.setItem('trocaticket-role', '{perfil}');"
        ctx.route("**/api/**", lambda rota: rota.abort())
    if idioma:
        script += f"localStorage.setItem('trocaticket-idioma', '{idioma}');"
    if script:
        ctx.add_init_script(script)
    return ctx


def abrir_painel(page):
    page.get_by_role("button", name=re.compile("painel de acessibilidade|accessibility panel", re.I)).click()
    dialogo = page.get_by_role("dialog")
    expect(dialogo).to_be_visible()
    return dialogo


def html(page, atributo):
    return page.evaluate(f"document.documentElement.getAttribute('{atributo}')")


def salvas(page):
    texto = page.evaluate(f"localStorage.getItem('{CHAVE}')")
    return json.loads(texto)["preferencias"] if texto else None


def auditar(page, rotulo):
    if not AXE["codigo"]:
        return
    if not page.evaluate("Boolean(window.axe)"):
        page.add_script_tag(content=AXE["codigo"])
    v = page.evaluate("""async () => (await axe.run(document, {resultTypes: ['violations']})).violations
        .map(v => `${v.id} (${v.impact}): ${v.nodes.slice(0, 3).map(n => n.target.join(' ')).join(' | ')}`)""")
    AXE["resultados"].append((rotulo, v))


def painel_e_teclado(browser, site, erros, fotos):
    ctx = contexto(browser)
    page = ctx.new_page()
    page.on("pageerror", lambda e: erros.append(f"teclado: {e}"))
    pedidos_externos = []
    page.on("request", lambda r: pedidos_externos.append(r.url) if "vlibras.gov.br" in r.url else None)
    page.goto(site + "/")
    botao = page.get_by_role("button", name="Abrir painel de acessibilidade")
    expect(botao).to_be_visible()
    dialogo = abrir_painel(page)
    expect(dialogo.get_by_role("heading", name="Acessibilidade", level=2)).to_be_visible()
    assert page.evaluate("document.activeElement.closest('dialog') !== null"), "o foco não entrou no painel"
    # Tab circula dentro do painel.
    for _ in range(40):
        page.keyboard.press("Tab")
        assert page.evaluate("document.activeElement.closest('dialog') !== null"), "o foco saiu do painel"
    page.keyboard.press("Escape")
    expect(page.get_by_role("dialog")).to_have_count(0)
    expect(botao).to_be_focused()
    # Clique fora fecha.
    abrir_painel(page)
    page.mouse.click(30, 450)
    expect(page.get_by_role("dialog")).to_have_count(0)
    # O painel está em todas as áreas, inclusive no fórum público (fora do layout).
    for rota in ("/entrar", "/eventos", "/comunidade"):
        page.goto(site + rota)
        expect(page.get_by_role("button", name="Abrir painel de acessibilidade")).to_be_visible()
    assert not pedidos_externos, f"VLibras foi baixado sem clique: {pedidos_externos}"
    if fotos:
        page.goto(site + "/")
        abrir_painel(page)
        page.wait_for_timeout(300)
        page.screenshot(path=os.path.join(fotos, "a1-painel.png"))
    ctx.close()
    print("painel: ok (foco contido, Esc, clique fora, em todas as áreas, nada externo baixado)")


def previa_e_gravacao(browser, site, erros, fotos):
    ctx = contexto(browser, perfil="organizador")
    page = ctx.new_page()
    page.on("pageerror", lambda e: erros.append(f"prévia: {e}"))
    page.goto(site + "/organizador")
    assert html(page, "data-fonte") == "100" and html(page, "data-contrast") == "normal"
    # Prévia: aparece na hora, some ao fechar sem salvar.
    dialogo = abrir_painel(page)
    menos = dialogo.get_by_role("button", name="Diminuir fonte")
    mais = dialogo.get_by_role("button", name="Aumentar fonte")
    expect(menos).to_be_disabled()
    mais.click()
    assert html(page, "data-fonte") == "125"
    assert page.evaluate("getComputedStyle(document.documentElement).fontSize") == "20px"
    dialogo.get_by_role("button", name=re.compile("^Alto contraste")).click()
    assert html(page, "data-contrast") == "high"
    dialogo.get_by_role("button", name="Fechar janela").click()
    assert html(page, "data-fonte") == "100" and html(page, "data-contrast") == "normal"
    assert salvas(page) is None
    # Escolhas salvas valem depois de recarregar.
    dialogo = abrir_painel(page)
    for _ in range(4):
        dialogo.get_by_role("button", name="Aumentar fonte").click()
    expect(dialogo.get_by_role("button", name="Aumentar fonte")).to_be_disabled()
    assert html(page, "data-fonte") == "200"
    dialogo.get_by_role("button", name="Diminuir fonte").click()
    dialogo.get_by_role("button", name=re.compile("^Alto contraste")).click()
    dialogo.get_by_role("button", name=re.compile("^Espaço entre letras")).click()
    dialogo.get_by_role("button", name=re.compile("^Espaço entre letras")).click()
    dialogo.get_by_role("button", name=re.compile("^Espaço entre linhas")).click()
    dialogo.get_by_role("button", name=re.compile("^Fonte legível")).click()
    dialogo.get_by_role("button", name=re.compile("^Destacar links")).click()
    dialogo.get_by_role("button", name=re.compile("^Escuro")).click()
    expect(dialogo.get_by_role("button", name=re.compile("^Alto contraste"))).to_have_attribute("aria-pressed", "true")
    dialogo.get_by_role("button", name="Salvar preferências").click()
    expect(dialogo.get_by_role("status").filter(has_text="Preferências salvas neste navegador.")).to_be_visible()
    if fotos:
        page.screenshot(path=os.path.join(fotos, "a2-painel-contraste-175.png"))
    page.keyboard.press("Escape")
    esperado = {"tema": "dark", "tamanhoFonte": 175, "espacoLetras": 2, "espacoLinhas": 1,
                "altoContraste": True, "fonteLegivel": True, "destacarLinks": True}
    assert salvas(page) == esperado, salvas(page)
    page.reload()
    for atributo, valor in (("data-fonte", "175"), ("data-contrast", "high"), ("data-letras", "2"),
                            ("data-linhas", "1"), ("data-legivel", "true"), ("data-links", "true"),
                            ("data-theme", "dark")):
        assert html(page, atributo) == valor, (atributo, html(page, atributo))
    assert page.evaluate("getComputedStyle(document.documentElement).fontSize") == "28px"
    assert "Verdana" in page.evaluate("getComputedStyle(document.querySelector('h1')).fontFamily")
    assert page.evaluate("getComputedStyle(document.body).backgroundColor") == "rgb(0, 0, 0)"
    assert page.evaluate("localStorage.getItem('trocaticket-theme')") == "dark"
    if fotos:
        page.screenshot(path=os.path.join(fotos, "a3-organizador-contraste-175.png"))
    # Restaurar padrão e salvar.
    dialogo = abrir_painel(page)
    dialogo.get_by_role("button", name="Restaurar padrão").click()
    assert html(page, "data-fonte") == "100" and html(page, "data-contrast") == "normal"
    dialogo.get_by_role("button", name="Salvar preferências").click()
    page.keyboard.press("Escape")
    page.reload()
    assert html(page, "data-fonte") == "100" and html(page, "data-theme") == "light"
    ctx.close()
    print("prévia e gravação: ok (cancelar desfaz; salvar mantém depois de recarregar; restaurar padrão)")


def tema_do_sistema(browser, site, erros):
    ctx = contexto(browser, perfil="comprador", color_scheme="dark")
    page = ctx.new_page()
    page.on("pageerror", lambda e: erros.append(f"tema: {e}"))
    page.goto(site + "/")
    assert html(page, "data-theme") == "light"
    dialogo = abrir_painel(page)
    dialogo.get_by_role("button", name=re.compile("^Sistema")).click()
    assert html(page, "data-theme") == "dark"
    dialogo.get_by_role("button", name="Salvar preferências").click()
    page.keyboard.press("Escape")
    page.emulate_media(color_scheme="light")
    page.wait_for_function("document.documentElement.dataset.theme === 'light'")
    page.emulate_media(color_scheme="dark")
    page.wait_for_function("document.documentElement.dataset.theme === 'dark'")
    assert page.evaluate("localStorage.getItem('trocaticket-theme')") == "dark"
    # O botão claro/escuro do header passa a valer como escolha fixa.
    page.get_by_role("button", name="Ativar modo claro").first.click()
    assert html(page, "data-theme") == "light"
    assert salvas(page)["tema"] == "light"
    page.emulate_media(color_scheme="dark")
    page.wait_for_timeout(300)
    assert html(page, "data-theme") == "light"
    ctx.close()
    print("tema do sistema: ok (acompanha o aparelho; o botão do header fixa claro ou escuro)")


def vlibras(browser, site, erros, real):
    # 1) Rede indisponível: aviso e nova tentativa.
    ctx = contexto(browser)
    ctx.route(VLIBRAS, lambda rota: rota.abort())
    page = ctx.new_page()
    page.on("pageerror", lambda e: erros.append(f"vlibras: {e}"))
    page.goto(site + "/")
    dialogo = abrir_painel(page)
    dialogo.get_by_role("button", name="Ativar VLibras").click()
    expect(dialogo.get_by_role("alert")).to_contain_text("Não foi possível carregar o VLibras")
    expect(dialogo.get_by_role("button", name="Tentar carregar VLibras novamente")).to_be_visible()
    ctx.close()
    # 2) Script carregado (simulado): o painel oferece fechar e usar.
    ctx = contexto(browser)
    ctx.route(VLIBRAS, lambda rota: rota.fulfill(
        status=200, content_type="application/javascript",
        body="window.VLibrasWidget = { initBtn() {} }; document.body.dataset.vlibras = 'ok';"))
    page = ctx.new_page()
    page.goto(site + "/")
    dialogo = abrir_painel(page)
    dialogo.get_by_role("button", name="Ativar VLibras").click()
    expect(dialogo.get_by_role("button", name="Fechar painel e usar VLibras")).to_be_visible()
    assert page.evaluate("document.body.dataset.vlibras") == "ok"
    dialogo.get_by_role("button", name="Fechar painel e usar VLibras").click()
    expect(page.get_by_role("dialog")).to_have_count(0)
    ctx.close()
    # 3) Em outro idioma, o painel oferece voltar ao português (o VLibras traduz do português).
    ctx = contexto(browser, idioma="en")
    page = ctx.new_page()
    page.goto(site + "/")
    dialogo = abrir_painel(page)
    expect(dialogo.get_by_role("heading", name="Accessibility", level=2)).to_be_visible()
    dialogo.get_by_role("button", name="Use Portuguese for VLibras").click()
    expect(page.locator("html")).to_have_attribute("lang", "pt-BR")
    expect(dialogo.get_by_role("button", name="Ativar VLibras")).to_be_visible()
    ctx.close()
    texto = "VLibras: ok (sem rede: aviso; carregado: fechar e usar; em inglês: volta ao português)"
    if real:
        ctx = contexto(browser)
        page = ctx.new_page()
        page.goto(site + "/")
        dialogo = abrir_painel(page)
        dialogo.get_by_role("button", name="Ativar VLibras").click()
        try:
            expect(dialogo.get_by_role("button", name="Fechar painel e usar VLibras")).to_be_visible(timeout=20000)
            texto += "; script oficial carregou"
        except AssertionError:
            texto += "; script oficial NÃO carregou neste ambiente (rede)"
        ctx.close()
    print(texto)


LARGURA_CABE = "document.documentElement.scrollWidth <= innerWidth"
HEADER_NA_TELA = """[...document.querySelectorAll('.header a, .header button')]
    .filter((e) => e.offsetWidth > 0)
    .every((e) => { const r = e.getBoundingClientRect(); return r.left >= -1 && r.right <= innerWidth + 1; })"""


def layout_ampliado(browser, site, erros, fotos):
    # Celular de 320 px, letra em 100%: o espaço entre letras já alarga o texto, então o layout
    # que quebra linha (data-ampliado) entra em ação e nada sai da tela.
    ctx = contexto(browser, largura=320)
    page = ctx.new_page()
    page.on("pageerror", lambda e: erros.append(f"ampliado: {e}"))
    page.goto(site + "/")
    assert html(page, "data-ampliado") == "false"
    cta = "document.querySelector('.header-cta').getBoundingClientRect().width"
    largura_cta = page.evaluate(cta)
    dialogo = abrir_painel(page)
    # Alto contraste sozinho não muda o tamanho de nada (contorno desenhado por dentro).
    dialogo.get_by_role("button", name=re.compile("^Alto contraste")).click()
    assert html(page, "data-contrast") == "high" and html(page, "data-ampliado") == "false"
    assert page.evaluate(cta) == largura_cta, "o contraste mudou o tamanho do botão"
    assert page.evaluate(LARGURA_CABE) and page.evaluate(HEADER_NA_TELA)
    for _ in range(3):
        dialogo.get_by_role("button", name=re.compile("^Espaço entre letras")).click()
    dialogo.get_by_role("button", name=re.compile("^Fonte legível")).click()
    assert html(page, "data-letras") == "3" and html(page, "data-ampliado") == "true"
    page.keyboard.press("Escape")
    # Fechar sem salvar descarta a prévia: volta tudo ao padrão.
    assert html(page, "data-ampliado") == "false" and html(page, "data-contrast") == "normal"
    ctx.close()
    # Com as preferências salvas, em várias telas: sem rolagem lateral e header inteiro na tela.
    for largura in (320, 1366):
        ctx = contexto(browser, perfil="organizador", largura=largura)
        valor = json.dumps({"versao": 1, "preferencias": {"espacoLetras": 3, "espacoLinhas": 3,
                                                           "fonteLegivel": True, "altoContraste": True}})
        ctx.add_init_script(f"localStorage.setItem('{CHAVE}', {json.dumps(valor)});")
        page = ctx.new_page()
        page.on("pageerror", lambda e: erros.append(f"ampliado: {e}"))
        for rota in ("/organizador", "/organizador/eventos/tech/consolidar", "/perfil"):
            page.goto(site + rota)
            page.wait_for_timeout(300)
            assert html(page, "data-ampliado") == "true"
            assert page.evaluate(LARGURA_CABE), f"rolagem lateral em {rota} ({largura}px)"
            assert page.evaluate(HEADER_NA_TELA), f"header fora da tela em {rota} ({largura}px)"
            # O menu fica no botão ☰ e abre em coluna.
            assert page.evaluate("document.querySelector('.app-header').classList.contains('is-compact')")
        page.locator(".app-header .menu-toggle").click()
        expect(page.locator(".app-navigation.is-open")).to_be_visible()
        if fotos and largura == 320:
            page.screenshot(path=os.path.join(fotos, "a4-leitura-contraste-320.png"), full_page=True)
        ctx.close()
    print("texto ampliado: ok (contraste não muda tamanhos; espaçamento em 100% quebra linha; menu ☰)")


def armazenamento_bloqueado(browser, site, erros):
    ctx = contexto(browser)
    ctx.add_init_script("""Storage.prototype.setItem = function () { throw new Error('bloqueado'); };""")
    page = ctx.new_page()
    page.on("pageerror", lambda e: erros.append(f"armazenamento: {e}"))
    page.goto(site + "/")
    dialogo = abrir_painel(page)
    dialogo.get_by_role("button", name="Aumentar fonte").click()
    dialogo.get_by_role("button", name="Salvar preferências").click()
    expect(dialogo.get_by_role("alert")).to_contain_text("O navegador não permitiu salvar")
    page.keyboard.press("Escape")
    assert html(page, "data-fonte") == "125", "a escolha continua valendo nesta visita"
    ctx.close()
    print("armazenamento bloqueado: ok (aviso e escolha mantida na visita)")


def entre_abas(browser, site, erros):
    ctx = contexto(browser)
    a, b = ctx.new_page(), ctx.new_page()
    a.goto(site + "/")
    b.goto(site + "/eventos")
    dialogo = abrir_painel(a)
    dialogo.get_by_role("button", name=re.compile("^Destacar links")).click()
    dialogo.get_by_role("button", name="Salvar preferências").click()
    b.wait_for_function("document.documentElement.dataset.links === 'true'", timeout=5000)
    ctx.close()
    print("entre abas: ok (salvar numa aba aplica na outra)")


def axe_do_painel(browser, site):
    if not AXE["codigo"]:
        print("axe: não informado (--axe), auditoria pulada")
        return
    for nome, prefs in (("claro", {}), ("escuro", {"tema": "dark"}), ("contraste", {"altoContraste": True}),
                        ("letra 200%", {"tamanhoFonte": 200})):
        for largura in (1366, 390):
            ctx = contexto(browser, largura=largura)
            valor = json.dumps({"versao": 1, "preferencias": prefs})
            ctx.add_init_script(f"localStorage.setItem('{CHAVE}', {json.dumps(valor)});")
            page = ctx.new_page()
            page.goto(site + "/")
            abrir_painel(page)
            page.wait_for_timeout(300)
            auditar(page, f"painel aberto · {nome} · {largura}px")
            ctx.close()


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--site", default="http://127.0.0.1:5173")
    parser.add_argument("--chromium")
    parser.add_argument("--fotos")
    parser.add_argument("--axe")
    parser.add_argument("--vlibras-real", action="store_true")
    args = parser.parse_args()
    if args.axe:
        with open(args.axe, encoding="utf-8") as arquivo:
            AXE["codigo"] = arquivo.read()
    if args.fotos:
        os.makedirs(args.fotos, exist_ok=True)
    erros = []
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=args.chromium) if args.chromium else pw.chromium.launch()
        painel_e_teclado(browser, args.site, erros, args.fotos)
        previa_e_gravacao(browser, args.site, erros, args.fotos)
        tema_do_sistema(browser, args.site, erros)
        vlibras(browser, args.site, erros, args.vlibras_real)
        armazenamento_bloqueado(browser, args.site, erros)
        entre_abas(browser, args.site, erros)
        layout_ampliado(browser, args.site, erros, args.fotos)
        axe_do_painel(browser, args.site)
        browser.close()
    falhas = [(r, v) for r, v in AXE["resultados"] if v]
    if AXE["codigo"]:
        print(f"axe: {len(AXE['resultados'])} combinações com o painel aberto, {len(falhas)} com violações")
        for rotulo, v in falhas:
            print("  ", rotulo, v)
    if erros:
        print("erros de página:", erros)
    if falhas or erros:
        raise SystemExit(1)
    print("acessibilidade: tudo certo")


if __name__ == "__main__":
    main()
