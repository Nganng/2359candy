const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const axios = require('axios');

admin.initializeApp(functions.config().firebase);

const db = admin.firestore();

const app = express();
const main = express();

app.use(cors({ origin: true }));
main.use('/api/v1', app);
main.use(bodyParser.json());
main.use(bodyParser.urlencoded({ extended: false }));

exports.webApi = functions.https.onRequest(main);




// Auth APIs




app.post('/signup', (req, res) => {
    if(!req.body.email) {
        res.status(400).send({
            message: "email is required"
        })
    }
    if(!req.body.password) {
        res.status(400).send({
            message: "password is required"
        })
    }
    admin.auth().createUser({
        email: req.body.email,
        emailVerified: false,
        password: req.body.password,
        disabled: false
    })
    .then(userRecord => {
        // See the UserRecord reference doc for the contents of userRecord.
        res.status(200).send({ 
            id: userRecord.uid
        })
    })
    .catch(err => {
        res.status(400).send({
            message: "An error has occured when creating a user " + err
        })
    });
});
app.post('/login', (req, res) => {
    if(!req.body.email) {
        res.status(400).send({
            message: "email is required"
        })
    }
    if(!req.body.password) {
        res.status(400).send({
            message: "password is required"
        })
    }
    // Looks like neither firebase-functions and firebase-admin do not provide an auth function
    // So.. we hit the REST api. 
    axios.post(`https://www.googleapis.com/identitytoolkit/v3/relyingparty/verifyPassword?key=${functions.config().project.webkey}`, {
        email: req.body.email,
        password: req.body.password,
        returnSecureToken: true
    })
    .then((response) => {
        res.status(200).send(response.data)
    })
    .catch((err) => {
        res.status(400).send({
            message: "An error has occured authenticating this user " + err.message
        })
    });
})






// CRUD Postings




// Add new posting
app.post('/postings', (req, res) => {
    const validationError = validatePostingInput(req.body);
    if (!validationError) {
        req.body.createdAt = admin.firestore.FieldValue.serverTimestamp()
        db.collection('postings').add(req.body)
        .then(ref => {
            res.status(200).send({ id: ref.id })
        })
        .catch(err => {
            res.status(400).send({
                message: "An error has occured when adding a posting " + err
            })
        });
    } else {
        res.status(400).send({
            message: "Input is invalid. " + validationError
        });
    }
})
// Get all postings
app.get('/postings', (req, res) => {
    db.collection('postings').get()
    .then(ref => {
        if (ref.empty) {
            res.status(400).send([]);
        }
        var postings = [];  
        ref.forEach(doc => {
            var data = doc.data();
            data.id = doc.id; 
            postings.push(data);
        });
        res.status(200).send(postings);
    })
    .catch(err => {
        res.status(400).send({
            message: "An error has occured. " + err
        });
    });
})
// Get a posting
app.get('/postings/:postingId', (req, res) => {
    db.collection('postings').doc(req.params.postingId).get()
    .then(ref => {
        if (ref.data()) {
            var data = ref.data();
            data.id = ref.id;
            res.status(200).send(data)
        } else {
            res.status(400).send({
                message: "Object with ID " + req.params.candidateId + " does not exist."
            });
        }
    }).catch(err => {
        res.status(400).send({
            message: "An error has occured. " + err
        });
    });
})
// Update a posting
app.put('/postings/:postingId', (req, res) => {
    const validationError = validatePostingInput(req.body);
    if (!validationError) {
        db.collection('postings').doc(req.params.postingId).update(req.body)
        .then(ref => {
            res.status(200).send(ref)
        }).catch(err => {
            res.status(400).send({
                message: "An error has occured updating the posting. " + err
            });
        });
    } else {
        res.status(400).send({
            message: "Input is invalid. " + validationError
        });
    }
})
// Delete a posting 
app.delete('/postings/:postingId', (req, res) => {
    db.collection('postings').doc(req.params.postingId).delete()
    .then(ref => {
        res.status(200).send(ref)
    }).catch(err => {
        res.status(400).send({
            message: "An error has occured deleting the posting. " + err
        });
    });
})
// Validation function for postings
function validatePostingInput(body) {
    if (!body.jobTitle) return "jobTitle cannot be empty";
    // Optional fields are
    // - jdUrl
    return null;
}




// CRUD Candidates




