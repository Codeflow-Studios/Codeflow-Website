'use client';

import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { ArrowRight, CheckCircle2, LoaderCircle } from 'lucide-react';
import type { Language } from './shared';

export default function InquiryForm({ lang, kind = 'contact' }: { lang: Language; kind?: 'audit' | 'contact' }) {
  const en = lang === 'en';
  const audit = kind === 'audit';
  const id = useId();
  const locked = useRef(false);
  const result = useRef<HTMLDivElement>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [reference, setReference] = useState('');
  const [context, setContext] = useState('');

  useEffect(() => {
    const query = new URLSearchParams(location.search);
    setContext(['service', 'package', 'topic'].map(key => query.get(key)?.slice(0, 80)).filter(Boolean).join(' / ').slice(0, 240));
  }, []);
  useEffect(() => { if (reference || error) result.current?.focus(); }, [reference, error]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (locked.current) return;
    locked.current = true;
    const form = new FormData(event.currentTarget);
    const query = new URLSearchParams(location.search);
    const payload: Record<string, string> = { kind, context };
    for (const key of ['company', 'email', 'website', 'goal', 'fax']) payload[key] = String(form.get(key) || '').trim();
    for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content']) {
      const value = query.get(key);
      if (value) payload[key] = value.slice(0, 120);
    }
    setSending(true);
    setError('');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch('/api/audit/', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload), signal: controller.signal,
      });
      if (!response.ok) {
        if (response.status === 429) throw new Error('rate');
        if (response.status === 422) throw new Error('fields');
        throw new Error('delivery');
      }
      const data: unknown = await response.json();
      if (data === null || typeof data !== 'object' || !('ok' in data) || data.ok !== true
        || !('reference' in data) || typeof data.reference !== 'string' || !/^[A-F0-9]{12}$/.test(data.reference)) throw new Error('delivery');
      setReference(data.reference);
    } catch (failure) {
      const reason = failure instanceof Error ? failure.message : '';
      setError(reason === 'rate'
        ? (en ? 'Please wait a moment before sending another request. Your details are still here.' : 'Wacht even voor je opnieuw verstuurt. Je gegevens blijven ingevuld.')
        : reason === 'fields'
          ? (en ? 'Check your name, email and website address, then try again.' : 'Controleer je naam, e-mailadres en websiteadres en probeer opnieuw.')
          : (en ? 'We could not confirm your request. Your details are still here; please try again shortly.' : 'We konden je aanvraag niet bevestigen. Je gegevens blijven ingevuld; probeer het zo opnieuw.'));
    } finally {
      clearTimeout(timeout);
      locked.current = false;
      setSending(false);
    }
  }

  if (reference) return <div className="inquiry-card inquiry-success" ref={result} tabIndex={-1} role="status">
    <CheckCircle2 size={38} aria-hidden="true"/>
    <p className="eyebrow">{en ? 'THANK YOU' : 'BEDANKT'}</p>
    <h3>{en ? 'Your request is on its way.' : 'Je aanvraag is verstuurd.'}</h3>
    <p>{en ? 'We will get back to you at the email address you provided.' : 'We nemen contact met je op via het opgegeven e-mailadres.'}</p>
    <p className="inquiry-reference">{en ? 'Your reference' : 'Jouw referentie'}: <strong>{reference}</strong></p>
  </div>;

  return <form className="inquiry-card" onSubmit={submit} aria-labelledby={`${id}-title`} aria-busy={sending}>
    <div className="inquiry-heading"><p className="eyebrow">{audit ? (en ? 'YOUR FREE DIGITAL AUDIT' : 'JOUW GRATIS DIGITALE AUDIT') : (en ? 'LET’S TALK' : 'VERTEL ONS JE IDEE')}</p>
      <h3 id={`${id}-title`}>{audit ? (en ? 'Where can we help you grow?' : 'Waar kunnen we je helpen groeien?') : (en ? 'What would you like to build?' : 'Wat wil jij in beweging zetten?')}</h3>
      <p>{en ? 'A few details are all we need to get started.' : 'Met een paar gegevens kunnen we aan de slag.'}</p>
    </div>
    {context && <p className="inquiry-context">{en ? 'About' : 'Over'}: {context}</p>}
    {error && <div className="inquiry-error" ref={result} tabIndex={-1} role="alert">{error}</div>}
    <fieldset disabled={sending} className="inquiry-fields">
      <div className="inquiry-row">
        <div><label htmlFor={`${id}-company`}>{en ? 'Name / company' : 'Naam / bedrijf'} <span>*</span></label><input id={`${id}-company`} name="company" autoComplete="organization" required maxLength={160} placeholder={en ? 'Your name or company' : 'Jouw naam of bedrijf'}/></div>
        <div><label htmlFor={`${id}-email`}>{en ? 'Email address' : 'E-mailadres'} <span>*</span></label><input id={`${id}-email`} name="email" type="email" autoComplete="email" required maxLength={254} placeholder="jij@bedrijf.be"/></div>
      </div>
      {audit && <div><label htmlFor={`${id}-website`}>{en ? 'Your website' : 'Jouw website'} <span>*</span></label><input id={`${id}-website`} name="website" type="text" inputMode="url" autoComplete="url" required maxLength={1000} placeholder="www.jouwbedrijf.be"/></div>}
      <div><label htmlFor={`${id}-goal`}>{audit ? (en ? 'What would you like to improve?' : 'Wat wil je verbeteren?') : (en ? 'Your question or idea' : 'Je vraag of idee')} {!audit && <span>*</span>}</label><textarea id={`${id}-goal`} name="goal" rows={4} required={!audit} maxLength={3000} placeholder={audit ? (en ? 'More enquiries, better visibility, less repetitive work…' : 'Meer aanvragen, betere zichtbaarheid, minder repetitief werk…') : (en ? 'Tell us a little about your project.' : 'Vertel ons kort wat je voor ogen hebt.')}/></div>
      <div className="inquiry-trap" aria-hidden="true"><label htmlFor={`${id}-fax`}>Fax</label><input id={`${id}-fax`} name="fax" tabIndex={-1} autoComplete="off"/></div>
      <p className="inquiry-privacy">{en ? 'We only use these details to handle your request. No newsletter signup.' : 'We gebruiken je gegevens alleen om je aanvraag te behandelen. Je wordt niet ingeschreven voor een nieuwsbrief.'} <a href={`/legal?lang=${lang}`}>{en ? 'Company details' : 'Bedrijfsgegevens'}</a></p>
      <button className="button inquiry-submit" type="submit">{sending ? (en ? 'Sending…' : 'Versturen…') : audit ? (en ? 'Request my free audit' : 'Vraag mijn gratis audit') : (en ? 'Send my request' : 'Verstuur mijn aanvraag')}{sending ? <LoaderCircle className="inquiry-spinner" size={19} aria-hidden="true"/> : <ArrowRight size={19} aria-hidden="true"/>}</button>
      <p className="inquiry-note">{en ? 'Free to ask. No obligation.' : 'Vrijblijvend. Zonder verplichting.'}</p>
    </fieldset>
  </form>;
}
