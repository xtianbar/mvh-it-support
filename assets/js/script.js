// 1. IMPORT FIREBASE
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, query, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 2. CONFIGURATION
const firebaseConfig = {
    apiKey: "AIzaSyDGpoIwJUjspNV9duYj2Xi7yAb8088sEOc",
    authDomain: "mvh-ticketing.firebaseapp.com",
    databaseURL: "https://mvh-ticketing-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "mvh-ticketing",
    storageBucket: "mvh-ticketing.firebasestorage.app",
    messagingSenderId: "422093058612",
    appId: "1:422093058612:web:196557c452d9e7dce8d061"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let selectedCategory = null;

// --- CUSTOM ERROR FUNCTIONS ---
window.showError = function(message) {
    const modal = document.getElementById('error-modal');
    const text = document.getElementById('error-text');
    if(modal && text) {
        text.innerText = message;
        modal.classList.remove('hidden');
    } else {
        // Fallback if HTML is missing
        alert("Error: " + message);
    }
}

window.closeError = function() {
    document.getElementById('error-modal').classList.add('hidden');
}

// GLOBAL FUNCTION: Select Category
window.selectCategory = function(btn, cat) {
    document.querySelectorAll('.cat-btn').forEach(b => {
        b.classList.remove('border-green-500', 'bg-green-50', 'ring-2', 'ring-green-200');
        b.classList.add('border-gray-200');
        if(b.querySelector('i')) b.querySelector('i').classList.remove('text-green-600');
        if(b.querySelector('div')) b.querySelector('div').classList.remove('text-green-700');
    });
    btn.classList.remove('border-gray-200');
    btn.classList.add('border-green-500', 'bg-green-50', 'ring-2', 'ring-green-200');
    if(btn.querySelector('i')) btn.querySelector('i').classList.add('text-green-600');
    if(btn.querySelector('div')) btn.querySelector('div').classList.add('text-green-700');
    
    selectedCategory = cat;

    const dynSection = document.getElementById('dynamic-section');
    const swOpts = document.getElementById('software-options');
    const hwOpts = document.getElementById('hardware-options');

    if(dynSection) dynSection.classList.remove('hidden');

    if(cat === 'Software') {
        if(swOpts) swOpts.classList.remove('hidden');
        if(hwOpts) hwOpts.classList.add('hidden');
    } else {
        if(swOpts) swOpts.classList.add('hidden');
        if(hwOpts) hwOpts.classList.remove('hidden');
    }
}

// GLOBAL FUNCTION: Submit Ticket
window.submitTicket = async function() {
    const name = document.getElementById('empName').value;
    const dept = document.getElementById('empDept').value;
    const desc = document.getElementById('empDesc').value;

    // VALIDATION: Using Custom Error instead of Alert
    if (!name || !desc || !dept) { window.showError("Please fill in basic info."); return; }
    if (!selectedCategory) { window.showError("Please select a category."); return; }

    let specificItem = '';
    let serialNo = 'N/A';

    if (selectedCategory === 'Software') {
        const swSelect = document.getElementById('software-select');
        if(swSelect && swSelect.value === "") { window.showError("Please select a Software System."); return; }
        if(swSelect) specificItem = swSelect.value;
    } else {
        const hwName = document.getElementById('hardware-name');
        const hwSerial = document.getElementById('hardware-serial');
        if(hwName && !hwName.value) { window.showError("Please enter the Machine Name."); return; }
        if(hwName) specificItem = hwName.value;
        if(hwSerial) serialNo = hwSerial.value || 'N/A';
    }

    const btn = document.querySelector('button[onclick="submitTicket()"]');
    const originalText = btn ? btn.innerHTML : "Submit";
    if(btn) {
        btn.disabled = true;
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Submitting...`;
    }

    try {
        const ticketsRef = collection(db, "tickets");
        const q = query(ticketsRef, orderBy("timestamp", "desc"), limit(1));
        const querySnapshot = await getDocs(q);

        let nextIdNum = 1000;

        if (!querySnapshot.empty) {
            const lastTicket = querySnapshot.docs[0].data();
            const lastIdString = lastTicket.id; 
            const lastNum = parseInt(lastIdString.split('-')[1]);
            
            if (!isNaN(lastNum)) {
                nextIdNum = lastNum + 1;
            }
        }

        const newId = 'IT-' + nextIdNum;

        await addDoc(collection(db, "tickets"), {
            id: newId,
            name: name,
            dept: dept,
            category: selectedCategory,
            specific_item: specificItem,
            serial_no: serialNo,
            desc: desc,
            status: 'Open',
            timestamp: new Date().toISOString(), 
            displayTime: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
        });

        const toast = document.getElementById('toast');
        if(toast) toast.classList.remove('hidden');
        
        setTimeout(() => location.reload(), 2000);

    } catch (e) {
        console.error("Firebase Error:", e);
        
        // --- USE CUSTOM ERROR HERE ---
        window.showError(e.message);
        
        if(btn) {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    }
};