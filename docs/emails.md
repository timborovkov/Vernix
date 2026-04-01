# Email Communication

Vernix sends emails via [Resend](https://resend.com/) from `hello@vernix.app`. All templates live in `src/lib/email/templates.ts`.

## Email Catalog

| Email                 | Trigger                                 | Category      | Template Function                | Unsubscribe |
| --------------------- | --------------------------------------- | ------------- | -------------------------------- | ----------- |
| Welcome               | User registration                       | Transactional | `getWelcomeEmailHtml`            | No          |
| Email Verification    | Registration / resend request           | Transactional | `getEmailVerificationHtml`       | No          |
| Password Reset        | Forgot password request                 | Transactional | `getPasswordResetEmailHtml`      | No          |
| Trial Started         | Polar `subscription.created` (trialing) | Product       | `getTrialStartedEmailHtml`       | Yes         |
| First Meeting Summary | First meeting completes                 | Product       | `getFirstMeetingEmailHtml`       | Yes         |
| Mid-Trial Check-in    | Cron — day 7 of trial                   | Product       | `getMidTrialCheckinHtml`         | Yes         |
| Trial Warning (3d)    | Cron — day 11 of trial                  | Product       | `getTrialWarningHtml`            | Yes         |
| Trial Warning (1d)    | Cron — day 13 of trial                  | Product       | `getTrialWarningHtml`            | Yes         |
| Trial Expired         | Polar `subscription.revoked`            | Product       | `getTrialExpiredEmailHtml`       | Yes         |
| Upgrade Reminder      | Cron — weekly (Mon 09:00 UTC)           | Marketing     | `getFreePlanUpgradeReminderHtml` | Yes         |
| Retention             | Polar `subscription.canceled`           | Marketing     | `getLastChanceRetentionHtml`     | Yes         |
| Win-Back              | Cron — 30 days post-churn               | Marketing     | `getWinBackEmailHtml`            | Yes         |
| Contact Notification  | Contact form (internal)                 | Internal      | `getContactNotificationHtml`     | N/A         |

## Categories

- **Transactional**: Always sent. Cannot be opted out (password resets, email verification).
- **Product**: Trial lifecycle, first meeting summary, check-ins. Users can opt out via email preferences.
- **Marketing**: Upgrade reminders, retention, win-back. Users can opt out via email preferences.
- **Internal**: Sent to the team, not to users.

## Email Preferences

Users can manage preferences in **Settings > Email Preferences** with two toggles:

- Product updates (trial, meeting, check-in emails)
- Marketing emails (upgrade, retention, win-back)

All non-transactional emails include an unsubscribe footer with an HMAC-signed link. Clicking it opts the user out of that category without requiring login.

### Implementation

- `src/lib/email/preferences.ts` — `shouldSendEmail()`, `buildUnsubscribeUrl()`, `verifyUnsubscribeToken()`
- `src/app/api/email/unsubscribe/route.ts` — Public GET handler for one-click unsubscribe
- `src/lib/db/schema.ts` — `emailPreferences` JSONB column on `users` table

## Throttling & Cooldowns

| Email              | Throttle                                 |
| ------------------ | ---------------------------------------- |
| Upgrade Reminder   | Max 1 per 7 days per user                |
| Retention          | Max 1 per 30 days per user               |
| Mid-Trial Check-in | Once per trial                           |
| Trial Warning      | Max 2 per trial (2-day cooldown between) |
| Win-Back           | Once per churn event                     |

## Design System

All email templates follow a consistent design:

- **Header**: Dark background (#242424), white text, 24px title
- **Body**: White card, 32px padding, system font stack
- **Card**: max-width 560px, 12px border-radius
- **Greeting**: `Hi {name},` at 16px
- **Body text**: 14px, #555, line-height 1.6
- **Highlight boxes**: #f0f0ff background, 8px radius, 16px padding
- **CTA buttons**: #242424 background, white text, 12px 32px padding, 8px radius, 14px font-weight 600
- **Fine print**: 12px, #999
- **Unsubscribe footer**: 11px, #aaa, centered

## Cron Jobs

| Job                 | Schedule             | File                                     |
| ------------------- | -------------------- | ---------------------------------------- |
| `upgrade-reminders` | Weekly Mon 09:00 UTC | `src/lib/cron/jobs/upgrade-reminders.ts` |
| `mid-trial-checkin` | Daily 10:00 UTC      | `src/lib/cron/jobs/mid-trial-checkin.ts` |
| `trial-warning`     | Daily 10:00 UTC      | `src/lib/cron/jobs/trial-warning.ts`     |
| `win-back`          | Daily 11:00 UTC      | `src/lib/cron/jobs/win-back.ts`          |

## Adding a New Email

1. Add template function to `src/lib/email/templates.ts`
2. If non-transactional, add `unsubscribeUrl` parameter and footer
3. Check `shouldSendEmail()` before sending
4. Add throttle column to `users` table if needed (e.g. `lastXEmailSentAt`)
5. Update this document
6. If cron-triggered, create a job in `src/lib/cron/jobs/` and register in `src/lib/cron/index.ts`

## Infrastructure

- **Provider**: Resend (`RESEND_API_KEY`)
- **Client**: `src/lib/email/client.ts` (singleton)
- **Send function**: `src/lib/email/send.ts` — supports `List-Unsubscribe` header
- **Layout helper**: `src/lib/email/layout.ts` — shared `wrapEmailLayout()` for new templates
- **Graceful degradation**: If `RESEND_API_KEY` is not set, emails are logged but not sent
