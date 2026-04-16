const ua = navigator.userAgent.toLowerCase();
if (ua.includes("yandex")) {
  document.documentElement.classList.add("yandex");
}

// Search funtion
const data = [
  "Корм для кошек влажный",
  "Корм для собак сухой",
  "Корм для рыбок",
  "Корма для животных",
];

const input = document.getElementById("searchInput");
const suggestionsBox = document.getElementById("suggestions");
const bgWrap = document.querySelector(".bg-wrap");
const wrapSearch = document.querySelector(".wrapSearch");

input.addEventListener("input", () => {
  const value = input.value.toLowerCase();
  if (!value) return suggestionsBox.classList.add("hidden");

  const filtered = data.filter((item) => item.toLowerCase().includes(value));

  suggestionsBox.innerHTML = filtered.length
    ? filtered
        .map(
          (item) => `
    <li class="flex items-center cursor-pointer gap-2.5 text-xs md:text-sm text-blue-900 font-medium py-2.5 px-3 rounded-md hover:bg-[#DEECFF] transition-all duration-200">
    <svg width="23" height="23" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M18.1875 18.1875L21.8333 21.8333" stroke="#B7C5D5" stroke-width="2" stroke-linecap="round"/>
    <path d="M5.94792 2.32389C7.40346 1.4819 9.09338 1 10.8958 1C16.3611 1 20.7917 5.43051 20.7917 10.8958C20.7917 16.3611 16.3611 20.7917 10.8958 20.7917C5.43051 20.7917 1 16.3611 1 10.8958C1 9.09338 1.4819 7.40346 2.32389 5.94792" stroke="#B7C5D5" stroke-width="2" stroke-linecap="round"/>
    </svg>
    ${item}
    </li>
    `
        )
        .join("")
    : `<li class="text-gray-500 text-center text-xs md:text-sm font-medium">Информация не найдена</li>`;

  suggestionsBox.classList.remove("hidden");
});
input?.addEventListener("click", () => {
  bgWrap?.classList.add("show");
  wrapSearch.classList.add("active");
});
bgWrap?.addEventListener("click", () => {
  bgWrap.classList.remove("show");
  wrapSearch.classList.remove("active");
});

suggestionsBox.addEventListener("click", (e) => {
  if (
    e.target.closest("li") &&
    !e.target.closest("li").classList.contains("text-gray-500")
  ) {
    input.value = e.target.closest("li").innerText.trim();
    suggestionsBox.classList.add("hidden");
  }
});

document.addEventListener("click", (e) => {
  if (!e.target.closest("#searchInput") && !e.target.closest("#suggestions")) {
    suggestionsBox.classList.add("hidden");
  }
});

function updatePlaceholder() {
  const input = document.getElementById("searchInput");

  if (window.innerWidth <= 768) {
    input.setAttribute("placeholder", "Напишите, что вы ищете!");
  } else {
    input?.setAttribute(
      "placeholder",
      "Напишите, что вы ищете! Мы подскажем где купить..."
    );
  }
}
updatePlaceholder();
window.addEventListener("resize", updatePlaceholder);

// Input border colors
function setInputBorder(inputId, colors) {
  const input = document.getElementById(inputId);
  const wrapper = input.closest("div");

  input.addEventListener("focus", () => {
    wrapper.style.borderColor = colors.focus;
  });

  input.addEventListener("input", () => {
    wrapper.style.borderColor =
      input.value.trim() !== "" ? colors.typing : colors.focus;
  });

  input.addEventListener("blur", () => {
    wrapper.style.borderColor =
      input.value.trim() !== "" ? colors.focus : colors.default;
  });
}
setInputBorder("searchLocation", {
  focus: "#DEECFF",
  typing: "#0075FF",
  default: "#DEECFF",
});
setInputBorder("searchInput", {
  focus: "#6CABFF",
  typing: "#0075FF",
  default: "#DEECFF",
});

// Search btn
const searchBtn = document.querySelector(".searchBtn");
const searchWrap = document.querySelector(".search-wrap");

searchBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  searchWrap.style.borderColor = "#6CABFF";
});
document.addEventListener("click", (e) => {
  if (!searchWrap.contains(e.target) && !searchBtn.contains(e.target)) {
    searchWrap.style.borderColor = "#DEECFF";
  }
});

// Location function
const cities = [
  "Санкт-Петербург",
  "Саратов",
  "Самара",
  "Сочи",
  "Симферополь",
  "Севастополь",
  "Смоленск",
  "Сургут",
];

const input2 = document.getElementById("searchLocation");
const list = document.getElementById("locationList");
const selectedCity = document.getElementById("selectedCity");
const cityName = document.getElementById("cityName");
const clearBtn = document.getElementById("clearBtn");

input2.addEventListener("input", () => {
  const value = input2.value.toLowerCase();
  list.innerHTML = "";

  if (value) {
    const filtered = cities.filter((city) =>
      city.toLowerCase().includes(value)
    );

    if (filtered.length > 0) {
      filtered.forEach((city) => {
        const li = document.createElement("li");
        li.textContent = city;
        li.className =
          "px-1.5 py-2 cursor-pointer hover:bg-blueExtraLight text-blueNavy text-[13px] font-medium rounded-[3px] transition-all duration-200";
        li.addEventListener("click", () => {
          cityName.textContent = city;
          selectedCity.classList.remove("hidden");
          input2.classList.add("hidden");
          list.classList.add("hidden");
        });
        list.appendChild(li);
      });
    } else {
      const li = document.createElement("li");
      li.innerHTML = `<li class="text-gray-500 text-center text-xs md:text-sm font-medium">Информация не найдена</li>`;
      list.appendChild(li);
    }

    list.classList.remove("hidden");
  } else {
    list.classList.add("hidden");
  }
});

