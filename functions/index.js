// Firebase
const functions = require('firebase-functions/v1')
const {
  defineSecret,
} = require('firebase-functions/params')
const admin = require('firebase-admin')
admin.initializeApp()

// Meilisearch — self-hosted replacement for the Algolia Firebase Extension
// (see functions/search.js, infra/meilisearch/). MEILI_HOST is a plain
// non-secret env var (functions/.env); the master key is Secret Manager,
// like the other third-party credentials below.
const {
  indexProject,
  deleteProjectFromIndex,
} = require('./search')
const meiliMasterKey = defineSecret('MEILI_MASTER_KEY')

// Google
const vision = require('@google-cloud/vision')

// Mailjet — functions.config() was removed in firebase-functions v7, so
// credentials are Secret Manager params instead. Secrets are only
// readable at invocation time (after being bound via
// `.runWith({ secrets: [...] })` on each export that needs them), so
// the client is built lazily rather than at module load.
const mailjetApiKey = defineSecret('MAILJET_APIKEY')
const mailjetApiSecret = defineSecret('MAILJET_APISECRET')
let mailjetClient
function getMailjet() {
  if (!mailjetClient) {
    mailjetClient = require('node-mailjet').connect(
      mailjetApiKey.value(),
      mailjetApiSecret.value()
    )
  }
  return mailjetClient
}

// Prismic
const Prismic = require('@prismicio/client')
const { firestore } = require('firebase-admin')
const prismicSecret = defineSecret('PRISMIC_SECRET')

const axios = require('axios').default
// Post to the SciTeens Slack webhook. The webhook URL is stored in
// the SLACK_WEBHOOK secret (set via
// `firebase functions:secrets:set SLACK_WEBHOOK`). Never hardcode
// the webhook — the repo is public.
const slackWebhook = defineSecret('SLACK_WEBHOOK')
async function slackPost(text) {
  try {
    const webhook = slackWebhook.value()
    if (!webhook) {
      console.warn(
        'Slack webhook not configured; skipping post'
      )
      return
    }
    await axios.post(webhook, { text })
  } catch (err) {
    console.error(
      'Slack post failed:',
      (err && err.statusCode) || err
    )
  }
}

// Slugify
let slugify

/*
    Function newProject()
    
    Handles the operations necessary to log the new project
    and notify user's subscribed to the project of its update.

*/
exports.newProject = functions
  .runWith({ secrets: [meiliMasterKey] })
  .firestore.document('projects/{projectID}')
  .onCreate((snap) => indexProject(snap.id, snap.data()))

/*
    Function updateProject()

    Keeps the Meilisearch `projects` index in sync whenever a
    project's fields are edited.
*/
exports.updateProject = functions
  .runWith({ secrets: [meiliMasterKey] })
  .firestore.document('projects/{projectID}')
  .onUpdate((change) =>
    indexProject(change.after.id, change.after.data())
  )

/*
    Function deleteProject()
    
    Handles the operations necessary when a project is deleted,
    such as removing it from the Meilisearch index.

*/

