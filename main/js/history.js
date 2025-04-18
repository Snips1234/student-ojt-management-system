import { firebaseCRUD } from "./firebase-crud.js";
import { getDoc, doc } from "./firebase-config.js";
import { db } from "./firebase-config.js";

document.addEventListener("DOMContentLoaded", async function () {
  try {
    const userId = localStorage.getItem("userId");

    if (!userId) {
      console.error("No userId found in localStorage");
      return;
    }

    await window.dbReady;

    const img = document.getElementById("user-profile");

    const dataArray = await crudOperations.getByIndex(
      "studentInfoTbl",
      "userId",
      userId
    );

    const data = Array.isArray(dataArray) ? dataArray[0] : dataArray;

    img.src = data.userImg
      ? data.userImg
      : "../assets/img/icons8_male_user_480px_1";

    try {
      showLoading(true);
      const dates = await getAllIncidentDates();
    } catch (error) {
      console.error("Error loading history:", error);
      showError("Failed to load history. Please try again later.");
    } finally {
      showLoading(false);
    }
  } catch (err) {
    console.error("Failed to get user data from IndexedDB", err);
  }
});

let allAttendanceDates = [];

// async function getAllIncidentDates() {
//   const userId = localStorage.getItem("userId");
//   if (!userId) return;

//   const container = document.querySelector(".card-container .row");
//   container.innerHTML = "";

//   try {
//     const data = await firebaseCRUD.queryData(
//       "completeAttendanceTbl",
//       "userId",
//       "==",
//       userId
//     );

//     console.log("Fetched data:", data);

//     if (!Array.isArray(data) || data.length === 0) {
//       container.innerHTML = `<p class="text-center text-muted">No attendance records found.</p>`;
//       return;
//     }

//     data.forEach((record) => {
//       if (!record.date) return;

//       const date = new Date(record.date);
//       const isoDate = date.toLocaleDateString("en-CA");
//       const day = date
//         .toLocaleDateString("en-US", { weekday: "short" })
//         .toUpperCase();
//       const readableDate = date.toLocaleDateString("en-US", {
//         month: "long",
//         day: "numeric",
//         year: "numeric",
//       });

//       const card = document.createElement("div");
//       card.className = "col-12 col-md-6 col-lg-4 mb-2 px-2";

//       card.innerHTML = `
//             <a href="#" class="history-card mb-2" data-bs-toggle="modal" data-bs-target="#viewHistoryModal" data-date="${isoDate}">
//               <span>${day}</span>
//               <span class="separator"></span>
//               <span class="date">${readableDate}</span>
//             </a>
//           `;

//       container.appendChild(card);

//       card.querySelector("a").addEventListener("click", (e) => {
//         e.preventDefault();
//         const selectedDate = e.currentTarget.getAttribute("data-date");
//         populateHistoryModal(selectedDate);
//       });
//     });
//   } catch (error) {
//     console.error("Error fetching history dates:", error);
//     throw new Error(`Failed to fetch data: ${error.message}`);
//   }
// }

document
  .getElementById("history-search-input")
  .addEventListener("input", (e) => {
    const selectedDate = e.target.value;
    filterDatesBySearch(selectedDate, allAttendanceDates);
  });

async function getAllIncidentDates() {
  const userId = localStorage.getItem("userId");
  if (!userId) return;

  const container = document.querySelector(".card-container .row");
  container.innerHTML = "";

  try {
    const data = await firebaseCRUD.queryData(
      "completeAttendanceTbl",
      "userId",
      "==",
      userId
    );

    console.log("Fetched data:", data);

    if (!Array.isArray(data) || data.length === 0) {
      container.innerHTML = `<p class="text-center text-muted">No attendance records found.</p>`;
      return;
    }

    // 🌟 Store processed data for filtering later
    allAttendanceDates = data.map((record) => {
      const date = new Date(record.date);
      const isoDate = date.toLocaleDateString("en-CA");
      const day = date
        .toLocaleDateString("en-US", { weekday: "short" })
        .toUpperCase();
      const readableDate = date.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });

      return {
        rawDate: isoDate, // 🌟 used in filtering
        day,
        readableDate,
        original: record, // optional, keep full original data
      };
    });

    // 🌟 Populate the UI
    populateDates(allAttendanceDates);
  } catch (error) {
    console.error("Error fetching history dates:", error);
    throw new Error(`Failed to fetch data: ${error.message}`);
  }
}

