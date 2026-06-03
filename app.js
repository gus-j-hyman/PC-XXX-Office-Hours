// --- Configuration & State ---
const ADMIN_PASSWORD = "BetaEta#1";

// Hardcoded authorized admins with updated emails
const ADMIN_USERS = [
    { id: "admin_1", name: "Gus Hyman", email: "gus.j.hyman@gmail.com" },
    { id: "admin_2", name: "Fake Gus", email: "gushyman@ufl.edu" }
];

// Master state for timeslots
let timeslots = []; // Array of objects: { id, date, startTime, endTime, hostName, adminEmail, location, isBooked }

// --- Initialization ---
document.addEventListener("DOMContentLoaded", () => {
    populateAdminDropdown();
    renderCalendar();
});

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
    select.innerHTML = ""; // Clear existing options
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

    // Format the date for clean UI display (e.g., "Oct 24, 2026")
    const dateObj = new Date(dateStr + "T00:00:00");
    const formattedDate = dateObj.toLocaleDateString('en-US', { 
        weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' 
    });

    // Convert times to Date objects for math (using a dummy base date)
    const baseDate = "1970-01-01T";
    let current = new Date(baseDate + startTimeStr + ":00");
    const end = new Date(baseDate + endTimeStr + ":00");

    if (current >= end) {
        alert("End time must be after start time.");
        return;
    }

    // Split into 30-minute intervals
    let generatedCount = 0;
    while (current < end) {
        const next = new Date(current.getTime() + 30 * 60000);
        
        // Prevent creating a slot that pushes past the exact end time
        if (next > end) break;

        timeslots.push({
            id: 'slot_' + Date.now() + Math.random().toString(36).substr(2, 9),
            date: formattedDate,
            startTime: formatTime(current),
            endTime: formatTime(next),
            hostName: selectedAdmin.name,
            adminEmail: selectedAdmin.email,
            location: location,
            isBooked: false
        });

        current = next;
        generatedCount++;
    }

    alert(`Successfully generated ${generatedCount} time slots for ${formattedDate}.`);
    closeModal("admin-dashboard-modal");
    renderCalendar();
}

function formatTime(dateObj) {
    return dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

// --- Calendar Rendering ---
function renderCalendar() {
    const grid = document.getElementById("calendar-grid");
    grid.innerHTML = ""; // Clear existing

    // Filter out booked slots to ensure exclusivity constraint
    const availableSlots = timeslots.filter(slot => !slot.isBooked);

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

    // Reset Form
    document.getElementById("book-name").value = "";
    document.getElementById("book-topic").value = "";
    document.getElementById("book-info").value = "";

    // Set Meta Data
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
    if (slotIndex === -1 || timeslots[slotIndex].isBooked) {
        alert("Sorry, this slot is no longer available.");
        closeModal("booking-modal");
        renderCalendar();
        return;
    }

    // Mark as booked (Concurrency / Exclusivity logic)
    timeslots[slotIndex].isBooked = true;

    // Trigger Notification Logic
    triggerAutomatedEmail(timeslots[slotIndex], { name, topic, info });

    alert("Meeting successfully booked!");
    closeModal("booking-modal");
    
    // Re-render calendar so the booked slot immediately disappears
    renderCalendar(); 
}

// --- Notification Logic ---
function triggerAutomatedEmail(slotInfo, studentData) {
    // ROUTING CONSTRAINT: Ensure data goes ONLY to slotInfo.adminEmail
    
    const emailPayload = {
        to: slotInfo.adminEmail, // Exclusively target the host admin
        subject: `New Office Hours Booking: ${studentData.topic} with ${studentData.name}`,
        body: `
            You have a new booking!
            
            Host: ${slotInfo.hostName}
            Date: ${slotInfo.date}
            Time: ${slotInfo.startTime} - ${slotInfo.endTime}
            Location: ${slotInfo.location}
            
            Student Details:
            Name: ${studentData.name}
            Topic: ${studentData.topic}
            Additional Info: ${studentData.info || "None provided"}
        `
    };

    console.log("=== SECURE EMAIL DISPATCHED ===");
    console.log(`Routing to strictly: ${emailPayload.to}`);
    console.log(`Payload Subject: ${emailPayload.subject}`);
    console.log(`Payload Body: ${emailPayload.body}`);
    console.log("===============================");
}
