//& Lesson: Refactoring for MVC (Model - View - Controller)
//~ Encapsulating the model part
//~ By using export on the state variable it will automatically update the variable on the import side which is the controller in this case. 

import { async } from 'regenerator-runtime';
import { API_URL, RESULTS_PER_PAGE, KEY, } from './config.js';
// import { getJSON, sendJSON } from './helpers.js';
import { AJAX } from './helpers.js'
// import { search } from 'core-js/fn/symbol';



//* initialize state
export const state = {
  recipe: {},
  search: {
    query: '',
    results: [],
    pageNum: 1,
    resultsPerPage: RESULTS_PER_PAGE,
  },
  bookmarks: [],
};

const createRecipeObject = function(data) {
      //* save the recipe 
      const { recipe } = data.data;
    
      return {
        id: recipe.id,
        title: recipe.title,
        publisher: recipe.publisher,
        sourceUrl: recipe.source_url,
        image: recipe.image_url,
        servings: recipe.servings,
        cookingTime: recipe.cooking_time,
        ingredients: recipe.ingredients,
        ...(recipe.key && {key: recipe.key}) // short circuiting
      }
    }
    
    export const loadRecipe = async function (id) {
      try {
        
    //* load recipe data
    const data = await AJAX(`${API_URL}/${id}?key=${KEY}`);
        
    //* set state with fetched recipe
    state.recipe = createRecipeObject(data)

    //* save the recipe 
    const { recipe } = data.data;
    
    //* set state with fetched recipe
    state.recipe = {
      id: recipe.id,
      title: recipe.title,
      publisher: recipe.publisher,
      sourceUrl: recipe.source_url,
      image: recipe.image_url,
      servings: recipe.servings,
      cookingTime: recipe.cooking_time,
      ingredients: recipe.ingredients,
    }
    if(state.bookmarks.some(bookmark => bookmark.id === id)) state.recipe.bookmarked = true
    else state.recipe.bookmarked = false

    console.log('recipe in state: ', state.recipe);

  } catch (err) {
    console.error(`loadRecipe Error 😎: ${err}`);
    throw err
  }
}

//* Search
export const loadSearchResults = async (query) => {
  try {

    state.search.query = query;

    const data = await AJAX(`${API_URL}?search=${query}&key=${KEY}`);

    state.search.results = data.data.recipes.map(rec => {
      return {
        id: rec.id,
        title: rec.title,
        publisher: rec.publisher,
        image: rec.image_url,
        ...(rec.key && {key: rec.key}),
      }
    })

    state.search.pageNum = 1

  } catch (err) {
    console.log(`loadSearchResults Error 😎: ${err}`);
    throw err
  }
}

export const getSearchResultsPage = (pageNum = state.search.pageNum) => {

  state.search.pageNum = pageNum;

  // dynamic start and end point for slice: lets say we look for page 1, so pageNum = 1.
  const start = (pageNum - 1) * state.search.resultsPerPage // 0
  const end = pageNum * state.search.resultsPerPage // 9

  return state.search.results.slice(start, end)
}


//* Update servings

export const updateServings = function (newServings) {
  state.recipe.ingredients.forEach(ing => {
    ing.quantity = (ing.quantity * newServings) / state.recipe.servings
    // newQt = oldQt * newServings / oldServings
  });

  state.recipe.servings = newServings
}

const persistBookmarks = function() {
  localStorage.setItem('bookmarks', JSON.stringify(state.bookmarks))
  console.log('state.bookmarks: ', state.bookmarks);
}

//* add bookmark
export const addBookmark = function(recipe) {
  // add bookmark
  state.bookmarks.push(recipe)

  // mark current recipe as bookmarked
  if (recipe.id === state.recipe.id) state.recipe.bookmarked = true
  
  console.log('added bookmark');
  // save bookmarks array to local storage (as a string). to update the persisting bookmarks (on local storage)
  persistBookmarks();
}

//* remove bookmark
export const deleteBookmark = function(id) {
  // delete bookmark
  const index = state.bookmarks.findIndex(el => el.id === id)
  state.bookmarks.splice(index, 1)

    // mark current recipe as NOT bookmarked
    if (id === state.recipe.id) state.recipe.bookmarked = false

    console.log('deleted bookmark');

    // save bookmarks array to local storage (as a string). to update the persisting bookmarks (on local storage)
    persistBookmarks();
}

const init = function() {
  const storage = localStorage.getItem('bookmarks');
  if (storage) state.bookmarks = JSON.parse(storage);
  // console.log(storage.parse());
};
init();

// FOR TESTING & DEBUGGING
const clearBookmarks = function() {
  localStorage.clear('bookmarks');
}
// clearBookmarks()

export const uploadRecipe = async function(newRecipe) {
  try {
  const ingredients = Object.entries(newRecipe)
  .filter(entry => 
    entry[0].startsWith('ingredient') && entry[1] !== '')
    .map(ing => {
      const ingArr =  ing[1].split(',').map(el => el.trim());

      if(ingArr.length !== 3) throw new Error('Wrong ingredient format, Please use the correct format')
      
      const [quantity, unit, description] = ingArr; 
      
      return {quantity: quantity ? +quantity : null, unit, description}

    });
  
  const recipe = {
    title: newRecipe.title,
    source_url: newRecipe.sourceUrl,
    image_url: newRecipe.image,
    publisher: newRecipe.publisher,
    cooking_time: +newRecipe.cookingTime,
    servings: +newRecipe.servings,
    ingredients,
  }
  
  const data = await AJAX(`${API_URL}?key=${KEY}`, recipe)

  state.recipe = createRecipeObject(data);

  addBookmark(state.recipe);

} catch(err) {
  throw err; 
}
}