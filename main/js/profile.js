// profile.js
import { firebaseCRUD } from "./firebase-crud.js";

document.addEventListener("DOMContentLoaded", async function () {
  try {
    const userId = localStorage.getItem("userId");
    if (!userId) {
      console.error("No userId found in localStorage");
      return;
    }

    await window.dbReady;

    // DOM elements
    const userImg = document.querySelector(".profile-icon");
    const userName = document.querySelector("#profile-name");
    const studentId = document.getElementById("student-id");
    const emailAddress = document.getElementById("email");
    const phoneNumber = document.getElementById("phone-number");
    const gender = document.getElementById("gender");
    const address = document.getElementById("address");
    const companyName = document.getElementById("company-name");
    const companyAddress = document.getElementById("company-address");
    const workSchedule = document.getElementById("work-schedule");
    const morningTimeIn = document.getElementById("morning-time-in");
    const morningTimeOut = document.getElementById("morning-time-out");
    const afternoonTimeIn = document.getElementById("afternoon-time-in");
    const afternoonTimeOut = document.getElementById("afternoon-time-out");
    const editButton = document.getElementById("edit-button");
    const editProfileModal = document.getElementById("editProfileModal");

    // Setup edit button based on network status
    setupEditButton(editButton);

    // Get user data - try IndexedDB first, then Firebase if online
    let data;
    try {
      // Get data from IndexedDB using userId as index
      const dataArray = await crudOperations.getByIndex(
        "studentInfoTbl",
        "userId",
        userId
      );
      data = Array.isArray(dataArray) ? dataArray[0] : dataArray;

      // Always try to get fresh data from Firebase if online
      if (navigator.onLine) {
        const firebaseData = await firebaseCRUD.queryData(
          "students",
          "userId",
          "==",
          userId
        );

        if (firebaseData && firebaseData.length > 0) {
          data = { ...data, ...firebaseData[0] };
          // Store the document ID for future updates
          data.id = firebaseData[0].id;
          await crudOperations.updateData(
            "studentInfoTbl",
            data.id || userId,
            data
          );
        }
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }

    if (data) {
      // Update UI with user data
      updateProfileUI(data);

      // Load company data for the select dropdown
      await loadCompanyData();

      // Populate edit form with fresh data
      populateEditForm(data);
    } else {
      console.warn("No user data found for this user.");
    }

    // Setup edit form submission
    const editForm = document.getElementById("ojtForm");
    editForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const submitButton = editForm.querySelector("button[type='submit']");
      submitButton.disabled = true;
      submitButton.innerHTML =
        '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Updating...';

      try {
        const formData = new FormData(editForm);
        const updatedData = {
          firstName: formData.get("first-name").trim(),
          middleName: formData.get("middle-name").trim(),
          lastName: formData.get("last-name").trim(),
          suffix: formData.get("suffix").trim(),
          studentId: formData.get("student-id").trim(),
          phoneNumber: formData.get("phone-number").trim(),
          gender: formData.get("gender"),
          address: formData.get("address").trim(),
          companyName: formData.get("company-name").trim(),
          companyAddress: formData.get("company-address").trim(),
          morningTimeIn: formData.get("morning-time-in"),
          morningTimeOut: formData.get("morning-time-out"),
          afternoonTimeIn: formData.get("afternoon-time-in"),
          afternoonTimeOut: formData.get("afternoon-time-out"),
          weeklySchedule: {
            SUN: formData.getAll("work-schedule").includes("Sun"),
            MON: formData.getAll("work-schedule").includes("Mon"),
            TUE: formData.getAll("work-schedule").includes("Tue"),
            WED: formData.getAll("work-schedule").includes("Wed"),
            THURS: formData.getAll("work-schedule").includes("Thu"),
            FRI: formData.getAll("work-schedule").includes("Fri"),
            SAT: formData.getAll("work-schedule").includes("Sat"),
          },
          updatedAt: new Date().toISOString(),
          userId: userId, // Ensure userId is preserved
        };

        // Use the document ID if it exists, otherwise use userId
        // In your update function:
        const docId = data?.id; // This should be the Firestore document ID
        await firebaseCRUD.updateData("students", docId, updatedData);
        const success = await updateUserData(docId, updatedData);

        if (success) {
          // Refresh UI with updated data
          const updatedDataArray = await crudOperations.getByIndex(
            "studentInfoTbl",
            "userId",
            userId
          );
          const updatedUserData = Array.isArray(updatedDataArray)
            ? updatedDataArray[0]
            : updatedDataArray;
          updateProfileUI(updatedUserData);

          // Close modal
          const modal = bootstrap.Modal.getInstance(editProfileModal);
          modal.hide();

          alert("Profile updated successfully!");
        } else {
          alert("Failed to update profile. Please try again.");
        }
      } catch (error) {
        console.error("Error updating profile:", error);
        alert("An error occurred while updating your profile.");
      } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = "<span>Update Profile</span>";
      }
    });
    // Setup image upload
    const imgButton = document.getElementById("img-button");
    const imgInput = document.createElement("input");
    imgInput.type = "file";
    imgInput.accept = "image/*";
    imgInput.style.display = "none";
    document.body.appendChild(imgInput);

    imgButton.addEventListener("click", (e) => {
      e.preventDefault();
      imgInput.click();
    });

    imgInput.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      // Show preview immediately
      const editProfileImg = document.querySelector(".modal-profile-icon");
      const previewUrl = URL.createObjectURL(file);
      editProfileImg.src = previewUrl;

      try {
        const userId = localStorage.getItem("userId");
        if (!userId) {
          throw new Error("User not authenticated");
        }

        const newImageData = await handleImageUpload(userId, file);

        // Update both modal and main profile image
        editProfileImg.src = newImageData;
        document.querySelector(".profile-icon").src = newImageData;

        // Revoke the object URL to free memory
        URL.revokeObjectURL(previewUrl);
      } catch (error) {
        console.error("Error handling image upload:", error);
        // Revert to previous image if available
        const previousImage = document.querySelector(".profile-icon").src;
        editProfileImg.src = previousImage;
        alert("Failed to update profile image. Please try again.");
      }
    });

    // Add hover effect for image button
    imgButton.addEventListener("mouseenter", () => {
      const pencilIcon = document.createElement("i");
      pencilIcon.className =
        "bi bi-pencil-fill position-absolute top-50 start-50 translate-middle text-white fs-4";
      pencilIcon.style.zIndex = "10";
      imgButton.appendChild(pencilIcon);

      imgButton.querySelector("img").style.opacity = "0.7";
    });

    imgButton.addEventListener("mouseleave", () => {
      const pencilIcon = imgButton.querySelector("i");
      if (pencilIcon) pencilIcon.remove();

      imgButton.querySelector("img").style.opacity = "1";
    });
  } catch (err) {
    console.error("Failed to initialize profile page:", err);
  }
});

