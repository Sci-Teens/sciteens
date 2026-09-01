#!/usr/bin/env node
'use strict'

const fs = require('node:fs')
const path = require('node:path')

let pipelineHelpers
async function loadPipelineHelpers() {
  if (!pipelineHelpers) {
    pipelineHelpers = await import(
      './lib/socialCarouselPipeline.mjs'
    )
  }
  return pipelineHelpers
}
let renderSlidePng
async function loadRenderSlidePng() {
  if (!renderSlidePng) {
    renderSlidePng = (
      await import('./lib/socialCarouselRender.mjs')
    ).renderSlidePng
  }
  return renderSlidePng
}

const CLAIM_TIMEOUT_MS = 90 * 60 * 1000
const POST_COLLECTION = 'social-posts'
const BUFFER_API_URL =
  process.env.BUFFER_API_URL || 'https://api.buffer.com'
const DEFAULT_BUFFER_ORGANIZATION_NAME = 'My organization'

const ORGANIZATIONS_QUERY = `
  query BufferOrganizations {
    account {
      organizations {
        id
        name
      }
    }
  }
`

const CHANNELS_QUERY = `
  query BufferChannels($input: ChannelsInput!) {
    channels(input: $input) {
      id
      name
      service
    }
  }
`

const CHANNEL_QUERY = `
  query BufferChannel($input: ChannelInput!) {
    channel(input: $input) {
      id
      organizationId
      service
      isDisconnected
      isLocked
      isQueuePaused
    }
  }
`

const RECENT_POSTS_QUERY = `
  query RecentChannelPosts($input: PostsInput!) {
    posts(first: 100, input: $input) {
      edges {
        node {
          id
          dueAt
          status
          assets {
            source
          }
        }
      }
    }
  }
`

const CREATE_POST_MUTATION = `
  mutation CreateDeadlineCarousel($input: CreatePostInput!) {
    createPost(input: $input) {
      __typename
      ... on PostActionSuccess {
        post {
          id
          dueAt
          status
        }
      }
      ... on MutationError {
        message
      }
    }
  }
`

const EDIT_POST_MUTATION = `
  mutation EditDeadlineCarousel($input: EditPostInput!) {
    editPost(input: $input) {
      __typename
      ... on PostActionSuccess {
        post {
          id
          dueAt
          status
        }
      }
      ... on MutationError {
        message
      }
    }
  }
`

const DELETE_POST_MUTATION = `
  mutation DeleteDeadlineCarousel($input: DeletePostInput!) {
    deletePost(input: $input) {
      __typename
      ... on MutationError {
        message
      }
    }
  }
`

function parseArgs(argv) {
  const args = {
    execute: false,
    project: undefined,
    postId: undefined,
    scheduleAt: undefined,
    refreshScheduled: false,
    replaceScheduled: false,
  }
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index]
    if (arg === '--execute') {
      args.execute = true
    } else if (arg === '--project') {
      args.project = argv[++index]
    } else if (arg === '--post-id') {
      args.postId = argv[++index]
    } else if (arg === '--schedule-at') {
      args.scheduleAt = argv[++index]
    } else if (arg === '--refresh-scheduled') {
      args.refreshScheduled = true
    } else if (arg === '--replace-scheduled') {
      args.replaceScheduled = true
    } else {
      throw new Error(`Unknown argument: ${arg}`)
    }
  }
  if (args.scheduleAt && !args.postId) {
    throw new Error('--schedule-at requires --post-id.')
  }
  if (
    args.refreshScheduled &&
    (!args.execute || !args.postId)
  ) {
    throw new Error(
      '--refresh-scheduled requires --execute and --post-id.'
    )
  }
  if (
    args.replaceScheduled &&
    (!args.execute || !args.postId || !args.scheduleAt)
  ) {
    throw new Error(
      '--replace-scheduled requires --execute, --post-id, and --schedule-at.'
    )
  }
  return args
}

function loadEnvLocal(repoRoot) {
  const envPath = path.join(repoRoot, '.env.local')
  if (!fs.existsSync(envPath)) return

  for (const rawLine of fs
    .readFileSync(envPath, 'utf8')
    .split('\n')) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const separator = line.indexOf('=')
    if (separator === -1) continue

    const key = line.slice(0, separator).trim()
    let value = line.slice(separator + 1).trim()
    const quoted =
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    if (quoted) value = value.slice(1, -1)
    if (!(key in process.env)) process.env[key] = value
  }
}

