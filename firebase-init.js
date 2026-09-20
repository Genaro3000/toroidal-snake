// Shared Firebase setup, used by both index.html and game.html
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCjnrWdyPzj2Ecm0pUeZky7jpc72IJs58M",
  authDomain: "ghost-snake.firebaseapp.com",
  projectId: "ghost-snake",
  storageBucket: "ghost-snake.firebasestorage.app",
  messagingSenderId: "949395022811",
  appId: "1:949395022811:web:558eb1d89ffe7e0703bdfe"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
