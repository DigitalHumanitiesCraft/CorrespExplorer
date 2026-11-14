// Space-time view: the sending places lie on a ground plane by their coordinates, time is the
// height, and every place is a column over the years with one mark per year, its area by the
// number of letters. From above it reads as a map, from the front as a timeline per place.
// Own orthographic projection without a library, after the space view of a sibling project:
// three snapping views (oblique as start, front, top), free rotation by drag and arrow keys,
// zoom, reset, depth fade, no transparency cube, no running animation, no WebGL.
// The scene is painted on a 2D canvas, because some thousand SVG elements rebuilt per frame made
// rotation slow; axis and place names stay SVG text above it, and the pointer is matched to
// columns by geometry.

import { escapeHtml, foldText, isMultiYearSpan, placeKey, prefersReducedMotion } from '../utils.js';
import { state } from '../state-manager.js';
import { LANGUAGE_COLORS, NO_LANGUAGE, isRestLanguage, languageLabel } from '../constants.js';

export const CAMERAS = {
    schraeg: { yaw: -0.55, pitch: 0.62 },
    front: { yaw: 0, pitch: 0 },
    oben: { yaw: 0, pitch: Math.PI / 2 }
};
const ZOOM_MIN = 0.6;
const ZOOM_MAX = 6;
// Height of the time axis relative to the ground plane, whose larger side spans 2
const HEIGHT_HALF = 0.65;
// Below this width the figure shows only the top view: rotating a small figure with a thumb
// hides more than it shows (brief of the view, narrow screens)
const NARROW_QUERY = '(max-width: 759px)';
const LABEL_COUNT = 24;
// Only the busiest places get the faint line from the ground up to their first year; drawn for
// every place these lines turn the figure into a texture
const LEAD_COUNT = 60;
const TAU = Math.PI * 2;
// Country outlines of Natural Earth (public domain), see vendor/natural-earth/PROVENANCE.md
const LAND_URL = 'vendor/natural-earth/countries-110m.geo.json';

let deps = {};
let cam = { ...CAMERAS.schraeg, zoom: 1, panX: 0, panY: 0 };
let bound = false;
let model = null;
// Year picked with a mark or the year list of the chosen place (state.filters.year), or null
let pickedYear = null;
// Whether the last drawing was forced to the top view by a period of one year
let wasFlat = false;
// Place under the pointer or focused in the list, drawn emphasised
let hoverPlace = null;
let hoverYear = null;
// Colours of the scene, read from the design tokens: a canvas cannot use the stylesheet
let ink = null;
// Rings of the country outlines as [lon, lat] pairs, null until loaded; the figure works without
let land = null;
let landRequested = false;
// Screen positions of the last drawing, for matching the pointer
let hitMarks = [];
let hitColumns = [];
// While dragging or easing the camera, hit targets and labels are left out for speed
let moving = false;
let frame = 0;
let lastScreen = null;
const groundCache = { letters: null, layout: null, land: null, maxCount: 0, maxTotal: 0 };
// What the reader typed into the search of the place list
let placeQuery = '';

/**
 * Letters per sending place and year, each year with its most frequent language. Letters without a year (or only a span over several years,
 * or an implausible year) and letters without coordinates are counted, not drawn.
 * @param {Array} letters
 * @param {Object} placesIndex - dataIndices.places, the fallback for coordinates
 * @returns {{places: Array, drawn: number, withoutYear: number, withoutCoords: number, yearMin: number|null, yearMax: number|null, maxCount: number, maxTotal: number}}
 */
export function aggregatePlaceYears(letters, placesIndex = {}) {
    const byPlace = new Map();
    let drawn = 0;
    let withoutYear = 0;
    let withoutCoords = 0;
    let yearMin = Infinity;
    let yearMax = -Infinity;
    for (const letter of letters) {
        const year = letter.year;
        if (!Number.isInteger(year) || year < 1400 || year > 2100 || isMultiYearSpan(letter)) {
            withoutYear++;
            continue;
        }
        const key = placeKey(letter.place_sent);
        let lat = letter.place_sent?.lat;
        let lon = letter.place_sent?.lon;
        if (key && !(Number.isFinite(lat) && Number.isFinite(lon))) {
            lat = placesIndex[key]?.lat;
            lon = placesIndex[key]?.lon;
        }
        lat = Number(lat);
        lon = Number(lon);
        if (!key || !Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
            withoutCoords++;
            continue;
        }
        let place = byPlace.get(key);
        if (!place) {
            place = { id: key, name: letter.place_sent.name || key, lat, lon, total: 0, counts: new Map(), langs: new Map(), allLangs: new Map() };
            byPlace.set(key, place);
        }
        place.total++;
        place.counts.set(year, (place.counts.get(year) || 0) + 1);
        const lang = letter.language?.code || NO_LANGUAGE;
        if (!place.langs.has(year)) place.langs.set(year, new Map());
        place.langs.get(year).set(lang, (place.langs.get(year).get(lang) || 0) + 1);
        place.allLangs.set(lang, (place.allLangs.get(lang) || 0) + 1);
        drawn++;
        if (year < yearMin) yearMin = year;
        if (year > yearMax) yearMax = year;
    }
    let maxCount = 0;
    let maxTotal = 0;
    const places = [...byPlace.values()].map(place => {
        // The most frequent language of a year and of the place; a tie goes to the code first in the alphabet
        const leading = counts => [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
        const years = [...place.counts.entries()].sort((a, b) => a[0] - b[0])
            .map(([year, count]) => ({ year, count, lang: leading(place.langs.get(year)) }));
        for (const y of years) maxCount = Math.max(maxCount, y.count);
        maxTotal = Math.max(maxTotal, place.total);
        return { id: place.id, name: place.name, lat: place.lat, lon: place.lon, total: place.total, lang: leading(place.allLangs), years };
    }).sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, 'de'));
    return {
        places, drawn, withoutYear, withoutCoords,
        yearMin: drawn ? yearMin : null,
        yearMax: drawn ? yearMax : null,
        maxCount, maxTotal
    };
}

// Value below which the given share of the total weight lies
function weightedQuantile(items, value, share) {
    const sorted = [...items].sort((a, b) => value(a) - value(b));
    const total = sorted.reduce((sum, item) => sum + item.total, 0);
    let acc = 0;
    for (const item of sorted) {
        acc += item.total;
        if (acc >= share * total) return value(item);
    }
    return value(sorted[sorted.length - 1]);
}

