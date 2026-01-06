'use server';

import {Question} from "@/lib/types";

export async function getQuestions(tags?: string): Promise<Question[]> {
    let url = 'http://localhost:8001/questions';
    if (tags) {
        url += '?tag=' + tags;
    }
    
    const response = await fetch(url)
    
    if(!response.ok) {
        throw new Error('Could not get questions from the server.')
    }
    
    return response.json();
}

export async function getQuestionById(id: string): Promise<Question> {
    const url = `http://localhost:8001/questions/${id}`;
    const response = await fetch(url)

    if(!response.ok) {
        throw new Error('Could not get question from the server.')
    }

    return response.json();
}