# WaveRadar Open Evidence Registry

**Registry status:** research candidates only. No source in this file has been downloaded, ingested, benchmarked, or independently validated by WaveRadar.

## Why this exists

CMVisual already has a general open-data catalog and a ScientificSourceRegistry entity. This folder adds the operational qualification layer missing from those foundations: access state, dataset-specific license state, commercial-use eligibility, intended use, ground-truth type, explicit limitations, and separate acquisition / ingestion / benchmark / independent-review states.

The JSON registry is the version-controlled source of candidate metadata. It does not contain dataset payloads. Keep large datasets outside the application and repository; store only manifests, hashes, adapters, test fixtures, and permitted derived metrics.

## Status meanings

- **Access status** describes how the source is accessed. PUBLICATION_LINKED is not proof that files are downloadable; PUBLIC_REQUEST and CREDENTIAL_REQUIRED require the stated process; STANDARD_ONLY is not a patient dataset.
- **License status** describes whether applicable data rights have actually been reviewed. A repository's software license does not automatically license its linked data. Mixed-source datasets require component-level review.
- **Commercial use** is separate from access. Publicly downloadable does not mean commercially usable. NONPROFIT_ONLY and NONCOMMERCIAL_ONLY block commercial WaveRadar training under the stated terms unless separate written permission or a new license is verified.
- **Training eligibility** is a gate, not a prediction. Nothing becomes eligible merely because the source is public. Recheck current terms and intended purpose before use.
- **Acquisition, ingestion, benchmark and independent-validation statuses** are separate lifecycle states. Do not advance one because another is complete.

## Required workflow

1. Verify the primary source, exact release/version, data files, access path, data license and every third-party component license.
2. Review consent, ethics, privacy, data-use terms, commercial rights, redistribution and retention conditions.
3. Record source snapshot/version and acquisition date. On acquisition, hash original files and preserve a read-only manifest; never commit dataset payloads to Git.
4. Parse in an isolated workspace. Validate schema, units, timestamps, clock domains, coordinate frames, synchronization, calibration, annotations, missingness, duplicates and provenance.
5. Quarantine incompatible or suspect records without deleting or rewriting originals. Record exclusion reason and source hashes.
6. Predefine subject / incident / site / time splits to prevent frame, subject and event leakage. Separate training, tuning and final holdout.
7. Define task-specific metrics and baselines. Report denominators, confidence intervals, false negatives, false positives, calibration, uncertainty, subgroup performance, domain shift and failure conditions.
8. Have an independent reviewer reproduce the analysis. The model team and Data Correlation Delegate cannot approve their own work.
9. Only after legal, data, engineering and validation gates may a dataset be considered for a specific model-training or benchmark use.

## WaveRadar use boundaries

- Aerial and satellite datasets support scene context and external building-damage research; they do not establish interior victim location or injury.
- Experimental fire datasets support controlled sensor and fire-dynamics research; they do not prove live fireground performance.
- Healthy-volunteer radar datasets support signal-processing feasibility; they do not validate injured, unconscious, moving, smoke-exposed or fireground victims.
- EMS and hospital records are distinct domains. EMS impressions are not necessarily final diagnoses; hospital records are not fireground sensor ground truth.
- A data standard is a schema reference, not training data.
- Public benchmark scores are not WaveRadar field performance, clinical validity, certification, or life-safety readiness.

## Current seed set

The seed records prioritize scene capture, fire sensing, physiology, prehospital/hospital context and geospatial building context. Unknown license and access states are preserved where rights were not established. NEMSIS subset terms limit use to specified not-for-profit purposes and restrict onward sharing; it is not cleared for commercial WaveRadar training. RATIC is noncommercial-only under current terms. BRIGHT has component-specific imagery terms; do not infer data rights from its Apache-2.0 code repository. LADI is identified as CC BY 4.0 by the AWS Registry of Open Data. Microsoft Global ML Building Footprints identifies CDLA Permissive 2.0. OpenStreetMap is ODbL 1.0 and requires attribution and share-alike review.

## Acquisition manifest and integrity verification

The acquisition-manifest utility is local-only: it does not download data or send files anywhere. It reads a dataset directory, computes SHA-256 and byte size for every regular file, captures the source/version/license snapshot, and writes a manifest outside the dataset directory. It rejects symlinks and non-HTTPS source URLs. The verification mode checks the exact file set, byte sizes, SHA-256 digests, and manifest metadata digest; it detects changed, missing, or extra files.

Example (use only after access and license review):

    node scripts/dataset-acquisition-manifest.mjs --root /path/to/dataset --dataset-id wisard-visual-thermal-v1 --source-url https://sites.google.com/uw.edu/wisard/ --version v1-archive-identifier --license-name "verified source license" --license-status VERIFIED --commercial-use UNKNOWN --reviewed-on 2026-11-13 --retrieved-at 2026-11-13T12:00:00.000Z --output /path/outside/dataset/acquisition-manifest.json

Verify later:

    node scripts/dataset-acquisition-manifest.mjs --verify /path/to/acquisition-manifest.json --root /path/to/dataset

The manifest records integrity and metadata state; it does not prove authenticity, lawful access, sensor truth, scientific quality, or clinical validity. Preserve source files unchanged and retain the manifest with the acquisition record.

## Validation

Run:

    node scripts/validate-open-evidence-registry.mjs
    node scripts/test-open-evidence-registry.mjs

The validator enforces stable unique IDs, HTTPS source links, explicit limitations, known status vocabularies, license/commercial-use consistency, and lifecycle ordering. It does not replace legal review, data inspection, scientific quality assessment, or independent validation.

## Relationship to existing architecture

- src/lib/dataContract.js remains the canonical runtime observation contract.
- base44/entities/ScientificSourceRegistry.jsonc remains an existing application entity; this registry does not migrate its stored records or change production schema.
- Dataset records must be mapped through explicit adapters into the canonical observation contract. Source records remain source records; normalized observations retain source IDs, source hashes, original timestamps, units, coordinate frames, calibration, and transformation versions.
- No dataset prediction or annotation may overwrite live measured evidence or directly create a life-safety alert.
