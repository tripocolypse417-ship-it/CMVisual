# Open-Data Acquisition and Autonomous Progress Plan

**Status:** Proposed implementation plan; no external data has been ingested by this document.  
**Principle:** Use open data to reduce manual setup and research dependencies, never to manufacture sensor truth or replace incident-specific ground truth.

## 1. What open data can do for WaveRadar now

Open datasets can supply contextual layers, reference geometry, environmental conditions, historical test cases, and reproducible development fixtures. They can support a working map and hazard context before any field partner or proprietary sensor feed is available.

They cannot, by themselves, establish the current interior layout of a building, confirm a person is inside, provide live private Wi-Fi/cellular measurements, or validate a firefighter navigation claim.

## 2. Initial source catalogue

| Source | Candidate use | Data class | Limitations / controls |
|---|---|---|---|
| USGS The National Map | Public structures, transportation, hydrography, boundaries, names, elevation services | OPEN_CONTEXT | Coverage, completeness, vintage, and positional accuracy vary by layer |
| USGS 3DEP | Terrain elevation, lidar point clouds and DEMs for terrain/approach context and reproducible 3D terrain tests | OPEN_CONTEXT / REFERENCE_GEOMETRY | Bare-earth terrain is not building interior geometry; resolution and quality level must travel with each tile |
| Census TIGER/Line + TIGERweb | Roads, address geography, boundaries, water features, geocoding context | OPEN_CONTEXT | Not a live routing or dispatch source; use the appropriate vintage and licensing/terms |
| NOAA/NWS API | Current alerts, forecasts, station observations, severe weather context | LIVE_PUBLIC_CONTEXT | Forecasts are probabilistic; station observations vary in source quality and latency; retain issue/valid/received times |
| NOAA NCEI and Open Data Dissemination | Historical weather, radar/model archives, climate and environmental test cases | HISTORICAL_CONTEXT | Archive cadence and product-specific terms/quality vary; not all products are real-time |
| FEMA National Flood Hazard Layer | Flood zones, flood-control features and flood-related planning context | HAZARD_CONTEXT | Not a complete all-hazards building assessment; effective map status and update time matter |
| NOAA National Water Prediction Service | Streamflow forecasts/observations, flood impacts, crest history and hydrologic context | LIVE_PUBLIC_CONTEXT | Forecasts are model products; identify experimental services and keep forecast distinct from observation |
| USGS Water Data APIs | Streamflow, monitoring station metadata, water conditions and surveyed flood-impact locations | LIVE/HISTORICAL_CONTEXT | Site availability and sampling frequency vary; retain station and measurement metadata |
| Publicly available satellite/earth-observation products via USGS EROS/NASA/NOAA | Historical imagery, land cover, wildfire/flood/storm context, post-incident change analysis | REMOTE_SENSING_CONTEXT | Acquisition time, cloud cover, pixel resolution, processing level and licensing must be recorded; imagery is not live indoor sensing |
| OpenStreetMap | Community-maintained roads, paths, building footprints and points of interest where available | COMMUNITY_CONTEXT | ODbL attribution/share-alike obligations; completeness and positional accuracy vary; not an authoritative building plan |
| Public FCC / carrier coverage datasets and maps, where terms permit | Broad-area coverage planning and network availability context | COVERAGE_CONTEXT | Coverage predictions are not measurements at an incident; no inference of private traffic or subscriber location |

### Primary references

- USGS National Map data and services: https://www.usgs.gov/the-national-map-data-delivery/gis-data-download
- USGS 3DEP products: https://www.usgs.gov/3d-elevation-program/about-3dep-products-services
- Census TIGER data guide: https://www.census.gov/programs-surveys/geography/guidance/tiger-data-products-guide.html
- NWS API: https://www.weather.gov/documentation/services-web-api
- NOAA NCEI web services: https://www.ncdc.noaa.gov/cdo-web/webservices/ncdcwebservices
- NOAA open datasets: https://www.noaa.gov/nodd/datasets
- FEMA NFHL catalogue: https://catalog.data.gov/dataset/national-flood-hazard-layer
- NOAA National Water Prediction Service: https://water.noaa.gov/about/api
- USGS Water Data APIs: https://api.waterdata.usgs.gov/
- USGS API directory: https://www.usgs.gov/faqs/does-usgs-have-apis
- Census API guide: https://www.census.gov/data/developers/guidance/api-user-guide.Query_Examples.html
- OpenStreetMap copyright/licence: https://www.openstreetmap.org/copyright

## 3. Ingestion architecture

Create a provider-neutral data adapter for each source. Every adapter must emit a common catalogue record and preserve the source-specific metadata.

Required fields:
- source_id, provider, dataset_id, product/version, source URL and access method;
- licence/terms, attribution requirements, public-access classification;
- geographic coverage, spatial resolution/scale, coordinate reference system;
- observation/acquisition time, publication time, retrieval time, valid period;
- update cadence, expected latency, last successful fetch, cache expiry;
- original checksum/ETag/Last-Modified where available;
- raw object URI, parsed representation URI, parser version, transformation lineage;
- quality statement, known gaps, uncertainty, and use restrictions.