// Add new candidate
app.post('/candidates', (req, res) => {
    const validationError = validateCandidateInput(req.body);
    if (!validationError) {
        req.body.createdAt = admin.firestore.FieldValue.serverTimestamp()
        db.collection('candidates').add(req.body)
        .then(ref => {
            res.status(200).send({ id: ref.id })
        })
        .catch(err => {
            res.status(400).send({
                message: "An error has occured when adding a candidate " + err
            })
        });
    } else {
        res.status(400).send({
            message: "Input is invalid. " + validationError
        });
    }
})
// Get all candidates
app.get('/candidates', (req, res) => {
    db.collection('candidates').get()
    .then(ref => {
        if (ref.empty) {
            res.status(400).send([]);
        }
        var candidates = [];  
        ref.forEach(doc => {
            var data = doc.data();
            data.id = doc.id; 
            candidates.push(data);
        });
        res.status(200).send(candidates);
    })
    .catch(err => {
        res.status(400).send({
            message: "An error has occured. " + err
        });
    });
})
// Get a candidate
app.get('/candidates/:candidateId', (req, res) => {
    db.collection('candidates').doc(req.params.candidateId).get()
    .then(ref => {
        if (ref.data()) {
            var data = ref.data();
            data.id = ref.id;
            res.status(200).send(data)
        } else {
            res.status(400).send({
                message: "Object with ID " + req.params.candidateId + " does not exist."
            });
        }
    }).catch(err => {
        res.status(400).send({
            message: "An error has occured. " + err
        });
    });
})
// Update a candidate
app.put('/candidates/:candidateId', (req, res) => {
    const validationError = validateCandidateInput(req.body);
    if (!validationError) {
        db.collection('candidates').doc(req.params.candidateId).update(req.body)
        .then(ref => {
            res.status(200).send(ref)
        }).catch(err => {
            res.status(400).send({
                message: "An error has occured updating the candidate. " + err
            });
        });
    } else {
        res.status(400).send({
            message: "Input is invalid. " + validationError
        });
    }
})
// Delete a candidate 
app.delete('/candidates/:candidateId', (req, res) => {
    db.collection('candidates').doc(req.params.candidateId).delete()
    .then(ref => {
        res.status(200).send(ref)
    }).catch(err => {
        res.status(400).send({
            message: "An error has occured deleting the candidate. " + err
        });
    });
})
// Validation function for candidates
function validateCandidateInput(body) {
    if (!body.name) return "name cannot be empty";
    if (!body.email) return "email cannot be empty";
    if (!body.contactNumber) return "contactNumber cannot be empty";
    if (!body.office) return "office cannot be empty";
    if (!body.posting) return "posting cannot be empty";
    if (!body.source) return "source cannot be empty";
    if (!body.status) return "status cannot be empty";
    // Optional fields are
    // - currentSalary
    // - expectedSalary
    // - resumeUrl
    // - notes (sub-collection)
    return null;
}




// CRUD Notes




// Add new note
app.post('/candidates/:candidateId/notes', (req, res) => {
    db.collection('candidates').doc(req.params.candidateId).get()
    .then(doc => {
        if (!doc.exists) {
            res.status(400).send({
                message: "Candidate does not exist."
            });
        } else {
            const validationError = validateNoteInput(req.body);
            if (!validationError) {
                req.body.createdAt = admin.firestore.FieldValue.serverTimestamp()
                doc.ref.collection('notes').add(req.body)
                .then(ref => {
                    res.status(200).send({ id: ref.id })
                })
                .catch(err => {
                    res.status(400).send({
                        message: "An error has occured when adding a note " + err
                    })
                });
            } else {
                res.status(400).send({
                    message: "Input is invalid. " + validationError
                });
            }
        }
    })
    .catch(err => {
        res.status(400).send({
            message: "An error has occured fetching the candidate. " + err
        });
    });
})
// Get all notes of a candidate
app.get('/candidates/:candidateId/notes', (req, res) => {
    db.collection('candidates').doc(req.params.candidateId)
    .collection('notes').get()
    .then(ref => {
        if (ref.empty) {
            res.status(400).send([]);
        }
        var candidates = [];  
        ref.forEach(doc => {
            var data = doc.data();
            data.id = doc.id; 
            candidates.push(data);
        });
        res.status(200).send(candidates);
    })
    .catch(err => {
        res.status(400).send({
            message: "An error has occured. " + err
        });
    });
})
// Update a note
app.put('/candidates/:candidateId/notes/:noteId', (req, res) => {
    const validationError = validateNoteInput(req.body);
    if (!validationError) {
        db.collection('candidates').doc(req.params.candidateId)
        .collection('notes').doc(req.params.noteId).update(req.body)
        .then(ref => {
            res.status(200).send(ref)
        }).catch(err => {
            res.status(400).send({
                message: "An error has occured updating the note. " + err
            });
        });
    } else {
        res.status(400).send({
            message: "Input is invalid. " + validationError
        });
    }
})
// Delete a note 
app.delete('/candidates/:candidateId/notes/:noteId', (req, res) => {
    db.collection('candidates').doc(req.params.candidateId).get()
    .then(doc => {
        if (!doc.exists) {
            res.status(400).send({
                message: "Candidate does not exist."
            });
        } else {
            doc.ref.collection('notes').doc(req.params.noteId).delete()
            .then(ref => {
                res.status(200).send(ref)
            }).catch(err => {
                res.status(400).send({
                    message: "An error has occured deleting the note. " + err
                });
            });
        }
    })
    .catch(err => {
        res.status(400).send({
            message: "An error has occured fetching the candidate. " + err
        });
    });
})
// Validation function for notes
function validateNoteInput(body) {
    if (!body.title) return "title cannot be empty";
    if (!body.content) return "content cannot be empty";
    if (!body.author) return "Something is wrong. Current user is missing"

    // Optional fields are
    // - none.
    return null;
}
