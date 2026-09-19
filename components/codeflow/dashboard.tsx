'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, Check, CircleAlert, Clock3, Link2, LoaderCircle, Sparkles, TrendingUp, Video } from 'lucide-react';
import { Header, useLanguage } from './shared';

type Trend = {
  trend: { id: string; title: string; summary: string; keywords: string[]; provider: string };
  score: { score?: number; total?: number; explanation: string };
};

type PublishingJob = {
  id: string;
  platform: string;
  status: string;
  externalPostId?: string;
  lastError?: string;
};

type CampaignView = {
  campaign: {
    id: string;
    status: string;
    hook?: string;
    script?: string;
    caption?: string;
    videoUrl?: string;
    videoProvider?: string;
  };
  publishingJobs: PublishingJob[];
};

type SocialConnection = {
  id: string;
  platform: string;
  externalAccountId: string;
  externalAccountName: string;
  isActive: boolean;
  tokenExpiresAt?: string;
};

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
    hook: 'Hook',
    script: 'Video script',
    caption: 'Caption',
    image: 'Generated image',
    video: 'Generated video',
    approve: 'Approve for publishing',
    approving: 'Preparing publishing…',
    ready: 'Ready for publishing',
    creating: 'Generating media',
    reviewNeeded: 'Review needed',
    failed: 'Generation failed',
    readyText: 'Choose a connected channel. A channel is only marked published after the provider confirms it.',
    publish: 'Publish to',
    publishing: 'Publishing…',
    published: 'Published',
    connectMeta: 'Connect Instagram + Facebook',
    connectedAs: 'Connected as',
    metaConnected: 'Meta connected. Your accounts are ready.',
    linkedinSoon: 'LinkedIn needs its app connection before publishing.',
    restart: 'Find fresh trends',
    missing: 'This dashboard link is incomplete. Return to onboarding to create a brand profile.',
    error: 'We could not load your marketing workspace. Please try again.',
    score: 'brand fit',
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
    hook: 'Hook',
    script: 'Videoscript',
    caption: 'Caption',
    image: 'Gegenereerde afbeelding',
    video: 'Gegenereerde video',
    approve: 'Goedkeuren voor publicatie',
    approving: 'Publicatie voorbereiden…',
    ready: 'Klaar voor publicatie',
    creating: 'Media wordt gemaakt',
    reviewNeeded: 'Controle nodig',
    failed: 'Generatie mislukt',
    readyText: 'Kies een verbonden kanaal. Een kanaal geldt pas als gepubliceerd nadat de provider dit bevestigt.',
    publish: 'Publiceren op',
    publishing: 'Publiceren…',
    published: 'Gepubliceerd',
    connectMeta: 'Instagram + Facebook verbinden',
    connectedAs: 'Verbonden als',
    metaConnected: 'Meta is verbonden. Je accounts staan klaar.',
    linkedinSoon: 'LinkedIn heeft eerst een appverbinding nodig.',
    restart: 'Nieuwe trends zoeken',
    missing: 'Deze dashboardlink is niet volledig. Ga terug naar de onboarding om een merkprofiel aan te maken.',
    error: 'We konden je marketingwerkruimte niet laden. Probeer het opnieuw.',
    score: 'merkmatch',
    approval: 'Er wordt niets gepubliceerd zonder jouw goedkeuring.',
  },
};

async function readProblem(response: Response, fallback: string) {
  try {
    const problem = await response.json() as { title?: string; detail?: string };
    return problem.title || problem.detail || fallback;
  } catch {
    return fallback;
  }
}

