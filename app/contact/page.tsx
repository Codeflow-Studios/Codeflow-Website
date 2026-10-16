import type { Metadata } from 'next';
import Contact from '@/components/codeflow/contact';

export const metadata: Metadata = { title: 'Contact — Codeflow Studios', description: 'Vertel ons over je project. Vraag vrijblijvend advies over marketing, design en software.' };
export default function Page() { return <Contact/>; }
