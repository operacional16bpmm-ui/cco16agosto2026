"use client";

import { useActionState, useState } from "react";
import {
  KeyRound,
  UserPlus,
  ShieldOff,
  ShieldCheck,
  RotateCcw,
  LogOut,
  Copy,
  Check,
  SlidersHorizontal,
} from "lucide-react";
import { Card, Badge } from "@/components/command/ui";
import { PAGINAS_ADMINISTRAVEIS } from "@/lib/paginas";
import { UNIDADES } from "@/lib/unidades";
import {
  alternarAtivoAction,
  criarUsuarioAction,
  redefinirSenhaAction,
  revogarSessoesAction,
  salvarPaginasAction,
  type UsuarioState,
} from "./actions";

type UsuarioLinha = {
  id: string;
  usuario: string;
  nome_exibicao: string;
  perfil: string;
  unidade: string | null;
  ativo: boolean;
  deve_trocar_senha: boolean;
  ultimo_acesso_em: string | null;
  rotas: string[];
};

const PERFIL_ROTULO: Record<string, string> = {
  comando: "Comando",
  estado_maior: "Estado-Maior",
  cmt_cia: "Cmt de Companhia",
  secao: "Seção",
};

const vazio: UsuarioState = { ok: false, error: null };

/** Agrupa o catálogo na mesma ordem da navegação lateral. */
function porGrupo() {
  const grupos: { titulo: string; itens: typeof PAGINAS_ADMINISTRAVEIS }[] = [];
  for (const pagina of PAGINAS_ADMINISTRAVEIS) {
    const atual = grupos.find((g) => g.titulo === pagina.grupo);
    if (atual) atual.itens.push(pagina);
    else grupos.push({ titulo: pagina.grupo, itens: [pagina] });
  }
  return grupos;
}

export function PainelUsuarios({
  usuarios,
  operador,
}: {
  usuarios: UsuarioLinha[];
  operador: string;
}) {
  const [selecionado, setSelecionado] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <FormNovoUsuario />

      <div className="space-y-3">
        {usuarios.length === 0 && (
          <Card>
            <p className="text-sm text-branco/50">
              Nenhuma conta cadastrada. Crie a primeira acima.
            </p>
          </Card>
        )}
        {usuarios.map((u) => (
          <LinhaUsuario
            key={u.id}
            usuario={u}
            operador={operador}
            aberto={selecionado === u.id}
            aoAlternar={() => setSelecionado(selecionado === u.id ? null : u.id)}
          />
        ))}
      </div>
    </div>
  );
}

/* --------------------------------------------------------- criação de conta */

function FormNovoUsuario() {
  const [state, action, pending] = useActionState(criarUsuarioAction, vazio);
  const [perfil, setPerfil] = useState("secao");

  return (
    <Card>
      <div className="mb-4 flex items-center gap-2">
        <UserPlus size={16} className="text-azul" />
        <h2 className="text-sm font-bold text-branco">Nova conta de acesso</h2>
      </div>

      <form action={action} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Campo rotulo="Usuário">
          <input
            name="usuario"
            required
            placeholder="cmt1cia"
            autoCapitalize="none"
            spellCheck={false}
            className={entrada}
          />
        </Campo>
        <Campo rotulo="Nome de exibição" className="lg:col-span-2">
          <input name="nome" required placeholder="Cap PM Silva" className={entrada} />
        </Campo>
        <Campo rotulo="Perfil">
          <select
            name="perfil"
            value={perfil}
            onChange={(e) => setPerfil(e.target.value)}
            className={entrada}
          >
            <option value="comando">Comando</option>
            <option value="estado_maior">Estado-Maior</option>
            <option value="cmt_cia">Cmt de Companhia</option>
            <option value="secao">Seção</option>
          </select>
        </Campo>
        <Campo rotulo="Unidade">
          <select name="unidade" className={entrada} disabled={perfil !== "cmt_cia"}>
            <option value="">—</option>
            {UNIDADES.map((u) => (
              <option key={u.valor} value={u.valor}>
                {u.curto}
              </option>
            ))}
          </select>
        </Campo>

        <div className="sm:col-span-2 lg:col-span-5">
          <button type="submit" disabled={pending} className={botaoPrimario}>
            {pending ? "Criando…" : "Criar conta e gerar chave de acesso"}
          </button>
        </div>
      </form>

      {state.error && <Aviso tom="erro">{state.error}</Aviso>}
      {state.chave && <ChaveGerada usuario={state.chave.usuario} valor={state.chave.valor} />}

      <p className="mt-3 text-xs text-branco/40">
        A conta nasce sem nenhuma página liberada, exceto o painel da própria
        unidade no caso do comandante. Depois de criar, abra a conta na lista e
        marque o que ela pode acessar. O perfil Comando é sempre irrestrito.
      </p>
    </Card>
  );
}

