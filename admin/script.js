// --- FIREBASE IMPORTS ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, onSnapshot, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// --- CONFIGURATION ---
const firebaseConfig = {
  apiKey: "AIzaSyC_L2va6-rxNLjg4ag9WHSSPMVFroRitrA",
  authDomain: "mvh-ticket.firebaseapp.com",
  projectId: "mvh-ticket",
  storageBucket: "mvh-ticket.firebasestorage.app",
  messagingSenderId: "263958385684",
  appId: "1:263958385684:web:ebfe74b7cba703739c4301",
  measurementId: "G-PB2QWXCKTE"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

const notificationSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
let globalTickets = []; 
let unsubscribeListener = null; 

// --- 1. AUTH STATE OBSERVER (Runs automatically) ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log("User is signed in:", user.email);
        document.getElementById('login-modal').classList.add('hidden');
        document.getElementById('logoutBtn').classList.remove('hidden');
        document.getElementById('user-info').innerText = `Hello, ${user.displayName}`;
        startRealTimeListener(); 
    } else {
        console.log("User is signed out");
        document.getElementById('login-modal').classList.remove('hidden');
        document.getElementById('logoutBtn').classList.add('hidden');
        document.getElementById('user-info').innerText = '';
        if(unsubscribeListener) unsubscribeListener();
        renderAdminTable([]); 
    }
});

