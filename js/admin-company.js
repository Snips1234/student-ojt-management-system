document.addEventListener("DOMContentLoaded", async function () {
  const addProvinceSelect = document.getElementById("company-province");
  const updateProvinceSelect = document.getElementById(
    "update-company-province"
  );

  if (addProvinceSelect) populateProvinceDropdown(addProvinceSelect);
  if (updateProvinceSelect) populateProvinceDropdown(updateProvinceSelect);
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

    if (data != null) {
      img.src = data.userImg
        ? data.userImg
        : "../assets/img/icons8_male_user_480px_1";
    } else {
      console.warn("No user data found for this user.");
    }
  } catch (err) {
    console.error("Failed to get user data from IndexedDB", err);
  }
});

document.addEventListener("DOMContentLoaded", function () {
  const provinceFilter = document.getElementById("provinceFilter");
  if (provinceFilter) {
    populateProvinceDropdown(provinceFilter);
    provinceFilter.addEventListener("change", function () {
      const selectedProvince = this.value;
      filterCompaniesByProvince(selectedProvince);
    });
  }
});
async function filterCompaniesByProvince(companyProvince) {
  showLoading(true);
  try {
    const { firebaseCRUD } = await import("./firebase-crud.js");
    let companies;

    if (companyProvince) {
      companies = await firebaseCRUD.queryData(
        "company",
        "companyProvince",
        "==",
        companyProvince
      );
    } else {
      companies = await firebaseCRUD.getAllData("company");
    }

    displayCompanies(companies);
  } catch (error) {
    console.error("Error filtering companies:", error);
    if (
      error.message.includes("not found") ||
      error.message.includes("No documents")
    ) {
      displayCompanies([]);
    } else {
      showError("Failed to filter companies");
    }
  } finally {
    showLoading(false);
  }
}

function showLoading(show) {
  const loader = document.getElementById("loading-indicator") || createLoader();
  if (loader) {
    loader.style.display = show ? "block" : "none";
  }
}

function createLoader() {
  try {
    const loader = document.createElement("div");
    loader.id = "loading-indicator";
    loader.className = "text-center py-4";
    loader.innerHTML =
      '<div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div>';

    const container =
      document.querySelector(".card-container") ||
      document.querySelector(".company-container") ||
      document.body;

    if (container) {
      container.prepend(loader);
      return loader;
    }
    return null;
  } catch (error) {
    console.error("Error creating loader:", error);
    return null;
  }
}