exports.deleteProject = functions
  .runWith({ secrets: [meiliMasterKey] })
  .firestore.document('projects/{projectID}')
  .onDelete(async (event, context) => {
    async function deleteCollection(
      db,
      collectionPath,
      batchSize
    ) {
      const collectionRef = db.collection(collectionPath)
      const query = collectionRef
        .orderBy('__name__')
        .limit(batchSize)

      return new Promise((resolve, reject) => {
        deleteQueryBatch(db, query, resolve).catch(reject)
      })
    }

    async function deleteQueryBatch(db, query, resolve) {
      const snapshot = await query.get()

      const batchSize = snapshot.size
      if (batchSize === 0) {
        // When there are no documents left, we are done
        resolve()
        return
      }

      // Delete documents in a batch
      const batch = db.batch()
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref)
      })
      await batch.commit()

      // Recurse on the next process tick, to avoid
      // exploding the stack.
      process.nextTick(() => {
        deleteQueryBatch(db, query, resolve)
      })
    }
    // Delete the discussion subcollection
    await deleteCollection(
      admin.firestore(),
      `/projects/${context.params.projectID}/discussion`,
      500
    )

    // Delete the files subcollection (Firestore records pointing
    // at the project's Storage objects)
    await deleteCollection(
      admin.firestore(),
      `/projects/${context.params.projectID}/files`,
      500
    )

    // Delete the underlying Storage objects the files subcollection
    // pointed at. Logged, not thrown, so a Storage-side failure never
    // fails the trigger — the Firestore doc is already gone by now.
    try {
      await admin
        .storage()
        .bucket()
        .deleteFiles({
          prefix: `projects/${context.params.projectID}/`,
        })
    } catch (err) {
      console.error(
        `deleteProject: failed to delete Storage objects for projects/${context.params.projectID}/`,
        err
      )
    }

    await deleteProjectFromIndex(context.params.projectID)
  })

/*
    Function deleteProfile()
    
    Handles the operations necessary when a profile is deleted,
    such as removing its files subcollection, Storage objects,
    and profile-pictures record.

*/

exports.deleteProfile = functions.firestore
  .document('profiles/{uid}')
  .onDelete(async (event, context) => {
    async function deleteCollection(
      db,
      collectionPath,
      batchSize
    ) {
      const collectionRef = db.collection(collectionPath)
      const query = collectionRef
        .orderBy('__name__')
        .limit(batchSize)

      return new Promise((resolve, reject) => {
        deleteQueryBatch(db, query, resolve).catch(reject)
      })
    }

    async function deleteQueryBatch(db, query, resolve) {
      const snapshot = await query.get()

      const batchSize = snapshot.size
      if (batchSize === 0) {
        // When there are no documents left, we are done
        resolve()
        return
      }

      // Delete documents in a batch
      const batch = db.batch()
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref)
      })
      await batch.commit()

      // Recurse on the next process tick, to avoid
      // exploding the stack.
      process.nextTick(() => {
        deleteQueryBatch(db, query, resolve)
      })
    }

    // Delete the files subcollection (Firestore records pointing
    // at the profile's Storage objects)
    await deleteCollection(
      admin.firestore(),
      `/profiles/${context.params.uid}/files`,
      500
    )

    // Delete the underlying Storage objects the files subcollection
    // pointed at. Logged, not thrown, so a Storage-side failure never
    // fails the trigger — the Firestore doc is already gone by now.
    try {
      await admin
        .storage()
        .bucket()
        .deleteFiles({
          prefix: `profiles/${context.params.uid}/`,
        })
    } catch (err) {
      console.error(
        `deleteProfile: failed to delete Storage objects for profiles/${context.params.uid}/`,
        err
      )
    }

    // Delete the corresponding profile-pictures record, if any
    try {
      await admin
        .firestore()
        .collection('profile-pictures')
        .doc(context.params.uid)
        .delete()
    } catch (err) {
      console.error(
        `deleteProfile: failed to delete profile-pictures/${context.params.uid}`,
        err
      )
    }
  })

/*
    Function newUser()

    Handles the operations necessary when a user joins
    the website
*/

exports.newUser = functions
  .runWith({
    secrets: [mailjetApiKey, mailjetApiSecret],
  })
  .auth.user()
  .onCreate(async (user) => {
    await Promise.all([
      getMailjet()
        .post('contact', { version: 'v3' })
        .request({
          IsExcludedFromCampaigns: 'false',
          Name: user.displayName,
          Email: user.email,
        })
        .then((result) => {
          console.log(result.body)
        })
        .catch((err) => {
          console.log(err.statusCode)
        }),
      // Create a user ref in the database to
      // quickly query emails
      admin
        .firestore()
        .collection('emails')
        .doc(user.uid)
        .set({
          email: user.email,
        }),
    ])
    // Check if the user has a display photo
    if (user.photoURL) {
      return admin
        .firestore()
        .collection('profile-pictures')
        .doc(user.uid)
        .set({
          picture: user.photoURL,
        })
    } else {
      return 'Success!'
    }
  })

