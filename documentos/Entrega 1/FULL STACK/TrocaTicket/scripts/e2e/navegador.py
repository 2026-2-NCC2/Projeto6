"""Regressão do navegador com UI e API reais, em banco local descartável.

Instale com python -m pip install playwright e python -m playwright install chromium.
Com site e API já iniciados, execute python scripts/e2e/navegador.py --help.
O roteiro cria contas e publica eventos exclusivos a cada execução.
Desde a etapa 6, o organizador novo precisa da aprovação da administração: crie uma conta de
administração no banco descartável (npm run criar-admin) e informe-a em TT_ADMIN_EMAIL e
TT_ADMIN_SENHA no ambiente. A senha não fica em nenhum arquivo.
"""
import argparse
from datetime import date, timedelta
import os
import re
import secrets
from urllib.parse import urlsplit

from playwright.sync_api import expect, sync_playwright


def resposta(page, metodo, caminho):
    return page.expect_response(
        lambda r: r.request.method == metodo and urlsplit(r.url).path.endswith(caminho)
    )


def credenciais_admin():
    email, senha = os.environ.get("TT_ADMIN_EMAIL"), os.environ.get("TT_ADMIN_SENHA")
    if not email or not senha:
        raise SystemExit(
            "Defina TT_ADMIN_EMAIL e TT_ADMIN_SENHA com a conta criada por 'npm run criar-admin' "
            "no banco descartável: desde a etapa 6, o organizador precisa ser aprovado para publicar.")
    return email, senha


def aprovar_conta(pw, site, api, usuario_id):
    """Etapa 6: a administração aprova a conta nova de organizador ou fornecedor (pela API)."""
    email, senha = credenciais_admin()
    admin = pw.request.new_context(extra_http_headers={"Origin": site})
    try:
        login = admin.post(api + "/login", data={"email": email, "senha": senha})
        assert login.status == 200, f"Login da administração: HTTP {login.status}"
        decisao = admin.post(api + f"/admin/contas/{usuario_id}/aprovacao", headers={
            "X-CSRF-Token": login.json()["csrfToken"], "Idempotency-Key": f"e2e-{secrets.token_hex(12)}",
        }, data={"situacao": "A", "motivo": ""})
        assert decisao.status == 200, f"Aprovação da conta: HTTP {decisao.status}"
        admin.post(api + "/logout", headers={"X-CSRF-Token": login.json()["csrfToken"]})
    finally:
        admin.dispose()


def eventos(pw, site, api, rodada):
    cliente = pw.request.new_context(extra_http_headers={"Origin": site})
    try:
        cadastro = cliente.post(api + "/usuarios", data={
            "nome": "Organização Teste", "tipo_perfil": 2,
            "email": f"org-{rodada}@example.test", "senha": secrets.token_urlsafe(24),
            "documento": str(secrets.randbelow(10**13)).zfill(14),
        })
        assert cadastro.status == 201, f"Cadastro de organizador: HTTP {cadastro.status}"
        organizador = cadastro.json()
        aprovar_conta(pw, site, api, organizador["usuarioId"])
        ids = []
        for numero in (1, 2):
            dia = (date.today() + timedelta(days=20 + numero)).isoformat()
            evento = cliente.post(api + "/eventos", headers={"X-CSRF-Token": organizador["csrfToken"]}, data={
                "organizadorId": organizador["usuarioId"], "title": f"Festival {rodada} {numero}",
                "category": "Música", "date": dia, "endDate": dia, "time": "18:00", "endTime": "22:00",
                "location": "São Paulo, SP", "capacity": 120, "price": 80, "status": "Publicado",
                "description": "Evento para teste de navegador.", "image": "/images/coldplay.jpg",
            })
            assert evento.status == 201, f"Publicação de evento: HTTP {evento.status}"
            ids.append(evento.json()["id"])
        return ids[0]
    finally:
        cliente.dispose()


def home(page):
    expect(page.get_by_role("heading", level=1)).to_have_text("Boas-vindas de volta, Ana!")


def cadastro(page, site, email, senha):
    page.goto(site + "/cadastro")
    page.locator("#name").fill("Ana Teste")
    page.locator("#document").fill(str(secrets.randbelow(10**11)).zfill(11))
    page.locator("#email").fill(email)
    page.locator("#password").fill(senha)
    page.locator("#confirm").fill(senha)
    with resposta(page, "POST", "/usuarios") as r:
        page.get_by_role("button", name="Cadastrar", exact=True).click()
    assert r.value.status == 201
    home(page)


def login(page, site, email, senha):
    page.goto(site + "/entrar")
    page.locator("#email").fill(email)
    page.locator("#password").fill(senha)
    with resposta(page, "POST", "/login") as r:
        page.get_by_role("button", name="Entrar na plataforma").click()
    assert r.value.status == 200
    home(page)


def logout(page):
    with resposta(page, "POST", "/logout") as r:
        page.get_by_role("button", name="Sair da conta").click()
    assert r.value.status in (200, 204)
    expect(page).to_have_url(re.compile(r"/entrar$"))


def demo(browser, site):
    with browser.new_context() as ctx:
        pedidos = []
        ctx.on("request", lambda req: pedidos.append(req.url) if "/api/" in req.url else None)
        ctx.route("**/api/**", lambda rota: rota.abort())
        page = ctx.new_page()
        page.goto(site + "/perfis")
        grupo = page.get_by_role("group", name="Tipo de perfil")
        expect(grupo.get_by_role("heading", name="Usuário", exact=True)).to_be_visible()
        grupo.get_by_role("button", name=re.compile("Entrar como usuário", re.I)).click()
        expect(page.get_by_role("heading", level=1)).to_contain_text("Boas-vindas de volta")
        page.locator(".demo-switcher-toggle").click()
        opcoes = page.get_by_role("list", name="Perfis da demonstração")
        opcoes.get_by_role("button", name=re.compile("Fornecedor", re.I)).click()
        expect(page).to_have_url(re.compile(r"/fornecedor$"))
        assert not pedidos, "A navegação demonstrativa fez uma chamada à API"


