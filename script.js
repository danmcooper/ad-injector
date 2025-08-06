// IIFE
(function () {
  // vars at top for readability
  const API_URL =
    "https://storage.cloud.kargo.com/ad/campaign/rm/test/interview-ads.json";
  const ui = document.getElementById("kargo-ad-injector-ui");
  const injectBtn = document.getElementById("kargo-ad-injector-ui_inject-btn");
  const reloadBtn = document.getElementById("kargo-ad-injector-ui_reload-btn");

  let isDragging = false;
  let offsetX = 0;
  let offsetY = 0;

  // helper func
  function collectVisibleCandidates(root, list = []) {
    const candidates = Array.from(
      root.querySelectorAll(
        ":scope > div, :scope > section, :scope > article, :scope > main, :scope > p"
      )
    ).filter(
      (el) =>
        el.offsetParent !== null &&
        !el.classList.contains("kargo-ad-injector-ui") &&
        !el.classList.contains("kargo-ad-injector-ad-container")
    );

    for (const el of candidates) {
      list.push(el);
      collectVisibleCandidates(el, list);
    }

    return list;
  }

  // helper func
  function findMiddleInsertionPoint() {
    const midpoint = document.documentElement.scrollHeight / 2;
    const candidates = collectVisibleCandidates(document.body);

    let closestEl = null;
    let closestDist = Infinity;

    for (const el of candidates) {
      const rect = el.getBoundingClientRect();
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const elementCenter = rect.top + scrollTop + rect.height / 2;
      const dist = Math.abs(elementCenter - midpoint);

      // skip empty
      if (
        rect.height > window.innerHeight * 0.95 &&
        !el.querySelector("p, img, article, section, figure")
      )
        continue;

      if (dist < closestDist) {
        closestDist = dist;
        closestEl = el;
      }
    }

    if (!closestEl) return null;

    // if row or tall find children
    if (
      closestEl.getBoundingClientRect().height > window.innerHeight * 0.5 ||
      closestEl.classList.contains("row")
    ) {
      const deepCandidates = Array.from(
        closestEl.querySelectorAll("p, figure, img, section, article")
      ).filter((el) => el.offsetParent !== null);

      if (deepCandidates.length) {
        let bestChild = null;
        let bestDist = Infinity;
        for (const el of deepCandidates) {
          const rect = el.getBoundingClientRect();
          const scrollTop =
            window.scrollY || document.documentElement.scrollTop;
          const elementCenter = rect.top + scrollTop + rect.height / 2;
          const dist = Math.abs(elementCenter - midpoint);
          if (dist < bestDist) {
            bestDist = dist;
            bestChild = el;
          }
        }
        return bestChild || closestEl;
      }
    }

    return closestEl;
  }

  // helper func
  function clampPosition(x, y, element) {
    const maxX = window.innerWidth - element.offsetWidth;
    const maxY = window.innerHeight - element.offsetHeight;

    return {
      left: Math.max(0, Math.min(x, maxX)),
      top: Math.max(0, Math.min(y, maxY)),
    };
  }

  // helper func for resize listener
  function applyClampedPosition(element) {
    const currentLeft = parseFloat(element.style.left) || 0;
    const currentTop = parseFloat(element.style.top) || 0;

    const { left, top } = clampPosition(currentLeft, currentTop, element);
    element.style.left = `${left}px`;
    element.style.top = `${top}px`;

    // Save the valid position
    localStorage.setItem("injectorUIPos", JSON.stringify({ left, top }));
  }

  // Load saved position
  const savedPosition = JSON.parse(localStorage.getItem("injectorUIPos"));
  if (savedPosition) {
    const { left, top } = clampPosition(
      savedPosition.left,
      savedPosition.top,
      ui
    );
    ui.style.left = `${left}px`;
    ui.style.top = `${top}px`;
  } else {
    ui.style.left = "110px"; // 180px width/2 + 20px
    ui.style.top = "20px";
  }

  // attempt to control on-screen if window is resized
  window.addEventListener("resize", () => applyClampedPosition(ui));

  // injection button listener
  injectBtn.addEventListener("click", async () => {
    const status = document.getElementById("kargo-ad-injector-ui_status");
    status.textContent = "Loading ads...";

    // cleanup
    document
      .querySelectorAll(
        ".kargo-ad-injector-ad-container, .kargo-ad-injector-ad-sticky"
      )
      .forEach((el) => el.remove());

    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error("Network error");
      const data = await res.json();

      if (!data.ads || data.ads.length === 0) {
        status.textContent = "No ads found.";
        return;
      }

      status.textContent = `Injecting ${data.ads.length} ad(s)...`;

      data.ads.forEach((ad, i) => {
        const [w, h] = ad.size.split("x").map(Number);
        const innerHTML = atob(ad.markup);

        // sticky
        if (ad.type === "sticky") {
          const adDiv = document.createElement("div");
          adDiv.className =
            "kargo-ad-injector-ad-container kargo-ad-injector-ad-sticky";
          adDiv.style.width = w + "px";
          adDiv.style.height = h + "px";

          const inner = document.createElement("div");
          inner.className = "kargo-ad-injector-ad-sticky_ad-inner";
          inner.innerHTML = innerHTML;

          const closeBtn = document.createElement("button");
          closeBtn.textContent = "×";
          closeBtn.className = "kargo-ad-injector-ad-sticky_close-btn";
          closeBtn.onclick = () => adDiv.remove();

          adDiv.appendChild(inner);
          adDiv.appendChild(closeBtn);

          adDiv.style.left = "50%";
          adDiv.style.transform = "translateX(-50%)";
          adDiv.style.right = "auto";
          adDiv.style.maxWidth = "90vw";

          document.body.appendChild(adDiv);
          setTimeout(() => adDiv.classList.add("show"), i * 150);
        } else {
          // otherwise middle
          const wrapper = document.createElement("div");
          wrapper.className = "kargo-ad-injector-ad-container";
          wrapper.style.width = "100%";
          wrapper.style.display = "flex";
          wrapper.style.justifyContent = "center";

          const inner = document.createElement("div");
          inner.innerHTML = innerHTML;
          inner.style.maxWidth = "100%";
          inner.style.display = "inline-block";

          wrapper.appendChild(inner);

          const insertTarget = findMiddleInsertionPoint();
          if (insertTarget && insertTarget.insertAdjacentElement) {
            insertTarget.insertAdjacentElement("afterend", wrapper);
          } else {
            document.body.appendChild(wrapper); // fallback, ugh
          }

          // fade in, optional, i could go either way
          setTimeout(() => wrapper.classList.add("show"), i * 150);
        }
      });

      status.textContent = `${data?.ads?.length ?? 0} ads injected!`;
    } catch (e) {
      console.error(e);
      status.textContent = "Failed to load ads.";
    }
  });

  // reload button listener
  reloadBtn.addEventListener("click", () => {
    window.location.reload();
  });

  // start moving
  ui.addEventListener("mousedown", (e) => {
    isDragging = true;
    offsetX = e.clientX - ui.offsetLeft;
    offsetY = e.clientY - ui.offsetTop;
    ui.style.cursor = "grabbing";
  });

  // start moving
  ui.addEventListener("touchstart", (e) => {
    const touch = e.touches[0];
    isDragging = true;
    offsetX = touch.clientX - ui.offsetLeft;
    offsetY = touch.clientY - ui.offsetTop;
    ui.style.cursor = "grabbing";
  });

  // moving
  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    const x = e.clientX - offsetX;
    const y = e.clientY - offsetY;
    ui.style.left = x + "px";
    ui.style.top = y + "px";
  });

  // moving
  document.addEventListener(
    "touchmove",
    (e) => {
      if (!isDragging) return;
      e.preventDefault(); // prevent scrolling while dragging
      const touch = e.touches[0];
      ui.style.left = touch.clientX - offsetX + "px";
      ui.style.top = touch.clientY - offsetY + "px";
    },
    { passive: false } // needed for preventDefault
  );

  // end dragging
  document.addEventListener("mouseup", () => {
    if (isDragging) {
      isDragging = false;
      ui.style.cursor = "grab";
      // Save position
      localStorage.setItem(
        "injectorUIPos",
        JSON.stringify({
          left: ui.offsetLeft,
          top: ui.offsetTop,
        })
      );
    }
  });

  // end dragging
  document.addEventListener("touchend", () => {
    if (isDragging) {
      isDragging = false;
      ui.style.cursor = "grab";
      localStorage.setItem(
        "injectorUIPos",
        JSON.stringify({
          left: ui.offsetLeft,
          top: ui.offsetTop,
        })
      );
    }
  });
})();
