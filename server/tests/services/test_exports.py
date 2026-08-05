from unittest import TestCase

from app.services.exports import _escape_csv_value


class CsvEscapingTests(TestCase):
    def test_formula_like_values_are_prefixed_with_an_apostrophe(self) -> None:
        self.assertEqual(_escape_csv_value("=SUM(1,1)"), "'=SUM(1,1)")
