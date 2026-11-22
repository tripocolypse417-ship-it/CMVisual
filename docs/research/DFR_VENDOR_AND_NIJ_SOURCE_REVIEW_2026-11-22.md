# DFR source verification — 2026-11-22 (research only)

Status: public documentation review; no authenticated vendor feed, partner authorization, real telemetry, independent ground truth, deployment or performance measurement.

## Skydio
- Official RTSP External API documentation describes organization-enabled video streams and distinct vehicle RTSP URLs: https://apidocs.skydio.com/reference/rtsp-streaming
- Official live telemetry documentation describes a separate WebSocket endpoint and connectivity requirements: https://apidocs.skydio.com/reference/live-telemetry
- Skydio X10/X10D RTSP/KLV setup documentation, updated 2026-10-21, describes MISB 0601/0903 and STANAG 4609-aligned metadata workflows. These standards do not themselves prove clock synchronization, camera calibration or target geolocation accuracy: https://support.skydio.com/hc/en-us/articles/51920129647387-How-to-set-up-RTSP-and-Telemetry-Streaming-on-the-Skydio-X10-X10D
- Skydio's November 6 Farsight guide documents a third-party edge application producing 2D/3D outputs from video and telemetry. Treat as competitor/vendor claim, not independently benchmarked WaveRadar equivalence: https://support.skydio.com/hc/en-us/articles/58296578020891-How-to-use-Reveal-Farsight-with-Skydio-X10-X10D

## BRINC
- BRINC's Peregrine integration page says telemetry and CAD are available today, with live video support coming soon **for that integration**; do not generalize this limitation to all BRINC interfaces: https://brincdrones.com/integrations/peregrine/
- BRINC CAD API is for sending dispatch calls into LiveOps (an outbound command-like integration), not suitable as a read-only evidence adapter. Do not implement it under WaveRadar's receive-only drone policy: https://brincdrones.com/integrations/brinc-cad-api/

## NIJ grant — time-sensitive
- Official NIJ FY2026 Research and Evaluation on Drones as First Responders, O-NIJ-2026-172805, posted 2026-10-22 and modified 2026-11-05: https://nij.ojp.gov/funding/opportunities/o-nij-2026-172805
- **Two distinct stages:** Grants.gov deadline 2026-11-30 11:59 p.m. ET; JustGrants deadline 2026-12-07 8:59 p.m. ET. Do not confuse the later closing date with the earlier submission deadline.
- WaveRadar LLC remains unregistered/unverified. Do not infer eligibility, award amount, partnership, registrations or readiness without checking the complete NOFO and institution status. No application submitted.

## Next reversible gate
Create a fixture-only adapter test for two authorized video/telemetry sources: deny missing owner authorization, preserve original byte digest and source clock, reject mismatched camera/frame/pose associations, mark unknown world coordinates unavailable, and prove identical incident-event IDs across WIS/helmet/replay without duplicate ledger writes. Benchmark against raw-data equivalent baseline before any performance claim. No live credentials or aircraft operations.
