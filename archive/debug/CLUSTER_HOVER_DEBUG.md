# Cluster Hover Network Visualization - Debug History

## Problem

Cluster hover should show network connections for all persons in a cluster, but initially the connections were not being displayed.

## Symptoms

- Cluster hover tooltip showed "Verbindungen werden geladen..." but never updated
- Individual marker hover worked perfectly
- Console showed cluster hover events but no callback execution
- No connection lines were drawn for clusters

## Timeline of Investigation

### Attempt 1: Async Callback Race Condition

**Hypothesis**: Mouse movement causes `mouseleave` to fire before `getClusterLeaves()` callback completes.

**Solution Tried**: Added 200ms `setTimeout` delay before calling `getClusterLeaves()`.

**Result**: Failed - callback still never executed.

### Attempt 2: Integrated Tooltip Approach

**Hypothesis**: Separate hover systems causing timing issues.

**Solution Tried**: Show tooltip immediately with "Verbindungen werden geladen..." and update DOM when callback completes.

**Result**: Failed - callback still never executed.

### Attempt 3: DOM Element Selection

**Hypothesis**: `document.getElementById()` can't find element inside MapLibre popup.

**Solution Tried**: Used `popupEl.querySelector('#network-info')` to search within popup element.

**Result**: Failed - callback never executed, so DOM update code never ran.

### Attempt 4: Verify Cluster API Exists

**Hypothesis**: Maybe `getClusterLeaves()` is not available on this source type.

**Solution Tried**: Added debug logs to check if function exists.

**Result**: Function exists (`typeof source.getClusterLeaves === 'function'`), but callback still never fires.

### Attempt 5: Test Alternative Cluster API

**Hypothesis**: Maybe all cluster callbacks are broken.

**Solution Tried**: Added test call to `getClusterExpansionZoom()` with callback.

**Result**: Neither `getClusterExpansionZoom` nor `getClusterLeaves` callbacks fired.

### Attempt 6: Coordinate-Based Filtering

**Hypothesis**: Work around broken callbacks by filtering `allPersons` based on proximity to cluster coordinates.

**Solution Tried**: Filter persons within 0.01° radius of cluster center.

**Result**: Found 0 persons (radius too small).

### Attempt 7: Increase Search Radius

**Hypothesis**: Cluster radius is larger than expected.

**Solution Tried**: Increased radius to 0.1° (~10km).

**Result**: Still found 0 persons - coordinate filtering approach fundamentally flawed because cluster coordinates are centroid, not exact match.

### Attempt 8: Query Rendered Features

**Hypothesis**: Use `queryRenderedFeatures()` like the click handler does.

**Solution Tried**: Project cluster coordinates to screen point, query rendered features at that point.

**Result**: Failed - cluster symbol covers the underlying points, so query returns empty.

### Discovery: Click Handler Works Differently

**Observation**: User noticed that cluster click shows correct persons in popup.

**Investigation**: Examined click handler code - it also uses `getClusterLeaves()` with callback syntax.

**Question**: If callbacks don't work, how does click handler succeed?

**Answer**: Click handler ALSO doesn't work! Log shows "Finding persons at cluster location" but never "Found X persons in cluster from MapLibre". The popup must be using a different fallback mechanism.

### Root Cause Discovery: Promise vs Callback API

**Web Search**: Searched "MapLibre GL JS getClusterLeaves callback not firing"

**Finding**: MapLibre GL JS changed from callback-based API to Promise-based API!

**Old Syntax (doesn't work)**:
```javascript
source.getClusterLeaves(clusterId, pointCount, 0, (error, leaves) => {
    // Callback never fires in newer MapLibre versions
});
```

**New Syntax (correct)**:
```javascript
source.getClusterLeaves(clusterId, pointCount)
    .then(leaves => {
        // Promise resolves correctly
    })
    .catch(error => {
        console.error(error);
    });
```

## Solution

Changed cluster hover handler to use Promise-based API:

```javascript
source.getClusterLeaves(clusterId, pointCount)
    .then(leaves => {
        log.event(`Promise resolved: got ${leaves.length} leaves from cluster`);

        const clusterPersons = leaves
            .map(leaf => allPersons.find(p => p.id === leaf.properties.id))
            .filter(p => p && p.places && p.places.length > 0);

        const connections = getClusterConnections(clusterPersons, allPersons);

        // Update tooltip DOM
        const popupEl = clusterTooltip ? clusterTooltip.getElement() : null;
        const networkInfoEl = popupEl ? popupEl.querySelector('#network-info') : null;

        if (networkInfoEl && connections.length > 0) {
            const familieCount = connections.filter(c => c.category === 'Familie').length;
            const beruflichCount = connections.filter(c => c.category === 'Beruflich').length;
            const sozialCount = connections.filter(c => c.category === 'Sozial').length;

            const connDetails = [];
            if (familieCount > 0) connDetails.push(`${familieCount} Familie`);
            if (beruflichCount > 0) connDetails.push(`${beruflichCount} Beruflich`);
            if (sozialCount > 0) connDetails.push(`${sozialCount} Sozial`);

            networkInfoEl.innerHTML = `<strong>${connections.length} Verbindungen:</strong> ${connDetails.join(' • ')}`;
            networkInfoEl.style.color = '#2d6a4f';
        } else if (networkInfoEl) {
            networkInfoEl.innerHTML = 'Keine Verbindungen';
            networkInfoEl.style.color = '#999';
        }

        drawConnectionLines(connections);
    })
    .catch(error => {
        log.error(`getClusterLeaves Promise rejected: ${error.message}`);
    });
```

## Key Lessons

1. MapLibre GL JS changed from callbacks to Promises - old examples using callbacks will fail silently
2. The callback function is simply ignored in newer versions - no error, no warning
3. When debugging async code, always verify the async mechanism (callback vs Promise vs async/await) matches the library version
4. User observation ("why does click work but hover doesn't?") was key to understanding the issue
5. Web search for known issues is valuable when behavior seems inexplicable

## Files Modified

- `docs/js/app.js`: Changed cluster hover handler (lines 582-625) from callback to Promise syntax

## TODO

The cluster click handler (lines 488-525) also uses callback syntax and should be updated to Promises for consistency, though it may have a different fallback mechanism currently masking the issue.
