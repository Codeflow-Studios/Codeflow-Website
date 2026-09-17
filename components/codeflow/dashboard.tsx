'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, Check, CircleAlert, Clock3, LoaderCircle, Sparkles, TrendingUp, Video } from 'lucide-react';
import { Header, useLanguage } from './shared';

type Trend = { trend: { id: string; title: string; summary: string; keywords: string[]; provider: string }; score: { total: number; explanation: string } };
type CampaignView = { campaign: { id: string; status: string; hook?: string; script?: string; caption?: string; videoUrl?: string }; publishingJobs: Array<{ id: string; platform: string; status: string }> };

const copy = {
  en: {
    eyebrow: 'CODEFLOW MARKETING AI',
    title: 'Your trend desk is ready.',
    intro: 'Choose a relevant signal and turn it into a campaign you can review before anything is published.',
    trends: 'Relevant trends',
    loading: 'Finding signals that fit your brand…',
    generate: 'Create campaign',
    generating: 'Creating your draft…',
    review: 'Your campaign draft',
    hook: 'Hook', script: 'Video script', caption: 'Caption', image: 'Generated image',
    approve: 'Approve for publishing', approving: 'Preparing publishing…',
    ready: 'Ready for publishing', creating: 'Generating media', reviewNeeded: 'Review needed', failed: 'Generation failed',
    readyText: 'Your approved content is queued. A social publishing connection can send it to the selected channel.',
    restart: 'Find fresh trends',
    missing: 'This dashboard link is incomplete. Return to onboarding to create a brand profile.',
    error: 'We could not load your marketing workspace. Please try again.',
    score: 'brand fit',
    selected: 'Selected',
    approval: 'Nothing is published without your approval.',
  },
  nl: {
    eyebrow: 'CODEFLOW MARKETING AI',
    title: 'Jouw trenddesk staat klaar.',
    intro: 'Kies een relevant signaal en maak er een campagne van die je eerst zelf bekijkt, voordat er iets wordt gepubliceerd.',
    trends: 'Relevante trends',
    loading: 'Signalen zoeken die bij jouw merk passen…',
    generate: 'Campagne maken',
    generating: 'Je concept wordt gemaakt…',
    review: 'Jouw campagneconcept',
    hook: 'Hook', script: 'Videoscript', caption: 'Caption', image: 'Gegenereerde afbeelding',
    approve: 'Goedkeuren voor publicatie', approving: 'Publicatie voorbereiden…',
    ready: 'Klaar voor publicatie', creating: 'Media wordt gemaakt', reviewNeeded: 'Controle nodig', failed: 'Generatie mislukt',
    readyText: 'Je goedgekeurde content staat klaar. Een social publishing-koppeling kan dit naar je gekozen kanaal sturen.',
    restart: 'Nieuwe trends zoeken',
    missing: 'Deze dashboardlink is niet volledig. Ga terug naar de onboarding om een merkprofiel aan te maken.',
    error: 'We konden je marketingwerkruimte niet laden. Probeer het opnieuw.',
    score: 'merkmatch',
    selected: 'Gekozen',
    approval: 'Er wordt niets gepubliceerd zonder jouw goedkeuring.',
  },
};

