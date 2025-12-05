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