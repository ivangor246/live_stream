import type { StreamStatus } from "../shared/stream.js";
import { useI18n, type TranslationKey } from "../i18n/I18nProvider.js";
import { Button } from "./ui/Button.js";
import { Card } from "./ui/Card.js";
import { SelectField } from "./ui/SelectField.js";

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

  return (
    <Card as="div" className="stream-filters">
      <div className="stream-filters__field">
        <span>{t("streams.filterLabel")}</span>
        <SelectField
          ariaLabel={t("streams.filterLabel")}
          value={filter}
          options={(Object.keys(filterKeys) as StreamFilter[]).map((option) => ({
            value: option,
            label: t(filterKeys[option]),
          }))}
          onChange={(nextFilter) => {
            if (isStreamFilter(nextFilter)) {
              onFilterChange(nextFilter);
            }
          }}
        />
      </div>

      <div className="stream-filters__field">
        <span>{t("streams.sortLabel")}</span>
        <SelectField
          ariaLabel={t("streams.sortLabel")}
          value={sort}
          options={(Object.keys(sortKeys) as StreamSort[]).map((option) => ({
            value: option,
            label: t(sortKeys[option]),
          }))}
          onChange={(nextSort) => {
            if (isStreamSort(nextSort)) {
              onSortChange(nextSort);
            }
          }}
        />
      </div>

      <p className="stream-filters__summary">
        {t("streams.filterSummary", { filter: t(filterKeys[filter]) })}
      </p>

      <Button size="sm" variant="ghost" disabled={!hasChanges} onClick={onReset}>
        {t("streams.resetFilters")}
      </Button>
    </Card>
  );
}
