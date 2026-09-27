/*
// import icons from '../img/icons.svg'; // Parcel 1
import icons from 'url:../img/icons.svg'; // Parcel 2
import 'core-js/stable'; // polyfill (translating to ES5)  
import 'regenerator-runtime/runtime' // polyfill async await functions.


const recipeContainer = document.querySelector('.recipe');

const timeout = function (s) {
  return new Promise(function (_, reject) {
    setTimeout(function () {
      reject(new Error(`Request took too long! Timeout after ${s} second`));
    }, s * 1000);
  });
};

// https://forkify-api.herokuapp.com/v2

///////////////////////////////////////
const renderSpinner = function(parentEl) {
  const markup = `
  <div class="spinner">
  <svg>
    <use href="${icons}#icon-loader"></use>
  </svg>
</div>
  `
  parentEl.innerHTML = '';
  parentEl.insertAdjacentHTML('afterbegin', markup);
}


const showRecipe = async function () {
  try {
    const id = window.location.hash.slice(1);
    console.log(id);

    if (!id) return

    //* 1) Loading recipe
    renderSpinner(recipeContainer)
    // fetching and rendering chosen recipe
    const res = await fetch(`https://forkify-api.herokuapp.com/api/v2/recipes/${id}`); // returns Promise
    // const res = await fetch('https://forkify-api.herokuapp.com/api/v2/recipes/5ed6604591c37cdc054bcfb2'); // returns Promise // another check with a specific recipe.
    const data = await res.json() // data

    // check for errors
    if (!res.ok) throw new Error(`${data.message} (${res.status})`)

    // reformating the recipe object
    let { recipe } = data.data;
    recipe = {
      id: recipe.id,
      title: recipe.title,
      publisher: recipe.publisher,
      sourceUrl: recipe.source_url,
      image: recipe.image_url,
      servings: recipe.servings,
      cookingTime: recipe.cooking_time,
      ingredients: recipe.ingredients,
    }
    console.log(recipe);


    //* 2) Rendering recipe
    const markup = `
    <figure class="recipe__fig">
    <img src="${recipe.image}" alt="${recipe.image}" class="recipe__img" />
    <h1 class="recipe__title">
      <span>${recipe.title}</span>
    </h1>
  </figure>

  <div class="recipe__details">
    <div class="recipe__info">
      <svg class="recipe__info-icon">
        <use href="${icons}#icon-clock"></use>
      </svg>
      <span class="recipe__info-data recipe__info-data--minutes">${recipe.cookingTime}</span>
      <span class="recipe__info-text">minutes</span>
    </div>
    <div class="recipe__info">
      <svg class="recipe__info-icon">
        <use href="${icons}#icon-users"></use>
      </svg>
      <span class="recipe__info-data recipe__info-data--people">${recipe.servings}</span>
      <span class="recipe__info-text">servings</span>

      <div class="recipe__info-buttons">
        <button class="btn--tiny btn--increase-servings">
          <svg>
            <use href="${icons}#icon-minus-circle"></use>
          </svg>
        </button>
        <button class="btn--tiny btn--increase-servings">
          <svg>
            <use href="${icons}#icon-plus-circle"></use>
          </svg>
        </button>
      </div>
    </div>

    <div class="recipe__user-generated">
      <svg>
        <use href="${icons}#icon-user"></use>
      </svg>
    </div>
    <button class="btn--round">
      <svg class="">
        <use href="${icons}#icon-bookmark-fill"></use>
      </svg>
    </button>
  </div>

  <div class="recipe__ingredients">
    <h2 class="heading--2">Recipe ingredients</h2>
    <ul class="recipe__ingredient-list">
      ${recipe.ingredients.map(ing => {
        return `
          <li class="recipe__ingredient">
            <svg class="recipe__icon">
              <use href="${icons}#icon-check"></use>
            </svg>
            <div class="recipe__quantity">${ing.quantity}</div>
            <div class="recipe__description">
              <span class="recipe__unit">${ing.unit}</span>
              ${ing.description}
            </div>
          </li>    
        `
      }).join('')}
  </div>

  <div class="recipe__directions">
    <h2 class="heading--2">How to cook it</h2>
    <p class="recipe__directions-text">
      This recipe was carefully designed and tested by
      <span class="recipe__publisher">${recipe.publisher}</span>. Please check out
      directions at their website.
    </p>
    <a
      class="btn--small recipe__btn"
      href="${recipe.sourceUrl}"
      target="_blank"
    >
      <span>Directions</span>
      <svg class="search__icon">
        <use href="${icons}#icon-arrow-right"></use>
      </svg>
    </a>
  </div>
    `

    recipeContainer.innerHTML = '';
    recipeContainer.insertAdjacentHTML('afterbegin', markup)
  }
  catch (err) {
    alert(err)
  }
}

//* a nicer way of listening to multiple events that trigger the same action
eventTypes = ['hashchange', 'load']; 
eventTypes.forEach(ev => window.addEventListener(ev, showRecipe)); // deferent from instructors code, I had to store the array in a variable.

['hashchange', 'load'].forEach(ev => window.addEventListener(ev, showRecipe)); // instructors way, it didnt trigger.

//* listening to hash and load
// window.addEventListener('hashchange', showRecipe)
// window.addEventListener('load', showRecipe)
*/


