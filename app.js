// --- 1. FIREBASE CONFIGURATION ---
const firebaseConfig = {
    apiKey: "AIzaSyAKn_PK1q7XwxeOU4fdVIpokQFunt0Qe7w",
    authDomain: "dsp-office-hours.firebaseapp.com",
    databaseURL: "https://dsp-office-hours-default-rtdb.firebaseio.com",
    projectId: "dsp-office-hours",
    storageBucket: "dsp-office-hours.firebasestorage.app",
    messagingSenderId: "383319994141",
    appId: "1:383319994141:web:dd33d59af33413a4267bf4"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// --- 2. STATE & EMAILJS INIT ---
emailjs.init("aKaqwihPbn46q3V25"); 

const ADMIN_PASSWORD = "BetaEta#1";

const ADMIN_USERS = [
    { id: "admin_1", name: "Brother Hyman", email: "g.hyman@ufdsp.com" },
    { id: "admin_2", name: "Brother Wechsler", email: "pledgedevelopment@ufdsp.com" },
    { id: "admin_3", name: "Brother Hoyos", email: "a.hoyos@ufdsp.com" },
    { id: "admin_4", name: "Brother Thomas", email: "j.thomas@ufdsp.com" },
    { id: "admin_5", name: "Brother Schneider", email: "z.schneider@ufdsp.com" },
    { id: "admin_6", name: "Brother Haris", email: "s.haris@ufdsp.com" }
];

let timeslots = []; 

// --- 3. INITIALIZATION & REAL-TIME LISTENER ---
document.addEventListener("DOMContentLoaded", () => {
    populateAdminDropdown();
    listenToDatabase();
});

function listenToDatabase() {
    db.collection("timeslots").onSnapshot((querySnapshot) => {
        timeslots = [];
        querySnapshot.forEach((doc) => {
            let slotData = doc.data();
            slotData.id = doc.id; 
            timeslots.push(slotData);
        });
        renderCalendar();
    });
}

// --- 4. UI / MODAL CONTROLS ---
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

// --- 5. SLOT GENERATION (WRITING TO CLOUD) ---
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

        db.collection("timeslots").add({
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

    alert(`Successfully generated ${generatedCount} time slots.`);
    closeModal("admin-dashboard-modal");
}

function formatTime(dateObj) {
    return dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

// --- 6. CALENDAR RENDERING ---
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

// --- 7. BOOKING LOGIC ---
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

    const confirmBtn = document.getElementById("confirm-btn");
    confirmBtn.innerText = "Booking...";
    confirmBtn.disabled = true;

    const slot = timeslots.find(s => s.id === slotId);
    if (!slot || slot.isBooked || slot.startTimestamp <= Date.now()) {
        alert("Sorry, this slot is no longer available.");
        closeModal("booking-modal");
        resetBtn(confirmBtn);
        return;
    }

    db.collection("timeslots").doc(slotId).update({
        isBooked: true,
        studentName: name,
        studentTopic: topic,
        studentNotes: info
    }).then(() => {
        triggerAutomatedEmail(slot, { name, topic, info });
        
        const eventTitle = encodeURIComponent(`${topic} with ${slot.hostName}`);
        const eventLocation = encodeURIComponent(slot.location);
        const eventDetails = encodeURIComponent(`DSP Office Hours meeting regarding ${topic}.`);
        
        const startObj = new Date(`${slot.date} ${slot.startTime}`);
        const endObj = new Date(`${slot.date} ${slot.endTime}`);
        const formatWebDate = (d) => d.toISOString().replace(/-|:|\.\d+/g, '');

        // 1. Apple/Default (.ics file)
        const icsLink = generateICS(slot, topic);
        const appleBtn = document.getElementById('apple-calendar-btn');
        appleBtn.href = icsLink;
        appleBtn.download = `DSP_Office_Hours_${slot.hostName.replace(/\s+/g, '_')}.ics`;

        // 2. Google Calendar Link
        const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${eventTitle}&dates=${formatWebDate(startObj)}/${formatWebDate(endObj)}&details=${eventDetails}&location=${eventLocation}`;
        document.getElementById('google-calendar-btn').href = googleUrl;

        // 3. Outlook Web Link
        const outlookUrl = `https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent&subject=${eventTitle}&startdt=${startObj.toISOString()}&enddt=${endObj.toISOString()}&body=${eventDetails}&location=${eventLocation}`;
        document.getElementById('outlook-calendar-btn').href = outlookUrl;

        // Populate the Success Modal Details
        document.getElementById('success-details').innerHTML = `
            <p class="mb-1"><strong>Host:</strong> ${slot.hostName}</p>
            <p class="mb-1"><strong>Date:</strong> ${slot.date}</p>
            <p class="mb-1"><strong>Time:</strong> ${slot.startTime} - ${slot.endTime}</p>
            <p><strong>Room:</strong> ${slot.location}</p>
        `;

        // Switch Modals
        closeModal("booking-modal");
        openModal("success-modal");
        resetBtn(confirmBtn);
        
    }).catch((error) => {
        console.error("Error booking slot:", error);
        alert("There was an error saving your booking. Please try again.");
        resetBtn(confirmBtn);
    });
}

function resetBtn(btn) {
    btn.innerText = "Confirm Meeting";
    btn.disabled = false;
}

// --- 8. REAL EMAILJS NOTIFICATION LOGIC ---
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

    const serviceID = "service_txc2r2t";
    const templateID = "template_dpi2ic9";

    emailjs.send(serviceID, templateID, templateParams)
        .then((response) => {
            console.log("SUCCESS! Real email sent.", response.status, response.text);
        }, (error) => {
            console.error("FAILED to send email...", error);
        });
}

// --- 9. CALENDAR GENERATOR (.ics) ---
function generateICS(slot, topic) {
    const start = new Date(`${slot.date} ${slot.startTime}`);
    const end = new Date(`${slot.date} ${slot.endTime}`);

    const formatDate = (date) => {
        return date.toISOString().replace(/-|:|\.\d+/g, '');
    };

    const icsContent = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//DSP Office Hours//EN",
        "BEGIN:VEVENT",
        `UID:${slot.id}@dsp.com`,
        `DTSTAMP:${formatDate(new Date())}`,
        `DTSTART:${formatDate(start)}`,
        `DTEND:${formatDate(end)}`,
        `SUMMARY:${topic} with ${slot.hostName}`,
        `LOCATION:${slot.location}`,
        `DESCRIPTION:DSP Office Hours meeting regarding ${topic}.`,
        "END:VEVENT",
        "END:VCALENDAR"
    ].join('\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    return URL.createObjectURL(blob);
}