/*
    Function newProfile()

    Handles the operations necessary when a user joins
    the website (related to their firebase profile)
*/

exports.newProfile = functions
  .runWith({
    secrets: [mailjetApiKey, mailjetApiSecret],
  })
  .firestore.document('profiles/{profileID}')
  .onCreate(async (profile) => {
    let id = profile.id
    let data = { ...profile.data() }

    // Send email verification
    const user = await admin.auth().getUser(id)
    const email = user.email
    const actionCodeSettings = {
      url: 'https://sciteens.com/',
      handleCodeInApp: false,
    }
    const verification_link = await admin
      .auth()
      .generateEmailVerificationLink(
        email,
        actionCodeSettings
      )
    const request = getMailjet()
      .post('send', { version: 'v3.1' })
      .request({
        Messages: [
          {
            From: {
              Email: 'noreply@sciteens.com',
              Name: 'SciTeens',
            },
            To: [
              {
                Email: email,
                Name: data.display ? data.display : email,
              },
            ],
            TemplateID: 1267257,
            TemplateLanguage: true,
            Subject: 'Verify Email',
            Variables: {
              link: verification_link,
            },
          },
        ],
      })
    await request

    // Add to all contact list
    await getMailjet()
      .post('listrecipient', { version: 'v3' })
      .request({
        IsUnsubscribed: 'false',
        ContactAlt: email,
        ListID: '10251294',
      })

    // Handle sending emails based on user type
    switch (data.position) {
      case 'Educator':
      case 'Professional':
      case 'Researcher':
      case 'Prefer not to answer':
        await admin
          .auth()
          .setCustomUserClaims(id, { mentor: true })
        await getMailjet()
          .post('listrecipient', { version: 'v3' })
          .request({
            IsUnsubscribed: 'false',
            ContactAlt: email,
            ListID: '10251293',
          })

        await getMailjet()
          .post('send', { version: 'v3.1' })
          .request({
            Messages: [
              {
                From: {
                  Email: 'noreply@sciteens.com',
                  Name: 'SciTeens',
                },
                To: [
                  {
                    Email: email,
                    Name: user.displayName
                      ? user.displayName
                      : email,
                  },
                ],
                TemplateID: 3336350,
                TemplateLanguage: true,
                Subject: 'Welcome to SciTeens!',
                Variables: {
                  displayName: user.displayName,
                },
              },
            ],
          })
        break
      default:
        await getMailjet()
          .post('listrecipient', { version: 'v3' })
          .request({
            IsUnsubscribed: 'false',
            ContactAlt: user.email,
            ListID: '10251292',
          })

        // Send student welcome
        await getMailjet()
          .post('send', { version: 'v3.1' })
          .request({
            Messages: [
              {
                From: {
                  Email: 'noreply@sciteens.com',
                  Name: 'SciTeens',
                },
                To: [
                  {
                    Email: email,
                    Name: user.displayName
                      ? user.displayName
                      : email,
                  },
                ],
                TemplateID: 3336347,
                TemplateLanguage: true,
                Subject: 'Welcome to SciTeens!',
                Variables: {
                  displayName: user.displayName,
                },
              },
            ],
          })
        break
    }
  })

/*
    Function newProgram()
    
    Handles the operations necessary to log the new program.
*/

