import { NO_WRITE_BLOCK_MESSAGE } from "../core/path-guards.js";

export { NO_WRITE_BLOCK_MESSAGE };

/**
 * Nivel 3 — Somente leitura.
 *
 * Este estagio NUNCA escreve arquivos. Qualquer tentativa futura de
 * adicionar funcionalidade de escrita aqui deve ser bloqueada.
 *
 * Security: A funcao retorna apenas uma mensagem descritiva.
 * Nenhum parametro de caminho ou opcao de escrita e aceito.
 */
export function runNivel3(): string {
  return NO_WRITE_BLOCK_MESSAGE;
}

export default runNivel3;
