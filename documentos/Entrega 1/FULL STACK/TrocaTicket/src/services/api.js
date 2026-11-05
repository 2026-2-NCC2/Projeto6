const API_URL = 'http://localhost:3000/api';

export async function buscarUsuario(id) {
    const response = await fetch(
        `${API_URL}/usuarios/${id}`
    );

    if (!response.ok) {
        throw new Error('Não foi possível buscar os dados da conta.');
    }

    return response.json();
}

export async function atualizarUsuario(id, dados) {
    const response = await fetch(
        `${API_URL}/usuarios/${id}`,
        {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dados)
        }
    );

    const resultado = await response.json();

    if (!response.ok) {
        throw new Error(
            resultado.error || 'Erro ao atualizar conta'
        );
    }

    return resultado;
}

export async function cadastrarUsuario(dados) {
    const response = await fetch(`${API_URL}/usuarios`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(dados)
    });

    const resultado = await response.json();

    if (!response.ok) {
        throw new Error(resultado.error || 'Erro ao realizar cadastro');
    }

    return resultado;
}

export async function fazerLogin(credenciais) {
    const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(credenciais)
    });

    const resultado = await response.json();

    if (!response.ok) {
        throw new Error(resultado.error || 'Erro ao efetuar login');
    }

    return resultado;
}