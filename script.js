import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
        // ADDED: query, orderBy, limit, getDocs
        import { getFirestore, collection, addDoc, query, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

        // YOUR CONFIG
        const firebaseConfig = {
            apiKey: "AIzaSyC_L2va6-rxNLjg4ag9WHSSPMVFroRitrA",
            authDomain: "mvh-ticket.firebaseapp.com",
            projectId: "mvh-ticket",
            storageBucket: "mvh-ticket.firebasestorage.app",
            messagingSenderId: "263958385684",
            appId: "1:263958385684:web:ebfe74b7cba703739c4301",
            measurementId: "G-PB2QWXCKTE"
        };

        // Initialize
        const app = initializeApp(firebaseConfig);
        const db = getFirestore(app);
        
        let selectedCategory = null;

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

            // Toggle Dynamic Section
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

            if (!name || !desc || !dept) { alert("Please fill in basic info."); return; }
            if (!selectedCategory) { alert("Please select a category."); return; }

            let specificItem = '';
            let serialNo = 'N/A';

            if (selectedCategory === 'Software') {
                const swSelect = document.getElementById('software-select');
                if(swSelect && swSelect.value === "") { alert("Please select a Software System."); return; }
                if(swSelect) specificItem = swSelect.value;
            } else {
                const hwName = document.getElementById('hardware-name');
                const hwSerial = document.getElementById('hardware-serial');
                if(hwName && !hwName.value) { alert("Please enter the Machine Name."); return; }
                if(hwName) specificItem = hwName.value;
                if(hwSerial) serialNo = hwSerial.value || 'N/A';
            }

            // Button State
            const btn = document.querySelector('button[onclick="submitTicket()"]');
            const originalText = btn ? btn.innerHTML : "Submit";
            if(btn) {
                btn.disabled = true;
                btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Generating ID...`;
            }

            try {
                // --- NEW INCREMENTAL ID LOGIC ---
                // 1. Query the latest ticket created (sort by timestamp desc, limit 1)
                const ticketsRef = collection(db, "tickets");
                const q = query(ticketsRef, orderBy("timestamp", "desc"), limit(1));
                const querySnapshot = await getDocs(q);

                let nextIdNum = 1000; // Default start if database is empty

                if (!querySnapshot.empty) {
                    // Get the last ticket's ID (e.g., "IT-1005")
                    const lastTicket = querySnapshot.docs[0].data();
                    const lastIdString = lastTicket.id; 
                    
                    // Split "IT-1005" -> ["IT", "1005"] -> 1005
                    const lastNum = parseInt(lastIdString.split('-')[1]);
                    
                    if (!isNaN(lastNum)) {
                        nextIdNum = lastNum + 1;
                    }
                }

                const newId = 'IT-' + nextIdNum;
                // --------------------------------

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
                alert("Error: " + e.message);
                
                if(btn) {
                    btn.disabled = false;
                    btn.innerHTML = originalText;
                }
            }
        };