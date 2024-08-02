import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import * as firestore from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js"
import {
    getAuth,
    signInWithPopup,
    GoogleAuthProvider,
    setPersistence,
    inMemoryPersistence
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js"

const firebaseConfig = {
    apiKey: "AIzaSyCEmK763aMbHq1WSWEyjehsUR5FQ5hmEpQ",
    authDomain: "dny-za-skolou.netlify.app",
    projectId: "dny-za-skolou-8c8a0",
    storageBucket: "dny-za-skolou-8c8a0.appspot.com",
    messagingSenderId: "876624624466",
    appId: "1:876624624466:web:369dc5619d2089b396188b",
    measurementId: "G-S62KH47PLK"
};

const app = initializeApp(firebaseConfig);
const db = firestore.getFirestore(app);
const signupStartPromise = firestore.getDoc(firestore.doc(db, 'settings', 'public')).then(doc => doc.data().start_time.toDate())
    .catch(() => displayMessage('Chyba při načítání dat, obnovte prosím stránku!', '#E75858', true))
    
const messageEl = document.getElementById('message')
const loginSectionEl = document.getElementById('login-section')
const loginButtonEl = document.getElementById('login-button')
const loginButtonLoaderEl = document.getElementById('login-button-loader')
const loginButtonTextEl = document.getElementById('login-button-text')
const waitingSectionEl = document.getElementById('waiting-section')
const waitingLoaderEl = document.getElementById('waiting-loader')
const countdownEl = document.getElementById('countdown')
const formSectionEl = document.getElementById('form-section')
const formEventsGroupEl = document.getElementById('form-fieldset')
const formSignupButtonEl = document.getElementById('form-signup-button')
const formButtonLoaderEl = document.getElementById('form-button-loader')
const formButtonTextEl = document.getElementById('form-button-text')
const formSignoutButtonEl = document.getElementById('form-signout-button')

let allParticipants = []
let formSectionVisible = false

let messageTimeout
const closeMessage = () => {
    messageEl.style.transform = 'translateY(calc(100% + 25px))'
    setTimeout(() => messageEl.style.visibility = "hidden", 300)
}
const displayMessage = (text, color = '#E75858', persistent = false) => {
    clearTimeout(messageTimeout)
    messageEl.style.backgroundColor = color
    messageEl.textContent = text
    messageEl.style.visibility = "visible"
    messageEl.style.transform = "translateY(0)"
    if (!persistent) messageTimeout = setTimeout(closeMessage, 5000)
}

const disableOtherEvents = (id) => {
    formEventsGroupEl.disabled = true
    formSignupButtonEl.disabled = true
    document.getElementById(`radio-${id}`).checked = true
}
const setDefaultAvailability = () => {
    formEventsGroupEl.disabled = false
    formSignupButtonEl.disabled = false
}

const alreadySignedUpCheck = (email) => {
    const participantData = allParticipants.find(participant => participant.email === email)
    if (participantData) {
        displayMessage('Už jste zapsaní!', '#3E7BF2', true)
        console.log(`radio-${participantData.event_id}`)
        disableOtherEvents(participantData.event_id)
    } else {
        setDefaultAvailability()
        closeMessage()
    }
}

const startCountdown = (signupStart) => {
    const getTimeUntilStart = () => {
        const pad = (num) => num.toString().padStart(2, '0')
        const diff = signupStart - new Date() + 1000
        const hours = Math.floor((diff % 86400000) / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        if (diff > 86400000) return 'Přihlašování začne za více než 24 hodin'
        return `${hours ? `${pad(hours)}:` : ''}${pad(minutes)}:${pad(seconds)}`
    }
    countdownEl.textContent = getTimeUntilStart()

    setTimeout(() => {
        countdownEl.textContent = getTimeUntilStart()
        const interval = setInterval(() => {
            const diff = signupStart - new Date()
            if (diff <= 0) {
                clearInterval(interval)
                if (!auth.currentUser?.email) {
                    return displayMessage('Chyba v přihlášení, obnovte prosím stránku!')
                } else {
                    waitingSectionEl.style.display = 'none'
                    formSectionEl.style.display = 'flex'
                    formSectionVisible = true
                    alreadySignedUpCheck(auth.currentUser.email)
                }
            }
            countdownEl.textContent = getTimeUntilStart()
        }, 1000)
    }, 1000 - new Date().getMilliseconds())
}

const auth = getAuth();
await setPersistence(auth, inMemoryPersistence).catch((e) => {
    displayMessage('Chyba při nastavování přihlášení, obnovte prosím stránku!', '#E75858', true)
    throw new Error(`Error setting persistence: ${e}`)
})
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });
loginButtonEl.addEventListener('click', async () => {
    try {
        loginButtonLoaderEl.style.display = "inline-block"
        loginButtonTextEl.style.display = "none"

        const result = await signInWithPopup(auth, provider);
        console.log('Logged in as:', result.user.email)

        loginButtonLoaderEl.style.display = "none"
        loginButtonTextEl.style.display = "inline"

        if (!/.+@dgkralupy\.(cz|eu)/.test(result.user.email)) {
            await auth.signOut()
            console.log('Logged out')
            displayMessage('Přihlásit se můžete pouze školním emailem!')
            return
        }

        loginSectionEl.style.display = 'none'
        waitingSectionEl.style.display = 'flex'

        const signupStart = await signupStartPromise

        waitingLoaderEl.style.display = 'none'
        countdownEl.style.display = 'block'

        if (new Date() < signupStart) {
            startCountdown(signupStart)
        } else {
            waitingSectionEl.style.display = 'none'
            formSectionEl.style.display = 'flex'
            formSectionVisible = true
            alreadySignedUpCheck(result.user.email)
        }
    } catch (e) {
        console.error('Error logging in:', e)
        displayMessage('Nepodařilo se přihlásit!')
        loginButtonLoaderEl.style.display = "none"
        loginButtonTextEl.style.display = "inline"
    }
})
loginButtonLoaderEl.style.display = "none"
loginButtonTextEl.style.display = "inline"

