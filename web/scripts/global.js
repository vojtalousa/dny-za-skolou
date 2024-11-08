import {initializeApp} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import * as firestore from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js"
import {
    getAuth,
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
export const db = firestore.getFirestore(app);

const messageContainerEl = document.createElement('div')
messageContainerEl.classList.add('message-container')
const messageEl = document.createElement('div')
messageEl.id = 'message'
messageContainerEl.appendChild(messageEl)
document.body.appendChild(messageContainerEl)

let messageTimeout
export const closeMessage = () => {
    messageEl.style.transform = 'translateY(calc(100% + 25px))'
    setTimeout(() => messageEl.style.visibility = "hidden", 300)
}
export const displayMessage = (text, color = '#E75858', persistent = false) => {
    clearTimeout(messageTimeout)
    messageEl.style.backgroundColor = color
    messageEl.textContent = text
    messageEl.style.visibility = "visible"
    messageEl.style.transform = "translateY(0)"
    if (!persistent) messageTimeout = setTimeout(closeMessage, 5000)
}

export const getGoogleAuth = async () => {
    const auth = getAuth();
    await setPersistence(auth, inMemoryPersistence).catch((e) => {
        displayMessage('Chyba při nastavování přihlášení, obnovte prosím stránku!', '#E75858', true)
        throw new Error(`Error setting persistence: ${e}`)
    })
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({prompt: 'select_account'});
    return {auth, provider}
}

export class FirestoreListener extends EventTarget {
    constructor(collection) {
        super();
        this.collection = collection
        this.query = firestore.query(firestore.collection(db, collection));
        firestore.onSnapshot(this.query, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                this.dispatchEvent(new CustomEvent(change.type, {detail: change}))
            })
            this.dispatchEvent(new CustomEvent('change', {detail: snapshot}))
        })
    }
}