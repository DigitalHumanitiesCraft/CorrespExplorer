# Architecture Decision Records (ADRs)

Wichtige Architekturentscheidungen im HerData-Projekt.

Format: Kontext, Problem, Optionen, Entscheidung, Konsequenzen.

Stand: 2025-10-19

Siehe [INDEX.md](INDEX.md) für Navigation im Knowledge Vault.

---

## ADR-001: Map Library Selection (2025-10-19)

Status: Accepted - MapLibre GL JS chosen for MVP implementation

### Context

HerData requires an interactive map to visualize women with geodata (siehe [data.md](data.md#kern-statistiken)) across three implementation phases:

Phase 1 (MVP):
- Basic marker clustering
- Popups with person information
- Filter synchronization (role, normierung)

Phase 2 (Enhancement):
- Brushing and linking between map, timeline, and network views
- Optional heatmap/density visualization
- Temporal animation with Zeit-Slider
- Dynamic marker sizing based on letter count

Phase 3 (Advanced):
- Potential dual-layer visualization (network overlay on map)
- Edge-fading animations for temporal network projection
- Mini-maps embedded in person profiles

Constraints:
- Static site deployment (GitHub Pages)
- No backend server
- No API key dependencies preferred
- Open-source requirement
- Academic/research context
- Target performance: TTI ≤ 2s

### Alternatives Considered

#### Option A: Leaflet.js

Advantages:
- Lightweight (40 KB gzipped)
- Extensive digital humanities adoption (British National Archives, UT Austin, ANU)
- Simple API with abundant documentation
- Large plugin ecosystem
- Proven in similar historical mapping projects
- Wider browser compatibility (no WebGL requirement)

Disadvantages:
- Canvas/SVG rendering (not WebGL)
- Limited animation capabilities
- Heatmaps require plugin (Leaflet.heat)
- Brushing and linking requires custom coordination logic
- Dynamic styling less flexible
- Cluster transitions not smooth

Technical details:
- Rendering: HTML/CSS/Canvas
- Tile support: Raster (PNG/JPG)
- Bundle size: ~40 KB
- Browser support: All modern + older browsers

#### Option B: MapLibre GL JS

Advantages:
- WebGL-accelerated rendering (smooth animations)
- Native vector tile support with dynamic styling
- Built-in heatmap functionality
- Better performance for synchronized views
- Modern, professional appearance
- Growing academic adoption (University of Rennes 2, Ben-Gurion University)
- Fully open-source (community fork of Mapbox GL JS)
- No API keys required

Disadvantages:
- Larger bundle (220 KB gzipped, 5.5x vs Leaflet)
- Steeper learning curve
- Requires WebGL-capable browsers
- Less established in digital humanities community
- More complex API

Technical details:
- Rendering: WebGL
- Tile support: Vector (MVT) + Raster
- Bundle size: ~220 KB
- Browser support: Modern browsers with WebGL

#### Option C: OpenLayers

Considered but rejected due to:
- Even larger bundle size (>300 KB)
- More complex API than both alternatives
- Overkill for project requirements
- Less common in digital humanities

#### Option D: Mapbox GL JS

Rejected due to:
- Requires API key and billing setup
- Not suitable for open academic project
- MapLibre is open-source alternative

### Decision Criteria

1. Phase 2/3 feasibility: Brushing, linking, animations
2. Bundle size impact on GitHub Pages performance
3. Open-source licensing and sustainability
4. Learning curve and development velocity
5. Academic context appropriateness
6. Community support and documentation

### Analysis

Critical requirement analysis:
- design.md line 55 specifies "Leaflet/WebGL" suggesting WebGL consideration
- US-02 requires brush-selection filtering between timeline and map
- FR-02 specifies marker size based on data (letter count)
- design.md mentions optional heatmap layer
- Phase 2 temporal animation with Zeit-Slider
- Phase 3 potential network overlay visualization

Leaflet limitations for Phase 2+:
- Timeline-to-map synchronization requires custom event coordination
- Animated marker transitions not native (requires plugins like Leaflet.markercluster)
- Heatmap requires additional plugin dependency
- Dynamic marker sizing based on data less elegant
- Performance degradation with frequent filter updates

MapLibre advantages for Phase 2+:
- Native expression-based styling (data-driven marker sizes/colors)
- Smooth transitions built-in
- Heatmap layer native
- Better performance for real-time filtering
- WebGL rendering handles animation efficiently

Bundle size consideration:
- Current data: persons.json = 1.49 MB
- Leaflet: +40 KB (2.7% increase)
- MapLibre: +220 KB (14.8% increase)
- Both acceptable for GitHub Pages (10 MB limit)
- Modern browsers handle 220 KB easily with HTTP/2 compression

### Recommendation

Use MapLibre GL JS for the following reasons:

1. Phase 2 requirements (brushing, linking, animations) are significantly easier with WebGL rendering
2. Built-in heatmap aligns with design.md specification
3. Data-driven styling more elegant for dynamic marker sizing
4. 220 KB bundle size acceptable given 1.5 MB data payload
5. More professional appearance suitable for academic showcase
6. Future-proof for Phase 3 advanced visualizations
7. Open-source with no API key dependencies

Trade-offs accepted:
- Larger bundle size (220 KB vs 40 KB)
- Steeper initial learning curve
- Less established in DH community (mitigated by growing academic adoption)

### Implementation Notes

If MapLibre is chosen:
- Use CDN for initial MVP: https://unpkg.com/maplibre-gl@latest/dist/maplibre-gl.js
- Consider bundling for production to enable offline development
- Plan for graceful degradation message for non-WebGL browsers
- Document examples from University of Rennes 2 and Ben-Gurion as references

If Leaflet is chosen instead:
- Accept Phase 2 animation limitations
- Plan for Leaflet.heat plugin integration
- Budget extra time for custom brushing/linking coordination logic
- Consider migration to MapLibre for Phase 3 if needed

### References

- MapLibre GL JS documentation: https://maplibre.org/maplibre-gl-js/docs/
- Leaflet documentation: https://leafletjs.com/
- University of Rennes 2 MapLibre examples: https://sites-formations.univ-rennes2.fr/mastersigat/MaplibreGL/
- Ben-Gurion University Web Mapping course: https://geobgu.xyz/web-mapping-2022/maplibre.html
- Bundle size comparison: https://bundlephobia.com/

### Final Decision

MapLibre GL JS has been selected and implemented for the MVP.

Rationale for immediate adoption:
- WebGL rendering provides superior performance for markers with clustering
- Data-driven styling enables elegant role-based coloring without custom icons
- Native clustering support with smooth zoom transitions
- Better foundation for Phase 2 brushing and linking requirements
- 220 KB bundle size acceptable given project scope
- Implementation completed successfully with clean API

Implementation details (2025-10-19):
- CDN version: maplibre-gl@4.7.1
- Base map: OpenStreetMap raster tiles
- Clustering: enabled with clusterMaxZoom=14, clusterRadius=50
- Role-based colors: Steel Blue (sender), Medium Gray (mentioned), Forest Green (both), Light Gray (indirect)
- Interactive features: click to zoom on clusters, popups on individual markers, hover cursor changes
- Filter integration: real-time map updates when role/normierung filters change
- Tab switching: map resize handled automatically

Performance achieved:
- Map loads and renders markers smoothly
- Filter updates instant with layer re-rendering
- Popup display responsive
- No performance degradation observed

Trade-offs accepted:
- Larger bundle than Leaflet (220 KB vs 40 KB) - accepted as negligible given 1.5 MB data payload
- WebGL requirement - acceptable for target audience (modern browsers)
- Steeper learning curve - mitigated by clear documentation and examples

---

## ADR-002: Overlapping Marker Strategy (2025-10-19)

Status: Accepted - Multi-person popup with location grouping

### Context

HerData displays women with geodata on an interactive map (Details siehe [data.md](data.md#kern-statistiken)). A critical usability issue emerged: multiple women often share identical coordinates (e.g., "Weimar (Wirkungsort)"), causing markers to stack on top of each other. Users can only click the topmost marker, making other women at the same location inaccessible.

Problem characteristics:
- Geographic concentration: Weimar (34%), Jena (15%), Berlin (7%)
- Many women share city-level coordinates (no street addresses)
- Historical data often has imprecise location information
- Clustering helps at lower zoom levels but not when fully zoomed in

Project requirement (requirements.md FR-02):
- "Leaflet.js mit Clustering (Spiderfier bei Overlap)"
- Risk mitigation: "Geographic concentration (Weimar 34%)" → "Spider-Cluster, Zoom-Decluttering"

### Alternatives Considered

#### Option A: Spiderfy Plugin

Use third-party spiderfy library to "explode" overlapping markers into a circle/spiral pattern.

Available plugins:
- @nazka/map-gl-js-spiderfy: Canvas-based spiderfication with circle/spiral patterns
- maplibre-spiderfier (ohrie): DOM-based overlay markers with spider legs
- Custom implementation: Native solution using icon-offset property

Advantages:
- Visual pattern familiar from Leaflet.MarkerCluster
- Each person gets individual clickable marker
- Clear visual indication of multiple entries at location
- Aligns with original requirements.md specification

Disadvantages:
- Additional dependency (10-20 KB)
- Requires configuration and integration testing
- Spiderfy pattern can be visually cluttered with many markers
- Doesn't work well on mobile (small touch targets)
- Extra clicks required (click to spiderfy, then click individual marker)

#### Option B: Multi-Person Popup

Group all persons at the same coordinates and show them together in a single popup with scrollable list.

Implementation:
- Detect click coordinates
- Query all features at that location (queryRenderedFeatures)
- Build popup with list of all persons
- Include name, dates, role badges, stats for each
- Scrollable if more than 5-6 entries

Advantages:
- No additional dependencies (pure MapLibre)
- Better UX: single click reveals all people at location
- Works well on mobile (no tiny touch targets)
- Supports "discovery" use case: users see all women at a location
- Cleaner visual appearance (no spider legs)
- Aligns with design.md principle: "Overview → Zoom/Filter → Details on Demand"

Disadvantages:
- Requires custom popup template design
- Scrolling needed for locations with many women
- Less visual indication that multiple markers exist at location

#### Option C: Coordinate Jittering

Add small random offset (0.0001-0.0005 degrees) to markers with identical coordinates.

Advantages:
- Simple implementation
- No dependencies
- Markers always individually clickable

Disadvantages:
- Geographically inaccurate (introduces false precision)
- Unprofessional for academic/scholarly context
- Violates data integrity principles
- Random offset inconsistent across sessions

#### Option D: Increase Clustering at High Zoom

Keep clustering active at zoom 15+ with very small clusterRadius for exact-coordinate matches only.

Advantages:
- Uses existing clustering infrastructure
- Familiar interaction pattern

Disadvantages:
- Confusing UX: "Why is there still a cluster when I'm fully zoomed in?"
- Requires additional zoom action to expand
- Doesn't solve the core problem (still need to handle unclustered overlaps)

### Decision Criteria

1. User experience: Minimize clicks to access all women
2. Mobile-friendliness: Touch-friendly interaction
3. Academic context: Professional, accurate representation
4. Implementation complexity: Minimize dependencies and maintenance
5. Discovery support: Help users find all women at a location
6. Design alignment: Match design.md principles

### Analysis

Critical requirements from design.md:
- Line 11: "Overview first → zoom & filter → details on demand" (Shneiderman)
- Line 19: "Person finden & verstehen" (top user task)
- Line 59: "Performance-Ziel: ≤ 2 s TTI bei initialem View"
- Line 109: "progressive Offenlegung, Chunking"

Requirements.md specification:
- FR-02: "Spiderfier bei Overlap" suggests visual expansion
- Risk table: "Spider-Cluster, Zoom-Decluttering"

However, deeper analysis reveals:
- Target audience: "kultur-interessierte Laien" (design.md line 15)
- Primary task: "Räume erkunden" (explore geographic distribution)
- Historical data has limited precision (city-level coordinates)
- Mobile usage expected for public-facing platform

Spiderfy limitations for this context:
- Adds visual complexity (spider legs, animation)
- Requires two interactions (spiderfy trigger, then marker click)
- Small touch targets on mobile when spiderfied
- Plugin dependency increases maintenance burden

Multi-person popup advantages for this context:
- Single interaction (one click → see all)
- Better discovery: users see all women at location immediately
- Clean visual design (no additional markers/lines)
- Works well on mobile (scrollable list)
- No dependencies (pure MapLibre API)
- Aligns with "Overview → Details" pattern

### Recommendation

Implement Option B: Multi-person popup with location grouping

Rationale:
1. Better UX for target audience (general public, students)
2. Supports primary task (geographic exploration and discovery)
3. Mobile-friendly (no small touch targets)
4. Clean implementation (no external dependencies)
5. Professional appearance for academic context
6. Easier maintenance (no plugin updates)

Trade-offs accepted:
- Deviates from original "Spiderfier" specification in requirements.md
- Requires custom popup template design
- Less visual indication before click that multiple markers exist

Mitigation for trade-off:
- Consider adding cluster count badge to overlapping markers in future iteration
- Document this decision clearly in ADR
- Can be enhanced later with spiderfy if user testing shows need

### Implementation Notes

Implementation approach:
1. Modify click handler to query all features at clicked point
2. Group features by exact coordinates
3. Build multi-person popup template with list
4. Add scrolling for locations with 5+ persons
5. Include mini-badges (role, GND status) for each person
6. Link each person to detail page (Phase 2)

Popup template structure:
```html
<div class="multi-person-popup">
  <h3>Weimar (Wirkungsort)</h3>
  <p class="location-count">12 Frauen an diesem Ort</p>
  <ul class="person-list">
    <li>
      <strong>Name</strong> (dates)
      <span class="badges">GND SNDB</span>
      <span class="stats">5 Briefe</span>
    </li>
    <!-- ... -->
  </ul>
</div>
```

Performance consideration:
- Limit displayed persons to first 20 (add "Show more" button)
- Keep popup rendering fast

### References

- MapLibre queryRenderedFeatures: https://maplibre.org/maplibre-gl-js/docs/API/classes/Map/#queryrenderedfeatures
- Spiderfy plugins: @nazka/map-gl-js-spiderfy, maplibre-spiderfier
- Design principles: knowledge/design.md lines 11, 109
- Requirements: knowledge/requirements.md FR-02

### Future Considerations

If user testing reveals issues with multi-person popup approach:
- Consider hybrid: multi-person popup + spiderfy toggle button
- Add visual indicator (badge) showing marker count before click
- Implement zoom-to-spread functionality for dense clusters

---

## ADR-003: Cluster Color Encoding for Research Interface

Status: Accepted
Date: 2025-01-19
Context: Session 9 - Research interface improvements

### Problem

Original implementation used uniform blue color for all clusters, providing no visual hierarchy or research insight. User feedback: "Es soll ja ein Forschungsinterface sein" - need to support research questions visually.

Research questions to enable:
- Where were women actively writing letters?
- Where were women only mentioned (passive presence)?
- Which locations had mixed engagement?

Data distribution (Details siehe [data.md](data.md#kern-statistiken)):
- 192 (5.3%) wrote letters (sender + both)
- 772 (21.3%) mentioned in letters
- 2,809 (77.7%) only SNDB entries (no letter connection)

### Alternatives Considered

Option 1: Color by occupation
- Pros: Reveals artistic/literary/court concentrations
- Cons: Too many categories (7+), color blind issues, mixed occupations in clusters
- Rejected: Filter handles occupation better than color

Option 2: Color by GND normalization
- Pros: Shows data quality
- Cons: Technical metadata, not research-relevant
- Rejected: Not a research question

Option 3: Color by letter activity (ACCEPTED)
- Pros: Directly answers "where were women writing?"
- Pros: Clear visual hierarchy (active vs passive)
- Pros: Simple color scheme (3-4 colors)
- Accepted: Core research question

Option 4: Color by time period
- Pros: Shows temporal patterns
- Cons: Timeline view better suited for this
- Deferred: Phase 2 timeline implementation

### Decision

Cluster colors encode letter activity with 3 categories:

1. Blue (#2c5f8d - Steel Blue): >50% wrote letters
   - Research value: "Writing hotspots"
   - Includes: sender + both roles

2. Gray (#6c757d - Medium Gray): >50% only mentioned
   - Research value: "Passive presence locations"
   - Includes: mentioned role only

3. Green (#2d6a4f - Forest Green): Mixed (no majority)
   - Research value: "Diverse engagement"
   - No single category >50%

"Nur SNDB-Eintrag" NOT color-encoded:
- Rationale: No letter connection = not relevant for correspondence research
- These women filtered out by default (checkbox unchecked)
- If included, treated as background/context only

### Implementation

MapLibre clusterProperties:
```javascript
clusterProperties: {
    'sender_count': ['+', ['case', ['==', ['get', 'role'], 'sender'], 1, 0]],
    'mentioned_count': ['+', ['case', ['==', ['get', 'role'], 'mentioned'], 1, 0]],
    'both_count': ['+', ['case', ['==', ['get', 'role'], 'both'], 1, 0]]
    // indirect_count omitted from color logic
}
```

Paint expression:
```javascript
'circle-color': [
    'case',
    ['>', ['+', ['get', 'sender_count'], ['get', 'both_count']],
          ['*', ['get', 'point_count'], 0.5]], '#2c5f8d',  // Blue: wrote letters
    ['>', ['get', 'mentioned_count'], ['*', ['get', 'point_count'], 0.5]], '#6c757d',  // Gray: mentioned
    '#2d6a4f'  // Green: mixed
]
```

Legend (HTML + CSS):
- Positioned bottom-right (cartographic convention)
- 3 color swatches with clear labels
- Always visible during interaction
- Responsive for mobile

### Consequences

Positive:
- Immediate visual answer to "where were women writing?"
- Clear distinction between active/passive locations
- Simple color scheme (colorblind-accessible with blue/gray)
- Legend documents meaning (self-documenting interface)
- Progressive disclosure: hover shows exact counts

Negative:
- ⚠️ 50% threshold somewhat arbitrary (but clear mental model)
- ⚠️ Mixed clusters (green) may hide nuanced patterns
- ⚠️ Temporal dimension not visible (deferred to timeline view)

Trade-offs:
- Chose clarity over complexity
- Research question focus over comprehensive encoding
- Spatial patterns over temporal patterns (for now)

### Testing

User feedback after implementation:
- "warum sind ein paar grün und warum ein paar grau?" → Legend added
- Confirmed color logic intuitive after legend explanation
- Occupation filter + color encoding work well together

### References

- Design principles: knowledge/design.md Section 6.2 (Visual Encoding)
- Data analysis: documentation/JOURNAL.md Session 9
- User feedback: Session 9 conversation

### Future Considerations

Potential enhancements:
- Toggle between color schemes (activity vs occupation vs time)
- Gradient instead of categories (% who wrote letters)
- Heatmap layer for letter density
- Animation showing change over time

---

## ADR-004: Network Visualization Library

Status: Proposed

Context: Phase 2 requires network graph visualization for two layers:
1. AGRELON relationships (44 types: family, professional, social)
2. Co-mentions in letters (derived from CMIF data)

Requirements:
- 3,617 nodes (women) + potential male connections
- Dynamic filtering by AGRELON type
- Force-directed layout
- Interactive zoom and pan
- Tooltip on hover
- Click to open person detail

Alternatives Considered:

1. D3.js Force Simulation
   - Pros: Maximum flexibility, well-documented, integrates with existing tech stack
   - Cons: Steep learning curve, custom implementation needed, performance with large graphs
   - License: BSD 3-Clause
   - Bundle size: 248 KB (full), ~50 KB (minimal)

2. Force-Graph (vasturiano/force-graph)
   - Pros: Built on D3, WebGL acceleration, easy setup, excellent performance
   - Cons: Less customization, heavier bundle, dependencies on Three.js
   - License: MIT
   - Bundle size: ~400 KB

3. Cytoscape.js
   - Pros: Mature library, many layout algorithms, academic use cases
   - Cons: Canvas-based (no WebGL), steeper API, larger bundle
   - License: MIT
   - Bundle size: ~500 KB

4. Sigma.js
   - Pros: WebGL performance, good for large graphs
   - Cons: Less active development, smaller community
   - License: MIT
   - Bundle size: ~250 KB

Decision: To Be Determined (TBD)

Recommendation: Force-Graph for MVP (Phase 2), evaluate D3.js custom for Phase 3 if customization needed.

Rationale:
- Force-Graph balances ease-of-use with performance
- WebGL critical for 3,617+ nodes
- MIT license compatible with project
- Can migrate to D3.js if advanced features required

Testing Criteria:
- Render 3,617 women in <2s
- Smooth interactions at 60 FPS
- Memory usage <500 MB
- AGRELON filter updates <100ms

---

## ADR-005: Timeline Implementation Approach

Status: Implemented
Date: 2025-10-19
Implementation: Session 10, commit c452743

Context: Phase 2 timeline view visualizes letter activity over time (1762-1824).

Data:
- 15,312 letters with dates (87.6% exact, 12.4% ranges)
- Peak year: 1817 (1,073 letters)
- Notable patterns: Goethe's Italian journey (1786-1788), late-life correspondence

Requirements:
- Year-binned histogram (62 bars: 1762-1824)
- Brush selection for temporal filtering
- Coordination with map view (brushing and linking)
- Hover tooltips with letter counts
- Stack by role (sender vs mentioned vs both)

Alternatives Considered:

1. D3.js Custom Implementation
   - Pros: Full control, lightweight, academic standard
   - Cons: Development time, complexity
   - Bundle size: ~50 KB (d3-scale, d3-axis, d3-shape, d3-brush)

2. Chart.js
   - Pros: Simple API, good documentation, popular
   - Cons: Limited customization, no brush selection, Canvas-only
   - Bundle size: ~200 KB

3. Observable Plot
   - Pros: Declarative API, elegant syntax, D3 foundation
   - Cons: Newer library, limited examples, requires JSX-like syntax
   - Bundle size: ~100 KB

4. Recharts
   - Pros: React-friendly (if migrating to React)
   - Cons: Requires React, heavyweight
   - Bundle size: ~400 KB + React

Decision: D3.js v7 custom implementation (IMPLEMENTED)

Rationale:
- Brush selection critical for timeline interaction (Chart.js lacks)
- Lightweight bundle preserves performance
- D3.js aligns with academic DH practices
- Observable Plot attractive but less mature

Implementation Sketch:

```javascript
const timelineData = d3.rollup(
    letters,
    v => v.length,
    d => d.date.getFullYear()
);

const x = d3.scaleTime()
    .domain([new Date(1762, 0, 1), new Date(1824, 11, 31)])
    .range([0, width]);

const y = d3.scaleLinear()
    .domain([0, d3.max(timelineData.values())])
    .range([height, 0]);

const brush = d3.brushX()
    .extent([[0, 0], [width, height]])
    .on('end', updateMap);  // Brushing and linking
```

Testing Results (Session 10):
- Render 62-year timeline: <500ms (PASS)
- Brush selection updates map: <100ms (PASS)
- Responsive design: Implemented
- Reset button: Functional

Implementation Details:
- File: docs/js/timeline.js (252 lines)
- Timeline class with CMIF XML parsing
- d3.scaleLinear for x-axis (1762-1824)
- d3.scaleLinear for y-axis (letter counts)
- d3.brushX with callback to app.js
- Lazy loading on first tab switch
- ES6 module architecture

Code Reference: [docs/js/timeline.js](../docs/js/timeline.js)

---

## ADR-006: State Management Strategy

Status: Deferred

Context: Current MVP uses global variables (map, allPersons, filteredPersons). Phase 2 adds timeline, network graph, and search - increasing state complexity.

Current Approach:

```javascript
let map;                    // MapLibre instance
let allPersons = [];        // Source of truth
let filteredPersons = [];   // Derived state
```

Works for Phase 1 (2-3 filters), but Phase 2 introduces:
- Timeline brush selection (temporal filter)
- Network graph selection (relationship filter)
- Search results (text filter)
- Coordinated views (brushing and linking)

Alternatives Considered:

1. Continue with Vanilla JS Global State
   - Pros: No dependencies, simple, fast
   - Cons: Error-prone, hard to debug, no time-travel
   - Bundle size: 0 KB

2. Zustand (React-like state management)
   - Pros: Minimal API, no React required, 1 KB bundle
   - Cons: Still global state, limited dev tools
   - Bundle size: ~1 KB

3. Redux Toolkit
   - Pros: Time-travel debugging, middleware, established patterns
   - Cons: Heavyweight, requires reducer boilerplate, 40 KB bundle
   - Bundle size: ~40 KB

4. Custom Event-Driven Architecture
   - Pros: Decoupled components, no dependencies
   - Cons: More code to maintain, debugging harder
   - Bundle size: 0 KB (custom)

Decision: Deferred to Phase 2 Implementation

Recommendation: Continue Vanilla JS for Phase 2 MVP, evaluate Zustand if complexity increases.

Rationale:
- Current approach proven functional (filters <50ms)
- Adding 40 KB for Redux not justified yet
- Zustand viable if state synchronization becomes issue
- Re-evaluate after Phase 2 network/timeline integration

Migration Path:
1. Refactor to single state object (maintain globals)
2. Add state update functions with validation
3. If complexity grows, migrate to Zustand incrementally

---

## ADR-007: Search Implementation Strategy

Status: Proposed

Context: Phase 2 requires unified search across persons, places, and letters.

Requirements:
- Typeahead suggestions (<100ms latency)
- Search 3,617 women by name, occupation, place
- Search 15,312 letters by sender, mentioned persons
- Search 633 places by name
- Fuzzy matching for typos
- Highlight matches in results

Alternatives Considered:

1. Client-Side Full-Text Search (Fuse.js)
   - Pros: No backend, offline-capable, fuzzy matching built-in
   - Cons: 20 KB bundle, index build time, memory usage
   - Bundle size: ~20 KB
   - Index size: ~500 KB (in-memory)

2. Client-Side Prefix Trie
   - Pros: Fast prefix matching, small bundle
   - Cons: No fuzzy matching, custom implementation
   - Bundle size: ~2 KB (custom)
   - Index size: ~100 KB

3. Server-Side API (Elasticsearch/MeiliSearch)
   - Pros: Scalable, advanced features, typo tolerance
   - Cons: Requires backend, deployment complexity, costs
   - Bundle size: 0 KB (client)
   - Infrastructure: VPS or cloud service

4. Algolia/Typesense Hosted Search
   - Pros: Instant setup, excellent UX, managed service
   - Cons: Monthly costs, vendor lock-in, data upload
   - Bundle size: ~30 KB (client library)
   - Cost: 1 per month (free tier insufficient for 15K records)

Decision: To Be Determined (TBD)

Recommendation: Fuse.js for Phase 2, evaluate server-side if latency issues.

Rationale:
- Static dataset (3,617 women, 15,312 letters) fits client-side
- GitHub Pages hosting (no backend available)
- Fuzzy matching important for historical names
- 20 KB acceptable bundle increase

Implementation Sketch:

```javascript
import Fuse from 'fuse.js';

const fuse = new Fuse(allPersons, {
    keys: ['name', 'occupations.name', 'places.name'],
    threshold: 0.3,  // Fuzzy tolerance
    minMatchCharLength: 2
});

function handleSearch(query) {
    const results = fuse.search(query, {limit: 10});
    renderSearchResults(results);
}
```

Testing Criteria:
- Search latency <100ms for 10-character query
- Fuzzy matching: "Vulpis" finds "Vulpius"
- Relevance ranking: exact matches first
- Memory usage <50 MB for index

Alternative for Phase 3:
- If dataset grows (include men: 23,571 persons), migrate to MeiliSearch self-hosted
- Docker container on cheap VPS (5/month)
- JSON API for search queries

---

## Future Decisions

Additional architecture decisions to be documented:

- ADR-008: Biographical text extraction from projekt-XML (markup parsing strategy)
- ADR-009: Export functionality (CSV schema, JSON API, permalink structure)
- ADR-010: Performance monitoring (RUM integration)