// --- 2. LOGIN BUTTON LOGIC ---
const loginBtn = document.getElementById('googleLoginBtn');
if(loginBtn) {
    console.log("Google Login Button Found in DOM"); // Debug Check
    
    loginBtn.addEventListener('click', () => {
        console.log("Login Button Clicked"); // Debug Check
        
        // Visual Feedback
        const originalContent = loginBtn.innerHTML;
        loginBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i><span>Signing in...</span>`;
        loginBtn.disabled = true;
        const errDisplay = document.getElementById('login-error-msg');
        errDisplay.classList.add('hidden');

        signInWithPopup(auth, provider)
            .then((result) => {
                console.log("Login Success");
                // onAuthStateChanged will handle the UI update
            })
            .catch((error) => {
                console.error("Login Error:", error);
                
                // Reset Button
                loginBtn.innerHTML = originalContent;
                loginBtn.disabled = false;

                // Show Error
                let msg = error.message;
                if (error.code === 'auth/popup-closed-by-user') msg = "Login cancelled.";
                if (error.code === 'auth/unauthorized-domain') msg = "Domain not authorized in Firebase Console.";
                
                errDisplay.innerText = msg;
                errDisplay.classList.remove('hidden');
            });
    });
} else {
    console.error("CRITICAL: Google Login Button NOT found in DOM");
}

// --- 3. LOGOUT LOGIC ---
const logoutBtn = document.getElementById('logoutBtn');
if(logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        signOut(auth).then(() => {
            // onAuthStateChanged will handle UI
        }).catch((error) => console.error("Sign out error", error));
    });
}

// --- 4. REAL-TIME DB LISTENER ---
function startRealTimeListener() {
    unsubscribeListener = onSnapshot(collection(db, "tickets"), (snapshot) => {
        let tickets = [];
        snapshot.forEach((doc) => {
            tickets.push({ firebaseId: doc.id, ...doc.data() });
        });
        
        if (globalTickets.length > 0 && tickets.length > globalTickets.length) {
            playNotification();
        }
        
        globalTickets = tickets; 
        renderAdminTable(tickets);
    }, (error) => {
        console.error("Database Error:", error);
        if(error.code === 'permission-denied') {
            alert("Permission Denied: Database rules might be blocking access.");
        }
    });
}

function playNotification() {
    notificationSound.play().catch(e => console.log("Audio blocked"));
    const toast = document.getElementById('admin-toast');
    if(toast) {
        toast.classList.remove('hidden', 'translate-y-10', 'opacity-0');
        setTimeout(() => toast.classList.add('translate-y-10', 'opacity-0'), 4000);
        setTimeout(() => toast.classList.add('hidden'), 4300);
    }
}

// --- 5. RENDER LOGIC ---
function renderAdminTable(tickets) {
    const activeTickets = tickets.filter(t => t.status !== 'Resolved');
    const resolvedTickets = tickets.filter(t => t.status === 'Resolved');

    const statusOrder = { 'Open': 1, 'Pending': 2 };
    activeTickets.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
    resolvedTickets.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    let openCount = 0;
    let pendingCount = 0;
    activeTickets.forEach(t => {
        if(t.status === 'Open') openCount++;
        if(t.status === 'Pending') pendingCount++;
    });

    const countOpenEl = document.getElementById('count-open');
    const countPendingEl = document.getElementById('count-pending');
    if(countOpenEl) countOpenEl.innerText = openCount;
    if(countPendingEl) countPendingEl.innerText = pendingCount;

    const activeBody = document.getElementById('admin-ticket-list');
    activeBody.innerHTML = ''; 
    const today = new Date().toLocaleDateString();

    if(activeTickets.length === 0) activeBody.innerHTML = `<tr><td colspan="7" class="p-8 text-center text-gray-400">No active tickets.</td></tr>`;
    activeTickets.forEach(t => activeBody.appendChild(createTicketRow(t, today, false)));

    const resolvedSection = document.getElementById('resolved-section');
    const resolvedBody = document.getElementById('resolved-ticket-list');
    if (resolvedTickets.length > 0) {
        resolvedSection.classList.remove('hidden');
        resolvedBody.innerHTML = '';
        resolvedTickets.forEach(t => resolvedBody.appendChild(createTicketRow(t, today, true)));
    } else {
        resolvedSection.classList.add('hidden');
    }
}

function createTicketRow(t, today, isResolved) {
    let ticketTime = new Date().getTime();
    if(t.timestamp) ticketTime = new Date(t.timestamp).getTime();
    
    const currentTime = new Date().getTime();
    const hoursDiff = (currentTime - ticketTime) / (1000 * 60 * 60);
    const isNew = (!isResolved && hoursDiff < 1); 

    const tr = document.createElement('tr');
    tr.className = isResolved ? "border-b bg-gray-50 opacity-75" : "border-b hover:bg-slate-50 transition";
    
    let statusClass = '';
    if(t.status === 'Open') statusClass = 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200';
    if(t.status === 'Pending') statusClass = 'bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-200';
    if(t.status === 'Resolved') statusClass = 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200';

    const specificItem = t.specific_item || t.category;
    const displayDate = t.displayTime || t.timestamp;
    const docId = t.firebaseId;

    tr.innerHTML = `
        <td class="p-4 font-mono font-bold text-slate-700">
            ${t.id}
            ${isNew ? '<span class="ml-2 bg-indigo-500 text-white text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm animate-pulse">NEW</span>' : ''}
        </td>
        <td class="p-4 text-xs">${displayDate}</td>
        <td class="p-4">
            <div class="font-bold text-slate-800">${t.name}</div>
            <div class="text-xs text-gray-500">${t.dept}</div>
        </td>
        <td class="p-4"><span class="bg-gray-100 px-2 py-1 rounded text-xs font-semibold">${specificItem}</span></td>
        <td class="p-4 font-bold text-blue-700 text-xs">${t.desc}</td>
        <td class="p-4">
            <button onclick="window.openViewModal('${docId}')" title="View Details" class="px-3 py-1 rounded-full text-xs font-bold border ${statusClass} transition-colors duration-150">
                ${t.status}
            </button>
        </td>
        <td class="p-4 text-right flex justify-end items-center mt-2">
            <button onclick="window.printTicket('${docId}')" class="text-blue-600 hover:text-blue-800 mx-1 bg-blue-50 p-2 rounded shadow-sm border border-blue-200 transition" title="Print Job Order">
                <i class="fa-solid fa-print"></i>
            </button>
            <div class="w-px h-6 bg-gray-300 mx-2"></div>
            ${!isResolved ? `
                <button onclick="window.updateStatus('${docId}', 'Pending')" class="text-yellow-500 hover:text-yellow-700 mx-1 bg-white p-2 rounded shadow-sm border" title="Mark Pending"><i class="fa-solid fa-clock"></i></button>
                <button onclick="window.updateStatus('${docId}', 'Resolved')" class="text-green-500 hover:text-green-700 mx-1 bg-white p-2 rounded shadow-sm border" title="Mark Done"><i class="fa-solid fa-check"></i></button>
            ` : `
                <button onclick="window.updateStatus('${docId}', 'Open')" class="text-gray-400 hover:text-blue-600 mx-1 text-xs" title="Re-Open"><i class="fa-solid fa-arrow-rotate-left"></i></button>
            `}
             <button onclick="window.deleteTicket('${docId}')" class="text-gray-300 hover:text-red-500 mx-1" title="Delete"><i class="fa-solid fa-trash"></i></button>
        </td>
    `;
    return tr;
}

// --- GLOBAL FUNCTIONS ---
window.openViewModal = function(docId) {
    const t = globalTickets.find(ticket => ticket.firebaseId === docId);
    if(!t) return;

    document.getElementById('modal-title').innerText = `Ticket Details: ${t.id}`;
    document.getElementById('modal-date').innerText = t.displayTime || t.timestamp;
    document.getElementById('modal-requester').innerText = t.name;
    document.getElementById('modal-dept').innerText = t.dept;
    document.getElementById('modal-category').innerText = t.category;
    document.getElementById('modal-desc').innerText = t.desc;
    document.getElementById('modal-specific').innerText = t.specific_item || 'General';
    
    const serialCont = document.getElementById('modal-serial-container');
    if(t.serial_no && t.serial_no !== 'N/A') {
        document.getElementById('modal-serial').innerText = t.serial_no;
        serialCont.classList.remove('hidden');
    } else { serialCont.classList.add('hidden'); }

    const statusBanner = document.getElementById('modal-status-banner');
    statusBanner.innerText = t.status;
    statusBanner.className = 'p-2 rounded text-center font-bold text-sm uppercase mb-4 text-white ';
    if(t.status === 'Open') statusBanner.classList.add('bg-red-500');
    if(t.status === 'Pending') statusBanner.classList.add('bg-yellow-500');
    if(t.status === 'Resolved') statusBanner.classList.add('bg-green-500');

    document.getElementById('modal-print-btn').onclick = () => window.printTicket(docId);
    document.getElementById('view-modal').classList.remove('hidden');
}

window.closeViewModal = function() { document.getElementById('view-modal').classList.add('hidden'); }

window.updateStatus = async function(docId, newStatus) {
    try {
        const ticketRef = doc(db, "tickets", docId);
        await updateDoc(ticketRef, { status: newStatus });
    } catch (e) {
        console.error("Error updating status: ", e);
        alert("Failed to update status.");
    }
}

window.deleteTicket = async function(docId) {
    if(!confirm('Permanently delete this ticket?')) return;
    try {
        await deleteDoc(doc(db, "tickets", docId));
    } catch (e) {
        console.error("Error deleting ticket: ", e);
        alert("Failed to delete ticket.");
    }
}

window.printTicket = function(docId) {
    const t = globalTickets.find(ticket => ticket.firebaseId === docId);
    if (!t) { alert('Ticket not found'); return; }

    let dateOnly = 'N/A';
    if(t.displayTime) {
        const parts = t.displayTime.split(' ');
        if(parts.length >= 3) { dateOnly = parts[0]; } else { dateOnly = t.displayTime; }
    } else {
        const d = new Date(t.timestamp);
        dateOnly = d.toLocaleDateString();
    }

    const specificInfo = t.specific_item || t.category;
    const serialInfo = (t.serial_no && t.serial_no !== 'N/A') ? t.serial_no : '';

    const printWindow = window.open('', '', 'height=800,width=1000');
    printWindow.document.write(`
        <html><head><title>${t.id}</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; display: flex; justify-content: center; }
            .ticket-card { width: 8.5in; border: 2px solid #333; padding: 20px; box-sizing: border-box; }
            .header { text-align: center; border-bottom: 2px solid #333; margin-bottom: 20px; }
            .header h1 { margin: 0; font-size: 18px; text-transform: uppercase; letter-spacing: 1px; }
            .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; font-size: 12px; }
            .label { font-weight: bold; color: #555; text-transform: uppercase; font-size: 10px; }
            .value { border-bottom: 1px dotted #999; font-weight: bold; }
            .issue-box { border: 1px solid #ddd; background: #f9f9f9; padding: 15px; min-height: 120px; margin-bottom: 20px; }
            .footer-id { position: absolute; top: 15px; right: 15px; font-family: monospace; font-size: 14px; font-weight: bold; border: 1px solid #333; padding: 3px 8px; background: #eee; }
            .signatures { margin-top: 40px; display: flex; justify-content: space-between; gap: 20px; }
            .sig-line { flex: 1; border-top: 1px solid black; text-align: center; font-size: 10px; padding-top: 5px; font-weight: bold; }
            @media print { @page { margin: 0; } body { margin: 0.5in; } }
        </style></head><body>
        <div class="ticket-card" style="position:relative;">
            <div class="footer-id">TRF No.: ${t.id}<br>Date: ${dateOnly}</div>
            <div class="header"><p>Metro Vigan Hospital</p><h1>Trouble Report Form</h1></div>
            <div class="meta-grid">
                <div><div class="label">Requested By</div><div class="value">${t.name}</div></div>
                <div><div class="label">Department / Station</div><div class="value">${t.dept}</div></div>
                <div><div class="label">Category</div><div class="value">${t.category}</div></div>
                <div><div class="label">Details</div><div class="value">${specificInfo}</div></div>
                ${serialInfo ? `<div><div class="label">Serial No.:</div><div class="value">${serialInfo}</div></div>` : ''}
            </div>
            <div class="issue-box"><strong>ISSUE DESCRIPTION:</strong><br>${t.desc}</div>
            <div style="margin-top:10px;"><strong>ACTION TAKEN / RESOLUTION:</strong><br><div style="border-bottom:1px solid #ccc; height:25px; margin-bottom:5px;"></div><div style="border-bottom:1px solid #ccc; height:25px; margin-bottom:5px;"></div></div>
            <div class="signatures"><div class="sig-line">IT-in-Charge</div><div class="sig-line">Approved By</div></div>
            <div style="font-size:12px; margin-top:5px; font-weight:bold;">MA-009-2</div>
        </div></body></html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
}