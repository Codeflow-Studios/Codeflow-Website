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
export type BrandProfilePayload={businessName:string;industry:string;targetAudience:string;location:string;productsAndServices:string;toneOfVoice:string;brandColors:string[];logoUrl:null;preferredPlatforms:string[];goals:string[];callToAction:string;prohibitedTopics:string[]};
export const initialBrief:Brief={name:'',website:'',sector:'',offer:'',customer:'',audience:'',markets:'',languages:[],goal:'',channels:[],budget:'',tone:'',risk:'',avoid:'',competitors:''};
export const stepKeys:(keyof Brief)[][]=[['name','website','sector','offer'],['customer','audience','markets','languages'],['goal','channels','budget'],['tone','risk','avoid','competitors']];
export function invalidFields(brief:Brief,step:number){const result=briefSchema.safeParse(brief);if(result.success)return [];return [...new Set(result.error.issues.map(i=>i.path[0] as keyof Brief))].filter(k=>step>=4||stepKeys[step].includes(k));}
export function prepareBrief(brief:Brief,plan:string){return {formatVersion:1,plan:planIds.includes(plan as typeof planIds[number])?plan:'flow',status:'onboarding-preview',company:briefSchema.parse(brief),subscriptionActive:false};}
export function prepareBrandProfile(brief:Brief):BrandProfilePayload{
 const company=briefSchema.parse(brief);
 const industries:Record<string,string>={services:'professional and local services',retail:'retail and e-commerce',hospitality:'food, hospitality and tourism',technology:'technology and software',creative:'creative industries and culture',health:'health and wellbeing',finance:'finance and legal services',other:'other'};
 const audiences:Record<string,string>={b2b:'businesses',b2c:'consumers',both:'businesses and consumers'};
 const tones:Record<string,string>={professional:'clear and professional',friendly:'warm and approachable',bold:'bold and direct',playful:'playful and surprising'};
 const callsToAction:Record<string,string>={awareness:`Follow ${company.name} for more`,leads:`Contact ${company.name} for a consultation`,sales:`Discover what ${company.name} offers`,retention:`Stay connected with ${company.name}`};
 return {businessName:company.name,industry:industries[company.sector]||company.sector,targetAudience:`${audiences[company.customer]||company.customer}: ${company.audience}`,location:company.markets,productsAndServices:company.offer,toneOfVoice:tones[company.tone]||company.tone,brandColors:[],logoUrl:null,preferredPlatforms:company.channels,goals:[company.goal],callToAction:callsToAction[company.goal]||`Contact ${company.name}`,prohibitedTopics:company.avoid.split(/[\n,;]+/).map(value=>value.trim()).filter(Boolean)};
}