/**
 * Ground plane of the places: an equirectangular projection of their bounding box, scaled so the
 * larger side spans -1 to 1. When a few distant places would shrink the bulk of the letters into
 * a corner (a correspondence centred in Europe with single letters from overseas), the frame
 * follows the places that hold 96 percent of the letters on each axis, and the rest stand at the
 * edge of the frame in their direction, flagged as outside.
 * @param {Array<{lat: number, lon: number, total: number}>} places
 * @returns {{ax: number, az: number, toGround: function(number, number): {x: number, z: number, outside: boolean}, latMin: number, latMax: number, lonMin: number, lonMax: number}}
 */
export function groundLayout(places) {
    const extent = list => ({
        latMin: Math.min(...list.map(p => p.lat)), latMax: Math.max(...list.map(p => p.lat)),
        lonMin: Math.min(...list.map(p => p.lon)), lonMax: Math.max(...list.map(p => p.lon))
    });
    const area = e => Math.max(e.latMax - e.latMin, 0.5) * Math.max(e.lonMax - e.lonMin, 0.5);
    let box = places.length ? extent(places) : { latMin: -1, latMax: 1, lonMin: -1, lonMax: 1 };
    if (places.length > 2) {
        const lat = [weightedQuantile(places, p => p.lat, 0.02), weightedQuantile(places, p => p.lat, 0.98)];
        const lon = [weightedQuantile(places, p => p.lon, 0.02), weightedQuantile(places, p => p.lon, 0.98)];
        const core = places.filter(p => p.lat >= lat[0] && p.lat <= lat[1] && p.lon >= lon[0] && p.lon <= lon[1]);
        if (core.length && area(box) > 4 * area(extent(core))) box = extent(core);
    }
    // A margin around the places, at least half a degree, so a single place has a plane
    const padLat = Math.max((box.latMax - box.latMin) * 0.06, 0.5);
    const padLon = Math.max((box.lonMax - box.lonMin) * 0.06, 0.5);
    const latMin = box.latMin - padLat;
    const latMax = box.latMax + padLat;
    const lonMin = box.lonMin - padLon;
    const lonMax = box.lonMax + padLon;
    const latMid = (latMin + latMax) / 2;
    const lonMid = (lonMin + lonMax) / 2;
    const k = Math.cos((latMid * Math.PI) / 180);
    const width = (lonMax - lonMin) * k;
    const depth = latMax - latMin;
    const half = Math.max(width, depth) / 2;
    const ax = width / 2 / half;
    const az = depth / 2 / half;
    // North lies away from the reader: z grows towards the south
    const raw = (latValue, lonValue) => ({ x: ((lonValue - lonMid) * k) / half, z: -(latValue - latMid) / half });
    const toGround = (latValue, lonValue) => {
        const { x, z } = raw(latValue, lonValue);
        const cx = Math.max(-ax, Math.min(ax, x));
        const cz = Math.max(-az, Math.min(az, z));
        return { x: cx, z: cz, outside: cx !== x || cz !== z };
    };
    return { ax, az, toGround, raw, latMin, latMax, lonMin, lonMax };
}

/**
 * Orthographic projection in unit coordinates: yaw turns about the vertical axis, pitch tilts
 * towards the top view. y grows downwards as on screen; a larger depth is nearer to the reader.
 */
export function projectPoint(x, z, h, { yaw, pitch }) {
    const cy = Math.cos(yaw);
    const sy = Math.sin(yaw);
    const cp = Math.cos(pitch);
    const sp = Math.sin(pitch);
    const xr = x * cy - z * sy;
    const zr = x * sy + z * cy;
    return { x: xr, y: -h * cp + zr * sp, depth: zr * cp + h * sp };
}

/**
 * Scale and centre that fit the box of ground plane and time axis into the figure, so the figure
 * fills its area in every view. Zoom and pan act on top of the fit.
 */
export function fitBox(ax, az, cameraState, width, height, margin) {
    const xs = [];
    const ys = [];
    for (const x of [-ax, ax]) for (const z of [-az, az]) for (const h of [-HEIGHT_HALF, HEIGHT_HALF]) {
        const p = projectPoint(x, z, h, cameraState);
        xs.push(p.x);
        ys.push(p.y);
    }
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const scale = Math.min((width - margin.left - margin.right) / Math.max(maxX - minX, 1e-6),
        (height - margin.top - margin.bottom) / Math.max(maxY - minY, 1e-6));
    return {
        scale,
        cx: (minX + maxX) / 2,
        cy: (minY + maxY) / 2,
        screenX: margin.left + (width - margin.left - margin.right) / 2,
        screenY: margin.top + (height - margin.top - margin.bottom) / 2
    };
}

// A round step for axis ticks: at most about `count` ticks over the span
export function niceStep(span, count) {
    for (const step of [0.5, 1, 2, 5, 10, 15, 20, 25, 30, 50, 100]) {
        if (span / step <= count) return step;
    }
    return 100;
}

/**
 * @param {Object} dependencies
 * @param {Function} dependencies.getDataIndices
 * @param {Function} dependencies.togglePlace - sets or releases the place filter
 * @param {Function} dependencies.showLettersOfPlaceYear - selects one place in one year and opens its letters
 * @param {Function} dependencies.pickYear - picks one year of the selection or releases it (null)
 */
export function initSpacetimeView(dependencies) {
    deps = dependencies;
}

const el = id => document.getElementById(id);
const fmt = n => n.toLocaleString('de-DE');
const plural = (n, one, many) => `${fmt(n)} ${n === 1 ? one : many}`;
const isNarrow = () => window.matchMedia?.(NARROW_QUERY).matches ?? false;
// A period of one year leaves the time axis without extent, an oblique figure would be a flat sliver
const isOneYear = () => Boolean(model && model.drawn > 0 && model.yearMin === model.yearMax);
// The figure shows only the top view: on narrow screens and for a period of one year
const isFlat = () => isNarrow() || isOneYear();

// The view draws the letters of all filters except the place and the year picked in it: a chosen
// place stands out among the others instead of leaving the figure alone with one column, and a
// picked year is a level through the figure instead of flattening its time axis. The period of the
// sidebar does narrow the figure.
function lettersBesidePick() {
    return state.filterLetters({ ...state.filters, place: null, year: null });
}