Store original payloads unchanged when permitted. Store normalized derivatives separately. Never overwrite a previous source version; append a new version and link it to its parent.

## 4. Autonomous pipeline

1. **Discover:** maintain a curated allowlist of official and clearly licensed public endpoints. New endpoints enter quarantine until terms, provenance and security are checked.
2. **Schedule:** poll sources according to their own cadence and incident relevance; avoid unnecessary high-frequency polling.
3. **Fetch:** use conditional requests, bounded retries, rate limits, timeouts and backoff. No secrets or personal data in logs.
4. **Validate:** check schema, timestamps, coordinate systems, coverage, duplicate IDs, payload size, checksum, licence and freshness.
5. **Normalize:** convert to a stable internal representation without discarding original units or metadata.
6. **Index:** spatially index features/tiles and text-search metadata. Use open standards such as GeoJSON, GeoPackage, Cloud Optimized GeoTIFF, STAC and OGC APIs where appropriate.
7. **Publish:** expose each layer with a clear label: LIVE, RECENT, HISTORICAL, STATIC, STALE, EXPERIMENTAL, or UNAVAILABLE.
8. **Monitor:** report source failures, schema drift, missing coverage, stale feeds, rate-limit events and parser errors.
9. **Reconcile:** compare new versions with previous records; retain changes and corrections as lineage, not destructive replacement.
10. **Review:** human or independent reviewer approval is required for operational hazard assertions, high-consequence transformations, and promotion into validated capabilities.

## 5. Evidence classes and trust boundaries

Open-data context must not be mislabeled as device measurement.

Use:
- MEASURED — instrument observation with source and method;
- DERIVED — deterministic transformation from identified inputs;
- INFERRED — model-based interpretation with uncertainty;
- PREDICTED — forecast of a future state;
- SIMULATED — synthetic or generated test data;
- UNKNOWN / UNAVAILABLE — missing, unverified or unsupported.

Use separate source roles:
- INCIDENT_MEASUREMENT: actual incident/device observations;
- PUBLIC_CONTEXT: authoritative or community context;
- REFERENCE_GROUND_TRUTH: independently surveyed or instrumented reference;
- MODEL_OUTPUT: derived/inferred/predicted analysis;
- TEST_FIXTURE: simulated or replayed test data.

A public building footprint is not ground truth for an interior. A forecast is not an observation. A cell-coverage map is not a live RF measurement. An imagery pixel is not a current scene view.

## 6. Development without waiting for the user

The project should progress in four lanes:

### Lane A — Source-code and test automation
- Complete import/call-site inventory.
- Add schema validation and unit/contract tests.
- Run CI on every isolated branch.
- Create fixtures from synthetic data and appropriately licensed public datasets.
- Produce dependency, coverage, and regression reports.

### Lane B — Open-data context
- Start with NWS alerts/forecasts, USGS terrain/structures, Census geography, and FEMA flood context.
- Add NOAA/NCEI historical weather and USGS water data for replay scenarios.
- Add OSM only with ODbL compliance and explicit community-data labels.
- Add satellite imagery products for retrospective context, not claims of live indoor sensing.

### Lane C — Research and validation
- Build test matrices, null hypotheses, protocols and analysis notebooks.
- Use synthetic and public datasets to test ingestion, time alignment, uncertainty propagation, provenance and map rendering.
- Reserve physical sensor accuracy claims for controlled experiments with independent ground truth.

### Lane D — Funding and partnerships
- Prepare reusable partner packets, research summaries, budget models and draft letters.
- Track deadlines and replies.
- Never sign agreements, make institutional commitments, represent a partner as confirmed, or submit grant applications without the required authorized signatory and verified facts.

## 7. Prioritized first vertical slice

Build a small, independently deployable data-context service that can:
1. retrieve an NWS alert/forecast and a USGS terrain/structure layer for a test coordinate;
2. preserve source payloads and metadata;
3. normalize and index the layers;
4. show retrieval/valid time, source quality and stale status;
5. export the data plus a manifest;
6. reproduce the same result from a saved fixture without network access.

This vertical slice can be built and tested without a fire department, private carrier, special sensor hardware, or access to the user's phone.

## 8. Autonomous stop conditions

The pipeline must stop or quarantine a source when:
- licence/terms are unclear or incompatible;
- source authenticity or integrity cannot be established;
- schema changes break parsing;
- timestamp or coordinate reference is ambiguous;
- source data are stale for the intended use;
- privacy or security restrictions are not satisfied;
- the system cannot distinguish observation from forecast, inference or simulation.

## 9. Success measures

Track:
- percentage of sources with documented licence/provenance/refresh policy;
- successful and failed fetches by source;
- freshness lag and data coverage by geography;
- schema-validation and parser error rates;
- reproducibility of saved fixture replays;
- proportion of outputs carrying time, source, quality and uncertainty metadata;
- zero silent overwrites and zero unlabelled simulated data;
- percentage of operationally relevant claims with independent ground truth.

**Acceptance principle:** WaveRadar can continue engineering with open data while waiting for external partners, but open data cannot substitute for permissions, live incident observations, or independent physical validation.
