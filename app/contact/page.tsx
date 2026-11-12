import type { Metadata } from 'next';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { ContactForm } from '@/components/contact-form';
import { CONTACT_EMAIL } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Contact — PULP',
  description: 'Questions, feedback or a problem with a review? Get in touch with PULP.',
};

export default function ContactPage() {
  return (
    <main>
      <SiteHeader />
      <div className="legal-wrap">
        <section className="suggest section-pad">
          <div className="suggest-intro">
            <span className="section-kicker">CONTACT</span>
            <h1>Get in <em>touch.</em></h1>
            <p>Questions, feedback, a problem with a review, or a designer inquiry — we read every message.</p>
            <p className="contact-email">Email us at<br /><a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></p>
            <p>Or send a message with the form and it will come straight to our inbox. We usually reply within a few days.</p>
          </div>
          <ContactForm />
        </section>
      </div>
      <SiteFooter />
    </main>
  );
}
