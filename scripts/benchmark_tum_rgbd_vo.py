#!/usr/bin/env python3
"""Reproducible RGB-D visual-odometry baseline for TUM fr1/xyz.

This is an offline benchmark only. It uses ORB feature matching plus RGB-D
PnP, without loop closure or global bundle adjustment. The reported ATE uses
rigid SE(3) alignment only (no scale correction). It is not WaveRadar phone
validation or a life-safety capability test.
"""
import argparse
import bisect
import json
import math
import os
import sys
from pathlib import Path

import cv2
import numpy as np
from scipy.spatial.transform import Rotation

FX, FY, CX, CY = 517.3, 516.5, 318.6, 255.3
DEPTH_SCALE = 5000.0


def read_pairs(path):
    rows = []
    for line in Path(path).read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        fields = line.split()
        if len(fields) >= 2:
            try:
                rows.append((float(fields[0]), fields[1]))
            except ValueError:
                continue
    return rows


def read_groundtruth(path):
    rows = []
    for line in Path(path).read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        f = line.split()
        if len(f) < 8:
            continue
        try:
            rows.append((float(f[0]), np.array([float(v) for v in f[1:4]], dtype=np.float64),
                         np.array([float(v) for v in f[4:8]], dtype=np.float64)))
        except ValueError:
            continue
    return rows


def nearest_row(rows, times, t, tolerance):
    i = bisect.bisect_left(times, t)
    candidates = []
    if i < len(rows):
        candidates.append(rows[i])
    if i > 0:
        candidates.append(rows[i - 1])
    if not candidates:
        return None
    best = min(candidates, key=lambda r: abs(r[0] - t))
    return best if abs(best[0] - t) <= tolerance else None


def associate_rgb_depth(root, tolerance=0.02):
    rgb = read_pairs(root / "rgb.txt")
    depth = read_pairs(root / "depth.txt")
    if not rgb or not depth:
        raise RuntimeError("Dataset must contain rgb.txt and depth.txt.")
    d_times = [x[0] for x in depth]
    pairs = []
    for rt, rp in rgb:
        match = nearest_row(depth, d_times, rt, tolerance)
        if match:
            pairs.append((rt, rp, match[1]))
    if len(pairs) < 20:
        raise RuntimeError(f"Only {len(pairs)} synchronized RGB/depth pairs found.")
    return pairs


def depth_at(depth, u, v):
    h, w = depth.shape[:2]
    x, y = int(round(u)), int(round(v))
    if x < 1 or y < 1 or x >= w - 1 or y >= h - 1:
        return None
    patch = depth[y-1:y+2, x-1:x+2].astype(np.float32)
    valid = patch[patch > 0]
    if valid.size == 0:
        return None
    z = float(np.median(valid)) / DEPTH_SCALE
    if not math.isfinite(z) or z <= 0.1 or z > 8.0:
        return None
    return np.array([(u - CX) * z / FX, (v - CY) * z / FY, z], dtype=np.float64)


