export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export async function buscarUsuario(id) {
    let response;
    let resultado;

    try {
        response = await fetch(`${API_URL}/usuarios/${id}`);
    } catch {
        throw new Error('Não foi possível conectar ao servidor backend (http://localhost:3000).');
    }
    
    try {
        resultado = await response.json();
    } catch {
        throw new Error('Resposta inválida do servidor.');
    }

    if (!response.ok) {
        throw new Error(resultado.error || 'Não foi possível buscar os dados da conta.');
    }

    return resultado;
}

export async function atualizarUsuario(id, dados) {
    let response;
    let resultado;

    try {
        response = await fetch(`${API_URL}/usuarios/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dados)
        });
    } catch {
        throw new Error('Não foi possível conectar ao servidor backend.');
    }

    try {
        resultado = await response.json();
    } catch {
        throw new Error('Resposta inválida do servidor.');
    }

    if (!response.ok) {
        throw new Error(
            resultado.error || 'Erro ao atualizar conta'
        );
    }

    return resultado;
}

export async function cadastrarUsuario(dados) {
    let response;
    let resultado;

    try {
        response = await fetch(`${API_URL}/usuarios`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dados)
        });
    } catch {
        throw new Error('Não foi possível conectar ao servidor backend (http://localhost:3000). Verifique se o servidor Node está rodando.');
    }

    try {
        resultado = await response.json();
    } catch {
        throw new Error('Resposta inválida do servidor ao cadastrar.');
    }

    if (!response.ok) {
        throw new Error(resultado.error || 'Erro ao realizar cadastro');
    }

    return resultado;
}

export async function fazerLogin(credenciais) {
    let response;
    let resultado;
    
    try {
        response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(credenciais)
        });
    } catch {
        throw new Error('Não foi possível conectar ao servidor backend (http://localhost:3000). Verifique se o servidor Node e o MySQL estão rodando.');
    }

    try {
        resultado = await response.json();
    } catch {
        throw new Error('Resposta inválida do servidor ao efetuar login.');
    }

    if (!response.ok) {
        throw new Error(resultado.error || 'Erro ao efetuar login');
    }

    return resultado;
}

export async function uploadFotoUsuario(id, fotoBase64) {
    let response;
    let resultado;

    try {
        response = await fetch(`${API_URL}/usuarios/${id}/foto`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ fotoBase64 })
        });
    } catch {
        throw new Error('Não foi possível conectar ao servidor backend (http://localhost:3000).');
    }

    try {
        resultado = await response.json();
    } catch {
        throw new Error('Resposta inválida do servidor ao fazer upload da foto.');
    }

    if (!response.ok) {
        throw new Error(resultado.error || 'Erro ao salvar a foto de perfil');
    }

    return resultado;
}

export async function excluirFotoUsuario(id) {
    let response;
    let resultado;

    try {
        response = await fetch(`${API_URL}/usuarios/${id}/foto`, {
            method: 'DELETE'
        });
    } catch {
        throw new Error('Não foi possível conectar ao servidor backend (http://localhost:3000).');
    }

    try {
        resultado = await response.json();
    } catch {
        throw new Error('Resposta inválida do servidor ao excluir foto.');
    }

    if (!response.ok) {
        throw new Error(resultado.error || 'Erro ao excluir a foto de perfil');
    }

    return resultado;
}

export async function atualizarSenhaUsuario(id, senhaAtual, novaSenha) {
    let response;
    try {
        response = await fetch(`${API_URL}/usuarios/${encodeURIComponent(id)}/senha`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ senhaAtual, novaSenha })
        });
    } catch (error) {
        throw new Error('Não foi possível conectar ao servidor backend.', { cause: error });
    }

    let resultado;
    try {
        resultado = await response.json();
    } catch {
        throw new Error('Resposta inválida do servidor.');
    }
    if (!response.ok) {
        throw new Error(resultado.error || 'Não foi possível atualizar a senha.');
    }
    return resultado;
}