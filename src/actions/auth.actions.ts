'use server';

import { prisma } from '@/db/prisma';
import bcrypt from 'bcryptjs';
import { logEvent } from '@/utils/sentry';
import { signAuthToken, setAuthCookie, removeAuthCookie } from '@/lib/auth';

export type ResponseResult = {
    success: boolean;
    message: string;
};
export async function registerUser(prevState: ResponseResult, formData: FormData): Promise<ResponseResult> {
    try {
        const name = formData.get('name') as string;
        const email = formData.get("email") as string;
        const password = formData.get("password") as string;
        if (!name || !email || !password) {
            logEvent("Validation Error failed: Missing register field", 'auth', { name, email }, 'warning');
            return { success: false, message: "All fields are required" }
        }
        const existingUser = await prisma.user.findUnique({
            where: {
                email
            }
        })
        if (existingUser) {
            logEvent(`Registration failed: User already exists - ${email}`, 'auth', { name, email }, 'warning');
            return { success: false, message: "User already exsts" }

        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: {
                name, email, password: hashedPassword
            }
        });
        const token = await signAuthToken({ userId: user.id })
        await setAuthCookie(token)
        logEvent(`User registration successfull: ${email}`, 'auth', { name, email }, 'info');

        return { success: true, message: "Registration successfully" }

    } catch (error) {
        logEvent("An error occured while registering", 'auth',
            { formData: Object.fromEntries(formData.entries()) }
            ,
            'error', error)
        return { success: false, message: "An error occured while registering" };
    }
}


export async function logoutUser(): Promise<ResponseResult> {
    try {
        await removeAuthCookie();
        logEvent("User logged out successful", "auth", {}, "info")
        return { success: true, message: "User logged put successful" }
    } catch (error) {
        logEvent("unexpected error during logout", 'auth', { error }
            ,
            'error', error)
        return { success: false, message: "Log out failed, Try again later" };
    }
}

export async function loginUser(previousState: ResponseResult, formData: FormData): Promise<ResponseResult> {


    try {
        const email = formData.get("email") as string;
        const password = formData.get("password") as string;
        if (!email || !password) {
            logEvent("Validation Error failed: Missing login field", 'auth', { name, email }, 'warning');
            return { success: false, message: "All fields are required" }
        }
        const user = await prisma.user.findUnique({
            where: {
                email
            }
        })
        if (!user || !user.password) {
            logEvent("Login failed: User not found", 'auth', { email }, 'warning');
            return { success: false, message: "Invalid email or password" }
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            logEvent("Incorrect password", 'auth', { email }, 'warning');
            return { success: false, message: "Invalid email or password" }
        }

        const token = await signAuthToken({ userId: user.id })
        await setAuthCookie(token)
        return { success: true, message: "login successful" }

    } catch (error) {
        logEvent("Unexpected error during login", 'auth', {}, 'error', error);
        return { success: false, message: "login failed" }

    }
}