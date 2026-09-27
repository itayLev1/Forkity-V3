import icons from 'url:../../img/icons.svg';

export default class View {

  _data;
  // Methods:  
  // accept data and store it to the object 
  render(data, render = true) {
    if (!data || (Array.isArray(data) && data.length === 0)) return this.renderError();

    this._data = data;

    const markup = this._generateMarkup();

    if(!render) return markup;

    this._clear();

    this._parentElement.insertAdjacentHTML('afterbegin', markup);

  }

  //& DOM updating algorithm
  //~ in order to avoid updating the whole view and update only the html nodes that their value has changed, we are going to need to keep a copy of th existing document and also create a new mock document with the new incoming (from the controller/listener) data. then we can compare the two objects and look for changes in the nodes. then we render only the updated nodes without having to refresh the whole view (which is costly).

  update(data) {

    //* update the View data with the new data received by the controller/listener
    this._data = data;

    //* generate new markup with the new incoming data
    // this markup will not be rendered, for now it will be used for the comparison.
    //^ generate new markup
    const newMarkup = this._generateMarkup()

    // generateMarkup() will return a string which will be difficult to compare, the document methods will return an html document with elements we can approach and modify or compare.
    //^ convert to html documents/element
    const newDOM = document.createRange().createContextualFragment(newMarkup)

    //* compare the virtual DOM with the current DOM document and update the current DOM document node values with the new values from the new data 
    //^ selecting/getting the new elements from the new document and storing them in an array
    const newElements = Array.from(newDOM.querySelectorAll('*'))
    // console.log(newElements);

    //^ selecting/getting the current elements from the current parent element and storing them in an array
    const curElements = Array.from(this._parentElement.querySelectorAll('*'))

    //^ looping through elements in both arrays and comparing the element's nodes
    newElements.forEach((NewEl, i) => {
      const curEl = curElements[i]
      // console.log(curEl, NewEl.isEqualNode(curEl));

      // the method isEqualNode compares two nodes with each other. it returns the node's element and false if a change has been made and true if not.

      // the method nodeValue() returns the content of the text node (string), but, only when the content is text (string). this (together with the isEqualNode check) will enable us to modify only the nodes with text content, which is a unique property for the stuff we need to update.

      //^ check if nodes are not equal (changes made) and grabs the node itself to check if it contains text. then modify thr text to update to the new value
      if (
        !NewEl.isEqualNode(curEl) &&
        NewEl.firstChild?.nodeValue.trim() !== ''
      ) {
        // console.log('🍟', NewEl.firstChild.nodeValue.trim());
        curEl.textContent = NewEl.textContent
      }
      //^ update the attributes on the '+' and '-' servings buttons html elements (in order for the controllers's updateServings method to work correctly)
      if (!NewEl.isEqualNode(curEl)) {
        Array.from(NewEl.attributes).forEach(attr => curEl.setAttribute(attr.name, attr.value))
      }
    })

  }

  _clear() {

    this._parentElement.innerHTML = ''

  }

  renderSpinner() {

    const markup = `
    <div class="spinner">
    <svg>
      <use href="${icons}#icon-loader"></use>
    </svg>
  </div>
    `
    this._clear;
    this._parentElement.insertAdjacentHTML('afterbegin', markup);

  }

  renderError(message = this._errorMessage) {

    const markup = `
      <div class="error">
              <div>
                <svg>
                  <use href="${icons}#icon-alert-triangle"></use>
                </svg>
              </div>
              <p>${message}</p>
            </div>
            `

    this._clear;
    this._parentElement.insertAdjacentHTML('afterbegin', markup);

  }

  renderMessage(message = this._message) {

    const markup = `
      <div class="message">
              <div>
                <svg>
                  <use href="${icons}#icon-smile"></use>
                </svg>
              </div>
              <p>${message}</p>
            </div>
            `

    this._clear;
    this._parentElement.insertAdjacentHTML('afterbegin', markup);

  }
}