function convertTo12HourFormat(time24) {
  if (!time24) return ["", ""];

  const [hour, minute] = time24.split(":").map(Number);
  const suffix = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;

  const time = `${hour12.toString().padStart(2, "0")}:${minute
    .toString()
    .padStart(2, "0")}`;

  return [time, suffix];
}

function formatWeeklySchedule(weeklySchedule) {
  if (!weeklySchedule) return "";

  const daysMap = {
    SUN: "Sun",
    MON: "Mon",
    TUE: "Tue",
    WED: "Wed",
    THURS: "Thu",
    FRI: "Fri",
    SAT: "Sat",
  };

  const activeDays = [];
  for (const [day, isActive] of Object.entries(weeklySchedule)) {
    if (isActive && daysMap[day]) {
      activeDays.push(daysMap[day]);
    }
  }

  return activeDays.join(", ");
}

async function updateUserData(docId, updatedData) {
  try {
    // Always update IndexedDB first for immediate UI updates
    await crudOperations.updateData("studentInfoTbl", docId, updatedData);
    console.log("IndexedDB updated successfully");

    // Update Firebase if online
    if (navigator.onLine) {
      // Use the document ID if it exists, otherwise use userId
      await firebaseCRUD.updateData("students", docId, updatedData);
      console.log("Firebase updated successfully");
    }

    return true;
  } catch (error) {
    console.error("Error updating user data:", error);
    return false;
  }
}

