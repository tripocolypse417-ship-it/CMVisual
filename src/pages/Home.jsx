import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import ScanControls from '../components/ScanControls';
import DetectionPanel from '../components/DetectionPanel';
import StatusBar from '../components/StatusBar';
import SensorGraph from '../components/SensorGraph';
import MovementLog from '../components/MovementLog';
import SnapshotGallery from '../components/SnapshotGallery';
import ManualEntryPanel from '../components/ManualEntryPanel';
import SavedScanLoader from '../components/SavedScanLoader';
import SessionReport from '../components/SessionReport';
import DetectionReportExport from '../components/DetectionReportExport';
import FacebookPromo from '../components/FacebookPromo';
import { base44 } from '@/api/base44Client';
import { Camera as CameraIcon, Volume2, VolumeX, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import useSonarAudio from '../hooks/useSonarAudio';
import useDeviceSensors from '../hooks/useDeviceSensors';
import useNetworkInfo from '../hooks/useNetworkInfo';
import useAcousticProbe from '../hooks/useAcousticProbe';
import useGeolocation from '../hooks/useGeolocation';
import useBattery from '../hooks/useBattery';
import useAmbientLight from '../hooks/useAmbientLight';
import useWakeLock from '../hooks/useWakeLock';
import RealSensorPanel from '../components/RealSensorPanel';
import SonarRangerPanel from '@/components/SonarRangerPanel';
import NetworkSignalPanel from '@/components/NetworkSignalPanel';
import AlertToggle from '../components/AlertToggle';
import HmdOverlay from '../components/HmdOverlay';
import ArControlBar from '../components/ArControlBar';
import SafetyPanel from '../components/SafetyPanel';
import ShareTeamPicker from '../components/ShareTeamPicker';
import useBackgroundAlerts from '../hooks/useBackgroundAlerts';
import useHapticAlerts from '../hooks/useHapticAlerts';
import DetectionCharts from '../components/DetectionCharts';
import useMovementLogger from '../hooks/useMovementLogger';
import useDetectionEngine from '../hooks/useDetectionEngine';
import useSonarRanger from '../hooks/useSonarRanger';
import useSensorBridge from '../hooks/useSensorBridge';
import useSensorReliability from '../hooks/useSensorReliability';
import useSensorConflictResolver from '../hooks/useSensorConflictResolver';
import SensorConnectionPanel from '../components/SensorConnectionPanel';
import PhoneFusionPanel from '../components/PhoneFusionPanel';
import useSpatialWorld from '../hooks/useSpatialWorld';
import { vibrate } from '../lib/haptics';
import LiveDataStatus from '../components/LiveDataStatus';
import CMVisualCommandDeck from '../components/CMVisualCommandDeck';
import UnifiedSpatialWorkspace from '../components/UnifiedSpatialWorkspace';
import useRemoteController from '../hooks/useRemoteController';
import useTrackManager from '../hooks/useTrackManager';
import useTrajectoryPrediction from '../hooks/useTrajectoryPrediction';
import useTrackAnomalies from '../hooks/useTrackAnomalies';
import usePredictionCalibration from '../hooks/usePredictionCalibration';
import usePhysicalOutcomeForecast from '../hooks/usePhysicalOutcomeForecast';
import useWorldTimeline from '../hooks/useWorldTimeline';
import WorldTimelinePanel from '../components/WorldTimelinePanel';
import useFederatedWorld from '../hooks/useFederatedWorld';
import useWorldStateProjection from '../hooks/useWorldStateProjection';
import FederatedWorldPanel from '../components/FederatedWorldPanel';
import useCellularFusion from '../hooks/useCellularFusion';
import useEvidenceAssessment from '../hooks/useEvidenceAssessment';
import EvidenceAssessmentPanel from '../components/EvidenceAssessmentPanel';
import useSpeculativeOutcomeAssessment from '../hooks/useSpeculativeOutcomeAssessment';
import SpeculativeOutcomePanel from '../components/SpeculativeOutcomePanel';
import TargetEvidenceInspector from '../components/TargetEvidenceInspector';
import OneTruthSurface from '../components/OneTruthSurface';
import useAIAnalyst from '../hooks/useAIAnalyst';
import useInferenceRegistry from '../hooks/useInferenceRegistry';
import AIAnalystPanel from '../components/AIAnalystPanel';
import useEvaluationMetrics from '../hooks/useEvaluationMetrics';
import EvaluationReadinessPanel from '../components/EvaluationReadinessPanel';
import useTeamTargetLocks from '../hooks/useTeamTargetLocks';
import TeamTargetQueuePanel from '../components/TeamTargetQueuePanel';
import SensorCapabilityPanel from '../components/SensorCapabilityPanel';
import useSensorCapabilityModel from '../hooks/useSensorCapabilityModel';
import useOpportunisticFusion from '../hooks/useOpportunisticFusion';
import useRuntimeCapacityMonitor from '../hooks/useRuntimeCapacityMonitor';
import useEvidenceBundle from '../hooks/useEvidenceBundle';
import useSituationPicture from '../hooks/useSituationPicture';

const CMVISUAL_SAFE_MODE = false;

export default function Home() {
  const [scanMode, setScanMode] = useState('sonar');
  const [isScanning, setIsScanning] = useState(true);
  const [workspaceMode, setWorkspaceMode] = useState('live');
  const [selectedDetection, setSelectedDetection] = useState(null);
  const [lockedTrackId, setLockedTrackId] = useState(null);
  const [detections, setDetections] = useState([]);
  const [signalStrength, setSignalStrength] = useState(null);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [alertsEnabled, setAlertsEnabled] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraDetections, setCameraDetections] = useState([]);
  const [wallOpacity, setWallOpacity] = useState(35);
  const [trailsEnabled, setTrailsEnabled] = useState(true);
  const [threatAlertsEnabled, setThreatAlertsEnabled] = useState(true);
  const [ghostMode, setGhostMode] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [autoZoom, setAutoZoom] = useState(true);
  const [zoomRange, setZoomRange] = useState(3);
  const zoomMax = 4;
  const [proximityRange, setProximityRange] = useState(2.5);
  const [proximityEnabled, setProximityEnabled] = useState(true);
  const [proximityEvents, setProximityEvents] = useState([]);
  const [proximitySlackOn, setProximitySlackOn] = useState(false);
  const [proximitySlackChannel, setProximitySlackChannel] = useState(null);
  const [proximityChannels, setProximityChannels] = useState([]);
  const [loadingProximityCh, setLoadingProximityCh] = useState(false);
  const [proximitySlackSending, setProximitySlackSending] = useState(false);
  const [lastProximitySlack, setLastProximitySlack] = useState(null);
  const proximityEventSeqRef = useRef(0);
  const proximitySlackRef = useRef({ on: false, channel: null, scanMode: 'sonar', range: 2.5 });
  proximitySlackRef.current = { on: proximitySlackOn, channel: proximitySlackChannel, scanMode, range: proximityRange };
  const lastProximitySlackRef = useRef(0);

  const handleProximityAlert = useCallback((ev) => {
    const eventId = `${ev.timestamp}-${++proximityEventSeqRef.current}`;
    setProximityEvents(prev => [{ id: eventId, distance: ev.distance, timestamp: ev.timestamp }, ...prev].slice(0, 50));
    const cfg = proximitySlackRef.current;
    if (cfg.on && cfg.channel) {
      const now = Date.now();
      if (now - lastProximitySlackRef.current > 8000) {
        lastProximitySlackRef.current = now;
        setLastProximitySlack(now);
        setProximitySlackSending(true);
        base44.functions.invoke('slackAlert', {
          action: 'post',
          channel: cfg.channel,
          event: {
            event_type: 'alert',
            target_type: 'unknown',
            distance: ev.distance,
            moving: true,
            scan_mode: cfg.scanMode,
            summary: `⚠️ Proximity breach — target entered the restricted zone at ${ev.distance.toFixed(1)}m (safety range ${cfg.range.toFixed(1)}m).`,
          },
        }).catch(() => {}).finally(() => setTimeout(() => setProximitySlackSending(false), 800));
      }
    }
  }, []);

  // Load Slack channels when breach alerts are enabled.
  useEffect(() => {
    if (!proximitySlackOn || proximityChannels.length) return;
    setLoadingProximityCh(true);
    base44.functions.invoke('slackAlert', { action: 'list' })
      .then((res) => {
        const ch = res.data?.channels || [];
        setProximityChannels(ch);
        if (ch[0]) setProximitySlackChannel(ch[0].id);
      })
      .catch(() => {})
      .finally(() => setLoadingProximityCh(false));
  }, [proximitySlackOn]);
  const [snapshotSaving, setSnapshotSaving] = useState(false);
  const [teams, setTeams] = useState([]);
  const [shareTeamId, setShareTeamId] = useState(null);
  const allDetectionsRef = useRef([]);
  const cameraDisplayIdsRef = useRef(new Map());
  const nextCameraDisplayIdRef = useRef(1);
  allDetectionsRef.current = [...cameraDetections, ...detections];

  // Unified detection stream for the report panels — merges the real on-screen
  // camera skeletons with real external-sensor targets (namespaced ids so
  // tracker ids never collide) so the reports stay in sync with the AR view.
  const liveDetections = useMemo(() => {
    // Cross-sensor association: external sensors can corroborate a visual track,
    // but they cannot independently turn an unknown signal into a human.
    const normalizeAngle = (a) => ((Number(a) % 360) + 360) % 360;
    const angularDelta = (a, b) => {
      const d = Math.abs(normalizeAngle(a) - normalizeAngle(b));
      return Math.min(d, 360 - d);
    };
    const matchedSensorIds = new Set();
    const cam = cameraDetections.map((d, index) => {
      const rawId = String(d.id ?? `camera-${index}`);
      let displayId = cameraDisplayIdsRef.current.get(rawId);
      if (!displayId) {
        displayId = `PERSON ${String(nextCameraDisplayIdRef.current++).padStart(2, '0')}`;
        cameraDisplayIdsRef.current.set(rawId, displayId);
      }
      const corroborating = detections.filter(s =>
        angularDelta(d.angle ?? 0, s.angle ?? 0) <= 18 &&
        Number.isFinite(Number(d.distance)) && Number.isFinite(Number(s.distance)) &&
        Math.abs(Number(d.distance) - Number(s.distance)) <= Math.max(1.0, Number(d.distance) * 0.3)
      );
      const bestSensor = corroborating.slice().sort((a, b) =>
        Math.abs(Number(a.distance) - Number(d.distance)) - Math.abs(Number(b.distance) - Number(d.distance))
      )[0];
      corroborating.forEach(s => matchedSensorIds.add(s.id));
      return {
        ...d,
        id: `live-${d.id ?? index}`,
        trackId: d.id ?? `camera-${index}`,
        displayId,
        source: corroborating.length ? 'camera+sensor-corroborated' : 'camera',
        sensorSupportCount: corroborating.length,
        sensorSources: corroborating.map(s => s.source || 'external-sensor'),
        corroborated: corroborating.length > 0,
        corroboration: bestSensor ? {
          angleDeltaDeg: angularDelta(d.angle ?? 0, bestSensor.angle ?? 0),
          rangeDeltaM: Math.abs(Number(d.distance) - Number(bestSensor.distance)),
          sensor: bestSensor.source || 'external-sensor',
          confidence: Number.isFinite(Number(bestSensor.confidence)) ? Number(bestSensor.confidence) : null,
        } : null,
        wallLayers: Array.isArray(d.wallLayers) ? d.wallLayers : [],
        heading: ['N','NE','E','SE','S','SW','W','NW'][Math.round(((d.angle ?? 0) % 360) / 45) % 8],
      };
    });
    // Keep non-visual sensor observations visible separately. They remain
    // UNKNOWN/UNCLASSIFIED unless an actual sensor modality identifies them.
    const activeCameraIds = new Set(cameraDetections.map((d, index) => String(d.id ?? `camera-${index}`)));
    cameraDisplayIdsRef.current.forEach((_, id) => {
      if (!activeCameraIds.has(id)) cameraDisplayIdsRef.current.delete(id);
    });
    const radar = detections
      .filter(d => !matchedSensorIds.has(d.id))
      .map(d => ({
        ...d,
        id: `wall-${d.id}`,
        // Stable detector/source key enables selection + lock without claiming
        // identity across sensors. This is an observation track, not a person ID.
        trackId: d.trackId ?? `sensor-${d.source || 'external'}-${d.id}`,
        displayId: d.type === 'human' ? `SENSOR PERSON · ${d.id}` : 'UNCLASSIFIED',
        source: d.source || 'external-sensor',
      }));
    return [...cam, ...radar];
  }, [cameraDetections, detections]);

  // Add bounded client-side track history to the unified observation stream.
  // This derives motion from repeated measurements only; it never creates a target.
  const trackedLiveDetections = useTrackManager(liveDetections);

  // Persistent lock follows the same stable detector track ID used by the
  // tracker. A dropout never retargets the lock to another observation.
  // Instead, the inspector remains on the last selected observation and the
  // UI can explicitly report STALE until the track expires or is unlocked.
  useEffect(() => {
    if (lockedTrackId == null) return;
    const current = trackedLiveDetections.find((d) => String(d.trackId ?? d.id) === String(lockedTrackId));
    if (current) setSelectedDetection(current);
  }, [trackedLiveDetections, lockedTrackId]);

  const handleSelectDetection = useCallback((detection) => {
    setSelectedDetection(detection || null);
  }, []);

  // Persist a sparse operator-focus audit. This records the observation/track
  // selected and the evidence basis available at selection time; it does not
  // identify a person or store raw camera imagery.
  const lastFocusAuditRef = useRef(null);
  useEffect(() => {
    const id = selectedDetection?.trackId ?? selectedDetection?.id;
    if (id == null) return;
    const key = String(id);
    if (lastFocusAuditRef.current === key) return;
    lastFocusAuditRef.current = key;
    base44.entities.FocusLinkAudit?.create?.({
      session_id: sessionIdRef.current || 'session-pending',
      track_id: key,
      selected_at: new Date().toISOString(),
      source_count: Number(selectedDetection?.sensorSupportCount || 0) + 1,
      association_basis: selectedDetection?.corroborated ? 'MEASURED_SPATIAL_CORROBORATION' : 'SINGLE_OBSERVATION_TRACK',
      operator_action: 'SELECT',
    }).catch(() => {});
  }, [selectedDetection]);

  const toggleTrackLock = useCallback((detection) => {
    const id = detection?.trackId ?? detection?.id;
    if (id == null) return;
    setLockedTrackId((current) => {
      if (String(current) === String(id)) return null;
      setSelectedDetection(detection);
      return id;
    });
  }, []);

  // Predictions are derived only from repeated live track measurements. They
  // remain a separate layer and never become measured detections.
  const trajectoryPredictions = useTrajectoryPrediction(trackedLiveDetections);
  const trackAnomalies = useTrackAnomalies(trackedLiveDetections);
  const predictionCalibration = usePredictionCalibration(trajectoryPredictions, trackedLiveDetections);
  const physicalOutcomeForecast = usePhysicalOutcomeForecast(trackedLiveDetections, trajectoryPredictions);
  const geo = useGeolocation();
  const sessionIdRef = useRef(null);
  if (!sessionIdRef.current) sessionIdRef.current = (globalThis.crypto?.randomUUID?.() || `session-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const federatedWorld = useFederatedWorld();
  // Load teams I belong to, for real-time snapshot sharing.
  useEffect(() => {
    base44.entities.Team.list('-created_date', 50)
      .then(setTeams)
      .catch(() => {});
  }, []);

  // Dynamic auto-zoom: update only while the camera is active and the workspace
  // is using current input. This avoids a background timer doing work while the
  // operator is reviewing captured data or the camera is unavailable.
  useEffect(() => {
    if (!autoZoom || !cameraActive || workspaceMode === 'review') return;
    let cancelled = false;
    const update = () => {
      if (cancelled) return;
      let minDist = Infinity;
      allDetectionsRef.current.forEach(d => {
        if (typeof d.distance === 'number' && Number.isFinite(d.distance) && d.distance >= 0 && d.distance < minDist) minDist = d.distance;
      });
      const target = minDist <= zoomRange
        ? Math.max(1, Math.min(zoomMax, 1 + (zoomRange - minDist) * ((zoomMax - 1) / zoomRange)))
        : 1;
      setZoom(z => Math.abs(z - target) < 0.02 ? z : +(z + (target - z) * 0.15).toFixed(2));
    };
    update();
    const id = setInterval(update, 250);
    return () => { cancelled = true; clearInterval(id); };
  }, [autoZoom, cameraActive, workspaceMode, zoomRange, zoomMax]);
  const sensors = useDeviceSensors(true);
  const spatialWorld = useSpatialWorld(detections, sensors.heading, isScanning);
  const network = useNetworkInfo();
  const acoustic = useAcousticProbe();
  const battery = useBattery();
  const ambient = useAmbientLight();
  const wake = useWakeLock();
  const activateAudio = useSonarAudio(audioEnabled ? detections : [], audioEnabled && isScanning, scanMode);
  const alerts = useBackgroundAlerts({ detections, isMoving: sensors.isMoving, enabled: alertsEnabled });
  useHapticAlerts({ detections, cameraDetections, threatAlertsEnabled, enabled: alertsEnabled });
  const sensorBridge = useSensorBridge(isScanning);
  const sensorReliability = useSensorReliability(trackedLiveDetections, sensorBridge.bridgeStats);
  const cellular = useCellularFusion(true);
  const sensorCapabilityModel = useSensorCapabilityModel({
    sensors,
    sensorBridge,
    cameraActive,
    cameraDetections,
    acoustic,
    geo,
    battery,
    ambient,
    network,
    cellular,
    spatialStats: spatialWorld?.stats,
  });
  const opportunisticLiveDetections = useOpportunisticFusion(trackedLiveDetections, {
    sensors,
    geo,
    capabilityModel: sensorCapabilityModel,
    sensorBridge,
  });

  // Timeline + world projection — declared AFTER opportunisticLiveDetections to
  // avoid temporal-dead-zone access to a const not yet initialised.
  const timelineObservations = useMemo(() => [
    ...(Array.isArray(opportunisticLiveDetections) ? opportunisticLiveDetections : []),
    ...(Array.isArray(federatedWorld?.projectableEvents) ? federatedWorld.projectableEvents : []),
  ], [opportunisticLiveDetections, federatedWorld?.projectableEvents]);
  const worldTimeline = useWorldTimeline({ observations: timelineObservations, geo: geo?.pos, sessionId: sessionIdRef.current, enabled: isScanning });
  const isReplay = worldTimeline?.timeline?.live === false;
  const activePredictions = isReplay ? [] : trajectoryPredictions;
  const activeAnomalies = isReplay ? [] : trackAnomalies;
  const activeCalibration = isReplay ? null : predictionCalibration;

  const replayDetections = useMemo(() => {
    if (worldTimeline?.timeline?.live !== false) return trackedLiveDetections;
    return (worldTimeline?.tracks || []).map((track) => {
      const e = track.latest;
      return {
        id: `replay-${track.trackId}`,
        trackId: track.trackId,
        type: e?.type || 'unknown',
        source: e?.source || 'REPLAY',
        evidenceClass: e?.evidenceClass || 'MEASURED',
        distance: e?.distanceM,
        angle: e?.angleDeg,
        moving: e?.moving,
        confidence: e?.confidence,
        uncertaintyM: e?.uncertaintyM,
        derivedTrack: {
          position: e?.position,
          speedMps: e?.speedMps,
          observationCount: track.trail.length,
          status: 'REPLAY',
          trail: track.trail.map(x => ({ x: x.position?.x, z: x.position?.z, t: Date.parse(x.observedAt) })).filter(x => Number.isFinite(x.x) && Number.isFinite(x.z)),
        },
        observedAt: e?.observedAt,
        replay: true,
      };
    });
  }, [worldTimeline, trackedLiveDetections]);

  const worldProjection = useWorldStateProjection({
    live: opportunisticLiveDetections,
    federated: federatedWorld.projectableEvents,
    replay: replayDetections,
    predictions: activePredictions,
    hazards: liveDetections.filter((d) => d?.hazard === true && d?.hazardValidated === true),
  });
  const sensorConflicts = useSensorConflictResolver(opportunisticLiveDetections, sensorReliability);
  const runtimeCapacity = useRuntimeCapacityMonitor({
    activeTargets: opportunisticLiveDetections.length,
    sensorLatencyMs: sensorBridge.bridgeStats?.latencyMs,
    acquisitionHeadroom: sensorCapabilityModel?.acquisitionHeadroom,
    enabled: isScanning,
  });
  const safeTargetCapacity = runtimeCapacity.safeCapacity;
  const teamTargetLocks = useTeamTargetLocks({ liveDetections: opportunisticLiveDetections, deviceId: federatedWorld.deviceId, maxCapacity: safeTargetCapacity });
  useEffect(() => {
    if (!federatedWorld.enabled || !isScanning) return;
    const timer = setInterval(() => federatedWorld.publish(worldTimeline.events.filter((event) => !event.federated), teamTargetLocks.publishable), 5000);
    return () => clearInterval(timer);
  }, [federatedWorld.enabled, federatedWorld.publish, worldTimeline.events, teamTargetLocks.publishable, isScanning]);
  const acquiredTeamTracks = useMemo(() => (Array.isArray(teamTargetLocks?.acquired) ? teamTargetLocks.acquired : []).map(d => d.acquiredDetection).filter(Boolean), [teamTargetLocks?.acquired]);
  const speculativeContext = useMemo(() => ({
    isScanning,
    cameraActive,
    sensorConnected: sensorBridge.connected,
    cellularStatus: cellular?.status,
    acousticAvailable: Boolean(acoustic?.available || acoustic?.status === 'READY' || acoustic?.status === 'LIVE'),
    environmentalAvailable: Boolean(ambient?.available || ambient?.status === 'READY' || ambient?.status === 'LIVE'),
    geolocationAvailable: Boolean(geo?.pos),
    validatedPhysiologyAvailable: false,
  }), [isScanning, cameraActive, sensorBridge.connected, cellular?.status, acoustic?.available, acoustic?.status, ambient?.available, ambient?.status, geo?.pos]);
  const speculativeOutcomeAssessment = useSpeculativeOutcomeAssessment({
    tracks: trackedLiveDetections,
    predictions: trajectoryPredictions,
    physicalForecasts: physicalOutcomeForecast.forecasts,
    sensorReliability,
    sensorConflicts,
    context: speculativeContext,
  });
  useDetectionEngine(setDetections, { isScanning, isMoving: sensors.isMoving, sensorBridge });
  const evidence = useEvidenceAssessment({
    detections,
    cameraDetections,
    tracks: opportunisticLiveDetections,
    sensors,
    network,
    acoustic,
    cellular,
    ambient,
    battery,
    geo,
    sensorConflicts,
    scanMode,
    isScanning,
  });
  const inferenceRegistry = useInferenceRegistry({
    evidence: {
      position: trackedLiveDetections.some(d => Number.isFinite(Number(d?.position?.x)) || Number.isFinite(Number(d?.distance))),
      time: trackedLiveDetections.some(d => d?.observedAt || d?.timestamp),
      validatedHazard: evidence?.state === 'HIGH_CONCERN' && evidence?.validated === true,
      validationScore: Number(evidence?.validationScore ?? evidence?.validation?.score),
      corroborationScore: Number(evidence?.corroborationScore ?? evidence?.validation?.corroboration),
      confidence: trackedLiveDetections.length ? Math.max(...trackedLiveDetections.map(d => Number(d?.confidence) || 0)) : null,
      validatedBiometricSensor: false,
      validatedNeuralSensor: false,
      validatedIdentitySource: false,
      predictionCalibration: Number(activeCalibration?.calibrationScore),
    },
  });
  const aiAnalysis = useAIAnalyst({ detections: opportunisticLiveDetections, cameraDetections, assessment: evidence, physicalOutcomeForecast: isReplay ? [] : physicalOutcomeForecast.forecasts, trackAnomalies: activeAnomalies, predictionCalibration: activeCalibration, inferenceRegistry, isScanning });
  const selectedEvidenceBundle = useEvidenceBundle({
    inferenceId: `track-${selectedDetection?.trackId ?? selectedDetection?.id ?? 'none'}`,
    trackId: selectedDetection?.trackId ?? selectedDetection?.id ?? null,
    observations: selectedDetection ? [selectedDetection, ...(worldTimeline?.events || []).filter(e => String(e.trackId) === String(selectedDetection?.trackId ?? selectedDetection?.id)).slice(-32)] : [],
    predictionCalibration: activeCalibration,
  });
  const situationPicture = useSituationPicture({ observations: opportunisticLiveDetections, selected: selectedDetection, evidenceBundle: selectedEvidenceBundle, aiAnalysis, runtimeCapacity, worldProjection, teamTargetLocks, workspaceMode, scanning: isScanning });
  const evaluation = useEvaluationMetrics({ liveDetections: opportunisticLiveDetections, worldProjection, sensorReliability, sensorConflicts, predictionCalibration: activeCalibration, evidence, bridgeStats: sensorBridge.bridgeStats, worldTimeline });
  useMovementLogger(trackedLiveDetections, scanMode, isScanning, evidence);
  const [sonarOn, setSonarOn] = useState(false);
  const sonar = useSonarRanger({ enabled: sonarOn });
  const remoteController = useRemoteController(true);
  const liveSensorCount = (cameraActive ? 1 : 0) + (sensorBridge.connected ? 1 : 0);

  const addDetection = (d) => { vibrate(30); setDetections(prev => [...prev, d]); };
  const deleteDetection = (id) => setDetections(prev => prev.filter(x => x.id !== id));
  const clearDetections = () => setDetections([]);
  const loadSavedScan = (snap) => {
    try {
      const parsed = JSON.parse(snap.detections_json || '[]')
        .map((d, i) => ({ ...d, id: d.id ?? (Date.now() + i) }));
      setDetections(parsed);
    } catch { setDetections([]); }
  };

  const takeSnapshot = async () => {
    if (snapshotSaving) return;
    setSnapshotSaving(true);
    try {
      const label = `SCAN ${new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
      const team = teams.find(t => t.id === shareTeamId);
      await base44.entities.Snapshot.create({
        label,
        scan_mode: scanMode,
        detection_count: detections.length,
        detections_json: JSON.stringify(detections),
        team_id: team?.id || null,
        shared_emails: team ? (team.member_emails || []) : [],
        team_admin_emails: team ? (team.admin_emails || []) : [],
      });
      vibrate([20, 40, 20]);
    } catch (error) {
      console.error('[CMVisual] snapshot save failed', error);
    } finally {
      setSnapshotSaving(false);
    }
  };

  // Keep the screen awake while actively scanning (real Wake Lock API).
  useEffect(() => {
    if (isScanning && wake.supported) wake.request();
    else if (!isScanning && wake.supported) wake.release();
  }, [isScanning, wake.supported, wake.request, wake.release]);

  const modeColors = { sonar: '#00ff88', thermal: '#ff6633', motion: '#00ccff' };
  const color = modeColors[scanMode] || modeColors.sonar;

  // Edge-glow alert: lights up on significant movement, turns red for threats.
  const movementAlert = detections.some(d => d.moving) || cameraDetections.some(d => d.moving);
  const threatAlert = threatAlertsEnabled && (detections.some(d => d.threat) || cameraDetections.some(d => d.threat));
  const edgeAlertColor = threatAlert ? '#ff2222' : movementAlert ? color : null;
  const workspaceModeMeta = {
    live: 'LIVE · CURRENT INPUT',
    scan: 'SCAN · CAPTURE REAL INPUT',
    analyze: 'ANALYZE · INSPECT OBSERVATIONS',
    review: 'REVIEW · CAPTURED DATA ONLY',
  };

  if (CMVISUAL_SAFE_MODE) {
    return (
      <div className="min-h-screen bg-slate-950 text-white p-4 sm:p-6 font-mono">
        <div className="max-w-6xl mx-auto space-y-4">
          <header className="border border-emerald-400/30 rounded-xl p-4 bg-slate-900">
            <div className="text-emerald-300 text-lg tracking-widest">CMVISUAL — RECOVERY MODE</div>
            <div className="text-slate-400 text-xs mt-1">Application shell restored independently of Live 3D / camera rendering.</div>
          </header>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="border border-white/10 rounded-xl p-4 bg-slate-900"><div className="text-xs text-slate-500">CAMERA</div><div className="text-xl">{cameraActive ? 'ACTIVE' : 'READY'}</div></div>
            <div className="border border-white/10 rounded-xl p-4 bg-slate-900"><div className="text-xs text-slate-500">TRACKS</div><div className="text-xl text-emerald-300">{liveDetections.length}</div></div>
            <div className="border border-white/10 rounded-xl p-4 bg-slate-900"><div className="text-xs text-slate-500">SENSORS</div><div className="text-xl">{liveSensorCount}</div></div>
            <div className="border border-white/10 rounded-xl p-4 bg-slate-900"><div className="text-xs text-slate-500">STATUS</div><div className="text-xl text-amber-300">DIAGNOSTIC</div></div>
          </div>
          <div className="border border-white/10 rounded-xl bg-slate-900 p-4 min-h-[55vh] flex items-center justify-center">
            <div className="text-center space-y-2">
              <div className="text-emerald-300 text-3xl">●</div>
              <div className="text-lg">CMVisual interface is alive</div>
              <div className="text-xs text-slate-400 max-w-md">Live 3D, camera, and sensor modules are isolated while the blank-screen failure is diagnosed. No synthetic human detections are being displayed.</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div data-waveradar-runtime="live-only" className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Live-only runtime: empty sensor state is a valid state; never synthesize targets. */}
      {/* Scanline overlay */}
      <div className="scanline" aria-hidden="true" />

      {/* Animated background grid */}
      <div className="fixed inset-0 hud-grid-bg opacity-100 pointer-events-none" aria-hidden="true" />

      {/* Radial vignette */}
      <div className="fixed inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 80% 80% at 50% 50%, transparent 40%, rgba(0,0,0,0.7) 100%)' }} />

      <LiveDataStatus sensorCount={liveSensorCount} detectionCount={liveDetections.length} />

      <div className="relative z-30 px-3 pt-2">
        <CMVisualCommandDeck
          color={color}
          mode={workspaceMode}
          onModeChange={setWorkspaceMode}
          isScanning={isScanning}
          detections={detections}
          cameraDetections={cameraDetections}
          sensorConnected={sensorBridge.connected}
          cameraActive={cameraActive}
          heading={sensors.heading}
        />
      </div>

      {remoteController && (
        <div className="pointer-events-none fixed bottom-20 right-3 z-40 rounded-md border border-white/15 bg-black/75 px-3 py-1.5 font-mono text-[10px] tracking-wider text-white/70 backdrop-blur">
          REMOTE: CONNECTED
        </div>
      )}

      {/* HMD-style framing overlay — reticle, side rails, tickers */}
      <HmdOverlay
        scanMode={scanMode}
        color={color}
        targetCount={detections.length}
        isScanning={isScanning}
        battery={battery}
        network={network}
        sensors={sensors}
      />

      {/* Edge-glow pulse on movement / threat */}
      {edgeAlertColor && (
        <motion.div className="fixed inset-0 pointer-events-none z-20"
          style={{ boxShadow: `inset 0 0 140px 24px ${edgeAlertColor}` }}
          animate={{ opacity: [0.2, 0.55, 0.2] }}
          transition={{ duration: threatAlert ? 0.9 : 1.6, repeat: Infinity, ease: 'easeInOut' }} />
      )}

      {/* Corner accent lines */}
      <div className="fixed top-0 left-0 w-24 h-24 pointer-events-none" style={{ borderTop: `1px solid ${color}30`, borderLeft: `1px solid ${color}30` }} />
      <div className="fixed top-0 right-0 w-24 h-24 pointer-events-none" style={{ borderTop: `1px solid ${color}30`, borderRight: `1px solid ${color}30` }} />
      <div className="fixed bottom-0 left-0 w-24 h-24 pointer-events-none" style={{ borderBottom: `1px solid ${color}30`, borderLeft: `1px solid ${color}30` }} />
      <div className="fixed bottom-0 right-0 w-24 h-24 pointer-events-none" style={{ borderBottom: `1px solid ${color}30`, borderRight: `1px solid ${color}30` }} />

      {/* Status bar */}
      <div className="relative z-10">
        <StatusBar isScanning={isScanning} scanMode={scanMode} sensors={sensors} network={network} battery={battery} />
      </div>

      {/* Single coherent dashboard — every view live at once, nothing to switch on */}
      <div className="relative z-10 flex-1 overflow-y-auto p-3 space-y-3">
        {/* Unified visual workspace: camera, 3D spatial reconstruction, map and scan floorplan occupy one coordinated viewport. */}
        <div data-workspace-mode={workspaceMode} className="cm-unified-mode">
          <div className="mb-2 flex items-center justify-between gap-2 px-1" aria-live="polite">
            <span className="font-mono text-[8px] tracking-[0.16em] text-white/50">WORKSPACE</span>
            <span className="font-mono text-[8px] tracking-[0.1em]" style={{ color: `${color}cc` }}>{workspaceModeMeta[workspaceMode] || 'LIVE · CURRENT INPUT'}</span>
          </div>
          <UnifiedSpatialWorkspace
            worldProjection={worldProjection}
            situationPicture={situationPicture.picture}
            color={color}
            detections={detections}
            cameraDetections={cameraDetections}
            liveDetections={replayDetections}
            trajectoryPredictions={activePredictions}
            trackAnomalies={activeAnomalies}
            predictionCalibration={activeCalibration}
            physicalOutcomeForecast={isReplay ? [] : physicalOutcomeForecast.forecasts}
            worldTimeline={worldTimeline}
            scanMode={scanMode}
            isScanning={isScanning}
            cameraActive={cameraActive}
            onCameraDetections={setCameraDetections}
            onCameraActive={setCameraActive}
            wallOpacity={wallOpacity}
            onWallOpacity={setWallOpacity}
            trailsEnabled={trailsEnabled}
            zoom={zoom}
            autoZoom={autoZoom}
            zoomRange={zoomRange}
            ghostMode={ghostMode}
            sonar={sonar}
            proximityRange={proximityRange}
            proximityEnabled={proximityEnabled}
            onProximityAlert={handleProximityAlert}
            heading={sensors.heading}
            compassNeedsPermission={sensors.needsPermission}
            onEnableCompass={sensors.requestPermission}
            selectedDetection={selectedDetection}
            onSelectDetection={handleSelectDetection}
            lockedTrackId={lockedTrackId}
            onToggleTrackLock={toggleTrackLock}
            workspaceMode={workspaceMode}
            onWorkspaceModeChange={setWorkspaceMode}
            sensorConnected={sensorBridge.connected}
            lastFrame={sensorBridge.lastFrame}
            bridgeStats={sensorBridge.bridgeStats}
            sensorReliability={sensorReliability}
            sensorConflicts={sensorConflicts}
            cellular={cellular}
          />
          {cameraActive && (
            <ArControlBar
              color={color}
              wallOpacity={wallOpacity}
              onWallOpacity={setWallOpacity}
              trailsEnabled={trailsEnabled}
              onTrailsEnabled={() => setTrailsEnabled(v => !v)}
              threatAlertsEnabled={threatAlertsEnabled}
              onThreatAlertsEnabled={() => setThreatAlertsEnabled(v => !v)}
              zoom={zoom}
              onZoom={setZoom}
              autoZoom={autoZoom}
              onAutoZoom={() => setAutoZoom(v => !v)}
              zoomRange={zoomRange}
              onZoomRange={setZoomRange}
              zoomMax={zoomMax}
              ghostMode={ghostMode}
              onGhostMode={() => setGhostMode(v => !v)}
              proximityEnabled={proximityEnabled}
              onProximityEnabled={() => setProximityEnabled(v => !v)}
              proximityRange={proximityRange}
              onProximityRange={setProximityRange}
            />
          )}
        </div>

        <WorldTimelinePanel timeline={worldTimeline.timeline} cursor={worldTimeline.cursor} setCursor={worldTimeline.setCursor} reset={worldTimeline.reset} color={color} />
        <FederatedWorldPanel federation={federatedWorld} color={color} />
        <EvaluationReadinessPanel evaluation={evaluation} color={color} runtimeCapacity={runtimeCapacity} />

        {/* Evidence layer: validated, auditable activity assessment built from current inputs. */}
        <EvidenceAssessmentPanel assessment={evidence} color={color} />
        <AIAnalystPanel analysis={aiAnalysis} selectedTarget={selectedDetection} color={color} />
        <OneTruthSurface situationPicture={situationPicture} selectedDetection={selectedDetection} color={color} />
        <SpeculativeOutcomePanel
          assessment={speculativeOutcomeAssessment}
          selectedTrackId={lockedTrackId ?? selectedDetection?.trackId ?? selectedDetection?.id}
          color={color}
        />
        <TargetEvidenceInspector
          selected={selectedDetection}
          tracks={trackedLiveDetections}
          sensorReliability={sensorReliability}
          sensorConflicts={sensorConflicts}
          predictionCalibration={activeCalibration}
          physicalOutcomeForecast={isReplay ? [] : physicalOutcomeForecast.forecasts}
          worldTimeline={worldTimeline}
          evidenceBundle={selectedEvidenceBundle}
          situationPicture={situationPicture.picture}
          color={color}
        />

        {/* Live data row: targets + event log + hardware sensors */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="glass-panel rounded-2xl p-3 relative corner-decoration">
            <DetectionPanel detections={trackedLiveDetections} selectedDetection={selectedDetection} onSelectDetection={handleSelectDetection} />
          </div>
          <div className="glass-panel rounded-2xl p-3 relative corner-decoration">
            <TeamTargetQueuePanel locks={teamTargetLocks} color={color} isAdmin={false} deviceId={federatedWorld.deviceId} />
          </div>
          <div className="glass-panel rounded-2xl p-3 relative corner-decoration" style={{ minHeight: 320 }}>
            <MovementLog color={color} />
          </div>
          <div className="glass-panel rounded-2xl p-3 relative corner-decoration">
            <RealSensorPanel color={color} network={network} acoustic={acoustic} geo={geo} battery={battery} ambient={ambient} wake={wake} />
          </div>
          <div className="glass-panel rounded-2xl p-3 relative corner-decoration">
            <SonarRangerPanel color={color} sonar={sonar} onToggle={() => setSonarOn(v => !v)} />
          </div>
          <div className="glass-panel rounded-2xl p-3 relative corner-decoration">
            <SensorConnectionPanel color={color} sensorConnected={sensorBridge.connected} lastFrame={sensorBridge.lastFrame} bridgeStats={sensorBridge.bridgeStats} />
          </div>
          <div className="glass-panel rounded-2xl p-3 relative corner-decoration">
            <PhoneFusionPanel color={color} sensors={sensors} cameraActive={cameraActive} sonar={sonar} acoustic={acoustic} detections={cameraDetections} spatialStats={spatialWorld.stats} />
          </div>
          <div className="glass-panel rounded-2xl p-3 relative corner-decoration">
            <SensorCapabilityPanel color={color} model={sensorCapabilityModel} runtimeCapacity={runtimeCapacity} />
          </div>
          <div className="glass-panel rounded-2xl p-3 relative corner-decoration">
            <NetworkSignalPanel color={color} />
          </div>
        </div>

        {/* Analytics row: signal graph + detection charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="glass-panel rounded-2xl p-3 relative corner-decoration overflow-hidden">
            <SensorGraph detections={detections} isScanning={isScanning} />
          </div>
          <div className="glass-panel rounded-2xl p-3 relative corner-decoration">
            <DetectionCharts detections={trackedLiveDetections} scanMode={scanMode} isScanning={isScanning} color={color} />
          </div>
        </div>

        {/* Controls row: scan mode + manual entry + saved scans + reports + alerts + gallery */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="glass-panel rounded-2xl p-3 relative corner-decoration">
            <ScanControls scanMode={scanMode} onModeChange={setScanMode} isScanning={isScanning} onToggleScan={() => setIsScanning(s => !s)} signalStrength={signalStrength} />
          </div>
          <div className="glass-panel rounded-2xl p-3 relative corner-decoration">
            <ManualEntryPanel detections={detections} onAdd={addDetection} onDelete={deleteDetection} onClear={clearDetections} color={color} sensors={sensors} />
          </div>
          <div className="glass-panel rounded-2xl p-3 relative corner-decoration">
            <SavedScanLoader onLoad={loadSavedScan} color={color} />
          </div>
          <div className="glass-panel rounded-2xl p-3 relative corner-decoration">
            <SessionReport isScanning={isScanning} color={color} />
          </div>
          <div className="glass-panel rounded-2xl p-3 relative corner-decoration">
            <DetectionReportExport color={color} />
          </div>
          <div className="glass-panel rounded-2xl p-3 relative corner-decoration">
            <FacebookPromo color={color} />
          </div>
          <div className="glass-panel rounded-2xl p-3 relative corner-decoration">
            <AlertToggle alerts={alerts} enabled={alertsEnabled} onToggle={() => setAlertsEnabled(v => !v)} color={color} />
          </div>
          <div className="glass-panel rounded-2xl p-3 relative corner-decoration">
            <SafetyPanel
              events={proximityEvents}
              color={color}
              slackOn={proximitySlackOn}
              onSlackToggle={() => setProximitySlackOn(v => !v)}
              channels={proximityChannels}
              channel={proximitySlackChannel}
              onChannelChange={setProximitySlackChannel}
              loadingChannels={loadingProximityCh}
              sending={proximitySlackSending}
              lastSent={lastProximitySlack}
            />
          </div>
          <div className="glass-panel rounded-2xl p-3 relative corner-decoration overflow-y-auto" style={{ maxHeight: 380 }}>
            <SnapshotGallery color={color} />
          </div>
        </div>
      </div>

      {/* Footer HUD bar */}
      <div className="relative z-10 px-4 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] flex items-center justify-between"
        style={{ borderTop: `1px solid ${color}12`, background: 'rgba(1,8,5,0.9)' }}>
        <div className="flex items-center gap-4">
          <span className="font-mono text-[9px] text-muted-foreground">WALLSIGHT v2.4.1</span>
          <span className="w-px h-3 bg-border" />
          <span className="font-mono text-[9px] text-muted-foreground hidden sm:block">LIVE SENSOR DATA · DEVICE-DEPENDENT RANGE/RESOLUTION</span>
          <Link to="/how-it-works" className="font-mono text-[9px] text-muted-foreground hover:text-primary transition-colors">HOW IT WORKS</Link>
          <span className="w-px h-3 bg-border" />
          <Link to="/about" className="font-mono text-[9px] text-muted-foreground hover:text-primary transition-colors">ABOUT</Link>
          <span className="w-px h-3 bg-border" />
          <Link to="/contact" className="font-mono text-[9px] text-muted-foreground hover:text-primary transition-colors">CONTACT</Link>
          <span className="w-px h-3 bg-border" />
          <Link to="/investors" className="font-mono text-[9px] text-muted-foreground hover:text-primary transition-colors">INVESTORS</Link>
          <span className="w-px h-3 bg-border" />
          <Link to="/admin" className="font-mono text-[9px] text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
            <Users className="w-3 h-3" /> TEAM
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <motion.span className="font-mono text-[9px]" style={{ color: `${color}70` }}
            animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2.5, repeat: Infinity }}>
            {detections.length} ACTIVE TARGETS
          </motion.span>
          <span className="font-mono text-[9px]" style={{ color: `${color}50` }}>
            {isScanning ? '◉ SCANNING' : '○ STANDBY'}
          </span>
          <ShareTeamPicker teams={teams} value={shareTeamId} onChange={setShareTeamId} color={color} />
          <button
            onClick={takeSnapshot}
            disabled={snapshotSaving}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md border transition-all"
            style={{ borderColor: `${color}40`, background: `${color}10`, color }}
            title="Save snapshot to gallery (shared with selected team in real time)"
          >
            <CameraIcon className="w-3 h-3" />
            <span className="font-mono text-[9px]">{snapshotSaving ? 'SAVING…' : 'SNAPSHOT'}</span>
          </button>
          <button
            onClick={() => {
              activateAudio();
              setAudioEnabled(v => !v);
            }}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md border transition-all"
            style={{ borderColor: audioEnabled ? `${color}40` : '#ffffff15', background: audioEnabled ? `${color}10` : 'transparent' }}
            title={audioEnabled ? 'Mute sonar audio' : 'Enable sonar audio'}
          >
            {audioEnabled
              ? <Volume2 className="w-3 h-3" style={{ color }} />
              : <VolumeX className="w-3 h-3 text-muted-foreground" />}
            <span className="font-mono text-[9px]" style={{ color: audioEnabled ? color : '#ffffff40' }}>
              {audioEnabled ? 'SFX ON' : 'SFX OFF'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}