export default function Dashboard() {
  const { lang, setLang, en } = useLanguage();
  const t = copy[lang];
  const [brandId, setBrandId] = useState('');
  const [trends, setTrends] = useState<Trend[]>([]);
  const [selectedTrend, setSelectedTrend] = useState('');
  const [campaign, setCampaign] = useState<CampaignView | null>(null);
  const [connections, setConnections] = useState<SocialConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [publishingPlatform, setPublishingPlatform] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadConnections = useCallback(async (id: string) => {
    const response = await fetch(`/api/marketing/social/connections?brandProfileId=${encodeURIComponent(id)}`);
    if (!response.ok) throw new Error(await readProblem(response, 'Could not load social connections.'));
    setConnections(await response.json() as SocialConnection[]);
  }, []);

  const loadTrends = useCallback(async (id: string) => {
    setLoading(true);
    setError('');
    setCampaign(null);
    try {
      await fetch('/api/marketing/trends', { method: 'POST' });
      const response = await fetch(`/api/marketing/brands/${encodeURIComponent(id)}/trends`);
      if (!response.ok) throw new Error('trends failed');
      const result = await response.json() as Trend[];
      setTrends(result);
      setSelectedTrend(result[0]?.trend.id || '');
    } catch {
      setError(t.error);
    } finally {
      setLoading(false);
    }
  }, [t.error]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const id = params.get('brand') || localStorage.getItem('codeflow-marketing-brand') || '';
    const socialStatus = params.get('social');
    const socialMessage = params.get('socialMessage');

    setBrandId(id);
    if (socialStatus === 'connected') setNotice(t.metaConnected);
    if (socialStatus === 'error') setError(socialMessage || t.error);

    if (id) {
      void loadTrends(id);
      void loadConnections(id).catch(() => setError(t.error));
    } else {
      setLoading(false);
    }
  }, [loadConnections, loadTrends, t.error, t.metaConnected]);

  const refreshCampaign = useCallback(async (campaignId: string) => {
    const response = await fetch(`/api/marketing/campaigns/${encodeURIComponent(campaignId)}`);
    if (!response.ok) throw new Error('campaign failed');
    const result = await response.json() as CampaignView;
    setCampaign(result);
    return result;
  }, []);

  useEffect(() => {
    const campaignId = campaign?.campaign.id;
    const status = campaign?.campaign.status;
    if (!campaignId || status === 'AwaitingApproval' || status === 'PublishingReady' || status === 'Failed') return;

    const timer = window.setInterval(() => {
      void refreshCampaign(campaignId).catch(() => undefined);
    }, 3000);

    return () => window.clearInterval(timer);
  }, [campaign?.campaign.id, campaign?.campaign.status, refreshCampaign]);

  async function createCampaign() {
    if (!brandId || !selectedTrend) return;
    setWorking(true);
    setError('');
    try {
      const response = await fetch('/api/marketing/campaigns', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ brandProfileId: brandId, trendSignalId: selectedTrend }),
      });
      if (!response.ok) throw new Error(await readProblem(response, 'Campaign creation failed.'));
      const created = await response.json() as { id: string };
      await refreshCampaign(created.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t.error);
    } finally {
      setWorking(false);
    }
  }

  async function approveCampaign() {
    if (!campaign) return;
    setWorking(true);
    setError('');
    try {
      const response = await fetch(`/api/marketing/campaigns/${encodeURIComponent(campaign.campaign.id)}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ approved: true, reason: null }),
      });
      if (!response.ok) throw new Error(await readProblem(response, 'Approval failed.'));
      await refreshCampaign(campaign.campaign.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t.error);
    } finally {
      setWorking(false);
    }
  }

  async function publishCampaign(platform: string) {
    if (!campaign) return;
    setWorking(true);
    setPublishingPlatform(platform);
    setError('');
    try {
      const response = await fetch(`/api/marketing/campaigns/${encodeURIComponent(campaign.campaign.id)}/publish`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ platform }),
      });
      if (!response.ok) {
        const message = await readProblem(response, 'Publishing failed.');
        await refreshCampaign(campaign.campaign.id).catch(() => undefined);
        throw new Error(message);
      }
      setCampaign(await response.json() as CampaignView);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t.error);
    } finally {
      setWorking(false);
      setPublishingPlatform('');
    }
  }

  const publishingReady = campaign?.campaign.status === 'PublishingReady' || campaign?.campaign.status === 'Approved';
  const awaitingApproval = campaign?.campaign.status === 'AwaitingApproval';
  const failed = campaign?.campaign.status === 'Failed';
  const publishingJobs = campaign?.publishingJobs ?? [];
  const displayJobs = publishingJobs.length > 0
    ? publishingJobs
    : ['instagram', 'facebook', 'linkedin'].map((platform) => ({ id: platform, platform, status: 'Ready' }));
  const allPublished = publishingJobs.length > 0 && publishingJobs.every((job) => job.status === 'Published');
  const activeConnections = connections.filter((connection) => connection.isActive);
  const hasConnection = (platform: string) => activeConnections.some((connection) => connection.platform === platform);
  const needsMeta = displayJobs.some((job) => ['facebook', 'instagram'].includes(job.platform) && !hasConnection(job.platform));
  const mediaUrl = campaign?.campaign.videoUrl;
  const mediaProvider = campaign?.campaign.videoProvider || '';
  const isVideo = Boolean(mediaUrl) && (
    mediaProvider.toLowerCase().startsWith('runway-') ||
    /^data:video\//i.test(mediaUrl || '') ||
    /\.(mp4|webm|mov|m4v)(?:[?#]|$)/i.test(mediaUrl || '')
  );

  const renderMedia = () => !mediaUrl ? null : isVideo ? (
    <video className="campaign-image" src={mediaUrl} controls playsInline preload="metadata">
      {en ? 'Your browser does not support video playback.' : 'Je browser ondersteunt het afspelen van video niet.'}
    </video>
  ) : (
    <img className="campaign-image" src={mediaUrl} alt={t.image} />
  );

  return <div className="dashboard-page"><Header lang={lang} setLang={setLang} onboarding />
    <main className="dashboard container">
      <section className="dashboard-intro">
        <div><p className="eyebrow">{t.eyebrow}</p><h1>{t.title}</h1><p>{t.intro}</p></div>
        <div className="approval-note"><Check size={18}/><span>{t.approval}</span></div>
      </section>
      {!brandId && <div className="dashboard-error" role="alert"><CircleAlert size={20}/>{t.missing}</div>}
      {notice && <div className="approval-note" role="status"><Check size={18}/><span>{notice}</span></div>}
      {error && <div className="dashboard-error" role="alert"><CircleAlert size={20}/>{error}</div>}
      {brandId && <section className="dashboard-grid">
        <div className="trend-panel">
          <div className="panel-heading">
            <div><p className="eyebrow">01 / {t.trends}</p><h2>{t.trends}</h2></div>
            <button className="text-button" type="button" onClick={() => void loadTrends(brandId)} disabled={loading || working}>{t.restart}</button>
          </div>
          {loading
            ? <div className="dashboard-loading"><LoaderCircle size={22}/>{t.loading}</div>
            : <div className="trend-list">{trends.map(({ trend, score }) =>
              <button key={trend.id} type="button" className={`trend-card ${selectedTrend === trend.id ? 'selected' : ''}`} onClick={() => setSelectedTrend(trend.id)} disabled={working}>
                <span className="trend-icon"><TrendingUp size={19}/></span>
                <span className="trend-card-copy"><strong>{trend.title}</strong><span>{trend.summary}</span><small>{Math.round(score.score ?? (score.total ?? 0) * 100)}% {t.score}</small></span>
                {selectedTrend === trend.id && <Check className="trend-check" size={18}/>}
              </button>)}</div>}
          {!loading && trends.length > 0 &&
            <button className="button dashboard-action" type="button" disabled={working} onClick={() => void createCampaign()}>
              {working && !campaign ? <LoaderCircle className="spin" size={18}/> : <Sparkles size={18}/>}
              {working && !campaign ? t.generating : t.generate}<ArrowRight size={18}/>
            </button>}
        </div>
        <div className="campaign-panel">
          <div className="panel-heading">
            <div><p className="eyebrow">02 / {campaign ? t.review : 'CAMPAIGN'}</p><h2>{campaign ? t.review : en ? 'Choose a trend to start.' : 'Kies een trend om te beginnen.'}</h2></div>
            {campaign && <span className={`campaign-status ${publishingReady ? 'ready' : ''} ${failed ? 'failed' : ''}`}>
              {publishingReady ? t.ready : failed ? t.failed : awaitingApproval ? <><Clock3 size={14}/> {t.reviewNeeded}</> : <><LoaderCircle className="spin" size={14}/> {t.creating}</>}
            </span>}
          </div>
          {!campaign && <div className="campaign-empty"><Video size={28}/><p>{en ? 'Your selected trend will become a tailored hook, video script and caption.' : 'Je gekozen trend wordt een hook, videoscript en caption op maat.'}</p></div>}
          {campaign && <div className="campaign-content">{publishingReady
            ? <div className="publishing-card">
                <Check size={28}/><h3>{allPublished ? t.published : t.ready}</h3><p>{t.readyText}</p>{renderMedia()}
                {activeConnections.length > 0 && <div>{activeConnections.map((connection) =>
                  <span key={connection.id}><Link2 size={14}/> {connection.platform}: {t.connectedAs} {connection.externalAccountName}</span>)}</div>}
                {needsMeta && <a className="button dashboard-action" href={`/api/marketing/social/meta/connect?brandProfileId=${encodeURIComponent(brandId)}`}>
                  <Link2 size={18}/>{t.connectMeta}<ArrowRight size={18}/>
                </a>}
                <div>{displayJobs.map((job) =>
                  <span key={job.id}>
                    {job.platform} · {job.status}
                    {job.lastError ? ` · ${job.lastError}` : ''}
                  </span>)}</div>
                {allPublished
                  ? <div className="campaign-wait"><Check size={18}/>{t.published}</div>
                  : displayJobs.map((job) => {
                      if (job.status === 'Published') return null;
                      if (job.platform === 'linkedin') return <div className="campaign-wait" key={job.id}>{t.linkedinSoon}</div>;
                      if (!hasConnection(job.platform)) return null;
                      return <button className="button dashboard-action" key={job.id} type="button" disabled={working} onClick={() => void publishCampaign(job.platform)}>
                        {working && publishingPlatform === job.platform ? <LoaderCircle className="spin" size={18}/> : <Check size={18}/>}
                        {working && publishingPlatform === job.platform ? t.publishing : `${t.publish} ${job.platform}`}<ArrowRight size={18}/>
                      </button>;
                    })}
              </div>
            : <>
                <article><span>{t.hook}</span><h3>{campaign.campaign.hook}</h3></article>
                {mediaUrl && <article><span>{isVideo ? t.video : t.image}</span>{renderMedia()}</article>}
                <article><span>{t.script}</span><p>{campaign.campaign.script}</p></article>
                <article><span>{t.caption}</span><p>{campaign.campaign.caption}</p></article>
                {awaitingApproval
                  ? <button className="button dashboard-action" type="button" disabled={working} onClick={() => void approveCampaign()}>
                      {working ? <LoaderCircle className="spin" size={18}/> : <Check size={18}/>}
                      {working ? t.approving : t.approve}<ArrowRight size={18}/>
                    </button>
                  : failed
                    ? <div className="campaign-wait failed"><CircleAlert size={18}/>{t.failed}</div>
                    : <div className="campaign-wait"><LoaderCircle className="spin" size={18}/>{t.creating}</div>}
              </>}
          </div>}
        </div>
      </section>}
    </main>
  </div>;
}
