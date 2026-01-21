"use client";

/**
 * MatchControls Component
 *
 * Search form with strategy selection cards. Users can:
 * - Enter a search query
 * - Select from 4 matching strategies (exact, fuzzy, regex, contains)
 * - Adjust fuzzy matching sensitivity when that strategy is selected
 *
 * The strategy cards provide human-friendly descriptions and use cases
 * to help users choose the right search method without technical knowledge.
 */

import { useState, FormEvent } from "react";
import { STRATEGIES, StrategyInfo } from "../lib/types";

interface MatchControlsProps {
  onSearch: (query: string, strategy: string, threshold: number) => void;
  loading: boolean;
  disabled?: boolean;
}

export default function MatchControls({
  onSearch,
  loading,
  disabled,
}: MatchControlsProps) {
  // Form state - default to Exact Match as the recommended option
  const [query, setQuery] = useState("");
  const [strategy, setStrategy] = useState("exact");
  const [threshold, setThreshold] = useState(0.8); // Fuzzy matching sensitivity

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query, strategy, threshold);
    }
  };

  const selectedStrategy = STRATEGIES.find((s) => s.id === strategy);

  return (
    <form onSubmit={handleSubmit} className="controls">
      <div className="search-group">
        <label htmlFor="query">Search Text</label>
        <div className="search-input-wrapper">
          <input
            id="query"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter text to search..."
            disabled={loading || disabled}
          />
          <button type="submit" disabled={loading || !query.trim() || disabled}>
            {loading ? "..." : "Search"}
          </button>
        </div>
      </div>

      <div className="strategies-section">
        <label>Search Method</label>
        <div className="strategy-cards">
          {STRATEGIES.map((s) => (
            <StrategyCard
              key={s.id}
              strategy={s}
              selected={strategy === s.id}
              onSelect={() => setStrategy(s.id)}
              disabled={loading || disabled}
            />
          ))}
        </div>
      </div>

      {selectedStrategy?.hasThreshold && (
        <div className="threshold-section">
          <label htmlFor="threshold">
            Sensitivity: {Math.round(threshold * 100)}%
          </label>
          <input
            id="threshold"
            type="range"
            min="0.5"
            max="1"
            step="0.05"
            value={threshold}
            onChange={(e) => setThreshold(parseFloat(e.target.value))}
            disabled={loading || disabled}
          />
          <div className="threshold-labels">
            <span>More matches</span>
            <span>Exact only</span>
          </div>
        </div>
      )}

      <style jsx>{`
        .controls {
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
        }

        .search-group {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }

        .search-input-wrapper {
          display: flex;
          gap: var(--space-2);
        }

        .search-input-wrapper input {
          flex: 1;
        }

        .search-input-wrapper button {
          flex-shrink: 0;
        }

        .strategies-section {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }

        .strategy-cards {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }

        .threshold-section {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
          padding: var(--space-3);
          background: var(--color-background);
          border-radius: var(--radius);
        }

        .threshold-labels {
          display: flex;
          justify-content: space-between;
          font-size: 0.75rem;
          color: var(--color-text-secondary);
        }
      `}</style>
    </form>
  );
}

interface StrategyCardProps {
  strategy: StrategyInfo;
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
}

function StrategyCard({
  strategy,
  selected,
  onSelect,
  disabled,
}: StrategyCardProps) {
  return (
    <button
      type="button"
      className={`strategy-card ${selected ? "selected" : ""}`}
      onClick={onSelect}
      disabled={disabled}
    >
      <div className="card-header">
        <span className={`radio ${selected ? "checked" : ""}`} />
        <span className="card-name">{strategy.name}</span>
      </div>
      <p className="card-description">{strategy.description}</p>
      <p className="card-best-for">Best for: {strategy.bestFor}</p>
      {strategy.example && (
        <p className="card-example">
          <code>{strategy.example}</code>
        </p>
      )}

      <style jsx>{`
        .strategy-card {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: var(--space-1);
          padding: var(--space-3);
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius);
          text-align: left;
          cursor: pointer;
          transition: border-color var(--transition-fast),
            background-color var(--transition-fast);
        }

        .strategy-card:hover:not(:disabled) {
          border-color: var(--color-text-secondary);
          background: var(--color-surface);
        }

        .strategy-card.selected {
          border-color: var(--color-accent);
          background: var(--color-surface);
        }

        .strategy-card:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .card-header {
          display: flex;
          align-items: center;
          gap: var(--space-2);
        }

        .radio {
          width: 16px;
          height: 16px;
          border: 2px solid var(--color-border);
          border-radius: 50%;
          transition: border-color var(--transition-fast);
          position: relative;
        }

        .radio.checked {
          border-color: var(--color-accent);
        }

        .radio.checked::after {
          content: "";
          position: absolute;
          top: 3px;
          left: 3px;
          width: 6px;
          height: 6px;
          background: var(--color-accent);
          border-radius: 50%;
        }

        .card-name {
          font-weight: var(--font-weight-semibold);
          color: var(--color-text-primary);
        }

        .card-description {
          margin: 0;
          font-size: var(--font-size-sm);
          color: var(--color-text-secondary);
        }

        .card-best-for {
          margin: 0;
          font-size: 0.75rem;
          color: var(--color-text-secondary);
          font-style: italic;
        }

        .card-example {
          margin: 0;
          font-size: 0.75rem;
        }

        .card-example code {
          padding: 2px 6px;
          background: var(--color-background);
          border-radius: 2px;
          font-family: monospace;
          color: var(--color-text-secondary);
        }
      `}</style>
    </button>
  );
}
