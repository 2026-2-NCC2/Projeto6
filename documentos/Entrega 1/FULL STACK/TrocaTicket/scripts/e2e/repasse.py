"""Revenda, fila de espera e transferência com aceite pela interface (etapa 4), com três contas.

Instale com python -m pip install playwright e python -m playwright install chromium.
Com site e API já iniciados num banco local descartável (pagamento simulado aprovado), execute:
python scripts/e2e/repasse.py [--chromium caminho] [--fotos pasta] [--axe caminho/axe.min.js]
Com --axe, cada estado principal é auditado em 1366 e 390 px, nos temas claro e escuro.
O roteiro cria um organizador, um evento publicado e as contas Vera, Ana e Bruno a cada execução.
"""
import argparse
import os
import re
import secrets
import sys
from urllib.parse import urlsplit

from playwright.sync_api import expect, sync_playwright

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from compra import gravar, reservar  # noqa: E402
from navegador import eventos, resposta  # noqa: E402


class Conta:
    def __init__(self, browser, site, nome, rodada, erros, largura=1366):
        self.nome = nome
        self.email = f"{nome.lower()}-{rodada}@example.test"
        self.contexto = browser.new_context(viewport={"width": largura, "height": 900})
        self.contexto.on("weberror", lambda e: erros.append(f"{nome}: {e.error}"))
        self.contexto.on("response", lambda r: erros.append(f"{nome}: HTTP {r.status} {urlsplit(r.url).path}")
                         if r.status >= 400 else None)
        self.page = self.contexto.new_page()
        self.page.on("console", lambda m: erros.append(f"{nome}: console {m.text} {m.location.get('url', '')}")
                     if m.type == "error" else None)
        self.site = site

    def cadastrar(self):
        page, senha = self.page, secrets.token_urlsafe(24)
        page.goto(self.site + "/cadastro")
        page.locator("#name").fill(f"{self.nome} Teste")
        page.locator("#document").fill(str(secrets.randbelow(10**11)).zfill(11))
        page.locator("#email").fill(self.email)
        page.locator("#password").fill(senha)
        page.locator("#confirm").fill(senha)
        with resposta(page, "POST", "/usuarios") as r:
            page.get_by_role("button", name="Cadastrar", exact=True).click()
        assert r.value.status == 201
        expect(page.get_by_role("heading", level=1)).to_have_text(f"Boas-vindas de volta, {self.nome}!")

    def comprar(self, evento_id):
        pedido, pagamento = reservar(self.page, self.site, evento_id)
        pagamento.get_by_label("Pix (simulado)").check()
        pago = gravar(self.page, pagamento.get_by_role("button", name=re.compile("^Pagar ")),
                      f"/pedidos/{pedido['id']}/pagar", 200)
        assert pago["status"] == "pago"
        return pago["tickets"][0]

    def repasses(self):
        self.page.goto(self.site + "/repasses")
        expect(self.page.get_by_role("heading", name="Repasses e transferências")).to_be_visible()
        return self.page

    def painel(self, titulo):
        return self.page.locator("section.panel").filter(
            has=self.page.get_by_role("heading", name=titulo, exact=True))

    def foto(self, pasta, nome):
        if pasta:
            self.page.wait_for_timeout(400)  # fim da animação de entrada da página
            self.page.screenshot(path=os.path.join(pasta, f"{nome}.png"), full_page=True)


AUDITORIA = {"axe": None, "resultados": []}


def definir_tema(page, tema):
    """Usa o botão de tema do header (sem recarregar), para manter o estado atual da tela."""
    if page.evaluate("document.documentElement.dataset.theme") != tema:
        page.get_by_role("button", name=re.compile("^Ativar modo (escuro|claro)$")).first.click()
        page.wait_for_function("t => document.documentElement.dataset.theme === t", arg=tema)


def auditar(conta, rotulo):
    """Roda o axe no estado atual da página, em duas larguras e nos dois temas."""
    if not AUDITORIA["axe"]:
        return
    page = conta.page
    if not page.evaluate("Boolean(window.axe)"):
        page.add_script_tag(content=AUDITORIA["axe"])
    for largura, altura in ((1366, 900), (390, 844)):
        for tema in ("light", "dark"):
            page.set_viewport_size({"width": largura, "height": altura})
            definir_tema(page, tema)
            page.wait_for_timeout(500)
            violacoes = page.evaluate("""async () => (await axe.run(document, {resultTypes: ['violations']}))
                .violations.map(v => `${v.id} (${v.impact}): ${v.nodes.slice(0, 3).map(n => n.target.join(' ')).join(' | ')}`)""")
            AUDITORIA["resultados"].append((f"{rotulo} · {largura}px · {tema}", violacoes))
    definir_tema(page, "light")
    page.set_viewport_size({"width": 1366, "height": 900})


