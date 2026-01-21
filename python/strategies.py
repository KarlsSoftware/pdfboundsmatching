"""Strategy and Factory patterns for text matching algorithms."""

import re
from abc import ABC, abstractmethod
from difflib import SequenceMatcher

from models import Word, BoundingBox


class MatchingStrategy(ABC):
    """Abstract base class for text matching strategies."""

    @abstractmethod
    def find_matches(self, query: str, words: list[Word]) -> list[BoundingBox]:
        """Find all matches for the query in the list of words.

        Args:
            query: The text to search for
            words: List of Word objects extracted from PDF

        Returns:
            List of BoundingBox objects for matched regions
        """
        pass


class ExactMatchStrategy(MatchingStrategy):
    """Case-sensitive exact match strategy."""

    def find_matches(self, query: str, words: list[Word]) -> list[BoundingBox]:
        matches = []
        for word in words:
            if query == word.text:
                matches.append(BoundingBox(
                    x0=word.x0,
                    y0=word.y0,
                    x1=word.x1,
                    y1=word.y1,
                    page=word.page,
                    matched_text=word.text,
                    confidence=1.0
                ))
        return matches


class FuzzyMatchStrategy(MatchingStrategy):
    """Fuzzy matching using difflib.SequenceMatcher."""

    def __init__(self, threshold: float = 0.8):
        self.threshold = threshold

    def find_matches(self, query: str, words: list[Word]) -> list[BoundingBox]:
        matches = []
        for word in words:
            ratio = SequenceMatcher(None, query.lower(), word.text.lower()).ratio()
            if ratio >= self.threshold:
                matches.append(BoundingBox(
                    x0=word.x0,
                    y0=word.y0,
                    x1=word.x1,
                    y1=word.y1,
                    page=word.page,
                    matched_text=word.text,
                    confidence=ratio
                ))
        return matches


class RegexMatchStrategy(MatchingStrategy):
    """Regular expression pattern matching strategy."""

    def find_matches(self, query: str, words: list[Word]) -> list[BoundingBox]:
        matches = []
        try:
            pattern = re.compile(query)
            for word in words:
                if pattern.search(word.text):
                    matches.append(BoundingBox(
                        x0=word.x0,
                        y0=word.y0,
                        x1=word.x1,
                        y1=word.y1,
                        page=word.page,
                        matched_text=word.text,
                        confidence=1.0
                    ))
        except re.error:
            # Invalid regex pattern, return empty matches
            pass
        return matches


class ContainsMatchStrategy(MatchingStrategy):
    """Substring matching: case-insensitive, matches partial words."""

    def find_matches(self, query: str, words: list[Word]) -> list[BoundingBox]:
        matches = []
        normalized_query = query.lower().strip()
        for word in words:
            normalized_word = word.text.lower().strip()
            if normalized_query in normalized_word:
                matches.append(BoundingBox(
                    x0=word.x0,
                    y0=word.y0,
                    x1=word.x1,
                    y1=word.y1,
                    page=word.page,
                    matched_text=word.text,
                    confidence=1.0
                ))
        return matches


class StrategyFactory:
    """Factory for creating matching strategy instances."""

    _strategies = {
        "exact": ExactMatchStrategy,
        "fuzzy": FuzzyMatchStrategy,
        "regex": RegexMatchStrategy,
        "contains": ContainsMatchStrategy,
    }

    @classmethod
    def create(cls, name: str, **kwargs) -> MatchingStrategy:
        """Create a matching strategy by name.

        Args:
            name: Strategy name (exact, fuzzy, regex, contains)
            **kwargs: Additional arguments passed to strategy constructor

        Returns:
            MatchingStrategy instance

        Raises:
            ValueError: If strategy name is not found
        """
        if name not in cls._strategies:
            raise ValueError(f"Unknown strategy: {name}. Available: {list(cls._strategies.keys())}")
        return cls._strategies[name](**kwargs)

    @classmethod
    def available_strategies(cls) -> list[str]:
        """Get list of available strategy names."""
        return list(cls._strategies.keys())
