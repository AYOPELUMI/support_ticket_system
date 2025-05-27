'use server'
import * as Sentry from "@sentry/nextjs"
import { prisma } from "@/db/prisma"
import { revalidatePath } from "next/cache";
import { logEvent } from "@/utils/sentry";

export async function createTicket(previousState: { success: Boolean, message: String }, formData: FormData): Promise<{ success: Boolean, message: String }> {
    try {

        const subject = formData.get("subject") as string;
        const description = formData.get("description") as string;
        const priority = formData.get("priority") as string;

        console.log({ subject }, { description }, { priority });



        if (!subject || !description || !priority) {
            logEvent('Validation Error: Missing Ticket fields', 'ticket', { subject, description, priority }, "warning");
            return { success: false, message: "All fields are required" };

        }

        const ticket = await prisma.ticket.create({ data: { subject, description, priority } })

        logEvent(
            `Ticket created successfully: ${ticket.id}`,
            'ticket',
            { subject, description, priority },
            "info"
        )

        revalidatePath('/tickets')
        return { success: true, message: "Ticket created successfully" }
    } catch (error) {
        logEvent("An error occured while creating the ticket", 'ticket', {
            formData: Object.fromEntries(formData.entries())
        }
            ,
            'error', error)
        return { success: false, message: "An error occured while creating error" };

    }

}

export async function getTickets() {
    try {

        const tickets = await prisma.ticket.findMany({
            orderBy
                : { createdAt: 'desc' }
        });
        logEvent(
            'Fetched ticket list', 'ticket', { count: tickets.length }, 'info')
        return tickets
    } catch (error) {
        logEvent(
            'Error fetching tickets', 'ticket', {}, 'error')
        return [];
    }

}


export async function getTicketById(id: string) {

    try {
        const ticket = await prisma.ticket.findUnique({
            where: { id: Number(id) }

        });

        if (!ticket) {
            logEvent("Ticket not found", 'ticket', {
                ticketId: id
            }, 'warning')
        }
        return ticket;
    } catch (error) {
        logEvent('An error ocred while fetching ticket', 'ticket', { ticketId: id }, 'error', error)
        return null;
    }

}