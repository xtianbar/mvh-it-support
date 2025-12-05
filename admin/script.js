import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, onSnapshot, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// NEW CONFIGURATION
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

let globalTickets = [];
const notificationSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');

// STARTUP
console.log("Starting listener...");
onSnapshot(collection(db, "tickets"), (snapshot) => {
    console.log("Snapshot received:", snapshot.size, "docs");
    let tickets = [];
    snapshot.forEach((doc) => { tickets.push({ firebaseId: doc.id, ...doc.data() }); });
    
    if(globalTickets.length > 0 && tickets.length > globalTickets.length) {
        playNotification();
    }

    globalTickets = tickets; 
    renderAdminTable(tickets);
}, (error) => {
    console.error("DB Error:", error);
    if(error.code === 'permission-denied') alert("Error: Firebase Rules Blocked. Make sure Firestore rules are set to public.");
});

function playNotification() {
    notificationSound.play().catch(e => console.log("Audio blocked"));
    const toast = document.getElementById('admin-toast');
    if(toast) {
        toast.classList.remove('hidden', 'translate-y-10', 'opacity-0');
        setTimeout(() => toast.classList.add('translate-y-10', 'opacity-0'), 4000);
        setTimeout(() => toast.classList.add('hidden'), 4300);
    }
}

function renderAdminTable(tickets) {
    const activeTickets = tickets.filter(t => t.status !== 'Resolved');
    const resolvedTickets = tickets.filter(t => t.status === 'Resolved');
    
    // Sort
    const statusOrder = { 'Open': 1, 'Pending': 2 };
    activeTickets.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
    resolvedTickets.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Counts
    let open = 0, pending = 0;
    activeTickets.forEach(t => { if(t.status==='Open') open++; if(t.status==='Pending') pending++; });
    document.getElementById('count-open').innerText = open;
    document.getElementById('count-pending').innerText = pending;

    // Render Active
    const activeBody = document.getElementById('admin-ticket-list');
    activeBody.innerHTML = '';
    if(activeTickets.length === 0) activeBody.innerHTML = `<tr><td colspan="7" class="p-8 text-center text-gray-400">No active tickets.</td></tr>`;
    activeTickets.forEach(t => activeBody.appendChild(createTicketRow(t, false)));

    // Render Resolved
    const resSection = document.getElementById('resolved-section');
    const resBody = document.getElementById('resolved-ticket-list');
    if(resolvedTickets.length > 0) {
        resSection.classList.remove('hidden');
        resBody.innerHTML = '';
        resolvedTickets.forEach(t => resBody.appendChild(createTicketRow(t, true)));
    } else { resSection.classList.add('hidden'); }
}

function createTicketRow(t, isResolved) {
    const tr = document.createElement('tr');
    tr.className = isResolved ? "border-b bg-gray-50 opacity-75" : "border-b hover:bg-slate-50";
    
    let ticketTime = new Date().getTime();
    if(t.timestamp) ticketTime = new Date(t.timestamp).getTime();
    const isNew = (!isResolved && ((new Date().getTime() - ticketTime) / 36e5) < 1);
    
    let statusClass = t.status === 'Open' ? 'bg-red-100 text-red-700 border-red-200' : (t.status === 'Pending' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' : 'bg-green-100 text-green-700 border-green-200');
    const item = t.specific_item || t.category;
    const displayDate = t.displayTime || t.timestamp;

    tr.innerHTML = `
        <td class="p-4 font-mono font-bold text-slate-700">${t.id} ${isNew ? '<span class="ml-2 bg-indigo-500 text-white text-[10px] px-2 rounded-full animate-pulse">NEW</span>' : ''}</td>
        <td class="p-4 text-xs">${displayDate}</td>
        <td class="p-4"><div class="font-bold text-slate-800">${t.name}</div><div class="text-xs text-gray-500">${t.dept}</div></td>
        <td class="p-4"><span class="bg-gray-100 px-2 py-1 rounded text-xs font-semibold">${item}</span></td>
        <td class="p-4 font-bold text-blue-700 text-xs">${t.desc}</td>
        <td class="p-4"><button onclick="window.openViewModal('${t.firebaseId}')" class="px-3 py-1 rounded-full text-xs font-bold border ${statusClass}">${t.status}</button></td>
        <td class="p-4 text-right flex justify-end items-center mt-2">
            <button onclick="window.printTicket('${t.firebaseId}')" class="text-blue-600 hover:text-blue-800 mx-1 bg-blue-50 p-2 rounded border border-blue-200"><i class="fa-solid fa-print"></i></button>
            ${!isResolved ? `
                <button onclick="window.updateStatus('${t.firebaseId}', 'Pending')" class="text-yellow-500 hover:text-yellow-700 mx-1 bg-white p-2 rounded border"><i class="fa-solid fa-clock"></i></button>
                <button onclick="window.updateStatus('${t.firebaseId}', 'Resolved')" class="text-green-500 hover:text-green-700 mx-1 bg-white p-2 rounded border"><i class="fa-solid fa-check"></i></button>
            ` : `<button onclick="window.updateStatus('${t.firebaseId}', 'Open')" class="text-gray-400 hover:text-blue-600 mx-1 text-xs">Re-Open</button>`}
            <button onclick="window.deleteTicket('${t.firebaseId}')" class="text-gray-300 hover:text-red-500 mx-1"><i class="fa-solid fa-trash"></i></button>
        </td>
    `;
    return tr;
}

// GLOBAL ACTIONS
window.openViewModal = (id) => {
    const t = globalTickets.find(x => x.firebaseId === id);
    if(!t) return;
    document.getElementById('modal-title').innerText = `Details: ${t.id}`;
    document.getElementById('modal-date').innerText = t.displayTime;
    document.getElementById('modal-requester').innerText = t.name;
    document.getElementById('modal-dept').innerText = t.dept;
    document.getElementById('modal-category').innerText = t.category;
    document.getElementById('modal-desc').innerText = t.desc;
    document.getElementById('modal-specific').innerText = t.specific_item || 'General';
    
    const serial = document.getElementById('modal-serial-container');
    if(t.serial_no && t.serial_no !== 'N/A') {
        document.getElementById('modal-serial').innerText = t.serial_no;
        serial.classList.remove('hidden');
    } else serial.classList.add('hidden');

    const banner = document.getElementById('modal-status-banner');
    banner.innerText = t.status;
    banner.className = 'p-2 rounded text-center font-bold text-sm uppercase mb-4 text-white ' + (t.status === 'Open' ? 'bg-red-500' : (t.status === 'Pending' ? 'bg-yellow-500' : 'bg-green-500'));

    document.getElementById('modal-print-btn').onclick = () => window.printTicket(id);
    document.getElementById('view-modal').classList.remove('hidden');
};

window.closeViewModal = () => document.getElementById('view-modal').classList.add('hidden');
window.updateStatus = (id, s) => updateDoc(doc(db, "tickets", id), { status: s });
window.deleteTicket = (id) => { if(confirm('Delete?')) deleteDoc(doc(db, "tickets", id)); };

window.printTicket = (id) => {
    const t = globalTickets.find(x => x.firebaseId === id);
    if(!t) return;
    
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

    const win = window.open('', '', 'height=800,width=1000');
    win.document.write(`
        <html><head><title>${t.id}</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; display: flex; justify-content: center; }
            .ticket-card { width: 8.5in; border: 2px solid #333; padding: 20px; box-sizing: border-box; position:relative; }
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
        <div class="ticket-card">
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
        </div>
        <script>setTimeout(() => { window.print(); window.close(); }, 500);<\/script>
        </body></html>
    `);
};