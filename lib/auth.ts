import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

export async function checkAndDeductCredits(req: any, amount: number = 1) {
    if (!supabaseUrl || !supabaseKey) return null; // Skip if Supabase not configured

    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader) throw new Error('UNAUTHORIZED');
    const token = authHeader.split(' ')[1];
    if (!token) throw new Error('UNAUTHORIZED');

    const scopedSupabase = createClient(supabaseUrl, supabaseKey, {
        global: { headers: { Authorization: `Bearer ${token}` } }
    });

    const { data: { user }, error: authError } = await scopedSupabase.auth.getUser();
    if (authError || !user) throw new Error('UNAUTHORIZED');

    // Use admin client for database operations to bypass RLS for credit deduction
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseKey;
    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false }
    });

    const { data: userData, error: fetchError } = await adminSupabase
        .from('users')
        .select('credits, role')
        .eq('id', user.id)
        .single();

    if (fetchError || !userData) throw new Error('USER_NOT_FOUND');

    if (userData.role !== 'ADMIN' && userData.credits < amount) {
        throw new Error('INSUFFICIENT_CREDITS');
    }

    if (userData.role !== 'ADMIN') {
        const { error: updateError } = await adminSupabase
            .from('users')
            .update({ credits: userData.credits - amount })
            .eq('id', user.id);
            
        if (updateError) {
             console.error('Failed to deduct credits:', updateError);
             throw new Error('FAILED_TO_DEDUCT_CREDITS');
        }
    }

    return user;
}