export default function Dashboard() {
  const { lang, setLang, en } = useLanguage();
  const t = copy[lang];
  const [brandId, setBrandId] = useState('');
  const [trends, setTrends] = useState<Trend[]>([]);
  const [selectedTrend, setSelectedTrend] = useState('');
  const [campaign, setCampaign] = useState<CampaignView | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');

  const loadTrends = useCallback(async (id: string) => {
    setLoading(true); setError(''); setCampaign(null);
    try {
      await fetch('/api/marketing/trends', { method: 'POST' });
      const response = await fetch(`/api/marketing/brands/${encodeURIComponent(id)}/trends`);
      if (!response.ok) throw new Error('trends failed');
      const result = await response.json() as Trend[];
      setTrends(result); setSelectedTrend(result[0]?.trend.id || '');
    } catch { setError(t.error); } finally { setLoading(false); }
  }, [t.error]);

  useEffect(() => {
    const id = new URLSearchParams(location.search).get('brand') || localStorage.getItem('codeflow-marketing-brand') || '';
    setBrandId(id);
    if (id) void loadTrends(id); else setLoading(false);
  }, [loadTrends]);

  const refreshCampaign = useCallback(async (campaignId: string) => {
    const response = await fetch(`/api/marketing/campaigns/${encodeURIComponent(campaignId)}`);
    if (!response.ok) throw new Error('campaign failed');
    const result = await response.json() as CampaignView;
    setCampaign(result);
    return result;
  }, []);

  async function createCampaign() {
    if (!brandId || !selectedTrend) return;
    setWorking(true); setError('');
    try {
      const response = await fetch('/api/marketing/campaigns', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ brandProfileId: brandId, trendSignalId: selectedTrend }) });
      if (!response.ok) throw new Error('create failed');
      const created = await response.json() as { id: string };
      for (let attempt = 0; attempt < 12; attempt += 1) {
        const current = await refreshCampaign(created.id);
        if (current.campaign.status === 'AwaitingApproval' || current.campaign.status === 'Failed') break;
        await new Promise(resolve => setTimeout(resolve, 900));
      }
    } catch { setError(t.error); } finally { setWorking(false); }
  }

  async function approveCampaign() {
    if (!campaign) return;
    setWorking(true); setError('');
    try {
      const response = await fetch(`/api/marketing/campaigns/${encodeURIComponent(campaign.campaign.id)}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ approved: true, reason: null }) });
      if (!response.ok) throw new Error('approval failed');
      for (let attempt = 0; attempt < 12; attempt += 1) {
        const current = await refreshCampaign(campaign.campaign.id);
        if (current.campaign.status === 'PublishingReady' || current.campaign.status === 'Failed') break;
        await new Promise(resolve => setTimeout(resolve, 900));
      }
    } catch { setError(t.error); } finally { setWorking(false); }
  }

  const publishingReady = campaign?.campaign.status === 'PublishingReady';
  const awaitingApproval = campaign?.campaign.status === 'AwaitingApproval';
  const failed = campaign?.campaign.status === 'Failed';
  const mediaUrl = campaign?.campaign.videoUrl;
  return <div className="dashboard-page"><Header lang={lang} setLang={setLang} onboarding />
    <main className="dashboard container">
      <section className="dashboard-intro"><div><p className="eyebrow">{t.eyebrow}</p><h1>{t.title}</h1><p>{t.intro}</p></div><div className="approval-note"><Check size={18}/><span>{t.approval}</span></div></section>
      {!brandId && <div className="dashboard-error" role="alert"><CircleAlert size={20}/>{t.missing}</div>}
      {error && <div className="dashboard-error" role="alert"><CircleAlert size={20}/>{error}</div>}
      {brandId && <section className="dashboard-grid">
        <div className="trend-panel"><div className="panel-heading"><div><p className="eyebrow">01 / {t.trends}</p><h2>{t.trends}</h2></div><button className="text-button" type="button" onClick={() => void loadTrends(brandId)} disabled={loading || working}>{t.restart}</button></div>
          {loading ? <div className="dashboard-loading"><LoaderCircle size={22}/>{t.loading}</div> : <div className="trend-list">{trends.map(({ trend, score }) => <button key={trend.id} type="button" className={`trend-card ${selectedTrend === trend.id ? 'selected' : ''}`} onClick={() => setSelectedTrend(trend.id)} disabled={working}><span className="trend-icon"><TrendingUp size={19}/></span><span className="trend-card-copy"><strong>{trend.title}</strong><span>{trend.summary}</span><small>{Math.round(score.total * 100)}% {t.score}</small></span>{selectedTrend === trend.id && <Check className="trend-check" size={18}/>}</button>)}</div>}
          {!loading && trends.length > 0 && <button className="button dashboard-action" type="button" disabled={working} onClick={() => void createCampaign()}>{working && !campaign ? <LoaderCircle className="spin" size={18}/> : <Sparkles size={18}/>}{working && !campaign ? t.generating : t.generate}<ArrowRight size={18}/></button>}
        </div>
        <div className="campaign-panel"><div className="panel-heading"><div><p className="eyebrow">02 / {campaign ? t.review : 'CAMPAIGN'}</p><h2>{campaign ? t.review : en ? 'Choose a trend to start.' : 'Kies een trend om te beginnen.'}</h2></div>{campaign && <span className={`campaign-status ${publishingReady ? 'ready' : ''} ${failed ? 'failed' : ''}`}>{publishingReady ? t.ready : failed ? t.failed : awaitingApproval ? <><Clock3 size={14}/> {t.reviewNeeded}</> : <><LoaderCircle className="spin" size={14}/> {t.creating}</>}</span>}</div>
          {!campaign && <div className="campaign-empty"><Video size={28}/><p>{en ? 'Your selected trend will become a tailored hook, video script and caption.' : 'Je gekozen trend wordt een hook, videoscript en caption op maat.'}</p></div>}
          {campaign && <div className="campaign-content">{publishingReady ? <div className="publishing-card"><Check size={28}/><h3>{t.ready}</h3><p>{t.readyText}</p>{mediaUrl && <img className="campaign-image" src={mediaUrl} alt={t.image} />}<div>{campaign.publishingJobs.map(job => <span key={job.id}>{job.platform}</span>)}</div></div> : <><article><span>{t.hook}</span><h3>{campaign.campaign.hook}</h3></article>{mediaUrl && <article><span>{t.image}</span><img className="campaign-image" src={mediaUrl} alt={t.image} /></article>}<article><span>{t.script}</span><p>{campaign.campaign.script}</p></article><article><span>{t.caption}</span><p>{campaign.campaign.caption}</p></article>{awaitingApproval ? <button className="button dashboard-action" type="button" disabled={working} onClick={() => void approveCampaign()}>{working ? <LoaderCircle className="spin" size={18}/> : <Check size={18}/>}{working ? t.approving : t.approve}<ArrowRight size={18}/></button> : failed ? <div className="campaign-wait failed"><CircleAlert size={18}/>{t.failed}</div> : <div className="campaign-wait"><LoaderCircle className="spin" size={18}/>{t.creating}</div>}</>}</div>}
        </div>
      </section>}
    </main>
  </div>;
}
