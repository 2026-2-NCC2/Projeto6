"""Administração, aprovação de contas e cancelamento de evento pela interface (etapa 6).

Instale com python -m pip install playwright e python -m playwright install chromium.
Com site e API já iniciados num banco local descartável (pagamento simulado aprovado), crie a conta
de administração com npm run criar-admin e informe-a no ambiente (a senha não fica em arquivo):
TT_ADMIN_EMAIL=... TT_ADMIN_SENHA=... python scripts/e2e/administracao.py [--chromium caminho]
    [--fotos pasta] [--axe caminho/axe.min.js]
O roteiro cria o organizador (pelo cadastro do site), os eventos e as contas a cada execução.
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
from navegador import credenciais_admin, resposta  # noqa: E402
from repasse import AUDITORIA, Conta, auditar  # noqa: E402


def auditar_dialogo(conta, rotulo):
    """Como auditar(), mas com uma janela aberta: o header fica inerte atrás dela, então o tema
    muda direto no documento (só para a auditoria) e volta ao final."""
    if not AUDITORIA["axe"]:
        return
    page = conta.page
    if not page.evaluate("Boolean(window.axe)"):
        page.add_script_tag(content=AUDITORIA["axe"])
    original = page.evaluate("document.documentElement.dataset.theme")
    for largura, altura in ((1366, 900), (390, 844)):
        for tema in ("light", "dark"):
            page.set_viewport_size({"width": largura, "height": altura})
            page.evaluate("t => { document.documentElement.dataset.theme = t; }", tema)
            page.wait_for_timeout(400)
            violacoes = page.evaluate("""async () => (await axe.run(document, {resultTypes: ['violations']}))
                .violations.map(v => `${v.id} (${v.impact}): ${v.nodes.slice(0, 3).map(n => n.target.join(' ')).join(' | ')}`)""")
            AUDITORIA["resultados"].append((f"{rotulo} · {largura}px · {tema}", violacoes))
    page.evaluate("t => { document.documentElement.dataset.theme = t; }", original)
    page.set_viewport_size({"width": 1366, "height": 900})


def cadastrar_organizador(conta):
    """Cadastro de organizador pelo site: a conta nasce aguardando a aprovação."""
    page, senha = conta.page, secrets.token_urlsafe(24)
    page.goto(conta.site + "/cadastro")
    page.get_by_role("button", name="Organizador", exact=True).click()
    expect(page.locator(".approval-note")).to_contain_text("passam pela aprovação da administração")
    page.locator("#name").fill(f"{conta.nome} Teste")
    page.locator("#document").fill(str(secrets.randbelow(10**13)).zfill(14))
    page.locator("#email").fill(conta.email)
    page.locator("#password").fill(senha)
    page.locator("#confirm").fill(senha)
    with resposta(page, "POST", "/usuarios") as r:
        page.get_by_role("button", name="Cadastrar", exact=True).click()
    assert r.value.status == 201
    assert r.value.json()["user"]["aprovacao"] == "P"
    expect(page).to_have_url(re.compile(r"/organizador$"))


def entrar(conta, email, senha, destino):
    page = conta.page
    page.goto(conta.site + "/entrar")
    page.locator("#email").fill(email)
    page.locator("#password").fill(senha)
    with resposta(page, "POST", "/login") as r:
        page.get_by_role("button", name="Entrar na plataforma").click()
    assert r.value.status == 200
    expect(page).to_have_url(re.compile(destino))


def menu(conta, item):
    conta.page.get_by_role("navigation", name="Navegação principal").get_by_role(
        "link", name=item, exact=True).click()


def aviso(conta):
    return conta.page.get_by_role("complementary", name="Situação da conta")


def verificar_situacao(conta, mensagem):
    page = conta.page
    with resposta(page, "GET", "/conta/aprovacao"):
        aviso(conta).get_by_role("button", name="Verificar situação").click()
    expect(page.locator(".toast")).to_contain_text(mensagem)


def novo_evento(org, titulo, dias):
    """Cria o evento pelo formulário do organizador e chega à consolidação; devolve o número."""
    page = org.page
    page.goto(org.site + "/organizador/novo")
    dia = (date.today() + timedelta(days=dias)).isoformat()
    page.locator("#title").fill(titulo)
    page.locator("#location").fill("São Paulo, SP")
    page.locator("#date").fill(dia)
    page.locator("#time").fill("18:00")
    page.locator("#endDate").fill(dia)
    page.locator("#endTime").fill("23:00")
    page.locator("#capacity").fill("80")
    page.locator("#price").fill("60")
    with resposta(page, "POST", "/eventos") as r:
        page.get_by_role("button", name="Continuar para custos →").click()
    assert r.value.status == 201, r.value.status
    expect(page).to_have_url(re.compile(r"/organizador/eventos/\d+/consolidar$"))
    return r.value.json()["id"]


def publicar(org, evento_id, status_esperado):
    page = org.page
    with resposta(page, "PUT", f"/eventos/{evento_id}") as r:
        page.get_by_role("button", name="Consolidar e publicar").click()
    assert r.value.status == status_esperado, r.value.status
    return r.value


def conta_admin(admin, conta):
    return admin.page.locator(".approval-card").filter(has_text=conta.email)


def recusar(admin, conta, motivo):
    page = admin.page
    cartao = conta_admin(admin, conta)
    cartao.get_by_role("button", name=re.compile(r"^Recusar a conta de ")).click()
    dialogo = page.get_by_role("dialog")
    dialogo.get_by_label("Motivo da recusa").fill(motivo)
    with resposta(page, "POST", "/aprovacao") as r:
        dialogo.get_by_role("button", name="Recusar conta").click()
    assert r.value.status == 200 and r.value.json()["approval"] == "R"
    expect(page.locator(".toast")).to_contain_text("Conta recusada")


def filtrar(admin, nome):
    admin.page.get_by_role("group", name="Filtrar por situação").get_by_role(
        "button", name=re.compile(rf"^{nome}")).click()


def fluxo(browser, site, api, rodada, fotos):
    erros = []
    email_admin, senha_admin = credenciais_admin()
    admin = Conta(browser, site, "Admin", rodada, erros)
    org = Conta(browser, site, "Olga", rodada, erros)
    ana = Conta(browser, site, "Ana", rodada, erros)
    bruno = Conta(browser, site, "Bruno", rodada, erros)
    esperados = []

    # 1. Organizador se cadastra: conta pendente, rascunho liberado, publicação bloqueada.
    cadastrar_organizador(org)
    expect(aviso(org)).to_contain_text("Conta aguardando aprovação da administração")
    expect(aviso(org)).to_contain_text("preparar eventos como rascunho")
    primeiro = novo_evento(org, f"Festival Aprovação {rodada}", 20)
    # A recusa aparece como resposta 403 e como aviso do console do navegador.
    esperados.append(f"HTTP 403 /api/eventos/{primeiro}")
    esperados.append(f"status of 403 (Forbidden) {api}/eventos/{primeiro}")
    corpo = publicar(org, primeiro, 403).json()
    assert corpo["code"] == "APPROVAL_REQUIRED"
    expect(org.page.locator(".toast")).to_contain_text("aguarda aprovação")
    org.foto(fotos, "e1-organizador-pendente")
    auditar(org, "Organizador aguardando aprovação")

    # 2. Administração entra: painel real, aprovações; recusa com motivo.
    entrar(admin, email_admin, senha_admin, r"/admin$")
    expect(admin.page.get_by_role("heading", name="Painel Geral", level=1)).to_be_visible()
    navegacao = admin.page.get_by_role("navigation", name="Navegação principal")
    for item in ("Painel geral", "Aprovações", "Atendimentos", "Eventos"):
        expect(navegacao.get_by_role("link", name=item, exact=True)).to_be_visible()
    expect(admin.page.locator(".metric").filter(has_text="Contas aguardando")).to_be_visible()
    admin.foto(fotos, "e2-painel-admin")
    auditar(admin, "Painel geral da administração")

    menu(admin, "Aprovações")
    expect(admin.page.get_by_role("heading", name="Aprovação de contas", level=1)).to_be_visible()
    cartao = conta_admin(admin, org)
    expect(cartao).to_contain_text("Aguardando aprovação")
    expect(cartao).to_contain_text("Organizador")
    cartao.get_by_role("button", name=re.compile(r"^Recusar a conta de ")).click()
    dialogo = admin.page.get_by_role("dialog")
    dialogo.get_by_role("button", name="Recusar conta").click()
    expect(dialogo.get_by_role("alert")).to_contain_text("Informe o motivo da recusa")
    auditar_dialogo(admin, "Janela de recusa com erro")
    dialogo.get_by_role("button", name="Voltar").click()
    recusar(admin, org, "Documento ilegível no cadastro")
    filtrar(admin, "Recusadas")
    cartao = conta_admin(admin, org)
    expect(cartao).to_contain_text("Recusada")
    expect(cartao).to_contain_text("Documento ilegível no cadastro")
    admin.foto(fotos, "e3-aprovacoes-recusada")
    auditar(admin, "Aprovação de contas")

    # 3. Organizador confere: recusado, com o motivo; a administração revê e aprova.
    verificar_situacao(org, "recusou a conta")
    expect(aviso(org)).to_contain_text("Conta recusada pela administração")
    expect(aviso(org)).to_contain_text("Motivo: Documento ilegível no cadastro")
    org.foto(fotos, "e4-organizador-recusado")
    with resposta(admin.page, "POST", "/aprovacao") as r:
        cartao.get_by_role("button", name=re.compile(r"^Aprovar a conta de ")).click()
    assert r.value.status == 200 and r.value.json()["approval"] == "A"
    expect(admin.page.locator(".toast")).to_contain_text("Conta aprovada")
    verificar_situacao(org, "Conta aprovada pela administração")
    expect(aviso(org)).to_have_count(0)
    publicar(org, primeiro, 200)
    expect(org.page.locator(".toast")).to_contain_text("Evento publicado")

    # 4. Ana compra dois ingressos; o relatório da administração mostra a venda.
    ana.cadastrar()
    ingresso = ana.comprar(primeiro)
    ana.comprar(primeiro)
    menu(admin, "Painel geral")
    admin.page.get_by_label("Buscar eventos").fill(f"Festival Aprovação {rodada}")
    card = admin.page.locator(".ah-card").filter(has_text=f"Festival Aprovação {rodada}")
    expect(card).to_contain_text("Publicado")
    card.get_by_role("link", name=re.compile(r"^Visão e Relatórios")).click()
    expect(admin.page).to_have_url(re.compile(rf"/admin/relatorios/{primeiro}$"))
    expect(admin.page.locator("#rp-vendas")).to_contain_text("INGRESSOS VENDIDOS: 2")
    expect(admin.page.locator(".rp-table").last).to_contain_text("Ana Teste")
    admin.foto(fotos, "e5-relatorio-evento")
    auditar(admin, "Relatório do evento")

    # 5. Administração cancela o evento com motivo; quem pagou recebe o estorno simulado.
    admin.page.get_by_role("button", name="Cancelar evento").click()
    dialogo = admin.page.get_by_role("dialog")
    dialogo.get_by_role("button", name="Confirmar cancelamento").click()
    expect(dialogo.get_by_role("alert")).to_contain_text("Informe o motivo do cancelamento")
    auditar_dialogo(admin, "Janela de cancelamento do evento")
    dialogo.get_by_label(re.compile("^Motivo do cancelamento")).fill("Chuva forte no local")
    resultado = gravar(admin.page, dialogo.get_by_role("button", name="Confirmar cancelamento"),
                       f"/eventos/{primeiro}/cancelar", 200)
    assert resultado["ticketsCancelled"] == 2 and resultado["refunds"] == 2
    assert resultado["refundedAmount"] == 120
    expect(admin.page.locator(".toast")).to_contain_text("Evento cancelado. 2 estornos simulados, total de R$")
    expect(admin.page.locator(".admin-cancel-note")).to_contain_text("Motivo: Chuva forte no local")
    expect(admin.page.locator(".rp-card-top .rp-status")).to_have_text("Cancelado")
    expect(admin.page.get_by_role("button", name="Cancelar evento")).to_have_count(0)
    admin.foto(fotos, "e6-relatorio-cancelado")

    ana.page.goto(site + "/pedidos")
    pedido = ana.page.locator(".order-card").filter(has_text=f"Festival Aprovação {rodada}").first
    expect(pedido).to_contain_text("Evento cancelado.")
    expect(pedido).to_contain_text("Motivo: Chuva forte no local.")
    expect(pedido).to_contain_text("Estornado")
    ana.foto(fotos, "e7-pedido-evento-cancelado")
    auditar(ana, "Pedido de evento cancelado")
    ana.page.goto(site + "/ingressos")
    expect(ana.page.locator("section.panel").filter(has_text=ingresso["code"])).to_contain_text("Cancelado")

    # 6. Atendimento: Ana pergunta pelo pedido; a administração responde.
    ana.page.goto(site + "/pedidos")
    ana.page.get_by_role("link", name=re.compile(r"^Ajuda com o pedido nº \d+$")).first.click()
    assunto = f"Estorno do evento cancelado {rodada}"
    ana.page.get_by_label("Assunto", exact=True).fill(assunto)
    ana.page.get_by_label("Mensagem", exact=True).fill("Quando o valor volta?")
    aberto = gravar(ana.page, ana.page.get_by_role("button", name="Enviar solicitação"), "/atendimentos", 201)
    menu(admin, "Atendimentos")
    expect(admin.page.get_by_role("heading", name="Atendimentos", level=1)).to_be_visible()
    conversa = admin.page.locator(".support-thread").filter(has_text=assunto)
    expect(conversa).to_contain_text("aberto por Ana Teste")
    conversa.get_by_label("Resposta da administração", exact=True).fill("O estorno simulado já foi registrado.")
    conversa.get_by_label("Situação", exact=True).select_option("em_analise")
    analise = gravar(admin.page, conversa.get_by_role("button", name="Enviar resposta"),
                     f"/atendimentos/{aberto['id']}/mensagens", 200)
    assert [m["author"] for m in analise["messages"]] == ["solicitante", "administracao"]
    admin.foto(fotos, "e8-atendimentos-admin")
    auditar(admin, "Atendimentos da administração")
    ana.page.reload()
    conversa_ana = ana.page.locator(".support-thread").filter(has_text=assunto)
    expect(conversa_ana).to_contain_text("Administração (")
    expect(conversa_ana).to_contain_text("Em análise")

    # 7. O organizador cancela o próprio evento publicado, com motivo.
    segundo = novo_evento(org, f"Show Cancelável {rodada}", 30)
    publicar(org, segundo, 200)
    org.page.get_by_role("button", name="Cancelar evento").click()
    dialogo = org.page.get_by_role("dialog")
    dialogo.get_by_label(re.compile("^Motivo do cancelamento")).fill("Mudança na agenda do artista")
    cancelado = gravar(org.page, dialogo.get_by_role("button", name="Confirmar cancelamento"),
                       f"/eventos/{segundo}/cancelar", 200)
    assert cancelado["status"] == "Cancelado" and cancelado["ticketsCancelled"] == 0
    expect(org.page.locator(".consolidation-guidance")).to_contain_text("Motivo: Mudança na agenda do artista")
    expect(org.page.get_by_role("button", name="Cancelar evento")).to_be_disabled()
    org.foto(fotos, "e9-organizador-cancelou")
    auditar(org, "Consolidação de evento cancelado")

    # 8. Conta de usuário recusada: só consulta, e o aviso aparece sobre a homepage.
    bruno.cadastrar()
    menu(admin, "Aprovações")
    admin.page.get_by_label("Perfil:").select_option("1")
    filtrar(admin, "Aprovadas")
    admin.page.get_by_label("Buscar por nome, e-mail ou organização").fill(bruno.email)
    admin.page.get_by_role("button", name="Buscar", exact=True).click()
    recusar(admin, bruno, "Uso indevido da comunidade")
    bruno.page.reload()
    expect(aviso(bruno)).to_contain_text("Conta recusada pela administração")
    expect(aviso(bruno)).to_contain_text("Motivo: Uso indevido da comunidade")
    bruno.foto(fotos, "e10-usuario-recusado")
    auditar(bruno, "Homepage de conta recusada")

    # 9. Celular: as telas novas cabem na largura de 390 px.
    rotas = ((admin, "/admin"), (admin, "/admin/moderacao"), (admin, f"/admin/relatorios/{primeiro}"),
             (admin, "/admin/atendimentos"), (org, "/organizador"), (bruno, "/"))
    for conta, caminho in rotas:
        conta.page.set_viewport_size({"width": 390, "height": 844})
        conta.page.goto(site + caminho)
        conta.page.wait_for_load_state("networkidle")
        assert conta.page.evaluate("document.documentElement.scrollWidth <= innerWidth"), caminho
    admin.foto(fotos, "e11-atendimentos-390")

    for conta in (admin, org, ana, bruno):
        conta.contexto.close()
    # A publicação recusada enquanto a conta aguardava aprovação é o comportamento esperado.
    inesperados = [e for e in erros if not any(e.rstrip().endswith(x) for x in esperados)]
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
            fluxo(browser, site, api, rodada, args.fotos)
    if args.axe:
        total = 0
        for rotulo, violacoes in AUDITORIA["resultados"]:
            total += len(violacoes)
            print(f"axe {rotulo}: {len(violacoes)} violação(ões)")
            for violacao in violacoes:
                print(f"    {violacao}")
        assert total == 0, f"{total} violação(ões) de acessibilidade"
    print("Passou: administração, aprovação e cancelamento (Chromium, API e banco reais, quatro contas).")


if __name__ == "__main__":
    main()
