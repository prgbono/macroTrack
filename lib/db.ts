import { openDB } from 'idb';
import type { Meal } from './types';

let dbPromise: ReturnType<typeof openDB> | undefined;
function getDb() {
  dbPromise ??= openDB('macrotrack', 1, {
    upgrade(db) { db.createObjectStore('meals', { keyPath: 'id' }); },
  });
  return dbPromise;
}
export async function saveMeal(meal: Meal) { return (await getDb()).put('meals', meal); }
export async function getMeals(): Promise<Meal[]> {
  return (await getDb()).getAll('meals').then((meals) => meals.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
}
export async function deleteMeal(id: string) { return (await getDb()).delete('meals', id); }