exports.newProgram = functions.firestore
  .document('programs/{programID}')
  .onCreate((event) => {
    let id = event.id
    let data = { ...event.data() }

    // Add the minified version of the program to firebase
    return admin
      .firestore()
      .collection('programs-minified')
      .doc(id)
      .set({
        name: data.name,
        loc: data.loc,
        img: data.img,
        about: data.about,
        start: data.start,
        end: data.end,
        app: data.app,
        coord: data.coord,
        geo: data.geo,
        slug: data.slug,
        grade_h: data.grade_h,
        grade_l: data.grade_l,
        fields: data.fields,
        hits: data.hits,
      })
      .then(() => {
        // Add the program to algolia
        let data_minified = {
          name: data.name,
          loc: data.loc,
          img: data.img,
          about: data.about,
          start: data.start,
          end: data.end,
          app: data.app,
          coord: data.coord,
          _geoloc: data.coord,
          geo: data.geo,
          slug: data.slug,
          grade_h: data.grade_h,
          grade_l: data.grade_l,
          fields: data.fields,
          hits: data.hits,
        }
      })
  })

/*
    Function deleteProgram()
    
    Handles the operations necessary when a program is deleted,
    such as removing its index from Algolia
*/
exports.deleteProgram = functions.firestore
  .document('programs/{programID}')
  .onDelete((event) => {
    let id = event.id

    // Remove the minified version of the project
    admin
      .firestore()
      .collection('programs-minified')
      .doc(id)
      .delete()
  })

/*
    Function updateProgram()

    Handles the operations necessary when a program is 
    updated, 

*/

exports.updateProgram = functions.firestore
  .document('programs/{programID}')
  .onUpdate((event) => {
    let id = event.after.id
    let data = { ...event.after.data() }
    let data_minified = {
      name: data.name,
      loc: data.loc,
      img: data.img,
      about: data.about,
      start: data.start,
      end: data.end,
      app: data.app,
      coord: data.coord,
      _geoloc: data.coord,
      geo: data.geo,
      slug: data.slug,
      grade_h: data.grade_h,
      grade_l: data.grade_l,
      fields: data.fields,
      hits: data.hits,
    }
    // Update minified version of the program
    admin
      .firestore()
      .collection('programs-minified')
      .doc(id)
      .update({
        name: data.name,
        loc: data.loc,
        img: data.img,
        about: data.about,
        start: data.start,
        end: data.end,
        app: data.app,
        coord: data.coord,
        _geoloc: data.coord,
        geo: data.geo,
        slug: data.slug,
        grade_h: data.grade_h,
        grade_l: data.grade_l,
        fields: data.fields,
        hits: data.hits,
      })
  })

/*
    Function newDiscussion()

    Handles new discussion being added to a project 

*/

exports.newDiscussion = functions
  .runWith({
    secrets: [mailjetApiKey, mailjetApiSecret],
  })
  .firestore.document(
    'projects/{projectID}/discussion/{feedbackID}'
  )
  .onCreate(async (event, context) => {
    // Determine if a reply
    if (event.data().reply_to_id) {
      // Determine if user who submitted is a mentor or student
      const user = await admin
        .auth()
        .getUser(event.data().uid)

      // Fetch the original discussion comment
      const originalComment = await admin
        .firestore()
        .doc(
          `projects/${
            context.params.projectID
          }/discussion/${event.data().reply_to_id}`
        )
        .get()

      const originalUser = await admin
        .auth()
        .getUser(originalComment.data().uid)
      // PII redacted from logs
      console.log(
        'Sending discussion email to user ' +
          originalComment.data().uid
      )
      return getMailjet()
        .post('send', { version: 'v3.1' })
        .request({
          Messages: [
            {
              From: {
                Email: 'noreply@sciteens.com',
                Name: 'SciTeens',
              },
              To: [
                {
                  Email: originalUser.email,
                  Name: originalUser.displayName,
                },
              ],
              TemplateID: 1525200,
              TemplateLanguage: true,
              Subject: 'New Feedback',
              Variables: {
                studentOrMentor:
                  user.customClaims &&
                  user.customClaims['mentor']
                    ? 'mentor'
                    : 'student',
                projectLink: `https://sciteens.com/project/${context.params.projectID}#${event.id}`,
              },
            },
          ],
        })
    }
  })

