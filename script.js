(function () {

  /* ============================================================
     PALETTE — 20 colori bilanciati per uso cartografico
  ============================================================ */
  const PALETTE = [
    // Terracotta e Rossi caldi
    '#b84a39', '#c06c54', '#8b3a2b',
    // Ocra, Legno e Gialli caldi
    '#d97706', '#b4833e', '#8c6d3b',
    // Verdi Salvia e Foresta
    '#4a7c59', '#3b5e47', '#2e4a38',
    // Ottanio e Blu Minerali
    '#2a7b88', '#3b6e8c', '#2c4a6f',
    // Viola Melanzana e Prugna
    '#6b4c72', '#523a59',
    // Rosa Antico e Mattone
    '#a65b6f', '#8c4856',
    // Toni Neutri Caldi / Ardesia
    '#5a6b7c', '#4a5568', '#6b5b4e', '#4a3f35'
  ];

  /* ============================================================
     STATO APPLICATIVO
  ============================================================ */
  let sites = [];   // {id, name, color, visible}
  let points = [];  // {id, name, siteId, lat, lng, importance, notes}
  let hideTooltips = false;
  let showSecondary = true;
  let baseLayerKey = 'osm'; // 'osm' | 'satellite' | 'muta'
  let pendingLatLng = null;
  let editingPointId = null;
  let selectedNewColor = PALETTE[0];
  const markerLayer = L.layerGroup();
  const markersById = {};

  const STORAGE_KEY = 'studioCartograficoGuida_v1';

  /* ============================================================
     UTILITY
  ============================================================ */
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

  function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str == null ? '' : String(str);
    return d.innerHTML;
  }

  function hexToHsl(hex) {
    let r = parseInt(hex.slice(1, 3), 16) / 255, g = parseInt(hex.slice(3, 5), 16) / 255, b = parseInt(hex.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) { h = s = 0; }
    else {
      const d2 = max - min;
      s = l > 0.5 ? d2 / (2 - max - min) : d2 / (max + min);
      switch (max) {
        case r: h = (g - b) / d2 + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d2 + 2; break;
        case b: h = (r - g) / d2 + 4; break;
      }
      h /= 6;
    }
    return [h * 360, s * 100, l * 100];
  }

  function hslToHex(h, s, l) {
    s /= 100; l /= 100;
    const k = n => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    const toHex = x => Math.round(255 * x).toString(16).padStart(2, '0');
    return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
  }

  function getSecondaryColor(hex) {
    const [h, s, l] = hexToHsl(hex);
    const newS = Math.max(18, s * 0.42);
    const newL = Math.min(78, l + 24);
    return hslToHex(h, newS, newL);
  }

  function getSite(id) { return sites.find(s => s.id === id); }

  /* ============================================================
     PERSISTENZA — LocalStorage + Export/Import JSON
  ============================================================ */
  const VALID_BASE_LAYER_KEYS = ['osm', 'satellite', 'muta'];

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        sites, points,
        ui: { baseLayer: baseLayerKey, hideTooltips, showSecondary }
      }));
    } catch (e) { console.warn('Impossibile salvare in LocalStorage', e); }
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (Array.isArray(data.sites)) sites = data.sites.map(s => ({ visible: true, ...s }));
      if (Array.isArray(data.points)) points = data.points;
      if (data.ui && typeof data.ui === 'object') {
        if (VALID_BASE_LAYER_KEYS.includes(data.ui.baseLayer)) baseLayerKey = data.ui.baseLayer;
        if (typeof data.ui.hideTooltips === 'boolean') hideTooltips = data.ui.hideTooltips;
        if (typeof data.ui.showSecondary === 'boolean') showSecondary = data.ui.showSecondary;
      }
    } catch (e) { console.warn('Impossibile leggere LocalStorage', e); }
  }

  /* Sincronizza checkbox UI + layer base attivo con lo stato JS corrente.
     Usata sia al bootstrap che dopo un'importazione JSON. */
  function applyUIState() {
    const hideEl = document.getElementById('hideTooltipsToggle');
    const secEl = document.getElementById('showSecondaryToggle');
    if (hideEl) hideEl.checked = hideTooltips;
    if (secEl) secEl.checked = showSecondary;
    activateBaseLayer(baseLayerKey);
  }

  function exportJSON() {
    const payload = {
      meta: { app: 'Studio Cartografico Guida Turistica', exportedAt: new Date().toISOString(), version: 1 },
      sites: sites.map(({ id, name, color }) => ({ id, name, color })),
      points,
      ui: { baseLayer: baseLayerKey, hideTooltips, showSecondary }
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `mappa-studio-guida-turistica-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function importJSONFile(file) {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = JSON.parse(e.target.result);
        if (!Array.isArray(data.sites) || !Array.isArray(data.points)) throw new Error('Formato non valido');
        if (!confirm('L\'importazione sostituirà tutti i dati attualmente presenti sulla mappa. Continuare?')) return;
        sites = data.sites.map(s => ({ visible: true, ...s }));
        points = data.points;
        if (data.ui && typeof data.ui === 'object') {
          baseLayerKey = VALID_BASE_LAYER_KEYS.includes(data.ui.baseLayer) ? data.ui.baseLayer : 'osm';
          hideTooltips = typeof data.ui.hideTooltips === 'boolean' ? data.ui.hideTooltips : false;
          showSecondary = typeof data.ui.showSecondary === 'boolean' ? data.ui.showSecondary : true;
        } else {
          baseLayerKey = 'osm';
          hideTooltips = false;
          showSecondary = true;
        }
        applyUIState();
        saveState();
        renderSiteList();
        renderAllMarkers();
        updateStats();
      } catch (err) {
        alert('File JSON non valido o corrotto: ' + err.message);
      }
    };
    reader.readAsText(file);
  }

  /* ============================================================
     MAPPA — inizializzazione e layer
  ============================================================ */
  const map = L.map('map', {
    zoomControl: false,
    maxBounds: [[-90, -180], [90, 180]],
    minZoom: 3,
    maxBoundsViscosity: 1.0
  }).setView([42.3, 12.6], 6);

  L.control.zoom({ position: 'bottomleft' }).addTo(map);

  /* Layer base — chiavi di persistenza: 'osm' | 'satellite' | 'muta' */
  const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
  });

  const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics',
    maxZoom: 19,
  });

  const muta = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    subdomains: 'abcd',
    maxZoom: 19,
  });

  const baseLayers = { osm, satellite, muta };
  const baseLayerKeyByLayer = new Map([[osm, 'osm'], [satellite, 'satellite'], [muta, 'muta']]);

  L.control.layers({
    '🗺️ OpenStreetMap': osm,
    '🛰️ Satellite': satellite,
    '⬜ Cartina muta': muta
  }, null, { position: 'topright', collapsed: false }).addTo(map);

  /* Rimuove ogni layer base attivo e attiva ESCLUSIVAMENTE quello indicato dalla chiave.
     Riutilizzata sia al bootstrap (loadState) sia dopo import JSON (importJSONFile). */
  function activateBaseLayer(key) {
    const target = baseLayers[key] || baseLayers.osm;
    baseLayerKey = baseLayerKeyByLayer.get(target);
    Object.values(baseLayers).forEach(layer => {
      if (layer !== target && map.hasLayer(layer)) map.removeLayer(layer);
    });
    if (!map.hasLayer(target)) target.addTo(map);
  }

  /* Ogni cambio di layer base (manuale dal controllo, o programmatico) aggiorna
     lo stato persistito in LocalStorage. */
  map.on('baselayerchange', e => {
    const key = baseLayerKeyByLayer.get(e.layer);
    if (key) {
      baseLayerKey = key;
      saveState();
    }
  });

  markerLayer.addTo(map);

  /* ============================================================
     ICONE MARKER
  ============================================================ */
  function buildIcon(color, isPrincipale) {
    const size = isPrincipale ? 26 : 17;
    const border = isPrincipale ? 3 : 2;
    return L.divIcon({
      className: '',
      html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};
             border:${border}px solid #1c2028;box-shadow:0 1px 4px rgba(0,0,0,.6);"></div>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
      popupAnchor: [0, -size / 2 - 2],
      tooltipAnchor: [0, -size / 2]
    });
  }

  /* ============================================================
     RENDER MARKER
  ============================================================ */
  function popupContentFor(point, site) {
    const badgeText = point.importance === 'principale' ? 'Sito Principale' : 'Elemento Secondario';
    const notesHtml = point.notes ? `<p class="popup-notes">${escapeHtml(point.notes)}</p>` : '';
    return `
      <div class="popup-card">
        <h4>${escapeHtml(point.name)}</h4>
        <p class="popup-site"><span class="dot" style="background:${site.color}"></span>${escapeHtml(site.name)}</p>
        <span class="popup-badge">${badgeText}</span>
        ${notesHtml}
        <div class="popup-actions">
          <button onclick="window.__app.editPoint('${point.id}')">✏️ Modifica</button>
          <button class="danger" onclick="window.__app.deletePoint('${point.id}')">🗑️ Elimina</button>
        </div>
      </div>`;
  }

  function renderAllMarkers() {
    markerLayer.clearLayers();
    for (const key in markersById) delete markersById[key];

    points.forEach(point => {
      const site = getSite(point.siteId);
      if (!site) return;
      if (site.visible === false) return;
      if (point.importance === 'secondario' && !showSecondary) return;

      const color = point.importance === 'principale' ? site.color : getSecondaryColor(site.color);
      const marker = L.marker([point.lat, point.lng], {
        icon: buildIcon(color, point.importance === 'principale'),
        draggable: false,
        zIndexOffset: point.importance === 'principale' ? 1000 : 0
      });

      if (!hideTooltips) {
        marker.bindTooltip(escapeHtml(point.name), { direction: 'top', className: 'pin-tooltip', opacity: 1 });
      }
      marker.bindPopup(popupContentFor(point, site));

      marker.on('dragend', ev => {
        const ll = ev.target.getLatLng();
        point.lat = ll.lat; point.lng = ll.lng;
        saveState();
      });

      marker.addTo(markerLayer);
      markersById[point.id] = marker;
    });
  }

  /* ============================================================
     SIDEBAR — lista siti / filtri
  ============================================================ */
  function getSitesSortedAlphabetically() {
    return [...sites].sort((a, b) => a.name.localeCompare(b.name, 'it', { sensitivity: 'base' }));
  }

  function renderSiteList() {
    const listEl = document.getElementById('siteList');
    const badge = document.getElementById('siteCountBadge');
    badge.textContent = sites.length + (sites.length === 1 ? ' sito' : ' siti');

    if (sites.length === 0) {
      listEl.innerHTML = '<div class="empty-hint">Nessun sito ancora creato. Clicca sulla mappa per iniziare.</div>';
    } else {
      listEl.innerHTML = getSitesSortedAlphabetically().map(site => `
        <div class="site-item">
          <input type="checkbox" class="chk site-visible-chk" data-site="${site.id}" ${site.visible !== false ? 'checked' : ''}>
          <span class="site-dot" style="background:${site.color}"></span>
          <span class="site-name" title="${escapeHtml(site.name)}">${escapeHtml(site.name)}</span>
          <button class="site-del" title="Elimina sito e relativi punti" data-site-del="${site.id}">✕</button>
        </div>`
      ).join('');
    }

    listEl.querySelectorAll('.site-visible-chk').forEach(chk => {
      chk.addEventListener('change', () => {
        const site = getSite(chk.dataset.site);
        site.visible = chk.checked;
        saveState();
        renderAllMarkers();
      });
    });
    listEl.querySelectorAll('[data-site-del]').forEach(btn => {
      btn.addEventListener('click', () => {
        const siteId = btn.dataset.siteDel;
        const site = getSite(siteId);
        if (!confirm(`Eliminare il sito "${site.name}" e tutti i suoi elementi collegati?`)) return;
        sites = sites.filter(s => s.id !== siteId);
        points = points.filter(p => p.siteId !== siteId);
        saveState();
        renderSiteList();
        renderAllMarkers();
        updateStats();
      });
    });

    applySiteSearchFilter();
  }

  /* ============================================================
     RICERCA SITI (filtro locale sulla lista DOM — nessun pan/zoom
     né occultamento marker)
  ============================================================ */
  function applySiteSearchFilter() {
    const input = document.getElementById('siteSearchInput');
    if (!input) return;
    const q = input.value.trim().toLowerCase();
    document.querySelectorAll('#siteList .site-item').forEach(item => {
      const nameEl = item.querySelector('.site-name');
      const name = (nameEl ? nameEl.textContent : '').toLowerCase();
      item.style.display = (!q || name.includes(q)) ? '' : 'none';
    });
  }

  function updateStats() {
    document.getElementById('statSites').textContent = sites.length;
    document.getElementById('statPoints').textContent = points.length;
  }

  /* ============================================================
     MODALE CREAZIONE / MODIFICA
  ============================================================ */
  const modalOverlay = document.getElementById('modalOverlay');
  const modalTitle = document.getElementById('modalTitle');
  const pointForm = document.getElementById('pointForm');
  const pointNameInput = document.getElementById('pointName');
  const pointNameField = document.getElementById('pointNameField');
  const siteSelect = document.getElementById('siteSelect');
  const siteSelectField = document.getElementById('siteSelectField');
  const newSiteFields = document.getElementById('newSiteFields');
  const newSiteNameInput = document.getElementById('newSiteName');
  const colorSwatchGrid = document.getElementById('colorSwatchGrid');
  const pointNotesInput = document.getElementById('pointNotes');
  const coordReadout = document.getElementById('coordReadout');
  const deleteFromModalBtn = document.getElementById('deleteFromModalBtn');

  colorSwatchGrid.innerHTML = PALETTE.map(c =>
    `<div class="swatch" style="background:${c}" data-color="${c}"></div>`
  ).join('');
  colorSwatchGrid.querySelectorAll('.swatch').forEach(sw => {
    sw.addEventListener('click', () => {
      selectedNewColor = sw.dataset.color;
      colorSwatchGrid.querySelectorAll('.swatch').forEach(s => s.classList.remove('selected'));
      sw.classList.add('selected');
    });
  });

  function refreshSiteSelectOptions(selectedId) {
    siteSelect.innerHTML = '<option value="__new__">➕ Crea nuovo sito...</option>' +
      getSitesSortedAlphabetically().map(s => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('');
    siteSelect.value = selectedId || '__new__';
    toggleNewSiteFields();
  }

  /* Alterna la visibilità dei campi in base alla scelta del sito:
     - "Crea nuovo sito" → mostra i campi del nuovo sito, nasconde "Nome dell'elemento"
     - sito esistente → nasconde i campi del nuovo sito, mostra "Nome dell'elemento" */
  function toggleNewSiteFields() {
    const isNew = siteSelect.value === '__new__';
    newSiteFields.style.display = isNew ? 'block' : 'none';
    pointNameField.style.display = isNew ? 'none' : 'block';
    if (isNew) {
      const first = colorSwatchGrid.querySelector('.swatch');
      colorSwatchGrid.querySelectorAll('.swatch').forEach(s => s.classList.remove('selected'));
      if (first) { first.classList.add('selected'); selectedNewColor = first.dataset.color; }
    }
  }
  siteSelect.addEventListener('change', toggleNewSiteFields);

  function openModal() { modalOverlay.classList.add('open'); pointNameInput.focus(); }
  function closeModal() {
    modalOverlay.classList.remove('open');
    pointForm.reset();
    editingPointId = null;
    pendingLatLng = null;
  }

  function openCreateModal(latlng) {
    editingPointId = null;
    pendingLatLng = latlng;
    modalTitle.textContent = 'Nuovo elemento';
    pointNameInput.value = '';
    pointNotesInput.value = '';
    siteSelectField.style.display = 'block';
    refreshSiteSelectOptions(sites.length ? sites[sites.length - 1].id : '__new__');
    if (sites.length === 0) refreshSiteSelectOptions('__new__');
    newSiteNameInput.value = '';
    deleteFromModalBtn.style.display = 'none';
    coordReadout.textContent = `Coordinate: ${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}`;
    openModal();
  }

  function openEditModal(point) {
    editingPointId = point.id;
    pendingLatLng = { lat: point.lat, lng: point.lng };
    modalTitle.textContent = 'Modifica elemento';
    pointNotesInput.value = point.notes || '';
    deleteFromModalBtn.style.display = 'block';
    coordReadout.textContent = `Coordinate: ${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`;

    if (point.importance === 'principale') {
      /* Il punto principale coincide con il sito stesso: si modificano nome e colore
         del sito. La selezione del sito viene nascosta e non può essere trasformato
         in un elemento secondario. */
      const site = getSite(point.siteId);
      siteSelect.innerHTML = `<option value="${site.id}">${escapeHtml(site.name)}</option>`;
      siteSelect.value = site.id;
      siteSelectField.style.display = 'none';
      pointNameField.style.display = 'none';
      newSiteFields.style.display = 'block';
      newSiteNameInput.value = site.name;
      selectedNewColor = site.color;
      colorSwatchGrid.querySelectorAll('.swatch').forEach(s => {
        s.classList.toggle('selected', s.dataset.color === site.color);
      });
    } else {
      /* Elemento secondario: si può rinominare e riassegnare a un sito diverso
         (o trasformarlo nell'ancora di un nuovo sito, se lo si desidera). */
      pointNameInput.value = point.name;
      siteSelectField.style.display = 'block';
      refreshSiteSelectOptions(point.siteId);
    }

    openModal();
  }

  pointForm.addEventListener('submit', e => {
    e.preventDefault();
    const notes = pointNotesInput.value.trim();
    const existingPoint = editingPointId ? points.find(p => p.id === editingPointId) : null;
    const isEditingPrincipale = !!existingPoint && existingPoint.importance === 'principale';

    if (isEditingPrincipale) {
      /* Il punto è l'ancora del sito: si aggiornano nome e colore del sito stesso */
      const newName = newSiteNameInput.value.trim();
      if (!newName) { alert('Inserisci un nome per il sito.'); return; }
      const site = getSite(existingPoint.siteId);
      site.name = newName;
      site.color = selectedNewColor;
      existingPoint.name = newName;
      existingPoint.notes = notes;
    } else {
      let siteId = siteSelect.value;
      let name, importance;

      if (siteId === '__new__') {
        const newName = newSiteNameInput.value.trim();
        if (!newName) { alert('Inserisci un nome per il nuovo sito.'); return; }
        const newSite = { id: uid(), name: newName, color: selectedNewColor, visible: true };
        sites.push(newSite);
        siteId = newSite.id;
        name = newName;
        importance = 'principale';
      } else {
        name = pointNameInput.value.trim();
        if (!name) return;
        importance = 'secondario';
      }

      if (existingPoint) {
        existingPoint.name = name;
        existingPoint.siteId = siteId;
        existingPoint.importance = importance;
        existingPoint.notes = notes;
      } else {
        points.push({
          id: uid(), name, siteId, importance, notes,
          lat: pendingLatLng.lat, lng: pendingLatLng.lng
        });
      }
    }

    saveState();
    renderSiteList();
    renderAllMarkers();
    updateStats();
    closeModal();
  });

  deleteFromModalBtn.addEventListener('click', () => {
    if (!editingPointId) return;
    if (!confirm('Eliminare definitivamente questo elemento?')) return;
    points = points.filter(p => p.id !== editingPointId);
    saveState();
    renderSiteList();
    renderAllMarkers();
    updateStats();
    closeModal();
  });

  document.getElementById('modalCloseBtn').addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && modalOverlay.classList.contains('open')) closeModal(); });

  /* ============================================================
     INTERAZIONE MAPPA
  ============================================================ */
  map.on('click', e => {
    if (modalOverlay.classList.contains('open')) return;
    openCreateModal(e.latlng);
  });

  /* funzioni globali richiamate dai popup Leaflet (onclick inline) */
  window.__app = {
    editPoint: function (id) {
      map.closePopup();
      const point = points.find(p => p.id === id);
      if (point) openEditModal(point);
    },
    deletePoint: function (id) {
      if (!confirm('Eliminare definitivamente questo elemento?')) return;
      points = points.filter(p => p.id !== id);
      map.closePopup();
      saveState();
      renderSiteList();
      renderAllMarkers();
      updateStats();
    }
  };

  /* ============================================================
     TOGGLE STUDIO / FILTRI
  ============================================================ */
  document.getElementById('hideTooltipsToggle').addEventListener('change', e => {
    hideTooltips = e.target.checked;
    saveState();
    renderAllMarkers();
  });
  document.getElementById('showSecondaryToggle').addEventListener('change', e => {
    showSecondary = e.target.checked;
    saveState();
    renderAllMarkers();
  });

  /* ============================================================
     RICERCA SITI & BATCH ACTIONS
  ============================================================ */
  document.getElementById('siteSearchInput').addEventListener('input', applySiteSearchFilter);

  document.getElementById('showAllSitesBtn').addEventListener('click', () => {
    if (sites.length === 0) return;
    sites.forEach(s => { s.visible = true; });
    saveState();
    renderSiteList();
    renderAllMarkers();
  });
  document.getElementById('hideAllSitesBtn').addEventListener('click', () => {
    if (sites.length === 0) return;
    sites.forEach(s => { s.visible = false; });
    saveState();
    renderSiteList();
    renderAllMarkers();
  });

  /* ============================================================
     SIDEBAR — collapse
  ============================================================ */
  const sidebar = document.getElementById('sidebar');
  const reopenBtn = document.getElementById('reopenBtn');
  document.getElementById('collapseBtn').addEventListener('click', () => {
    sidebar.classList.add('collapsed');
    reopenBtn.classList.add('visible');
    setTimeout(() => map.invalidateSize(), 260);
  });
  reopenBtn.addEventListener('click', () => {
    sidebar.classList.remove('collapsed');
    reopenBtn.classList.remove('visible');
    setTimeout(() => map.invalidateSize(), 260);
  });

  /* ============================================================
     EXPORT / IMPORT / RESET
  ============================================================ */
  document.getElementById('exportBtn').addEventListener('click', exportJSON);
  document.getElementById('importBtn').addEventListener('click', () => document.getElementById('importFile').click());
  document.getElementById('importFile').addEventListener('change', e => {
    const file = e.target.files[0];
    if (file) importJSONFile(file);
    e.target.value = '';
  });
  document.getElementById('resetBtn').addEventListener('click', () => {
    if (!confirm('Questa azione eliminerà definitivamente tutti i siti e gli elementi. Continuare?')) return;
    sites = [];
    points = [];
    saveState();
    renderSiteList();
    renderAllMarkers();
    updateStats();
  });

  /* ============================================================
     BOOTSTRAP
  ============================================================ */
  loadState();
  applyUIState();
  renderSiteList();
  renderAllMarkers();
  updateStats();

})();
