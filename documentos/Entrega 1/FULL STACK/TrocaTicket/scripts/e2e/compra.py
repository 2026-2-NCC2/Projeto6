"""Compra simulada pela interface, usando conta e evento de um banco de teste."""

import re
from urllib.parse import urlsplit

from playwright.sync_api import expect


def gravar(page, botao, rota, codigo):
    """Espera a resposta da gravação iniciada pelo clique."""
    def corresponde(resposta):
        return (resposta.request.method == 'POST' and
                urlsplit(resposta.url).path == f'/api{rota}')

    with page.expect_response(corresponde) as envio:
        botao.click()
    resposta = envio.value
    assert resposta.status == codigo, f'POST {rota}: HTTP {resposta.status}'
    return resposta.json()


def reservar(page, site, evento_id, meia=False):
    page.goto(f'{site}/eventos/{evento_id}')
    if meia:
        page.get_by_label('Selecione o tipo de entrada').select_option('Meia-entrada')
    page.get_by_role('button', name=re.compile('Comprar ingresso')).click()
    confirmar = page.get_by_role('dialog', name='Confirmar pedido')
    reservar_botao = confirmar.get_by_role('button', name='Reservar e ir para o pagamento')
    if meia:
        expect(reservar_botao).to_be_disabled()
        confirmar.get_by_role('checkbox', name=re.compile('Declaro ter direito')).check()
    pedido = gravar(page, reservar_botao, '/pedidos', 201)
    assert pedido['status'] == 'reservado' and pedido['quantity'] == 1
    assert pedido['type'] == ('Meia-entrada' if meia else 'Inteira')
    assert pedido['tickets'] == [] and pedido['total'] > 0
    pagar = page.get_by_role('dialog', name='Pagamento simulado')
    expect(pagar).to_contain_text(f"Pedido nº {pedido['id']} reservado até")
    return pedido, pagar


def card_pedido(page, site, pedido):
    page.goto(f'{site}/pedidos')
    numero = page.get_by_text(re.compile(rf"^Pedido nº {pedido['id']}(?:$| ·)"))
    return page.locator('.order-card').filter(has=numero)


def testar_compra(page, site, evento_id, *, recusado=False):
    """Recebe uma sessão real de usuário e um evento publicado futuro com preço."""
    pedido, pagamento = reservar(page, site, evento_id)
    pagamento.get_by_label('Cartão (simulado)').check()
    rota = f"/pedidos/{pedido['id']}"
    resultado = gravar(page, pagamento.get_by_role('button', name=re.compile('^Pagar ')),
                       f'{rota}/pagar', 200)
    assert resultado['paymentMethod'] == 'cartao'

    if recusado:
        assert resultado['status'] == 'recusado' and resultado['tickets'] == []
        expect(page.get_by_role('dialog').get_by_role('alert')).to_contain_text('Pagamento recusado')
        card = card_pedido(page, site, pedido)
        expect(card.get_by_text('Pagamento recusado', exact=True)).to_be_visible()
        expect(card.get_by_role('button', name=re.compile('^Pagar '))).to_have_count(0)
        return

    assert resultado['status'] == 'pago' and len(resultado['tickets']) == 1
    ingresso = resultado['tickets'][0]['code']
    expect(page).to_have_url(re.compile('/ingressos$'))
    expect(page.get_by_text(ingresso, exact=True)).to_be_visible()
    expect(page.get_by_text(re.compile(rf"Pedido nº {pedido['id']} · Pagamento simulado"))).to_be_visible()

    card = card_pedido(page, site, pedido)
    expect(card.get_by_text('Pago', exact=True)).to_be_visible()
    expect(card.get_by_text(ingresso, exact=True)).to_be_visible()
    card.get_by_role('button', name=re.compile('Solicitar estorno')).click()
    modal = page.get_by_role('dialog', name='Solicitar estorno')
    estornado = gravar(page, modal.get_by_role('button', name='Confirmar estorno'),
                       f'{rota}/estornar', 200)
    assert estornado['status'] == 'estornado' and estornado['refundedAmount'] == pedido['total']
    page.reload()
    expect(card).to_contain_text('Estornado:')
    expect(card.get_by_role('button', name=re.compile('Solicitar estorno'))).to_have_count(0)

    meia, pagamento = reservar(page, site, evento_id, meia=True)
    assert meia['total'] == round(pedido['total'] / 2, 2)
    pagamento.get_by_role('button', name='Fechar janela').click()
    card = card_pedido(page, site, meia)
    expect(card.get_by_text('Aguardando pagamento', exact=True)).to_be_visible()
    cancelado = gravar(page, card.get_by_role('button', name='Cancelar reserva'),
                       f"/pedidos/{meia['id']}/cancelar", 200)
    assert cancelado['status'] == 'cancelado' and cancelado['tickets'] == []
    page.reload()
    expect(card.get_by_text('Reserva cancelada', exact=True)).to_be_visible()
