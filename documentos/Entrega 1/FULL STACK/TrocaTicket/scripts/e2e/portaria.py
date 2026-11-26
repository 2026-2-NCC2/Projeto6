"""Portaria e atendimento pela interface (etapa 5), com um organizador e duas contas de usuário.

Instale com python -m pip install playwright e python -m playwright install chromium.
Com site e API já iniciados num banco local descartável (pagamento simulado aprovado), execute:
python scripts/e2e/portaria.py [--chromium caminho] [--fotos pasta] [--axe caminho/axe.min.js]
O roteiro cria o organizador, o evento e as contas a cada execução.
"""
import argparse
import os
import re
import secrets
import sys
from datetime import date, timedelta
from urllib.parse import urlsplit

from playwright.sync_api import expect, sync_playwright

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from compra import gravar  # noqa: E402
from navegador import resposta  # noqa: E402
import repasse  # noqa: E402
from repasse import AUDITORIA, Conta, auditar  # noqa: E402

# Recusas esperadas da portaria: aparecem como 4xx no navegador e não contam como erro.
ROTA_PORTARIA = "/api/portaria/entradas"


def criar_organizador(pw, site, api, rodada):
    """Cria a conta do organizador e um evento publicado pela API; devolve e-mail, senha e evento."""
    email, senha = f"olga-{rodada}@example.test", secrets.token_urlsafe(24)
    cliente = pw.request.new_context(extra_http_headers={"Origin": site})
    try:
        cadastro = cliente.post(api + "/usuarios", data={
            "nome": "Olga Organizadora", "tipo_perfil": 2, "email": email, "senha": senha,
            "documento": str(secrets.randbelow(10**13)).zfill(14), "nome_organizacao": "Produtora Teste",
        })
        assert cadastro.status == 201, f"Cadastro de organizador: HTTP {cadastro.status}"
        dados = cadastro.json()
        dia = (date.today() + timedelta(days=15)).isoformat()
        evento = cliente.post(api + "/eventos", headers={"X-CSRF-Token": dados["csrfToken"]}, data={
            "organizadorId": dados["usuarioId"], "title": f"Festival Portaria {rodada}",
            "category": "Música", "date": dia, "endDate": dia, "time": "18:00", "endTime": "23:00",
            "location": "São Paulo, SP", "capacity": 100, "price": 60, "status": "Publicado",
            "description": "Evento para teste da portaria.", "image": "/images/coldplay.jpg",
        })
        assert evento.status == 201, f"Publicação de evento: HTTP {evento.status}"
        return email, senha, evento.json()["id"]
    finally:
        cliente.dispose()


def entrar(conta, email, senha):
    """Login pelo formulário; o organizador cai na página inicial do próprio perfil."""
    page = conta.page
    page.goto(conta.site + "/entrar")
    page.locator("#email").fill(email)
    page.locator("#password").fill(senha)
    with resposta(page, "POST", "/login") as r:
        page.get_by_role("button", name="Entrar na plataforma").click()
    assert r.value.status == 200
    expect(page).to_have_url(re.compile(r"/organizador$"))


def menu(conta, item):
    conta.page.get_by_role("navigation", name="Navegação principal").get_by_role("link", name=item, exact=True).click()


def validar(org, codigo, status_esperado):
    page = org.page
    page.get_by_label("Código do ingresso", exact=True).fill(codigo)
    return gravar(page, page.get_by_role("button", name="Validar entrada"), "/portaria/entradas", status_esperado)