function requiredEnv(name) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is required.`)
  return value
}

function asDate(value) {
  if (value?.toDate) return value.toDate()
  return value instanceof Date ? value : new Date(value)
}

function scheduleAt(value, now) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    throw new Error(
      '--schedule-at must use an ISO 8601 timestamp.'
    )
  }
  if (date <= now) {
    throw new Error('--schedule-at must be in the future.')
  }
  return date.toISOString()
}

function timestampMillis(value) {
  if (value?.toMillis) return value.toMillis()
  return asDate(value).getTime()
}

function errorMessage(error) {
  return String(error?.message || error).slice(0, 500)
}

function requireProjectId(args) {
  const projectId =
    args.project ||
    process.env.GCP_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FB_PROJECT_ID
  if (!projectId) {
    throw new Error(
      'Pass --project <id> or set GCP_PROJECT_ID.'
    )
  }
  return projectId
}

function initializeFirestore(admin, projectId) {
  const defaultApp =
    admin.apps.find((app) => app.name === '[DEFAULT]') ||
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId,
    })
  return admin.firestore(defaultApp)
}

async function fetchUpcomingOpportunities(db, admin, now) {
  const { deadlineWindow } = await import(
    '../lib/socialDeadlinePosts.mjs'
  )
  const { start, end } = deadlineWindow(now)
  const snapshot = await db
    .collection('opportunities')
    .where('deadlineStatus', '==', 'dated')
    .where(
      'applicationDeadline',
      '>=',
      admin.firestore.Timestamp.fromDate(start)
    )
    .where(
      'applicationDeadline',
      '<',
      admin.firestore.Timestamp.fromDate(end)
    )
    .orderBy('applicationDeadline', 'asc')
    .get()

  return snapshot.docs.map((doc) => {
    const opportunity = doc.data()
    return {
      ...opportunity,
      slug: doc.id,
      applicationDeadline: asDate(
        opportunity.applicationDeadline
      ).toISOString(),
    }
  })
}

async function bufferRequest(apiKey, query, variables) {
  const response = await fetch(BUFFER_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  })
  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(
      `Buffer returned HTTP ${response.status}.`
    )
  }
  if (payload?.errors?.length) {
    throw new Error(payload.errors[0].message)
  }
  if (!payload?.data) {
    throw new Error('Buffer returned no data.')
  }
  return payload.data
}

function normalizedName(value) {
  return String(value || '')
    .trim()
    .toLocaleLowerCase()
}

async function resolveChannelId(
  apiKey,
  service,
  configuredChannelId
) {
  if (configuredChannelId) return configuredChannelId

  const organizationName =
    process.env.BUFFER_ORGANIZATION_NAME?.trim() ||
    DEFAULT_BUFFER_ORGANIZATION_NAME
  const organizationData = await bufferRequest(
    apiKey,
    ORGANIZATIONS_QUERY
  )
  const organizations =
    organizationData.account?.organizations?.filter(
      (organization) =>
        normalizedName(organization.name) ===
        normalizedName(organizationName)
    ) || []
  if (organizations.length === 0) {
    throw new Error(
      `Buffer project "${organizationName}" was not found.`
    )
  }
  if (organizations.length > 1) {
    throw new Error(
      `Buffer project "${organizationName}" is not unique.`
    )
  }

  const channelsData = await bufferRequest(
    apiKey,
    CHANNELS_QUERY,
    {
      input: { organizationId: organizations[0].id },
    }
  )
  const channels = channelsData.channels.filter(
    (channel) => channel.service === service
  )
  const serviceName =
    service[0].toUpperCase() + service.slice(1)
  if (channels.length === 0) {
    throw new Error(
      `Buffer project "${organizationName}" has no ${serviceName} channel.`
    )
  }
  if (channels.length > 1) {
    throw new Error(
      `BUFFER_${service.toUpperCase()}_CHANNEL_ID is required for multiple ${serviceName} channels.`
    )
  }
  return channels[0].id
}

async function getChannel(apiKey, channelId, service) {
  const data = await bufferRequest(apiKey, CHANNEL_QUERY, {
    input: { id: channelId },
  })
  const channel = data.channel
  const serviceName =
    service[0].toUpperCase() + service.slice(1)
  if (!channel)
    throw new Error('Buffer channel was not found.')
  if (channel.service !== service) {
    throw new Error(
      `The Buffer channel must identify ${serviceName}.`
    )
  }
  if (channel.isDisconnected) {
    throw new Error(
      `The Buffer ${serviceName} channel is disconnected.`
    )
  }
  if (channel.isLocked) {
    throw new Error(
      `The Buffer ${serviceName} channel is locked.`
    )
  }
  if (channel.isQueuePaused) {
    throw new Error(
      `The Buffer ${serviceName} queue is paused.`
    )
  }
  return channel
}

async function claimPost(db, admin, post, channelId, now) {
  const parentRef = db
    .collection(POST_COLLECTION)
    .doc(post.id)
  const ref = parentRef
    .collection('channels')
    .doc(channelId)
  return db.runTransaction(async (transaction) => {
    const [snapshot, legacySnapshot] = await Promise.all([
      transaction.get(ref),
      transaction.get(parentRef),
    ])
    const legacy =
      legacySnapshot.exists &&
      legacySnapshot.data()?.channelId === channelId
        ? legacySnapshot
        : null
    const current = snapshot.exists
      ? snapshot.data()
      : legacy?.data() || null
    const currentRef = snapshot.exists
      ? ref
      : legacy?.ref || ref
    const claimedAt = current?.claimedAt
    const activeClaim =
      current?.status === 'creating' &&
      claimedAt &&
      timestampMillis(claimedAt) >
        now.getTime() - CLAIM_TIMEOUT_MS

    if (current?.status === 'scheduled') {
      return {
        claimed: false,
        reason: 'scheduled',
        ref: currentRef,
        current,
      }
    }
    if (activeClaim) {
      return {
        claimed: false,
        reason: 'active',
        ref: currentRef,
        current,
      }
    }

    transaction.set(
      ref,
      {
        type: 'opportunity-deadline-carousel',
        status: 'creating',
        channelId,
        weekStart: post.weekStart,
        deadlineWindowStart: post.deadlineWindowStart,
        deadlineWindowEnd: post.deadlineWindowEnd,
        slides: post.slides,
        caption: post.caption,
        claimedAt: admin.firestore.Timestamp.fromDate(now),
        updatedAt:
          admin.firestore.FieldValue.serverTimestamp(),
        createdAt:
          current?.createdAt ||
          admin.firestore.FieldValue.serverTimestamp(),
        attempts: admin.firestore.FieldValue.increment(1),
        failure: null,
      },
      { merge: true }
    )
    return { claimed: true, ref }
  })
}

async function findExistingBufferPost(
  apiKey,
  channel,
  assetUrls,
  now
) {
  const startDate = new Date(now)
  startDate.setUTCDate(startDate.getUTCDate() - 7)
  const data = await bufferRequest(
    apiKey,
    RECENT_POSTS_QUERY,
    {
      input: {
        organizationId: channel.organizationId,
        filter: {
          channelIds: [channel.id],
          status: ['scheduled', 'sending', 'sent'],
          startDate: startDate.toISOString(),
        },
      },
    }
  )
  const expectedSource = assetUrls[0]
  return data.posts.edges
    .map(({ node }) => node)
    .find((post) =>
      post.assets.some(
        ({ source }) => source === expectedSource
      )
    )
}

async function createBufferPost(
  apiKey,
  channel,
  post,
  assetUrls,
  scheduledAt
) {
  const assets = assetUrls.map((url, index) => ({
    image: {
      url,
      metadata: {
        altText: post.altText[index],
      },
    },
  }))
  const data = await bufferRequest(
    apiKey,
    CREATE_POST_MUTATION,
    {
      input: {
        text: post.caption,
        channelId: channel.id,
        schedulingType: 'automatic',
        mode: scheduledAt
          ? 'customScheduled'
          : 'addToQueue',
        ...(scheduledAt ? { dueAt: scheduledAt } : {}),
        source: `sciteens:opportunity-deadlines:${post.id}:${channel.service}`,
        metadata:
          channel.service === 'instagram'
            ? {
                instagram: {
                  type: 'post',
                  shouldShareToFeed: true,
                },
              }
            : {
                facebook: {
                  type: 'post',
                },
              },
        assets,
      },
    }
  )
  const result = data.createPost
  if (result.__typename !== 'PostActionSuccess') {
    throw new Error(
      result.message || 'Buffer rejected the post.'
    )
  }
  return result.post
}

async function editBufferPost(
  apiKey,
  channel,
  post,
  assetUrls,
  dueAt
) {
  const assets = assetUrls.map((url, index) => ({
    image: {
      url,
      metadata: {
        altText: post.altText[index],
      },
    },
  }))
  const data = await bufferRequest(
    apiKey,
    EDIT_POST_MUTATION,
    {
      input: {
        id: post.bufferPostId,
        text: post.caption,
        dueAt,
        assets,
        metadata:
          channel.service === 'instagram'
            ? {
                instagram: {
                  type: 'post',
                  shouldShareToFeed: true,
                },
              }
            : {
                facebook: {
                  type: 'post',
                },
              },
      },
    }
  )
  const result = data.editPost
  if (result.__typename !== 'PostActionSuccess') {
    throw new Error(
      result.message || 'Buffer rejected the post update.'
    )
  }
  return result.post
}

async function deleteBufferPost(apiKey, postId) {
  const data = await bufferRequest(
    apiKey,
    DELETE_POST_MUTATION,
    {
      input: { id: postId },
    }
  )
  if (data.deletePost.__typename === 'MutationError') {
    throw new Error(data.deletePost.message)
  }
}

async function recordFailure(ref, admin, error) {
  await ref.set(
    {
      status: 'failed',
      failure: errorMessage(error),
      failedAt:
        admin.firestore.FieldValue.serverTimestamp(),
      updatedAt:
        admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  )
}

async function scheduleCarousel(
  db,
  admin,
  apiKey,
  channel,
  post,
  assetUrls,
  now,
  scheduledAt,
  refreshScheduled,
  replaceScheduled
) {
  const claim = await claimPost(
    db,
    admin,
    post,
    channel.id,
    now
  )
  if (
    !claim.claimed &&
    claim.reason === 'scheduled' &&
    replaceScheduled
  ) {
    if (claim.current?.bufferPostId) {
      await deleteBufferPost(
        apiKey,
        claim.current.bufferPostId
      )
    }
    await claim.ref.set(
      {
        status: 'failed',
        failure: 'Replaced by an explicit reschedule.',
        updatedAt:
          admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    )
    return scheduleCarousel(
      db,
      admin,
      apiKey,
      channel,
      post,
      assetUrls,
      now,
      scheduledAt,
      false,
      false
    )
  }
  if (!claim.claimed) {
    if (
      claim.reason === 'scheduled' &&
      refreshScheduled &&
      claim.current?.bufferPostId
    ) {
      try {
        const bufferPost = await editBufferPost(
          apiKey,
          channel,
          {
            ...post,
            bufferPostId: claim.current.bufferPostId,
          },
          assetUrls,
          scheduledAt || claim.current.bufferDueAt
        )
        await claim.ref.set(
          {
            caption: post.caption,
            bufferDueAt: bufferPost.dueAt || null,
            refreshedAt:
              admin.firestore.FieldValue.serverTimestamp(),
            updatedAt:
              admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        )
        console.log(`Updated Buffer post ${bufferPost.id}.`)
        return
      } catch (error) {
        if (errorMessage(error) === 'Document not found') {
          await claim.ref.set(
            {
              status: 'failed',
              failure:
                'Buffer post was not found during refresh.',
              updatedAt:
                admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
          )
        }
        throw error
      }
    }
    console.log(
      claim.reason === 'scheduled'
        ? `The ${channel.service} post ${post.id} is already scheduled.`
        : `The ${channel.service} post ${post.id} has an active creation claim.`
    )
    return
  }

  try {
    const recoveredPost = await findExistingBufferPost(
      apiKey,
      channel,
      assetUrls,
      now
    )
    if (recoveredPost) {
      await claim.ref.set(
        {
          status: 'scheduled',
          bufferPostId: recoveredPost.id,
          bufferDueAt: recoveredPost.dueAt || null,
          recoveredAt:
            admin.firestore.FieldValue.serverTimestamp(),
          updatedAt:
            admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      )
      console.log(
        `Recovered Buffer post ${recoveredPost.id}.`
      )
      return
    }

    const bufferPost = await createBufferPost(
      apiKey,
      channel,
      post,
      assetUrls,
      scheduledAt
    )
    await claim.ref.set(
      {
        status: 'scheduled',
        bufferPostId: bufferPost.id,
        bufferDueAt: bufferPost.dueAt || null,
        scheduledAt:
          admin.firestore.FieldValue.serverTimestamp(),
        updatedAt:
          admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    )
    console.log(
      `Scheduled ${channel.service} Buffer post ${bufferPost.id}.`
    )
  } catch (error) {
    await recordFailure(claim.ref, admin, error)
    throw error
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const repoRoot = path.resolve(__dirname, '..')
  loadEnvLocal(repoRoot)
  const projectId = requireProjectId(args)
  process.env.GCP_PROJECT_ID = projectId
  const [admin, helpers, pipeline, render] =
    await Promise.all([
      Promise.resolve(require('firebase-admin')),
      import('../lib/socialDeadlinePosts.mjs'),
      loadPipelineHelpers(),
      loadRenderSlidePng(),
    ])
  const {
    hashCarousel,
    carouselStoragePath,
    existingSlideUrl,
    uploadSlidePng,
  } = pipeline
  const renderSlidePng = render
  const db = initializeFirestore(admin, projectId)
  const now = new Date()
  const scheduledAt = scheduleAt(args.scheduleAt, now)
  const opportunities = await fetchUpcomingOpportunities(
    db,
    admin,
    now
  )
  const carousels = helpers.createDeadlineCarousels(
    opportunities,
    {
      now,
    }
  )
  if (carousels.length === 0) {
    console.log(
      'No open program deadlines occur in the next 30 days.'
    )
    return
  }

  const requestedCarousels = args.postId
    ? carousels.filter(({ id }) => id === args.postId)
    : carousels
  if (requestedCarousels.length === 0) {
    throw new Error(
      `No eligible carousel matches ${args.postId}.`
    )
  }

  if (!args.execute) {
    for (const carousel of requestedCarousels) {
      console.log(`Dry run: ${carousel.id}.`)
      console.log(
        `${carousel.slides.length} carousel images would post.`
      )
      if (scheduledAt) {
        console.log(`It would schedule for ${scheduledAt}.`)
      }
      console.log(carousel.caption)
    }
    return
  }
  const carouselsToSchedule = requestedCarousels

  const posts = await Promise.all(
    carouselsToSchedule.map(async (carousel) => {
      const version = hashCarousel(carousel)
      const altText = carousel.slides.map(
        helpers.carouselAltText
      )
      const rendered = await Promise.all(
        carousel.slides.map(async (slide, index) => {
          const path = carouselStoragePath(
            carousel.id,
            version,
            index
          )
          const existingUrl = await existingSlideUrl(path)
          if (existingUrl) return { path, url: existingUrl }
          const png = await renderSlidePng({
            slide: {
              ...slide,
              deadlineLabel:
                slide.type === 'opportunity'
                  ? helpers.formatDeadline(
                      slide.deadline
                    ) || 'See site'
                  : undefined,
            },
            position: index,
            total: carousel.slides.length - 1,
          })
          const url = await uploadSlidePng(path, png)
          return { path, url, png }
        })
      )
      return {
        ...carousel,
        version,
        altText,
        assetUrls: rendered.map(({ url }) => url),
        assetPaths: rendered.map(({ path }) => path),
      }
    })
  )

  const apiKey = requiredEnv('BUFFER_API_KEY')
  const [instagramChannelId, facebookChannelId] =
    await Promise.all([
      resolveChannelId(
        apiKey,
        'instagram',
        process.env.BUFFER_INSTAGRAM_CHANNEL_ID?.trim() ||
          process.env.BUFFER_CHANNEL_ID?.trim()
      ),
      resolveChannelId(
        apiKey,
        'facebook',
        process.env.BUFFER_FACEBOOK_CHANNEL_ID?.trim()
      ),
    ])
  const channels = await Promise.all([
    getChannel(apiKey, instagramChannelId, 'instagram'),
    getChannel(apiKey, facebookChannelId, 'facebook'),
  ])

  for (const post of posts) {
    for (const channel of channels) {
      const channelPost = {
        ...post,
        caption: helpers.deadlineCaption(
          post,
          channel.service
        ),
      }
      await scheduleCarousel(
        db,
        admin,
        apiKey,
        channel,
        channelPost,
        post.assetUrls,
        now,
        scheduledAt,
        args.refreshScheduled,
        args.replaceScheduled
      )
    }
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
