'use server'
import {fetchClient} from "@/lib/FetchClient";

export async function triggerError(code: number) {
    return await fetchClient(`/questions/errors?code=${code}`, 'GET')
}