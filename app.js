// --- Configuration & State ---
const ADMIN_PASSWORD = "BetaEta#1";

// Hardcoded authorized admins with updated emails
const ADMIN_USERS = [
    { id: "admin_1", name: "Gus Hyman", email: "gus.j.hyman@gmail.com" },
    { id: "admin_2", name: "Fake Gus", email: "gushyman@ufl.edu" }
];

// INITIALIZE EMAILJS - Replace with your actual Public Key from EmailJS
// emailjs.init("YOUR_PUBLIC_KEY_HERE"); 

// Master state for timeslots
let timeslots = []; 

// --- Initialization & Local Storage ---
document.addEventListener("DOMContentLoaded", () => {
    loadSlots();
    populateAdminDropdown();
    renderCalendar();
});

// Save to browser memory so slots survive a page refresh
function saveSlots() {
    localStorage.setItem('dsp_office_hours_slots', JSON.stringify(timeslots));
}

// Load from browser memory on page load
function loadSlots() {
    const saved = localStorage.getItem('dsp_office_hours_slots');
    if (saved) {
        timeslots = JSON.parse(saved);
    }
}

// --- UI / Modal Controls ---
function openModal(modalId) {
    document.getElementById(modalId).classList.remove("hidden");
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.add("hidden");
}

// --- Admin Authentication & Routing ---
function openAdminAuth() {
    document.getElementById("admin-password").value = "";
    openModal("admin-auth-modal");
}

function verifyAdmin() {
    const pwd = document.getElementById("admin-password").value;
    if (pwd === ADMIN_PASSWORD) {
        closeModal("admin-auth-modal");
        openModal("admin-dashboard-modal");
    } else {
        alert("Incorrect password. Access denied.");
    }
}

function populateAdminDropdown() {
    const select = document.getElementById("admin-host");
    select.innerHTML = ""; 
    ADMIN_USERS.forEach(admin => {
        const option = document.createElement("option");
        option.value = admin.id;
        option.text = `${admin.name} (${admin.email})`;
        select.appendChild(option);
    });
}

// --- Slot Generation Logic ---
function generateTimeslots() {
    const dateStr = document.getElementById("admin-date").value;
    const startTimeStr = document.getElementById("admin-start").value;
    const endTimeStr = document.getElementById("admin-end").value;
    const adminId = document.getElementById("admin-host").value;
    const location = document.getElementById("admin-location").value;

    if (!dateStr || !startTimeStr || !endTimeStr || !location) {
        alert("Please fill out all fields, including the date.");
        return;
    }

    const selectedAdmin = ADMIN_USERS.find(a => a.id === adminId);

    const dateObj = new Date(dateStr + "T00:00:00");
    const formattedDate = dateObj.toLocaleDateString('en-US', { 
        weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' 
    });

    const baseDate = "1970-01-01T";
    let current = new Date(baseDate + startTimeStr + ":00");
    const end = new Date(baseDate + endTimeStr + ":00");

    if (current >= end) {
        alert("End time must be after start time.");
        return;
    }

    let generatedCount = 0;
    while (current < end) {
        const next = new Date(current.getTime() + 30 * 60000);
        
        if (next > end) break;

        // Create a real timestamp for exact expiration logic
        const slotStartObj = new Date(`${dateStr}T${current.toTimeString().split(' ')[0]}`);

        timeslots.push({
            id: 'slot_' + Date.now() + Math.random().toString(36).substr(2, 9),
            date: formattedDate,
            startTime: formatTime(current),
            endTime: formatTime(next),
            startTimestamp: slotStartObj.getTime(), // Hidden data for expiration
            hostName: selectedAdmin.name,
            adminEmail: selectedAdmin.email,
            location: location,
            isBooked: false
        });

        current = next;
        generatedCount++;
    }

    saveSlots(); // Save newly generated slots to memory

    alert(`Successfully generated ${generatedCount} time slots for ${formattedDate}.`);
    closeModal("admin-dashboard-modal");
    renderCalendar();
}