export function renderSpacetime() {
    const svg = el('spacetime-figure');
    if (!svg) return;
    bind();
    const placesIndex = deps.getDataIndices?.().places || {};
    const agg = aggregatePlaceYears(lettersBesidePick(), placesIndex);
    // The plane comes from the whole dataset, so the geography stays put while filters change
    const all = state.getAllLetters();
    if (groundCache.letters !== all) {
        groundCache.letters = all;
        const whole = aggregatePlaceYears(all, placesIndex);
        groundCache.layout = groundLayout(whole.places);
        groundCache.land = null;
        // Widths and rings are scaled to the whole dataset, so the same width means the same
        // number of letters under every filter
        groundCache.maxCount = whole.maxCount;
        groundCache.maxTotal = whole.maxTotal;
    }
    readInk();
    loadLand();
    const ground = groundCache.layout;
    model = { ...agg, ground, selected: state.filters.place || null, maxCount: groundCache.maxCount || agg.maxCount, maxTotal: groundCache.maxTotal || agg.maxTotal };
    for (const place of model.places) Object.assign(place, ground.toGround(place.lat, place.lon));
    pickedYear = state.filters.year ?? null;
    // A period of one year has no height to show; the figure then is the map from above
    const flat = isFlat();
    if (flat) Object.assign(cam, CAMERAS.oben);
    else if (wasFlat) Object.assign(cam, CAMERAS.schraeg, { panX: 0, panY: 0 });
    wasFlat = flat;
    renderList();
    renderNote();
    renderLegend();
    syncCameraButtons();
    draw();
}

function yearToHeight(year) {
    const { yearMin, yearMax } = model;
    if (yearMin === yearMax) return 0;
    return ((year - yearMin) / (yearMax - yearMin) - 0.5) * 2 * HEIGHT_HALF;
}

// Screen projection of the current camera for the current size of the figure
function screenProjection(width, height) {
    // The left margin carries the year labels, which the top view does not show
    const margin = { left: 16 + 36 * Math.min(1, Math.cos(cam.pitch) / 0.3), right: 16, top: 20, bottom: 24 };
    const fit = fitBox(model.ground.ax, model.ground.az, cam, width, height, margin);
    const scale = fit.scale * cam.zoom;
    return {
        scale,
        at(x, z, h) {
            const p = projectPoint(x, z, h, cam);
            return { X: fit.screenX + (p.x - fit.cx) * scale + cam.panX, Y: fit.screenY + (p.y - fit.cy) * scale + cam.panY, depth: p.depth };
        }
    };
}

function readInk() {
    const css = getComputedStyle(el('spacetime-figure'));
    const token = name => css.getPropertyValue(name).trim();
    ink = {
        sea: token('--color-bg-light'), land: token('--color-bg'), frame: token('--color-border-control'),
        line: token('--color-border-light'), stem: token('--color-text-light'), chosen: token('--color-primary'),
        text: token('--color-text')
    };
}

// Colour of a language as in the sidebar and the start view: the most frequent languages of the
// dataset carry a colour, all others share one grey
function languageInk(code) {
    if (code !== NO_LANGUAGE && isRestLanguage(code)) return LANGUAGE_COLORS.other;
    return LANGUAGE_COLORS[code] || LANGUAGE_COLORS.other;
}

// The outlines are fetched once from the vendored file; a failure leaves the plain plane
function loadLand() {
    if (landRequested) return;
    landRequested = true;
    fetch(LAND_URL).then(r => (r.ok ? r.json() : null)).then(geo => {
        if (!geo?.features) return;
        const rings = [];
        for (const feature of geo.features) {
            const g = feature.geometry;
            const polygons = g?.type === 'Polygon' ? [g.coordinates] : g?.type === 'MultiPolygon' ? g.coordinates : [];
            for (const polygon of polygons) if (polygon[0]?.length > 2) rings.push(polygon[0]);
        }
        land = rings;
        groundCache.land = null;
        if (model && el('spacetime-view')?.classList.contains('active')) draw();
    }).catch(() => {});
}

// Outer rings that touch the frame, in ground coordinates; computed once per plane
function landOnGround(ground) {
    if (!land) return [];
    if (groundCache.land) return groundCache.land;
    const { latMin, latMax, lonMin, lonMax, raw } = ground;
    const kept = [];
    for (const ring of land) {
        let west = Infinity, east = -Infinity, south = Infinity, north = -Infinity;
        for (const [lon, lat] of ring) {
            if (lon < west) west = lon;
            if (lon > east) east = lon;
            if (lat < south) south = lat;
            if (lat > north) north = lat;
        }
        if (east < lonMin || west > lonMax || north < latMin || south > latMax) continue;
        kept.push(ring.map(([lon, lat]) => raw(lat, lon)));
    }
    groundCache.land = kept;
    return kept;
}