/*
    Function scheduledProgramEmailer()

    Runs every day at 12:05 AM Eastern. Fetches events from the
    event-applications collection, and determines if any events have
    upcoming deadlines. If so, it informs all subscribers via email and
    then deletes.
*/
exports.scheduledProgramEmailer = functions
  .runWith({
    secrets: [mailjetApiKey, mailjetApiSecret],
  })
  .pubsub.schedule('5 0 * * *')
  .timeZone('America/New_York') // Users can choose timezone - default is America/Los_Angeles
  .onRun((context) => {
    // Fetch the current Unix Timestamp
    let date = new Date().getTime()
    admin
      .firestore()
      .collection('programs')
      .orderBy('application')
      .startAt(0)
      .endAt(date + 604800000)
      .get()
      .then((res) => {
        res.forEach((event) => {
          // Send an email to each subscriber
          let subscribers = event.data().subscribers
          let link =
            'https://sciteens.com/program/' + event.id

          subscribers.forEach((sub) => {
            // Fetch the user's email
            admin
              .auth()
              .getUser(sub)
              .then((user) => {
                // Send using Mailjet API v3
                getMailjet()
                  .post('send', { version: 'v3.1' })
                  .request({
                    Messages: [
                      {
                        From: {
                          Email: 'noreply@sciteens.com',
                          Name: 'SciTeens',
                        },
                        To: [
                          {
                            Email: user.email,
                            Name: user.displayName
                              ? user.displayName
                              : user.email,
                          },
                        ],
                        TemplateID: 1219486,
                        TemplateLanguage: true,
                        Subject:
                          'Upcoming Program Application',
                        Variables: {
                          link: link,
                        },
                      },
                    ],
                  })
                // Add notification
                admin
                  .firestore()
                  .collection('notifications')
                  .doc(user.uid)
                  .update({
                    notifications:
                      admin.firestore.FieldValue.arrayUnion(
                        {
                          date: new Date().getTime(),
                          message:
                            'Upcoming program application for ' +
                            event.data().name,
                          type: 'program',
                          program_id: event.id,
                          program_slug: event.data().slug,
                          seen: false,
                        }
                      ),
                  })
              })
          })
        })
      })
    return null
  })

/*
    Function fileUpload()

    Runs every time a file is uploaded. Scans images and PDFs
    for inappropriate content (adult, violent, spoof, or racy)
    via Cloud Vision SafeSearch, and deletes the file if any is
    detected.

    Images use the synchronous safeSearchDetection endpoint.
    PDFs use batchAnnotateFiles (files:annotate), which runs
    SAFE_SEARCH_DETECTION on up to 5 pages per file and returns
    per-page results inline. If any scanned page is flagged, the
    entire file is deleted.
*/

