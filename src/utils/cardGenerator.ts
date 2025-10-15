/**
 * Card Generator - TypeScript Implementation
 * Based on the algorithm from https://gen.caicode.org/
 * 
 * This utility generates virtual card numbers with expiry dates and CVV codes
 * using various input patterns and the Luhn algorithm for validation.
 */

export interface GeneratedCard {
  cardNumber: string;
  month: string;
  year: string;
  cvv: string;
}

export class CardGenerator {
  private currentYear: number;

  constructor() {
    this.currentYear = new Date().getFullYear();
  }

  /**
   * Calculate the Luhn checksum digit for a card number.
   */
  static luhnChecksum(cardNumber: string): number {
    // Remove non-digits
    const digits = cardNumber.replace(/\D/g, '').split('').map(Number);
    let total = 0;
    let isEven = true;

    // Process from right to left
    for (let i = digits.length - 1; i >= 0; i--) {
      let digit = digits[i];
      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }
      total += digit;
      isEven = !isEven;
    }

    return (10 - (total % 10)) % 10;
  }

  /**
   * Validate a card number using the Luhn algorithm.
   */
  static isValidLuhn(cardNumber: string): boolean {
    const digits = cardNumber.replace(/\D/g, '').split('').map(Number);
    let total = 0;
    let isEven = false;

    // Process from right to left
    for (let i = digits.length - 1; i >= 0; i--) {
      let digit = digits[i];
      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }
      total += digit;
      isEven = !isEven;
    }

    return total % 10 === 0;
  }

  /**
   * Generate a random digit (0-9).
   */
  private randomDigit(): string {
    return Math.floor(Math.random() * 10).toString();
  }

  /**
   * Generate a random month (01-12).
   */
  private randomMonth(): string {
    return Math.floor(Math.random() * 12 + 1).toString().padStart(2, '0');
  }

  /**
   * Generate a random year (current year + 1 to 5 years).
   */
  private randomYear(): string {
    return (this.currentYear + Math.floor(Math.random() * 5 + 1)).toString();
  }

  /**
   * Generate a random CVV (100-999).
   */
  private randomCvv(): string {
    return Math.floor(Math.random() * 900 + 100).toString();
  }

  /**
   * Parse the input pattern and split by various separators.
   */
  private parseInputPattern(inputStr: string): string[] {
    const trimmed = inputStr.trim();

    let parts: string[];
    if (trimmed.includes('|')) {
      parts = trimmed.split('|');
    } else if (trimmed.includes('/')) {
      parts = trimmed.split('/');
    } else if (trimmed.includes('-')) {
      parts = trimmed.split('-');
    } else if (trimmed.includes(':')) {
      parts = trimmed.split(':');
    } else if (trimmed.includes(',')) {
      parts = trimmed.split(',');
    } else if (trimmed.includes(' ')) {
      parts = trimmed.split(/\s+/);
    } else {
      parts = [trimmed];
    }

    return parts.map(p => p.trim()).filter(p => p.length > 0);
  }

  /**
   * Detect and describe the input pattern type.
   */
  detectPattern(inputStr: string): string {
    if (!inputStr) {
      return '';
    }

    const parts = this.parseInputPattern(inputStr);
    let modeText = '';

    if (parts.length === 1) {
      const pattern = parts[0];

      if (/^\d{6}$/.test(pattern)) {
        modeText = '🎯 BIN Code Mode (6-digit bank identifier)';
      } else if (/x/i.test(pattern)) {
        modeText = '🎯 X Pattern Generation (x/X = random digits)';
      } else if (pattern.includes('*')) {
        modeText = '🎯 Asterisk Pattern (* = random digits)';
      } else if (pattern.includes('#')) {
        modeText = '🎯 Hash Pattern (# = random digits)';
      } else if (/^\d+$/.test(pattern) && pattern.length > 6) {
        modeText = '🎯 Incomplete Card (auto-complete to 16 digits)';
      } else {
        modeText = '🎯 Custom Card Format';
      }
    } else if (parts.length === 2) {
      modeText = '🎯 Card + Date Mode';
    } else if (parts.length === 3) {
      modeText = '🎯 Three-Part Mode (Card|MM|YY)';
    } else if (parts.length === 4) {
      const randomKeywords = ['(m)', '(y)', '(cvv)', 'mm', 'yy', 'cvv', 'rnd', 'random'];
      const hasRandom = parts.some(part => randomKeywords.includes(part.toLowerCase()));

      if (hasRandom) {
        modeText = '🎯 Smart Random Mode';
      } else {
        modeText = '🎯 Fully Custom Mode';
      }
    } else {
      modeText = '🎯 Multi-Part Custom Format';
    }

    // Detect separator type
    if (inputStr.includes('|')) {
      modeText += ' (Pipe Separated)';
    } else if (inputStr.includes('/')) {
      modeText += ' (Slash Separated)';
    } else if (inputStr.includes('-')) {
      modeText += ' (Dash Separated)';
    } else if (inputStr.includes(':')) {
      modeText += ' (Colon Separated)';
    } else if (inputStr.includes(',')) {
      modeText += ' (Comma Separated)';
    } else if (inputStr.includes(' ')) {
      modeText += ' (Space Separated)';
    }

    return modeText;
  }

  /**
   * Generate a card based on the input pattern.
   */
  generateCardByPattern(pattern: string): GeneratedCard {
    const parts = this.parseInputPattern(pattern);
    let cardNumber = '';
    let month = '';
    let year = '';
    let cvv = '';

    if (parts.length === 1) {
      const inputPart = parts[0];

      // BIN Code Mode (6-digit)
      if (/^\d{6}$/.test(inputPart)) {
        cardNumber = inputPart;
        for (let i = 0; i < 9; i++) {
          cardNumber += this.randomDigit();
        }
        cardNumber += CardGenerator.luhnChecksum(cardNumber).toString();
      }
      // X Pattern
      else if (/x/i.test(inputPart)) {
        cardNumber = inputPart.replace(/[xX]/g, () => this.randomDigit());
        if (cardNumber.length === 15) {
          cardNumber += CardGenerator.luhnChecksum(cardNumber).toString();
        } else if (cardNumber.length === 16) {
          cardNumber = cardNumber.slice(0, -1) + CardGenerator.luhnChecksum(cardNumber.slice(0, -1)).toString();
        }
      }
      // Asterisk Pattern
      else if (inputPart.includes('*')) {
        cardNumber = inputPart.replace(/\*/g, () => this.randomDigit());
        while (cardNumber.length < 15) {
          cardNumber += this.randomDigit();
        }
        cardNumber += CardGenerator.luhnChecksum(cardNumber).toString();
      }
      // Hash Pattern
      else if (inputPart.includes('#')) {
        cardNumber = inputPart.replace(/#/g, () => this.randomDigit());
        while (cardNumber.length < 15) {
          cardNumber += this.randomDigit();
        }
        cardNumber += CardGenerator.luhnChecksum(cardNumber).toString();
      }
      // Pure digits - incomplete card
      else if (/^\d+$/.test(inputPart)) {
        cardNumber = inputPart;
        while (cardNumber.length < 15) {
          cardNumber += this.randomDigit();
        }
        cardNumber += CardGenerator.luhnChecksum(cardNumber).toString();
      }

      // Random month, year, cvv
      month = this.randomMonth();
      year = this.randomYear().slice(-2);
      cvv = this.randomCvv();
    } else if (parts.length >= 2) {
      // Process card number part
      cardNumber = parts[0];

      if (/x/i.test(cardNumber)) {
        cardNumber = cardNumber.replace(/[xX]/g, () => this.randomDigit());
      } else if (cardNumber.includes('*')) {
        cardNumber = cardNumber.replace(/\*/g, () => this.randomDigit());
      } else if (cardNumber.includes('#')) {
        cardNumber = cardNumber.replace(/#/g, () => this.randomDigit());
      }

      // Process month (part 1)
      if (parts.length > 1) {
        const monthPart = parts[1].toLowerCase();
        if (['(m)', 'mm', 'rnd', 'random'].includes(monthPart)) {
          month = this.randomMonth();
        } else {
          month = parts[1].padStart(2, '0');
        }
      }

      // Process year (part 2)
      if (parts.length > 2) {
        const yearPart = parts[2].toLowerCase();
        if (['(y)', 'yy', 'rnd', 'random'].includes(yearPart)) {
          year = this.randomYear().slice(-2);
        } else {
          const yearVal = parts[2];
          if (yearVal.length === 4) {
            year = yearVal.slice(-2);
          } else {
            year = yearVal.padStart(2, '0');
          }
        }
      }

      // Process CVV (part 3)
      if (parts.length > 3) {
        const cvvPart = parts[3].toLowerCase();
        if (['(cvv)', 'cvv', 'rnd', 'random'].includes(cvvPart)) {
          cvv = this.randomCvv();
        } else {
          cvv = parts[3].padStart(3, '0');
        }
      }

      // Special handling for 2-part input
      if (parts.length === 2) {
        const secondPart = parts[1];
        // MMYY format
        if (secondPart.length === 4 && /^\d+$/.test(secondPart)) {
          month = secondPart.slice(0, 2);
          year = secondPart.slice(2, 4);
        }
        // MMYYCVV format (6 digits)
        else if (secondPart.length === 6 && /^\d+$/.test(secondPart)) {
          month = secondPart.slice(0, 2);
          year = secondPart.slice(2, 4);
          cvv = secondPart.slice(4, 6);
        }
      }

      // Complete card number to 16 digits
      while (cardNumber.length < 15) {
        cardNumber += this.randomDigit();
      }

      if (cardNumber.length === 15) {
        cardNumber += CardGenerator.luhnChecksum(cardNumber).toString();
      }
    }

    // Fill in any missing parts with random values
    if (!month) {
      month = this.randomMonth();
    }
    if (!year) {
      year = this.randomYear().slice(-2);
    }
    if (!cvv) {
      cvv = this.randomCvv();
    }

    // Ensure proper formatting
    month = month.padStart(2, '0');
    year = year.padStart(2, '0');
    cvv = cvv.padStart(3, '0');

    return {
      cardNumber,
      month,
      year,
      cvv,
    };
  }

  /**
   * Generate multiple cards based on the pattern.
   */
  generateCards(pattern: string, count: number = 10): GeneratedCard[] {
    if (!pattern.trim()) {
      throw new Error('Pattern cannot be empty!');
    }

    const results: GeneratedCard[] = [];
    let attempts = 0;
    const maxAttempts = count * 10; // Prevent infinite loop

    while (results.length < count && attempts < maxAttempts) {
      attempts++;
      const card = this.generateCardByPattern(pattern);

      // Validate with Luhn algorithm
      if (CardGenerator.isValidLuhn(card.cardNumber)) {
        results.push(card);
      } else {
        console.warn(`⚠️  Invalid card generated (Luhn check failed): ${card.cardNumber}`);
      }
    }

    return results;
  }

  /**
   * Format card number with spaces every 4 digits.
   */
  static formatCardNumber(cardNumber: string): string {
    return cardNumber.replace(/(\d{4})(?=\d)/g, '$1 ');
  }

  /**
   * Format card information for output.
   */
  static formatCardOutput(card: GeneratedCard): string {
    return `${card.cardNumber}|${card.month}|${card.year}|${card.cvv}`;
  }
}