function ChaveGerada({ usuario, valor }: { usuario: string; valor: string }) {
  const [copiado, setCopiado] = useState(false);

  return (
    <div className="mt-4 rounded-lg border border-ouro/40 bg-ouro/10 p-4">
      <div className="flex items-center gap-2">
        <KeyRound size={14} className="text-ouro" />
        <p className="text-xs font-bold uppercase tracking-wide text-ouro">
          Chave de acesso de {usuario}
        </p>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <code className="select-all rounded-md bg-tatico-fundo px-3 py-2 text-base font-bold tracking-widest text-branco">
          {valor}
        </code>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard.writeText(valor).then(() => {
              setCopiado(true);
              setTimeout(() => setCopiado(false), 2000);
            });
          }}
          className="inline-flex items-center gap-1.5 rounded-md border border-branco/15 px-3 py-2 text-xs font-medium text-branco/70 hover:bg-branco/5"
        >
          {copiado ? <Check size={13} /> : <Copy size={13} />}
          {copiado ? "Copiado" : "Copiar"}
        </button>
      </div>
      <p className="mt-2 text-xs text-branco/60">
        Anote agora e entregue ao titular. Ela não será exibida de novo. No
        primeiro acesso o portal obriga a definir uma senha pessoal.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------ linha da conta */

function LinhaUsuario({
  usuario,
  operador,
  aberto,
  aoAlternar,
}: {
  usuario: UsuarioLinha;
  operador: string;
  aberto: boolean;
  aoAlternar: () => void;
}) {
  const [ativoState, ativoAction, ativoPending] = useActionState(alternarAtivoAction, vazio);
  const [senhaState, senhaAction, senhaPending] = useActionState(redefinirSenhaAction, vazio);
  const [revogaState, revogaAction, revogaPending] = useActionState(revogarSessoesAction, vazio);

  const ehComando = usuario.perfil === "comando";
  const unidade = usuario.unidade
    ? UNIDADES.find((u) => u.valor === usuario.unidade)?.curto
    : null;
  const erro = ativoState.error ?? senhaState.error ?? revogaState.error;

  return (
    <Card className={usuario.ativo ? undefined : "opacity-60"}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-bold text-branco">{usuario.nome_exibicao}</h3>
            <code className="text-xs text-branco/50">{usuario.usuario}</code>
            {usuario.ativo ? (
              <Badge tone="ok">Ativa</Badge>
            ) : (
              <Badge tone="critical">Desativada</Badge>
            )}
            {usuario.deve_trocar_senha && <Badge tone="attention">Chave provisória</Badge>}
          </div>
          <p className="mt-1 text-xs text-branco/50">
            {PERFIL_ROTULO[usuario.perfil] ?? usuario.perfil}
            {unidade ? ` · ${unidade}` : ""}
            {" · "}
            {ehComando
              ? "acesso irrestrito"
              : `${usuario.rotas.length} ${usuario.rotas.length === 1 ? "página liberada" : "páginas liberadas"}`}
            {usuario.ultimo_acesso_em
              ? ` · último acesso em ${new Date(usuario.ultimo_acesso_em).toLocaleString("pt-BR")}`
              : " · nunca acessou"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!ehComando && (
            <button type="button" onClick={aoAlternar} className={botaoSecundario}>
              <SlidersHorizontal size={13} />
              {aberto ? "Fechar páginas" : "Páginas liberadas"}
            </button>
          )}
          <form action={senhaAction}>
            <input type="hidden" name="id" value={usuario.id} />
            <input type="hidden" name="usuario" value={usuario.usuario} />
            <button type="submit" disabled={senhaPending} className={botaoSecundario}>
              <RotateCcw size={13} />
              {senhaPending ? "Gerando…" : "Nova chave"}
            </button>
          </form>
          <form action={revogaAction}>
            <input type="hidden" name="id" value={usuario.id} />
            <input type="hidden" name="usuario" value={usuario.usuario} />
            <button type="submit" disabled={revogaPending} className={botaoSecundario}>
              <LogOut size={13} />
              {revogaPending ? "Revogando…" : "Encerrar sessões"}
            </button>
          </form>
          {usuario.usuario !== operador && (
            <form action={ativoAction}>
              <input type="hidden" name="id" value={usuario.id} />
              <input type="hidden" name="usuario" value={usuario.usuario} />
              <input type="hidden" name="ativar" value={usuario.ativo ? "0" : "1"} />
              <button
                type="submit"
                disabled={ativoPending}
                className={usuario.ativo ? botaoPerigo : botaoSecundario}
              >
                {usuario.ativo ? <ShieldOff size={13} /> : <ShieldCheck size={13} />}
                {usuario.ativo ? "Desativar" : "Reativar"}
              </button>
            </form>
          )}
        </div>
      </div>

      {erro && <Aviso tom="erro">{erro}</Aviso>}
      {senhaState.chave && (
        <ChaveGerada usuario={senhaState.chave.usuario} valor={senhaState.chave.valor} />
      )}
      {revogaState.ok && !revogaState.error && (
        <Aviso tom="ok">Sessões encerradas. O usuário precisa entrar de novo.</Aviso>
      )}

      {aberto && !ehComando && <MatrizPaginas usuario={usuario} />}
    </Card>
  );
}

