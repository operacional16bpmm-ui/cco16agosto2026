-- Aplicada no Supabase em 08/09/2026 via MCP (projeto lypxujjyllmibxqvdogr).
-- Os pares foram GERADOS por lib/cop2026-nomes.ts sobre os valores distintos
-- reais da tabela — a regra existe num lugar só. Ver a migration no historico
-- do Supabase: cop_normalizar_caixa_nomes.

update public.cop_auditoria_lancamento as l set nome_guerra = m.novo
from (values
  ('ACACIA APARECIDA DE SOUZA BORGES', 'Acacia Aparecida de Souza Borges'),
  ('ADRIANO DA SILVA CAVALCANTE', 'Adriano da Silva Cavalcante'),
  ('ANDRE JACKSON COSTA SILVA', 'Andre Jackson Costa Silva'),
  ('CAMARINI', 'Camarini'),
  ('CLÉBER', 'Cléber'),
  ('CRISTIANO', 'Cristiano'),
  ('CRISTOFER FEITOZA', 'Cristofer Feitoza'),
  ('DALVAN DUNDER MARTINS', 'Dalvan Dunder Martins'),
  ('EDSON DE OLIVEIRA TEÓFILO', 'Edson de Oliveira Teófilo'),
  ('FÁBIO GAMBALE DA SILVA', 'Fábio Gambale da Silva'),
  ('FABRICIO BEIRA PIRES', 'Fabricio Beira Pires'),
  ('FERNANDO DE LUCA', 'Fernando de Luca'),
  ('FRANCIS MARCELO VAZ', 'Francis Marcelo Vaz'),
  ('GALIANY', 'Galiany'),
  ('GUILHERME ROSSI BENASSI', 'Guilherme Rossi Benassi'),
  ('HENRIQUE CALDAS MACEDO', 'Henrique Caldas Macedo'),
  ('HUDSON SANTOS FARIA', 'Hudson Santos Faria'),
  ('JAELSON FERREIRA NOBRE', 'Jaelson Ferreira Nobre'),
  ('JAMIL PEREIRA DA SILVA', 'Jamil Pereira da Silva'),
  ('JESSICA LOPES', 'Jessica Lopes'),
  ('JOÃO CARLOS ALBA JÚNIOR', 'João Carlos Alba Júnior'),
  ('JOSÉ EDUARDO DE SOUZA FILHO', 'José Eduardo de Souza Filho'),
  ('LEANDRO MATEUS AGUIAR DA SILVA', 'Leandro Mateus Aguiar da Silva'),
  ('LEONARDO OLIVEIRA PASSARINI', 'Leonardo Oliveira Passarini'),
  ('LOURENÇO BORGES DA SILVA NETO', 'Lourenço Borges da Silva Neto'),
  ('MARCUS VINICIUS MOREIRA ROSA', 'Marcus Vinicius Moreira Rosa'),
  ('MARTINEZ', 'Martinez'),
  ('MICHAEL NOEMIO DA SILVA', 'Michael Noemio da Silva'),
  ('MIRIAM MENDES DOS REIS', 'Miriam Mendes dos Reis'),
  ('NOBRE', 'Nobre'),
  ('PAULUCCI', 'Paulucci'),
  ('R.NASCIMENTO', 'R.nascimento'),
  ('RAPHAEL REIMBERG SILVA PEREIRA', 'Raphael Reimberg Silva Pereira'),
  ('RICARDO ANTUNES DE SOUZA', 'Ricardo Antunes de Souza'),
  ('RICARDO DOS SANTOS MENDES', 'Ricardo dos Santos Mendes'),
  ('RITCHARD WILLIAN DE SOUZA FERNANDES', 'Ritchard Willian de Souza Fernandes'),
  ('RONALD QUINTINO CORREIA BISPO CAMACHO', 'Ronald Quintino Correia Bispo Camacho'),
  ('VAZ', 'Vaz'),
  ('VICENTE ALEXANDRE DE LIMA MENDES', 'Vicente Alexandre de Lima Mendes'),
  ('VINÍCIUS', 'Vinícius'),
  ('VINICIUS DA SILVA FIGUEIREDO', 'Vinicius da Silva Figueiredo'),
  ('VINÍCUS', 'Vinícus'),
  ('WAGNER CARRILHO MARTINEZ JUNIOR', 'Wagner Carrilho Martinez Junior'),
  ('WELLINGTON DE SANTANA NEVES', 'Wellington de Santana Neves')
) as m(velho, novo)
where l.nome_guerra = m.velho;

update public.cop_auditoria_lancamento as l set posto = m.novo
from (values
  ('2º SGT PM', '2º Sgt PM'),
  ('CAP PM', 'Cap PM'),
  ('1º SGT PM', '1º Sgt PM'),
  ('3º SGT PM', '3º Sgt PM'),
  ('SUBTEN PM', 'Subten PM'),
  ('MAJ PM', 'Maj PM'),
  ('1º TEN PM', '1º Ten PM'),
  ('1° SGT PM', '1º Sgt PM'),
  ('2º TEN PM', '2º Ten PM'),
  ('3° SGT PM', '3º Sgt PM'),
  ('3º SGT PM F', '3º Sgt PM F'),
  ('3⁰Sgt PM', '3º Sgt PM'),
  ('SD PM 2ª CL', 'Sd PM 2ª Cl'),
  ('1 SGT PM', '1º Sgt PM'),
  ('1° TEN PM', '1º Ten PM'),
  ('3°SGT PM', '3º Sgt PM'),
  ('MAJ', 'Maj')
) as m(velho, novo)
where l.posto = m.velho;

-- funcao: nada a normalizar.