async function handleImageUpload(userId, file) {
  try {
    const base64Image = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    // Get the document ID first
    const studentData = await firebaseCRUD.queryData(
      "students",
      "userId",
      "==",
      userId
    );
    if (!studentData || studentData.length === 0) {
      throw new Error("Student document not found");
    }
    const docId = studentData[0].id;

    // Update with the correct document ID
    await firebaseCRUD.updateData("students", docId, { userImg: base64Image });
    return base64Image;
  } catch (error) {
    console.error("Error uploading image:", error);
    throw error;
  }
}

function setupEditButton(editButton) {
  const updateButtonState = () => {
    if (!navigator.onLine) {
      editButton.classList.add("disabled", "btn-disabled");
      editButton.setAttribute("title", "Edit requires internet connection");
      editButton.setAttribute("data-bs-toggle", "offline");
      editButton.removeAttribute("data-bs-target");
      editButton.style.cursor = "not-allowed";
      editButton.style.opacity = "0.5";
    } else {
      editButton.classList.remove("disabled", "btn-disabled");
      editButton.setAttribute("title", "Edit Profile");
      editButton.setAttribute("data-bs-toggle", "modal");
      editButton.setAttribute("data-bs-target", "#editProfileModal");
      editButton.style.cursor = "pointer";
      editButton.style.opacity = "1";
    }
  };

  // Initial state
  updateButtonState();

  // // Handle click events
  // editButton.addEventListener("click", (e) => {
  //   if (!navigator.onLine) {
  //     e.preventDefault();
  //     e.stopPropagation();
  //     alert(
  //       "Editing profile requires an internet connection. Please check your network and try again."
  //     );
  //     return false;
  //   }
  // });

  editButton.addEventListener("click", (e) => {
    if (!navigator.onLine) {
      e.preventDefault();
      e.stopPropagation();
      window.location.href = "no-internet.html";
      return false;
    }
  });

  // Listen for network changes
  window.addEventListener("online", updateButtonState);
  window.addEventListener("offline", updateButtonState);

  // Prevent modal opening through other means
  const modal = new bootstrap.Modal(
    document.getElementById("editProfileModal")
  );
  document
    .getElementById("editProfileModal")
    .addEventListener("show.bs.modal", (e) => {
      if (!navigator.onLine) {
        e.preventDefault();
        alert(
          "Editing profile requires an internet connection. Please check your network and try again."
        );
        modal.hide();
      }
    });
}

