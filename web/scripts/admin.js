import {db, FirestoreListener, getGoogleAuth} from "./global.js";
import {signInWithPopup} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import * as firestore from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";


const newEventForm = document.getElementById("new-event")
newEventForm.onsubmit = async e => {
    e.preventDefault()
    try {
        const ref = firestore.collection(db, "events")
        await firestore.addDoc(ref, {
            name: newEventForm.elements["name"].value,
            teachers: newEventForm.elements["teachers"].value,
            capacity: parseInt(newEventForm.elements["capacity"].value),
            participants: []
        })
        alert("done")
    } catch (e) {
        alert(e)
    }
}

const timeSetForm = document.getElementById("set-time")
timeSetForm.onsubmit = async e => {
    e.preventDefault()
    try {
        const ref = firestore.doc(db, "settings", "public")
        await firestore.setDoc(ref, {
            start_time: new Date(timeSetForm.elements["time"].value)
        })
        alert("done")
    } catch (e) {
        alert(e)
    }
}

const removeParticipantForm = document.getElementById("remove-participant")
removeParticipantForm.onsubmit = async e => {
    e.preventDefault()
    try {
        const email = removeParticipantForm.elements["email"].value
        await firestore.runTransaction(db, async (transaction) => {
            const userRef = firestore.doc(db, "users", email)
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists()) {
                throw "User does not exist!";
            }

            const eventId = userDoc.data().event_id;
            const eventRef = firestore.doc(db, "events", eventId)
            transaction.update(eventRef, {participants: firestore.arrayRemove(email)});
            transaction.delete(userRef)
        });
        alert(`Removed user ${email}`)
    } catch (e) {
        alert(e)
    }
}

const {auth, provider} = await getGoogleAuth()
document.getElementById('login').addEventListener('click', async () => {
    try {
        const result = await signInWithPopup(auth, provider);
        alert(`Logged in as: ${result.user.email}`)
        document.getElementById('login').style.display = 'none'
        document.getElementById('logout').style.display = 'block'
        document.getElementById('options').style.display = 'block'
    } catch (e) {
        window.document.innerHTML = e
    }
})
document.getElementById('logout').addEventListener('click', async () => {
    await auth.signOut()
    document.getElementById('login').style.display = 'block'
    document.getElementById('logout').style.display = 'none'
    document.getElementById('options').style.display = 'none'
})

const removeEvent = async (id) => {
    try {
        // await firestore.deleteDoc(firestore.doc(db, "events", id))
        await firestore.runTransaction(db, async (transaction) => {
            const eventRef = firestore.doc(db, "events", id)
            const eventDoc = await transaction.get(eventRef);

            const participants = eventDoc.data().participants
            for (const email of participants) {
                const userRef = firestore.doc(db, "users", email)
                transaction.delete(userRef)
            }

            transaction.delete(eventRef)
        });
    } catch (e) {
        alert(e)
    }
}
const changeEventAttribute = async (doc, attribute, number = false) => {
    try {
        const eventRef = firestore.doc(db, "events", doc.id)
        const newValue = prompt(`Nová hodnota pole "${attribute}":`, doc.data()[attribute])
        if (!newValue) return
        await firestore.updateDoc(eventRef, {[attribute]: number ? parseInt(newValue) : newValue})
    } catch (e) {
        alert(e)
    }
}

const eventListener = new FirestoreListener('events')
eventListener.addEventListener('added', ({detail: change}) => {
    const description = document.createElement('p')
    description.id = `description-${change.doc.id}`
    const {name, teachers, capacity, participants} = change.doc.data()
    description.innerText = `${name} (${teachers}) - ${participants.length}/${capacity}`

    const button = document.createElement('button')
    button.innerText = "Odebrat"
    button.onclick = async () => await removeEvent(change.doc.id)
    const button2 = document.createElement('button')
    button2.innerText = "Upravit jméno"
    button2.onclick = async () => await changeEventAttribute(change.doc, "name")
    const button3 = document.createElement('button')
    button3.innerText = "Upravit učitele"
    button3.onclick = async () => await changeEventAttribute(change.doc, "teachers")
    const button4 = document.createElement('button')
    button4.innerText = "Upravit kapacitu"
    button4.onclick = async () => await changeEventAttribute(change.doc, "capacity", true)

    const div = document.createElement('div')
    div.id = `event-${change.doc.id}`
    div.append(description, button, button2, button3, button4)

    document.getElementById('events').append(div)
})
eventListener.addEventListener('modified', ({detail: change}) => {
    const label = document.getElementById(`description-${change.doc.id}`)
    const {name, teachers, capacity, participants} = change.doc.data()
    label.innerText = `${name} (${teachers}) - ${participants.length}/${capacity}`
})
eventListener.addEventListener('removed', ({ detail: change }) => {
    document.getElementById(`event-${change.doc.id}`).remove()
})