exports.fileUpload = functions.storage
  .object()
  .onFinalize(async (object) => {
    const contentType = object.contentType
    if (!contentType) {
      return console.log('No content type')
    }

    const isImage = contentType.startsWith('image/')
    const isPdf = contentType === 'application/pdf'
    if (!isImage && !isPdf) {
      return console.log(
        'Unsupported type for SafeSearch: ' + contentType
      )
    }

    // Likelihood levels the API may return, ordered from least to
    // most likely. Anything above VERY_UNLIKELY is treated as a hit.
    const SAFE_STRINGS = ['UNLIKELY', 'VERY_UNLIKELY']

    function isSafe(annotation) {
      return (
        SAFE_STRINGS.indexOf(annotation.adult) >= 0 &&
        SAFE_STRINGS.indexOf(annotation.spoof) >= 0 &&
        SAFE_STRINGS.indexOf(annotation.violence) >= 0 &&
        SAFE_STRINGS.indexOf(annotation.racy) >= 0
      )
    }

    const visionClient = new vision.ImageAnnotatorClient()
    let safe = false

    if (isImage) {
      const [data] = await visionClient.safeSearchDetection(
        `gs://${object.bucket}/${object.name}`
      )
      safe = isSafe(data.safeSearchAnnotation)
    } else {
      // files:annotate (synchronous) requires inline file content
      // rather than a GCS URI, so download the object first.
      const [file] = await admin
        .storage()
        .bucket(object.bucket)
        .file(object.name)
        .download()

      // batchAnnotateFiles scans up to 5 pages per file; if any
      // page is flagged, the whole file is rejected. PDFs uploaded
      // through the client are capped at 8MB by storage.rules, so
      // this covers the vast majority of documents.
      const [result] =
        await visionClient.batchAnnotateFiles({
          requests: [
            {
              inputConfig: {
                mimeType: 'application/pdf',
                content: file,
              },
              features: [{ type: 'SAFE_SEARCH_DETECTION' }],
              pages: [1, 2, 3, 4, 5],
            },
          ],
        })

      const pageResponses = result.responses[0].responses
      safe = pageResponses.every(
        (page) =>
          page.safeSearchAnnotation &&
          isSafe(page.safeSearchAnnotation)
      )
    }

    if (!safe) {
      console.log(
        'Offensive content found in ' +
          object.name +
          '. Deleting...'
      )
      return admin
        .storage()
        .bucket(object.bucket)
        .file(object.name)
        .delete()
    }

    console.log(
      'No offensive content found for ' + object.name
    )

    // File passed moderation. Make it public and update the
    // corresponding Firestore record based on the upload path.
    // NOTE: profilephoto/ and project/ are legacy singular prefixes
    // from the original implementation; current client uploads use
    // profiles/ and projects/ (plural) per storage.rules. Only
    // courses/ matches today.
    if (object.name.startsWith('profilephoto/')) {
      let uid = object.name.split('/')[1].split('.')[0]
      return admin
        .storage()
        .bucket(object.bucket)
        .file(object.name)
        .makePublic()
        .then(() => {
          return admin
            .firestore()
            .collection('profile-pictures')
            .doc(uid)
            .set({ picture: object.mediaLink })
        })
        .then(() => {
          console.log(
            'Set the profile photo for user ' + uid
          )
        })
        .catch((err) => {
          console.error(
            'Error setting profile photo: ' + err
          )
        })
    } else if (object.name.startsWith('project/')) {
      let projectId = object.name.split('/')[1]
      return admin
        .storage()
        .bucket(object.bucket)
        .file(object.name)
        .makePublic()
        .then(() => {
          return admin
            .firestore()
            .collection('projects')
            .doc(projectId)
            .update({ photo: object.mediaLink })
        })
        .then(() => {
          console.log(
            'Successfully set project photo for project ' +
              projectId
          )
        })
        .catch((err) => {
          console.error(
            'Unsuccessfully set project photo for project ' +
              projectId +
              ': ' +
              err
          )
        })
    } else if (object.name.startsWith('courses/')) {
      let courseId = object.name.split('/')[1]
      return admin
        .storage()
        .bucket(object.bucket)
        .file(object.name)
        .makePublic()
        .then(() => {
          return admin
            .firestore()
            .collection('courses')
            .doc(courseId)
            .update({ photo: object.mediaLink })
        })
        .then(() => {
          console.log(
            'Set the course photo for course ' + courseId
          )
        })
        .catch((err) => {
          console.error(
            'Error setting course photo: ' + err
          )
        })
    }
  })

