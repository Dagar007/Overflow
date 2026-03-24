import {FetchResponse, Profile, TopUser, TopUserWithProfile} from "@/lib/types";
import {fetchClient} from "@/lib/FetchClient";

export async function getTopUsers(): Promise<FetchResponse<TopUserWithProfile[]>> {
    const { data: users, error } = await fetchClient<TopUser[]>('/stats/top-users', 'GET', {
        cache: 'force-cache',
        next: { revalidate: 3600 },
    });
    if (error) return {
        data: null, error: {message: 'Problem getting users', status: 500} };

    const ids = [...new Set(users?.map(u => u.userId))];
    const qs = encodeURIComponent(ids.join(','));

    const { data: profiles, error: profilesError } = await fetchClient<Profile[]>(
        `/profiles/batch?ids=${qs}`,
        'GET',
        { cache: 'force-cache', next: { revalidate: 3600 } }
    );

    if (profilesError) return {data: null, error: {message: 'Problem getting profiles', status: 500} };

    const byId = new Map((profiles ?? []).map(p => [p.userId, p]));
    return {
        data: users?.map(u => ({ ...u, profile: byId.get(u.userId)})) as TopUserWithProfile[],
    };
}