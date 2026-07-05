import { usePagination, DOTS } from './usePagination'
import './pagination.scss'

const classnames = (...args) => {
  const classes = []
  for (const arg of args) {
    if (typeof arg === 'string') {
      if (arg) classes.push(arg)
    } else if (typeof arg === 'object' && arg !== null) {
      for (const key in arg) {
        if (arg[key]) classes.push(key)
      }
    }
  }
  return classes.join(' ')
}

const Pagination = (props) => {
  const {
    onPageChange,
    totalCount,
    siblingCount = 1,
    currentPage,
    pageSize,
    className,
  } = props

  const paginationRange = usePagination({
    currentPage,
    totalCount,
    siblingCount,
    pageSize,
  })

  // If there are less than 2 times in pagination range we shall not render the component
  if (currentPage === 0 || paginationRange.length < 2) {
    return null
  }

  const onNext = () => {
    onPageChange(currentPage + 1)
  }

  const onPrevious = () => {
    onPageChange(currentPage - 1)
  }

  let lastPage = paginationRange[paginationRange.length - 1]
  return (
    <ul
      className={classnames('pagination-container', {
        [className]: className,
      })}
    >
      {/* Left navigation arrow */}
      <li
        className={classnames('pagination-item', {
          disabled: currentPage === 1,
        })}
      >
        <button
          type="button"
          onClick={onPrevious}
          className="pagination-button"
        >
          <div className="arrow left" />
        </button>
      </li>
      {paginationRange.map((pageNumber, index) => {
        // If the pageItem is a DOT, render the DOTS unicode character
        if (pageNumber === DOTS) {
          return (
            <li
              key={`dots-${index}`}
              className="pagination-item dots"
            >
              &#8230;
            </li>
          )
        }

        // Render our Page Pills
        return (
          <li
            key={pageNumber}
            className={classnames('pagination-item', {
              selected: pageNumber === currentPage,
            })}
          >
            <button
              type="button"
              onClick={() => onPageChange(pageNumber)}
              className="pagination-button"
            >
              {pageNumber}
            </button>
          </li>
        )
      })}
      {/*  Right Navigation arrow */}
      <li
        className={classnames('pagination-item', {
          disabled: currentPage === lastPage,
        })}
      >
        <button
          type="button"
          onClick={onNext}
          className="pagination-button"
        >
          <div className="arrow right" />
        </button>
      </li>
    </ul>
  )
}

export default Pagination