function filterDatesBySearch(searchDate, allDates) {
  if (!searchDate) {
    populateDates(allDates);
    return;
  }

  const filteredDates = allDates.filter((dateInfo) => {
    return dateInfo.rawDate === searchDate;
  });

  populateDates(filteredDates);
}

function showLoading(show) {
  const loader = document.getElementById("loading-indicator") || createLoader();
  loader.style.display = show ? "block" : "none";
}

function createLoader() {
  const loader = document.createElement("div");
  loader.id = "loading-indicator";
  loader.className = "text-center py-4";
  loader.innerHTML =
    '<div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div>';
  document.querySelector(".card-container").prepend(loader);
  return loader;
}

function showError(message) {
  const container = document.querySelector(".card-container .row");
  container.innerHTML = `
          <div class="col-12 text-center py-4">
              <i class="bi bi-exclamation-triangle-fill fs-1 text-danger"></i>
              <p class="mt-2">${message}</p>
              <button class="btn btn-primary mt-2" onclick="location.reload()">Retry</button>
          </div>
      `;
}

function formatTime(timestampStr) {
  if (!timestampStr) return "";
  const date = new Date(timestampStr);
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

async function getAttendanceByDate(userId, dateStr) {
  try {
    const basePath = ["attendancelogs", userId, dateStr];

    const getLog = async (logType) => {
      const logRef = doc(db, ...basePath, logType);
      const snap = await getDoc(logRef);
      return snap.exists() ? snap.data() : null;
    };

    const [morningIn, morningOut, afternoonIn, afternoonOut] =
      await Promise.all([
        getLog("morningTimeIn"),
        getLog("morningTimeOut"),
        getLog("afternoonTimeIn"),
        getLog("afternoonTimeOut"),
      ]);

    return {
      morningTimeIn: morningIn,
      morningTimeOut: morningOut,
      afternoonTimeIn: afternoonIn,
      afternoonTimeOut: afternoonOut,
    };
  } catch (error) {
    console.error("Error fetching logs by date:", error);
    return null;
  }
}

async function populateHistoryModal(dateStr) {
  const userId = localStorage.getItem("userId");
  if (!userId) return;

  const data = await getAttendanceByDate(userId, dateStr);
  if (!data) return;

  updateSlot(0, data.morningTimeIn);
  updateSlot(1, data.morningTimeOut);
  updateSlot(2, data.afternoonTimeIn);
  updateSlot(3, data.afternoonTimeOut);
}

function updateSlot(slotIndex, log) {
  const containers = document.querySelectorAll(".history-images > div");
  const container = containers[slotIndex];
  if (!container) return;

  const anchor = container.querySelector("a");
  const img = container.querySelector("img");
  const time = container.querySelector("h6");

  if (log && log.image) {
    anchor.href = log.image;
    img.src = log.image;
    time.textContent = formatTime(log.timestamp);
  } else {
    anchor.href = "#";
    img.src = "../assets/img/icons8_no_image_480px.png";
    time.textContent = "--:--:--";
  }
}

function populateDates(dateList) {
  const container = document.querySelector(".card-container .row");
  container.innerHTML = "";

  if (dateList.length === 0) {
    container.innerHTML = `<div class="position-absolute top-50 start-50 translate-middle align-items-center col-12 text-center py-4">
                <i class="bi bi-exclamation-circle fs-1 text-muted"></i>
                <h6 class="mt-2">No History Found For This Date</h6>
                <p class="mt-1">Oops! There’s no attendance record for this date. Try picking another day from the calendar.</p>
            </div>`;
    return;
  }

  dateList.forEach(({ rawDate, day, readableDate }) => {
    const card = document.createElement("div");
    card.className = "col-12 col-md-6 col-lg-4 mb-2 px-2";

    card.innerHTML = `
      <a href="#" class="history-card mb-2" data-bs-toggle="modal" data-bs-target="#viewHistoryModal" data-date="${rawDate}">
        <span>${day}</span>
        <span class="separator"></span>
        <span class="date">${readableDate}</span>
      </a>
    `;

    container.appendChild(card);

    card.querySelector("a").addEventListener("click", (e) => {
      e.preventDefault();
      const selectedDate = e.currentTarget.getAttribute("data-date");
      populateHistoryModal(selectedDate);
    });
  });
}
