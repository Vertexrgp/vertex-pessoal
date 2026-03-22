import { db } from "@workspace/db";
import { creditCardsTable } from "@workspace/db/schema";

async function seedCards() {
  console.log("Seeding credit cards...");
  await db.delete(creditCardsTable);
  
  const cards = [
    {
      nomeCartao: "Nubank Roxinho",
      banco: "Nubank",
      bandeira: "Mastercard",
      limiteTotal: "8000.00",
      diaFechamento: 5,
      diaVencimento: 12,
      cor: "#7C3AED",
      ativo: true,
    },
    {
      nomeCartao: "Inter Black",
      banco: "Banco Inter",
      bandeira: "Mastercard",
      limiteTotal: "12000.00",
      diaFechamento: 15,
      diaVencimento: 22,
      cor: "#F97316",
      ativo: true,
    },
    {
      nomeCartao: "Itaú Platinum",
      banco: "Itaú",
      bandeira: "Visa",
      limiteTotal: "15000.00",
      diaFechamento: 25,
      diaVencimento: 5,
      cor: "#0EA5E9",
      ativo: true,
    },
  ];
  
  const inserted = await db.insert(creditCardsTable).values(cards).returning();
  console.log(`Created ${inserted.length} credit cards`);
  return inserted;
}

seedCards().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
