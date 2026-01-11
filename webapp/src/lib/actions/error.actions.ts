'use server'
import {fetchClient} from "@/lib/FetchClient";

export async function triggerError(code: number) {
    return await fetchClient(`/test/errors?code=${code}`, 'GET')
}