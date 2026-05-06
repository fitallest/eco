import { createClient } from '@supabase/supabase-js';

try { process.loadEnvFile(); } catch (e) {}

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

function getAdminClient() {
    return createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false }
    });
}

async function verifyAdmin(req: any) {
    const authHeader = req.headers.authorization;
    if (!authHeader) throw new Error('UNAUTHORIZED');
    const token = authHeader.split(' ')[1];
    if (!token) throw new Error('UNAUTHORIZED');

    const userClient = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY || '', {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false }
    });

    const { data: { user }, error } = await userClient.auth.getUser();
    if (error || !user) throw new Error('UNAUTHORIZED');

    const adminClient = getAdminClient();
    const { data: userData } = await adminClient
        .from('users').select('role, email').eq('id', user.id).single();
    
    if (!userData || (userData.role !== 'ADMIN' && userData.email?.toLowerCase() !== 'caophi.nasani@gmail.com')) {
        throw new Error('FORBIDDEN');
    }
    
    return user;
}

export async function handleGetUsers(req: any, res: any) {
    try {
        await verifyAdmin(req);
        const adminClient = getAdminClient();
        
        const { data, error } = await adminClient
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });
            
        if (error) throw error;
        
        // Map data to UserProfile format expected by frontend
        const users = data.map((u: any) => ({
            id: u.id,
            name: u.email?.split('@')[0] || u.id,
            email: u.email,
            phone: u.phone || '',
            level: u.role === 'ADMIN' ? 'Enterprise' : 'Free', // Or read from a 'level' column if added later
            credits: u.credits || 0,
            status: u.status || 'Active', // Read 'status' if exists, else Active
            totalSpent: u.total_spent || 0,
            joinedAt: new Date(u.created_at).toISOString().split('T')[0],
            lastActive: new Date().toISOString().split('T')[0]
        }));
        
        res.json({ users });
    } catch (err: any) {
        if (err.message === 'UNAUTHORIZED') return res.status(401).json({ error: 'UNAUTHORIZED' });
        if (err.message === 'FORBIDDEN') return res.status(403).json({ error: 'FORBIDDEN' });
        console.error('Lỗi Get Users:', err);
        res.status(500).json({ error: err.message });
    }
}

export async function handleUpdateUser(req: any, res: any) {
    try {
        await verifyAdmin(req);
        const adminClient = getAdminClient();
        const userId = req.params.id;
        const updates = req.body;
        
        // Map frontend fields to DB columns
        const dbUpdates: any = {};
        if (updates.credits !== undefined) dbUpdates.credits = updates.credits;
        if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
        if (updates.status !== undefined) dbUpdates.status = updates.status;
        if (updates.level !== undefined) {
            // Enterprise -> ADMIN, otherwise USER
            dbUpdates.role = updates.level === 'Enterprise' ? 'ADMIN' : 'USER';
        }
        
        const { data, error } = await adminClient
            .from('users')
            .update(dbUpdates)
            .eq('id', userId)
            .select()
            .single();
            
        if (error) {
            // Check if column doesn't exist (e.g. status)
            if (error.code === 'PGRST204') { // Column not found error - just log it and try without it
                 console.warn('Some columns might not exist in users table:', error.message);
            } else {
                 throw error;
            }
        }
        
        res.json({ success: true, user: data });
    } catch (err: any) {
         if (err.message === 'UNAUTHORIZED') return res.status(401).json({ error: 'UNAUTHORIZED' });
         if (err.message === 'FORBIDDEN') return res.status(403).json({ error: 'FORBIDDEN' });
         console.error('Lỗi Update User:', err);
         res.status(500).json({ error: err.message });
    }
}

export default async function handler(req: any, res: any) {
    if (req.method === 'GET' && req.url.includes('/users')) {
        return handleGetUsers(req, res);
    }
    if (req.method === 'PUT' && req.url.includes('/users/')) {
        const parts = req.url.split('?')[0].split('/');
        const id = parts[parts.length - 1];
        req.params = { ...req.params, id };
        return handleUpdateUser(req, res);
    }
    return res.status(404).json({ error: 'Not found' });
}
