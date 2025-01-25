
import { formatCurrency } from "./utils";
import {
  CustomerField,
  CustomersTableType,
  InvoiceForm,
  InvoicesTable,
  LatestInvoiceRaw,
  Revenue,
} from "./definitions";
import { prisma } from "./db";

export async function fetchRevenue() {
  try {
    const data = await prisma.revenue.findMany();
    return data;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch revenue data.");
  }
}

export async function fetchLatestInvoices() {
  try {
    const data = await prisma.invoices.findMany({
      select: {
        amount: true,
        id: true,
        date: true,
        status: true,
        customer: {
          select: {
            name: true,
            image_url: true,
            email: true,
          },
        },
      },
      orderBy: {
        date: "desc",
      },
      take: 5,
    });

    const latestInvoices = data.map((invoice) => ({
      ...invoice,
      amount: formatCurrency(invoice.amount),
    }));
    return latestInvoices;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch the latest invoices.");
  }
}

export async function fetchCardData() {
  try {
    const [invoiceCount, customerCount, invoiceStatus] = await Promise.all([
      prisma.invoices.count(),
      prisma.customers.count(),
      prisma.invoices.groupBy({
        by: ["status"],
        _sum: {
          amount: true,
        },
      }),
    ]);

    const totalPaid =
      invoiceStatus.find((status) => status.status === "paid")?._sum.amount ??
      0;
    const totalPending =
      invoiceStatus.find((status) => status.status === "pending")?._sum
        .amount ?? 0;

    return {
      numberOfCustomers: customerCount,
      numberOfInvoices: invoiceCount,
      totalPaidInvoices: formatCurrency(totalPaid),
      totalPendingInvoices: formatCurrency(totalPending),
    };
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch card data.");
  }
}

const ITEMS_PER_PAGE = 6;
export async function fetchFilteredInvoices(
  query: string,
  currentPage: number
) {
  try {
    const invoices = await prisma.invoices.findMany({
      select: {
        id: true,
        amount: true,
        date: true,
        status: true,
        customer: {
          select: {
            name: true,
            email: true,
            image_url: true,
          },
        },
      },
      where: {
        OR: [
          { status: { contains: query, mode: "insensitive" } },
          {
            customer: {
              image_url: { contains: query, mode: "insensitive" },
            },
          },
        ],
      },
      orderBy: {
        date: "desc",
      },
      take: ITEMS_PER_PAGE,
      skip: (currentPage - 1) * ITEMS_PER_PAGE,
    });

    return invoices;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch invoices.");
  }
}

export async function fetchInvoicesPages(query: string) {
  try {
    const count = await prisma.invoices.count({
      where: {
        OR: [{ status: { contains: query, mode: "insensitive" } }],
      },
    });

    return Math.ceil(count / ITEMS_PER_PAGE);
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch total number of invoices.");
  }
}

export async function fetchInvoiceById(id: string) {
  try {
    const invoice = await prisma.invoices.findUnique({
      where: { id },
      select: {
        id: true,
        customer_id: true,
        amount: true,
        status: true,
      },
    });

    if (!invoice) {
      throw new Error("Invoice not found");
    }

    return {
      ...invoice,
      amount: invoice.amount / 100,
    };
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch invoice.");
  }
}

export async function fetchCustomers() {
  try {
    const customers = await prisma.customers.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return customers;
  } catch (err) {
    console.error("Database Error:", err);
    throw new Error("Failed to fetch all customers.");
  }
}

export async function fetchFilteredCustomers(query: string) {
  try {
    const customers = await prisma.customers.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        image_url: true,
        invoices: true,
      },
      where: {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } },
        ],
      },
      orderBy: {
        name: "asc",
      },
    });

    return customers.map((customer) => ({
      ...customer,
      total_invoices: customer.invoices.length,
      total_pending: formatCurrency(
        customer.invoices
          .filter((inv) => inv.status === "pending")
          .reduce((acc, inv) => acc + inv.amount, 0)
      ),
      total_paid: formatCurrency(
        customer.invoices
          .filter((inv) => inv.status === "paid")
          .reduce((acc, inv) => acc + inv.amount, 0)
      ),
    }));
  } catch (err) {
    console.error("Database Error:", err);
    throw new Error("Failed to fetch customer table.");
  }
}
