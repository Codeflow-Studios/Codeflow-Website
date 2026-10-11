import FreeAudit from '@/components/codeflow/free-audit';

type PageProps={searchParams:Promise<{lang?:string|string[]}>};
export default async function Page({searchParams}:PageProps){
 const {lang:raw}=await searchParams; const lang=Array.isArray(raw)?raw[0]:raw;
 return <FreeAudit initialLang={lang==='en'?'en':'nl'}/>;
}
