![SciTeens Logo](./public/assets/sciteens_logo_main.svg)

# Welcome to the SciTeens Repo!

This is the work-in-progress version of the open-source [SciTeens](https://sciteens.com) platform. This application is built in Next JS (A Server-Side Rendered React JS framework.) If you encounter issues with the website, please fork our site and commit fixes or detail the issues in the issues tab on GitHub. If you just want to explore the code, then enjoy!

# Learning

If you'd like to learn about web development, you can explore this repository and the tools that we use. We've provided the tools that we use below, as well as some good learning guides for getting started with each of these tools.

- **Tailwind CSS**<br>
  [Tailwind CSS](https://tailwindcss.com/) is a class-based CSS framework that allows us to style our website. It's pretty straightforward to learn, the [documentation](https://tailwindcss.com/docs/utility-first) is fantastic, and you can [try it yourself](https://play.tailwindcss.com/) without downloading anything.
- **React**<br>
  React is a framework that allows us to create the functionality for each of our pages. To get started, be sure to check out [this website](https://beta.reactjs.org/learn)
- **Next JS**<br>
  Next JS is built on top of React, and allows users to find our website easier via search engines like Google using a concept called [Server Side Rendering](https://www.freecodecamp.org/news/what-exactly-is-client-side-rendering-and-hows-it-different-from-server-side-rendering-bd5c786b340d/) or [Static Site Generation](https://dev.to/matfrana/server-side-rendering-vs-static-site-generation-17nf) (SSR or SSG). To learn more about Next JS and the concepts of SSR and SSG, check out the [Next JS docs](https://nextjs.org/docs/getting-started).
- **Firebase**<br>
  Firebase is a fantastic tool for easily managing the back-end of an application from the front-end. Firebase takes care of managing users, website analytics, as well as storing data in a [NoSQL database](https://en.wikipedia.org/wiki/NoSQL). To get started with learning Firebase, we recommend checking out [this website](https://firebase.google.com/docs/web/setup) or watching [this video](https://www.youtube.com/watch?v=9kRgVxULbag). Also, be sure to check out the official Firebase YouTube channel [https://www.youtube.com/c/firebase](https://www.youtube.com/c/firebase)
- **Docker**<br>
  To host our website, we use a tool called [Docker](https://www.zdnet.com/article/what-is-docker-and-why-is-it-so-darn-popular/) paired with [Google Cloud Run](https://cloud.google.com/run/). These tools allow us to "bundle" our site (almost like we're packaging our website up into a box) and then putting that "box" on Google Cloud Run for other people to access at https://sciteens.com.

# Getting Started

Before you begin, make sure that you have both [Git](https://git-scm.com/downloads) and [Node JS](https://nodejs.org/en/download/) installed on your computer. To get started with the code, follow the steps below:

1. Clone the repository by typing in `git clone https://github.com/Sci-Teens/sciteens.git` into your command line. If you don't have access, you can fork the repository instead.
2. Type in `cd sciteens` to the command line and hit enter.
3. Type in `corepack pnpm install` to the command line and hit enter. This will download all necessary packages.
4. Type in `corepack pnpm dev` and visit localhost:3000 in your browser. This will show the development build!
5. If you encounter an error at the step above, it's likely because you don't have access to the API keys. If you'd like to join the team to contribute to the website, [reach out](mailto:info@sciteens.com)!

# Scheduled social posts

GitHub Actions runs the opportunity deadline post each Monday at
12:30 UTC. It selects dated opportunities due in the next 30 days.
Each carousel places the nearest deadline first. The workflow creates
another ordered carousel when more than nine opportunities qualify.

Create a `social-posts` GitHub environment. Set these variables:

- `GCP_PROJECT_ID`
- `GCP_WIF_PROVIDER`
- `GCP_SCRAPER_SA`
- `SITE_URL`

Set the `BUFFER_API_KEY` secret. The workflow uses the `Directed Relic`
Buffer project by default. Set `BUFFER_ORGANIZATION_NAME` only to use
another project.

If Directed Relic has more than one Instagram channel, set the
`BUFFER_CHANNEL_ID` secret. The Buffer channel must be connected.
Set the channel posting schedule in Buffer. The workflow uses that
queue, so Buffer selects the next configured posting time.

# Monthly newsletter

SciTeens sends the monthly newsletter through Resend Broadcasts.
The newsletter uses React Email templates in `functions/lib/emailTemplates.js`.

The system uses two Resend segments:

- `SciTeens - Transactional` contains website account contacts.
- `SciTeens - Newsletter` contains confirmed newsletter subscribers.

The `SciTeens Newsletter` topic controls newsletter consent.
A newsletter opt-out does not stop transactional email delivery.

## Initial setup

1. Verify the `sciteens.org` sending domain in Resend.
2. Create a Resend API key that can manage contacts, segments, topics, and broadcasts.
3. Set the API key as the Firebase `RESEND_APIKEY` secret.
4. Deploy the Cloud Functions.
5. Authenticate the local Google Cloud CLI with Application Default Credentials.
6. Set `RESEND_APIKEY` in the local shell.
7. Run the contact migration.

```bash
firebase functions:secrets:set RESEND_APIKEY
firebase deploy --only functions

export GCP_PROJECT_ID=<gcp-project-id>
export RESEND_APIKEY=<resend-api-key>
gcloud auth application-default login
pnpm newsletter:sync -- --project "$GCP_PROJECT_ID"
```

The first sync, confirmation, or broadcast that needs them creates the Newsletter segment and topic.
The first sync moves existing account and confirmed newsletter contacts into their correct segments.
The first sync creates replacement unsubscribe tokens only for unmarked newsletter subscribers.
Later syncs update segment and topic membership without token rotation.

## Monthly workflow

Create a JSON file for the issue.
The file must contain these fields:

- `name`
- `subject`
- `preview`
- `title`
- `opening`
- `featuredArticle`
- `featuredProject`

`opening` is an array of one to three paragraphs.
Each featured item needs `title`, `description`, and an HTTPS `href`.
An optional featured image needs `imageUrl` and `imageAlt`.

You can omit `opportunities`.
When you omit it, the command selects up to six dated opportunities in the next 30 days.
The query uses the same deadline window as the Instagram post process.

Use this shape when you create a file:

```json
{
  "name": "Month Year",
  "subject": "The subject for this issue",
  "preview": "The inbox preview text",
  "title": "The newsletter title",
  "opening": [
    "The first opening paragraph.",
    "The optional second opening paragraph."
  ],
  "featuredArticle": {
    "title": "The article title",
    "description": "The article description",
    "href": "https://sciteens.org/article/<slug>"
  },
  "featuredProject": {
    "title": "The project title",
    "description": "The project description",
    "href": "https://sciteens.org/project/<slug>"
  }
}
```

First, create an HTML preview.

```bash
pnpm newsletter:create -- \
  --input monthly-newsletter.json \
  --project "$GCP_PROJECT_ID" \
  --dry-run
```

The command writes an HTML file beside the JSON file.
Read the HTML file before you create a Resend draft.

Then create a draft broadcast.

```bash
pnpm newsletter:create -- \
  --input monthly-newsletter.json \
  --project "$GCP_PROJECT_ID"
```

The command creates a Resend draft by default.
Review the audience, content, and schedule in Resend.

If the draft is correct, send it now.

```bash
pnpm newsletter:create -- \
  --input monthly-newsletter.json \
  --project "$GCP_PROJECT_ID" \
  --send
```

If you need a future send time, add `--scheduled-at`.
Use an ISO 8601 time and `--send`.

```bash
pnpm newsletter:create -- \
  --input monthly-newsletter.json \
  --project "$GCP_PROJECT_ID" \
  --send \
  --scheduled-at 2026-10-01T14:00:00Z
```

## Agent workflow

Give an agent the JSON field list in this section.
Ask the agent to use confirmed site content and HTTPS SciTeens URLs.
Ask the agent to run the dry command first.
Do not give an agent `RESEND_APIKEY` when it only prepares content.
Give send access only to an agent that can create broadcasts.
