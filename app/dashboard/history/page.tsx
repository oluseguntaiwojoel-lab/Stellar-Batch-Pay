"use client";

import { useState, useCallback } from "react";
import { MotionSafe } from "@/components/motion-safe";
import {
  HistoryFilterBar,
  DEFAULT_HISTORY_FILTERS,
  type HistoryFilterValues,
} from "@/components/dashboard/HistoryFilterBar";
import { HistoryTable } from "@/components/dashboard/HistoryTable";
import { Pagination } from "@/components/dashboard/Pagination";
import { MetricsGrid } from "@/components/dashboard/MetricsGrid";
import { HistoryExportCenter } from "@/components/dashboard/HistoryExportCenter";
import { Card, CardContent } from "@/components/ui/card";
import { dateRangeToFrom } from "@/lib/history-filters";

// #360: filter + pagination state is owned by the page so the
// HistoryTable query and Pagination controls actually react to user
// input. Before this change the filter bar's selects were
// uncontrolled, the pagination buttons had no onClick handlers, and
// the MetricsGrid never received aggregated data — the page looked
// enterprise-grade but didn't function.
const DEFAULT_LIMIT = 10;

export default function HistoryPage() {
  const [filters, setFilters] = useState<HistoryFilterValues>(DEFAULT_HISTORY_FILTERS);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  // Reset to page 1 whenever the filters change so a 5-page result
  // doesn't trap the user on page 3 of an empty filtered view.
  const handleFiltersChange = (next: HistoryFilterValues) => {
    setFilters(next);
    setPage(1);
  };

  const handlePaginationLoad = useCallback(({ totalPages: nextTotalPages }: { totalPages: number; total: number }) => {
    setTotalPages(Math.max(1, nextTotalPages));
  }, []);

  return (
    <MotionSafe
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-8"
    >
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-white">Batch Payment History</h1>
        <p className="text-gray-400">
          Review past batch transactions, track payment statuses, and access detailed reports.
        </p>
      </div>

      <MetricsGrid />

      <Card className="border-[#1F2937] bg-[#121827] shadow-lg">
        <CardContent className="p-6">
          <HistoryFilterBar values={filters} onChange={handleFiltersChange} />
        </CardContent>
      </Card>

      <Card className="border-[#1F2937] bg-[#121827] shadow-lg overflow-hidden">
        <CardContent className="p-0 sm:p-6">
          <HistoryTable
            page={page}
            limit={DEFAULT_LIMIT}
            statusFilter={filters.status === "all" ? undefined : filters.status}
            networkFilter={filters.network === "all" ? undefined : filters.network}
            searchFilter={filters.search}
            fromFilter={dateRangeToFrom(filters.dateRange)}
            onPaginationLoad={handlePaginationLoad}
          />
          <div className="px-4 pb-4 sm:px-0 sm:pb-0">
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </div>
        </CardContent>
      </Card>

      <HistoryExportCenter />
    </MotionSafe>
  );
}
