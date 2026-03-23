import { pgTable, serial, text, date, numeric, boolean, timestamp, integer } from "drizzle-orm/pg-core";

export const viagensTripsTable = pgTable("viagens_trips", {
  id: serial("id").primaryKey(),
  destino: text("destino").notNull(),
  dataInicio: date("data_inicio"),
  dataFim: date("data_fim"),
  orcamento: numeric("orcamento", { precision: 12, scale: 2 }),
  status: text("status").notNull().default("planejando"),
  descricao: text("descricao"),
  capaUrl: text("capa_url"),
  pais: text("pais"),
  cidade: text("cidade"),
  moeda: text("moeda").default("BRL"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const viagensLugaresTable = pgTable("viagens_lugares", {
  id: serial("id").primaryKey(),
  viagemId: integer("viagem_id").references(() => viagensTripsTable.id).notNull(),
  nome: text("nome").notNull(),
  endereco: text("endereco"),
  cidade: text("cidade"),
  pais: text("pais"),
  bairro: text("bairro"),
  categoria: text("categoria").notNull().default("ponto_turistico"),
  descricao: text("descricao"),
  notas: text("notas"),
  horario: text("horario"),
  comoChegar: text("como_chegar"),
  linkExterno: text("link_externo"),
  prioridade: text("prioridade").notNull().default("media"),
  status: text("status").notNull().default("planejado"),
  duracaoEstimada: integer("duracao_estimada"),
  lat: numeric("lat", { precision: 12, scale: 7 }),
  lng: numeric("lng", { precision: 12, scale: 7 }),
  diaViagem: integer("dia_viagem"),
  ordemRoteiro: integer("ordem_roteiro").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const viagensExpensesTable = pgTable("viagens_expenses", {
  id: serial("id").primaryKey(),
  viagemId: integer("viagem_id").references(() => viagensTripsTable.id),
  descricao: text("descricao").notNull(),
  valor: numeric("valor", { precision: 12, scale: 2 }).notNull(),
  categoria: text("categoria").notNull().default("outros"),
  data: date("data"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const viagensChecklistTable = pgTable("viagens_checklist", {
  id: serial("id").primaryKey(),
  viagemId: integer("viagem_id").references(() => viagensTripsTable.id),
  item: text("item").notNull(),
  fase: text("fase").notNull().default("antes"),
  concluido: boolean("concluido").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const viagensRoteiroTable = pgTable("viagens_roteiro", {
  id: serial("id").primaryKey(),
  viagemId: integer("viagem_id").references(() => viagensTripsTable.id),
  lugarId: integer("lugar_id").references(() => viagensLugaresTable.id),
  dia: integer("dia").notNull(),
  data: date("data"),
  titulo: text("titulo").notNull(),
  descricao: text("descricao"),
  hora: text("hora"),
  tipo: text("tipo").notNull().default("atividade"),
  ordem: integer("ordem").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const viagensMemoriasTable = pgTable("viagens_memorias", {
  id: serial("id").primaryKey(),
  viagemId: integer("viagem_id").references(() => viagensTripsTable.id).notNull(),
  titulo: text("titulo").notNull(),
  conteudo: text("conteudo"),
  data: date("data"),
  fotoUrl: text("foto_url"),
  dia: integer("dia"),
  tipo: text("tipo").notNull().default("nota"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type ViagemTrip = typeof viagensTripsTable.$inferSelect;
export type ViagemLugar = typeof viagensLugaresTable.$inferSelect;
export type ViagemExpense = typeof viagensExpensesTable.$inferSelect;
export type ViagemChecklist = typeof viagensChecklistTable.$inferSelect;
export type ViagemRoteiro = typeof viagensRoteiroTable.$inferSelect;
export type ViagemMemoria = typeof viagensMemoriasTable.$inferSelect;
