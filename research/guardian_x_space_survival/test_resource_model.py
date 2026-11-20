"""Unit checks for arithmetic only; not system safety validation."""
import unittest
from resource_model import Scenario, evaluate

class TestResourceModel(unittest.TestCase):
    def test_72_hours(self):
        r=evaluate(Scenario())
        self.assertEqual(r["oxygen_metabolic_kg_excluding_leaks"], 2.52)
        self.assertEqual(r["co2_generated_kg_excluding_reserve"], 3.0)
        self.assertEqual(r["electrical_energy_kWh_before_losses"], 3.6)
        self.assertEqual(r["heat_rejection_kWh_not_electricity"], 7.2)
        self.assertIn("UNVERIFIED", r["status"])

    def test_reserve_is_separate(self):
        r=evaluate(Scenario(consumables_reserve_fraction=0.3))
        self.assertEqual(r["oxygen_with_user_selected_reserve_kg"], 3.276)
        self.assertEqual(r["co2_capture_capacity_with_user_selected_reserve_kg"], 3.9)
        self.assertEqual(r["oxygen_metabolic_kg_excluding_leaks"], 2.52)

    def test_rejects_invalid(self):
        for invalid in (-1.0, float("nan"), float("inf")):
            with self.subTest(invalid=invalid):
                with self.assertRaises(ValueError):
                    evaluate(Scenario(duration_hours=invalid))

if __name__ == "__main__":
    unittest.main()
