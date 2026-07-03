"use client";

import Link from "next/link";
import {
  MarketingShell,
  PageHeading,
} from "../components/landing/MarketingShell";

// ---------------------------------------------------------------------------
// /privacy
// ---------------------------------------------------------------------------
//
// Public privacy policy. Sections mirror the standard GDPR / Apple App
// Store privacy nutrition labels — keep this in sync whenever the data
// model changes (User schema additions, new third-party SDKs, etc.).
// ---------------------------------------------------------------------------

const LAST_UPDATED = "June 7, 2026";

export default function PrivacyPage() {
  return (
    <MarketingShell>
      <section className="relative px-6 pb-24 pt-36 md:pt-44">
        <div className="mx-auto max-w-3xl">
          <PageHeading
            eyebrow="PRIVACY"
            line1="Your training,"
            accent="your data."
          />
          <p className="mt-6 text-center text-[12px] tracking-widest text-white/45">
            LAST UPDATED · {LAST_UPDATED.toUpperCase()}
          </p>

          <Summary />

          <article className="mt-16 space-y-12 text-[14px] leading-relaxed text-white/75">
            <Section title="1. Who we are">
              <p>
                HEFTOR (&ldquo;we&rdquo;, &ldquo;us&rdquo;) is the company
                behind the HEFTOR strength-training app and this website.
                When you create an account or use the app, we act as the
                data controller for the personal information you provide.
              </p>
              <p>
                If you want to reach the team responsible for privacy
                questions, write to{" "}
                <EmailLink>privacy@heftor.app</EmailLink> or send a message
                via the{" "}
                <Link href="/contact" className="underline hover:text-white">
                  contact form
                </Link>
                .
              </p>
            </Section>

            <Section title="2. Information we collect">
              <p>
                We try to collect as little as possible. The data we do
                hold falls into four buckets:
              </p>
              <List
                items={[
                  <span key="account">
                    <b className="text-white">Account information.</b>{" "}
                    Email address, optional display name, hashed password
                    (scrypt), and — for OAuth users — the Apple or Google
                    subject identifier.
                  </span>,
                  <span key="onboarding">
                    <b className="text-white">Onboarding answers.</b>{" "}
                    Training goal, experience level, gender, age, weight,
                    cardio activity, weekly schedule, and split preference.
                    Used only to tailor your plan.
                  </span>,
                  <span key="training">
                    <b className="text-white">Training data.</b> Every
                    workout you log: exercises, sets, reps, weights, RPE,
                    rest timings, planned vs. completed flags, and derived
                    metrics like estimated 1RM.
                  </span>,
                  <span key="device">
                    <b className="text-white">Device + diagnostic data.</b>{" "}
                    Platform (iOS / Android / web), app version, time zone
                    for reminders, and the IP / user-agent attached to API
                    requests. Used for debugging and abuse review.
                  </span>,
                ]}
              />
              <p>
                We do <b className="text-white">not</b> collect: location,
                contacts, photo library, health-kit data (unless you
                explicitly grant Apple Health / Google Fit sync via Pro),
                or any data from advertising IDs.
              </p>
            </Section>

            <Section title="3. How we use your information">
              <List
                items={[
                  "Run the app — generate plans, calculate XP/rank, fire reminders, render charts.",
                  "Maintain the leaderboard (only your chosen public username is shown; you can stay anonymous as ATLÉTA#XXXXX).",
                  "Authenticate you across devices, restore sessions, send password-reset emails.",
                  "Email you about your account when it matters: rank-ups (in-app), reminders (local), security alerts (transactional only).",
                  "Investigate suspected abuse — outlier XP earning, scripted account creation, etc.",
                ]}
              />
              <p>
                We do not use your training data to train AI models, sell
                aggregated data to brokers, or target ads. There are no
                ads anywhere in HEFTOR.
              </p>
            </Section>

            <Section title="4. Where we store data">
              <p>
                Primary storage is a managed MongoDB cluster in the EU
                (Frankfurt, eu-central-1). Backups are encrypted at rest
                with AES-256. Tokens issued to your device are signed with
                HMAC-SHA256 using a key that never leaves the server.
              </p>
              <p>
                Passwords are stored as scrypt hashes (16-byte random salt,
                64-byte hash). Reset tokens are stored as SHA-256 hashes
                with a 30-minute TTL.
              </p>
            </Section>

            <Section title="5. Who we share data with">
              <p>
                We use a small set of third-party processors that need
                access to deliver the service:
              </p>
              <List
                items={[
                  <span key="aws">
                    <b className="text-white">MongoDB Atlas / AWS</b> —
                    database hosting (EU region).
                  </span>,
                  <span key="apple">
                    <b className="text-white">Apple, Google</b> — only the
                    OAuth identity verification when you sign in with
                    Apple or Google.
                  </span>,
                  <span key="email">
                    <b className="text-white">Resend / SendGrid</b> —
                    transactional email delivery (password reset, account
                    notices). No marketing email is sent without explicit
                    subscribe.
                  </span>,
                  <span key="payment">
                    <b className="text-white">
                      Stripe / Apple In-App Purchase / Google Play Billing
                    </b>{" "}
                    — only for Pro subscribers. We receive a subscription
                    status; payment details (card numbers) never touch our
                    servers.
                  </span>,
                ]}
              />
              <p>
                We do not sell your data to any third party. We may
                disclose information when legally required (court order,
                subpoena) and will notify you unless prohibited.
              </p>
            </Section>

            <Section title="6. Your rights">
              <p>You can, at any time:</p>
              <List
                items={[
                  "Access — request a copy of every record we have about you.",
                  "Export — Pro users get CSV / PDF export from inside the app; free users can request a one-time export via support.",
                  "Correct — edit your profile, onboarding answers, or training history directly in the app.",
                  "Delete — close your account from Account → Delete account. Your user document, sessions and training records are removed within 24 hours.",
                  "Opt out of leaderboard — leave your username unset; you appear anonymously as ATLÉTA#XXXXX or not at all.",
                  "Object or complain — contact your local data protection authority if you believe your rights are violated.",
                ]}
              />
            </Section>

            <Section title="7. Data retention">
              <p>
                Active accounts: data is kept as long as your account is
                open.
              </p>
              <p>
                Deleted accounts: user document, sessions, trainings and
                reset tokens are permanently deleted within 24 hours.
                Anonymised counts (e.g. &ldquo;X workouts logged in March
                2026&rdquo;) may persist for analytics and leaderboard
                integrity — these counts cannot be linked back to you.
              </p>
              <p>
                Email logs from the transactional provider are retained
                for 30 days for delivery troubleshooting, then purged.
              </p>
            </Section>

            <Section title="8. Cookies and similar tech">
              <p>
                We use the bare minimum: a single first-party authentication
                cookie that holds your session token, and a localStorage
                key that remembers your language preference. No third-party
                analytics, no Facebook pixel, no tracking.
              </p>
            </Section>

            <Section title="9. Children">
              <p>
                HEFTOR is intended for users 16 and older. We do not
                knowingly collect data from anyone under 16. If you
                believe a minor has an account, email{" "}
                <EmailLink>privacy@heftor.app</EmailLink> and we&apos;ll
                delete it.
              </p>
            </Section>

            <Section title="10. International transfers">
              <p>
                Servers are in the EU. If you access HEFTOR from outside
                the EU, your data crosses into the EU when our backend
                receives it. We rely on the Standard Contractual Clauses
                where applicable.
              </p>
            </Section>

            <Section title="11. Changes to this policy">
              <p>
                We update this page when we materially change how we
                handle data — new third-party SDK, new data category, etc.
                The &ldquo;last updated&rdquo; date at the top reflects
                the most recent change. We&apos;ll email registered users
                if the change reduces protections.
              </p>
            </Section>

            <Section title="12. Contact">
              <p>
                Privacy questions, requests, complaints:{" "}
                <EmailLink>privacy@heftor.app</EmailLink>.
              </p>
              <p>
                For everything else, use the{" "}
                <Link
                  href="/contact"
                  className="underline hover:text-white"
                >
                  contact form
                </Link>
                .
              </p>
            </Section>
          </article>
        </div>
      </section>
    </MarketingShell>
  );
}

function Summary() {
  return (
    <div className="mt-12 rounded-3xl border border-white/[0.08] bg-white/[0.04] p-6 backdrop-blur-xl md:p-8">
      <p className="text-[11px] font-extrabold tracking-widest text-white/45">
        IN SHORT
      </p>
      <p className="mt-3 text-[15px] leading-relaxed text-white/85">
        We collect what we need to run the app — your account, your
        training, your device fingerprint — and nothing else. We don&apos;t
        sell data, we don&apos;t run ads, and you can export or delete
        everything at any time.
      </p>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-[20px] font-extrabold tracking-tight text-white md:text-[22px]">
        {title}
      </h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function List({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="space-y-2 pl-5">
      {items.map((item, i) => (
        <li key={i} className="list-disc marker:text-white/30">
          {item}
        </li>
      ))}
    </ul>
  );
}

function EmailLink({ children }: { children: React.ReactNode }) {
  return (
    <a
      href={`mailto:${typeof children === "string" ? children : ""}`}
      className="underline hover:text-white"
    >
      {children}
    </a>
  );
}