function showError(message) {
  const container = document.querySelector(".card-container") || document.body;

  container.innerHTML = `
        <div class="d-flex justify-content-center align-items-center" style="min-height: 50vh;">
            <div class="text-center">
                <i class="bi bi-exclamation-triangle-fill fs-1 text-danger"></i>
                <p class="mt-3 fs-5">${message}</p>
                <button class="btn btn-primary mt-3" onclick="location.reload()">Retry</button>
            </div>
        </div>
    `;
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function loadCompanies() {
  showLoading(true);
  import("./firebase-crud.js")
    .then(({ firebaseCRUD }) => {
      firebaseCRUD
        .getAllData("company")
        .then((companies) => {
          displayCompanies(companies);
          showLoading(false);
        })
        .catch((error) => {
          console.error("Error loading companies:", error);
          showError("Failed to load companies: " + error.message);
          showLoading(false);
        });
    })
    .catch((err) => {
      console.error("Failed to load firebase-crud:", err);
      showError("Failed to load required modules");
      showLoading(false);
    });
}
function displayCompanies(companies) {
  const cardContainer = document.querySelector(".card-container");
  if (!cardContainer) {
    console.error("Card container not found");
    return;
  }

  cardContainer.innerHTML = "";

  if (!companies || companies.length === 0) {
    cardContainer.innerHTML = `
            <div class="position-absolute top-50 start-50 translate-middle col-12 text-center py-4">
                <i class="bi bi-exclamation-circle fs-1 text-muted"></i>
                <h6 class="mt-2">No Companies Available</h6>
                <p class="mt-1">No companies have been registered yet.</p>
            </div>
        `;
    return;
  }

  companies.forEach((company) => {
    const colDiv = document.createElement("div");
    colDiv.className = "col-lg-4 col-md-6";

    colDiv.innerHTML = `
        <div class="company-card">
          <div class="company-image-container">
            ${
              company.image
                ? `<img src="${company.image}" alt="${company.companyName}" class="company-image">`
                : `<div class="no-image-placeholder"><i class="bi bi-building"></i></div>`
            }
          </div>
          <div class="company-overlay" style="background: rgba(75, 71, 71, 0.5);"></div>
          <div class="company-content">
            <div class="company-info">
              <p class="d-none">${company.id || ""}</p>
              <h5>${company.companyName || "No name"}</h5>
              <p>${company.companyAddress || "No address"}</p>
              <small class="text-white">${company.companyProvince || ""}</small>
            </div>
            <button class="edit-btn" data-bs-toggle="modal" data-bs-target="#updateCompanyModal" data-id="${
              company.id
            }" style="background: #6e1423;">
              <i class="bi bi-pencil"></i>
            </button>
          </div>
        </div>
      `;

    cardContainer.appendChild(colDiv);
  });

  document.querySelectorAll(".edit-btn").forEach((button) => {
    button.addEventListener("click", function () {
      const companyId = this.getAttribute("data-id");
      loadCompanyDataForUpdate(companyId);
    });
  });
}

function searchCompanies(searchTerm) {
  const provinceFilter = document.getElementById("provinceFilter");
  const selectedProvince = provinceFilter ? provinceFilter.value : "";

  showLoading(true);
  import("./firebase-crud.js")
    .then(({ firebaseCRUD }) => {
      firebaseCRUD
        .getAllData("company")
        .then((allCompanies) => {
          let filtered = allCompanies;

          if (selectedProvince) {
            filtered = filtered.filter(
              (company) => company.companyProvince === selectedProvince
            );
          }

          if (searchTerm.length > 0) {
            filtered = filtered.filter(
              (company) =>
                company.companyName &&
                company.companyName
                  .toLowerCase()
                  .includes(searchTerm.toLowerCase())
            );
          }

          displayCompanies(filtered);
          showLoading(false);
        })
        .catch((error) => {
          console.error("Error searching companies:", error);
          showError("Failed to search companies");
          showLoading(false);
        });
    })
    .catch((err) => {
      console.error("Failed to load firebase-crud:", err);
      showError("Failed to load required modules");
      showLoading(false);
    });
}
function loadCompanyDataForUpdate(companyId) {
  showLoading(true);
  import("./firebase-crud.js")
    .then(({ firebaseCRUD }) => {
      firebaseCRUD
        .getDataById("company", companyId)
        .then((company) => {
          const updateModal = document.getElementById("updateCompanyModal");
          const nameInput = updateModal.querySelector('[name="companyNameU"]');
          const addressInput = updateModal.querySelector(
            '[name="companyAddressU"]'
          );
          const previewImage = updateModal.querySelector(
            "#update-preview-image"
          );
          const cameraIcon = updateModal.querySelector("#update-camera-icon");
          const provinceSelect = updateModal.querySelector(
            '[name="companyProvinceU"]'
          );

          if (!nameInput || !addressInput || !previewImage || !cameraIcon) {
            throw new Error("Required form elements not found");
          }

          nameInput.value = company.companyName || "";
          addressInput.value = company.companyAddress || "";
          if (company.companyProvince) {
            setTimeout(() => {
              provinceSelect.value = company.companyProvince;
            }, 100);
          }

          if (company.image) {
            previewImage.src = company.image;
            previewImage.style.display = "block";
            cameraIcon.style.display = "none";
          } else {
            previewImage.style.display = "none";
            cameraIcon.style.display = "block";
          }

          updateModal.setAttribute("data-company-id", companyId);
          showLoading(false);
        })
        .catch((error) => {
          console.error("Error loading company data:", error);
          Swal.fire({
            icon: "error",
            title: "Something When Wrong",
            text: `Failed to load company data: ${error.message}`,
            confirmButtonColor: "#590f1c",
          });
          showLoading(false);
        });
    })
    .catch((err) => {
      console.error("Failed to load firebase-crud:", err);
      Swal.fire({
        icon: "error",
        title: "Something When Wrong",
        text: "Failed to load required modules",
        confirmButtonColor: "#590f1c",
      });
      showLoading(false);
    });
}

$(document).ready(function () {
  loadCompanies();

  const debouncedSearch = debounce(function () {
    const searchTerm = $("#companySearch").val().trim();
    if (searchTerm.length > 0) {
      searchCompanies(searchTerm);
    } else {
      loadCompanies();
    }
  }, 300);

  $("#companySearch").on("input", debouncedSearch);

  async function checkCompanyNameExists(companyName) {
    try {
      const { firebaseCRUD } = await import("./firebase-crud.js");
      const companies = await firebaseCRUD.getAllData("company");
      return companies.some(
        (company) =>
          company.companyName &&
          company.companyName.toLowerCase() === companyName.toLowerCase()
      );
    } catch (error) {
      console.error("Error checking company name:", error);
      return true;
    }
  }

  $("#ojtForm").validate({
    rules: {
      companyName: {
        required: true,
        minlength: 2,
      },
      companyAddress: {
        required: true,
        minlength: 2,
      },
      companyProvince: {
        required: true,
      },
    },
    errorPlacement: function (error, element) {
      error.appendTo($("#" + element.attr("name") + "-error"));
    },
    submitHandler: function (form) {
      const submitButton = $(form).find('button[type="submit"]');
      const companyName = form.companyName.value.trim();

      submitButton.prop("disabled", true);
      submitButton.html(`
                  <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                  Checking...
              `);

      checkCompanyNameExists(companyName)
        .then((nameExists) => {
          if (nameExists) {
            Swal.fire({
              icon: "warning",
              title: "Company Exist",
              text: "A company with this name already exists!",
              confirmButtonColor: "#590f1c",
            });
            return Promise.reject("Duplicate company name");
          }

          submitButton.html(`
                          <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                          Adding Company...
                      `);

          const companyData = {
            companyName: companyName,
            companyAddress: form.companyAddress.value,
            companyProvince: form.companyProvince.value,
            image: uploadedImageBase64 || "",
            createdAt: new Date().toISOString(),
          };

          return import("./firebase-crud.js").then(({ firebaseCRUD }) => {
            return firebaseCRUD.createData("company", companyData);
          });
        })
        .then(() => {
          Swal.fire({
            icon: "success",
            title: "Success",
            text: "Company added successfully!",
            timer: 2000,
            showConfirmButton: false,
          });

          form.reset();
          document.getElementById("preview-image").src = "";
          document.getElementById("preview-image").style.display = "none";
          document.getElementById("camera-input").value = "";
          uploadedImageBase64 = "";
          loadCompanies();
          const addModal = bootstrap.Modal.getInstance(
            document.getElementById("addCompanyModal")
          );
          if (addModal) {
            addModal.hide();
          }
        })
        .catch((error) => {
          if (error !== "Duplicate company name") {
            console.error("Error:", error);

            Swal.fire({
              icon: "error",
              title: "Somthing Went Wrong",
              text: `Operation failed: ${error.message}`,
              confirmButtonColor: "#590f1c",
            });
          }
        })
        .finally(() => {
          submitButton.prop("disabled", false).text("Add Company");
        });
    },
  });
});

document.addEventListener("DOMContentLoaded", function () {
  const updateCameraInput = document.getElementById("update-camera-input");

  if (updateCameraInput) {
    updateCameraInput.addEventListener("change", async function (event) {
      const file = event.target.files[0];
      const previewImage = document.getElementById("update-preview-image");
      const cameraIcon = document.getElementById("update-camera-icon");

      if (file && previewImage && cameraIcon) {
        try {
          const imageData = await compressImageIfNeeded(file);
          previewImage.src = imageData;
          previewImage.style.display = "block";
          cameraIcon.style.display = "none";

          uploadedImageBase64 = imageData;

          if (file.size > 1 * 1024 * 1024) {
            console.log("Image was compressed to fit size requirements");
          }
        } catch (error) {
          console.error("Error processing image:", error);
        }
      }
    });
  }
});

// $("#ojtFormU").validate({
//   rules: {
//     companyNameU: {
//       required: true,
//       minlength: 2,
//     },
//     companyAddressU: {
//       required: true,
//       minlength: 2,
//     },
//     companyProvinceU: {
//       required: true,
//     },
//   },
//   messages: {
//     companyNameU: {
//       required: "Please enter company name",
//       minlength: "Company name must be at least 2 characters long",
//     },
//     companyAddressU: {
//       required: "Please enter company address",
//       minlength: "Company address must be at least 2 characters long",
//     },
//     companyProvinceU: {
//       required: "Please select a province",
//     },
//   },
//   errorPlacement: function (error, element) {
//     error.appendTo($("#" + element.attr("name") + "-error"));
//   },
//   submitHandler: async function (form, event) {
//     event.preventDefault();

//     const submitButton = $(form).find('button[type="submit"]');
//     const companyId = document
//       .getElementById("updateCompanyModal")
//       ?.getAttribute("data-company-id");
//     const previewImage = document.querySelector(
//       "#updateCompanyModal #update-preview-image"
//     );
//     const newCompanyName = form.companyNameU.value.trim();
//     const newCompanyAddress = form.companyAddressU.value.trim();
//     const newCompanyProvince = form.companyProvinceU.value;

//     if (!companyId) {
//       Swal.fire({
//         icon: "error",
//         title: "Failed To Find ID",
//         text: "Company ID not found.",
//         confirmButtonColor: "#590f1c",
//       });
//       submitButton.prop("disabled", false).text("Update Company");
//       return;
//     }

//     let oldCompanyData = null;

//     await import("./firebase-crud.js")
//       .then(({ firebaseCRUD }) => {
//         return firebaseCRUD.getDataById("company", companyId);
//       })
//       .then((company) => {
//         oldCompanyData = company;
//       });

//     submitButton.prop("disabled", true).html(`
//               <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
//               Checking...
//           `);

//     checkCompanyDuplicate(newCompanyName, newCompanyAddress, companyId)
//       .then(async (duplicateExists) => {
//         if (duplicateExists) {
//           Swal.fire({
//             icon: "error",
//             title: "Company With This Address Exist",
//             text: "A company with this name and address already exists!",
//             confirmButtonColor: "#590f1c",
//           });
//           return Promise.reject("Duplicate company");
//         }

//         submitButton.html(`
//                       <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
//                       Updating...
//                   `);

//         const companyData = {
//           companyName: newCompanyName,
//           companyAddress: newCompanyAddress,
//           companyProvince: newCompanyProvince,
//           updatedAt: new Date().toISOString(),
//         };

//         if (uploadedImageBase64) {
//           companyData.image = uploadedImageBase64;
//         } else if (previewImage?.src && previewImage.style.display !== "none") {
//         } else {
//           companyData.image = "";
//         }

//         const { firebaseCRUD } = await import("./firebase-crud.js");
//         return await firebaseCRUD.updateData("company", companyId, companyData);
//       })
//       .then(() => {
//         return import("./firebase-crud.js").then(({ firebaseCRUD }) => {
//           return updateStudentsByCompany(
//             firebaseCRUD,
//             oldCompanyData,
//             companyData
//           );
//         });
//       })
//       .then(() => {
//         Swal.fire({
//           icon: "success",
//           title: "Success",
//           text: "Company updated successfully!",
//           timer: 2000,
//           showConfirmButton: false,
//         });
//         form.reset();
//         const modal = bootstrap.Modal.getInstance(
//           document.getElementById("updateCompanyModal")
//         );
//         modal?.hide();

//         if (previewImage) {
//           previewImage.src = "";
//           previewImage.style.display = "none";
//         }
//         const cameraIcon = document.querySelector(
//           "#updateCompanyModal #camera-icon"
//         );
//         if (cameraIcon) {
//           cameraIcon.style.display = "block";
//         }
//         uploadedImageBase64 = "";
//         loadCompanies();
//       })
//       .catch((error) => {
//         if (error !== "Duplicate company") {
//           console.error("Update error:", error);
//           Swal.fire({
//             icon: "error",
//             title: "Update Failed",
//             text: `Update failed: ${error.message}`,
//             confirmButtonColor: "#590f1c",
//           });
//         }
//       })
//       .finally(() => {
//         submitButton.prop("disabled", false).text("Update Company");
//       });
//   },
// });

// async function updateStudentsByCompany(firebaseCRUD, oldData, newData) {
//   try {
//     const matchingStudents = await firebaseCRUD.queryData(
//       "students",
//       "companyName",
//       "==",
//       oldData.companyName
//     );

//     const filtered = matchingStudents.filter(
//       (student) =>
//         student.companyAddress === oldData.companyAddress &&
//         student.companyProvince === oldData.companyProvince
//     );

//     const updatePromises = filtered.map((student) => {
//       const updatedFields = {
//         companyName: newData.companyName,
//         companyAddress: newData.companyAddress,
//         companyProvince: newData.companyProvince,
//         updatedAt: new Date().toISOString(),
//       };
//       return firebaseCRUD.updateData("students", student.id, updatedFields);
//     });

//     await Promise.all(updatePromises);
//     console.log(`Updated ${updatePromises.length} student(s)`);
//   } catch (error) {
//     console.error("Failed to update students by company:", error);
//   }
// }

$("#ojtFormU").validate({
  rules: {
    companyNameU: {
      required: true,
      minlength: 2,
    },
    companyAddressU: {
      required: true,
      minlength: 2,
    },
    companyProvinceU: {
      required: true,
    },
  },
  messages: {
    companyNameU: {
      required: "Please enter company name",
      minlength: "Company name must be at least 2 characters long",
    },
    companyAddressU: {
      required: "Please enter company address",
      minlength: "Company address must be at least 2 characters long",
    },
    companyProvinceU: {
      required: "Please select a province",
    },
  },
  errorPlacement: function (error, element) {
    error.appendTo($("#" + element.attr("name") + "-error"));
  },
  submitHandler: async function (form, event) {
    event.preventDefault();

    const submitButton = $(form).find('button[type="submit"]');
    const companyId = document
      .getElementById("updateCompanyModal")
      ?.getAttribute("data-company-id");
    const previewImage = document.querySelector(
      "#updateCompanyModal #update-preview-image"
    );

    const newCompanyName = form.companyNameU.value.trim();
    const newCompanyAddress = form.companyAddressU.value.trim();
    const newCompanyProvince = form.companyProvinceU.value;

    if (!companyId) {
      Swal.fire({
        icon: "error",
        title: "Failed To Find ID",
        text: "Company ID not found.",
        confirmButtonColor: "#590f1c",
      });
      submitButton.prop("disabled", false).text("Update Company");
      return;
    }

    submitButton.prop("disabled", true).html(`
      <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
      Checking...
    `);

    try {
      const { firebaseCRUD } = await import("./firebase-crud.js");

      const oldCompanyData = await firebaseCRUD.getDataById(
        "company",
        companyId
      );

      const duplicateExists = await checkCompanyDuplicate(
        newCompanyName,
        newCompanyAddress,
        companyId
      );
      if (duplicateExists) {
        Swal.fire({
          icon: "error",
          title: "Company With This Address Exists",
          text: "A company with this name and address already exists!",
          confirmButtonColor: "#590f1c",
        });
        return;
      }

      submitButton.html(`
        <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
        Updating...
      `);

      const companyData = {
        companyName: newCompanyName,
        companyAddress: newCompanyAddress,
        companyProvince: newCompanyProvince,
        updatedAt: new Date().toISOString(),
        image:
          uploadedImageBase64 ||
          (previewImage?.src && previewImage.style.display !== "none"
            ? previewImage.src
            : ""),
      };

      await firebaseCRUD.updateData("company", companyId, companyData);
      await updateStudentsByCompany(firebaseCRUD, oldCompanyData, companyData);

      Swal.fire({
        icon: "success",
        title: "Success",
        text: "Company updated successfully!",
        timer: 2000,
        showConfirmButton: false,
      });

      form.reset();

      const modal = bootstrap.Modal.getInstance(
        document.getElementById("updateCompanyModal")
      );
      modal?.hide();

      if (previewImage) {
        previewImage.src = "";
        previewImage.style.display = "none";
      }

      const cameraIcon = document.querySelector(
        "#updateCompanyModal #camera-icon"
      );
      if (cameraIcon) cameraIcon.style.display = "block";

      uploadedImageBase64 = "";
      loadCompanies();
    } catch (error) {
      if (error !== "Duplicate company") {
        console.error("Update error:", error);
        Swal.fire({
          icon: "error",
          title: "Update Failed",
          text: `Update failed: ${error.message || error}`,
          confirmButtonColor: "#590f1c",
        });
      }
    } finally {
      submitButton.prop("disabled", false).text("Update Company");
    }
  },
});

async function updateStudentsByCompany(firebaseCRUD, oldData, newData) {
  try {
    const matchingStudents = await firebaseCRUD.queryData(
      "students",
      "companyName",
      "==",
      oldData.companyName
    );

    const filtered = matchingStudents.filter(
      (student) =>
        student.companyAddress === oldData.companyAddress &&
        student.companyProvince === oldData.companyProvince
    );

    const updatePromises = filtered.map((student) => {
      const updatedFields = {
        companyName: newData.companyName,
        companyAddress: newData.companyAddress,
        companyProvince: newData.companyProvince,
        updatedAt: new Date().toISOString(),
      };
      return firebaseCRUD.updateData("students", student.id, updatedFields);
    });

    await Promise.all(updatePromises);
    console.log(`Updated ${updatePromises.length} student(s)`);
  } catch (error) {
    console.error("Failed to update students by company:", error);
  }
}

async function checkCompanyDuplicate(
  companyName,
  companyAddress,
  excludeId = null
) {
  try {
    const { firebaseCRUD } = await import("./firebase-crud.js");
    const companies = await firebaseCRUD.getAllData("company");

    return companies.some((company) => {
      const nameMatches =
        company.companyName &&
        company.companyName.toLowerCase() === companyName.toLowerCase();
      const addressMatches =
        company.companyAddress &&
        company.companyAddress.toLowerCase() === companyAddress.toLowerCase();
      const isSameCompany = excludeId && company.id === excludeId;
      return nameMatches && addressMatches && !isSameCompany;
    });
  } catch (error) {
    console.error("Error checking company:", error);
    return true;
  }
}

document
  .getElementById("updateCompanyModal")
  ?.addEventListener("hidden.bs.modal", function () {
    const form = document.getElementById("ojtFormU");
    const previewImage = document.querySelector(
      "#updateCompanyModal #update-preview-image"
    );
    const cameraIcon = document.querySelector(
      "#updateCompanyModal #camera-icon"
    );
    const cameraInput = document.getElementById("update-camera-input");
    const provinceSelect = document.querySelector(
      '#updateCompanyModal [name="companyProvinceU"]'
    );

    if (form) form.reset();
    if (previewImage) {
      previewImage.src = "";
      previewImage.style.display = "none";
    }
    if (cameraIcon) cameraIcon.style.display = "block";
    if (cameraInput) cameraInput.value = "";
    if (provinceSelect) provinceSelect.value = "";
    uploadedImageBase64 = "";
  });

async function compressImage(
  file,
  maxSizeMB = 1,
  maxWidth = 1024,
  maxHeight = 1024
) {
  return new Promise((resolve) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = function (e) {
      img.src = e.target.result;

      img.onload = function () {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        let quality = 0.9;
        let resultBlob;

        const checkSize = () => {
          canvas.toBlob(
            (blob) => {
              if (blob.size > maxSizeMB * 1024 * 1024 && quality > 0.1) {
                quality -= 0.1;
                checkSize();
              } else {
                resultBlob = blob;
                resolve(resultBlob);
              }
            },
            "image/jpeg",
            quality
          );
        };

        checkSize();
      };
    };

    reader.readAsDataURL(file);
  });
}