function updateProfileUI(data) {
  const userImg = document.querySelector(".profile-icon");
  const userName = document.querySelector("#profile-name");
  const studentId = document.getElementById("student-id");
  const emailAddress = document.getElementById("email");
  const phoneNumber = document.getElementById("phone-number");
  const gender = document.getElementById("gender");
  const address = document.getElementById("address");
  const companyName = document.getElementById("company-name");
  const companyAddress = document.getElementById("company-address");
  const workSchedule = document.getElementById("work-schedule");
  const morningTimeIn = document.getElementById("morning-time-in");
  const morningTimeOut = document.getElementById("morning-time-out");
  const afternoonTimeIn = document.getElementById("afternoon-time-in");
  const afternoonTimeOut = document.getElementById("afternoon-time-out");

  if (data.userImg) userImg.src = data.userImg;
  if (data.firstName && data.lastName) {
    const middleInitial = data.middleName
      ? ` ${data.middleName.charAt(0)}.`
      : "";
    const suffix = data.suffix ? ` ${data.suffix}` : "";
    userName.textContent = `${data.lastName}, ${data.firstName}${middleInitial}${suffix}`;
  }
  if (data.studentId) studentId.textContent = data.studentId;
  if (data.emailAddress) emailAddress.textContent = data.emailAddress;
  if (data.phoneNumber) phoneNumber.textContent = data.phoneNumber;
  if (data.gender)
    gender.textContent =
      data.gender.charAt(0).toUpperCase() + data.gender.slice(1);
  if (data.address) address.textContent = data.address;
  if (data.companyName) companyName.textContent = data.companyName;
  if (data.companyAddress) companyAddress.textContent = data.companyAddress;
  if (data.weeklySchedule)
    workSchedule.textContent = formatWeeklySchedule(data.weeklySchedule);

  if (data.morningTimeIn) {
    const [morningInTime, morningInPeriod] = convertTo12HourFormat(
      data.morningTimeIn
    );
    morningTimeIn.textContent = `${morningInTime} ${morningInPeriod}`;
  }
  if (data.morningTimeOut) {
    const [morningOutTime, morningOutPeriod] = convertTo12HourFormat(
      data.morningTimeOut
    );
    morningTimeOut.textContent = `${morningOutTime} ${morningOutPeriod}`;
  }
  if (data.afternoonTimeIn) {
    const [afternoonInTime, afternoonInPeriod] = convertTo12HourFormat(
      data.afternoonTimeIn
    );
    afternoonTimeIn.textContent = `${afternoonInTime} ${afternoonInPeriod}`;
  }
  if (data.afternoonTimeOut) {
    const [afternoonOutTime, afternoonOutPeriod] = convertTo12HourFormat(
      data.afternoonTimeOut
    );
    afternoonTimeOut.textContent = `${afternoonOutTime} ${afternoonOutPeriod}`;
  }
}
// Modify the populateEditForm function to ensure it uses modal field IDs
function populateEditForm(data) {
  const firstNameInput = document.getElementById("first-name");
  const middleNameInput = document.getElementById("middle-name");
  const lastNameInput = document.getElementById("last-name");
  const suffixInput = document.getElementById("suffix");
  const studentIdInput = document.getElementById("modal-student-id");
  const phoneNumberInput = document.getElementById("modal-phone-number");
  const genderInput = document.getElementById("modal-gender");
  const addressInput = document.getElementById("modal-address");
  const companyNameInput = document.getElementById("modal-company-name");
  const companyAddressInput = document.getElementById("modal-company-address");
  const morningTimeInInput = document.getElementById("modal-morning-time-in");
  const morningTimeOutInput = document.getElementById("modal-morning-time-out");
  const afternoonTimeInInput = document.getElementById(
    "modal-afternoon-time-in"
  );
  const afternoonTimeOutInput = document.getElementById(
    "modal-afternoon-time-out"
  );
  const editProfileImg = document.querySelector(".modal-profile-icon");

  // Populate form fields
  if (data.firstName) firstNameInput.value = data.firstName.trim();
  if (data.middleName) middleNameInput.value = data.middleName.trim();
  if (data.lastName) lastNameInput.value = data.lastName.trim();
  if (data.suffix) suffixInput.value = data.suffix.trim();
  if (data.studentId) studentIdInput.value = data.studentId;
  if (data.phoneNumber) phoneNumberInput.value = data.phoneNumber;
  if (data.address) addressInput.value = data.address;

  if (data.gender) {
    genderInput.value = data.gender;
    // Add this to ensure the select displays the correct value
    const options = genderInput.options;
    for (let i = 0; i < options.length; i++) {
      if (options[i].value === data.gender) {
        genderInput.selectedIndex = i;
        break;
      }
    }
  }
  // Set company name and address if they exist
  if (data.companyName) {
    companyNameInput.value = data.companyName;
    // Trigger change event to populate address
    const event = new Event("change");
    companyNameInput.dispatchEvent(event);
  }

  if (data.companyAddress) {
    companyAddressInput.value = data.companyAddress;
  }

  // Time fields
  if (data.morningTimeIn) morningTimeInInput.value = data.morningTimeIn;
  if (data.morningTimeOut) morningTimeOutInput.value = data.morningTimeOut;
  if (data.afternoonTimeIn) afternoonTimeInInput.value = data.afternoonTimeIn;
  if (data.afternoonTimeOut)
    afternoonTimeOutInput.value = data.afternoonTimeOut;

  // Image
  if (data.userImg) editProfileImg.src = data.userImg;

  // Work schedule checkboxes (keep your existing implementation)
  if (data.weeklySchedule) {
    const dayMapping = {
      SUN: "btn-sun",
      MON: "btn-mon",
      TUE: "btn-tue",
      WED: "btn-wed",
      THURS: "btn-thu",
      FRI: "btn-fri",
      SAT: "btn-sat",
    };

    for (const [day, isActive] of Object.entries(data.weeklySchedule)) {
      if (isActive && dayMapping[day]) {
        const checkboxId = dayMapping[day];
        const checkbox = document.getElementById(checkboxId);
        if (checkbox) {
          checkbox.checked = true;
          const label = document.querySelector(`label[for="${checkboxId}"]`);
          if (label) {
            label.classList.remove("btn-outline-primary");
            label.classList.add("btn-primary");
          }
        }
      }
    }
  }
}

