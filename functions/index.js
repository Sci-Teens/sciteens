// Firebase
const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

// Google
const vision = require("@google-cloud/vision");

// Mailjet
const mailjet = require("node-mailjet").connect(
    functions.config().mailjet.apikey,
    functions.config().mailjet.apisecret
);

// Prismic
const Prismic = require("@prismicio/client");
const { firestore } = require("firebase-admin");

// Slugify
let slugify;

/*
    Function newProject()
    
    Handles the operations necessary to log the new project
    and notify user's subscribed to the project of its update.

*/
exports.newProject = functions.firestore
    .document("projects/{projectID}")
    .onCreate((event) => { });

/*
    Function deleteProject()
    
    Handles the operations necessary when a project is deleted,
    such as removing its index from Algolia

*/

exports.deleteProject = functions.firestore
    .document("projects/{projectID}")
    .onDelete(async (event) => {
        async function deleteCollection(db, collectionPath, batchSize) {
            const collectionRef = db.collection(collectionPath);
            const query = collectionRef.orderBy('__name__').limit(batchSize);

            return new Promise((resolve, reject) => {
                deleteQueryBatch(db, query, resolve).catch(reject);
            });
        }

        async function deleteQueryBatch(db, query, resolve) {
            const snapshot = await query.get();

            const batchSize = snapshot.size;
            if (batchSize === 0) {
                // When there are no documents left, we are done
                resolve();
                return;
            }

            // Delete documents in a batch
            const batch = db.batch();
            snapshot.docs.forEach((doc) => {
                batch.delete(doc.ref);
            });
            await batch.commit();

            // Recurse on the next process tick, to avoid
            // exploding the stack.
            process.nextTick(() => {
                deleteQueryBatch(db, query, resolve);
            });
        }
        // Delete the collection for feedback
        await deleteCollection(admin.firestore(), `/projects/${projectID}/feedback`)
    });

/*
    Function newUser()

    Handles the operations necessary when a user joins
    the website
*/

exports.newUser = functions.auth.user().onCreate(async (user) => {
    await Promise.all([
        mailjet
            .post("contact", { version: "v3" })
            .request({
                IsExcludedFromCampaigns: "false",
                Name: user.displayName,
                Email: user.email,
            })
            .then((result) => {
                console.log(result.body);
            })
            .catch((err) => {
                console.log(err.statusCode);
            }),
        // Create a user ref in the database to
        // quickly query emails
        admin.firestore().collection("emails").doc(user.uid).set({
            email: user.email,
        }),
    ]);
    // Check if the user has a display photo
    if (user.photoURL) {
        return admin.firestore().collection('profile-pictures').doc(user.uid).set({
            picture: user.photoURL
        })
    }

    else {
        return "Success!"
    }
});

/*
    Function newProfile()

    Handles the operations necessary when a user joins
    the website (related to their firebase profile)
*/

