import {initializeApp} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import * as firestore from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js"
import {
    getAuth,
    GoogleAuthProvider,
    setPersistence,
    inMemoryPersistence
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js"

const firebaseConfig = {
    apiKey: "AIzaSyCrjGr5FZ5CEJLs1ng1NxQNbi8mJxAvsqE",
    authDomain: window.location.hostname === 'localhost' ? "dny-za-skolou-4482.firebaseapp.com" : 'dny-za-skolou.netlify.app',
    projectId: "dny-za-skolou-4482",
    storageBucket: "dny-za-skolou-4482.firebasestorage.app",
    messagingSenderId: "90174157410",
    appId: "1:90174157410:web:cafc26ecdb0e07d389573b",
    measurementId: "G-J9070W0SLY"
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