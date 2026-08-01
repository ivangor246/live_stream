import type { ChangeEvent } from "react";

import type { StreamStatus } from "../shared/stream.js";
import { useI18n, type TranslationKey } from "../i18n/I18nProvider.js";
import { Button } from "./ui/Button.js";
import { Card } from "./ui/Card.js";

export type StreamFilter = "all" | StreamStatus;
export type StreamSort = "newest" | "oldest" | "title";

interface StreamFiltersProps {
  filter: StreamFilter;
  sort: StreamSort;
  hasChanges: boolean;
  onFilterChange: (filter: StreamFilter) => void;
  onSortChange: (sort: StreamSort) => void;
  onReset: () => void;
}

const filterKeys: Record<StreamFilter, TranslationKey> = {
  all: "streams.filterAll",
  scheduled: "status.scheduled",
  live: "status.live",
  finished: "status.finished",
};

const sortKeys: Record<StreamSort, TranslationKey> = {
  newest: "streams.sortNewest",
  oldest: "streams.sortOldest",
  title: "streams.sortTitle",
};

function isStreamFilter(value: string): value is StreamFilter {
  return (
    value === "all" ||
    value === "scheduled" ||
    value === "live" ||
    value === "finished"
  );
}

function isStreamSort(value: string): value is StreamSort {
  return value === "newest" || value === "oldest" || value === "title";
}

export function StreamFilters({
  filter,
  sort,
  hasChanges,
  onFilterChange,
  onSortChange,
  onReset,
}: StreamFiltersProps) {
  const { t } = useI18n();

  function handleFilterChange(event: ChangeEvent<HTMLSelectElement>): void {
    if (isStreamFilter(event.target.value)) {
      onFilterChange(event.target.value);
    }
  }

  function handleSortChange(event: ChangeEvent<HTMLSelectElement>): void {
    if (isStreamSort(event.target.value)) {
      onSortChange(event.target.value);
    }
  }

  return (
    <Card as="div" className="stream-filters">
      <label className="stream-filters__field">
        <span>{t("streams.filterLabel")}</span>
        <select
          aria-label={t("streams.filterLabel")}
          value={filter}
          onChange={handleFilterChange}
        >
          {(Object.keys(filterKeys) as StreamFilter[]).map((option) => (
            <option key={option} value={option}>
              {t(filterKeys[option])}
            </option>
          ))}
        </select>
      </label>

      <label className="stream-filters__field">
        <span>{t("streams.sortLabel")}</span>
        <select
          aria-label={t("streams.sortLabel")}
          value={sort}
          onChange={handleSortChange}
        >
          {(Object.keys(sortKeys) as StreamSort[]).map((option) => (
            <option key={option} value={option}>
              {t(sortKeys[option])}
            </option>
          ))}
        </select>
      </label>

      <p className="stream-filters__summary">
        {t("streams.filterSummary", { filter: t(filterKeys[filter]) })}
      </p>

      <Button size="sm" variant="ghost" disabled={!hasChanges} onClick={onReset}>
        {t("streams.resetFilters")}
      </Button>
    </Card>
  );
}
