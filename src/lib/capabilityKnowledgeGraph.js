/**
 * WaveRadar Capability Knowledge Graph
 *
 * Describes what an interface can reveal, the authorized acquisition path,
 * and the limits of each observation. A catalog entry is not evidence that
 * the hardware or data source is present.
 */
export const KNOWLEDGE_GRAPH_VERSION = '1.0.0';

const entry = (id, family, label, interfaces, reveals, worldModelUses, limitations, access = 'OWNER_AUTHORIZED') => ({
  id, family, label, interfaces, reveals, worldModelUses, access, limitations
});

export const CAPABILITY_KNOWLEDGE = Object.freeze([
  entry('RADIO.WIFI.PASSIVE', 'WIFI', 'Wi-Fi radio environment', ['Android WifiManager scan cache', 'authorized AP/controller API'], ['SSID/BSSID where exposed', 'band/frequency/channel', 'RSSI', 'security advertisement', 'scan age'], ['radio coverage layers', 'network infrastructure candidates', 'repeated-observation correlation'], ['scan cache may be stale or throttled', 'SSID/BSSID do not prove ownership, device identity, or indoor position']),
  entry('RADIO.WIFI.RTT', 'WIFI_RTT', 'Wi-Fi round-trip ranging', ['Android Wi-Fi RTT API', 'compatible authorized responder'], ['distance estimate', 'measurement status', 'uncertainty'], ['ranging anchors', 'local spatial constraints'], ['requires supported phone and responder; range is not identity']),
  entry('RADIO.CELLULAR', 'CELLULAR', 'Cellular radio environment', ['Android TelephonyManager', 'carrier or enterprise API'], ['serving/neighbor cell metadata where exposed', 'radio technology', 'signal metrics', 'observation age'], ['outdoor coverage context', 'coarse radio-region evidence', 'handover context'], ['carrier and OS may redact, cache, or rate-limit fields; not a precise indoor locator']),
  entry('RADIO.BLE.ADVERTISEMENT', 'BLUETOOTH', 'Bluetooth LE advertisements', ['Android BluetoothLeScanner', 'authorized gateway'], ['service UUIDs', 'manufacturer IDs', 'RSSI', 'advertisement timing'], ['possible sensor discovery', 'proximity evidence', 'device capability candidates'], ['advertisements are not proof of sensor function or owner; rotating addresses are not stable identities']),
  entry('RADIO.BLE.GATT', 'BLUETOOTH', 'Bluetooth GATT data', ['Android BluetoothGatt', 'vendor SDK'], ['documented characteristics and descriptors'], ['sensor telemetry', 'equipment state'], ['requires explicit pairing/authorization; encrypted or protected values remain inaccessible']),
  entry('POSITION.GNSS', 'GNSS', 'Satellite navigation observations', ['Android LocationManager/Fused Location Provider', 'GNSS receiver API'], ['position', 'accuracy estimate', 'speed/bearing', 'provider', 'satellite/fix metadata where exposed'], ['geospatial anchoring', 'time-aligned movement', 'outdoor mapping'], ['multipath and indoor attenuation can make fixes unusable']),
  entry('POSITION.UWB', 'UWB', 'Ultra-wideband ranging', ['Android UWB API', 'authorized UWB anchors'], ['range/angle and quality metrics where supported'], ['local positioning', 'anchor geometry', 'spatial constraints'], ['compatible hardware, secure session setup, and authorized anchors required']),
  entry('DISCOVERY.MDNS', 'LAN_DISCOVERY', 'Multicast DNS / DNS-SD services', ['authorized segment collector'], ['advertised service type', 'instance metadata', 'host/port where published'], ['service inventory', 'candidate sensor/gateway catalog'], ['multicast scope and VLAN boundaries limit visibility; advertisement is not data access']),
  entry('DISCOVERY.SSDP', 'LAN_DISCOVERY', 'UPnP / SSDP advertisements', ['authorized segment collector'], ['service/device descriptors and endpoints'], ['candidate cameras, media devices, gateways, and controllers'], ['only visible on reachable segments; endpoint access requires separate authorization']),
  entry('DISCOVERY.DHCP', 'NETWORK_CONTROL', 'DHCP lease inventory', ['owner-authorized router/DHCP API'], ['leased address, lease age, vendor hints where supplied'], ['network asset inventory', 'address history with bounded retention'], ['not a complete inventory; MAC/vendor hints do not identify a person']),
  entry('DISCOVERY.LLDP', 'NETWORK_TOPOLOGY', 'Link Layer Discovery Protocol', ['authorized switch/router collector'], ['neighbor chassis/port and advertised capabilities'], ['physical network topology hints', 'segment mapping'], ['only managed devices/ports that advertise LLDP are visible']),
  entry('DISCOVERY.SNMP', 'NETWORK_CONTROL', 'SNMPv3 managed-device telemetry', ['owner-authorized SNMPv3 collector'], ['interfaces, counters, device health, supported inventory'], ['network health', 'topology and availability'], ['credential scope and MIB support constrain visibility; read-only credentials preferred']),
  entry('IOT.MATTER', 'IOT', 'Matter fabric devices', ['authorized Matter controller/fabric'], ['commissioned nodes, endpoints, clusters, exposed attributes'], ['home/building equipment inventory', 'environmental telemetry'], ['fabric credentials and controller authorization required']),
  entry('IOT.THREAD', 'IOT', 'Thread mesh infrastructure', ['authorized border-router/controller API'], ['mesh topology and node metadata exposed by controller'], ['low-power sensor coverage', 'mesh health'], ['not every Thread node exposes application data']),
  entry('IOT.ZIGBEE', 'IOT', 'Zigbee devices', ['authorized coordinator/hub API'], ['paired device, endpoint, cluster, exposed attributes'], ['environmental and equipment telemetry'], ['must be joined to an authorized mesh; vendor profiles vary']),
  entry('IOT.ZWAVE', 'IOT', 'Z-Wave devices', ['authorized controller/hub API'], ['paired node, command classes, exposed values'], ['environmental and equipment telemetry'], ['controller authorization and vendor-specific mappings required']),
  entry('BUILDING.BACNET', 'BUILDING_SYSTEMS', 'Building automation telemetry', ['owner-approved BACnet/IP gateway'], ['exposed points, units, equipment state, alarms'], ['building systems model', 'environmental state', 'equipment context'], ['site authorization and safety change control; read-only acquisition first']),
  entry('MEDIA.ONVIF', 'CAMERA', 'Network camera metadata/video', ['authorized ONVIF/RTSP endpoint', 'vendor SDK'], ['camera metadata, streams, timestamps, supported imaging modes'], ['visual scene reconstruction', 'camera coverage mapping'], ['explicit camera access and privacy controls required; stream presence is not calibration']),
  entry('SENSOR.THERMAL', 'THERMAL', 'Thermal imaging', ['native thermal SDK', 'authorized external sensor'], ['thermal frame, calibration metadata, temperature range'], ['heat-source mapping', 'hotspot tracking'], ['requires calibrated sensor; apparent temperature is not automatically true temperature']),
  entry('SENSOR.DEPTH', 'DEPTH', 'Depth / LiDAR sensing', ['ARCore/ARKit or depth SDK', 'external LiDAR API'], ['depth map, point cloud, confidence/invalid masks'], ['geometry reconstruction', 'obstacle mapping'], ['range, reflectivity, smoke, and device limits affect quality']),
  entry('SENSOR.MMWAVE', 'MMWAVE', 'Millimeter-wave radar', ['vendor radar SDK', 'authorized radar gateway'], ['range, angle, Doppler, point cloud/track metadata'], ['motion and occupancy hypotheses', 'spatial constraints'], ['requires supported hardware and scene-specific validation; not person identification']),
  entry('ROBOT.DRONE', 'ROBOTICS', 'Drone/robot payload and telemetry', ['operator-approved SDK/API', 'authorized data export'], ['pose, imagery, thermal, LiDAR, battery and payload state'], ['remote scene survey', '3D reconstruction', 'time-aligned coverage'], ['discovery never grants flight/control authority; operator and airspace rules apply']),
  entry('VEHICLE.FLEET', 'VEHICLE', 'Vehicle/apparatus telemetry', ['OEM/fleet API', 'approved isolated CAN/OBD gateway'], ['vehicle state, location, equipment telemetry where exposed'], ['apparatus status', 'incident logistics', 'equipment context'], ['owner authorization and safety-isolated interfaces required']),
  entry('ENV.ANDROID_NATIVE', 'ANDROID_SENSORS', 'Phone-native environmental sensors', ['Android SensorManager'], ['accelerometer, gyroscope, rotation vector, pressure, light, proximity when fitted'], ['device motion/orientation', 'pressure trend', 'local environmental context'], ['sensor inventory varies by model; calibration and mounting matter'])
]);

