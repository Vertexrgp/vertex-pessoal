import { db } from "@workspace/db";
import {
  accountsTable, categoriesTable, subcategoriesTable, transactionsTable,
  assetsTable, receivablesTable, debtsTable, incomesTable,
  budgetGroupsTable, budgetItemsTable, monthlyPlansTable
} from "@workspace/db/schema";

async function seed() {
  console.log("🌱 Seeding Vertex Finance OS...");

  // ─── ACCOUNTS ───────────────────────────────────────────────────────────────
  const [contaCorrente, poupanca, investimentos] = await db.insert(accountsTable).values([
    { name: "Conta Corrente Itaú", type: "checking", balance: "12450.00", color: "#FF6900", isActive: true },
    { name: "Poupança Itaú", type: "savings", balance: "8320.50", color: "#003087", isActive: true },
    { name: "Renda Fixa XP", type: "investment", balance: "85000.00", color: "#1A1A2E", isActive: true },
  ]).returning();

  // ─── CATEGORIES ─────────────────────────────────────────────────────────────
  const [
    catSalario, catFreelance, catAluguel, catCondominio, catAcademia,
    catLuz, catInternet, catMercado, catIfood, catRestaurante,
    catLazer, catTransporte, catSaude, catStreaming, catPet,
    catCarro, catViagem, catInvestimento
  ] = await db.insert(categoriesTable).values([
    { name: "Salário", type: "income", group: null, color: "#22c55e", icon: "briefcase", isActive: true },
    { name: "Freelance", type: "income", group: null, color: "#10b981", icon: "code", isActive: true },
    { name: "Aluguel", type: "expense", group: "fixed", color: "#ef4444", icon: "home", isActive: true },
    { name: "Condomínio", type: "expense", group: "fixed", color: "#f97316", icon: "building", isActive: true },
    { name: "Academia", type: "expense", group: "fixed", color: "#8b5cf6", icon: "dumbbell", isActive: true },
    { name: "Luz / Energia", type: "expense", group: "fixed", color: "#eab308", icon: "zap", isActive: true },
    { name: "Internet / Telefone", type: "expense", group: "fixed", color: "#06b6d4", icon: "wifi", isActive: true },
    { name: "Mercado", type: "expense", group: "variable", color: "#84cc16", icon: "shopping-cart", isActive: true },
    { name: "iFood / Rappi", type: "expense", group: "variable", color: "#f43f5e", icon: "utensils", isActive: true },
    { name: "Restaurante", type: "expense", group: "variable", color: "#fb923c", icon: "coffee", isActive: true },
    { name: "Lazer", type: "expense", group: "leisure", color: "#a855f7", icon: "music", isActive: true },
    { name: "Transporte", type: "expense", group: "variable", color: "#3b82f6", icon: "car", isActive: true },
    { name: "Saúde", type: "expense", group: "variable", color: "#ec4899", icon: "heart", isActive: true },
    { name: "Streaming", type: "expense", group: "fixed", color: "#6366f1", icon: "tv", isActive: true },
    { name: "Pet", type: "expense", group: "variable", color: "#14b8a6", icon: "heart", isActive: true },
    { name: "Carro", type: "expense", group: "variable", color: "#64748b", icon: "car", isActive: true },
    { name: "Viagens", type: "expense", group: "leisure", color: "#0ea5e9", icon: "plane", isActive: true },
    { name: "Investimento", type: "expense", group: "investment_lp", color: "#22c55e", icon: "trending-up", isActive: true },
  ]).returning();

  // ─── TRANSACTIONS (March 2026 — current month) ──────────────────────────────
  await db.insert(transactionsTable).values([
    // Income
    { competenceDate: "2026-03-05", movementDate: "2026-03-05", categoryId: catSalario.id, type: "income", description: "Salário março", amount: "12000.00", accountId: contaCorrente.id, status: "received", paymentMethod: "Transferência" },
    { competenceDate: "2026-03-10", movementDate: "2026-03-10", categoryId: catFreelance.id, type: "income", description: "Projeto App Mobile", amount: "3500.00", accountId: contaCorrente.id, status: "received", paymentMethod: "Pix" },

    // Fixed expenses
    { competenceDate: "2026-03-05", movementDate: "2026-03-05", categoryId: catAluguel.id, type: "expense", description: "Aluguel apartamento", amount: "2800.00", accountId: contaCorrente.id, status: "paid", paymentMethod: "Boleto" },
    { competenceDate: "2026-03-10", movementDate: "2026-03-10", categoryId: catCondominio.id, type: "expense", description: "Condomínio", amount: "650.00", accountId: contaCorrente.id, status: "paid", paymentMethod: "Boleto" },
    { competenceDate: "2026-03-01", movementDate: "2026-03-01", categoryId: catAcademia.id, type: "expense", description: "Academia Smart Fit", amount: "109.90", accountId: contaCorrente.id, status: "paid", paymentMethod: "Débito automático" },
    { competenceDate: "2026-03-15", movementDate: "2026-03-15", categoryId: catLuz.id, type: "expense", description: "Conta de luz ENEL", amount: "187.40", accountId: contaCorrente.id, status: "paid", paymentMethod: "Débito automático" },
    { competenceDate: "2026-03-08", movementDate: "2026-03-08", categoryId: catInternet.id, type: "expense", description: "Internet + Celular Vivo", amount: "149.90", accountId: contaCorrente.id, status: "paid", paymentMethod: "Débito automático" },
    { competenceDate: "2026-03-01", movementDate: "2026-03-01", categoryId: catStreaming.id, type: "expense", description: "Netflix", amount: "39.90", accountId: contaCorrente.id, status: "paid", paymentMethod: "Cartão de crédito" },
    { competenceDate: "2026-03-01", movementDate: "2026-03-01", categoryId: catStreaming.id, type: "expense", description: "Spotify", amount: "21.90", accountId: contaCorrente.id, status: "paid", paymentMethod: "Cartão de crédito" },

    // Variable expenses
    { competenceDate: "2026-03-02", movementDate: "2026-03-02", categoryId: catMercado.id, type: "expense", description: "Mercado Pão de Açúcar", amount: "342.50", accountId: contaCorrente.id, status: "paid", paymentMethod: "Cartão de débito" },
    { competenceDate: "2026-03-09", movementDate: "2026-03-09", categoryId: catMercado.id, type: "expense", description: "Mercado Extra compra semanal", amount: "218.70", accountId: contaCorrente.id, status: "paid", paymentMethod: "Cartão de débito" },
    { competenceDate: "2026-03-16", movementDate: "2026-03-16", categoryId: catMercado.id, type: "expense", description: "Mercado - reposição", amount: "156.30", accountId: contaCorrente.id, status: "paid", paymentMethod: "Pix" },
    { competenceDate: "2026-03-03", movementDate: "2026-03-03", categoryId: catIfood.id, type: "expense", description: "iFood - Jantar sexta", amount: "68.90", accountId: contaCorrente.id, status: "paid", paymentMethod: "Cartão de crédito" },
    { competenceDate: "2026-03-07", movementDate: "2026-03-07", categoryId: catIfood.id, type: "expense", description: "iFood - Almoço", amount: "42.50", accountId: contaCorrente.id, status: "paid", paymentMethod: "Cartão de crédito" },
    { competenceDate: "2026-03-12", movementDate: "2026-03-12", categoryId: catRestaurante.id, type: "expense", description: "Jantar Restaurante Italiano", amount: "185.00", accountId: contaCorrente.id, status: "paid", paymentMethod: "Cartão de crédito" },
    { competenceDate: "2026-03-04", movementDate: "2026-03-04", categoryId: catTransporte.id, type: "expense", description: "Uber semana", amount: "95.40", accountId: contaCorrente.id, status: "paid", paymentMethod: "Cartão de crédito" },
    { competenceDate: "2026-03-11", movementDate: "2026-03-11", categoryId: catTransporte.id, type: "expense", description: "Uber semana 2", amount: "78.20", accountId: contaCorrente.id, status: "paid", paymentMethod: "Cartão de crédito" },
    { competenceDate: "2026-03-06", movementDate: "2026-03-06", categoryId: catSaude.id, type: "expense", description: "Consulta Dermatologista", amount: "350.00", accountId: contaCorrente.id, status: "paid", paymentMethod: "Pix" },
    { competenceDate: "2026-03-14", movementDate: "2026-03-14", categoryId: catPet.id, type: "expense", description: "Ração + petshop", amount: "140.00", accountId: contaCorrente.id, status: "paid", paymentMethod: "Pix" },
    { competenceDate: "2026-03-13", movementDate: "2026-03-13", categoryId: catCarro.id, type: "expense", description: "Abastecimento Gasolina", amount: "210.00", accountId: contaCorrente.id, status: "paid", paymentMethod: "Cartão de débito" },

    // Leisure
    { competenceDate: "2026-03-08", movementDate: "2026-03-08", categoryId: catLazer.id, type: "expense", description: "Cinema + lanche", amount: "89.00", accountId: contaCorrente.id, status: "paid", paymentMethod: "Cartão de crédito" },
    { competenceDate: "2026-03-15", movementDate: "2026-03-15", categoryId: catLazer.id, type: "expense", description: "Bar com amigos", amount: "120.00", accountId: contaCorrente.id, status: "paid", paymentMethod: "Pix" },

    // Investment
    { competenceDate: "2026-03-20", movementDate: "2026-03-20", categoryId: catInvestimento.id, type: "expense", description: "Aporte Renda Fixa XP", amount: "2000.00", accountId: contaCorrente.id, status: "planned", paymentMethod: "Transferência" },

    // Feb 2026
    { competenceDate: "2026-02-05", movementDate: "2026-02-05", categoryId: catSalario.id, type: "income", description: "Salário fevereiro", amount: "12000.00", accountId: contaCorrente.id, status: "received", paymentMethod: "Transferência" },
    { competenceDate: "2026-02-05", movementDate: "2026-02-05", categoryId: catAluguel.id, type: "expense", description: "Aluguel apartamento", amount: "2800.00", accountId: contaCorrente.id, status: "paid", paymentMethod: "Boleto" },
    { competenceDate: "2026-02-10", movementDate: "2026-02-10", categoryId: catCondominio.id, type: "expense", description: "Condomínio", amount: "650.00", accountId: contaCorrente.id, status: "paid", paymentMethod: "Boleto" },
    { competenceDate: "2026-02-02", movementDate: "2026-02-02", categoryId: catMercado.id, type: "expense", description: "Mercado mensal", amount: "680.00", accountId: contaCorrente.id, status: "paid", paymentMethod: "Cartão de débito" },
    { competenceDate: "2026-02-15", movementDate: "2026-02-15", categoryId: catViagem.id, type: "expense", description: "Viagem Carnaval", amount: "1800.00", accountId: contaCorrente.id, status: "paid", paymentMethod: "Cartão de crédito" },
    { competenceDate: "2026-02-01", movementDate: "2026-02-01", categoryId: catAcademia.id, type: "expense", description: "Academia Smart Fit", amount: "109.90", accountId: contaCorrente.id, status: "paid", paymentMethod: "Débito automático" },
    { competenceDate: "2026-02-20", movementDate: "2026-02-20", categoryId: catInvestimento.id, type: "expense", description: "Aporte Renda Fixa XP", amount: "2000.00", accountId: contaCorrente.id, status: "paid", paymentMethod: "Transferência" },

    // Jan 2026
    { competenceDate: "2026-01-05", movementDate: "2026-01-05", categoryId: catSalario.id, type: "income", description: "Salário janeiro", amount: "12000.00", accountId: contaCorrente.id, status: "received", paymentMethod: "Transferência" },
    { competenceDate: "2026-01-15", movementDate: "2026-01-15", categoryId: catFreelance.id, type: "income", description: "Freelance website", amount: "2200.00", accountId: contaCorrente.id, status: "received", paymentMethod: "Pix" },
    { competenceDate: "2026-01-05", movementDate: "2026-01-05", categoryId: catAluguel.id, type: "expense", description: "Aluguel apartamento", amount: "2800.00", accountId: contaCorrente.id, status: "paid", paymentMethod: "Boleto" },
    { competenceDate: "2026-01-10", movementDate: "2026-01-10", categoryId: catCondominio.id, type: "expense", description: "Condomínio", amount: "650.00", accountId: contaCorrente.id, status: "paid", paymentMethod: "Boleto" },
    { competenceDate: "2026-01-05", movementDate: "2026-01-05", categoryId: catMercado.id, type: "expense", description: "Mercado mensal", amount: "720.00", accountId: contaCorrente.id, status: "paid", paymentMethod: "Cartão de débito" },
    { competenceDate: "2026-01-20", movementDate: "2026-01-20", categoryId: catInvestimento.id, type: "expense", description: "Aporte Renda Fixa XP", amount: "2000.00", accountId: contaCorrente.id, status: "paid", paymentMethod: "Transferência" },
  ]);

  // ─── ASSETS (INVESTMENTS) ───────────────────────────────────────────────────
  await db.insert(assetsTable).values([
    { description: "Tesouro Selic 2029", category: "Renda Fixa", amount: "45000.00", date: "2024-06-01", status: "active", recurrence: null, notes: "Reserva de emergência" },
    { description: "CDB Banco Inter 110% CDI", category: "Renda Fixa", amount: "25000.00", date: "2025-01-15", status: "active", recurrence: null, notes: "Vence em 2027" },
    { description: "IVVB11 - S&P500", category: "Renda Variável", amount: "15000.00", date: "2023-08-10", status: "active", recurrence: null, notes: "ETF de ações americanas" },
    { description: "BOVA11 - Ibovespa", category: "Renda Variável", amount: "8500.00", date: "2024-02-20", status: "active", recurrence: null, notes: "ETF Ibovespa" },
    { description: "Fundos Multimercado XP", category: "Fundos", amount: "12000.00", date: "2025-03-01", status: "active", recurrence: "monthly", notes: "Aporte mensal de R$2.000" },
  ]);

  // ─── RECEIVABLES ────────────────────────────────────────────────────────────
  await db.insert(receivablesTable).values([
    { description: "Empréstimo pessoal - João", category: "Empréstimo", amount: "3500.00", dueDate: "2026-04-01", status: "pending", recurrence: null, notes: "Empréstimo ao amigo João" },
    { description: "Aluguel temporário - Airbnb", category: "Renda extra", amount: "1200.00", dueDate: "2026-03-30", status: "pending", recurrence: null, notes: "3 noites apartamento" },
    { description: "Nota fiscal serviço prestado", category: "Freelance", amount: "4500.00", dueDate: "2026-04-15", status: "pending", recurrence: null, notes: "Projeto consultoria" },
  ]);

  // ─── DEBTS ──────────────────────────────────────────────────────────────────
  await db.insert(debtsTable).values([
    { description: "Financiamento Carro", creditor: "Banco Santander", totalAmount: "42000.00", remainingAmount: "28500.00", dueDate: "2028-12-01", status: "active", monthlyInstallment: "1050.00", notes: "36x restantes" },
    { description: "Cartão de Crédito Nubank", creditor: "Nubank", totalAmount: "2800.00", remainingAmount: "2800.00", dueDate: "2026-04-10", status: "active", monthlyInstallment: null, notes: "Fatura vence dia 10" },
  ]);

  // ─── INCOMES ────────────────────────────────────────────────────────────────
  await db.insert(incomesTable).values([
    { description: "Salário CLT", source: "Empresa ABC Ltda", amount: "12000.00", recurrence: "monthly", isActive: true, notes: "Líquido após impostos" },
    { description: "Freelance Desenvolvimento", source: "Clientes variados", amount: "2500.00", recurrence: "variable", isActive: true, notes: "Média mensal estimada" },
    { description: "Rendimento Renda Fixa", source: "XP Investimentos", amount: "420.00", recurrence: "monthly", isActive: true, notes: "Rendimento médio mensal" },
  ]);

  // ─── BUDGET GROUPS ──────────────────────────────────────────────────────────
  const [bgFixed, bgVariable, bgLeisure, bgInvestLP, bgInvestCP, bgOther] = await db.insert(budgetGroupsTable).values([
    { name: "Despesas Fixas", type: "fixed", targetPercentage: "40", color: "#ef4444", sortOrder: 1 },
    { name: "Despesas Variáveis", type: "variable", targetPercentage: "25", color: "#f97316", sortOrder: 2 },
    { name: "Lazer e Outros", type: "leisure", targetPercentage: "10", color: "#a855f7", sortOrder: 3 },
    { name: "Investimento LP", type: "investment_lp", targetPercentage: "15", color: "#22c55e", sortOrder: 4 },
    { name: "Investimento CP", type: "investment_cp", targetPercentage: "5", color: "#06b6d4", sortOrder: 5 },
    { name: "Outros", type: "other", targetPercentage: "5", color: "#64748b", sortOrder: 6 },
  ]).returning();

  // ─── BUDGET ITEMS (March 2026) ───────────────────────────────────────────────
  await db.insert(budgetItemsTable).values([
    // Fixed
    { groupId: bgFixed.id, categoryId: catAluguel.id, description: "Aluguel", month: 3, year: 2026, plannedAmount: "2800.00", realizedAmount: "2800.00" },
    { groupId: bgFixed.id, categoryId: catCondominio.id, description: "Condomínio", month: 3, year: 2026, plannedAmount: "650.00", realizedAmount: "650.00" },
    { groupId: bgFixed.id, categoryId: catAcademia.id, description: "Academia", month: 3, year: 2026, plannedAmount: "110.00", realizedAmount: "109.90" },
    { groupId: bgFixed.id, categoryId: catLuz.id, description: "Luz", month: 3, year: 2026, plannedAmount: "200.00", realizedAmount: "187.40" },
    { groupId: bgFixed.id, categoryId: catInternet.id, description: "Internet / Telefone", month: 3, year: 2026, plannedAmount: "150.00", realizedAmount: "149.90" },
    { groupId: bgFixed.id, categoryId: catStreaming.id, description: "Streaming", month: 3, year: 2026, plannedAmount: "70.00", realizedAmount: "61.80" },

    // Variable
    { groupId: bgVariable.id, categoryId: catMercado.id, description: "Mercado", month: 3, year: 2026, plannedAmount: "700.00", realizedAmount: "717.50" },
    { groupId: bgVariable.id, categoryId: catIfood.id, description: "iFood / Delivery", month: 3, year: 2026, plannedAmount: "100.00", realizedAmount: "111.40" },
    { groupId: bgVariable.id, categoryId: catRestaurante.id, description: "Restaurante", month: 3, year: 2026, plannedAmount: "200.00", realizedAmount: "185.00" },
    { groupId: bgVariable.id, categoryId: catTransporte.id, description: "Transporte", month: 3, year: 2026, plannedAmount: "150.00", realizedAmount: "173.60" },
    { groupId: bgVariable.id, categoryId: catSaude.id, description: "Saúde", month: 3, year: 2026, plannedAmount: "300.00", realizedAmount: "350.00" },
    { groupId: bgVariable.id, categoryId: catPet.id, description: "Pet", month: 3, year: 2026, plannedAmount: "150.00", realizedAmount: "140.00" },
    { groupId: bgVariable.id, categoryId: catCarro.id, description: "Carro", month: 3, year: 2026, plannedAmount: "250.00", realizedAmount: "210.00" },

    // Leisure
    { groupId: bgLeisure.id, categoryId: catLazer.id, description: "Lazer", month: 3, year: 2026, plannedAmount: "300.00", realizedAmount: "209.00" },
    { groupId: bgLeisure.id, categoryId: catViagem.id, description: "Viagens", month: 3, year: 2026, plannedAmount: "200.00", realizedAmount: "0.00" },

    // Investment LP
    { groupId: bgInvestLP.id, categoryId: catInvestimento.id, description: "Renda Fixa", month: 3, year: 2026, plannedAmount: "2000.00", realizedAmount: "0.00" },

    // Others
    { groupId: bgOther.id, categoryId: null, description: "Imprevistos", month: 3, year: 2026, plannedAmount: "500.00", realizedAmount: "0.00" },
  ]);

  // ─── MONTHLY PLANS (2026) ────────────────────────────────────────────────────
  const months = [1, 2, 3];
  for (const month of months) {
    await db.insert(monthlyPlansTable).values([
      { month, year: 2026, categoryId: catSalario.id, plannedIncome: "12000.00", plannedExpense: "0.00", notes: null },
      { month, year: 2026, categoryId: catAluguel.id, plannedIncome: "0.00", plannedExpense: "2800.00", notes: null },
      { month, year: 2026, categoryId: catCondominio.id, plannedIncome: "0.00", plannedExpense: "650.00", notes: null },
      { month, year: 2026, categoryId: catMercado.id, plannedIncome: "0.00", plannedExpense: "700.00", notes: null },
      { month, year: 2026, categoryId: catInvestimento.id, plannedIncome: "0.00", plannedExpense: "2000.00", notes: null },
    ]);
  }

  console.log("✅ Seed completed!");
  process.exit(0);
}

seed().catch(err => {
  console.error("Seed failed:", err);
  process.exit(1);
});
