import {db, FirestoreListener, getGoogleAuth, displayMessage} from "./global.js";
import {signInWithPopup} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import * as firestore from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

const handle = async (action, args = []) => {
    try {
        const result = await action(...args)
        displayMessage(result, '#43BC50')
    } catch (e) {
        displayMessage(e, '#E75858')
    }
}

const addFormHandler = (formId, action) => {
    const form = document.getElementById(formId)
    form.onsubmit = async event => {
        event.preventDefault()
        await handle(action, [form])
    }
}

addFormHandler("new-event", async form => {
    const ref = firestore.collection(db, "events")
    await firestore.addDoc(ref, {
        name: form.elements["name"].value,
        teachers: form.elements["teachers"].value,
        capacity: parseInt(form.elements["capacity"].value),
        participants: []
    })
    return "Akce byla úspěšně vytvořena!"
})
addFormHandler("set-time", async form => {
    const ref = firestore.doc(db, "settings", "public")
    await firestore.setDoc(ref, {
        start_time: new Date(form.elements["time"].value)
    })
    return "Čas byl úspěšně nastaven!"
})
addFormHandler("remove-participant", async form => {
    const email = form.elements["email"].value
    await firestore.runTransaction(db, async transaction => {
        const userRef = firestore.doc(db, "users", email)
        const userDoc = await transaction.get(userRef)
        if (!userDoc.exists()) throw "User does not exist!"

        const eventId = userDoc.data().event_id
        const eventRef = firestore.doc(db, "events", eventId)
        transaction.update(eventRef, {participants: firestore.arrayRemove(email)})
        transaction.delete(userRef)
    })
    return "Účastník byl úspěšně odebrán!"
})

const {auth, provider} = await getGoogleAuth()
const loginEl = document.getElementById('login')
loginEl.addEventListener('click', () => handle(async () => {
    const result = await signInWithPopup(auth, provider);
    document.getElementById('login').style.display = 'none'
    document.getElementById('logout').style.display = 'block'
    document.getElementById('options').style.display = 'block'
    return `Přihlášen uživatel: ${result.user.email}`
}))
const logoutEl = document.getElementById('logout')
logoutEl.addEventListener('click', () => handle(async () => {
    await auth.signOut()
    document.getElementById('login').style.display = 'block'
    document.getElementById('logout').style.display = 'none'
    document.getElementById('options').style.display = 'none'
    return "Odhlášení proběhlo úspěšně!"
}))

const removeEvent = async (id) => handle(async () => {
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
    return "Akce byla úspěšně odebrána!"
})
const changeEventAttribute = async (doc, attribute, number = false) => handle(async () => {
    const eventRef = firestore.doc(db, "events", doc.id)
    const newValue = prompt(`Nová hodnota pole "${attribute}":`, doc.data()[attribute])
    if (!newValue) return
    await firestore.updateDoc(eventRef, {[attribute]: number ? parseInt(newValue) : newValue})
    return `Pole "${attribute}" bylo úspěšně změněno!`
})

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

