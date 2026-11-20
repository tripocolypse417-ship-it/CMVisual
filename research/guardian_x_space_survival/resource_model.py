"""Guardian X 72-hour resource model. RESEARCH ONLY, NOT LIFE-SAFETY SOFTWARE.

Assumes one person and representative NASA average consumption rates.
Does not model thermal-vacuum feasibility, radiation, pressure control, leaks,
water/food/waste, hardware masses, mission risks or physiological edge cases.
Sources: NASA https://ntrs.nasa.gov/citations/20210026041
https://ntrs.nasa.gov/api/citations/20210013975/downloads/Life%20Support%20Presentation%20to%20Space%20Portal%2004_21_2021%20V2.pdf
"""
from dataclasses import dataclass, asdict
import argparse
import json
import math

O2_KG_PER_DAY = 0.84
CO2_KG_PER_DAY = 1.0
# 2 LiOH + CO2 -> Li2CO3 + H2O; ideal stoichiometric lower bound only
LI_OH_PER_CO2_KG = (2 * 23.95) / 44.01

@dataclass(frozen=True)
class Scenario:
    duration_hours: float = 72.0
    oxygen_kg_per_day: float = O2_KG_PER_DAY
    carbon_dioxide_kg_per_day: float = CO2_KG_PER_DAY
    average_electrical_load_w: float = 50.0  # hypothetical, NOT measured
    average_heat_to_reject_w: float = 100.0  # hypothetical, NOT measured
    consumables_reserve_fraction: float = 0.0  # user-selected, NOT safety-approved

def evaluate(s: Scenario) -> dict:
    for key, value in asdict(s).items():
        if not math.isfinite(value) or value < 0:
            raise ValueError(f"{key} must be a finite nonnegative number")
    if s.duration_hours <= 0:
        raise ValueError("duration_hours must be positive")
    days = s.duration_hours / 24
    factor = 1 + s.consumables_reserve_fraction
    co2 = days * s.carbon_dioxide_kg_per_day * factor
    return {
        "status": "UNVERIFIED_CONCEPT_DO_NOT_USE_FOR_LIFE_SAFETY",
        "duration_h": s.duration_hours,
        "oxygen_metabolic_kg_excluding_leaks": round(days * s.oxygen_kg_per_day, 4),
        "oxygen_with_user_selected_reserve_kg": round(days * s.oxygen_kg_per_day * factor, 4),
        "co2_generated_kg_excluding_reserve": round(days * s.carbon_dioxide_kg_per_day, 4),
        "co2_capture_capacity_with_user_selected_reserve_kg": round(co2, 4),
        "liOH_stoichiometric_lower_bound_kg": round(co2 * LI_OH_PER_CO2_KG, 4),
        "electrical_energy_kWh_before_losses": round(s.average_electrical_load_w * s.duration_hours / 1000, 4),
        "heat_rejection_kWh_not_electricity": round(s.average_heat_to_reject_w * s.duration_hours / 1000, 4),
        "unmodeled": [
            "pressure containment/leaks/purge", "activity peaks", "CO2 cartridge efficiency",
            "thermal-vacuum environment", "oxygen tank mass", "battery mass",
            "safety reserves", "water/food/waste", "radiation", "micrometeoroids",
            "human factors", "fault tolerance", "clinical limits",
        ],
    }

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--hours", type=float, default=72)
    parser.add_argument("--electrical-w", type=float, default=50)
    parser.add_argument("--heat-w", type=float, default=100)
    parser.add_argument("--reserve-fraction", type=float, default=0)
    a = parser.parse_args()
    print(json.dumps(evaluate(Scenario(duration_hours=a.hours,
        average_electrical_load_w=a.electrical_w,
        average_heat_to_reject_w=a.heat_w,
        consumables_reserve_fraction=a.reserve_fraction)), indent=2))

if __name__ == "__main__":
    main()