function populateProvinceDropdown(selectElement) {
  const provinces = {
    "Cordillera Administrative Region": [
      "Benguet",
      "Ifugao",
      "Kalinga",
      "Mountain Province",
    ],
    "I - Ilocos Region": [
      "Ilocos Norte",
      "Ilocos Sur",
      "La Union",
      "Pangasinan",
    ],
    "II - Cagayan Valley": [
      "Batanes",
      "Cagayan",
      "Isabela",
      "Nueva Vizcaya",
      "Quirino",
    ],
    "III - Central Luzon": [
      "Bataan",
      "Bulacan",
      "Nueva Ecija",
      "Pampanga",
      "Tarlac",
      "Zambales",
      "Aurora",
    ],
    "IVA - CALABARZON": ["Batangas", "Cavite", "Laguna", "Quezon", "Rizal"],
    "IVB - MIMAROPA": [
      "Marinduque",
      "Occidental Mindoro",
      "Oriental Mindoro",
      "Palawan",
      "Romblon",
    ],
    "V - Bicol Region": [
      "Albay",
      "Camarines Norte",
      "Camarines Sur",
      "Catanduanes",
      "Masbate",
      "Sorsogon",
    ],
    "VI - Western Visayas": [
      "Aklan",
      "Antique",
      "Capiz",
      "Iloilo",
      "Negros Occidental",
      "Guimaras",
    ],
    "VII - Central Visayas": ["Bohol", "Cebu", "Negros Oriental", "Siquijor"],
    "VIII - Eastern Visayas": [
      "Eastern Samar",
      "Leyte",
      "Northern Samar",
      "Samar (Western Samar)",
      "Southern Leyte",
      "Biliran",
    ],
    "IX - Zamboanga Peninsula": [
      "Zamboanga del Norte",
      "Zamboanga del Sur",
      "Zamboanga Sibugay",
    ],
    "X - Northern Mindanao": [
      "Bukidnon",
      "Camiguin",
      "Lanao del Norte",
      "Misamis Occidental",
      "Misamis Oriental",
    ],
    "XI - Davao Region": [
      "Davao del Norte",
      "Davao del Sur",
      "Davao Oriental",
      "Davao de Oro",
      "Davao Occidental",
    ],
    "XII - SOCCSKSARGEN": [
      "North Cotabato",
      "South Cotabato",
      "Sultan Kudarat",
      "Sarangani",
      "Cotabato City",
    ],
    Caraga: [
      "Agusan del Norte",
      "Agusan del Sur",
      "Surigao del Norte",
      "Surigao del Sur",
    ],
    "Autonomous Region in Muslim Mindanao": [
      "Maguindanao",
      "Lanao del Sur",
      "Basilan",
      "Sulu",
      "Tawi-Tawi",
    ],
  };

  selectElement.innerHTML = "";

  const allProvincesOption = document.createElement("option");
  allProvincesOption.value = "";
  allProvincesOption.textContent = "All Provinces";
  allProvincesOption.selected = true;
  selectElement.appendChild(allProvincesOption);

  for (const [region, regionProvinces] of Object.entries(provinces)) {
    const optgroup = document.createElement("optgroup");
    optgroup.label = region;

    regionProvinces.forEach((province) => {
      const option = document.createElement("option");
      option.value = province;
      option.textContent = province;
      optgroup.appendChild(option);
    });

    selectElement.appendChild(optgroup);
  }
}

