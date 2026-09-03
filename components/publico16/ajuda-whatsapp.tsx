"use client";

/**
 * Botão de socorro do formulário. Fica colado no canto do cartão de lançamento
 * porque a dúvida sempre nasce ali — na hora de preencher, não depois. Pequeno
 * de propósito: não pode competir com o "Preencher agora", só existir para quem
 * travou. O anel pulsa e os pontinhos do balão "digitam" em looping, sinal de
 * que do outro lado tem gente, não um FAQ.
 */
const NUMERO = "5511949829748";
/* Com acento: a mensagem sai em nome do Batalhão, e o `encodeURIComponent`
   abaixo entrega UTF-8 que o WhatsApp lê sem problema no iOS e no Android. */
const MENSAGEM =
  "Olá! Sou do 16º BPM/M e estou com dúvida no preenchimento da Auditoria de COP 2026.";

export function AjudaWhatsApp() {
  return (
    <a
      href={`https://wa.me/${NUMERO}?text=${encodeURIComponent(MENSAGEM)}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Falar no WhatsApp com o suporte da auditoria"
      className="group/ajuda absolute -left-2.5 -top-2.5 z-20 flex h-11 w-11 items-center justify-center rounded-full border-2 border-white bg-[#25D366] text-white shadow-[0_6px_18px_rgba(0,0,0,0.35)] outline-none transition-transform duration-300 hover:scale-110 focus-visible:ring-2 focus-visible:ring-white active:scale-95 sm:h-12 sm:w-12"
    >
      {/* anel que pulsa: chama o olho sem piscar cores */}
      <span className="pointer-events-none absolute inset-0 animate-ping rounded-full bg-[#25D366]/50 [animation-duration:2.2s]" />

      {/* balão de conversa com os pontinhos "digitando" */}
      <svg
        viewBox="0 0 24 24"
        className="relative h-[22px] w-[22px]"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        <g stroke="none" fill="currentColor">
          <circle cx="8.5" cy="11.5" r="1.15">
            <animate
              attributeName="opacity"
              values="0.25;1;0.25"
              dur="1.2s"
              begin="0s"
              repeatCount="indefinite"
            />
          </circle>
          <circle cx="12" cy="11.5" r="1.15">
            <animate
              attributeName="opacity"
              values="0.25;1;0.25"
              dur="1.2s"
              begin="0.2s"
              repeatCount="indefinite"
            />
          </circle>
          <circle cx="15.5" cy="11.5" r="1.15">
            <animate
              attributeName="opacity"
              values="0.25;1;0.25"
              dur="1.2s"
              begin="0.4s"
              repeatCount="indefinite"
            />
          </circle>
        </g>
      </svg>

      {/* rótulo que abre para a direita — some no toque, onde não há hover */}
      <span className="pointer-events-none absolute left-[calc(100%+8px)] hidden whitespace-nowrap rounded-md bg-[#111] px-2.5 py-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-white opacity-0 shadow-lg transition-all duration-300 group-hover/ajuda:translate-x-0 group-hover/ajuda:opacity-100 sm:block sm:-translate-x-1">
        Dúvida? Fale comigo
      </span>
    </a>
  );
}
