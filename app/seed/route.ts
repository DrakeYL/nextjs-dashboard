import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";
import { invoices, customers, revenue, users } from "../lib/placeholder-data";

const prisma = new PrismaClient();

async function seedUsers() {
  const insertedUsers = await Promise.all(
    users.map(async (user) => {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      return prisma.users.upsert({
        where: { id: user.id },
        update: {},
        create: {
          id: user.id,
          name: user.name,
          email: user.email,
          password: hashedPassword,
        },
      });
    })
  );
  return insertedUsers;
}

async function seedCustomers() {
  const insertedCustomers = Promise.all(
    customers.map((customer) =>
      prisma.customers.upsert({
        where: { id: customer.id },
        update: {},
        create: {
          id: customer.id,
          name: customer.name,
          email: customer.email,
          image_url: customer.image_url,
        },
      })
    )
  );
  return insertedCustomers;
}

async function seedInvoices() {
  const insertedInvoices = await Promise.all(
    invoices.map((invoice) =>
      prisma.invoices.upsert({
        where: { id: invoice.customer_id },
        update: {},
        create: {
          customer_id: invoice.customer_id,
          amount: invoice.amount,
          status: invoice.status,
          date: new Date(invoice.date),
        },
      })
    )
  );
  return insertedInvoices;
}

async function seedRevenue() {
  const insertedRevenue = await Promise.all(
    revenue.map((rev) =>
      prisma.revenue.upsert({
        where: { month: rev.month },
        update: {},
        create: {
          month: rev.month,
          revenue: rev.revenue,
        },
      })
    )
  );
  return insertedRevenue;
}

export async function GET() {
  try {
    await prisma.$transaction(async () => {
      seedUsers();
      seedCustomers();
      seedInvoices();
      seedRevenue();
    });

    return Response.json({ message: "Database seeded successfully" });
  } catch (error) {
    console.error("Seed error:", error);
    return Response.json({ error }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
