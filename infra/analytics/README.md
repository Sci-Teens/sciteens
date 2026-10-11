# First-party Google Analytics

The Google tag gateway serves the existing GA4 tag through `/metrics/`.
Measurement requests pass through this origin before they reach Google.
This reduces blocking of requests to Google domains. It does not guarantee complete counts.

The existing cookie consent decision still controls the loader.
Unsubscribe and project invitation routes do not load it.
Rejected or unanswered consent still excludes visits from GA.
This integration does not send events through the Measurement Protocol or create another GA property.

## Configuration and verification

Cloud Build enables the gateway by default with `_NEXT_PUBLIC_GA_GATEWAY_ENABLED=true`.
Local development and manual Docker builds use direct GA unless the flag is enabled.
The existing GA property and measurement ID stay the same.

Traffic counts take priority over geography for this deployment.
The production domain maps directly to Cloud Run and does not supply verified visitor-country headers.
Google's geography check fails on that ingress, so country and region reports are not reliable.
This limitation was accepted before activation. Do not infer visitor location from those reports.

1. Keep the Cloud Build substitution `_NEXT_PUBLIC_GA_GATEWAY_ENABLED` set to `true`.
   Keep the existing `_NEXT_PUBLIC_FB_MEASUREMENT_ID`.
   For local testing, set `NEXT_PUBLIC_GA_GATEWAY_ENABLED=true` before starting Next.
2. Deploy through the existing Cloud Build pipeline.
3. Request `/metrics/healthy`. The response must be `ok`.
4. Request `/metrics/?validate_geo=healthy` through the production ingress.
   The response must be `ok` before you rely on geography reports.
   The current direct Cloud Run ingress fails this check; this does not prevent event collection.
   If the hosting setup changes, the gateway forwards valid `x-country-code` headers as `X-Forwarded-Country`.
   Confirm that the new ingress supplies the visitor's country before trusting those headers.
   The app does not add an IP geolocation service or infer location from browser language.
5. Accept analytics cookies in a fresh browser session.
   Confirm that the script and measurement requests use `/metrics/` in the Network panel.
   Confirm a page view and an article rating event in GA Realtime or Tag Assistant.
6. Repeat with your audience's ad blocker enabled.
   Test rejection in a fresh session. No tag must load before acceptance or after rejection.

The flag is a build argument. Rebuild to enable or disable it.
To roll back, set the substitution to `false` and deploy again.

## Deployed revision

The gateway revision is `website-00261-mav`.
Cloud Build `0c31d388-10b2-4db8-a17c-fa976559a711` built and deployed it with no production traffic for verification.
Cloud Build `90e877a2-1a99-45de-94a5-65643962a2cd` promoted that verified revision to 100% of production traffic.
The previous production revision is `website-00252-tj2`.
To revert traffic immediately, use a Cloud Build step that sends 100% of traffic to that revision.

## Data and limits

The proxy sends GA cookies, the user agent, content type, country when supplied,
and the measurement query or body to the fixed Google endpoint for this property.
It excludes authentication cookies and authorization headers.
It does not cache responses or copy upstream cookies and redirects.
POST bodies are limited to 64 KiB. Upstream requests time out after five seconds.
Each tag or event request uses the Cloud Run origin, which adds traffic and can add cold-start latency.

Ad blockers can still detect scripts or measurement patterns on the site's domain.
JavaScript-disabled visits remain absent. The gateway does not recover past missing data.

For a separate request-count baseline, use Firebase Hosting web request logs.
Cloud Run request logs exclude responses served from the Hosting cache.
Request counts include bots and do not equal visitors or sessions.

References:

- [Google gateway setup](https://developers.google.com/tag-platform/tag-manager/gateway/setup-guide?setup=manual)
- [Firebase Hosting request logs](https://firebase.google.com/docs/hosting/web-request-logs-and-metrics)
- [Plausible proxy option](https://plausible.io/docs/proxy/guides/nextjs)

Plausible is an alternative if you want a separate analytics dashboard.
It needs a hosted account or a self-hosted service. This change keeps the existing GA property.