/*
    Function newProjectInvite()
    
    Handles the operations necessary when a new project invite is created
*/
exports.newProjectInvite = functions
  .runWith({
    secrets: [mailjetApiKey, mailjetApiSecret],
  })
  .firestore.document('project-invites/{projectID}')
  .onCreate((event) => {
    let id = event.id
    let emails = event.data().emails
    let title = event.data().title

    emails.forEach((email) => {
      // Fetch the user from email
      admin
        .auth()
        .getUserByEmail(email.trim())
        .then((user) => {
          // Fetch the user's profile, and add them to the project
          admin
            .firestore()
            .collection('profiles')
            .doc(user.uid)
            .get()
            .then((profile) => {
              return admin
                .firestore()
                .collection('projects')
                .doc(id)
                .update({
                  member_arr:
                    admin.firestore.FieldValue.arrayUnion({
                      uid: user.uid,
                      display: user.displayName,
                      slug: profile.data().slug
                        ? profile.data().slug
                        : '',
                    }),
                })
            })
            .then(() => {
              console.log(
                'Added user to project: ' + user.uid
              )
              return admin
                .firestore()
                .collection('projects')
                .doc(id)
                .update({
                  member_uids:
                    admin.firestore.FieldValue.arrayUnion(
                      user.uid
                    ),
                })
            })
        })
        .catch((err) => {
          console.log(err)
        })

      // Email the user that they've been added to a project
      // Send an email to the user
      getMailjet()
        .post('send', { version: 'v3.1' })
        .request({
          Messages: [
            {
              From: {
                Email: 'noreply@sciteens.com',
                Name: 'SciTeens',
              },
              To: [
                {
                  Email: email,
                  Name: email,
                },
              ],
              TemplateID: 1373653,
              TemplateLanguage: true,
              Subject: 'Project Update',
              Variables: {
                projectName: title,
                projectLink:
                  'https://sciteens.com/project/' +
                  event.id,
              },
            },
          ],
        })
        .catch((err) => {
          console.log('mailjet error:' + err)
        })
    })
    // Delete project invite once finished
    return admin
      .firestore()
      .collection('project-invites')
      .doc(id)
      .delete()
  })

/*
    Function updateUserStats()

    Runs once every week at 12:05 AM Eastern on Sunday. Counts
    the total number of mentors and students on the platform at 
    any given time. 
*/
exports.updateUserStats = functions
  .runWith({ secrets: [slackWebhook] })
  .pubsub.schedule('0 0 * * 0')
  .timeZone('America/New_York')
  .onRun(async (context) => {
    // Fetch all users on the platform
    var mentors = 0
    var students = 0
    var ethnicities = []
    var genders = []
    var races = []

    await admin
      .auth()
      .listUsers()
      .then(async (res) => {
        res.users.forEach(async (user) => {
          console.log('Checking user ' + user.uid)
          // Determine if the user is a mentor
          if (
            user.customClaims &&
            user.customClaims['mentor']
          ) {
            mentors += 1
          } else {
            students += 1
          }

          await admin
            .firestore()
            .collection('profiles')
            .doc(user.uid)
            .get()
            .then((student) => {
              if (student.data()?.race) {
                races.push(student.data().race)
              }

              if (student.data()?.ethnicity) {
                ethnicities.push(student.data().ethnicity)
              }

              if (student.data()?.gender) {
                genders.push(student.data().gender)
              }
            })
        })
      })
      .then(async () => {
        // Update firebase to store the user counts
        await Promise.all([
          admin
            .firestore()
            .collection('statistics')
            .doc('mentors')
            .update({
              count: mentors,
            }),
          admin
            .firestore()
            .collection('statistics')
            .doc('students')
            .update({
              count: students,
            }),
          slackPost(
            `Weekly Update: There are ${students} students and ${mentors} mentors!`
          ),
        ])
      })
      .then(() => {
        // Count occurences for gender, races, and ethnicities
        counts_gender = {}
        counts_ethnicity = {}
        counts_race = {}

        for (const g of genders) {
          counts_gender[g] = counts_gender[g]
            ? counts_gender[g] + 1
            : 1
        }

        for (const r of races) {
          counts_race[r] = counts_race[r]
            ? counts_race[r] + 1
            : 1
        }

        for (const e of ethnicities) {
          counts_ethnicity[e] = counts_ethnicity[e]
            ? counts_ethnicity[e] + 1
            : 1
        }
      })
      .then(async () => {
        await Promise.all([
          admin
            .firestore()
            .collection('statistics')
            .doc('ethnicity')
            .update({
              count: counts_ethnicity,
            }),
          admin
            .firestore()
            .collection('statistics')
            .doc('race')
            .update({
              count: counts_race,
            }),
          admin
            .firestore()
            .collection('statistics')
            .doc('gender')
            .update({
              count: counts_gender,
            }),
        ])
      })
      .then(async () => {
        await slackPost(
          `Weekly Update: Here are the demographic breakdowns.\nEthnicity:${JSON.stringify(
            counts_ethnicity,
            null,
            2
          )}\nGender:${JSON.stringify(
            counts_gender,
            null,
            2
          )}\nRace:${JSON.stringify(counts_race, null, 2)}`
        )
      })
  })

