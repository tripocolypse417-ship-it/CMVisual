# WaveRadar OS — Transport Registry Foundation

Status: initial provider-neutral software foundation; not a radio driver or deployed network service.

The new transport registry normalizes explicit adapter reports for Wi-Fi, cellular, LMR gateways, 5G sidelink, mesh, satellite, Ethernet and Bluetooth. It keeps hardware support, permission, configuration, active link, freshness, health and message eligibility separate.

Implemented:
- Missing reports remain UNKNOWN; configured capability is not treated as a live connection.
- Explicit preference order and message-class allowlists govern route eligibility.
- Safety-critical selection additionally requires encryption, authenticated peer, acknowledgements and an explicit operational-validation flag.
- Route selection is not a connection attempt, transmission, delivery guarantee or safety certification.
- Deterministic tests cover unsupported, unauthorized, unconfigured, disconnected, stale, degraded and fail-closed cases.

Not implemented: network scanning, credential acquisition, carrier/radio bypass, packet transmission, mesh formation, aircraft control or hardware interoperability. No platform adapter is connected by this module.

Next gates: Android connectivity adapter; authenticated local-peer discovery; key provisioning and replay protection; encrypted durable store-and-forward; provider-authorized LMR/sidelink/mesh/satellite adapters; incident-scoped synchronization; shared WIS/helmet freshness and degradation state.
