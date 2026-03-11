'use server'

import {fetchClient} from "@/lib/FetchClient";
import {auth} from "@/auth";


export async function testAuth() {
    return fetchClient<string>(`/test/auth`, 'GET');
}

export async function getCurrentUser() {
    const session = await auth();
    return session?.user ?? null;
}