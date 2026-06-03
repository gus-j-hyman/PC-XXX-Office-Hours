// --- 1. CONFIGURATION & STATE ---
const ADMIN_PASSWORD = "BetaEta#1";

// CRITICAL: You must replace this with your actual Public Key from EmailJS Account settings
emailjs.init("aKaqwihPbn46q3V25"); 

// The Updated Roster of 6 Admins
const ADMIN_USERS = [
    { id: "admin_1", name: "Brother Hyman", email: "g.hyman@ufdsp.com" },
    { id: "admin_2", name: "Brother Wechsler", email: "pledgedevelopment@ufdsp.com" },
    { id: "admin_3", name: "Brother Hoyos", email: "a.hoyos@ufdsp.com" },
    { id: "admin_4", name: "Brother Thomas", email: "j.thomas@ufdsp.com" },
    { id: "admin_5", name: "Brother Schneider", email: "z.schneider@ufdsp.com" },
    { id: "admin_6", name: "Brother Haris", email: "s.haris@ufdsp.com" }
];

let timeslots = []; // Array to hold generated slots

// --- 2. INITIALIZATION & LOCAL STORAGE ---
document.addEventListener("DOMContentLoaded", () => {
    loadSlots();
    populateAdminDropdown();
    renderCalendar();
});

function saveSlots() {
    localStorage.setItem('dsp_office_hours_slots', JSON.stringify(timeslots));
}

function loadSlots() {
    const saved = localStorage.getItem('dsp_office_hours_slots');
    if (saved) {
        timeslots = JSON.parse(saved);
    }
}

// --- 3. UI / MODAL CONTROLS ---
function openModal(modalId) {
    document.getElementById(modalId).classList.remove("hidden");
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.add("hidden");
}

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

// --- 4. SLOT GENERATION LOGIC ---
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

        const slotStartObj = new Date(`${dateStr}T${current.toTimeString().split(' ')[0]}`);

        timeslots.push({
            id: 'slot_' + Date.now() + Math.random().toString(36).substr(2, 9),
            date: formattedDate,
            startTime: formatTime(current),
            endTime: formatTime(next),
            startTimestamp: slotStartObj.getTime(), 
            hostName: selectedAdmin.name,
            adminEmail: selectedAdmin.email,
            location: location,
            isBooked: false
        });

        current = next;
        generatedCount++;
    }

    saveSlots(); 

    alert(`Successfully generated ${generatedCount} time slots for ${formattedDate}.`);
    closeModal("admin-dashboard-modal");
    renderCalendar();
}

function formatTime(dateObj) {
    return dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

// --- 5. CALENDAR RENDERING ---
function renderCalendar() {
    const grid = document.getElementById("calendar-grid");
    grid.innerHTML = ""; 

    const currentTime = Date.now();

    const availableSlots = timeslots.filter(slot => {
        const isFuture = slot.startTimestamp > currentTime;
        return !slot.isBooked && isFuture;
    });

    availableSlots.sort((a, b) => a.startTimestamp - b.startTimestamp);

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

// --- 6. BOOKING LOGIC ---
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

    // Disable button to prevent double clicks
    const confirmBtn = document.getElementById("confirm-btn");
    confirmBtn.innerText = "Booking...";
    confirmBtn.disabled = true;

    const slotIndex = timeslots.findIndex(s => s.id === slotId);
    
    if (slotIndex === -1 || timeslots[slotIndex].isBooked || timeslots[slotIndex].startTimestamp <= Date.now()) {
        alert("Sorry, this slot is no longer available.");
        closeModal("booking-modal");
        resetBtn(confirmBtn);
        renderCalendar();
        return;
    }

    timeslots[slotIndex].isBooked = true;
    saveSlots(); 

    // Fire the email
    triggerAutomatedEmail(timeslots[slotIndex], { name, topic, info });

    alert("Meeting successfully booked! An email has been sent to the host.");
    closeModal("booking-modal");
    resetBtn(confirmBtn);
    renderCalendar(); 
}

function resetBtn(btn) {
    btn.innerText = "Confirm Meeting";
    btn.disabled = false;
}

// --- 7. REAL EMAILJS NOTIFICATION LOGIC ---
function triggerAutomatedEmail(slotInfo, studentData) {
    
    // Packages data exactly for your EmailJS Template
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

    // Your specific Service and Template IDs
    const serviceID = "service_txc2r2t";
    const templateID = "template_dpi2ic9";

    // Send the email request
    emailjs.send(serviceID, templateID, templateParams)
        .then((response) => {
            console.log("SUCCESS! Real email sent.", response.status, response.text);
        }, (error) => {
            console.error("FAILED to send email...", error);
            alert("The slot is booked, but there was a network error sending the email notification.");
        });
}
 
