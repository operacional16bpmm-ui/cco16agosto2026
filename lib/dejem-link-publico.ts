/**
 * Link discreto do estudo DEJEM.
 *
 * NÃO é controle de acesso, e o texto da página diz isso ao leitor. É
 * discrição: quem não recebeu o endereço não o descobre navegando, e a página
 * sai do alcance de buscador por noindex. Quem receber o link e repassar,
 * repassa o acesso — a decisão de compartilhar é de quem envia.
 *
 * O que a rota pública NUNCA entrega, independentemente do token: nome e RE de
 * policial. Isso não depende deste segredo; depende de a rota passar
 * `nominal={false}` de forma incondicional, sem consultar sessão.
 *
 * Para revogar o link, troque o valor abaixo e publique: o endereço antigo
 * passa a devolver 404 imediatamente.
 *
 * Gerado com crypto.randomBytes(16) em 31JUL2026.
 */
export const TOKEN_ESTUDO_DEJEM = "4f0061131803ce8d6c16775673da8036";

export const CAMINHO_ESTUDO_DEJEM = `/estudos/dejem/${TOKEN_ESTUDO_DEJEM}`;

/**
 * Comparação em tempo constante.
 *
 * Um `===` de string sai no primeiro caractere diferente, e essa diferença de
 * tempo é mensurável em rede. Com token de 128 bits o ataque é teórico, mas
 * comparar direito custa três linhas.
 */
export function tokenConfere(recebido: string): boolean {
  const esperado = TOKEN_ESTUDO_DEJEM;
  if (recebido.length !== esperado.length) return false;
  let diferenca = 0;
  for (let i = 0; i < esperado.length; i++) {
    diferenca |= recebido.charCodeAt(i) ^ esperado.charCodeAt(i);
  }
  return diferenca === 0;
}