function draw() {
    const svg = el('spacetime-figure');
    const canvas = el('spacetime-canvas');
    const width = svg.clientWidth;
    const height = svg.clientHeight;
    if (!width || !height || !model || !canvas || !ink) return;
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
    }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    hitMarks = [];
    hitColumns = [];
    if (model.drawn === 0) {
        svg.innerHTML = '';
        lastScreen = null;
        return;
    }
    const pr = screenProjection(width, height);
    lastScreen = pr;
    const { ax, az } = model.ground;
    const h0 = yearToHeight(model.yearMin);
    const h1 = yearToHeight(model.yearMax);
    const sinPitch = Math.sin(cam.pitch);
    const cosPitch = Math.cos(cam.pitch);
    const overlay = [];
    const segment = (a, b) => { ctx.moveTo(a.X, a.Y); ctx.lineTo(b.X, b.Y); };
    const outline = (h) => {
        ctx.beginPath();
        [[-ax, -az], [ax, -az], [ax, az], [-ax, az]].forEach(([x, z], i) => {
            const q = pr.at(x, z, h);
            if (i) ctx.lineTo(q.X, q.Y); else ctx.moveTo(q.X, q.Y);
        });
        ctx.closePath();
    };

    // Ground plane: the sea in the tone of the plane, the land lighter with its outlines, clipped
    // to the frame, and a graticule above both
    ctx.lineWidth = 1;
    outline(h0);
    ctx.fillStyle = ink.sea;
    ctx.fill();
    const rings = landOnGround(model.ground);
    if (rings.length) {
        ctx.save();
        outline(h0);
        ctx.clip();
        ctx.beginPath();
        for (const ring of rings) {
            ring.forEach((p, i) => {
                const q = pr.at(p.x, p.z, h0);
                if (i) ctx.lineTo(q.X, q.Y); else ctx.moveTo(q.X, q.Y);
            });
            ctx.closePath();
        }
        ctx.fillStyle = ink.land;
        ctx.fill();
        ctx.strokeStyle = ink.frame;
        ctx.stroke();
        ctx.restore();
    }
    const { latMin, latMax, lonMin, lonMax, toGround } = model.ground;
    const step = niceStep(Math.max(latMax - latMin, lonMax - lonMin), 6);
    ctx.beginPath();
    for (let lon = Math.ceil(lonMin / step) * step; lon <= lonMax; lon += step) {
        const a = toGround(latMin, lon);
        const b = toGround(latMax, lon);
        segment(pr.at(a.x, a.z, h0), pr.at(b.x, b.z, h0));
    }
    for (let lat = Math.ceil(latMin / step) * step; lat <= latMax; lat += step) {
        const a = toGround(lat, lonMin);
        const b = toGround(lat, lonMax);
        segment(pr.at(a.x, a.z, h0), pr.at(b.x, b.z, h0));
    }
    ctx.strokeStyle = ink.line;
    ctx.globalAlpha = rings.length ? 0.5 : 1;
    ctx.stroke();
    ctx.globalAlpha = 1;
    outline(h0);
    ctx.strokeStyle = ink.frame;
    ctx.stroke();

    // Year lines along the back edge and the year axis on the front left corner; in the top view
    // time has no extent on screen, so they leave the figure
    const span = model.yearMax - model.yearMin;
    const yearStep = Math.max(1, niceStep(span, Math.max(3, Math.floor((pr.scale * 2 * HEIGHT_HALF * cosPitch) / 48))));
    const ticks = [];
    for (let y = Math.ceil(model.yearMin / yearStep) * yearStep; y <= model.yearMax; y += yearStep) ticks.push(y);
    if (!ticks.includes(model.yearMin)) ticks.unshift(model.yearMin);
    const upright = cosPitch > 0.2;
    if (upright) {
        // Year lines on the far edge of the plane, the axis on the corner furthest left on screen,
        // so its labels stand outside the columns in every rotation
        const groundCorners = [[-ax, -az], [ax, -az], [ax, az], [-ax, az]].map(([x, z]) => ({ x, z, ...pr.at(x, z, h0) }));
        const far = [...groundCorners].sort((a, b) => a.depth - b.depth).slice(0, 2);
        ctx.beginPath();
        for (const y of ticks) segment(pr.at(far[0].x, far[0].z, yearToHeight(y)), pr.at(far[1].x, far[1].z, yearToHeight(y)));
        ctx.strokeStyle = ink.line;
        ctx.stroke();
        const corner = groundCorners.reduce((best, c) => (c.X < best.X - 0.5 || (Math.abs(c.X - best.X) <= 0.5 && c.depth > best.depth) ? c : best));
        const a0 = pr.at(corner.x, corner.z, h0);
        const a1 = pr.at(corner.x, corner.z, h1);
        let axis = `<line class="st-axis" x1="${a0.X.toFixed(1)}" y1="${a0.Y.toFixed(1)}" x2="${a1.X.toFixed(1)}" y2="${a1.Y.toFixed(1)}"/>`;
        let lastY = Infinity;
        for (const y of ticks) {
            const q = pr.at(corner.x, corner.z, yearToHeight(y));
            if (Math.abs(lastY - q.Y) < 14) continue;
            lastY = q.Y;
            axis += `<line class="st-axis" x1="${(q.X - 4).toFixed(1)}" y1="${q.Y.toFixed(1)}" x2="${q.X.toFixed(1)}" y2="${q.Y.toFixed(1)}"/><text class="st-tick" x="${(q.X - 7).toFixed(1)}" y="${q.Y.toFixed(1)}" text-anchor="end" dominant-baseline="middle">${y}</text>`;
        }
        // The year under the pointer and the picked year as numbers where their level meets the
        // axis: read across the oblique figure, a mark lies years away from the tick beside it
        for (const [year, cls] of [[pickedYear, 'st-tick--picked'], [hoverYear, 'st-tick--hover']]) {
            if (year === null || year < model.yearMin || year > model.yearMax) continue;
            const q = pr.at(corner.x, corner.z, yearToHeight(year));
            axis += `<text class="st-tick ${cls}" x="${Math.max(34, q.X - 7).toFixed(1)}" y="${q.Y.toFixed(1)}" text-anchor="end" dominant-baseline="middle">${year}</text>`;
        }
        // The axis says what it measures, above its upper end
        // kept inside the figure where the axis stands at its left or upper edge
        axis += `<text class="st-axis-title" x="${Math.max(90, a1.X).toFixed(1)}" y="${Math.max(12, a1.Y - 12).toFixed(1)}" text-anchor="end">Jahr der Briefe</text>`;
        overlay.push(axis);
        // The year under the pointer as a level through the whole figure, so it reads against the axis
        if (hoverYear !== null) {
            outline(yearToHeight(hoverYear));
            ctx.strokeStyle = ink.text;
            ctx.globalAlpha = 0.35;
            ctx.stroke();
            ctx.globalAlpha = 1;
        }
        // The picked year stays as a level in the selection colour, so it reads against the axis
        // and the other columns while the pointer is elsewhere
        if (pickedYear !== null && pickedYear >= model.yearMin && pickedYear <= model.yearMax) {
            outline(yearToHeight(pickedYear));
            ctx.strokeStyle = ink.chosen;
            ctx.globalAlpha = 0.6;
            ctx.stroke();
            ctx.globalAlpha = 1;
        }
    }

    // Columns in painter's order, far first; the depth fade is normalised over the visible scene.
    // A column is one profile over the years whose width follows the letters of each year: single
    // discs per year overlapped into chains of beads in a busy place
    const rMax = Math.max(6, Math.min(16, pr.scale * 0.04));
    const halfWidth = count => Math.max(1.2, rMax * Math.sqrt(count / model.maxCount));
    const footMax = rMax * 1.9;
    const footRadius = total => Math.max(2, footMax * Math.sqrt(total / model.maxTotal));
    // Screen distance of one year, the cap above and below a profile
    const yearPx = span ? Math.abs(pr.at(0, 0, yearToHeight(model.yearMin + 1)).Y - pr.at(0, 0, yearToHeight(model.yearMin)).Y) : 0;
    const cap = Math.max(1.5, yearPx / 2);
    const columns = model.places.map((place, i) => ({ place, i, foot: pr.at(place.x, place.z, h0), depth: pr.at(place.x, place.z, (h0 + h1) / 2).depth }));
    let dMin = Infinity;
    let dMax = -Infinity;
    for (const c of columns) {
        if (c.depth < dMin) dMin = c.depth;
        if (c.depth > dMax) dMax = c.depth;
    }
    const fade = d => 0.58 + 0.42 * ((d - dMin) / (dMax - dMin || 1));
    columns.sort((a, b) => a.depth - b.depth);
    const hasSelection = Boolean(model.selected);
    const isEmphasised = place => place.id === model.selected || place.id === hoverPlace;

    const drawColumn = ({ place, i, foot, depth }) => {
        const selected = place.id === model.selected;
        const hovered = place.id === hoverPlace;
        const alpha = selected || hovered ? 1 : fade(depth) * (hasSelection ? 0.5 : 1);
        const X = foot.X;
        const points = place.years.map(({ year, count, lang }) => ({ year, lang, Y: pr.at(place.x, place.z, yearToHeight(year)).Y, w: halfWidth(count) }));
        const bottomY = points[0].Y;
        const topY = points[points.length - 1].Y;
        const ring = footRadius(place.total);
        ctx.lineWidth = selected ? 2 : 1;

        // Ring on the ground for all letters of the place, in the colour of its most frequent
        // language; from above it is filled, a bubble map. The chosen place carries the ring in
        // the selection colour
        ctx.strokeStyle = selected ? ink.chosen : languageInk(place.lang);
        ctx.fillStyle = languageInk(place.lang);
        ctx.beginPath();
        ctx.ellipse(X, foot.Y, ring, Math.max(0.6, ring * sinPitch), 0, 0, TAU);
        if (!upright) {
            ctx.globalAlpha = alpha * (place.outside ? 0 : 0.5);
            ctx.fill();
        }
        ctx.globalAlpha = alpha * (selected ? 1 : 0.7);
        ctx.stroke();
        if (!upright) {
            hitMarks.push({ i, year: null, X, Y: foot.Y, r: Math.max(5, ring), total: place.total });
            return;
        }

        ctx.lineWidth = 1;
        ctx.strokeStyle = selected ? ink.chosen : hovered ? ink.text : ink.stem;
        if (i < LEAD_COUNT || selected || hovered) {
            ctx.globalAlpha = alpha * (selected || hovered ? 0.6 : 0.16);
            ctx.beginPath();
            ctx.moveTo(X, foot.Y);
            ctx.lineTo(X, bottomY);
            ctx.stroke();
        }
        ctx.globalAlpha = alpha * (selected || hovered ? 1 : 0.4);
        ctx.beginPath();
        ctx.moveTo(X, bottomY);
        ctx.lineTo(X, topY);
        ctx.stroke();

        // The profile in slices, one per year in the colour of that year's most frequent language.
        // A slice reaches halfway to its neighbours; a gap in the years closes the profile to a tip
        ctx.globalAlpha = alpha * (place.outside ? 1 : 0.85);
        for (let k = 0; k < points.length; k++) {
            const p = points[k];
            const before = k > 0 && points[k - 1].year === p.year - 1 ? points[k - 1] : null;
            const after = k < points.length - 1 && points[k + 1].year === p.year + 1 ? points[k + 1] : null;
            const lower = before ? { Y: (before.Y + p.Y) / 2, w: (before.w + p.w) / 2 } : { Y: p.Y + cap, w: 0 };
            const upper = after ? { Y: (after.Y + p.Y) / 2, w: (after.w + p.w) / 2 } : { Y: p.Y - cap, w: 0 };
            ctx.beginPath();
            ctx.moveTo(X - lower.w, lower.Y);
            ctx.lineTo(X + lower.w, lower.Y);
            ctx.lineTo(X + p.w, p.Y);
            ctx.lineTo(X + upper.w, upper.Y);
            ctx.lineTo(X - upper.w, upper.Y);
            ctx.lineTo(X - p.w, p.Y);
            ctx.closePath();
            const colour = languageInk(p.lang);
            if (place.outside) {
                // A place outside the frame stands at its edge, hollow, so its position is not read as true
                ctx.fillStyle = ink.sea;
                ctx.fill();
                ctx.strokeStyle = colour;
                ctx.stroke();
            } else {
                ctx.fillStyle = colour;
                ctx.fill();
            }
            hitMarks.push({ i, year: p.year, X, Y: p.Y, r: Math.max(5, p.w), total: place.total });
        }
        if (selected && points.length > 1 && Math.abs(bottomY - topY) > 24) {
            overlay.push(`<text class="st-tick st-tick--picked" x="${(X + 10).toFixed(1)}" y="${bottomY.toFixed(1)}" dominant-baseline="middle">${points[0].year}</text>`
                + `<text class="st-tick st-tick--picked" x="${(X + 10).toFixed(1)}" y="${topY.toFixed(1)}" dominant-baseline="middle">${points[points.length - 1].year}</text>`);
        }
        if (selected && pickedYear !== null) {
            const picked = points.find(p => p.year === pickedYear);
            if (picked) {
                ctx.globalAlpha = 1;
                ctx.strokeStyle = ink.text;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(X - picked.w - 4, picked.Y);
                ctx.lineTo(X + picked.w + 4, picked.Y);
                ctx.stroke();
            }
        }
        hitColumns.push({ i, X, y0: Math.min(foot.Y, topY), y1: Math.max(foot.Y, topY), total: place.total });
    };
    for (const column of columns) if (!isEmphasised(column.place)) drawColumn(column);
    for (const column of columns) if (isEmphasised(column.place)) drawColumn(column);
    ctx.globalAlpha = 1;

    // Labels of the busiest places and the chosen one at the foot of their column, the first
    // label that would overlap an earlier one is left out
    const taken = [];
    const chosen = model.places.find(p => p.id === model.selected) || model.places.find(p => p.id === hoverPlace);
    // a place pinned to the edge carries no name there, which would read as its position
    const labelled = model.places.filter(p => !p.outside && p !== chosen).slice(0, LABEL_COUNT);
    if (chosen) labelled.unshift(chosen);
    let labels = '';
    for (const place of labelled) {
        const foot = pr.at(place.x, place.z, h0);
        const w = place.name.length * 7 + 6;
        const box = { x: foot.X + 5, y: foot.Y + 2, w, h: 15 };
        if (box.x + w > width) box.x = foot.X - 5 - w;
        const overlaps = taken.some(t => box.x < t.x + t.w && t.x < box.x + box.w && box.y < t.y + t.h && t.y < box.y + box.h);
        if (overlaps && place !== chosen) continue;
        taken.push(box);
        const cls = place.id === model.selected ? ' st-label--sel' : '';
        labels += `<text class="st-label${cls}" x="${(box.x + 2).toFixed(1)}" y="${(box.y + 11).toFixed(1)}">${escapeHtml(place.name)}</text>`;
    }
    overlay.push(labels);
    svg.innerHTML = `<title>${escapeHtml(figureTitle())}</title>${overlay.join('')}`;
}

