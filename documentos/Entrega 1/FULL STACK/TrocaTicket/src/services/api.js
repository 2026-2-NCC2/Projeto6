// A API roda na porta 3000 do mesmo endereço em que o site foi aberto (localhost ou 127.0.0.1).
// Assim o navegador trata site e API como o mesmo "site" e envia o cookie de sessão.
const API_PADRAO =
  typeof window !== 'undefined' && window.location?.hostname
    ? `${window.location.protocol}//${window.location.hostname}:3000/api`
    : 'http://localhost:3000/api';
export const API_URL = import.meta.env.VITE_API_URL || API_PADRAO;

const CSRF_KEY = 'trocaticket-csrf';
// Marca (sem dado sensível) de que este navegador abriu uma sessão. Serve só para não
// consultar a API à toa: visitantes e o modo demonstração funcionam sem servidor.
const MARCA_SESSAO = 'trocaticket-sessao';
const METODOS_SEGUROS = ['GET', 'HEAD', 'OPTIONS'];
export const EVENTO_SESSAO_EXPIRADA = 'trocaticket:sessao-expirada';

export function guardarCsrf(token) {
    try {
        if (token) {
            sessionStorage.setItem(CSRF_KEY, token);
            localStorage.setItem(MARCA_SESSAO, '1');
        } else sessionStorage.removeItem(CSRF_KEY);
    } catch {}
}

// O servidor respondeu que não há sessão: apaga só a marca (o modo demonstração continua).
export function esquecerMarcaDeSessao() {
    try {
        localStorage.removeItem(MARCA_SESSAO);
    } catch {}
}

// Vale a pena perguntar ao servidor pela sessão? Sim se esta aba já tem uma conta ou se
// alguma aba deste navegador fez login (a marca é apagada no logout e na expiração).
export function podeTerSessao() {
    try {
        const usuario = JSON.parse(sessionStorage.getItem('trocaticket-user') || 'null');
        return Boolean(usuario?.id || localStorage.getItem(MARCA_SESSAO));
    } catch {
        return true;
    }
}

export function limparSessaoLocal() {
    try {
        sessionStorage.removeItem('trocaticket-user');
        sessionStorage.removeItem('trocaticket-role');
        sessionStorage.removeItem(CSRF_KEY);
        localStorage.removeItem(MARCA_SESSAO);
    } catch {}
}

// Todas as chamadas à API passam por aqui: envia o cookie de sessão e, nas gravações,
// o token CSRF. Se a sessão expirar, avisa o site para voltar ao modo deslogado.
export async function apiFetch(url, options = {}) {
    const method = (options.method || 'GET').toUpperCase();
    const headers = new Headers(options.headers || {});
    if (!METODOS_SEGUROS.includes(method)) {
        let token = null;
        try {
            token = sessionStorage.getItem(CSRF_KEY);
        } catch {}
        if (token) headers.set('X-CSRF-Token', token);
    }
    const response = await globalThis.fetch(url, { ...options, headers, credentials: 'include' });
    if (response.status === 401 && !String(url).endsWith('/login')) {
        let tinhaSessao = false;
        try {
            tinhaSessao = Boolean(sessionStorage.getItem('trocaticket-user'));
        } catch {}
        if (tinhaSessao) {
            limparSessaoLocal();
            window.dispatchEvent(new CustomEvent(EVENTO_SESSAO_EXPIRADA));
        }
    }
    return response;
}

// Pergunta ao servidor quem está logado neste navegador.
export async function buscarSessao(signal) {
    const response = await apiFetch(`${API_URL}/sessao`, { signal });
    if (!response.ok) throw new Error('Não foi possível conferir a sessão.');
    return response.json();
}

export async function encerrarSessao() {
    try {
        await apiFetch(`${API_URL}/logout`, { method: 'POST' });
    } catch {}
    limparSessaoLocal();
}

export async function buscarUsuario(id) {
    let response;
    let resultado;

    try {
        response = await apiFetch(`${API_URL}/usuarios/${id}`);
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
        response = await apiFetch(`${API_URL}/usuarios/${id}`, {
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
        response = await apiFetch(`${API_URL}/usuarios`, {
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
        response = await apiFetch(`${API_URL}/login`, {
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
        response = await apiFetch(`${API_URL}/usuarios/${id}/foto`, {
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
        response = await apiFetch(`${API_URL}/usuarios/${id}/foto`, {
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
        response = await apiFetch(`${API_URL}/usuarios/${encodeURIComponent(id)}/senha`, {
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