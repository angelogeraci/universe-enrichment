"use client"

import React, { useState } from "react";
import Select from "react-select";
import { SingleValue } from "react-select";
import countriesData from 'world-countries'

const countries = countriesData
  .map(c => ({
    value: c.cca2,
    label: `${c.flag} ${c.name.common}`
  }))
  .sort((a, b) => a.label.localeCompare(b.label))

const categories = [
  { value: "cat1", label: "Catégorie 1" },
  { value: "cat2", label: "Catégorie 2" },
];

export default function CreateProjectPage() {
  const [country, setCountry] = useState<SingleValue<{ value: string; label: string }>>(null);
  const [searchType, setSearchType] = useState("origin");
  const [category, setCategory] = useState<SingleValue<{ value: string; label: string }>>(null);

  return (
    <div className="max-w-xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Créer un nouveau projet</h1>
      <form className="space-y-6">
        <div>
          <label className="block mb-2 font-medium">Pays</label>
          <Select
            options={countries}
            value={country}
            onChange={setCountry}
            placeholder="Sélectionner un pays..."
            isClearable
            classNamePrefix="react-select"
          />
        </div>
        <div>
          <label className="block mb-2 font-medium">Type de recherche</label>
          <select
            className="w-full border rounded px-3 py-2"
            value={searchType}
            onChange={e => setSearchType(e.target.value)}
          >
            <option value="origin">Critères originaires du pays</option>
            <option value="origin_present">Critères originaires et/ou présents</option>
          </select>
        </div>
        <div>
          <label className="block mb-2 font-medium">Catégorie</label>
          <Select
            options={categories}
            value={category}
            onChange={setCategory}
            placeholder="Sélectionner une catégorie..."
            isClearable
            classNamePrefix="react-select"
          />
        </div>
        <button
          type="submit"
          className="w-full bg-primary text-white py-2 rounded hover:bg-primary/80 transition"
        >
          Lancer le projet
        </button>
      </form>
    </div>
  );
} 