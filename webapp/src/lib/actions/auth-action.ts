'use server'

import {fetchClient} from "@/lib/FetchClient";
import {auth} from "@/auth";

export async function testAuth() {
    return fetchClient<string>(`/test/auth`, 'GET');
}

export async function getCurrentUser() {
    try{
        const session = await auth();
        if (!session) return null;
        return session?.user
    } catch(err: unknown){
        console.log(err);
        return null;
    }
}