const query = firestore.query(firestore.collection(db, 'events'));
let firstUpdate = true
firestore.onSnapshot(query, (snapshot) => {
    if (firstUpdate) {
        document.getElementById('form-loader').style.display = 'none'
        firstUpdate = false
    }

    allParticipants = snapshot.docs.reduce((acc, doc) => acc.concat(doc.data().participants.map(email => {
        return { email, event_id: doc.id }
    })), [])
    const loggedIn = auth.currentUser?.email
    const hasLocalChanges = snapshot.docChanges().some(change => change.doc.metadata.hasPendingWrites)
    if (formSectionVisible && loggedIn && !hasLocalChanges) alreadySignedUpCheck(auth.currentUser.email)

    const setLabelValue = (label, radio, doc) => {
        const occupied = doc.data().participants.length
        const capacity = doc.data().capacity
        const teachers = doc.data().teachers
        const availability = `${occupied}/${capacity}`
        const availabilityColor = `hsl(${126 - Math.round(126 * (occupied / capacity))}, 57%, 61%)`
        label.querySelector('.event-name').textContent = doc.data().name
        label.querySelector('.event-availability').textContent = availability
        label.querySelector('.event-availability').style.backgroundColor = availabilityColor
        label.querySelector('.event-teachers').textContent = teachers
        radio.disabled = occupied >= capacity
    }
    snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
            const radio = document.createElement('input')
            radio.type = 'radio'
            radio.name = 'event'
            radio.value = change.doc.id
            radio.id = `radio-${change.doc.id}`
            radio.required = false

            const label = document.createElement('label')
            label.htmlFor = `radio-${change.doc.id}`
            label.id = `label-${change.doc.id}`
            const nameSpan = document.createElement('span')
            nameSpan.className = 'event-name stop-overflow'
            const availabilitySpan = document.createElement('span')
            availabilitySpan.className = 'event-availability'
            const teachersSpan = document.createElement('span')
            teachersSpan.className = 'event-teachers stop-overflow'
            label.append(nameSpan, availabilitySpan, teachersSpan)
            setLabelValue(label, radio, change.doc)

            const div = document.createElement('div')
            div.id = `event-${change.doc.id}`
            div.className = 'event-parent'
            div.append(radio, label)

            formEventsGroupEl.append(div)
            console.log('Added event: ', change.doc.data());
        }
        if (change.type === 'modified') {
            const label = document.getElementById(`label-${change.doc.id}`)
            const radio = document.getElementById(`radio-${change.doc.id}`)
            setLabelValue(label, radio, change.doc)
            console.log('Modified event: ', change.doc.data());
        }
        if (change.type === 'removed') {
            document.getElementById(`event-${change.doc.id}`).remove()
            console.log('Removed event: ', change.doc.data());
        }
    });
});

const signupForEvent = async (email, event_id) => {
    const batch = firestore.writeBatch(db);
    const userRef = firestore.doc(db, 'users', email)
    const eventRef = firestore.doc(db, 'events', event_id)

    batch.set(userRef, { email, event_id })
    batch.update(eventRef, { participants: firestore.arrayUnion(email) })
    await batch.commit();
}

const signupForm = document.getElementById('signup-form')
signupForm.onsubmit = async (e) => {
    e.preventDefault()
    const event_id = signupForm.elements.event.value
    const event_name = document.querySelector(`#label-${event_id} > .event-name`).textContent
    const email = auth.currentUser?.email
    if (!email) return displayMessage('Nejste přihlášení!')
    if (!event_id) return displayMessage('Není vybraná žádná akce!')

    console.log('Signing up:', email, event_id)
    try {
        formButtonLoaderEl.style.display = "inline-block"
        formButtonTextEl.style.display = "none"
        await signupForEvent(email, event_id)
        
        displayMessage(`Zapsáno na "${event_name}"!`, '#43BC50', true)
        disableOtherEvents(event_id)
    } catch (e) {
        console.error('Error signing up:', e)
        displayMessage('Vybraná akce už není dostupná, nebo jste už zapsaní!')
    }
    formButtonLoaderEl.style.display = "none"
    formButtonTextEl.style.display = "inline"
}

// formSignoutButtonEl.addEventListener('click', async () => {
//     try {
//         const email = auth.currentUser?.email
//         if (!email) return displayMessage('Nejste přihlášení!')
//         await firestore.runTransaction(db, async (transaction) => {
//             const userRef = firestore.doc(db, "users", email);
//             const userDoc = await transaction.get(userRef);
//             if (!userDoc.exists()) {
//                 throw "User does not exist!";
//             }
//
//             const eventId = userDoc.data().event_id;
//             const eventRef = firestore.doc(db, "events", eventId)
//             transaction.update(eventRef, { participants: firestore.arrayRemove(email) });
//             transaction.delete(userRef)
//         });
//     } catch (e) {
//         console.error('Error signing out:', e)
//         displayMessage('Nepodařilo se odhlásit!')
//     }
// })