/**
 * Column or year under a point of the figure. Where several marks lie under it, the one whose
 * centre is nearest in relation to its size wins: the middle of a small mark reaches it even inside
 * the reach of a large neighbour, and the body of a large mark stays its own. Until 2026-11-14 the
 * busiest place always won, so a place with few letters next to a busy one could not be picked.
 * @returns {{i: number, year: number|null}|null}
 */
function hitAt(mx, my) {
    let best = null;
    for (const m of hitMarks) {
        const d = Math.hypot(m.X - mx, m.Y - my);
        if (d > m.r) continue;
        const score = d / m.r;
        if (!best || score < best.score || (score === best.score && m.total > best.total)) best = { i: m.i, year: m.year, total: m.total, d, score };
    }
    if (best) return best;
    for (const c of hitColumns) {
        const d = Math.abs(c.X - mx);
        if (d > 4 || my < c.y0 - 2 || my > c.y1 + 2) continue;
        if (!best || c.total > best.total) best = { i: c.i, year: null, total: c.total, d };
    }
    return best;
}

/**
 * Screen position of a place, at one of its years or at its foot, in the last drawing. For
 * checks that drive the figure with a pointer.
 * @returns {{x: number, y: number}|null}
 */
export function screenPositionOf(placeId, year = null) {
    const place = model?.places.find(p => p.id === placeId);
    if (!place || !lastScreen) return null;
    const q = lastScreen.at(place.x, place.z, yearToHeight(year ?? place.years[place.years.length - 1].year));
    return { x: q.X, y: q.Y };
}

