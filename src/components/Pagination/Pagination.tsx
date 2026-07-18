import { useId } from 'react'
import { ROWS_PER_PAGE_OPTIONS } from '../../config/settings'
import { ChevronLeftIcon, ChevronRightIcon } from '../icons/Icons'
import styles from './Pagination.module.css'

type PaginationProps = {
  page: number
  totalPages: number
  rowsPerPage: number
  rangeStart: number
  rangeEnd: number
  totalItems: number
  onPageChange: (page: number) => void
  onRowsPerPageChange: (rows: number) => void
}

/**
 * Builds a compact page list with ellipses, e.g. `1 … 4 5 6 … 12`.
 * Always includes the first page, the last page, and the current neighbourhood.
 */
function buildPageList(page: number, totalPages: number): (number | 'gap')[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  const pages = new Set<number>([1, totalPages, page])
  if (page - 1 > 1) pages.add(page - 1)
  if (page + 1 < totalPages) pages.add(page + 1)

  const sorted = [...pages].sort((a, b) => a - b)
  const result: (number | 'gap')[] = []

  sorted.forEach((value, index) => {
    if (index > 0 && value - (sorted[index - 1] as number) > 1) result.push('gap')
    result.push(value)
  })

  return result
}

export function Pagination({
  page,
  totalPages,
  rowsPerPage,
  rangeStart,
  rangeEnd,
  totalItems,
  onPageChange,
  onRowsPerPageChange,
}: PaginationProps) {
  const rowsSelectId = useId()
  const pageList = buildPageList(page, totalPages)

  return (
    <div className={styles.bar}>
      <div className={styles.rowsGroup}>
        <label className={styles.rowsLabel} htmlFor={rowsSelectId}>
          Rows per page:
        </label>
        <select
          id={rowsSelectId}
          className={styles.rowsSelect}
          value={rowsPerPage}
          onChange={(event) => onRowsPerPageChange(Number(event.target.value))}
        >
          {ROWS_PER_PAGE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <nav className={styles.pages} aria-label="Table pagination">
        <button
          type="button"
          className={styles.stepButton}
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          <ChevronLeftIcon size={15} />
        </button>

        {pageList.map((item, index) =>
          item === 'gap' ? (
            <span key={`gap-${index}`} className={styles.ellipsis} aria-hidden="true">
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              className={`${styles.pageButton} ${item === page ? styles.pageActive : ''}`}
              onClick={() => onPageChange(item)}
              aria-label={`Page ${item}`}
              aria-current={item === page ? 'page' : undefined}
            >
              {item}
            </button>
          ),
        )}

        <button
          type="button"
          className={styles.stepButton}
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Next page"
        >
          <ChevronRightIcon size={15} />
        </button>
      </nav>

      <p className={styles.range}>
        {rangeStart} – {rangeEnd} of {totalItems}
      </p>
    </div>
  )
}