// Add these new functions
async function loadCompanyData() {
  try {
    const companies = await firebaseCRUD.getAllData("company");

    if (!companies || companies.length === 0) {
      console.warn("No company data found in Firestore.");
      return;
    }

    // Cache companies in IndexedDB
    const existingCompanies = await crudOperations.getAllData("companyTbl");
    if (existingCompanies && existingCompanies.length > 0) {
      await crudOperations.clearTable("companyTbl");
    }

    for (const company of companies) {
      await crudOperations.createData("companyTbl", company);
    }

    // Populate company dropdown
    await populateCompanyDropdown();
    setupCompanySelectListener();
  } catch (err) {
    console.error("Failed to fetch and cache companies:", err);
  }
}

async function populateCompanyDropdown() {
  const selectCompany = document.getElementById("modal-company-name");

  // Clear existing options except the first one
  while (selectCompany.options.length > 1) {
    selectCompany.remove(1);
  }

  try {
    const companies = await crudOperations.getAllData("companyTbl");

    if (!companies || companies.length === 0) {
      console.warn("No companies found in IndexedDB.");
      return;
    }

    for (const company of companies) {
      const option = document.createElement("option");
      option.value = company.companyName;
      option.textContent = company.companyName;
      selectCompany.appendChild(option);
    }
  } catch (err) {
    console.error("Failed to load companies from IndexedDB:", err);
  }
}

function setupCompanySelectListener() {
  const selectCompany = document.getElementById("modal-company-name");
  const addressInput = document.getElementById("modal-company-address");

  selectCompany.addEventListener("change", async function () {
    const selectedName = this.value;

    try {
      const companies = await crudOperations.getAllData("companyTbl");
      const selectedCompany = companies.find(
        (company) => company.companyName === selectedName
      );

      if (selectedCompany) {
        addressInput.value = selectedCompany.companyAddress || "";
      } else {
        addressInput.value = "";
        console.warn("Selected company not found in IndexedDB.");
      }
    } catch (err) {
      console.error("Failed to fetch company address:", err);
    }
  });
}

// Add this to your profile.js file, preferably near the bottom before the closing script tag

document.addEventListener("DOMContentLoaded", function () {
  const logoutButton = document.getElementById("logout-button");

  if (logoutButton) {
    logoutButton.addEventListener("click", async function (e) {
      e.preventDefault();

      try {
        // Clear the studentInfoTbl from IndexedDB
        await crudOperations.clearTable("studentInfoTbl");

        // Clear any user-related data from localStorage
        localStorage.removeItem("userId");
        localStorage.removeItem("userEmail");
        localStorage.removeItem("userToken");

        // Redirect to login page
        window.location.href = "/pages/login.html";
      } catch (error) {
        console.error("Error during logout:", error);
        // Even if clearing fails, still redirect to login
        window.location.href = "/pages/login.html";
      }
    });
  }
});