const BLE_SERVICE_HINTS = Object.freeze({
  '0000181a-0000-1000-8000-00805f9b34fb': { category: 'ENVIRONMENTAL_SENSOR_CANDIDATE', capabilities: ['temperature', 'humidity', 'pressure'] },
  '00001809-0000-1000-8000-00805f9b34fb': { category: 'THERMOMETER_SERVICE_CANDIDATE', capabilities: ['temperature'], sensitivity: 'POTENTIALLY_HEALTH_RELATED' },
  '0000180f-0000-1000-8000-00805f9b34fb': { category: 'BATTERY_SERVICE_CANDIDATE', capabilities: ['battery_level'] },
  '0000180a-0000-1000-8000-00805f9b34fb': { category: 'DEVICE_INFORMATION_SERVICE', capabilities: ['device_manufacturer_metadata'] }
});

export function searchCapabilityKnowledge(query = '') {
  const terms = String(query).toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (!terms.length) return [...CAPABILITY_KNOWLEDGE];
  return CAPABILITY_KNOWLEDGE.filter(item => {
    const haystack = [item.id, item.family, item.label, ...item.interfaces, ...item.reveals, ...item.worldModelUses].join(' ').toLowerCase();
    return terms.every(term => haystack.includes(term));
  });
}

export function classifyBleAdvertisement({ serviceUuids = [], manufacturerIds = [] } = {}) {
  const hints = serviceUuids.map(value => BLE_SERVICE_HINTS[String(value).toLowerCase()]).filter(Boolean);
  const safeHints = hints.filter(hint => hint.sensitivity !== 'POTENTIALLY_HEALTH_RELATED');
  return {
    classification: safeHints.length ? safeHints.map(hint => hint.category) : ['UNCLASSIFIED_ADVERTISEMENT'],
    capabilities: [...new Set(safeHints.flatMap(hint => hint.capabilities))],
    manufacturerIds: manufacturerIds.filter(value => Number.isInteger(value) && value >= 0 && value <= 65535),
    evidenceState: 'MEASURED_ADVERTISEMENT_METADATA',
    interpretationState: safeHints.length ? 'CANDIDATE_ONLY' : 'UNKNOWN',
    limitations: ['Service UUIDs indicate advertised protocol/service hints, not verified sensor hardware or readable measurements', 'Manufacturer identifiers are not a reliable device identity', 'Sensitive or person-related services are not automatically classified or ingested']
  };
}

export function getCapabilityKnowledge(id) {
  return CAPABILITY_KNOWLEDGE.find(item => item.id === id) || null;
}
