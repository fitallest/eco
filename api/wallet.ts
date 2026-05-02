import { createClient } from '@supabase/supabase-js';

try { process.loadEnvFile(); } catch (e) {}

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
// Service role key bypasses RLS – needed for credit updates by backend
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;

function getAdminClient() {
    return createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false }
    });
}

async function verifyUser(authHeader: string | undefined) {
    if (!authHeader) throw new Error('UNAUTHORIZED');
    const token = authHeader.split(' ')[1];
    if (!token) throw new Error('UNAUTHORIZED');
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false }
    });
    const { data: { user }, error } = await userClient.auth.getUser();
    if (error || !user) throw new Error('UNAUTHORIZED');
    return user;
}

/**
 * POST /api/wallet/topup
 * Add credits to the calling user's wallet (used after payment confirmation)
 * Body: { amount: number }  — positive to add, negative to remove
 */
export async function handleTopup(req: any, res: any) {
    try {
        const user = await verifyUser(req.headers.authorization);
        const { amount } = req.body;
        if (typeof amount !== 'number' || amount === 0) {
            return res.status(400).json({ error: 'amount phải là số khác 0' });
        }

        const adminClient = getAdminClient();
        const { data: userData, error: fetchErr } = await adminClient
            .from('users').select('credits, role').eq('id', user.id).single();
        if (fetchErr || !userData) return res.status(404).json({ error: 'USER_NOT_FOUND' });

        const newCredits = Math.max(0, userData.credits + amount);
        const { error: updateErr } = await adminClient
            .from('users').update({ credits: newCredits }).eq('id', user.id);
        if (updateErr) return res.status(500).json({ error: updateErr.message });

        return res.json({ success: true, credits: newCredits, delta: amount });
    } catch (err: any) {
        if (err.message === 'UNAUTHORIZED') return res.status(401).json({ error: 'UNAUTHORIZED' });
        console.error('Wallet topup error:', err);
        return res.status(500).json({ error: err.message });
    }
}

/**
 * POST /api/wallet/admin-adjust
 * ADMIN ONLY: adjust credits for any user
 * Body: { targetUserId: string, amount: number, note?: string }
 */
export async function handleAdminAdjust(req: any, res: any) {
    try {
        const caller = await verifyUser(req.headers.authorization);
        const adminClient = getAdminClient();

        // Verify caller is ADMIN
        const { data: callerData } = await adminClient
            .from('users').select('role').eq('id', caller.id).single();
        if (!callerData || callerData.role !== 'ADMIN') {
            return res.status(403).json({ error: 'FORBIDDEN: Chỉ Admin mới có quyền này' });
        }

        const { targetUserId, amount, note } = req.body;
        if (!targetUserId || typeof amount !== 'number') {
            return res.status(400).json({ error: 'Thiếu targetUserId hoặc amount' });
        }

        const { data: targetData, error: fetchErr } = await adminClient
            .from('users').select('credits').eq('id', targetUserId).single();
        if (fetchErr || !targetData) return res.status(404).json({ error: 'TARGET_USER_NOT_FOUND' });

        const newCredits = Math.max(0, targetData.credits + amount);
        const { error: updateErr } = await adminClient
            .from('users').update({ credits: newCredits }).eq('id', targetUserId);
        if (updateErr) return res.status(500).json({ error: updateErr.message });

        console.log(`[ADMIN ADJUST] Admin ${caller.id} → User ${targetUserId}: ${amount > 0 ? '+' : ''}${amount} credits. Note: ${note || 'N/A'}`);
        return res.json({ success: true, targetUserId, credits: newCredits, delta: amount });
    } catch (err: any) {
        if (err.message === 'UNAUTHORIZED') return res.status(401).json({ error: 'UNAUTHORIZED' });
        console.error('Admin adjust error:', err);
        return res.status(500).json({ error: err.message });
    }
}

/**
 * GET /api/wallet/balance
 * Returns current credits from DB (source of truth)
 */
export async function handleGetBalance(req: any, res: any) {
    try {
        const user = await verifyUser(req.headers.authorization);
        const adminClient = getAdminClient();
        const { data: userData, error } = await adminClient
            .from('users').select('credits, role').eq('id', user.id).single();
        if (error || !userData) return res.status(404).json({ error: 'USER_NOT_FOUND' });
        return res.json({ credits: userData.credits, role: userData.role });
    } catch (err: any) {
        if (err.message === 'UNAUTHORIZED') return res.status(401).json({ error: 'UNAUTHORIZED' });
        return res.status(500).json({ error: err.message });
    }
}