/////////////////////////////////////////////////////////////
//& Lesson: Refactoring for MVC (Model - View - Controller)
//~ The model part (module): holds the program state and state manipulation functions, holds the business logic and holds the HTTP library to connect to outside resources on the web. this part listens to changes in the state and reacts on them.
//~ The view part (class) (module): responsible for presentation logic and rendering.
//~ The controller part (module): responsible for application logic, it acts as a bridge between the model and the view parts. also helps separate the view from the model and the data. this part handles UI events and dispatches tasks to the model and the view parts.
//~ So the execution goes from the user to the controller which in its turn runs processes in the model and view parts. the data on the other hand flows from the web or any API to the model and together with the data from the state they are passed to the controller which uses this data to give instructions to the view part and render to the screen according to the state and state changes triggered by the user.


import * as model from './model.js';
import { MODAL_CLOSE_SEC } from './config.js';
import recipeView from './views/recipeView.js';
import searchView from './views/searchView.js';
import resultsView from './views/resultsView.js';
import paginationView from './views/paginationView.js';
import bookmarksView from './views/bookmarksView.js';
import addRecipeView from './views/addRecipeView.js';

import 'core-js/stable';
import 'regenerator-runtime/runtime';


// if (module.hot) {
//   module.hot.accept();
// }

const controlRecipes = async function () {
  try {

    const id = window.location.hash.slice(1);

    if (!id) return;

    recipeView.renderSpinner();

    //* update results view to update selected search result
    resultsView.update(model.getSearchResultsPage())

    //* update bookmarks view from localhost
    bookmarksView.update(model.state.bookmarks)
    
    //* Load recipe.
    await model.loadRecipe(id);

    //* Render recipe
    recipeView.render(model.state.recipe);
    
  }
  catch (err) {
    console.log(`controlRecipes Error 😎: ${err}`);
    recipeView.renderError();
  }

  // for TESTING
  controlServings();
}

const controlSearchResults = async () => {
  try {
    resultsView.renderSpinner();
    //* get search query
    const query = searchView.getQuery();
    if (!query) return;

    //* set state with new search results
    await model.loadSearchResults(query);

    //* render results
    resultsView.render(model.getSearchResultsPage());

    //* render pagination buttons
    paginationView.render(model.state.search);

  }catch(err) {
    console.log(`controlSearchResults Error 😎: ${err}`);
  }
}

const controlPagination = function(goToPage) {
      //* render new results
      resultsView.render(model.getSearchResultsPage(goToPage));

      //* render new pagination buttons
      paginationView.render(model.state.search);
}

const controlServings = function(newServings = model.state.recipe.servings) {
  //* update the recipe servings (in state)
  model.updateServings(newServings)

  //* update the recipe view
  // recipeView.render(model.state.recipe);
  recipeView.update(model.state.recipe);
}

const controlAddBookmark = function() {
  // adds or removes bookmark at the current recipe (boolean)
if(!model.state.recipe.bookmarked) 
  model.addBookmark(model.state.recipe)
else model.deleteBookmark(model.state.recipe.id)

console.log(model.state.recipe);
  // updates recipeView with new bookmark data
  recipeView.update(model.state.recipe)

  // render the bookmarks
  bookmarksView.render(model.state.bookmarks)
}

const controlBookmarks = function() {
  bookmarksView.render(model.state.bookmarks)
}

const controlAddRecipe = async function(newRecipe) {
  try {
  // Show loading spinner
  addRecipeView.renderSpinner()

  // Upload the new recipe data
  await model.uploadRecipe(newRecipe)
  console.log('model.state.recipe: ', model.state.recipe);

  // Render recipe
  recipeView.render(model.state.recipe);

  // Success message
  addRecipeView.renderMessage();

  // Render bookmark view
  bookmarksView.render(model.state.bookmarks);

  // Change id in the url
  window.history.pushState(null, '', `#${model.state.recipe.id}`)

  // Close form window
  setTimeout(function() {
    addRecipeView.toggleWindow()
  }, MODAL_CLOSE_SEC * 1000)

  } catch(err) {
    console.log('🤪', err);
    addRecipeView.renderError(err.message)
  }
}

const init = function() {
  bookmarksView.addHandlerRender(controlBookmarks)
  recipeView.addHandlerRender(controlRecipes);
  recipeView.addHandlerUpdateServings(controlServings);
  recipeView.addHandlerAddBookmark(controlAddBookmark);
  searchView.addHandlerSearch(controlSearchResults);
  paginationView.addHandlerClick(controlPagination);
  addRecipeView.addHandlerUpload(controlAddRecipe);
  console.log('Welcome!');
}
init();
