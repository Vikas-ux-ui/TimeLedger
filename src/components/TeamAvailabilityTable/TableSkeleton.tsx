import styles from './TeamAvailabilityTable.module.css'

type TableSkeletonProps = {
  columnCount: number
  rowCount?: number
}

/**
 * Placeholder rows shown while data loads.
 *
 * Deliberately renders no times or durations — showing a plausible-looking
 * calculated value before the data exists would be misleading.
 */
export function TableSkeleton({ columnCount, rowCount = 6 }: TableSkeletonProps) {
  return (
    <>
      {Array.from({ length: rowCount }, (_, rowIndex) => (
        <tr key={rowIndex} aria-hidden="true">
          {Array.from({ length: columnCount }, (_, colIndex) => (
            <td key={colIndex}>
              <div
                className={styles.skeletonLine}
                style={{ width: colIndex === 0 ? '80%' : '60%' }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}
