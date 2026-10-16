(() => {
  const STORAGE_KEY = "berenyi-intake-v2";
  const WEB3FORMS_URL = "https://api.web3forms.com/submit";
  const TEAM_TYPES = {
    ugyvedek: { label: "Ügyvéd", defaultTitle: "Ügyvéd" },
    jeloltek: { label: "Ügyvédjelölt", defaultTitle: "ügyvédjelölt" },
    partnerek: { label: "Partner", defaultTitle: "" },
  };

  const DEFAULTS = {
    brand: {
      officeName: "Berényi és Társai Ügyvédi Iroda",
      shortName: "BERÉNYI ÉS TÁRSAI",
      welcome: "Üdvözöljük a Berényi és Társai Ügyvédi Iroda honlapján.\nForduljon hozzánk bizalommal.",
    },
    about: {
      foundedYear: "",
      founders: "dr. Berényi András",
      story: "",
    },
    areas: {
      list: "",
      summary: "",
    },
    contact: {
      phone: "+36 1 294 4174",
      email: "iroda@berenyiestarsai.hu",
      address: "1188 Budapest, Lőrinci u. 12/B.",
      ekapcsolat: "18252563",
    },
    legal: {
      chamberNumber: "",
      chamberName: "Budapesti Ügyvédi Kamara",
      privacy: "",
    },
    branding: {
      logo: "",
      languages: "hu",
      photos: "",
    },
    team: {
      ugyvedek: [
        {
          name: "dr. Berényi András",
          title: "Ügyvéd, Irodavezető",
          bio: "",
          photo: "",
        },
      ],
      jeloltek: [],
      partnerek: [],
    },
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

    card.querySelector('[data-field="name"]').value = data.name || "";
    card.querySelector('[data-field="title"]').value = data.title ?? meta.defaultTitle;
    card.querySelector('[data-field="bio"]').value = data.bio || "";
    card.querySelector('[data-field="photo"]').value = data.photo || "";

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

    form.querySelectorAll("[name]").forEach((field) => {
      const [group, key] = field.name.split(".");
      if (!group || !key || !data[group]) return;
      data[group][key] = field.value.trim();
    });

    return data;
  }

  function formatPeople(list, heading) {
    const filled = list.filter((p) => p.name || p.bio || p.photo);
    if (!filled.length) return `${heading}: (nincs megadva)\n`;
    const lines = filled.map((p, i) => {
      return [
        `  ${i + 1}. ${p.name || "(névtelen)"}`,
        p.title ? `     Pozíció: ${p.title}` : "",
        p.bio ? `     Bio: ${p.bio}` : "",
        p.photo ? `     Fotó: ${p.photo}` : "",
      ]
        .filter(Boolean)
        .join("\n");
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
      "=== FŐOLDAL ===",
      `Iroda neve: ${data.brand.officeName || "-"}`,
      `Rövid név: ${data.brand.shortName || "-"}`,
      `Üdvözlő szöveg: ${data.brand.welcome || "-"}`,
      "",
      "=== IRODÁNK ===",
      formatPeople(data.team.ugyvedek, "Ügyvédek"),
      formatPeople(data.team.jeloltek, "Ügyvédjelöltek"),
      formatPeople(data.team.partnerek, "Partnerek"),
      "=== RÓLUNK ===",
      `Alapítás éve: ${data.about.foundedYear || "-"}`,
      `Alapítók: ${data.about.founders || "-"}`,
      `Történet: ${data.about.story || "-"}`,
      "",
      "=== TERÜLETEK ===",
      `Lista:\n${data.areas.list || "-"}`,
      `Összefoglaló: ${data.areas.summary || "-"}`,
      "",
      "=== KAPCSOLAT ===",
      `Telefon: ${data.contact.phone || "-"}`,
      `E-mail: ${data.contact.email || "-"}`,
      `Cím: ${data.contact.address || "-"}`,
      `E-kapcsolat: ${data.contact.ekapcsolat || "-"}`,
      "",
      "=== JOGI ===",
      `Kamarai szám: ${data.legal.chamberNumber || "-"}`,
      `Kamara: ${data.legal.chamberName || "-"}`,
      `Adatvédelem: ${data.legal.privacy || "(megírjuk)"}`,
      "",
      "=== ARCULAT ===",
      `Logo: ${data.branding.logo || "-"}`,
      `Nyelvek: ${langLabel[data.branding.languages] || data.branding.languages || "-"}`,
      `Fotók: ${data.branding.photos || "-"}`,
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
    ["brand", "about", "areas", "contact", "legal", "branding"].forEach((group) => {
      Object.entries(saved[group] || {}).forEach(([key, value]) => {
        const input = form.querySelector(`[name="${group}.${key}"]`);
        if (input) input.value = value;
      });
    });
  }

  function applyTeam(team) {
    Object.keys(TEAM_TYPES).forEach((type) => {
      document.getElementById(`list-${type}`).innerHTML = "";
      counters[type] = 0;
      const people = team?.[type];
      if (Array.isArray(people) && people.length) {
        people.forEach((person) => createPersonCard(type, person));
      }
    });
  }

  function applyDefaults() {
    applyFlatFields(DEFAULTS);
    applyTeam(DEFAULTS.team);
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(collectFormData()));
    } catch {
      /* ignore */
    }
  }

  function restore() {
    try {
      localStorage.removeItem("berenyi-intake-v1");
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        applyDefaults();
        setStatus("Előre kitöltött alapadatok betöltve — szerkeszd nyugodtan.");
        return;
      }
      const saved = JSON.parse(raw);
      applyFlatFields(saved);
      applyTeam(saved.team || DEFAULTS.team);
      setStatus("Korábbi kitöltés visszatöltve.");
    } catch {
      applyDefaults();
      setStatus("Alapadatok betöltve.", true);
    }
  }

  function resetToDefaults() {
    if (!confirm("Visszaállítod az előre kitöltött alapadatokat? A te módosításaid elvesznek.")) return;
    localStorage.removeItem(STORAGE_KEY);
    applyDefaults();
    setStatus("Alapadatok visszaállítva.");
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
      setStatus(err.message || "Hiba a küldés során. Próbáld újra.", true);
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

  form.addEventListener("input", persist);
  form.addEventListener("submit", submitForm);
  document.getElementById("btn-reset-defaults").addEventListener("click", resetToDefaults);

  restore();
})();
