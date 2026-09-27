import View from "./view.js";
import previewView from "./previewView.js";
import icons from 'url:../../img/icons.svg';

class BookmarksView extends View {
  _parentElement = document.querySelector('.bookmarks__list');

  _errorMessage = `No bookmarks yet. Find a nice recipe and bookmark it 😀`;
  
  _message = '';

  addHandlerRender(handler) {
    window.addEventListener('load', handler);
  }

  renderEmpty(message) {
    const item = document.createElement('li');
    item.className = 'message';
    item.textContent = message;
    this._parentElement.replaceChildren(item);
  }

  render(data) {
    if (!data?.length) {
      this.renderEmpty('No bookmarks saved yet.');
      return;
    }
    super.render(data);
  }

  _generateMarkup() {

    return this._data.map(bookmark => previewView.render(bookmark, false)).join('');

  }
}

export default new BookmarksView();