document.addEventListener("DOMContentLoaded", function () {
  const addProvinceSelect = document.getElementById("company-province");
  const updateProvinceSelect = document.getElementById(
    "update-company-province"
  );

  if (addProvinceSelect) populateProvinceDropdown(addProvinceSelect);
  if (updateProvinceSelect) populateProvinceDropdown(updateProvinceSelect);

  document
    .querySelectorAll("#company-province, #update-company-province")
    .forEach((select) => {
      let isProgrammaticChange = false;

      const originalStyles = {
        maxHeight: select.style.maxHeight,
        width: select.style.width,
        position: select.style.position,
      };

      select.addEventListener("focus", function () {
        if (isProgrammaticChange) {
          isProgrammaticChange = false;
          return;
        }

        const rect = this.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom - 20;

        this.style.position = "absolute";
        this.style.width = `calc(100% - ${
          parseInt(window.getComputedStyle(this.parentElement).paddingLeft) * 2
        }px)`;
        this.style.maxHeight = Math.min(250, spaceBelow) + "px";
        this.style.zIndex = "1060";
      });

      select.addEventListener("change", function () {
        isProgrammaticChange = true;

        const event = new Event("input", { bubbles: true });
        this.dispatchEvent(event);

        this.blur();

        this.style.maxHeight = originalStyles.maxHeight;
        this.style.width = originalStyles.width;
        this.style.position = originalStyles.position;
        this.style.zIndex = "";
      });

      select.addEventListener("blur", function () {
        if (!isProgrammaticChange) {
          this.style.maxHeight = originalStyles.maxHeight;
          this.style.width = originalStyles.width;
          this.style.position = originalStyles.position;
          this.style.zIndex = "";
        }
      });
    });
});
