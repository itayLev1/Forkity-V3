import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseRecipeIngredients } from '../src/js/model.js';

test('ingredient descriptions may contain commas', () => {
  assert.deepEqual(parseRecipeIngredients({
    'ingredient-1': '0.5, cup, diced tomatoes, drained',
    'ingredient-2': ',, fine salt',
    'ingredient-3': '',
  }), [
    { quantity: 0.5, unit: 'cup', description: 'diced tomatoes, drained' },
    { quantity: null, unit: '', description: 'fine salt' },
  ]);
});

test('ingredient parser reports malformed entries without losing their number', () => {
  assert.throws(
    () => parseRecipeIngredients({ 'ingredient-4': 'one cup flour' }),
    /Ingredient 4 must use Quantity,Unit,Description format/,
  );
});