function formatTime(dateObj) {
    return dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

// --- Calendar Rendering & Expiration Logic ---
function renderCalendar() {
    const grid = document.getElementById("calendar-grid");
    grid.innerHTML = ""; 

    const currentTime = Date.now();

    // Filter out booked slots AND slots that have already passed in time
    const availableSlots = timeslots.filter(slot => {
        const isFuture = slot.startTimestamp > currentTime;
        return !slot.isBooked && isFuture;
    });

    if (availableSlots.length === 0) {
        grid.innerHTML = `<p class="col-span-full text-gray-500 italic text-center py-8">No available timeslots currently. Check back later.</p>`;
        return;
    }

    availableSlots.forEach(slot => {
        const card = document.createElement("div");
        card.className = "bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow p-5 cursor-pointer border-l-4 border-l-dsp-gold flex flex-col justify-between";
        card.onclick = () => initBooking(slot.id);

        card.innerHTML = `
            <div>
                <div class="text-sm font-bold text-gray-500 uppercase tracking-wide mb-1">📅 ${slot.date}</div>
                <div class="text-lg font-bold text-dsp-purple mb-3">🕒 ${slot.startTime} - ${slot.endTime}</div>
                <div class="text-sm text-gray-700 mb-1"><strong>Host:</strong> ${slot.hostName}</div>
                <div class="text-sm text-gray-700"><strong>Room:</strong> ${slot.location}</div>
            </div>
            <div class="mt-4 text-sm text-dsp-gold font-semibold tracking-wide uppercase group-hover:underline">Book Slot &rarr;</div>
        `;
        grid.appendChild(card);
    });
}

// --- Booking & Exclusivity Logic ---
function initBooking(slotId) {
    const slot = timeslots.find(s => s.id === slotId);
    if (!slot) return;

    document.getElementById("book-name").value = "";
    document.getElementById("book-topic").value = "";
    document.getElementById("book-info").value = "";

    document.getElementById("book-slot-id").value = slot.id;
    document.getElementById("modal-slot-info").innerText = `Booking with ${slot.hostName} on ${slot.date} at ${slot.startTime}`;

    openModal("booking-modal");
}

function confirmMeeting() {
    const slotId = document.getElementById("book-slot-id").value;
    const name = document.getElementById("book-name").value;
    const topic = document.getElementById("book-topic").value;
    const info = document.getElementById("book-info").value;

    if (!name || !topic) {
        alert("Name and Meeting Topic are required.");
        return;
    }

    const slotIndex = timeslots.findIndex(s => s.id === slotId);
    
    // Check if slot was booked in another tab, or time expired while modal was open
    if (slotIndex === -1 || timeslots[slotIndex].isBooked || timeslots[slotIndex].startTimestamp <= Date.now()) {
        alert("Sorry, this slot is no longer available.");
        closeModal("booking-modal");
        renderCalendar();
        return;
    }

    timeslots[slotIndex].isBooked = true;
    saveSlots(); // Save the updated booked status to memory

    triggerAutomatedEmail(timeslots[slotIndex], { name, topic, info });

    alert("Meeting successfully booked!");
    closeModal("booking-modal");
    renderCalendar(); 
}

// --- Real Notification Logic using EmailJS ---
function triggerAutomatedEmail(slotInfo, studentData) {
    
    const templateParams = {
        to_email: slotInfo.adminEmail, 
        host_name: slotInfo.hostName,
        student_name: studentData.name,
        topic: studentData.topic,
        date: slotInfo.date,
        time: `${slotInfo.startTime} - ${slotInfo.endTime}`,
        location: slotInfo.location,
        notes: studentData.info || "None provided"
    };

    // Replace these with your actual Service ID and Template ID from EmailJS
    const serviceID = "YOUR_SERVICE_ID_HERE";
    const templateID = "YOUR_TEMPLATE_ID_HERE";

    // Uncomment this once you have EmailJS configured
    /*
    emailjs.send(serviceID, templateID, templateParams)
        .then((response) => {
            console.log("SUCCESS! Real email sent.", response.status, response.text);
        }, (error) => {
            console.error("FAILED to send email...", error);
            alert("There was an issue sending the confirmation email, but your slot is booked.");
        });
    */
   
    console.log("Simulated Email Sent to: " + templateParams.to_email);
}
