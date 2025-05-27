import { prisma } from "@/db/prisma"
import { verifyAuthTOKEN, getAuthCookie } from "./auth"


type AuthPayload = {
    userId: string
}

export async function getCurrentUser() {
    try {
        const token = await getAuthCookie();
        if (!token) return null;

        const payload = (await verifyAuthTOKEN(token)) as AuthPayload;
        if (!payload?.userId) return null;

        const user = await prisma.user.findUnique({
            where: { id: payload.userId },
            select: {
                id: true,
                email: true,
                name: true
            }
        });

        return user;
    } catch (error) {
        console.log('Error getting the current user');
        return null;
    }
}