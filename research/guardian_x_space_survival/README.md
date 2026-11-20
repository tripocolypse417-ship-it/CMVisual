# Guardian X Space Rescue: 72-hour emergency survival, pre-feasibility study

**State: concept, NOT a space-rated or human-safe device.** This is a limited arithmetic model, not a PLSS, suit controller, clinical resource allocator, certification analysis or an assertion of feasibility. Tracked in [issue #110](https://github.com/tripocolypse417-ship-it/CMVisual/issues/110).

**Mission objective:** One first responder remains alive for 72 hours after losing all external vehicle/habitat support, assuming suit pressure integrity remains functional. Continuous 72-hour active EVA is **not** claimed. A deployable responder-carried emergency refuge is the preferred **unproven** architecture for a trade study, not a built module.

## Quick test
```sh
cd research/guardian_x_space_survival
python3 -m unittest -v test_resource_model.py
python3 resource_model.py --hours 72 --reserve-fraction 0.3 --electrical-w 50 --heat-w 100
```

**Parameters are illustrative**: at 72 h, typical metabolic oxygen 0.84 kg/day yields 2.52 kg O2 (not counting leakage); 1 kg/day CO2 yields 3 kg CO2 to remove. An assumed 50 W electrical load for 72 h equals 3.6 kWh before losses; 100 W thermal load equals 7.2 kWh of heat that must be removed or stored. Heat energy and battery energy are *not interchangeable*. A 30% reserve parameter is only an exploratory scenario, **not a verified safety margin**. Chemical LiOH lower-bound calculations ignore cartridge effectiveness and packaging.

**Not modeled:** actual mass, volume, pressure/leak rates, oxygen tank system, thermal management/radiators, battery chemistries, water/food/waste, altered physiology, puncture/damage survival, radiation, micrometeoroids, redundancy and fault tolerance. These are **gating unknowns** before any claim that 72 hours is physically viable.

## Test / review gate
No humans or unqualified vacuum/pressure experiments. Start with source review, physics-based mass-and-energy budgets, failure mode and hazard analysis, and supervised bench-only testing. Engage independent aerospace life-support and spacesuit safety experts before any future human exposure.

NASA sources:
- [NASA Life Support Presentation](https://ntrs.nasa.gov/api/citations/20210013975/downloads/Life%20Support%20Presentation%20to%20Space%20Portal%2004_21_2021%20V2.pdf)
- [NASA ECLSS carbon dioxide](https://ntrs.nasa.gov/citations/20210026041)
- [NASA Spacesuit standards](https://www.nasa.gov/reference/11-0-spacesuits-vol-2/)