exports.newProfile = functions.firestore
    .document("profiles/{profileID}")
    .onCreate((profile) => {
        let id = profile.id;
        let data = { ...profile.data() };

        // Determine if the user is a mentor or not
        if (data.mentor) {
            // Give the user a mentor token
            admin
                .auth()
                .setCustomUserClaims(id, { mentor: true })
                .then(() => {
                    // Get the user's email
                    admin
                        .auth()
                        .getUser(id)
                        .then((user) => {
                            let email = user.email;
                            const actionCodeSettings = {
                                url: "https://sciteens.org/",
                                handleCodeInApp: false,
                            };
                            // Send the user an email verification
                            admin
                                .auth()
                                .generateEmailVerificationLink(email, actionCodeSettings)
                                .then((link) => {
                                    const request = mailjet
                                        .post("send", { version: "v3.1" })
                                        .request({
                                            Messages: [
                                                {
                                                    From: {
                                                        Email: "noreply@sciteens.org",
                                                        Name: "SciTeens",
                                                    },
                                                    To: [
                                                        {
                                                            Email: email,
                                                            Name: data.display ? data.display : email,
                                                        },
                                                    ],
                                                    TemplateID: 1267257,
                                                    TemplateLanguage: true,
                                                    Subject: "Verify Email",
                                                    Variables: {
                                                        link: link,
                                                    },
                                                },
                                            ],
                                        });
                                    return request
                                        .then((result) => {
                                            console.log(result.body);

                                            // Send mentor welcome email
                                            return mailjet.post("send", { version: "v3.1" }).request({
                                                Messages: [
                                                    {
                                                        From: {
                                                            Email: "noreply@sciteens.org",
                                                            Name: "SciTeens",
                                                        },
                                                        To: [
                                                            {
                                                                Email: email,
                                                                Name: data.display ? data.display : email,
                                                            },
                                                        ],
                                                        TemplateID: 1664806,
                                                        TemplateLanguage: true,
                                                        Subject: "Welcome to SciTeens!",
                                                        Variables: {
                                                            displayName: data.display ? data.display : email,
                                                        },
                                                    },
                                                ],
                                            });
                                        })
                                        .then(() => {
                                            // Add contact to mentor email list
                                            return mailjet
                                                .post("listrecipient", { version: "v3" })
                                                .request({
                                                    IsUnsubscribed: "false",
                                                    ContactAlt: email,
                                                    ListID: "10251293",
                                                });
                                        })
                                        .then(() => {
                                            // Add contact to all email list
                                            return mailjet
                                                .post("listrecipient", { version: "v3" })
                                                .request({
                                                    IsUnsubscribed: "false",
                                                    ContactAlt: email,
                                                    ListID: "10251294",
                                                });
                                        })
                                        .catch((err) => {
                                            console.error(err.statusCode);
                                            console.error(err);
                                        });
                                })
                                .catch((err) => {
                                    console.error(err);
                                })
                                .catch((err) => {
                                    console.log(err);
                                });
                        })
                        .catch((err) => {
                            console.log(err);
                        });
                })
                .catch((err) => {
                    return err;
                });
        }

        // Send welcome email to student
        else {
            return admin
                .auth()
                .getUser(id)
                .then((user) => {
                    // Send the user a welcome email
                    mailjet
                        .post("send", { version: "v3.1" })
                        .request({
                            Messages: [
                                {
                                    From: {
                                        Email: "noreply@sciteens.org",
                                        Name: "SciTeens",
                                    },
                                    To: [
                                        {
                                            Email: user.email,
                                            Name: user.displayName ? user.displayName : user.email,
                                        },
                                    ],
                                    TemplateID: 1219498,
                                    TemplateLanguage: true,
                                    Subject: "Welcome to SciTeens!",
                                    Variables: {
                                        displayName: user.displayName
                                            ? user.displayName
                                            : user.email,
                                    },
                                },
                            ],
                        })
                        .then((result) => {
                            console.log(result.body);

                            // Add contact to student email list
                            return mailjet.post("listrecipient", { version: "v3" }).request({
                                IsUnsubscribed: "false",
                                ContactAlt: user.email,
                                ListID: "10251292",
                            });
                        })
                        .then(() => {
                            // Add contact to all email list
                            return mailjet.post("listrecipient", { version: "v3" }).request({
                                IsUnsubscribed: "false",
                                ContactAlt: user.email,
                                ListID: "10251294",
                            });
                        })
                        .catch((err) => {
                            console.error(err.statusCode);
                            console.error(err);
                        });
                });
        }
    });

/*
    Function newProgram()
    
    Handles the operations necessary to log the new program.
*/

exports.newProgram = functions.firestore
    .document("programs/{programID}")
    .onCreate((event) => {
        let id = event.id;
        let data = { ...event.data() };

        // Add the minified version of the program to firebase
        return admin
            .firestore()
            .collection("programs-minified")
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
                };
            });
    });

/*
    Function deleteProgram()
    
    Handles the operations necessary when a program is deleted,
    such as removing its index from Algolia
*/
exports.deleteProgram = functions.firestore
    .document("programs/{programID}")
    .onDelete((event) => {
        let id = event.id;

        // Remove the minified version of the project
        admin.firestore().collection("programs-minified").doc(id).delete();
    });

/*
    Function updateProgram()

    Handles the operations necessary when a program is 
    updated, 

*/

