//& Lesson: Refactoring for MVC (Model - View - Controller)
//~ Encapsulating the model part
//~ By using export on the state variable it will automatically update the variable on the import side which is the controller in this case. 

import { async } from 'regenerator-runtime';
import { API_URL, AUTH_API_URL, RESULTS_PER_PAGE } from './config.js';
// import { getJSON, sendJSON } from './helpers.js';
import { AJAX } from './helpers.js'
// import { search } from 'core-js/fn/symbol';



//* initialize state
export const state = {
  user: null,
  recipe: {},
  search: {
    query: '',
    results: [],
    pageNum: 1,
    resultsPerPage: RESULTS_PER_PAGE,
  },
  bookmarks: [],
};

const authRequest = async (endpoint, payload) => {
  const response = await fetch(`${AUTH_API_URL}/${endpoint}`, {
    method: payload === undefined ? 'GET' : 'POST',
    credentials: 'same-origin',
    headers: payload === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: payload === undefined ? undefined : JSON.stringify(payload),
  });

  const data = response.status === 204 ? null : await response.json();
  if (!response.ok) throw new Error(data?.message || 'Unable to complete the account request.');
  return data;
};

const bookmarkRequest = async (path, method = 'GET', payload) => {
  const response = await fetch(`/api/v1/bookmarks${path}`, {
    method,
    credentials: 'same-origin',
    headers: payload === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: payload === undefined ? undefined : JSON.stringify(payload),
  });

  const data = response.status === 204 ? null : await response.json();
  if (!response.ok) throw new Error(data?.message || 'Unable to update bookmarks.');
  return data;
};

export const loadCurrentUser = async () => {
  const { user } = await authRequest('me');
  state.user = user;
  return user;
};

export const registerUser = async (credentials) => {
  const { user } = await authRequest('register', credentials);
  state.user = user;
  return user;
};

export const loginUser = async (credentials) => {
  const { user } = await authRequest('login', credentials);
  state.user = user;
  return user;
};

export const logoutUser = async () => {
  await authRequest('logout', {});
  state.user = null;
  state.bookmarks = [];
  if (state.recipe.id) state.recipe.bookmarked = false;
};

export const loadBookmarks = async () => {
  const { bookmarks } = await bookmarkRequest('');
  state.bookmarks = bookmarks;
  if (state.recipe.id) {
    state.recipe.bookmarked = bookmarks.some((bookmark) => bookmark.id === state.recipe.id);
  }
  return bookmarks;
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
    const data = await AJAX(`${API_URL}/${encodeURIComponent(id)}`);
        
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

    const data = await AJAX(`${API_URL}?search=${encodeURIComponent(query)}`);

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

//* add bookmark
export const addBookmark = async function(recipe) {
  const { bookmark } = await bookmarkRequest('', 'POST', { recipe });
  const index = state.bookmarks.findIndex((saved) => saved.id === bookmark.id);
  if (index === -1) state.bookmarks.push(bookmark);
  else state.bookmarks[index] = bookmark;

  if (recipe.id === state.recipe.id) state.recipe.bookmarked = true;
}

//* remove bookmark
export const deleteBookmark = async function(id) {
  await bookmarkRequest(`/${encodeURIComponent(id)}`, 'DELETE');
  const index = state.bookmarks.findIndex(el => el.id === id)
  if (index !== -1) state.bookmarks.splice(index, 1)

  if (id === state.recipe.id) state.recipe.bookmarked = false
}

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
  
  const data = await AJAX(API_URL, recipe)

  state.recipe = createRecipeObject(data);

  await addBookmark(state.recipe);

} catch(err) {
  throw err; 
}
}