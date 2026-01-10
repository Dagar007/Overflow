'use server';

import {Question} from "@/lib/types";
import {fetchClient} from "@/lib/FetchClient";

export async function getQuestions(tags?: string) {
    let url = '/questions';
    if (tags) {
        url += '?tag=' + tags;
    }
    return fetchClient<Question[]>(url, 'GET')
}

export async function getQuestionById(id: string) {
    return fetchClient<Question>(`/questions/${id}`, 'GET')
}

export async function searchQuestions(query: string) {
    return fetchClient<Question[]>(`/search?query=${query}`, 'GET')
}