clearBtn.addEventListener("click", () => {
  cityName.textContent = "";
  selectedCity.classList.add("hidden");
  input2.classList.remove("hidden");
  input2.value = "";
  input2.focus();
});

// Dropdown function
document.addEventListener("DOMContentLoaded", () => {
  function handleDropdown(btn, dropdown) {
    const btnText = btn.querySelector(".btn-text");
    const observer = new MutationObserver(() => {
      btn.classList.toggle("active", !dropdown.classList.contains("hidden"));
    });
    observer.observe(dropdown, {
      attributes: true,
      attributeFilter: ["class"],
    });
    dropdown.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        btnText.textContent = link.textContent;
      });
    });
  }

  const btn1 = document.getElementById("dropdownDefaultButton");
  const dropdown1 = document.getElementById("dropdown");
  handleDropdown(btn1, dropdown1);

  const btn2 = document.getElementById("dropdownDefaultButton2");
  const dropdown2 = document.getElementById("dropdown2");
  handleDropdown(btn2, dropdown2);
});

// Category tab
const categoryOpens = document.querySelectorAll(".categoryOpen");
const header = document.querySelector("header");
const category = document.querySelector(".category");
const categoryMob1 = document.querySelector(".category_mob");
const categoryClose = document.querySelector(".categoryClose");
const body = document.body;

categoryOpens.forEach((categoryOpen) => {
  categoryOpen.addEventListener("click", () => {
    categoryOpen.classList.toggle("active");
    category.classList.toggle("active");
    body.classList.toggle("overflow-hidden");
    categoryClose.classList.toggle("active");
    header.classList.toggle("shadowStyle");
  });
});

categoryClose.addEventListener("click", () => {
  categoryClose.classList.remove("active");
  category.classList.remove("active");
  header.classList.remove("shadowStyle");
  categoryMob1.classList.add("hidden");
  body.classList.remove("overflow-hidden");
});

// Category tabs
document.querySelectorAll(".category_wrap").forEach((wrap) => {
  const tabs = wrap.querySelectorAll(".category_tab");
  const values = wrap.querySelectorAll(".category_value");

  let activeIndex = null;
  function setActive(index) {
    tabs.forEach((t) => t.classList.remove("active"));
    values.forEach((v) => {
      v.classList.remove("active");
      v.classList.add("hidden");
    });

    tabs[index].classList.add("active");
    values[index].classList.add("active");
    values[index].classList.remove("hidden");
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener("mouseenter", () => {
      setActive(index);
    });

    tab.addEventListener("click", () => {
      setActive(index);
      activeIndex = index;
    });
  });
});

// categoryTop_tabs
const categoryTop_tabs = document.querySelectorAll(".categoryTop_tab");
const wraps = document.querySelectorAll(".category_wrap");
const titleCategory = document.querySelector(".titleCategory");

const titles = ["Каталог товаров", "Каталог магазинов"];

categoryTop_tabs.forEach((tab, index) => {
  tab.addEventListener("click", () => {
    categoryTop_tabs.forEach((t) => t.classList.remove("active"));
    wraps.forEach((w) => w.classList.add("hidden"));

    tab.classList.add("active");
    wraps[index].classList.remove("hidden");

    // Avtomatik o‘zgartirish massiv orqali
    titleCategory.textContent = titles[index] || "";
  });
});

// categoryMob open
const categoryCards = document.querySelectorAll(".categoryModal_card");
const categoryMob = document.querySelector(".category_mob");
const backBtn = document.querySelector(".back-btn");

categoryCards.forEach((card) => {
  card.addEventListener("click", () => {
    categoryMob.classList.remove("hidden");
  });
});
backBtn.addEventListener("click", () => {
  categoryMob.classList.add("hidden");
});

// category-btn
const categoryBtn = document.querySelectorAll(".category-btn");

categoryBtn.forEach((tab) => {
  tab.addEventListener("click", () => {
    categoryBtn.forEach((btn) => btn.classList.remove("active"));
    tab.classList.add("active");
  });
});

// productSlide
var productSlide = new Swiper(".productSlide", {
  spaceBetween: 10,
  pagination: {
    el: ".swiper-pagination",
  },
});

// Slider
var bannerSlide = new Swiper(".bannerSlide", {
  spaceBetween: 20,
  effect: "fade",
  autoplay: {
    delay: 3000,
  },
  loop: true,
  speed: 400,
  navigation: {
    nextEl: ".swiper-button-next",
    prevEl: ".swiper-button-prev",
  },
  pagination: {
    el: ".swiper-pagination",
  },
});




document.addEventListener("DOMContentLoaded", () => {
  const checkboxes = document.querySelectorAll("input[type='checkbox'][data-sync]");

  checkboxes.forEach(ch => {
    ch.addEventListener("change", () => {
      const group = ch.dataset.sync;
      const isChecked = ch.checked;

      checkboxes.forEach(other => {
        if (other.dataset.sync === group) {
          other.checked = isChecked;
        }
      });

      localStorage.setItem("checkbox-" + group, isChecked);
    });
  });

  checkboxes.forEach(ch => {
    const group = ch.dataset.sync;
    const saved = localStorage.getItem("checkbox-" + group);
    if (saved !== null) {
      ch.checked = saved === "true";
    }
  });
});