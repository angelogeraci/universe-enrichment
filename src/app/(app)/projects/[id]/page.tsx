"use client"

import React from "react"

export default function ProjectResultsPage() {
  return (
    <div className="max-w-6xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Résultats du projet</h1>
      {/* Blocs metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center">
          <span className="text-3xl font-bold text-primary">123</span>
          <span className="text-gray-500 mt-2 text-center">Critères proposés par l'IA</span>
        </div>
        <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center">
          <span className="text-3xl font-bold text-primary">87</span>
          <span className="text-gray-500 mt-2 text-center">Critères avec suggestion Facebook</span>
        </div>
        <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center">
          <span className="text-3xl font-bold text-primary">65</span>
          <span className="text-gray-500 mt-2 text-center">Critères valides (score &gt; 80)</span>
        </div>
      </div>
      {/* Barre de progression */}
      <div className="w-full bg-gray-200 rounded-full h-4 mb-8 overflow-hidden">
        <div className="bg-primary h-4 rounded-full transition-all" style={{ width: '70%' }} />
      </div>
      <div className="text-right text-sm text-gray-500 mb-4">Progression : 70% – Analyse en cours…</div>
      {/* Tableau des résultats (placeholder) */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-lg font-semibold mb-4">Tableau des résultats (à venir)</div>
        <div className="text-gray-400">Le tableau s'affichera ici une fois le projet terminé.</div>
      </div>
    </div>
  )
} 