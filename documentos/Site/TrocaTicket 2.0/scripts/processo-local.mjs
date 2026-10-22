// Se a janela do iniciador for fechada, seus processos tambem encerram.
// O canal IPC pertence apenas a esse pai; nao procura nem mata outros programas.
import { pathToFileURL } from 'node:url';
const [, , arquivo, ...argumentos] = process.argv;
if (!arquivo || typeof process.send !== 'function') {
  console.error('Use Iniciar-TrocaTicket.cmd para abrir o sistema.');
  process.exit(1);
}
process.once('disconnect', () => process.exit(0));
process.channel.unref();
process.argv = [process.execPath, arquivo, ...argumentos];
await import(pathToFileURL(arquivo).href);
