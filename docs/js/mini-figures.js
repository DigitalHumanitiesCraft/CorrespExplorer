// Drawing parts shared by the small figures of the start page (start-figures.js) and the dashboard
// of the explorer's start view (views/overview-view.js): the frame and projection of the small
// map with its country outlines, and the geometry of the small correspondence circle. Both pages
// draw the same views in small, so they keep one rule for each.

// Country outlines of Natural Earth (public domain), see vendor/natural-earth/PROVENANCE.md
const LAND_URL = 'vendor/natural-earth/countries-110m.geo.json';

let landPromise = null;

/**
 * The country outlines, fetched once per page; null when they cannot be read, so a map without
 * outlines still shows its places
 * @returns {Promise<Array|null>}
 */
export function loadLand() {
    if (!landPromise) {
        landPromise = fetch(LAND_URL)
            .then(response => (response.ok ? response.json() : null))
            .then(json => json?.features || null)
            .catch(() => null);
    }
    return landPromise;
}

/**
 * A frame around the places that hold most of the letters (the frame rule of the space-time view):
 * the 3rd to 97th percentile of latitude and longitude, weighted by letters, with a margin
 * @param {Array<[number, number, number]>} places - [lat, lon, letters]
 * @returns {{latMin: number, latMax: number, lonMin: number, lonMax: number}|null}
 */
export function mapFrame(places) {
    if (!places || places.length === 0) return null;
    const quantile = (value, share) => {
        const sorted = places.map(p => [value(p), p[2]]).sort((a, b) => a[0] - b[0]);
        const total = sorted.reduce((sum, [, w]) => sum + w, 0);
        let seen = 0;
        for (const [v, w] of sorted) {
            seen += w;
            if (seen >= total * share) return v;
        }
        return sorted[sorted.length - 1][0];
    };
    const latMin = quantile(p => p[0], 0.03);
    const latMax = quantile(p => p[0], 0.97);
    const lonMin = quantile(p => p[1], 0.03);
    const lonMax = quantile(p => p[1], 0.97);
    const padLat = Math.max((latMax - latMin) * 0.12, 1.5);
    const padLon = Math.max((lonMax - lonMin) * 0.12, 1.5);
    return { latMin: latMin - padLat, latMax: latMax + padLat, lonMin: lonMin - padLon, lonMax: lonMax + padLon };
}

/**
 * Equirectangular projection of a frame into a box, longitudes shortened by the cosine of the
 * middle latitude, centred in the box
 * @param {Object} frame - from mapFrame()
 * @param {number} width
 * @param {number} height
 * @returns {function(number, number): [number, number]} (lat, lon) to (x, y)
 */
export function frameProjection(frame, width, height) {
    const k = Math.cos((((frame.latMin + frame.latMax) / 2) * Math.PI) / 180);
    const spanX = (frame.lonMax - frame.lonMin) * k;
    const spanY = frame.latMax - frame.latMin;
    const scale = Math.min(width / spanX, height / spanY);
    const offsetX = (width - spanX * scale) / 2;
    const offsetY = (height - spanY * scale) / 2;
    return (lat, lon) => [offsetX + (lon - frame.lonMin) * k * scale, offsetY + (frame.latMax - lat) * scale];
}

/**
 * The outlines near a frame as one SVG path, usable in an SVG and, through Path2D, on a canvas
 * @param {Array} features - GeoJSON features
 * @param {Object} frame
 * @param {function(number, number): [number, number]} project
 * @returns {string}
 */
export function landPath(features, frame, project) {
    const rings = [];
    features.forEach(feature => {
        const geometry = feature.geometry;
        const polygons = geometry?.type === 'Polygon' ? [geometry.coordinates] : geometry?.type === 'MultiPolygon' ? geometry.coordinates : [];
        polygons.forEach(polygon => {
            const outer = polygon[0];
            // Only outlines near the frame, so the path stays small
            if (!outer.some(([lon, lat]) => lon > frame.lonMin - 20 && lon < frame.lonMax + 20 && lat > frame.latMin - 20 && lat < frame.latMax + 20)) return;
            rings.push(`M${outer.map(([lon, lat]) => project(lat, lon).map(v => v.toFixed(1)).join(' ')).join('L')}Z`);
        });
    });
    return rings.join('');
}

/**
 * The geometry of the explorer's correspondence circle (egoGeometry() of views/network-view.js),
 * sized to a small figure: the rim fills it, and with an outer ring the rows of mentioned persons
 * sit just outside the rim
 * @param {{egoGeometry: Function}} network - the module views/network-view.js
 * @param {number} width
 * @param {number} height
 * @param {boolean} hasOuter
 */
export function smallGeometry(network, width, height, hasOuter) {
    const g = network.egoGeometry(width, height, { hasOuter });
    const rows = hasOuter ? g.bandRows : 0;
    const step = 3;
    const gap = hasOuter ? 8 : 0;
    const R = Math.max(20, Math.min(width, height) / 2 - 6 - gap - rows * step);
    return { ...g, R, r0: R * 0.14, bandR0: R + gap, bandStep: step };
}
