import { z } from 'zod';
export const planIds = ['spark','flow','scale'] as const;
export const sectors=['services','retail','hospitality','technology','creative','health','finance','other'] as const;
export const goals=['awareness','leads','sales','retention'] as const;
export const channels=['Instagram','Facebook','LinkedIn','TikTok','YouTube','Email'] as const;
export const tones=['professional','friendly','bold','playful'] as const;
export const risks=['focused','balanced','experimental'] as const;
export const budgets=['under500','500to1500','1500to5000','5000plus','unsure'] as const;
export const languages=['nl','en','fr','de'] as const;
export const customers=['b2b','b2c','both'] as const;
export const briefSchema=z.object({
 name:z.string().trim().min(1).max(120),website:z.string().trim().max(300).refine(v=>!v||/^https?:\/\//i.test(v)&&(()=>{try{return !!new URL(v).hostname}catch{return false}})()),sector:z.enum(sectors),offer:z.string().trim().min(1).max(1600),
 customer:z.enum(customers),audience:z.string().trim().min(1).max(1600),markets:z.string().trim().min(1).max(300),languages:z.array(z.enum(languages)).min(1),
 goal:z.enum(goals),channels:z.array(z.enum(channels)).min(1),budget:z.enum(budgets),
 tone:z.enum(tones),risk:z.enum(risks),avoid:z.string().max(1600),competitors:z.string().max(800)
});
export type Brief = {name:string;website:string;sector:string;offer:string;customer:string;audience:string;markets:string;languages:string[];goal:string;channels:string[];budget:string;tone:string;risk:string;avoid:string;competitors:string};
export const initialBrief:Brief={name:'',website:'',sector:'',offer:'',customer:'',audience:'',markets:'',languages:[],goal:'',channels:[],budget:'',tone:'',risk:'',avoid:'',competitors:''};
export const stepKeys:(keyof Brief)[][]=[['name','website','sector','offer'],['customer','audience','markets','languages'],['goal','channels','budget'],['tone','risk','avoid','competitors']];
export function invalidFields(brief:Brief,step:number){const result=briefSchema.safeParse(brief);if(result.success)return [];return [...new Set(result.error.issues.map(i=>i.path[0] as keyof Brief))].filter(k=>step>=4||stepKeys[step].includes(k));}
export function prepareBrief(brief:Brief,plan:string){return {formatVersion:1,plan:planIds.includes(plan as typeof planIds[number])?plan:'flow',status:'onboarding-preview',company:briefSchema.parse(brief),subscriptionActive:false};}