def oferecer(conta, ingresso_id, *, preco=None, email=None, status_esperado=201):
    page = conta.repasses()
    oferta = conta.painel("Repassar um ingresso")
    oferta.get_by_label("Ingresso").select_option(str(ingresso_id))
    if email:
        oferta.get_by_label("Forma de repasse").select_option("gratuito")
        oferta.get_by_label("E-mail de quem vai receber").fill(email)
        return gravar(page, oferta.get_by_role("button", name="Enviar convite de transferência"),
                      "/transferencias", status_esperado)
    oferta.get_by_label(re.compile("Preço de revenda")).fill(preco)
    return gravar(page, oferta.get_by_role("button", name="Publicar anúncio"), "/anuncios", status_esperado)


def painel_evento(conta, evento_id):
    page = conta.page
    page.goto(f"{conta.site}/eventos/{evento_id}")
    painel = conta.painel("Revenda e fila de espera")
    expect(painel).to_be_visible()
    return painel


def pagar_no_pedido(conta, valor, pedido_id=None):
    """Paga em Meus pedidos a reserva de revenda (a do número informado ou a única aberta)."""
    page = conta.page
    if not page.url.endswith("/pedidos"):
        page.goto(conta.site + "/pedidos")
    card = page.locator(".order-card").filter(has_text="Revenda").filter(has_text="Aguardando pagamento")
    if pedido_id:
        card = card.filter(has=page.get_by_text(re.compile(rf"^Pedido nº {pedido_id}(?:$| ·)")))
    expect(card).to_have_count(1)
    pedido_id = pedido_id or int(re.search(r"Pedido nº (\d+)", card.inner_text()).group(1))
    card.get_by_label("Pix (simulado)").check()
    pago = gravar(page, card.get_by_role("button", name=f"Pagar {valor}"), f"/pedidos/{pedido_id}/pagar", 200)
    assert pago["status"] == "pago" and len(pago["tickets"]) == 1
    return pago


def convite(conta, texto):
    convites = conta.painel("Convites de transferência")
    return convites.locator("li").filter(has_text=texto).first


def responder(conta, item, botao, convite_id, acao):
    return gravar(conta.page, item.get_by_role("button", name=botao),
                  f"/transferencias/{convite_id}/{acao}", 200)