function figureTitle() {
    return `Raum-Zeit: ${plural(model.places.length, 'Ort', 'Orte')} nach Koordinaten, die Höhe ist das Jahr von ${model.yearMin} bis ${model.yearMax}`;
}

function renderNote() {
    const note = el('spacetime-note');
    if (!note || !model) return;
    const parts = [];
    if (model.drawn === 0) {
        parts.push('Die Auswahl enthält keinen Brief mit Jahr und Ort mit Koordinaten.');
    } else {
        const missing = model.withoutYear + model.withoutCoords;
        if (missing) parts.push(`${plural(missing, 'Brief', 'Briefe')} ohne Jahr oder ohne Ort mit Koordinaten ${missing === 1 ? 'fehlt' : 'fehlen'} in der Figur.`);
        const outside = model.places.filter(p => p.outside).length;
        if (outside) parts.push(`${plural(outside, 'Ort liegt', 'Orte liegen')} außerhalb des Ausschnitts und ${outside === 1 ? 'steht' : 'stehen'} hohl an seinem Rand.`);
        if (isOneYear()) parts.push(`Der Zeitraum umfasst nur das Jahr ${model.yearMin}, die Figur zeigt die Orte deshalb von oben.`);
        else if (isNarrow()) parts.push('Auf schmalen Bildschirmen zeigt die Figur die Orte von oben.');
    }
    note.textContent = parts.join(' ');
    note.classList.toggle('hidden', parts.length === 0);
}

// Size key: the widths of one, a middle and the largest count, and the ring at the foot
function renderLegend() {
    const legend = el('spacetime-legend');
    if (!legend || !model) return;
    if (model.drawn === 0) {
        legend.classList.add('hidden');
        return;
    }
    legend.classList.remove('hidden');
    const samples = [...new Set([1, Math.round(Math.sqrt(model.maxCount)), model.maxCount])].filter(n => n >= 1);
    const r = n => Math.max(1.6, 9 * Math.sqrt(n / model.maxCount));
    const marks = samples.map(n => `<span class="st-legend__item"><svg width="${Math.ceil(r(n) * 2 + 2)}" height="14" aria-hidden="true"><ellipse class="st-mark" cx="${(r(n) + 1).toFixed(1)}" cy="7" rx="${r(n).toFixed(1)}" ry="5"/></svg>${fmt(n)}</span>`).join('');
    legend.innerHTML = `<span class="st-legend__group">${marks}<span>Breite der Säule: Briefe in einem Jahr. Farbe: häufigste Sprache des Jahres</span></span>`
        + '<span class="st-legend__group"><svg width="20" height="12" aria-hidden="true"><ellipse class="st-foot" cx="10" cy="6" rx="8" ry="4"/></svg><span>Ring am Boden: alle Briefe des Orts</span></span>';
}

function renderList() {
    const list = el('spacetime-places');
    if (!list || !model) return;
    const focusedId = list.contains(document.activeElement) ? document.activeElement.dataset.place : null;
    const yearFocused = document.activeElement?.id === 'spacetime-year';
    const current = focusedId || model.selected || model.places[0]?.id;
    list.innerHTML = model.places.map((place, i) => {
        const selected = place.id === model.selected;
        return `<li><button type="button" class="st-place${selected ? ' st-place--sel' : ''}" data-place="${escapeHtml(place.id)}" data-p="${i}" aria-pressed="${selected}" tabindex="${place.id === current ? 0 : -1}">
            <span class="st-place__name">${escapeHtml(place.name)}</span><span class="st-place__count">${fmt(place.total)}</span>
        </button>${selected ? yearChoice(place) : ''}</li>`;
    }).join('');
    applyPlaceQuery();
    if (yearFocused) el('spacetime-year')?.focus();
    else if (focusedId) list.querySelector(`[data-place="${CSS.escape(focusedId)}"]`)?.focus();
}

// The years of the chosen place as a choice in its row of the place list: the keyboard route to
// the letters of one place in one year. Choosing narrows the selection; the drawer line says how
// many letters it holds and opens them.
function yearChoice(place) {
    const options = place.years.map(({ year, count }) => `<option value="${year}"${year === pickedYear ? ' selected' : ''}>${year}: ${plural(count, 'Brief', 'Briefe')}</option>`).join('');
    return `<label class="visually-hidden" for="spacetime-year">Jahr der Briefe aus ${escapeHtml(place.name)}</label>
        <select id="spacetime-year" class="st-place__year">
            <option value=""${pickedYear === null ? ' selected' : ''}>Alle Jahre</option>${options}
        </select>`;
}

// An angle brought back into one turn, -π to π
const wrapAngle = a => ((a + Math.PI) % TAU + TAU) % TAU - Math.PI;

function syncCameraButtons() {
    const narrow = isFlat();
    document.querySelectorAll('#spacetime-view [data-cam]').forEach(btn => {
        const target = CAMERAS[btn.dataset.cam];
        const pressed = Boolean(target) && Math.abs(wrapAngle(cam.yaw - target.yaw)) < 1e-3 && Math.abs(cam.pitch - target.pitch) < 1e-3;
        btn.setAttribute('aria-pressed', String(pressed));
    });
    el('spacetime-cams')?.classList.toggle('hidden', narrow);
    // A figure held to the top view does not turn, so the cue about turning it would mislead
    if (narrow) el('spacetime-hint')?.classList.add('hidden');
    // Narrow: zooming out to the start also resets the pan, so the reset button would only repeat it
    document.querySelector('#spacetime-view [data-action="reset"]')?.classList.toggle('hidden', narrow);
}