def fluxo(browser, site, api, rodada, fotos, pw):
    erros = []
    email_org, senha_org, evento_id = criar_organizador(pw, site, api, rodada)
    org = Conta(browser, site, "Olga", rodada, erros)
    ana = Conta(browser, site, "Ana", rodada, erros)
    bruno = Conta(browser, site, "Bruno", rodada, erros)
    for conta in (ana, bruno):
        conta.cadastrar()
    entrar(org, email_org, senha_org)

    # 1. Ana compra dois ingressos e anuncia um deles.
    primeiro = ana.comprar(evento_id)
    segundo = ana.comprar(evento_id)
    anuncio = repasse.oferecer(ana, segundo["id"], preco="50")
    assert anuncio["status"] == "active"

    # 2. Portaria: entrada liberada uma vez; segunda leitura e código inexistente recusados.
    menu(org, "Portaria")
    expect(org.page.get_by_role("heading", name="Portaria", level=1)).to_be_visible()
    expect(org.page.get_by_label("Evento", exact=True)).to_have_value(str(evento_id))
    entrada = validar(org, primeiro["code"].lower(), 201)
    assert entrada["accepted"] and entrada["ticketId"] == primeiro["id"]
    resultado = org.page.locator(".gate-result.ok")
    expect(resultado).to_contain_text("Entrada liberada")
    expect(resultado).to_contain_text("Ana")
    expect(org.page.locator(".gate-count")).to_contain_text("1 entrada")
    org.foto(fotos, "p1-portaria-liberada")
    auditar(org, "Portaria com entrada liberada")
    validar(org, primeiro["code"], 409)
    expect(org.page.locator(".gate-result.erro")).to_contain_text("já foi utilizado")
    org.foto(fotos, "p2-portaria-recusada")
    validar(org, "TT-0-NAOEXISTE", 404)
    expect(org.page.locator(".gate-result.erro")).to_contain_text("Código não encontrado")

    ana.page.goto(site + "/ingressos")
    cartao = ana.page.locator("section.panel").filter(has_text=primeiro["code"])
    expect(cartao).to_contain_text("Utilizado")
    expect(cartao).to_contain_text("Entrada registrada na portaria em")

    # 3. Denúncia de anúncio: Bruno usa o atalho do painel de revenda do evento.
    bruno.page.goto(f"{site}/eventos/{evento_id}")
    painel = bruno.painel("Revenda e fila de espera")
    painel.get_by_role("link", name=f"Denunciar o anúncio nº {anuncio['id']}").click()
    expect(bruno.page).to_have_url(re.compile(rf"/atendimento\?anuncio={anuncio['id']}$"))
    expect(bruno.page.get_by_label("Assunto", exact=True)).to_have_value("Denúncia de anúncio")
    bruno.page.get_by_label("Mensagem", exact=True).fill("Este anúncio parece suspeito.")
    denuncia = gravar(bruno.page, bruno.page.get_by_role("button", name="Enviar solicitação"), "/atendimentos", 201)
    assert denuncia["listingId"] == anuncio["id"]

    # 4. Atendimento de pedido: Ana abre pelo pedido; a organização responde e encerra.
    ana.page.goto(site + "/pedidos")
    ana.page.get_by_role("link", name=re.compile(r"^Ajuda com o pedido nº \d+$")).first.click()
    expect(ana.page).to_have_url(re.compile(r"/atendimento\?pedido=\d+$"))
    pedido_id = int(ana.page.url.rsplit("=", 1)[1])
    expect(ana.page.get_by_label("Pedido", exact=True)).to_have_value(str(pedido_id))
    ana.page.get_by_label("Assunto", exact=True).fill("Dúvida sobre a entrada")
    ana.page.get_by_label("Mensagem", exact=True).fill("Posso entrar depois das 21h?")
    aberto = gravar(ana.page, ana.page.get_by_role("button", name="Enviar solicitação"), "/atendimentos", 201)
    assert aberto["status"] == "aberto" and aberto["orderId"] == pedido_id
    conversa_ana = ana.page.locator(".support-thread").filter(has_text="Dúvida sobre a entrada")
    expect(conversa_ana).to_contain_text("Aberto")
    ana.foto(fotos, "p3-atendimento-aberto")
    auditar(ana, "Atendimento da conta com solicitação aberta")

    menu(org, "Atendimentos")
    conversa_org = org.page.locator(".support-thread").filter(has_text="Dúvida sobre a entrada")
    expect(conversa_org).to_contain_text("aberto por Ana Teste")
    expect(org.page.locator(".support-thread").filter(has_text="Denúncia de anúncio")).to_contain_text("aberto por Bruno Teste")
    conversa_org.get_by_label("Resposta da organização", exact=True).fill("Pode sim, a portaria fica aberta até 22h.")
    conversa_org.get_by_label("Situação", exact=True).select_option("em_analise")
    analise = gravar(org.page, conversa_org.get_by_role("button", name="Enviar resposta"),
                     f"/atendimentos/{aberto['id']}/mensagens", 200)
    assert analise["status"] == "em_analise"
    expect(conversa_org).to_contain_text("Em análise")
    org.foto(fotos, "p4-atendimentos-organizador")
    auditar(org, "Atendimentos do organizador")

    ana.page.reload()
    conversa_ana = ana.page.locator(".support-thread").filter(has_text="Dúvida sobre a entrada")
    expect(conversa_ana).to_contain_text("Organização do evento (Olga)")
    expect(conversa_ana).to_contain_text("Pode sim, a portaria fica aberta até 22h.")
    conversa_ana.get_by_label("Responder", exact=True).fill("Obrigada!")
    gravar(ana.page, conversa_ana.get_by_role("button", name="Enviar mensagem"), f"/atendimentos/{aberto['id']}/mensagens", 200)
    expect(conversa_ana).to_contain_text("Obrigada!")

    org.page.reload()
    conversa_org = org.page.locator(".support-thread").filter(has_text="Dúvida sobre a entrada")
    conversa_org.get_by_label("Resposta da organização", exact=True).fill("Encerrando, bom show!")
    conversa_org.get_by_label("Situação", exact=True).select_option("encerrado")
    gravar(org.page, conversa_org.get_by_role("button", name="Enviar resposta"), f"/atendimentos/{aberto['id']}/mensagens", 200)
    ana.page.reload()
    conversa_ana = ana.page.locator(".support-thread").filter(has_text="Dúvida sobre a entrada")
    expect(conversa_ana).to_contain_text("Encerrado")
    expect(conversa_ana).to_contain_text("Atendimento encerrado")
    expect(conversa_ana.get_by_label("Responder", exact=True)).to_have_count(0)

    # 5. Celular: as páginas novas cabem na tela.
    for conta, caminho in ((org, "/organizador/portaria"), (org, "/organizador/atendimentos"), (ana, "/atendimento")):
        conta.page.set_viewport_size({"width": 390, "height": 844})
        conta.page.goto(site + caminho)
        conta.page.wait_for_load_state("networkidle")
        assert conta.page.evaluate("document.documentElement.scrollWidth <= innerWidth"), caminho
    org.foto(fotos, "p5-atendimentos-390")

    for conta in (org, ana, bruno):
        conta.contexto.close()
    # As recusas da portaria (409 e 404) são o comportamento esperado deste roteiro.
    inesperados = [e for e in erros if ROTA_PORTARIA not in e]
    assert not inesperados, inesperados


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
        with pw.chromium.launch(executable_path=args.chromium) as browser:
            fluxo(browser, site, api, rodada, args.fotos, pw)
    if args.axe:
        total = 0
        for rotulo, violacoes in AUDITORIA["resultados"]:
            total += len(violacoes)
            print(f"axe {rotulo}: {len(violacoes)} violação(ões)")
            for violacao in violacoes:
                print(f"    {violacao}")
        assert total == 0, f"{total} violação(ões) de acessibilidade"
    print("Passou: portaria e atendimento (Chromium, API e banco reais, organizador e duas contas).")


if __name__ == "__main__":
    main()
