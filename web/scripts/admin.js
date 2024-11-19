import {db, FirestoreListener, getGoogleAuth, displayMessage} from "./global.js";
import {signInWithPopup} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import * as firestore from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import CSV from "./csv-parser.js";

const handle = async (action, args = []) => {
    try {
        const result = await action(...args)
        displayMessage(result, '#43BC50')
    } catch (e) {
        console.error(e)
        displayMessage(e, '#E75858')
    }
}

const {auth, provider} = await getGoogleAuth()
const loginEl = document.getElementById('login-button')
loginEl.addEventListener('click', () => handle(async () => {
    const result = await signInWithPopup(auth, provider);
    document.getElementById('login-section').style.display = 'none'
    document.getElementById('options-section').style.display = 'flex'
    return `Přihlášen uživatel: ${result.user.email}`
}))
const logoutEl = document.getElementById('logout-button')
logoutEl.addEventListener('click', () => handle(async () => {
    await auth.signOut()
    document.getElementById('login-section').style.display = 'block'
    document.getElementById('options-section').style.display = 'none'
    return "Odhlášení proběhlo úspěšně!"
}))

const addFormHandler = (formId, action) => {
    const form = document.getElementById(formId)
    form.addEventListener('submit', async event => {
        event.preventDefault()
        await handle(action, [form])
    })
}

const addEvent = async (name, teachers, capacity) => {
    const ref = firestore.collection(db, "events")
    await firestore.addDoc(ref, {name, teachers, capacity, participants: []})
    return "Akce byla úspěšně vytvořena!"
}
addFormHandler("new-event", async form => {
    const name = form.elements.name.value
    const teachers = form.elements.teachers.value
    const capacity = parseInt(form.elements.capacity.value, 10)
    return await addEvent(name, teachers, capacity)
})
addFormHandler("set-time", async form => {
    const ref = firestore.doc(db, "settings", "public")
    await firestore.setDoc(ref, {
        start_time: new Date(form.elements.time.value)
    })
    return "Čas byl úspěšně nastaven!"
})
addFormHandler("remove-participant", async form => {
    const email = form.elements.email.value
    await firestore.runTransaction(db, async transaction => {
        const userRef = firestore.doc(db, "users", email)
        const userDoc = await transaction.get(userRef)
        if (!userDoc.exists()) throw new Error("User does not exist!")

        const eventId = userDoc.data().event_id
        const eventRef = firestore.doc(db, "events", eventId)
        transaction.update(eventRef, {participants: firestore.arrayRemove(email)})
        transaction.delete(userRef)
    })
    return "Účastník byl úspěšně odebrán!"
})

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
    if (!newValue) return `Změna zrušena`
    await firestore.updateDoc(eventRef, {[attribute]: number ? parseInt(newValue, 10) : newValue})
    return `Pole "${attribute}" bylo úspěšně změněno!`
})

let events = []
const exportFileEl = document.getElementById('export-file-button')
exportFileEl.addEventListener('click', () => handle(async () => {
    const data = events.flatMap(event => {
        const map = (substitute) => (email) => [email, event.name, substitute]
        const participants = event.participants.map(map('0'))
        const substitutes = event.substitutes.map(map('1'))
        return [...participants, ...substitutes]
    })
    const csv = `email,akce,nahradnik\n${data.map(line => {
        return line.map(x => `"${x.toString().trim()}"`).join(',')
    }).join('\n')}`

    const blob = new Blob([csv], {type: 'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'seznam_ucastniku.csv';
    a.click();
    return 'Seznam účastníků byl úspěšně exportován'
}))

const fileImportEl = document.getElementById('file-import-button')
fileImportEl.addEventListener('change', async () => {
    const file = fileImportEl.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.addEventListener('load', async () => {
        const text = reader.result
        const csvOptions = {separators: [',', ';']}
        const parsed = CSV.parse(text, csvOptions)
        if (['name', 'teachers', 'capacity'].some(x => !parsed.header.includes(x))) {
            displayMessage(`Hlavička csv musí být "name,teachers,capacity", v souboru byla "${parsed.header}"`)
        } else {
            await handle(async () => {
                for (const row of parsed.mappedRows) {
                    const {name, teachers, capacity} = row
                    if (!name || !teachers || !capacity || Number.isNaN(parseInt(capacity, 10))) {
                        throw new Error('Chybějící informace v csv!')
                    }
                    await addEvent(name, teachers, parseInt(capacity, 10))
                }
                return "Import byl úspěšně proveden!"
            })
        }
        fileImportEl.value = null
    })
    reader.addEventListener('error', () => {
        displayMessage("Chyba při čtení souboru!", '#E75858')
        fileImportEl.value = null
    })
    reader.readAsText(file)
})

const eventListener = new FirestoreListener('events')
eventListener.addEventListener('added', ({detail: change}) => {
    const description = document.createElement('p')
    description.id = `description-${change.doc.id}`
    description.classList.add('event-description')
    const {name, teachers, capacity, participants} = change.doc.data()
    description.innerText = `${name} (${teachers}) - ${participants.length}/${capacity}`

    const button1 = document.createElement('button')
    button1.innerText = "Upravit jméno"
    button1.addEventListener('click', async () => {
        await changeEventAttribute(change.doc, "name")
    })
    const button2 = document.createElement('button')
    button2.innerText = "Upravit učitele"
    button2.addEventListener('click', async () => {
        await changeEventAttribute(change.doc, "teachers")
    })
    const button3 = document.createElement('button')
    button3.innerText = "Upravit kapacitu"
    button3.addEventListener('click', async () => {
        await changeEventAttribute(change.doc, "capacity", true)
    })
    const button4 = document.createElement('button')
    button4.innerText = "Odebrat"
    button4.classList.add('red')
    button4.addEventListener('click', async () => {
        await removeEvent(change.doc.id)
    })

    const div = document.createElement('div')
    div.id = `event-${change.doc.id}`
    div.classList.add('event')
    const buttons = document.createElement('div')
    buttons.classList.add('event-buttons')
    buttons.append(button1, button2, button3, button4)
    div.append(description, buttons)

    document.getElementById('events').append(div)
})
eventListener.addEventListener('modified', ({detail: change}) => {
    const label = document.getElementById(`description-${change.doc.id}`)
    const {name, teachers, capacity, participants} = change.doc.data()
    label.innerText = `${name} (${teachers}) - ${participants.length}/${capacity}`
})
eventListener.addEventListener('removed', ({detail: change}) => {
    document.getElementById(`event-${change.doc.id}`).remove()
})
eventListener.addEventListener('change', ({detail: snapshot}) => {
    events = snapshot.docs.map(doc => doc.data())
})