/*
    Function  newCourse()

    Runs when a new course is added to Prismic. 
*/
exports.newCourse = functions
  .runWith({ secrets: [prismicSecret] })
  .https.onRequest(async (request, response) => {
    // Verify the Prismic webhook secret. Prismic includes the configured
    // secret as the `secret` field in the JSON body (not an HMAC header).
    // Stored in the PRISMIC_SECRET secret (set via
    // `firebase functions:secrets:set PRISMIC_SECRET`).
    const crypto = require('crypto')
    const expected = prismicSecret.value() || ''
    const provided =
      (request.body && request.body.secret) || ''
    if (!expected || provided.length !== expected.length) {
      return response.status(401).send('Unauthorized')
    }
    // Constant-time compare to avoid timing attacks
    try {
      if (
        !crypto.timingSafeEqual(
          Buffer.from(provided),
          Buffer.from(expected)
        )
      ) {
        return response.status(401).send('Unauthorized')
      }
    } catch (err) {
      return response.status(401).send('Unauthorized')
    }

    // Validate the document id shape before interpolating into the query
    const document_id =
      request.body &&
      request.body.documents &&
      request.body.documents[0]
    if (
      !document_id ||
      !/^[A-Za-z0-9_-]{1,128}$/.test(document_id)
    ) {
      return response
        .status(400)
        .send('Invalid document id')
    }
    const client = Prismic.client(
      'https://sciteens.cdn.prismic.io/api'
    )
    await client
      .query(`[at(document.id, "${document_id}")]`)
      .then((res) => {
        let course_data = res.results[0]

        const start = new Date(
          course_data.data.course.start.value
        ).toISOString()
        const end = new Date(
          course_data.data.course.end.value
        ).toISOString()
        const enroll_by = new Date(
          course_data.data.course.enroll_by.value
        ).toISOString()
        const course_name =
          course_data.data.course.name.value[0].text

        if (course_data.type == 'course') {
          console.log('course detected')

          // Detect if course exists
          return admin
            .firestore()
            .collection('courses')
            .doc(course_data.slugs[0])
            .get()
            .then((res) => {
              if (res.exists) {
                // Update
                return admin
                  .firestore()
                  .collection('courses')
                  .doc(course_data.slugs[0])
                  .set(
                    {
                      slug: course_data.slugs[0],
                      start: start,
                      end: end,
                      enroll_by: enroll_by,
                      name: course_name,
                    },
                    { merge: true }
                  )
                  .then(() => {
                    response
                      .status(200)
                      .send('Successful update')
                  })
                  .catch((err) => {
                    console.error(
                      'newCourse update failed:',
                      err
                    )
                    response
                      .status(500)
                      .send('Failed to update course')
                  })
              } else {
                // Create
                return admin
                  .firestore()
                  .collection('courses')
                  .doc(course_data.slugs[0])
                  .create({
                    slug: course_data.slugs[0],
                    start: start,
                    end: end,
                    enroll_by: enroll_by,
                    enrolled: [],
                    name: course_name,
                  })
                  .then(() => {
                    response
                      .status(200)
                      .send('Successful course creation')
                  })
                  .catch((err) => {
                    console.error(
                      'newCourse create failed:',
                      err
                    )
                    response
                      .status(500)
                      .send('Failed to create course')
                  })
              }
            })
        } else {
          response
            .status(200)
            .send('Not a course, ignoring update')
        }
      })
      .catch((err) => {
        console.error(
          'newCourse prismic lookup failed:',
          err
        )
        response.status(400).send('Document not found')
      })
  })