/* ------------------------------------------------------ matriz de permissões */

function MatrizPaginas({ usuario }: { usuario: UsuarioLinha }) {
  const [state, action, pending] = useActionState(salvarPaginasAction, vazio);
  const marcadas = new Set(usuario.rotas);

  return (
    <form action={action} className="mt-5 border-t border-branco/10 pt-4">
      <input type="hidden" name="id" value={usuario.id} />
      <input type="hidden" name="usuario" value={usuario.usuario} />

      <p className="mb-3 text-xs text-branco/50">
        Marque as páginas que {usuario.nome_exibicao} pode abrir. Liberar uma
        página cobre também as internas dela: o P4 abre telemática, material
        bélico, inventário e documentos.
      </p>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {porGrupo().map((grupo) => (
          <div key={grupo.titulo}>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-branco/30">
              {grupo.titulo}
            </p>
            <div className="flex flex-col gap-1">
              {grupo.itens.map((pagina) => (
                <label
                  key={pagina.rota}
                  className="flex items-center gap-2 rounded px-1 py-0.5 text-xs text-branco/75 hover:bg-branco/5"
                >
                  <input
                    type="checkbox"
                    name="rota"
                    value={pagina.rota}
                    defaultChecked={marcadas.has(pagina.rota)}
                    className="h-3.5 w-3.5 accent-azul"
                  />
                  {pagina.rotulo}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button type="submit" disabled={pending} className={botaoPrimario}>
          {pending ? "Salvando…" : "Salvar páginas liberadas"}
        </button>
        {state.ok && !state.error && (
          <span className="text-xs font-medium text-emerald-500">Permissões salvas.</span>
        )}
      </div>
      {state.error && <Aviso tom="erro">{state.error}</Aviso>}
    </form>
  );
}

/* ------------------------------------------------------------------ enfeites */

const entrada =
  "w-full rounded-md border border-branco/15 bg-tatico-fundo px-3 py-2 text-sm text-branco placeholder:text-branco/30 outline-none focus:border-azul focus:ring-1 focus:ring-azul disabled:opacity-40";

const botaoPrimario =
  "inline-flex items-center gap-2 rounded-md bg-azul px-4 py-2 text-xs font-semibold text-branco transition-colors hover:bg-azul-escuro disabled:opacity-60";

const botaoSecundario =
  "inline-flex items-center gap-1.5 rounded-md border border-branco/15 px-3 py-1.5 text-xs font-medium text-branco/70 transition-colors hover:bg-branco/5 hover:text-branco disabled:opacity-50";

const botaoPerigo =
  "inline-flex items-center gap-1.5 rounded-md border border-vermelho/40 px-3 py-1.5 text-xs font-medium text-vermelho transition-colors hover:bg-vermelho/10 disabled:opacity-50";

function Campo({
  rotulo,
  children,
  className,
}: {
  rotulo: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-branco/45">
        {rotulo}
      </span>
      {children}
    </label>
  );
}

function Aviso({ tom, children }: { tom: "erro" | "ok"; children: React.ReactNode }) {
  return (
    <p
      role="alert"
      className={`mt-3 rounded-md border px-3 py-2 text-xs ${
        tom === "erro"
          ? "border-vermelho/40 bg-vermelho/10 text-vermelho"
          : "border-emerald-600/40 bg-emerald-600/10 text-emerald-500"
      }`}
    >
      {children}
    </p>
  );
}
