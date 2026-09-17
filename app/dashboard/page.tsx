import type { Metadata } from 'next';
import Dashboard from '@/components/codeflow/dashboard';

export const metadata: Metadata = { title: 'Marketing dashboard — Codeflow Studios', description: 'Review trends and approve campaign drafts from Codeflow Marketing AI.' };

export default function Page() { return <Dashboard />; }
