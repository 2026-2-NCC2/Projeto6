import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
const scrypt = promisify(scryptCallback);
const options = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

export async function hashSenha(password) {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, 64, options);
  return `scrypt$32768$8$1$${salt.toString('hex')}$${hash.toString('hex')}`;
}
export async function conferirSenha(password, encoded) {
  if (typeof password !== 'string' || password.length > 128 || typeof encoded !== 'string')
    return false;
  const parts = encoded.split('$');
  if (
    parts.length !== 6 ||
    parts[0] !== 'scrypt' ||
    parts[1] !== '32768' ||
    parts[2] !== '8' ||
    parts[3] !== '1' ||
    !/^[a-f0-9]{32}$/.test(parts[4]) ||
    !/^[a-f0-9]{128}$/.test(parts[5])
  )
    return false;
  const actual = await scrypt(password, Buffer.from(parts[4], 'hex'), 64, options);
  return timingSafeEqual(actual, Buffer.from(parts[5], 'hex'));
}