def kabsch_se3(estimated, reference):
    """Rigid alignment for row-vector point arrays; scale is deliberately fixed."""
    x_mean = estimated.mean(axis=0)
    y_mean = reference.mean(axis=0)
    x = estimated - x_mean
    y = reference - y_mean
    u, _, vt = np.linalg.svd(x.T @ y)
    r = u @ vt
    if np.linalg.det(r) < 0:
        u[:, -1] *= -1
        r = u @ vt
    t = y_mean - x_mean @ r
    return r, t


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dataset", required=True, help="Extracted TUM fr1/xyz dataset directory")
    ap.add_argument("--output", default="benchmark-output")
    ap.add_argument("--frame-step", type=int, default=1)
    ap.add_argument("--max-frames", type=int, default=0, help="0 means all synchronized frames")
    ap.add_argument("--timestamp-tolerance", type=float, default=0.02)
    args = ap.parse_args()
    if args.frame_step < 1:
        ap.error("--frame-step must be at least 1")

    root = Path(args.dataset)
    output = Path(args.output)
    output.mkdir(parents=True, exist_ok=True)
    pairs = associate_rgb_depth(root)
    gt = read_groundtruth(root / "groundtruth.txt")
    if len(gt) < 20:
        raise RuntimeError("Ground-truth trajectory is missing or too short.")
    gt_times = [g[0] for g in gt]
    pairs = pairs[::args.frame_step]
    if args.max_frames:
        pairs = pairs[:args.max_frames]
    if len(pairs) < 20:
        raise RuntimeError("Fewer than 20 frames remain after frame selection.")

    orb = cv2.ORB_create(nfeatures=2200, scaleFactor=1.2, nlevels=8, fastThreshold=12)
    matcher = cv2.BFMatcher(cv2.NORM_HAMMING)
    camera = np.array([[FX, 0, CX], [0, FY, CY], [0, 0, 1]], dtype=np.float64)
    dist = np.zeros((4, 1), dtype=np.float64)

    first_gray = cv2.imread(str(root / pairs[0][1]), cv2.IMREAD_GRAYSCALE)
    first_depth = cv2.imread(str(root / pairs[0][2]), cv2.IMREAD_UNCHANGED)
    if first_gray is None or first_depth is None:
        raise RuntimeError("Could not read first RGB/depth image. Check dataset paths.")
    prev_kp, prev_desc = orb.detectAndCompute(first_gray, None)
    R_world_camera = np.eye(3, dtype=np.float64)
    t_world_camera = np.zeros(3, dtype=np.float64)
    poses = [(pairs[0][0], t_world_camera.copy(), Rotation.from_matrix(R_world_camera).as_quat())]
    pnp_success = 0
    pnp_failures = 0
    inlier_total = 0
    match_total = 0
    processed = 1

    for stamp, rgb_rel, depth_rel in pairs[1:]:
        gray = cv2.imread(str(root / rgb_rel), cv2.IMREAD_GRAYSCALE)
        depth = cv2.imread(str(root / depth_rel), cv2.IMREAD_UNCHANGED)
        if gray is None or depth is None:
            pnp_failures += 1
            continue
        kp, desc = orb.detectAndCompute(gray, None)
        ok = False
        inliers = 0
        if prev_desc is not None and desc is not None and len(prev_kp) >= 12 and len(kp) >= 12:
            knn = matcher.knnMatch(prev_desc, desc, k=2)
            good = [m for pair in knn if len(pair) == 2 for m, n in [pair] if m.distance < 0.75 * n.distance]
            object_points, image_points = [], []
            for m in good:
                p = prev_kp[m.queryIdx].pt
                xyz = depth_at(first_depth, p[0], p[1])
                if xyz is not None:
                    object_points.append(xyz)
                    image_points.append(kp[m.trainIdx].pt)
            match_total += len(object_points)
            if len(object_points) >= 12:
                obj = np.asarray(object_points, dtype=np.float64)
                img = np.asarray(image_points, dtype=np.float64)
                success, rvec, tvec, inlier_idx = cv2.solvePnPRansac(
                    obj, img, camera, dist, iterationsCount=120,
                    reprojectionError=3.0, confidence=0.999,
                    flags=cv2.SOLVEPNP_ITERATIVE
                )
                if success and inlier_idx is not None and len(inlier_idx) >= 10:
                    R_current_previous, _ = cv2.Rodrigues(rvec)
                    t_current_previous = tvec.reshape(3)
                    R_world_previous = R_world_camera.copy()
                    R_world_camera = R_world_previous @ R_current_previous.T
                    t_world_camera = t_world_camera - R_world_previous @ R_current_previous.T @ t_current_previous
                    inliers = int(len(inlier_idx))
                    inlier_total += inliers
                    pnp_success += 1
                    ok = True
        if not ok:
            pnp_failures += 1
        poses.append((stamp, t_world_camera.copy(), Rotation.from_matrix(R_world_camera).as_quat()))
        first_gray, first_depth, prev_kp, prev_desc = gray, depth, kp, desc
        processed += 1

    estimates, references, matched_times = [], [], []
    for stamp, pos, quat in poses:
        ref = nearest_row(gt, gt_times, stamp, args.timestamp_tolerance)
        if ref is not None:
            estimates.append(pos)
            references.append(ref[1])
            matched_times.append(stamp)
    if len(estimates) < 20:
        raise RuntimeError(f"Only {len(estimates)} estimated poses matched ground truth.")
    est = np.asarray(estimates)
    ref = np.asarray(references)
    align_r, align_t = kabsch_se3(est, ref)
    aligned = est @ align_r + align_t
    errors = np.linalg.norm(aligned - ref, axis=1)
    rmse = float(np.sqrt(np.mean(errors ** 2)))
    mae = float(np.mean(errors))
    max_error = float(np.max(errors))
    coverage = len(estimates) / max(1, len(poses))
    success_rate = pnp_success / max(1, pnp_success + pnp_failures)

    tum_path = output / "estimated_trajectory.tum"
    with tum_path.open("w") as f:
        f.write("# TUM trajectory format: timestamp tx ty tz qx qy qz qw\n")
        for stamp, pos, quat in poses:
            f.write(f"{stamp:.9f} {pos[0]:.9f} {pos[1]:.9f} {pos[2]:.9f} "
                    f"{quat[0]:.9f} {quat[1]:.9f} {quat[2]:.9f} {quat[3]:.9f}\n")
    report = {
        "schema": "waveradar.external_visual_odometry_benchmark.v1",
        "evidence_class": "BENCHMARK",
        "algorithm": "OpenCV ORB feature matching + RGB-D PnP visual odometry",
        "dataset": "TUM RGB-D fr1/xyz",
        "dataset_source": "https://cvg.cit.tum.de/data/datasets/rgbd-dataset",
        "method_limitations": [
            "Visual odometry baseline only; no loop closure or global bundle adjustment.",
            "ATE uses rigid SE(3) alignment only; no scale correction.",
            "This is an offline public-dataset benchmark, not live WaveRadar phone data.",
            "A benchmark result does not establish physical accuracy, hazard detection, through-wall sensing, or operational safety."
        ],
        "parameters": {
            "frame_step": args.frame_step,
            "max_frames": args.max_frames,
            "timestamp_tolerance_seconds": args.timestamp_tolerance,
            "depth_scale": DEPTH_SCALE,
            "camera_intrinsics": {"fx": FX, "fy": FY, "cx": CX, "cy": CY},
            "orb_features": 2200,
            "ratio_test": 0.75,
            "pnp_reprojection_threshold_pixels": 3.0,
            "pnp_min_inliers": 10
        },
        "counts": {
            "synchronized_rgb_depth_pairs_selected": len(pairs),
            "estimated_poses_written": len(poses),
            "ground_truth_matched_poses": len(estimates),
            "pnp_successes": pnp_success,
            "pnp_failures_or_skips": pnp_failures,
            "pnp_success_rate": success_rate,
            "mean_pnp_inliers_per_success": inlier_total / max(1, pnp_success),
            "depth_backed_matches_considered": match_total,
            "ground_truth_coverage": coverage
        },
        "metrics": {
            "position_ate_rmse_m_se3": rmse,
            "position_ate_mae_m_se3": mae,
            "position_ate_max_error_m_se3": max_error
        },
        "interpretation": "Algorithm-generated benchmark estimate; not a WaveRadar phone validation result."
    }
    report_path = output / "benchmark-report.json"
    report_path.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))
    if pnp_success < 20:
        raise RuntimeError(f"Too few successful PnP steps ({pnp_success}); report retained but run marked failed.")
    print(f"REPORT={report_path}")
    print(f"TRAJECTORY={tum_path}")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"BENCHMARK_FAILED: {exc}", file=sys.stderr)
        sys.exit(1)
