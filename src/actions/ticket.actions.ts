'use server'
import * as Sentry from "@sentry/nextjs"
import { prisma } from "@/db/prisma"
import { revalidatePath } from "next/cache";
import { logEvent } from "@/utils/sentry";
import { getCurrentUser } from "@/lib/current-user";
import { ResponseResult } from "./auth.actions";

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
        const user = await getCurrentUser();
        if (!user) {
            logEvent(
                `Unauthorized ticket creation attempt`,
                'ticket',
                {},
                "warning"
            )
            return { success: false, message: "You must be logged in to create a ticket" };

        }

        const ticket = await prisma.ticket.create({
            data: {
                subject, description, priority, user: {
                    connect: { id: user.id }
                }
            }
        })

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
        return { success: false, message: "An error occured while creating ticket" };

    }

}

export async function getTickets() {
    try {
        const user = await getCurrentUser();
        if (!user) {
            logEvent(
                'Unauthorized access to ticket list', 'ticket', {}, 'info')
            return [];
        }

        const tickets = await prisma.ticket.findMany({
            where: {
                userId: user.id
            },
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

export async function closeTicket(previousState: ResponseResult, formData: FormData): Promise<ResponseResult> {
    try {
        const ticketId = formData.get("tickedId") as string;
        const user = await getCurrentUser();
        if (!user) {
            logEvent("Unauthorized access", 'ticket', {}, 'warning');
            return { success: false, message: "Unauthorized access" };
        }
        if (!ticketId) {
            logEvent("Ticket Id is missing", 'ticket', { ticketId }, 'warning');
            return { success: false, message: "Ticked Id is required" };
        }

        const ticket = await prisma.ticket.findUnique({
            where: {
                id: Number(ticketId),

            }
        })
        if (!ticket || ticket.userId !== user.id) {
            logEvent("Unauthorized ticket close attempt", 'ticket', { ticketId }, 'warning');
            return { success: false, message: "You are authorized to close this ticket" };
        }

        await prisma.ticket.update({
            where: {
                id: Number(ticketId)
            },
            data: {
                status: "Closed"
            }
        })
        revalidatePath("/tickets");
        revalidatePath(`/ticket/${ticketId}`);

        return { success: true, message: "Ticket closed successfully" }

    } catch (error) {
        logEvent("An error occured while closing this ticket", 'ticket', {}, 'error', error);
        return { success: false, message: "An error occured" };
    }
}