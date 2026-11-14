# countries-110m.geo.json

World country outlines at a scale of 1:110 million as GeoJSON, used as the ground of the space-time view.

The geometry is [Natural Earth](https://www.naturalearthdata.com/) data, which is in the public domain. The file is a GeoJSON conversion of `countries-110m.json` from the npm package [world-atlas](https://github.com/topojson/world-atlas) version 2, whose build scripts are ISC-licensed, and was copied from another repository of the same owner on 2026-11-14. It is vendored so the published site contacts no external host for it.

Each feature carries only the country name. The view draws the outer ring of every polygon and reads no names.
