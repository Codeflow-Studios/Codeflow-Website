/* eslint-disable @next/next/no-img-element */
import type { Language } from './shared';

export default function DesignShowcase({lang}:{lang:Language}) {
  const en = lang === 'en';
  return <section className="design-work container" id="selected-work" aria-labelledby="design-work-title">
    <div className="section-heading">
      <div>
        <p className="eyebrow">04 / SELECTED WORK</p>
        <h2 id="design-work-title">{en?<>Designed for<br/><span>real use.</span></>:<>Ontworpen voor<br/><span>echt gebruik.</span></>}</h2>
      </div>
      <p className="section-intro">{en?'Two real applications: a visual identity in print and this website as a live digital product.':'Twee echte toepassingen: een visuele identiteit in drukwerk en deze website als live digitaal product.'}</p>
    </div>

    <div className="design-work-list">
      <article className="design-case design-case-atn">
        <header className="design-case-header">
          <div><span>01</span><p>{en?'Visual identity':'Visuele identiteit'}</p></div>
          <div><h3>ATN BV</h3><p>{en?'Logo · Business card':'Logo · Visitekaartje'}</p></div>
        </header>
        <div className="atn-case-intro">
          <div className="atn-logo-stage"><img src="/work/atn/logo.jpg" alt={en?'ATN logo in silver and blue':'ATN-logo in zilver en blauw'} width="512" height="512" loading="lazy"/></div>
          <div className="atn-case-copy"><p className="eyebrow">ATN · TECHNIEK OP MAAT</p><h3>{en?'One recognisable line, from mark to card.':'Eén herkenbare lijn, van beeldmerk tot kaartje.'}</h3><p>{en?'A technical identity in silver, black and blue, consistently applied to a practical business card.':'Een technische identiteit in zilver, zwart en blauw, consequent doorgetrokken naar een praktisch visitekaartje.'}</p></div>
        </div>
        <div className="atn-card-grid">
          <figure><img src="/work/atn/business-card-front.png" alt={en?'Front of the ATN business card':'Voorzijde van het ATN-visitekaartje'} width="2008" height="1299" loading="lazy"/><figcaption>{en?'Business card · Front':'Visitekaartje · Voorzijde'}</figcaption></figure>
          <figure><img src="/work/atn/business-card-back.png" alt={en?'Back of the ATN business card with contact QR code':'Achterzijde van het ATN-visitekaartje met contact-QR-code'} width="2008" height="1299" loading="lazy"/><figcaption>{en?'Business card · Back':'Visitekaartje · Achterzijde'}</figcaption></figure>
        </div>
      </article>

      <article className="design-case design-case-codeflow">
        <div className="codeflow-case-visual"><img src="/work/codeflow-studios/website-home.jpg" alt={en?'Homepage designed for Codeflow Studios':'Homepage ontworpen voor Codeflow Studios'} width="1440" height="900" loading="lazy"/></div>
        <div className="codeflow-case-copy"><div className="design-case-number">02</div><p className="eyebrow">CODEFLOW STUDIOS</p><h3>{en?'This website is the webdesign case.':'Deze site is de webdesigncase.'}</h3><p>{en?'Visual system, responsive interface and brand experience — designed as one coherent whole.':'Visueel systeem, responsieve interface en merkervaring — ontworpen als één samenhangend geheel.'}</p><div className="design-case-tags"><span>Webdesign</span><span>Responsive UI</span></div></div>
      </article>
    </div>
  </section>;
}