def regressao(page, site, email, senha, evento_id, rodada):
    logout(page)
    page.goto(site + "/")
    expect(page.get_by_role("heading", name="Entre no Troca-Papo")).to_be_visible()
    login(page, site, email, senha)
    expect(page.locator(".demo-switcher-toggle")).to_have_count(0)
    expect(page.get_by_role("link", name="Troca-Papo", exact=True)).to_be_visible()
    page.get_by_role("button", name="Ativar modo escuro").click()
    page.reload()
    home(page)
    expect(page.locator("html")).to_have_attribute("data-theme", "dark")
    slide = page.locator(".uh-slide")
    expect(slide).to_be_visible()
    atual = slide.get_attribute("href")
    page.mouse.move(0, 0)
    expect(slide).not_to_have_attribute("href", atual, timeout=16_000)
    atual = slide.get_attribute("href")
    page.get_by_role("button", name="Próximo evento").click()
    expect(slide).not_to_have_attribute("href", atual)

    page.goto(f"{site}/eventos/{evento_id}")
    with resposta(page, "POST", f"/favoritos/{evento_id}") as r:
        page.get_by_role("button", name=re.compile("Salvar")).first.click()
    assert r.value.status in (200, 201, 204)
    page.get_by_role("link", name="Favoritos", exact=True).click()
    expect(page.get_by_role("heading", name="Seus favoritos")).to_be_visible()
    expect(page.locator("main")).to_contain_text(f"Festival {rodada} 1")

    page.get_by_role("link", name="Meus ingressos", exact=True).click()
    for titulo in ("Ingressos da sua conta", "Ingressos disponíveis para troca", "Solicitações de troca"):
        expect(page.get_by_role("heading", name=titulo, exact=True)).to_be_visible()
    page.get_by_role("link", name="Troca-Papo", exact=True).click()
    expect(page.get_by_role("heading", name="Troca-Papo", exact=True)).to_be_visible()
    mensagem = f"Mensagem E2E {rodada}"
    page.get_by_role("textbox", name="Sua mensagem").fill(mensagem)
    with resposta(page, "POST", "/comunidade/mensagens") as r:
        page.get_by_role("button", name="Publicar mensagem").click()
    assert r.value.status == 201
    expect(page.get_by_text(mensagem, exact=True)).to_be_visible()
    with page.expect_response(lambda r: r.request.method == "DELETE" and "/comunidade/mensagens/" in r.url) as r:
        page.get_by_role("button", name="Remover mensagem").click()
    assert r.value.status == 204
    expect(page.get_by_text(mensagem, exact=True)).to_have_count(0)

    page.set_viewport_size({"width": 390, "height": 844})
    page.get_by_role("button", name="Ativar modo claro").click()
    for caminho, titulo in (("/", "Boas-vindas de volta, Ana!"), ("/ingressos", "Meus Ingressos"),
                            ("/comunidade", "Troca-Papo"), ("/favoritos", "Seus favoritos")):
        page.goto(site + caminho)
        expect(page.get_by_role("heading", name=titulo, exact=True).first).to_be_visible()
        assert page.evaluate("document.documentElement.scrollWidth <= innerWidth"), caminho
    page.set_viewport_size({"width": 1366, "height": 900})
    outra = page.context.new_page()
    outra.goto(site + "/")
    home(outra)
    assert page.evaluate("!document.cookie.includes('tt_session=')")
    assert any(c["name"] == "tt_session" and c["httpOnly"] for c in page.context.cookies())
    logout(page)
    outra.get_by_role("link", name="Meus ingressos", exact=True).click()
    expect(outra).to_have_url(re.compile(r"/entrar$"))
    outra.close()
    page.goto(site + "/")
    expect(page.get_by_role("heading", name="Entre no Troca-Papo")).to_be_visible()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--site", default="http://127.0.0.1:5173")
    parser.add_argument("--api", default="http://127.0.0.1:3000/api")
    parser.add_argument("--chromium", help="Executável do Chromium (opcional)")
    parser.add_argument("--fluxo", choices=["regressao", "compra", "recusado"], default="regressao")
    args = parser.parse_args()
    site, api = args.site.rstrip("/"), args.api.rstrip("/")
    if any(urlsplit(url).hostname not in ("localhost", "127.0.0.1", "::1") for url in (site, api)):
        parser.error("Use a UI e a API locais com banco descartável.")
    rodada = secrets.token_hex(6)
    email, senha = f"ana-{rodada}@example.test", secrets.token_urlsafe(24)
    with sync_playwright() as pw:
        evento_id = eventos(pw, site, api, rodada)
        with pw.chromium.launch(executable_path=args.chromium) as browser:
            with browser.new_context(viewport={"width": 1366, "height": 900}) as ctx:
                erros = []
                ctx.on("weberror", lambda e: erros.append(str(e.error)))
                ctx.on("response", lambda r: erros.append(f"HTTP {r.status} {urlsplit(r.url).path}")
                       if r.status >= 500 else None)
                page = ctx.new_page()
                cadastro(page, site, email, senha)
                if args.fluxo == "regressao":
                    regressao(page, site, email, senha, evento_id, rodada)
                    demo(browser, site)
                else:
                    from compra import testar_compra
                    testar_compra(page, site, evento_id, recusado=args.fluxo == "recusado")
                assert not erros, erros
    print(f"Passou: {args.fluxo} (Chromium, API e banco reais).")


if __name__ == "__main__":
    main()
