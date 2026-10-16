(() => {
  const STORAGE_KEY = "berenyi-intake-v1";
  const WEB3FORMS_URL = "https://api.web3forms.com/submit";
  const TEAM_TYPES = {
    ugyvedek: { label: "Ügyvéd", defaultTitle: "Ügyvéd" },
    jeloltek: { label: "Ügyvédjelölt", defaultTitle: "ügyvédjelölt" },
    partnerek: { label: "Partner", defaultTitle: "" },
  };

  const form = document.getElementById("intake-form");
  const template = document.getElementById("person-card-template");
  const statusEl = document.getElementById("status");
  const submitBtn = document.getElementById("btn-submit");
  const counters = { ugyvedek: 0, jeloltek: 0, partnerek: 0 };

  function setStatus(message, isError = false) {
    statusEl.textContent = message;
    statusEl.classList.toggle("is-error", isError);
  }

  function getAccessKey() {
    return window.INTAKE_CONFIG?.web3formsAccessKey?.trim() || "";
  }

  function createPersonCard(type, data = {}) {
    const meta = TEAM_TYPES[type];
    const list = document.getElementById(`list-${type}`);
    const node = template.content.cloneNode(true);
    const card = node.querySelector(".person-card");
    counters[type] += 1;
    const index = counters[type];

    card.dataset.team = type;
    card.querySelector(".person-card__label").textContent = `${meta.label} #${index}`;

    const nameInput = card.querySelector('[data-field="name"]');
    const titleInput = card.querySelector('[data-field="title"]');
    const bioInput = card.querySelector('[data-field="bio"]');
    const photoInput = card.querySelector('[data-field="photo"]');

    nameInput.value = data.name || "";
    titleInput.value = data.title ?? meta.defaultTitle;
    bioInput.value = data.bio || "";
    photoInput.value = data.photo || "";

    card.querySelector("[data-remove]").addEventListener("click", () => {
      card.remove();
      persist();
      setStatus("Személy eltávolítva.");
    });

    list.appendChild(card);
    return card;
  }

  function collectTeam(type) {
    return [...document.querySelectorAll(`#list-${type} .person-card`)].map((card) => ({
      name: card.querySelector('[data-field="name"]').value.trim(),
      title: card.querySelector('[data-field="title"]').value.trim(),
      bio: card.querySelector('[data-field="bio"]').value.trim(),
      photo: card.querySelector('[data-field="photo"]').value.trim(),
    }));
  }

  function collectFormData() {
    const data = {
      meta: {
        project: "Berényi és Társai Ügyvédi Iroda",
        reference: "https://barandyestarsai.hu",
        exportedAt: new Date().toISOString(),
      },
      brand: {},
      about: {},
      areas: {},
      contact: {},
      legal: {},
      branding: {},
      team: {
        ugyvedek: collectTeam("ugyvedek"),
        jeloltek: collectTeam("jeloltek"),
        partnerek: collectTeam("partnerek"),
      },
    };

    const fields = form.querySelectorAll("[name]");
    fields.forEach((field) => {
      const [group, key] = field.name.split(".");
      if (!group || !key || !data[group]) return;
      data[group][key] = field.value.trim();
    });

    return data;
  }

  function formatPeople(list, heading) {
    if (!list.length) return `${heading}: (nincs megadva)\n`;
    const lines = list.map((p, i) => {
      const parts = [
        `  ${i + 1}. ${p.name || "(névtelen)"}`,
        p.title ? `     Pozíció: ${p.title}` : "",
        p.bio ? `     Bio: ${p.bio}` : "",
        p.photo ? `     Fotó: ${p.photo}` : "",
      ].filter(Boolean);
      return parts.join("\n");
    });
    return `${heading}:\n${lines.join("\n")}\n`;
  }

  function formatReadableMessage(data) {
    const langLabel = {
      hu: "Csak magyar",
      "hu-en": "Magyar + angol",
      unsure: "Még nem döntöttük el",
    };

    return [
      "BERÉNYI ÉS TÁRSAI — INFORMÁCIÓ-BEKÉRŐ",
      `Beküldve: ${data.meta.exportedAt}`,
      "",
      "=== FŐOLDAL / BRAND ===",
      `Iroda neve: ${data.brand.officeName || "-"}`,
      `Rövid név: ${data.brand.shortName || "-"}`,
      `Üdvözlő szöveg: ${data.brand.welcome || "-"}`,
      `Hangnem: ${data.brand.tone || "-"}`,
      "",
      "=== IRODÁNK ===",
      formatPeople(data.team.ugyvedek, "Ügyvédek"),
      formatPeople(data.team.jeloltek, "Ügyvédjelöltek"),
      formatPeople(data.team.partnerek, "Partnerek"),
      "=== RÓLUNK ===",
      `Alapítás éve: ${data.about.foundedYear || "-"}`,
      `Alapítók: ${data.about.founders || "-"}`,
      `Történet: ${data.about.story || "-"}`,
      `Megjegyzés: ${data.about.notes || "-"}`,
      "",
      "=== TERÜLETEK ===",
      `Lista:\n${data.areas.list || "-"}`,
      `Összefoglaló: ${data.areas.summary || "-"}`,
      "",
      "=== KAPCSOLAT ===",
      `Telefon: ${data.contact.phone || "-"}`,
      `Fax: ${data.contact.fax || "-"}`,
      `E-mail: ${data.contact.email || "-"}`,
      `Űrlap címzett: ${data.contact.formRecipient || "-"}`,
      `Cím: ${data.contact.address || "-"}`,
      `E-kapcsolat: ${data.contact.ekapcsolat || "-"}`,
      `Térkép: ${data.contact.mapUrl || "-"}`,
      "",
      "=== JOGI ===",
      `Kamarai szám: ${data.legal.chamberNumber || "-"}`,
      `Kamara: ${data.legal.chamberName || "-"}`,
      `Kamara címe: ${data.legal.chamberAddress || "-"}`,
      `Adatvédelem: ${data.legal.privacy || "-"}`,
      `Közlemény: ${data.legal.notice || "-"}`,
      "",
      "=== ARCULAT ===",
      `Logo: ${data.branding.logo || "-"}`,
      `Színek: ${data.branding.colors || "-"}`,
      `Nyelvek: ${langLabel[data.branding.languages] || data.branding.languages || "-"}`,
      `Fotók: ${data.branding.photos || "-"}`,
      `Megjegyzés: ${data.branding.notes || "-"}`,
      "",
      "=== JSON ===",
      JSON.stringify(data, null, 2),
    ].join("\n");
  }

  function validateRequired() {
    const required = form.querySelectorAll("[required]");
    for (const field of required) {
      if (!field.value.trim()) {
        field.focus();
        const label = field.closest("label")?.querySelector("span")?.childNodes[0]?.textContent?.trim();
        setStatus(`Kérlek töltsd ki: ${label || field.name}`, true);
        return false;
      }
    }
    return true;
  }

  function applyFlatFields(saved) {
    if (!saved) return;
    const groups = ["brand", "about", "areas", "contact", "legal", "branding"];
    groups.forEach((group) => {
      const values = saved[group] || {};
      Object.entries(values).forEach(([key, value]) => {
        const input = form.querySelector(`[name="${group}.${key}"]`);
        if (input) input.value = value;
      });
    });
  }

  function applyTeam(saved) {
    Object.keys(TEAM_TYPES).forEach((type) => {
      document.getElementById(`list-${type}`).innerHTML = "";
      counters[type] = 0;
      const people = saved?.team?.[type];
      if (Array.isArray(people) && people.length) {
        people.forEach((person) => createPersonCard(type, person));
      } else {
        createPersonCard(type);
      }
    });
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(collectFormData()));
    } catch {
      /* ignore quota / private mode */
    }
  }

  function restore() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        applyTeam(null);
        return;
      }
      const saved = JSON.parse(raw);
      applyFlatFields(saved);
      applyTeam(saved);
      setStatus("Korábbi kitöltés visszatöltve.");
    } catch {
      applyTeam(null);
      setStatus("A mentett adatok nem voltak olvashatók.", true);
    }
  }

  function downloadJson() {
    const data = collectFormData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `berenyi-informacio-bekero-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    persist();
    setStatus("JSON fájl letöltve.");
  }

  async function copyJson() {
    const text = JSON.stringify(collectFormData(), null, 2);
    try {
      await navigator.clipboard.writeText(text);
      persist();
      setStatus("A válaszok a vágólapra kerültek — beilleszthető e-mailbe.");
    } catch {
      setStatus("A vágólap másolás nem sikerült. Próbáld a JSON letöltést.", true);
    }
  }

  function clearForm() {
    if (!confirm("Biztosan törlöd az összes kitöltött adatot?")) return;
    form.reset();
    localStorage.removeItem(STORAGE_KEY);
    Object.keys(TEAM_TYPES).forEach((type) => {
      document.getElementById(`list-${type}`).innerHTML = "";
      counters[type] = 0;
      createPersonCard(type);
    });
    setStatus("Űrlap törölve.");
  }

  async function submitForm(event) {
    event.preventDefault();

    if (!validateRequired()) return;

    const accessKey = getAccessKey();
    if (!accessKey || accessKey.includes("ILLESD_BE")) {
      setStatus("A küldés még nincs beállítva (hiányzik a Web3Forms access key).", true);
      return;
    }

    const data = collectFormData();
    const officeName = data.brand.officeName || "Berényi bekérő";
    submitBtn.disabled = true;
    submitBtn.textContent = "Küldés…";
    setStatus("Küldés folyamatban…");

    try {
      const response = await fetch(WEB3FORMS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          access_key: accessKey,
          subject: `Információ-bekérő kitöltve: ${officeName}`,
          from_name: "Berényi információ-bekérő",
          email: window.INTAKE_CONFIG?.notifyEmail || "tomikertesz10@gmail.com",
          message: formatReadableMessage(data),
          office_name: data.brand.officeName || "",
          contact_email: data.contact.email || "",
          contact_phone: data.contact.phone || "",
        }),
      });

      const result = await response.json();
      if (!response.ok || result.success === false) {
        throw new Error(result.message || "A küldés nem sikerült.");
      }

      persist();
      setStatus("Köszönjük! A válaszok elküldve — megérkeztek hozzánk e-mailben.");
    } catch (err) {
      setStatus(err.message || "Hiba a küldés során. Próbáld újra, vagy használd a JSON letöltést.", true);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Elküldés";
    }
  }

  document.querySelectorAll("[data-add-person]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const type = btn.getAttribute("data-add-person");
      createPersonCard(type);
      persist();
      setStatus(`${TEAM_TYPES[type].label} hozzáadva.`);
    });
  });

  form.addEventListener("input", () => {
    persist();
  });

  form.addEventListener("submit", submitForm);
  document.getElementById("btn-download").addEventListener("click", downloadJson);
  document.getElementById("btn-copy").addEventListener("click", copyJson);
  document.getElementById("btn-clear").addEventListener("click", clearForm);

  restore();

  if (!getAccessKey() || getAccessKey().includes("ILLESD_BE")) {
    console.warn("INTAKE_CONFIG.web3formsAccessKey hiányzik — másold a config.example.js-t config.js-re.");
  }
})();
