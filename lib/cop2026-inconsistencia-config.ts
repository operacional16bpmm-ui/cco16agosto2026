/**
 * Parâmetros de contato do relato de problema do sistema.
 *
 * Separado de `cop2026-inconsistencia.ts` porque aquele é módulo puro, sem
 * ambiente — é o que permite testá-lo com `node --test` sem subir nada.
 *
 * O número do WhatsApp de ajuda é o do Fabrício (decisão dele em 08/09/2026,
 * ao pedir o botão flutuante no formulário). Fica em variável de ambiente com
 * padrão embutido: trocar quem atende não pode exigir deploy — é o mesmo
 * princípio da lista de autorizados, que saiu da env e virou tela justamente
 * por isso.
 *
 * Formato: DDI + DDD + número, só dígitos, como o wa.me exige.
 */
export const WHATSAPP_AJUDA =
  process.env.NEXT_PUBLIC_COP_WHATSAPP_AJUDA?.replace(/\D/g, "") || "5511949829748";
