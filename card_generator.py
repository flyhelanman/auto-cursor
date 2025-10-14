#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Card Generator - Python Implementation
Based on the algorithm from https://gen.caicode.org/

This script generates virtual card numbers with expiry dates and CVV codes
using various input patterns and the Luhn algorithm for validation.
"""

import random
import re
from datetime import datetime
from typing import Dict, List, Tuple


class CardGenerator:
    """
    Card Generator class that implements the card generation algorithm
    with Luhn checksum validation.
    """

    def __init__(self):
        """Initialize the card generator."""
        self.current_year = datetime.now().year

    @staticmethod
    def luhn_checksum(card_number: str) -> int:
        """
        Calculate the Luhn checksum digit for a card number.

        Args:
            card_number: Card number string (may contain non-digits)

        Returns:
            The Luhn checksum digit (0-9)
        """
        # Remove non-digits
        digits = [int(d) for d in card_number if d.isdigit()]
        total = 0
        is_even = True

        # Process from right to left
        for digit in reversed(digits):
            if is_even:
                digit *= 2
                if digit > 9:
                    digit -= 9
            total += digit
            is_even = not is_even

        return (10 - (total % 10)) % 10

    @staticmethod
    def is_valid_luhn(card_number: str) -> bool:
        """
        Validate a card number using the Luhn algorithm.

        Args:
            card_number: Card number string to validate

        Returns:
            True if valid, False otherwise
        """
        # Remove non-digits
        digits = [int(d) for d in card_number if d.isdigit()]
        total = 0
        is_even = False

        # Process from right to left
        for digit in reversed(digits):
            if is_even:
                digit *= 2
                if digit > 9:
                    digit -= 9
            total += digit
            is_even = not is_even

        return total % 10 == 0

    @staticmethod
    def random_digit() -> str:
        """Generate a random digit (0-9)."""
        return str(random.randint(0, 9))

    @staticmethod
    def random_month() -> str:
        """Generate a random month (01-12)."""
        return str(random.randint(1, 12)).zfill(2)

    def random_year(self) -> str:
        """Generate a random year (current year + 1 to 5 years)."""
        return str(self.current_year + random.randint(1, 5))

    @staticmethod
    def random_cvv() -> str:
        """Generate a random CVV (100-999)."""
        return str(random.randint(100, 999))

    @staticmethod
    def parse_input_pattern(input_str: str) -> List[str]:
        """
        Parse the input pattern and split by various separators.

        Args:
            input_str: Input pattern string

        Returns:
            List of parsed parts
        """
        input_str = input_str.strip()

        # Determine separator and split
        if '|' in input_str:
            parts = input_str.split('|')
        elif '/' in input_str:
            parts = input_str.split('/')
        elif '-' in input_str:
            parts = input_str.split('-')
        elif ':' in input_str:
            parts = input_str.split(':')
        elif ',' in input_str:
            parts = input_str.split(',')
        elif ' ' in input_str:
            parts = re.split(r'\s+', input_str)
        else:
            parts = [input_str]

        # Clean up parts
        return [part.strip() for part in parts if part.strip()]

    def detect_pattern(self, input_str: str) -> str:
        """
        Detect and describe the input pattern type.

        Args:
            input_str: Input pattern string

        Returns:
            Description of the detected pattern
        """
        if not input_str:
            return ""

        parts = self.parse_input_pattern(input_str)
        mode_text = ""

        if len(parts) == 1:
            pattern = parts[0]

            if re.match(r'^\d{6}$', pattern):
                mode_text = "🎯 BIN Code Mode (6-digit bank identifier)"
            elif 'x' in pattern.lower():
                mode_text = "🎯 X Pattern Generation (x/X = random digits)"
            elif '*' in pattern:
                mode_text = "🎯 Asterisk Pattern (* = random digits)"
            elif '#' in pattern:
                mode_text = "🎯 Hash Pattern (# = random digits)"
            elif re.match(r'^\d+$', pattern) and len(pattern) > 6:
                mode_text = "🎯 Incomplete Card (auto-complete to 16 digits)"
            else:
                mode_text = "🎯 Custom Card Format"
        elif len(parts) == 2:
            mode_text = "🎯 Card + Date Mode"
        elif len(parts) == 3:
            mode_text = "🎯 Three-Part Mode (Card|MM|YY)"
        elif len(parts) == 4:
            random_keywords = ['(m)', '(y)', '(cvv)', 'mm', 'yy', 'cvv', 'rnd', 'random']
            has_random = any(part.lower() in random_keywords for part in parts)

            if has_random:
                mode_text = "🎯 Smart Random Mode"
            else:
                mode_text = "🎯 Fully Custom Mode"
        else:
            mode_text = "🎯 Multi-Part Custom Format"

        # Detect separator type
        if '|' in input_str:
            mode_text += " (Pipe Separated)"
        elif '/' in input_str:
            mode_text += " (Slash Separated)"
        elif '-' in input_str:
            mode_text += " (Dash Separated)"
        elif ':' in input_str:
            mode_text += " (Colon Separated)"
        elif ',' in input_str:
            mode_text += " (Comma Separated)"
        elif ' ' in input_str:
            mode_text += " (Space Separated)"

        return mode_text

    def generate_card_by_pattern(self, pattern: str) -> Dict[str, str]:
        """
        Generate a card based on the input pattern.

        Args:
            pattern: Input pattern string

        Returns:
            Dictionary with cardNumber, month, year, and cvv
        """
        parts = self.parse_input_pattern(pattern)
        card_number = ""
        month = ""
        year = ""
        cvv = ""

        if len(parts) == 1:
            input_part = parts[0]

            # BIN Code Mode (6-digit)
            if re.match(r'^\d{6}$', input_part):
                card_number = input_part
                for _ in range(9):
                    card_number += self.random_digit()
                card_number += str(self.luhn_checksum(card_number))

            # X Pattern
            elif 'x' in input_part.lower():
                card_number = re.sub(r'[xX]', lambda m: self.random_digit(), input_part)
                if len(card_number) == 15:
                    card_number += str(self.luhn_checksum(card_number))
                elif len(card_number) == 16:
                    card_number = card_number[:-1] + str(self.luhn_checksum(card_number[:-1]))

            # Asterisk Pattern
            elif '*' in input_part:
                card_number = input_part.replace('*', lambda: self.random_digit())
                # Use re.sub for proper replacement
                card_number = re.sub(r'\*', lambda m: self.random_digit(), input_part)
                while len(card_number) < 15:
                    card_number += self.random_digit()
                card_number += str(self.luhn_checksum(card_number))

            # Hash Pattern
            elif '#' in input_part:
                card_number = re.sub(r'#', lambda m: self.random_digit(), input_part)
                while len(card_number) < 15:
                    card_number += self.random_digit()
                card_number += str(self.luhn_checksum(card_number))

            # Pure digits - incomplete card
            elif re.match(r'^\d+$', input_part):
                card_number = input_part
                while len(card_number) < 15:
                    card_number += self.random_digit()
                card_number += str(self.luhn_checksum(card_number))

            # Random month, year, cvv
            month = self.random_month()
            year = self.random_year()[-2:]
            cvv = self.random_cvv()

        elif len(parts) >= 2:
            # Process card number part
            card_number = parts[0]

            if 'x' in card_number.lower():
                card_number = re.sub(r'[xX]', lambda m: self.random_digit(), card_number)
            elif '*' in card_number:
                card_number = re.sub(r'\*', lambda m: self.random_digit(), card_number)
            elif '#' in card_number:
                card_number = re.sub(r'#', lambda m: self.random_digit(), card_number)

            # Process month (part 1)
            if len(parts) > 1:
                month_part = parts[1].lower()
                if month_part in ['(m)', 'mm', 'rnd', 'random']:
                    month = self.random_month()
                else:
                    month = parts[1].zfill(2)

            # Process year (part 2)
            if len(parts) > 2:
                year_part = parts[2].lower()
                if year_part in ['(y)', 'yy', 'rnd', 'random']:
                    year = self.random_year()[-2:]
                else:
                    year_val = parts[2]
                    if len(year_val) == 4:
                        year = year_val[-2:]
                    else:
                        year = year_val.zfill(2)

            # Process CVV (part 3)
            if len(parts) > 3:
                cvv_part = parts[3].lower()
                if cvv_part in ['(cvv)', 'cvv', 'rnd', 'random']:
                    cvv = self.random_cvv()
                else:
                    cvv = parts[3].zfill(3)

            # Special handling for 2-part input
            if len(parts) == 2:
                second_part = parts[1]
                # MMYY format
                if len(second_part) == 4 and second_part.isdigit():
                    month = second_part[:2]
                    year = second_part[2:4]
                # MMYYCVV format (6 digits)
                elif len(second_part) == 6 and second_part.isdigit():
                    month = second_part[:2]
                    year = second_part[2:4]
                    cvv = second_part[4:6]

            # Complete card number to 16 digits
            while len(card_number) < 15:
                card_number += self.random_digit()

            if len(card_number) == 15:
                card_number += str(self.luhn_checksum(card_number))

        # Fill in any missing parts with random values
        if not month:
            month = self.random_month()
        if not year:
            year = self.random_year()[-2:]
        if not cvv:
            cvv = self.random_cvv()

        # Ensure proper formatting
        month = month.zfill(2)
        year = year.zfill(2)
        cvv = cvv.zfill(3)

        return {
            'cardNumber': card_number,
            'month': month,
            'year': year,
            'cvv': cvv
        }

    def generate_cards(self, pattern: str, count: int = 10) -> List[Dict[str, str]]:
        """
        Generate multiple cards based on the pattern.

        Args:
            pattern: Input pattern string
            count: Number of cards to generate (default: 10)

        Returns:
            List of card dictionaries
        """
        if not pattern.strip():
            raise ValueError("Pattern cannot be empty!")

        results = []
        attempts = 0
        max_attempts = count * 10  # Prevent infinite loop

        while len(results) < count and attempts < max_attempts:
            attempts += 1
            card = self.generate_card_by_pattern(pattern)

            # Validate with Luhn algorithm
            if self.is_valid_luhn(card['cardNumber']):
                results.append(card)
            else:
                print(f"⚠️  Invalid card generated (Luhn check failed): {card['cardNumber']}")

        return results

    @staticmethod
    def format_card_number(card_number: str) -> str:
        """
        Format card number with spaces every 4 digits.

        Args:
            card_number: Card number string

        Returns:
            Formatted card number
        """
        return re.sub(r'(\d{4})(?=\d)', r'\1 ', card_number)

    def format_card_output(self, card: Dict[str, str]) -> str:
        """
        Format card information for output.

        Args:
            card: Card dictionary

        Returns:
            Formatted string: Card|MM|YY|CVV
        """
        return f"{card['cardNumber']}|{card['month']}|{card['year']}|{card['cvv']}"


def main():
    """Main function to demonstrate the card generator."""
    generator = CardGenerator()

    # Example patterns
    examples = [
        "434256",
        "4342xxxxxxxx",
        "4342****",
        "434256|12|25|123",
        "434256/12/25/123",
        "434256-12-25-123",
        "434256|(m)|(y)|(cvv)",
        "434256|mm|yy|cvv",
        "434256|1225",
        "434256:rnd:rnd:rnd",
    ]

    print("=" * 80)
    print("Card Generator - Python Implementation")
    print("Based on https://gen.caicode.org/")
    print("=" * 80)
    print()

    # Let user choose a pattern or enter custom
    print("Example patterns:")
    for i, example in enumerate(examples, 1):
        mode = generator.detect_pattern(example)
        print(f"{i}. {example:25s} - {mode}")

    print()
    user_input = input("Enter a pattern or number (1-10) to select, or press Enter for default '434256': ").strip()

    # Check if user entered a number to select from examples
    if user_input.isdigit() and 1 <= int(user_input) <= len(examples):
        pattern = examples[int(user_input) - 1]
        print(f"📌 Selected example #{user_input}: {pattern}")
    elif not user_input:
        pattern = "434256"
    else:
        pattern = user_input

    print()
    print(f"Using pattern: {pattern}")
    print(f"Detected mode: {generator.detect_pattern(pattern)}")
    print()

    # Generate cards
    cards = generator.generate_cards(pattern, count=10)

    print(f"\n{'=' * 80}")
    print(f"Generated {len(cards)} cards:")
    print(f"{'=' * 80}\n")

    for i, card in enumerate(cards, 1):
        formatted = generator.format_card_number(card['cardNumber'])
        output = generator.format_card_output(card)
        is_valid = "✅" if generator.is_valid_luhn(card['cardNumber']) else "❌"

        print(f"{i:2d}. {formatted} | {card['month']}/{card['year']} | CVV: {card['cvv']} {is_valid}")
        print(f"    Output: {output}")

    print(f"\n{'=' * 80}")
    print("All cards copied to clipboard format:")
    print(f"{'=' * 80}\n")

    for card in cards:
        print(generator.format_card_output(card))


if __name__ == "__main__":
    main()