// Move the camera to a view; eased over a short time unless the reader asked for reduced motion
function moveCamera(target) {
    const from = { ...cam };
    const to = { ...cam, ...target };
    // Turn the shorter way round
    const turn = ((to.yaw - from.yaw + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
    to.yaw = from.yaw + turn;
    cancelAnimationFrame(frame);
    if (prefersReducedMotion()) {
        Object.assign(cam, to);
        moving = false;
        draw();
        syncCameraButtons();
        return;
    }
    const start = performance.now();
    const step = (now) => {
        const t = Math.min(1, (now - start) / 420);
        const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        for (const key of Object.keys(to)) cam[key] = from[key] + (to[key] - from[key]) * e;
        moving = t < 1;
        draw();
        if (t < 1) frame = requestAnimationFrame(step);
        else syncCameraButtons();
    };
    frame = requestAnimationFrame(step);
}

const clampPitch = p => Math.max(0, Math.min(Math.PI / 2, p));
const clampZoom = z => Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, z));

// Redraw at most once per frame while the pointer moves
function scheduleDraw() {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => draw());
}

// Zoom about a point of the figure, so the place under the pointer stays where it is
function zoomAt(factor, mx, my) {
    const svg = el('spacetime-figure');
    const next = clampZoom(cam.zoom * factor);
    const applied = next / cam.zoom;
    if (applied === 1) return;
    const cx = svg.clientWidth / 2;
    const cy = svg.clientHeight / 2;
    const px = mx ?? cx;
    const py = my ?? cy;
    // The fit centre plus pan is the fixed point of the zoom; keep (px, py) in place
    cam.panX = px - cx - (px - cx - cam.panX) * applied;
    cam.panY = py - cy - (py - cy - cam.panY) * applied;
    cam.zoom = next;
    // Back at the fitted size the figure is centred again
    if (next <= 1) {
        cam.panX = 0;
        cam.panY = 0;
    }
    draw();
}

function showTooltipAt(place, year) {
    if (!lastScreen || !model) return;
    const h = year === null ? yearToHeight(place.years[place.years.length - 1].year) : yearToHeight(year);
    const q = lastScreen.at(place.x, place.z, h);
    const count = year === null ? null : place.years.find(y => y.year === year)?.count;
    const first = place.years[0].year;
    const last = place.years[place.years.length - 1].year;
    const text = year === null
        ? `${place.name}: ${plural(place.total, 'Brief', 'Briefe')}, ${first === last ? first : `${first}–${last}`}`
        : `${place.name}, ${year}: ${plural(count || 0, 'Brief', 'Briefe')}, ${languageName(place.years.find(y => y.year === year)?.lang, count)}`;
    const tip = el('spacetime-tooltip');
    tip.textContent = text;
    tip.classList.remove('hidden');
    const svg = el('spacetime-figure');
    const maxX = svg.clientWidth - tip.offsetWidth - 4;
    tip.style.left = `${Math.max(4, Math.min(maxX, q.X + 12))}px`;
    tip.style.top = `${Math.max(4, q.Y - tip.offsetHeight - 8)}px`;
}

// "Französisch" for a single letter, "überwiegend Französisch" for several
function languageName(code, count) {
    const name = !code || code === NO_LANGUAGE ? 'ohne Sprachangabe' : languageLabel(code);
    return count > 1 && code && code !== NO_LANGUAGE ? `überwiegend ${name}` : name;
}

function hideTooltip() {
    el('spacetime-tooltip')?.classList.add('hidden');
}

function setHover(placeId, year = null) {
    if (hoverPlace === placeId && hoverYear === year) return;
    hoverPlace = placeId;
    hoverYear = year;
    draw();
}

// Release the picked year first, then the place: one step back per press
function releaseChoice() {
    if (!model?.selected) return;
    if (pickedYear !== null) deps.pickYear(null);
    else deps.togglePlace(model.selected);
}

// Rows of the place list that match what the reader typed, by folded name
function applyPlaceQuery() {
    const list = el('spacetime-places');
    if (!list) return;
    const query = foldText(placeQuery.trim());
    for (const item of list.children) {
        const name = item.querySelector('.st-place__name')?.textContent || '';
        item.classList.toggle('hidden', Boolean(query) && !foldText(name).includes(query));
    }
}