exports.updateProgram = functions.firestore
    .document("programs/{programID}")
    .onUpdate((event) => {
        let id = event.after.id;
        let data = { ...event.after.data() };
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
        };
        // Update minified version of the program
        admin.firestore().collection("programs-minified").doc(id).update({
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
        });
    });

/*
    Function newDiscussion()

    Handles new discussion being added to a project 

*/

exports.newDiscussion = functions.firestore
    .document('projects/{projectID}/discussion/{feedbackID}')
    .onCreate(async (event) => {
        // Determine if a reply
        if (event.data().reply_to_id) {
            // Determine if user who submitted is a mentor or student 
            const user = await admin.auth().getUser(event.data().uid)

            // Fetch the original discussion comment 
            const originalComment = await admin.firestore().doc(`projects/${projectID}/discussion/${event.data().reply_to_id}`).get()

            const originalUser = await admin.auth().getUser(originalComment.data().uid)
            return mailjet
                .post("send", { 'version': 'v3.1' })
                .request({
                    "Messages": [
                        {
                            "From": {
                                "Email": "noreply@sciteens.org",
                                "Name": "SciTeens"
                            },
                            "To": [
                                {
                                    "Email": originalUser.email,
                                    "Name": originalUser.displayName
                                }
                            ],
                            "TemplateID": 1525200,
                            "TemplateLanguage": true,
                            "Subject": "New Feedback",
                            "Variables": {
                                "studentOrMentor": user.customClaims['mentor'] ? "mentor" : "student",
                                "projectLink": `https://sciteens.org/project/${projectID}#${event.id}`
                            }
                        }
                    ]
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
exports.scheduledProgramEmailer = functions.pubsub
    .schedule("5 0 * * *")
    .timeZone("America/New_York") // Users can choose timezone - default is America/Los_Angeles
    .onRun((context) => {
        // Fetch the current Unix Timestamp
        let date = new Date().getTime();
        admin
            .firestore()
            .collection("programs")
            .orderBy("application")
            .startAt(0)
            .endAt(date + 604800000)
            .get()
            .then((res) => {
                res.forEach((event) => {
                    // Send an email to each subscriber
                    let subscribers = event.data().subscribers;
                    let link = "https://sciteens.org/program/" + event.id;

                    subscribers.forEach((sub) => {
                        // Fetch the user's email
                        admin
                            .auth()
                            .getUser(sub)
                            .then((user) => {
                                // Send using Mailjet API v3
                                mailjet.post("send", { version: "v3.1" }).request({
                                    Messages: [
                                        {
                                            From: {
                                                Email: "noreply@sciteens.org",
                                                Name: "SciTeens",
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
                                            Subject: "Upcoming Program Application",
                                            Variables: {
                                                link: link,
                                            },
                                        },
                                    ],
                                });
                                // Add notification
                                admin
                                    .firestore()
                                    .collection("notifications")
                                    .doc(user.uid)
                                    .update({
                                        notifications: admin.firestore.FieldValue.arrayUnion({
                                            date: new Date().getTime(),
                                            message:
                                                "Upcoming program application for " + event.data().name,
                                            type: "program",
                                            program_id: event.id,
                                            program_slug: event.data().slug,
                                            seen: false,
                                        }),
                                    });
                            });
                    });
                });
            });
        return null;
    });

/*
    Function fileUpload()

    Runs every time a file is uploaded. Checks if the file
    contains innapropriate content (memes, adult, or violence),
    and deletes the file and notifies the user that uploaded the
    content if so. 
*/

exports.fileUpload = functions.storage.object().onFinalize(async (object) => {
    // Determine if the object isn't an image
    if (!object.contentType.startsWith("image/")) {
        return console.log("Not an image");
    } else {
        // Define an array of acceptable return values for the
        // safe search categorizer
        const SAFE_STRINGS = ["UNLIKELY", "VERY_UNLIKELY"];

        // Check the image for adult, violent, or meme content
        const visionClient = new vision.ImageAnnotatorClient();
        const data = await visionClient.safeSearchDetection(
            `gs://${object.bucket}/${object.name}`
        );

        // If adult, violent, or meme content detected, delete
        // the content
        const results = data[0].safeSearchAnnotation;
        if (
            SAFE_STRINGS.indexOf(results.adult) >= 0 &&
            SAFE_STRINGS.indexOf(results.spoof) >= 0 &&
            SAFE_STRINGS.indexOf(results.violence) >= 0 &&
            SAFE_STRINGS.indexOf(results.racy) >= 0
        ) {
            console.log("No offensive image found for " + object.name);

            // Determine which folder the file belongs to
            if (object.name.startsWith("profilephoto/")) {
                // Belongs to profile photo collection
                let uid = object.name.substring(
                    object.name.indexOf("/"),
                    object.name.indexOf(".")
                );
                return admin
                    .storage()
                    .bucket(object.bucket)
                    .file(object.name)
                    .makePublic()
                    .then(() => {
                        console.log(object.name + " is now a publicly accessible file");
                        return admin
                            .firestore()
                            .collection("profile-pictures")
                            .doc(uid)
                            .set({
                                picture: object.mediaLink,
                            })
                            .then(() => {
                                console.log("Set the profile photo for user " + uid);
                            })
                            .catch((err) => {
                                console.error("Error setting profile photo: " + err);
                            });
                    });
            }

            // Determine if the image belongs to a project
            else if (object.name.startsWith("project/")) {
                let first_slash_index = object.name.indexOf("/");
                let second_slash_index = object.name.indexOf(
                    "/",
                    first_slash_index + 1
                );
                let project_id = object.name.substring(
                    first_slash_index,
                    second_slash_index
                );

                console.log("Setting photo for project " + project_id);
                return admin
                    .storage()
                    .bucket(object.bucket)
                    .file(object.name)
                    .makePublic()
                    .then(() => {
                        return admin
                            .firestore()
                            .collection("projects")
                            .doc(project_id)
                            .update({
                                photo: object.mediaLink,
                            });
                    })
                    .then(() => {
                        console.log(
                            "Successfully set project photo for project " + project_id
                        );
                    })
                    .catch((err) => {
                        console.error(
                            "Unsuccessfully set project photo for project " +
                            project_id +
                            ": " +
                            err
                        );
                    });
            }

            // Determine if the image belongs to a course
            if (object.name.startsWith("courses/")) {
                let first_slash_index = object.name.indexOf("/");
                let second_slash_index = object.name.indexOf(
                    "/",
                    first_slash_index + 1
                );
                let course_id = object.name.substring(
                    first_slash_index,
                    second_slash_index
                );

                console.log("Setting photo for course " + course_id);
                return admin
                    .storage()
                    .bucket(object.bucket)
                    .file(object.name)
                    .makePublic()
                    .then(() => {
                        console.log(object.name + " is now a publicly accessible file");
                        return admin
                            .firestore()
                            .collection("courses")
                            .doc(course_id)
                            .update({
                                photo: object.mediaLink,
                            })
                            .then(() => {
                                console.log("Set the course photo for course " + course_id);
                            })
                            .catch((err) => {
                                console.error("Error setting course photo: " + err);
                            });
                    });
            }
        } else {
            // Delete the file from firebase storage
            admin
                .storage()
                .bucket(object.bucket)
                .file(object.name)
                .delete()
                .then(() => {
                    return console.log("Offensive image found. Deleting...");
                });
        }
    }
});

/*
    Function newProjectInvite()
    
    Handles the operations necessary when a new project invite is created
*/
exports.newProjectInvite = functions.firestore
    .document("project-invites/{projectID}")
    .onCreate((event) => {
        let id = event.id;
        let emails = event.data().emails;
        let title = event.data().title;

        emails.forEach((email) => {
            // Fetch the user from email
            admin
                .auth()
                .getUserByEmail(email.trim())
                .then((user) => {
                    // Fetch the user's profile, and add them to the project
                    admin
                        .firestore()
                        .collection("profiles")
                        .doc(user.uid)
                        .get()
                        .then((profile) => {
                            return admin
                                .firestore()
                                .collection("profiles")
                                .doc(id)
                                .update({
                                    member_arr: admin.firestore.FieldValue.arrayUnion({
                                        'uid': user.uid,
                                        'display': user.displayName,
                                        'slug': profile.data().slug ? profile.data().slug : ''
                                    }),
                                });
                        })
                        .then(() => {
                            console.log("Added user: " + user.displayName);
                            admin
                                .firestore()
                                .collection("notifications")
                                .doc(user.uid)
                                .update({
                                    notifications: admin.firestore.FieldValue.arrayUnion({
                                        date: new Date().getTime(),
                                        message:
                                            "You've been invited to join the project " + title,
                                        type: "project",
                                        project_id: event.id,
                                        project_slug: '',
                                        seen: false,
                                    }),
                                });
                        });
                })
                .catch((err) => {
                    console.log(err);
                });

            // Email the user that they've been added to a project
            // Send an email to the user
            mailjet
                .post("send", { version: "v3.1" })
                .request({
                    Messages: [
                        {
                            From: {
                                Email: "noreply@sciteens.org",
                                Name: "SciTeens",
                            },
                            To: [
                                {
                                    Email: email,
                                    Name: email,
                                },
                            ],
                            TemplateID: 1373653,
                            TemplateLanguage: true,
                            Subject: "Project Update",
                            Variables: {
                                projectName: title,
                                projectLink: "https://sciteens.org/project/" + event.id,
                            },
                        },
                    ],
                })
                .catch((err) => {
                    console.log("mailjet error:" + err);
                });
        });
        // Delete project invite once finished
        return admin.firestore().collection("project-invites").doc(id).delete();
    });

/*
    Function updateUserStats()

    Runs once every week at 12:05 AM Eastern on Sunday. Counts
    the total number of mentors and students on the platform at 
    any given time. 
*/
exports.updateUserStats = functions.pubsub
    .schedule("0 0 * * 0")
    .timeZone("America/New_York")
    .onRun((context) => {
        // Fetch all users on the platform
        var mentors = 0;
        var students = 0;
        return admin
            .auth()
            .listUsers()
            .then((res) => {
                res.users.forEach((user) => {
                    console.log("Checking user " + user.displayName);
                    // Determine if the user is a mentor
                    if (user.customClaims && user.customClaims["mentor"]) {
                        mentors += 1;
                    } else {
                        students += 1;
                    }
                });
            })
            .then(() => {
                // Update firebase to store the user counts
                Promise.all([
                    admin.firestore().collection("statistics").doc("mentors").update({
                        count: mentors,
                    }),
                    admin.firestore().collection("statistics").doc("students").update({
                        count: students,
                    }),
                ]);
            });
    });

/*
    Function  newCourse()

    Runs when a new course is added to Prismic. 
*/
exports.newCourse = functions.https.onRequest(async (request, response) => {
    response.set("Access-Control-Allow-Origin", "*");
    response.set("Access-Control-Allow-Methods", "GET, POST");
    const document_id = request.body.documents[0];
    console.log(document_id);
    const client = Prismic.client("https://sciteens.cdn.prismic.io/api");
    await client
        .query(`[at(document.id, "${document_id}")]`)
        .then((res) => {
            let course_data = res.results[0];

            const start = new Date(course_data.data.course.start.value).toISOString();
            const end = new Date(course_data.data.course.end.value).toISOString();
            const enroll_by = new Date(
                course_data.data.course.enroll_by.value
            ).toISOString();
            const course_name = course_data.data.course.name.value[0].text;

            if (course_data.type == "course") {
                console.log("course detected");

                // Detect if course exists
                return admin
                    .firestore()
                    .collection("courses")
                    .doc(course_data.slugs[0])
                    .get()
                    .then((res) => {
                        if (res.exists) {
                            // Update
                            return admin
                                .firestore()
                                .collection("courses")
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
                                    response.status(200).send("Successful update");
                                })
                                .catch((err) => {
                                    response.status(400).send(err);
                                });
                        } else {
                            // Create
                            return admin
                                .firestore()
                                .collection("courses")
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
                                    response.status(200).send("Successful course creation");
                                })
                                .catch((err) => {
                                    response.status(400).send(err);
                                });
                        }
                    });
            } else {
                response.status(200).send("Not a course, ignoring update");
            }
        })
        .catch(() => {
            response.status(400).send("Couldn't find it");
        });
});