def fluxo(browser, site, evento_id, rodada, fotos):
    erros = []
    vera, ana, bruno = (Conta(browser, site, nome, rodada, erros) for nome in ("Vera", "Ana", "Bruno"))
    for conta in (vera, ana, bruno):
        conta.cadastrar()

    # 1. Revenda: Vera compra e anuncia; Ana reserva pelo evento e paga em Meus pedidos.
    primeiro = vera.comprar(evento_id)
    segundo = vera.comprar(evento_id)
    anuncio = oferecer(vera, primeiro["id"], preco="60")
    assert anuncio["status"] == "active" and anuncio["priceCents"] == 6000 and anuncio["mine"]
    expect(vera.painel("Meus anúncios")).to_contain_text("Disponível")
    vera.foto(fotos, "r1-vera-anuncio")
    auditar(vera, "Repasses com anúncio ativo")

    painel = painel_evento(ana, evento_id)
    auditar(ana, "Evento com anúncio de revenda")
    painel = ana.painel("Revenda e fila de espera")
    item = painel.locator("li").filter(has_text="R$ 60,00")
    ana.foto(fotos, "r2-ana-evento-anuncio")
    with ana.page.expect_response(lambda r: r.request.method == "POST" and
                                  urlsplit(r.url).path == f"/api/anuncios/{anuncio['id']}/reservar") as r:
        item.get_by_role("button", name="Reservar repasse").click()
    assert r.value.status == 201
    reserva = r.value.json()
    assert reserva["resale"] and reserva["status"] == "reservado" and reserva["tickets"] == []
    expect(ana.page).to_have_url(re.compile("/pedidos$"))
    ana.foto(fotos, "r3-ana-pedido-revenda")
    auditar(ana, "Meus pedidos com reserva de revenda")
    pago = pagar_no_pedido(ana, "R$ 60,00", reserva["id"])
    codigo_ana = pago["tickets"][0]["code"]
    assert codigo_ana and codigo_ana != primeiro["code"], "o código do ingresso muda na revenda"
    ana.page.goto(site + "/ingressos")
    expect(ana.page.get_by_text(codigo_ana, exact=True)).to_be_visible()
    vera.repasses()
    expect(vera.painel("Meus anúncios")).to_contain_text("Vendido")
    vera.page.goto(site + "/ingressos")
    expect(vera.page.get_by_text(primeiro["code"], exact=True)).to_have_count(0)

    # 2. Fila: Bruno entra na fila; quando Ana anuncia, a vez dele vira uma reserva.
    painel = painel_evento(bruno, evento_id)
    expect(painel).to_contain_text("Nenhum anúncio disponível")
    with resposta(bruno.page, "POST", "/fila") as r:
        painel.get_by_role("button", name="Entrar na fila de repasse").click()
    assert r.value.status == 201
    expect(painel).to_contain_text("Na fila")
    expect(painel).to_contain_text("Posição 1")
    bruno.foto(fotos, "r4-bruno-fila")
    auditar(bruno, "Evento com a conta na fila")
    revenda = oferecer(ana, pago["tickets"][0]["id"], preco="55")
    assert revenda["status"] == "reserved", "o anúncio vai direto para o primeiro da fila"
    expect(ana.painel("Meus anúncios")).to_contain_text("Reservado")
    painel = painel_evento(bruno, evento_id)
    expect(painel).to_contain_text("Reservado")
    painel.get_by_role("link", name="Abrir reserva").click()
    expect(bruno.page).to_have_url(re.compile("/pedidos$"))
    bruno.foto(fotos, "r5-bruno-vez-da-fila")
    pagar_no_pedido(bruno, "R$ 55,00")
    bruno.repasses()
    expect(bruno.painel("Minhas filas de espera")).to_contain_text("Concluído")

    # 3. Transferência com aceite: recusa, cancelamento e aceite.
    enviado = oferecer(vera, segundo["id"], email=ana.email)
    assert enviado["status"] == "pending"
    expect(convite(vera, "Convite enviado para Ana Teste")).to_contain_text("Aguardando aceite")
    ana.repasses()
    ana.foto(fotos, "r6-ana-convite")
    auditar(ana, "Repasses com convite recebido")
    item = convite(ana, "Convite recebido de Vera Teste")
    assert responder(ana, item, "Recusar convite", enviado["id"], "recusar")["status"] == "rejected"
    expect(convite(ana, "Convite recebido de Vera Teste")).to_contain_text("Recusado")

    outro = oferecer(vera, segundo["id"], email=ana.email)
    item = convite(vera, "Convite enviado para Ana Teste")
    assert responder(vera, item, "Cancelar convite", outro["id"], "cancelar")["status"] == "cancelled"
    vera.page.goto(site + "/ingressos")
    expect(vera.page.get_by_text(segundo["code"], exact=True)).to_be_visible()

    final = oferecer(vera, segundo["id"], email=ana.email)
    ana.repasses()
    item = convite(ana, "Convite recebido de Vera Teste")
    expect(item).to_contain_text("Aguardando aceite")
    assert responder(ana, item, "Aceitar transferência gratuita", final["id"], "aceitar")["status"] == "accepted"
    ana.page.goto(site + "/ingressos")
    recebido = ana.page.locator("section.panel").filter(has_text="R$ 0,00")
    expect(recebido).to_have_count(1)
    vera.page.goto(site + "/ingressos")
    expect(vera.page.get_by_text(segundo["code"], exact=True)).to_have_count(0)
    # Recebido de graça: só pode ser transferido de graça.
    ana.repasses()
    oferta = ana.painel("Repassar um ingresso")
    oferta.get_by_label("Ingresso").select_option(str(segundo["id"]))
    expect(oferta.get_by_label("Forma de repasse").locator("option")).to_have_text(["Transferência gratuita"])
    ana.foto(fotos, "r7-ana-gratuito")

    # 4. Celular: a página nova cabe na tela.
    ana.page.set_viewport_size({"width": 390, "height": 844})
    for conta in (ana, bruno):
        conta.page.set_viewport_size({"width": 390, "height": 844})
        conta.repasses()
        assert conta.page.evaluate("document.documentElement.scrollWidth <= innerWidth"), conta.nome
    ana.foto(fotos, "r8-ana-390")

    for conta in (vera, ana, bruno):
        conta.contexto.close()
    assert not erros, erros


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--site", default="http://127.0.0.1:5173")
    parser.add_argument("--api", default="http://127.0.0.1:3000/api")
    parser.add_argument("--chromium", help="Executável do Chromium (opcional)")
    parser.add_argument("--fotos", help="Pasta para salvar capturas de tela (opcional)")
    parser.add_argument("--axe", help="Caminho do axe.min.js para a auditoria de acessibilidade (opcional)")
    args = parser.parse_args()
    site, api = args.site.rstrip("/"), args.api.rstrip("/")
    if any(urlsplit(url).hostname not in ("localhost", "127.0.0.1", "::1") for url in (site, api)):
        parser.error("Use a UI e a API locais com banco descartável.")
    if args.fotos:
        os.makedirs(args.fotos, exist_ok=True)
    if args.axe:
        with open(args.axe, encoding="utf-8") as arquivo:
            AUDITORIA["axe"] = arquivo.read()
    rodada = secrets.token_hex(6)
    with sync_playwright() as pw:
        evento_id = eventos(pw, site, api, rodada)
        with pw.chromium.launch(executable_path=args.chromium) as browser:
            fluxo(browser, site, evento_id, rodada, args.fotos)
    if args.axe:
        total = 0
        for rotulo, violacoes in AUDITORIA["resultados"]:
            total += len(violacoes)
            print(f"axe {rotulo}: {len(violacoes)} violação(ões)")
            for violacao in violacoes:
                print(f"    {violacao}")
        assert total == 0, f"{total} violação(ões) de acessibilidade"
    print("Passou: revenda, fila e transferência com aceite (Chromium, API e banco reais, três contas).")


if __name__ == "__main__":
    main()
