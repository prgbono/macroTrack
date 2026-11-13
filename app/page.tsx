'use client';

import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import NextImage from 'next/image';
import { deleteMeal, getMeals, saveMeal } from '@/lib/db';
import { foodMacros, mealMacros } from '@/lib/types';
import type { FoodItem, Meal, Macros } from '@/lib/types';

const emptyMacros: Macros = { protein: 0, fat: 0, carbs: 0, calories: 0 };
const round = (n: number) => Math.round(n * 10) / 10;
function makeId() { return crypto.randomUUID(); }
function readFile(file: File) { return new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('No se pudo leer la foto.')); reader.readAsDataURL(file); }); }
async function optimizeImage(file: File) {
  const source = await readFile(file);
  const image = new Image(); image.src = source;
  await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error('El archivo no parece una imagen válida.')); });
  const scale = Math.min(1, 1600 / Math.max(image.width, image.height));
  const canvas = document.createElement('canvas'); canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale);
  const context = canvas.getContext('2d'); if (!context) throw new Error('No se pudo preparar la foto.');
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.82);
}

export default function Home() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState('');
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [history, setHistory] = useState<Meal[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<{ fdcId: number; name: string; dataSource: string; macrosPer100g: Macros }[]>([]);
  const [storageReady, setStorageReady] = useState(false);
  const [lookupTargetId, setLookupTargetId] = useState<string | null>(null);

  useEffect(() => { getMeals().then(setHistory).catch(() => setMessage('No se pudo acceder al almacenamiento local. Revisa la configuración del navegador.')).finally(() => setStorageReady(true)); }, []);

  async function handlePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file) return;
    setMessage(''); setResults([]); setFoods([]); setPhoto('');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setMessage('Elige una imagen JPG, PNG o WebP.'); return; }
    if (file.size > 12 * 1024 * 1024) { setMessage('La foto original debe pesar menos de 12 MB.'); return; }
    setBusy(true);
    try {
      const optimized = await optimizeImage(file); setPhoto(optimized);
      const data = optimized.split(',')[1];
      const response = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mimeType: 'image/jpeg', data }) });
      const body = await response.json(); if (!response.ok) throw new Error(body.error || 'No se pudo analizar la foto.');
      const detected = (Array.isArray(body.foods) ? body.foods : []).map((food: { id?: string; name: string; nutritionName?: string; grams: number; fdcId?: number; dataSource?: string; macrosPer100g?: Macros }) => ({ id: food.id || makeId(), name: food.name, nutritionName: food.nutritionName, grams: food.grams, fdcId: food.fdcId, dataSource: food.dataSource, macrosPer100g: food.macrosPer100g || emptyMacros }));
      const fallbackCount = Number(body.fallbackCount) || 0;
      setFoods(detected);
      setMessage(detected.length ? fallbackCount ? `Macros calculados automáticamente. USDA no encontró ${fallbackCount} alimento${fallbackCount === 1 ? '' : 's'}; para esos se muestra una estimación de IA.` : 'Macros calculados automáticamente con USDA. Revisa las porciones y coincidencias antes de guardar.' : 'No se detectaron alimentos. Añádelos con el buscador.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Error al analizar la foto.'); }
    finally { setBusy(false); }
  }

  async function searchFood(event: FormEvent) {
    event.preventDefault(); if (!query.trim()) return;
    setSearching(true); setMessage('');
    try { const response = await fetch(`/api/foods?q=${encodeURIComponent(query.trim())}`); const body = await response.json(); if (!response.ok) throw new Error(body.error || 'No se pudo buscar.'); setResults(body.foods || []); if (!body.foods?.length) setMessage('No encontramos resultados. Prueba con otro nombre.'); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Error en la búsqueda.'); }
    finally { setSearching(false); }
  }

  function addFood(result: (typeof results)[number], targetId?: string) {
    if (targetId) setFoods((current) => current.map((food) => food.id === targetId ? { ...food, name: result.name, fdcId: result.fdcId, dataSource: result.dataSource, nutritionName: result.name, macrosPer100g: result.macrosPer100g } : food));
    else setFoods((current) => [...current, { id: makeId(), name: result.name, grams: 100, fdcId: result.fdcId, dataSource: result.dataSource, nutritionName: result.name, macrosPer100g: result.macrosPer100g }]);
    setResults([]); setQuery(''); setMessage(''); setLookupTargetId(null);
  }

  function updateFood(id: string, patch: Partial<FoodItem>) { setFoods((current) => current.map((food) => food.id === id ? { ...food, ...patch } : food)); }
  function removeFood(id: string) { setFoods((current) => current.filter((food) => food.id !== id)); if (lookupTargetId === id) setLookupTargetId(null); }

  async function saveCurrent() {
    if (!foods.length) { setMessage('Añade al menos un alimento antes de guardar.'); return; }
    const meal: Meal = { id: makeId(), createdAt: new Date().toISOString(), photo: photo || undefined, foods };
    try { await saveMeal(meal); setHistory((current) => [meal, ...current]); setFoods([]); setPhoto(''); setResults([]); setQuery(''); setMessage('Comida guardada en este dispositivo.'); }
    catch { setMessage('No se pudo guardar. Puede que el almacenamiento del dispositivo esté lleno.'); }
  }

  async function removeMeal(id: string) { try { await deleteMeal(id); setHistory((current) => current.filter((meal) => meal.id !== id)); } catch { setMessage('No se pudo borrar esta comida.'); } }

  const totals = mealMacros(foods);
  return <main className="shell">
    <header className="topbar"><a className="brand" href="#top" aria-label="MacroTrack inicio"><span className="brand-mark">m</span><span>macrotrack</span></a><span className="local-note"><span className="status-dot"/> Solo en tu dispositivo</span></header>
    <section className="hero" id="top"><div><p className="eyebrow">TU DIARIO, A TU RITMO</p><h1>Entiende lo que<br/><span>hay en tu plato.</span></h1><p className="hero-copy">Una foto para empezar. Tú ajustas las porciones y guardas cada comida.</p></div><div className="hero-sticker" aria-hidden="true"><span>🥑</span><small>comer bien<br/>sin complicarse</small></div></section>
    <div className="workspace">
      <section className="panel editor-panel">
        <div className="section-heading"><div><span className="step">01</span><h2>Tu comida</h2></div><span className="muted">Foto y alimentos</span></div>
        <input ref={inputRef} className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={handlePhoto}/>
        <button className={`photo-drop${photo ? ' has-photo' : ''}`} onClick={() => inputRef.current?.click()} disabled={busy} type="button">
          {photo ? <><NextImage src={photo} alt="Vista previa de la comida" width={900} height={600} unoptimized/><span className="photo-overlay">Cambiar foto</span></> : <span className="drop-content"><span className="camera-icon">＋</span><strong>{busy ? 'Analizando foto…' : 'Toca para añadir una foto'}</strong><small>JPG, PNG o WebP · hasta 12 MB</small></span>}
        </button>
        {busy && <div className="loading-line"><span/> Identificando alimentos, estimando porciones y consultando USDA automáticamente…</div>}
        {message && <p className="notice" role="status">{message}</p>}
        <form className="search-form" onSubmit={searchFood}><label htmlFor="food-search">Añadir o corregir alimento (opcional)</label><div className="search-row"><input id="food-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ej. arroz cocido, pechuga de pollo" maxLength={120}/><button className="search-button" type="submit" disabled={searching || !query.trim()}>{searching ? '…' : 'Buscar'}</button></div></form>
        {results.length > 0 && <div className="results" aria-label="Resultados de búsqueda">{results.map((result) => <button className="result" key={result.fdcId} onClick={() => addFood(result, lookupTargetId || undefined)} type="button"><span><strong>{result.name}</strong><small>USDA · por 100 g</small></span><b>{lookupTargetId ? '✓' : '＋'}</b></button>)}</div>}
        <div className="food-list">
          {foods.length === 0 ? <div className="empty-food"><span>◌</span><p>Los alimentos aparecerán aquí.<br/>Analiza una foto o búscalos arriba.</p></div> : foods.map((food) => {
            const macros = foodMacros(food); const needsLookup = !food.fdcId;
            return <article className="food-card" key={food.id}><div className="food-top"><div className="food-name"><strong>{food.name}</strong><small>{food.dataSource === 'Estimación IA' ? 'Estimación aproximada · USDA sin coincidencia' : food.nutritionName ? `${food.dataSource || 'USDA'} · ${food.nutritionName}` : needsLookup ? 'Añade datos nutricionales' : `${food.dataSource || 'USDA'} · por 100 g`}</small></div><button className="icon-button" onClick={() => removeFood(food.id)} type="button" aria-label={`Eliminar ${food.name}`}>×</button></div>
              <div className="food-controls"><label>Porción <span><input type="number" min="1" max="3000" value={food.grams} onChange={(e) => updateFood(food.id, { grams: Math.min(3000, Math.max(1, Number(e.target.value) || 1)) })}/> g</span></label><div className="macro-mini"><span>P <b>{round(macros.protein)}g</b></span><span>G <b>{round(macros.fat)}g</b></span><span>C <b>{round(macros.carbs)}g</b></span></div></div>
              {needsLookup && <button className="lookup-link" type="button" onClick={() => { setLookupTargetId(food.id); setQuery(food.name); document.getElementById('food-search')?.focus(); }}>{food.dataSource === 'Estimación IA' ? 'Buscar una coincidencia manual en USDA →' : `Buscar «${food.name}» en USDA →`}</button>}
            </article>;
          })}
        </div>
        {foods.length > 0 && <button className="save-button" type="button" onClick={saveCurrent}>Guardar comida <span>↗</span></button>}
        <p className="fine-print">Las cantidades de la foto son estimaciones. Revisa y ajusta cada alimento antes de guardar.</p>
      </section>
      <aside className="side-column"><section className="panel summary-panel"><div className="section-heading"><div><span className="step">02</span><h2>Resumen</h2></div><span className="muted">Esta comida</span></div><div className="calories"><strong>{Math.round(totals.calories)}</strong><span>kcal aprox.</span></div><div className="macro-bars">{([['Proteína', totals.protein, 'protein'], ['Grasas', totals.fat, 'fat'], ['Carbohidratos', totals.carbs, 'carbs']] as const).map(([label, value, key]) => <div className="macro-row" key={key}><div><span>{label}</span><strong>{round(value)} <small>g</small></strong></div><div className="bar"><span className={key} style={{ width: `${totals.protein + totals.fat + totals.carbs ? Math.min(100, (value / Math.max(totals.protein, totals.fat, totals.carbs, 1)) * 100) : 0}%` }}/></div></div>)}</div><p className="estimate-note">Los valores nutricionales pueden variar según preparación y marca.</p></section>
      <section className="panel history-panel"><div className="section-heading"><div><span className="step">03</span><h2>Recientes</h2></div><span className="history-count">{history.length}</span></div>{!storageReady ? <p className="muted history-empty">Cargando tu diario…</p> : history.length === 0 ? <div className="history-empty"><span>▤</span><p>Tus comidas guardadas<br/>aparecerán aquí.</p></div> : <div className="history-list">{history.slice(0, 8).map((meal) => { const m = mealMacros(meal.foods); return <article className="history-item" key={meal.id}>{meal.photo ? <NextImage src={meal.photo} alt="" width={42} height={42} unoptimized/> : <div className="history-placeholder">✳</div>}<div className="history-detail"><strong>{meal.foods.slice(0, 2).map((f) => f.name).join(', ')}{meal.foods.length > 2 ? ` +${meal.foods.length - 2}` : ''}</strong><small>{new Date(meal.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</small><span>{Math.round(m.calories)} kcal · P {round(m.protein)} g</span></div><button className="icon-button delete-button" type="button" onClick={() => removeMeal(meal.id)} aria-label="Eliminar comida">×</button></article>; })}</div>}<p className="privacy-note">🔒 El historial se queda en este navegador.</p></section></aside>
    </div>
    <footer><span>macrotrack</span><span>Estimaciones orientativas · Fuente nutricional: USDA FoodData Central</span></footer>
  </main>;
}
