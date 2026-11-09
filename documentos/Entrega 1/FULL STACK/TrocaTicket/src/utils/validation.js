export function onlyNumbers(value = '') {
    return String(value).replace(/\D/g, '');
}

export function normalizeEmail(value = '') {
    return String(value).trim().toLowerCase();
}

export function maskCPF(value = '') {
    return onlyNumbers(value).slice(0, 11).replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

export function maskCNPJ(value = '') {
    return onlyNumbers(value).slice(0, 14).replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2');
}

export function maskDocument(value = '') {
    const numbers = onlyNumbers(value);

    return numbers.length <= 11 ? maskCPF(numbers) : maskCNPJ(numbers);
}

export function maskPhone(value = '') {
    const numbers = onlyNumbers(value).slice(0, 11);

    if (numbers.length === 0) return '';

    if (numbers.length <= 10) {
        return numbers.replace(/^(\d{2})(\d{0,4})(\d{0,4})$/, (_, ddd, first, second) => `(${ddd}${ddd.length === 2 ? ') ' : ''}${first}${
            second ? `-${second}` : ''
            }`
        );
    }

    return numbers.replace(
        /^(\d{2})(\d{5})(\d{0,4})$/,
        '($1) $2-$3'
    );
}

// CEP
export function maskCEP(value = '') {
return onlyNumbers(value)
    .slice(0, 8)
    .replace(/^(\d{5})(\d)/, '$1-$2');
}

/* =====================================
    VALIDAÇÕES INDIVIDUAIS
===================================== */

// Nome
export function validateName(name = '') {
return name.trim().length >= 2;
}

// E-mail
export function validateEmail(email = '') {
return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    normalizeEmail(email)
);
}

// CPF/CNPJ: valida somente a quantidade de dígitos
export function validateDocument(document = '') {
const length = onlyNumbers(document).length;

return [11, 14].includes(length);
}

export function validatePassword(password = '') {
    return password.length >= 8;
}

export function validatePasswordConfirmation(password = '', confirm = '') {
    return password === confirm;
}

export function validatePhone(phone = '') {
    return [10, 11].includes(onlyNumbers(phone).length);
}

export function validateCEP(cep = '') {
    return onlyNumbers(cep).length === 8;
}

export function validateAccount(data, login = false) {
    const errors = {};

    if (!login) {
        if (!validateName(data.name)) {
            errors.name = 'Informe seu nome completo.';
        }

        if (!validateDocument(data.document)) {
            errors.document = 'Informe um CPF com 11 dígitos ou CNPJ com 14 dígitos.';
        }
    }

    if (!validateEmail(data.email)) {
        errors.email = 'Informe um e-mail válido.';
    }

    if (!login) {
        if (!validatePassword(data.password)) {
            errors.password = 'A senha deve possuir pelo menos 8 caracteres.';
        }

        if (!validatePasswordConfirmation(data.password, data.confirm)) {
            errors.confirm = 'As senhas não conferem.';
        }
    } else {
        if (!data.password || String(data.password).trim() === '') {
            errors.password = 'Informe sua senha.';
        }
    }

    return errors;
}

export function validateRecovery(data) {
    const errors = {};

    if (!validateEmail(data.email)) {
        errors.email = 'Informe um e-mail válido.';
    }

    return errors;
}
