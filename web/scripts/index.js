import * as firestore from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js"
import {db, FirestoreListener, getGoogleAuth, closeMessage, displayMessage} from "./global.js";
import {signInWithPopup} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";

const signupStartPromise = firestore.getDoc(firestore.doc(db, 'settings', 'public'))
    .then(doc => doc.data().start_time.toDate())
    .catch(() => displayMessage('Chyba při načítání dat, obnovte prosím stránku!', '#E75858', true))

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

let allParticipants = []
let formSectionVisible = false
let alreadySignedUpDisplayed = false

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
        disableOtherEvents(participantData.event_id)
        if (!alreadySignedUpDisplayed) {
            displayMessage('Už jste zapsaní!', '#3E7BF2', true)
            alreadySignedUpDisplayed = true
        }
    } else {
        setDefaultAvailability()
        if (alreadySignedUpDisplayed) {
            closeMessage()
            alreadySignedUpDisplayed = false
        }
    }
}

const startCountdown = (signupStart) => {
    const getTimeUntilStart = () => {
        const pad = (num) => num.toString().padStart(2, '0')
        const diff = signupStart - new Date() + 1000
        const hours = Math.floor((diff % 86400000) / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        if (diff <= 86400000) return `${hours ? `${pad(hours)}:` : ''}${pad(minutes)}:${pad(seconds)}`
        else {
            const dateFormatOptions = { weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: 'numeric' }
            const formatted = signupStart.toLocaleString('cs-CZ', dateFormatOptions)
            return `<span class="countdown-description">Přihlašování se spustí v:</span><span class="countdown-start">${formatted}</span>`
        }
    }
    countdownEl.innerHTML = getTimeUntilStart()

    setTimeout(() => {
        countdownEl.innerHTML = getTimeUntilStart()
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
            countdownEl.innerHTML = getTimeUntilStart()
        }, 1000)
    }, 1000 - new Date().getMilliseconds())
}

const {auth, provider} = await getGoogleAuth()
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

const setLabelValue = (label, radio, doc) => {
    const occupied = doc.data().participants.length
    const capacity = doc.data().capacity
    const teachers = doc.data().teachers
    const availability = `${occupied}/${capacity}`
    const hue = Math.max(126 - Math.round(126 * (occupied / capacity)), 0)
    const availabilityColor = `hsl(${hue}, 57%, 61%)`
    label.querySelector('.event-name').textContent = doc.data().name
    label.querySelector('.event-availability').textContent = availability
    label.querySelector('.event-availability').style.backgroundColor = availabilityColor
    label.querySelector('.event-teachers').textContent = teachers

    const full = occupied >= capacity
    const parent = radio.parentElement
    if (full) parent.classList.add('filled')
    else parent.classList.remove('filled')

    const disable = occupied >= capacity + 10
    radio.disabled = disable
    if (disable) {
        parent.classList.remove('filled')
        radio.checked = false
    }
}

const eventListener = new FirestoreListener('events')
eventListener.addEventListener('change', () => {
    document.getElementById('form-loader').style.display = 'none'
}, {once: true})
eventListener.addEventListener('change', ({detail: snapshot}) => {
    allParticipants = snapshot.docs.reduce((acc, doc) => acc.concat(doc.data().participants.map(email => {
        return {email, event_id: doc.id}
    })), [])

    const loggedIn = auth.currentUser?.email
    const hasLocalChanges = snapshot.docChanges().some(change => change.doc.metadata.hasPendingWrites)
    if (formSectionVisible && loggedIn && !hasLocalChanges) alreadySignedUpCheck(auth.currentUser.email)
})
eventListener.addEventListener('added', ({detail: change}) => {
    const radio = document.createElement('input')
    radio.type = 'radio'
    radio.name = 'event'
    radio.value = change.doc.id
    radio.id = `radio-${change.doc.id}`
    radio.required = true

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

    const div = document.createElement('div')
    div.id = `event-${change.doc.id}`
    div.className = 'event-parent'
    div.append(radio, label)

    formEventsGroupEl.append(div)
    setLabelValue(label, radio, change.doc)
    console.log('Added event: ', change.doc.data());
})
eventListener.addEventListener('modified', ({detail: change}) => {
    const label = document.getElementById(`label-${change.doc.id}`)
    const radio = document.getElementById(`radio-${change.doc.id}`)
    setLabelValue(label, radio, change.doc)
    console.log('Modified event: ', change.doc.data());
})
eventListener.addEventListener('removed', ({detail: change}) => {
    document.getElementById(`event-${change.doc.id}`).remove()
    console.log('Removed event: ', change.doc.data());
})

const signupForEvent = async (email, event_id, substitute) => {
    const batch = firestore.writeBatch(db);
    const userRef = firestore.doc(db, 'users', email)
    const eventRef = firestore.doc(db, 'events', event_id)

    batch.set(userRef, {email, event_id})
    const emailUpdate = firestore.arrayUnion(email)
    const change = substitute ? {substitutes: emailUpdate} : {participants: emailUpdate}
    batch.update(eventRef, change)
    await batch.commit();
}

const signupForm = document.getElementById('signup-form')
const getEventFromForm = () => {
    const event_id = signupForm.elements.event.value
    const event_name = document.querySelector(`#label-${event_id} > .event-name`).textContent
    const eventParent = document.getElementById(`event-${event_id}`)
    const substitute = eventParent.classList.contains('filled')
    return { event_id, event_name, substitute }
}
signupForm.oninput = () => {
    const { substitute } = getEventFromForm()
    if (substitute) {
        formButtonTextEl.innerText = `Zapsat se jako NÁHRADNÍK`
        formSignupButtonEl.classList.add('red')
    } else {
        formButtonTextEl.innerText = 'Zapsat se'
        formSignupButtonEl.classList.remove('red')
    }
}
signupForm.onsubmit = async (e) => {
    e.preventDefault()
    const { event_id, event_name, substitute } = getEventFromForm()
    const email = auth.currentUser?.email
    if (!email) return displayMessage('Nejste přihlášení!')
    if (!event_id) return displayMessage('Není vybraná žádná akce!')

    console.log('Signing up:', email, event_id)
    formSignupButtonEl.disabled = true
    try {
        formButtonLoaderEl.style.display = "inline-block"
        formButtonTextEl.style.display = "none"
        await signupForEvent(email, event_id, substitute)

        displayMessage(`Zapsáno na "${event_name}"!`, '#43BC50', true)
        alreadySignedUpDisplayed = true
        disableOtherEvents(event_id)
    } catch (e) {
        console.error('Error signing up:', e)
        displayMessage('Nepodařilo se přihlásit!')
        formSignupButtonEl.disabled = false
    }
    formButtonLoaderEl.style.display = "none"
    formButtonTextEl.style.display = "inline"
}