function bind() {
    if (bound) return;
    bound = true;
    const svg = el('spacetime-figure');
    // The canvas lies under the SVG, which keeps focus, pointer and the text
    const canvas = document.createElement('canvas');
    canvas.id = 'spacetime-canvas';
    canvas.className = 'st-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    svg.before(canvas);
    // A visible cue that the figure turns; it leaves once the reader has turned it
    const hint = document.createElement('p');
    hint.id = 'spacetime-hint';
    hint.className = 'st-hint';
    hint.innerHTML = '<i class="fas fa-sync-alt" aria-hidden="true"></i> Ziehen dreht, Umschalt und Ziehen verschiebt, Klick wählt den Ort';
    svg.after(hint);
    // What each view is for, on its button
    const purposes = { schraeg: 'Raum und Zeit zusammen', front: 'Zeit von vorn: Jahre waagrecht lesen', oben: 'Karte von oben: Orte finden' };
    document.querySelectorAll('#spacetime-view [data-cam]').forEach(btn => { btn.title = purposes[btn.dataset.cam] || ''; });
    // Zoom stands at the figure it acts on; in the header it made the line wrap as soon as a
    // choice lengthened the title, and the figure jumped under the pointer
    const zoom = document.querySelector('#spacetime-controls [aria-label="Zoom"]');
    if (zoom) {
        zoom.classList.add('st-zoom');
        svg.after(zoom);
    }
    // A place known by name is found by typing it; the list alone holds hundreds of rows
    const places = el('spacetime-places');
    if (places) {
        const search = document.createElement('input');
        search.type = 'search';
        search.id = 'spacetime-search';
        search.className = 'st-search';
        search.placeholder = 'Ort suchen';
        search.setAttribute('aria-label', 'Ort suchen');
        places.before(search);
        search.addEventListener('input', () => { placeQuery = search.value; applyPlaceQuery(); });
        search.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter') return;
            const first = places.querySelector('li:not(.hidden) .st-place');
            if (first) {
                deps.togglePlace(first.dataset.place);
                el('spacetime-figure').scrollIntoView({ block: 'nearest' });
            }
        });
    }
    const under = (e) => {
        const rect = svg.getBoundingClientRect();
        return hitAt(e.clientX - rect.left, e.clientY - rect.top);
    };
    let drag = null;

    // The press is read from pointerdown and acted on at pointerup: a redraw in between (focus
    // leaving the place list, hover) replaces the elements, so a click event could lose its target
    svg.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        const hit = under(e);
        drag = {
            x: e.clientX, y: e.clientY, moved: false, pan: e.shiftKey || isFlat(),
            place: hit ? hit.i : null,
            year: hit ? hit.year : null
        };
    });
    svg.addEventListener('pointermove', (e) => {
        if (drag) {
            const dx = e.clientX - drag.x;
            const dy = e.clientY - drag.y;
            if (!drag.moved && Math.hypot(dx, dy) < 4) return;
            // Capture only once the pointer really drags; capturing on pointerdown would retarget
            // the click of a plain press to the figure and lose the column or mark under it
            if (!drag.moved) svg.setPointerCapture(e.pointerId);
            drag.moved = true;
            drag.x = e.clientX;
            drag.y = e.clientY;
            if (drag.pan) {
                cam.panX += dx;
                cam.panY += dy;
            } else {
                cam.yaw += dx * 0.01;
                cam.pitch = clampPitch(cam.pitch + dy * 0.01);
                el('spacetime-hint')?.classList.add('hidden');
            }
            moving = true;
            hideTooltip();
            scheduleDraw();
            return;
        }
        const hit = model ? under(e) : null;
        svg.classList.toggle('st-over', Boolean(hit));
        if (!hit) {
            if (hoverPlace) { setHover(null); hideTooltip(); }
            return;
        }
        const place = model.places[hit.i];
        setHover(place.id, hit.year);
        showTooltipAt(place, hit.year);
    });
    const endDrag = (e) => {
        if (!drag) return;
        const press = drag;
        drag = null;
        if (moving) {
            moving = false;
            draw();
            syncCameraButtons();
        }
        if (e.type !== 'pointerup' || press.moved) return;
        if (press.place === null) {
            releaseChoice();
            return;
        }
        const place = model.places[press.place];
        if (!place) return;
        // The first click chooses the place, whatever part of its column it hits; in the chosen
        // column a click on a year picks that year and opens its letters. Picking place and year
        // in one click made a miss in a dense area change both at once
        if (place.id !== model.selected) deps.togglePlace(place.id);
        else if (press.year !== null) deps.showLettersOfPlaceYear(place.id, press.year);
        else deps.togglePlace(place.id);
    };
    svg.addEventListener('pointerup', endDrag);
    svg.addEventListener('pointercancel', endDrag);
    svg.addEventListener('pointerleave', () => {
        if (!drag && hoverPlace) { setHover(null); hideTooltip(); }
    });
    svg.addEventListener('wheel', (e) => {
        e.preventDefault();
        const rect = svg.getBoundingClientRect();
        zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX - rect.left, e.clientY - rect.top);
    }, { passive: false });
    svg.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && model?.selected) {
            e.preventDefault();
            releaseChoice();
            return;
        }
        const step = 0.15;
        const turn = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] }[e.key];
        if (turn) {
            e.preventDefault();
            if (e.shiftKey || isFlat()) {
                cam.panX -= turn[0] * 200;
                cam.panY += turn[1] * 200;
            } else {
                cam.yaw += turn[0];
                cam.pitch = clampPitch(cam.pitch + turn[1]);
            }
            draw();
            syncCameraButtons();
        } else if (e.key === '+' || e.key === '=' || e.key === '-') {
            e.preventDefault();
            zoomAt(e.key === '-' ? 0.8 : 1.25);
        }
    });

    el('spacetime-view')?.addEventListener('click', (e) => {
        if (!e.target.closest('#spacetime-controls, .st-zoom')) return;
        const btn = e.target.closest('button');
        if (!btn) return;
        if (btn.dataset.zoom) zoomAt(Number(btn.dataset.zoom));
        else if (btn.dataset.action === 'reset') moveCamera({ ...(isFlat() ? CAMERAS.oben : CAMERAS.schraeg), zoom: 1, panX: 0, panY: 0 });
        // A named view is the whole figure from that side: zoom and pan go back as well
        else if (CAMERAS[btn.dataset.cam]) moveCamera({ ...CAMERAS[btn.dataset.cam], zoom: 1, panX: 0, panY: 0 });
    });

    // Place list: one tab stop, arrow keys move within it (roving tabindex), Enter or a click
    // sets the place filter; focus and hover show the column and its tooltip
    const list = el('spacetime-places');
    list?.addEventListener('click', (e) => {
        const btn = e.target.closest('.st-place');
        if (!btn) return;
        deps.togglePlace(btn.dataset.place);
        // A pointer click far down the list brings the figure back, where the choice shows
        if (e.detail > 0) el('spacetime-figure').scrollIntoView({ block: 'nearest' });
    });
    // The year of the chosen place: a level in the figure and the letters of that year in the drawer
    list?.addEventListener('change', (e) => {
        if (e.target.id !== 'spacetime-year') return;
        deps.pickYear(e.target.value ? Number(e.target.value) : null);
    });
    list?.addEventListener('keydown', (e) => {
        const buttons = [...list.querySelectorAll('.st-place')];
        const index = buttons.indexOf(document.activeElement);
        if (index < 0) return;
        const target = { ArrowDown: index + 1, ArrowUp: index - 1, Home: 0, End: buttons.length - 1 }[e.key];
        if (target === undefined) return;
        e.preventDefault();
        const next = buttons[Math.max(0, Math.min(buttons.length - 1, target))];
        buttons.forEach(b => { b.tabIndex = b === next ? 0 : -1; });
        next.focus();
    });
    const previewFrom = (e) => {
        const btn = e.target.closest?.('.st-place');
        if (!btn || !model) return;
        const place = model.places[Number(btn.dataset.p)];
        setHover(place.id);
        showTooltipAt(place, null);
    };
    list?.addEventListener('focusin', previewFrom);
    list?.addEventListener('pointerover', previewFrom);
    const endPreview = () => { setHover(null); hideTooltip(); };
    list?.addEventListener('focusout', (e) => { if (!list.contains(e.relatedTarget)) endPreview(); });
    list?.addEventListener('pointerleave', endPreview);

    // Redraw when the figure changes size while visible (sidebar, window, breakpoint)
    let wasNarrow = isNarrow();
    new ResizeObserver(() => {
        if (!model || !el('spacetime-view')?.classList.contains('active')) return;
        const narrow = isNarrow();
        if (narrow !== wasNarrow) {
            wasNarrow = narrow;
            Object.assign(cam, narrow ? CAMERAS.oben : CAMERAS.schraeg, { panX: 0, panY: 0 });
            renderNote();
            syncCameraButtons();
        }
        draw();
    }).observe(svg);
}
