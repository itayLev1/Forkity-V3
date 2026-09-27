// import { log10 } from "core-js/core/number";
import View from "./view.js";
import icons from 'url:../../img/icons.svg';

class AddRecipeView extends View {
  _parentElement = document.querySelector('.upload');
  _message = 'Recipe was successfully uploaded :-)'
  _window = document.querySelector('.add-recipe-window');
  _overlay = document.querySelector('.overlay');
  _btnOpen = document.querySelector('.nav__btn--add-recipe');
  _btnClose = document.querySelector('.btn--close-modal');
  _statusElement = document.querySelector('.upload__status');

  constructor() {
    super()
      this.addHandlerShowWindow();
      this.addHandlerHideWindow()
  }

  toggleWindow() {
    const isClosing = !this._window.classList.contains('hidden');
    this._overlay.classList.toggle('hidden');
    this._window.classList.toggle('hidden');
    if (isClosing) this.reset();
  }

  reset() {
    this._parentElement.reset();
    this._statusElement.replaceChildren();
  }

  renderSpinner() {
    this._statusElement.innerHTML = `
      <div class="spinner">
        <svg><use href="${icons}#icon-loader"></use></svg>
      </div>
    `;
  }

  renderError(message) {
    this._renderFeedback(message, 'error');
  }

  renderMessage(message = this._message) {
    this._renderFeedback(message, 'success');
  }

  _renderFeedback(message, type) {
    const feedback = document.createElement('p');
    feedback.className = `upload__feedback upload__feedback--${type}`;
    feedback.setAttribute('role', type === 'error' ? 'alert' : 'status');
    feedback.textContent = message;
    this._statusElement.replaceChildren(feedback);
  }
  
  addHandlerShowWindow() {
    this._btnOpen.addEventListener('click', this.toggleWindow.bind(this))
  }

  
  addHandlerHideWindow() {
    this._btnClose.addEventListener('click', this.toggleWindow.bind(this))
    this._overlay.addEventListener('click', this.toggleWindow.bind(this))
  }
  
  addHandlerUpload(handler) {
    this._parentElement.addEventListener('submit', function(e) {
      e.preventDefault();
      const dataArr = [...new FormData(this)]; // using deconstruction together with the spread operator will give the object in an array.
      // console.log(dataArr);
      const data = Object.fromEntries(dataArr)
      handler(data)
    })
  }
  
  generateMarkup() {
    
  }
}

export default new AddRecipeView();