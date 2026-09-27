import View from "./view.js";
import icons from 'url:../../img/icons.svg';

class PaginationView extends View {
  _parentElement = document.querySelector('.pagination');

  addHandlerClick(handler) {
    this._parentElement.addEventListener('click', function(e) {
      const btn = e.target.closest('.btn--inline')
      
      if (!btn) return

      const goToPage = +btn.dataset.goto

      handler(goToPage)
    })
  }

  _generateMarkupBtn = (curPage, direction) => {
    const markupNext = `
        <button data-goto=${curPage + 1} class="btn--inline pagination__btn--next">
          <span>Page ${curPage + 1}</span>
          <svg class="search__icon">
            <use href="${icons}#icon-arrow-right"></use>
          </svg>
        </button>
      `
    const markupPrev = `
      <button data-goto=${curPage - 1} class="btn--inline pagination__btn--prev">
        <svg class="search__icon">
          <use href="${icons}#icon-arrow-left"></use>
        </svg>
        <span>Page ${curPage - 1}</span>
      </button>
    `
    if (!direction) return markupPrev + markupNext

    if (direction === 'next')
      return markupNext

    if (direction === 'prev')
      return markupPrev
  }

  _generateMarkup() {
    const curPage = this._data.pageNum
    const numPages = Math.ceil(this._data.results.length / this._data.resultsPerPage)


    // Page 1, and there are other pages
    if (curPage === 1 && numPages > 1) {
      return this._generateMarkupBtn(curPage, 'next')
    }

    // Last page
    if (curPage === numPages && numPages > 1) {
      return this._generateMarkupBtn(curPage, 'prev')
    }

    // Other page
    if (curPage < numPages) {
      return this._generateMarkupBtn(curPage)
    }

    // Page 1, and no other pages
    if (curPage === 1 && numPages < 1) {
      return ''
    }
  }
}

export default new PaginationView();