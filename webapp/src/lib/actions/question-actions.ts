'use server';

import {Answer, FetchResponse, PaginatedResult, Profile, Question, QuestionParams, Vote, VoteRecord} from "@/lib/types";
import {fetchClient} from "@/lib/FetchClient";
import {QuestionSchema} from "@/lib/schemas/questionSchema";
import {AnswerSchema} from "@/lib/schemas/answerSchema";
import {revalidatePath} from "next/dist/server/web/spec-extension/revalidate";
import {q} from "framer-motion/m";
import {auth} from "@/auth";
import {error} from "next/dist/build/output/log";

export async function getQuestions(qParams?: QuestionParams): Promise<FetchResponse<PaginatedResult<Question>>> {
    const params = new URLSearchParams();
    if (qParams?.tag) params.set('tag', qParams.tag)
    if (qParams?.page) params.set('page', qParams.page.toString())
    if (qParams?.pageSize) params.set('pageSize', qParams.pageSize.toString())
    if (qParams?.sort) params.set('sort', qParams.sort)
    const questionUrl = `/questions${params ? `?${params}` : ''}`;
    
    const {data: questions, error: questionError} = await  fetchClient<PaginatedResult<Question>>(questionUrl, 'GET')
    
    if (!questions || questionError) {
        return {
            data: null,
            error: {message: 'Problem fetching questions.', status: 500},
        }
    }
    
    const userIds = Array.from(new Set(questions.items.map(x => x.askerId)));
    if (userIds.length === 0) return {data: {items: [], page: 0, pageSize: 0, totalCount: 0}}
    
    const ids = Array.from(userIds).sort();
    const profilesUrl = '/profiles/batch?' + new URLSearchParams({ids: ids.join(',')});
    const {data: profiles, error: profileError} = await fetchClient<Profile[]>(profilesUrl, 'GET', 
        {cache: 'force-cache', next: {revalidate: 300}});
    
    if (profileError) return {data: null, error: {message: 'Problem fetching profiles.', status: 500}}
    
    const profileMap = new Map(profiles?.map(p => [p.userId, p]))
    
    const enriched = questions.items.map(q => ({
        ...q,
        author: profileMap.get(q.askerId),
    }))
    
    return {data: {
            items: enriched,
            page: questions.page,
            pageSize: questions.pageSize,
            totalCount: questions.totalCount,
        }}
}

export async function getQuestionById(id: string): Promise<FetchResponse<Question>> {
    const {data: question, error: questionError} = await fetchClient<Question>(`/questions/${id}`, 'GET')
    
    if (!question || questionError) {
        return {data: null, error: {message: 'Problem fetching question.', status: 500}}
    }
    
    const userIds = new Set<string>();
    if (question.askerId) userIds.add(question.askerId);
    
    for (const a of question.answers ?? []) userIds.add(a.userId);
    
    if (userIds.size === 0) return {data: null, error: {message: 'Problem fetching userIds.', status: 500}}
    
    const ids = Array.from(userIds).sort();
    
    const profilesUrl = '/profiles/batch?' + new URLSearchParams({ids: ids.join(',')});
    
    const {data: profiles, error: profileError} = await fetchClient<Profile[]>(profilesUrl, 'GET',
        {cache: 'force-cache', next: {revalidate: 300}});
    
    if (profileError) return {data: null, error: {message: 'Problem fetching profiles.', status: 500}}

    const profileMap = new Map(profiles?.map(p => [p.userId, p]))


    const session = await auth();
    let voteMap = new Map<string, number>()
    if(session) {
        const voteUrl = `/votes/${id}`
        const {data: votes, error: votesEror} = await fetchClient<VoteRecord[]>(voteUrl, 'GET')
        if (votesEror) return { data: null, error: {message: 'Problem fetching votes.', status: 500}}
        voteMap = new Map((votes?? []).map(v => [v.targetId, v.voteValue]));
    }

    const getUserVote = (targetId: string) => voteMap.get(targetId) ?? 0;
    
    const enriched: Question = {
        ...question,
        userVoted: getUserVote(question.id),
        author: profileMap.get(question.askerId),
        answers: (question.answers ?? []).map(a => ({
            ...a, 
            author: profileMap.get(a.userId),
            userVoted: getUserVote(a.id),
        }))
    }
    
    return {data: enriched}
    
}

export async function searchQuestions(query: string) {
    return fetchClient<Question[]>(`/search?query=${query}`, 'GET')
}

export async function postQuestion(question: QuestionSchema) {
    return fetchClient<Question>('/questions', 'POST', {body: question})
}

export async function updateQuestion(question: QuestionSchema, id: string) {
    return fetchClient(`/questions/${id}`, 'PUT', {body: question}) 
}

export async function deleteQuestion(id: string) {
    return fetchClient(`/questions/${id}`, 'DELETE')
}

export async function postAnswer(data: AnswerSchema, questionId: string) {
    const result =  await fetchClient<Answer>(`/questions/${questionId}/answers`, 'POST', {body: data})
    revalidatePath(`/questions/${questionId}`)
    return result
}

export async function updateAnswer(id: string, questionId: string, data: AnswerSchema) {
    const result = await fetchClient(`/questions/${questionId}/answers/${id}`, 'PUT', {body: data})
    revalidatePath(`/questions/${questionId}`)
    return result
}

export async function deleteAnswer(id: string, questionId: string) {
    const result = await fetchClient(`/questions/${questionId}/answers/${id}`, 'DELETE')
    revalidatePath(`/questions/${questionId}`)
    return result
}

export async function acceptAnswer(answerId: string, questionId: string) {
    const result = await fetchClient(`/questions/${questionId}/answers/${answerId}/accept`, 'POST');
    revalidatePath(`/questions/${questionId}`)
    return result
}

export async function addVotes(vote: Vote) {
    const result = await fetchClient('/votes', 'POST', {body: vote});
    revalidatePath(`/questions/${vote.questionId}`)
    return result;
}