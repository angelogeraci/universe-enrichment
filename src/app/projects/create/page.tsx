"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Select from "react-select"
import { SingleValue } from "react-select"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { ArrowLeft } from "lucide-react"
import { useToast } from '@/hooks/useToast'

  // Complete list of world countries
const countries = [
  { value: "AD", label: "🇦🇩 Andorra" },
  { value: "AE", label: "🇦🇪 United Arab Emirates" },
  { value: "AF", label: "🇦🇫 Afghanistan" },
  { value: "AG", label: "🇦🇬 Antigua and Barbuda" },
  { value: "AI", label: "🇦🇮 Anguilla" },
  { value: "AL", label: "🇦🇱 Albania" },
  { value: "AM", label: "🇦🇲 Armenia" },
  { value: "AO", label: "🇦🇴 Angola" },
  { value: "AQ", label: "🇦🇶 Antarctica" },
  { value: "AR", label: "🇦🇷 Argentina" },
  { value: "AS", label: "🇦🇸 American Samoa" },
  { value: "AT", label: "🇦🇹 Austria" },
  { value: "AU", label: "🇦🇺 Australia" },
  { value: "AW", label: "🇦🇼 Aruba" },
  { value: "AX", label: "🇦🇽 Åland Islands" },
  { value: "AZ", label: "🇦🇿 Azerbaijan" },
  { value: "BA", label: "🇧🇦 Bosnia and Herzegovina" },
  { value: "BB", label: "🇧🇧 Barbados" },
  { value: "BD", label: "🇧🇩 Bangladesh" },
  { value: "BE", label: "🇧🇪 Belgium" },
  { value: "BF", label: "🇧🇫 Burkina Faso" },
  { value: "BG", label: "🇧🇬 Bulgaria" },
  { value: "BH", label: "🇧🇭 Bahrain" },
  { value: "BI", label: "🇧🇮 Burundi" },
  { value: "BJ", label: "🇧🇯 Benin" },
  { value: "BL", label: "🇧🇱 Saint Barthélemy" },
  { value: "BM", label: "🇧🇲 Bermuda" },
  { value: "BN", label: "🇧🇳 Brunei" },
  { value: "BO", label: "🇧🇴 Bolivia" },
  { value: "BQ", label: "🇧🇶 Bonaire" },
  { value: "BR", label: "🇧🇷 Brésil" },
  { value: "BS", label: "🇧🇸 Bahamas" },
  { value: "BT", label: "🇧🇹 Bhoutan" },
  { value: "BV", label: "🇧🇻 Île Bouvet" },
  { value: "BW", label: "🇧🇼 Botswana" },
  { value: "BY", label: "🇧🇾 Biélorussie" },
  { value: "BZ", label: "🇧🇿 Belize" },
  { value: "CA", label: "🇨🇦 Canada" },
  { value: "CC", label: "🇨🇨 Îles Cocos" },
  { value: "CD", label: "🇨🇩 République démocratique du Congo" },
  { value: "CF", label: "🇨🇫 République centrafricaine" },
  { value: "CG", label: "🇨🇬 République du Congo" },
  { value: "CH", label: "🇨🇭 Suisse" },
  { value: "CI", label: "🇨🇨 Côte d'Ivoire" },
  { value: "CK", label: "🇨🇰 Îles Cook" },
  { value: "CL", label: "🇨🇱 Chili" },
  { value: "CM", label: "🇨🇲 Cameroun" },
  { value: "CN", label: "🇨🇳 Chine" },
  { value: "CO", label: "🇨🇴 Colombie" },
  { value: "CR", label: "🇨🇷 Costa Rica" },
  { value: "CU", label: "🇨🇺 Cuba" },
  { value: "CV", label: "🇨🇻 Cap-Vert" },
  { value: "CW", label: "🇨🇼 Curaçao" },
  { value: "CX", label: "🇨🇽 Île Christmas" },
  { value: "CY", label: "🇨🇾 Chypre" },
  { value: "CZ", label: "🇨🇿 République tchèque" },
  { value: "DE", label: "🇩🇪 Allemagne" },
  { value: "DJ", label: "🇩🇯 Djibouti" },
  { value: "DK", label: "🇩🇰 Danemark" },
  { value: "DM", label: "🇩🇲 Dominique" },
  { value: "DO", label: "🇩🇴 République dominicaine" },
  { value: "DZ", label: "🇩🇿 Algérie" },
  { value: "EC", label: "🇪🇨 Équateur" },
  { value: "EE", label: "🇪🇪 Estonie" },
  { value: "EG", label: "🇪🇬 Égypte" },
  { value: "EH", label: "🇪🇭 Sahara occidental" },
  { value: "ER", label: "🇪🇷 Érythrée" },
  { value: "ES", label: "🇪🇸 Espagne" },
  { value: "ET", label: "🇪🇹 Éthiopie" },
  { value: "FI", label: "🇫🇮 Finlande" },
  { value: "FJ", label: "🇫🇯 Fidji" },
  { value: "FK", label: "🇫🇰 Îles Malouines" },
  { value: "FM", label: "🇫🇲 Micronésie" },
  { value: "FO", label: "🇫🇴 Îles Féroé" },
  { value: "FR", label: "🇫🇷 France" },
  { value: "GA", label: "🇬🇦 Gabon" },
  { value: "GB", label: "🇬🇧 Royaume-Uni" },
  { value: "GD", label: "🇬🇩 Grenade" },
  { value: "GE", label: "🇬🇪 Géorgie" },
  { value: "GF", label: "🇬🇫 Guyane française" },
  { value: "GG", label: "🇬🇬 Guernesey" },
  { value: "GH", label: "🇬🇭 Ghana" },
  { value: "GI", label: "🇬🇮 Gibraltar" },
  { value: "GL", label: "🇬🇱 Groenland" },
  { value: "GM", label: "🇬🇲 Gambie" },
  { value: "GN", label: "🇬🇳 Guinée" },
  { value: "GP", label: "🇬🇵 Guadeloupe" },
  { value: "GQ", label: "🇬🇶 Guinée équatoriale" },
  { value: "GR", label: "🇬🇷 Grèce" },
  { value: "GS", label: "🇬🇸 Géorgie du Sud-et-les Îles Sandwich du Sud" },
  { value: "GT", label: "🇬🇹 Guatemala" },
  { value: "GU", label: "🇬🇺 Guam" },
  { value: "GW", label: "🇬🇼 Guinée-Bissau" },
  { value: "GY", label: "🇬🇾 Guyana" },
  { value: "HK", label: "🇭🇰 Hong Kong" },
  { value: "HM", label: "🇭🇲 Îles Heard-et-MacDonald" },
  { value: "HN", label: "🇭🇳 Honduras" },
  { value: "HR", label: "🇭🇷 Croatie" },
  { value: "HT", label: "🇭🇹 Haïti" },
  { value: "HU", label: "🇭🇺 Hongrie" },
  { value: "ID", label: "🇮🇩 Indonésie" },
  { value: "IE", label: "🇮🇪 Irlande" },
  { value: "IL", label: "🇮🇱 Israël" },
  { value: "IM", label: "🇮🇲 Île de Man" },
  { value: "IN", label: "🇮🇳 Inde" },
  { value: "IO", label: "🇮🇴 Territoire britannique de l'océan Indien" },
  { value: "IQ", label: "🇮🇶 Irak" },
  { value: "IR", label: "🇮🇷 Iran" },
  { value: "IS", label: "🇮🇸 Islande" },
  { value: "IT", label: "🇮🇹 Italie" },
  { value: "JE", label: "🇯🇪 Jersey" },
  { value: "JM", label: "🇯🇲 Jamaïque" },
  { value: "JO", label: "🇯🇴 Jordanie" },
  { value: "JP", label: "🇯🇵 Japon" },
  { value: "KE", label: "🇰🇪 Kenya" },
  { value: "KG", label: "🇰🇬 Kirghizistan" },
  { value: "KH", label: "🇰🇭 Cambodge" },
  { value: "KI", label: "🇰🇮 Kiribati" },
  { value: "KM", label: "🇰🇲 Comores" },
  { value: "KN", label: "🇰🇳 Saint-Christophe-et-Niévès" },
  { value: "KP", label: "🇰🇵 Corée du Nord" },
  { value: "KR", label: "🇰🇷 Corée du Sud" },
  { value: "KW", label: "🇰🇼 Koweït" },
  { value: "KY", label: "🇰🇾 Îles Caïmans" },
  { value: "KZ", label: "🇰🇿 Kazakhstan" },
  { value: "LA", label: "🇱🇦 Laos" },
  { value: "LB", label: "🇱🇧 Liban" },
  { value: "LC", label: "🇱🇨 Sainte-Lucie" },
  { value: "LI", label: "🇱🇮 Liechtenstein" },
  { value: "LK", label: "🇱🇰 Sri Lanka" },
  { value: "LR", label: "🇱🇷 Liberia" },
  { value: "LS", label: "🇱🇸 Lesotho" },
  { value: "LT", label: "🇱🇹 Lituanie" },
  { value: "LU", label: "🇱🇺 Luxembourg" },
  { value: "LV", label: "🇱🇻 Lettonie" },
  { value: "LY", label: "🇱🇾 Libye" },
  { value: "MA", label: "🇲🇦 Maroc" },
  { value: "MC", label: "🇲🇨 Monaco" },
  { value: "MD", label: "🇲🇩 Moldavie" },
  { value: "ME", label: "🇲🇪 Monténégro" },
  { value: "MF", label: "🇲🇫 Saint-Martin" },
  { value: "MG", label: "🇲🇬 Madagascar" },
  { value: "MH", label: "🇲🇭 Îles Marshall" },
  { value: "MK", label: "🇲🇰 Macédoine du Nord" },
  { value: "ML", label: "🇲🇱 Mali" },
  { value: "MM", label: "🇲🇲 Myanmar" },
  { value: "MN", label: "🇲🇳 Mongolie" },
  { value: "MO", label: "🇲🇴 Macao" },
  { value: "MP", label: "🇲🇵 Îles Mariannes du Nord" },
  { value: "MQ", label: "🇲🇶 Martinique" },
  { value: "MR", label: "🇲🇷 Mauritanie" },
  { value: "MS", label: "🇲🇸 Montserrat" },
  { value: "MT", label: "🇲🇹 Malte" },
  { value: "MU", label: "🇲🇺 Maurice" },
  { value: "MV", label: "🇲🇻 Maldives" },
  { value: "MW", label: "🇲🇼 Malawi" },
  { value: "MX", label: "🇲🇽 Mexique" },
  { value: "MY", label: "🇲🇾 Malaisie" },
  { value: "MZ", label: "🇲🇿 Mozambique" },
  { value: "NA", label: "🇳🇦 Namibie" },
  { value: "NC", label: "🇳🇨 Nouvelle-Calédonie" },
  { value: "NE", label: "🇳🇪 Niger" },
  { value: "NF", label: "🇳🇫 Île Norfolk" },
  { value: "NG", label: "🇳🇬 Nigeria" },
  { value: "NI", label: "🇳🇮 Nicaragua" },
  { value: "NL", label: "🇳🇱 Pays-Bas" },
  { value: "NO", label: "🇳🇴 Norvège" },
  { value: "NP", label: "🇳🇵 Népal" },
  { value: "NR", label: "🇳🇷 Nauru" },
  { value: "NU", label: "🇳🇺 Niue" },
  { value: "NZ", label: "🇳🇿 Nouvelle-Zélande" },
  { value: "OM", label: "🇴🇲 Oman" },
  { value: "PA", label: "🇵🇦 Panama" },
  { value: "PE", label: "🇵🇪 Pérou" },
  { value: "PF", label: "🇵🇫 Polynésie française" },
  { value: "PG", label: "🇵🇬 Papouasie-Nouvelle-Guinée" },
  { value: "PH", label: "🇵🇭 Philippines" },
  { value: "PK", label: "🇵🇰 Pakistan" },
  { value: "PL", label: "🇵🇱 Pologne" },
  { value: "PM", label: "🇵🇲 Saint-Pierre-et-Miquelon" },
  { value: "PN", label: "🇵🇳 Îles Pitcairn" },
  { value: "PR", label: "🇵🇷 Porto Rico" },
  { value: "PS", label: "🇵🇸 Palestine" },
  { value: "PT", label: "🇵🇹 Portugal" },
  { value: "PW", label: "🇵🇼 Palaos" },
  { value: "PY", label: "🇵🇾 Paraguay" },
  { value: "QA", label: "🇶🇦 Qatar" },
  { value: "RE", label: "🇷🇪 La Réunion" },
  { value: "RO", label: "🇷🇴 Roumanie" },
  { value: "RS", label: "🇷🇸 Serbie" },
  { value: "RU", label: "🇷🇺 Russie" },
  { value: "RW", label: "🇷🇼 Rwanda" },
  { value: "SA", label: "🇸🇦 Arabie saoudite" },
  { value: "SB", label: "🇸🇧 Îles Salomon" },
  { value: "SC", label: "🇸🇨 Seychelles" },
  { value: "SD", label: "🇸🇩 Soudan" },
  { value: "SE", label: "🇸🇪 Suède" },
  { value: "SG", label: "🇸🇬 Singapour" },
  { value: "SH", label: "🇸🇭 Sainte-Hélène" },
  { value: "SI", label: "🇸🇮 Slovénie" },
  { value: "SJ", label: "🇸🇯 Svalbard et Jan Mayen" },
  { value: "SK", label: "🇸🇰 Slovaquie" },
  { value: "SL", label: "🇸🇱 Sierra Leone" },
  { value: "SM", label: "🇸🇲 Saint-Marin" },
  { value: "SN", label: "🇸🇳 Sénégal" },
  { value: "SO", label: "🇸🇴 Somalie" },
  { value: "SR", label: "🇸🇷 Suriname" },
  { value: "SS", label: "🇸🇸 Soudan du Sud" },
  { value: "ST", label: "🇸🇹 Sao Tomé-et-Principe" },
  { value: "SV", label: "🇸🇻 El Salvador" },
  { value: "SX", label: "🇸🇽 Saint-Martin" },
  { value: "SY", label: "🇸🇾 Syrie" },
  { value: "SZ", label: "🇸🇿 Eswatini" },
  { value: "TC", label: "🇹🇨 Îles Turques-et-Caïques" },
  { value: "TD", label: "🇹🇩 Tchad" },
  { value: "TF", label: "🇹🇫 Terres australes françaises" },
  { value: "TG", label: "🇹🇬 Togo" },
  { value: "TH", label: "🇹🇭 Thaïlande" },
  { value: "TJ", label: "🇹🇯 Tadjikistan" },
  { value: "TK", label: "🇹🇰 Tokelau" },
  { value: "TL", label: "🇹🇱 Timor oriental" },
  { value: "TM", label: "🇹🇲 Turkménistan" },
  { value: "TN", label: "🇹🇳 Tunisie" },
  { value: "TO", label: "🇹🇴 Tonga" },
  { value: "TR", label: "🇹🇷 Turquie" },
  { value: "TT", label: "🇹🇹 Trinité-et-Tobago" },
  { value: "TV", label: "🇹🇻 Tuvalu" },
  { value: "TW", label: "🇹🇼 Taïwan" },
  { value: "TZ", label: "🇹🇿 Tanzanie" },
  { value: "UA", label: "🇺🇦 Ukraine" },
  { value: "UG", label: "🇺🇬 Ouganda" },
  { value: "UM", label: "🇺🇲 Îles mineures éloignées des États-Unis" },
  { value: "US", label: "🇺🇸 États-Unis" },
  { value: "UY", label: "🇺🇾 Uruguay" },
  { value: "UZ", label: "🇺🇿 Ouzbékistan" },
  { value: "VA", label: "🇻🇦 Vatican" },
  { value: "VC", label: "🇻🇨 Saint-Vincent-et-les-Grenadines" },
  { value: "VE", label: "🇻🇪 Venezuela" },
  { value: "VG", label: "🇻🇬 Îles Vierges britanniques" },
  { value: "VI", label: "🇻🇮 Îles Vierges américaines" },
  { value: "VN", label: "🇻🇳 Viêt Nam" },
  { value: "VU", label: "🇻🇺 Vanuatu" },
  { value: "WF", label: "🇼🇫 Wallis-et-Futuna" },
  { value: "WS", label: "🇼🇸 Samoa" },
  { value: "YE", label: "🇾🇪 Yémen" },
  { value: "YT", label: "🇾🇹 Mayotte" },
  { value: "ZA", label: "🇿🇦 Afrique du Sud" },
  { value: "ZM", label: "🇿🇲 Zambie" },
  { value: "ZW", label: "🇿🇼 Zimbabwe" },
].sort((a, b) => a.label.localeCompare(b.label))

type CountryOption = { value: string; label: string }
type CategoryOption = { value: string; label: string }

export default function CreateProjectPage() {
  const router = useRouter()
  const [projectData, setProjectData] = useState<{ name: string; description: string } | null>(null)
  const [country, setCountry] = useState<SingleValue<CountryOption>>(null)
  const [searchType, setSearchType] = useState<"origin" | "presence">("origin")
  const [categoryList, setCategoryList] = useState<SingleValue<CategoryOption>>(null)
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const { success, error: showError, warning } = useToast()

  // Charger les données du projet depuis localStorage
  useEffect(() => {
    const savedData = localStorage.getItem('newProjectData')
    if (savedData) {
      try {
        const data = JSON.parse(savedData)
        setProjectData(data)
      } catch (e) {
        console.error('Erreur lors du chargement des données du projet:', e)
        showError('Erreur lors du chargement des données du projet')
        router.push('/projects')
      }
    } else {
      warning('Aucune donnée de projet trouvée')
      router.push('/projects')
    }
  }, [])

  // Charger les listes de catégories disponibles
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/categories')
        if (response.ok) {
          const data = await response.json()
          const categoryOptions = data.map((cat: any) => ({
            value: cat.id,
            label: cat.name
          }))
          setCategories(categoryOptions)
        } else {
          throw new Error('Erreur lors du chargement des catégories')
        }
      } catch (error) {
        console.error('Error loading categories:', error)
        showError('Unable to load category lists')
      }
    }
    fetchCategories()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)
    
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: projectData?.name,
          description: projectData?.description,
          country: country?.value,
          searchType,
          categoryListId: categoryList?.value
        })
      })
      
      if (!res.ok) {
        const data = await res.json()
        const errorMessage = data.error || 'Error creating project'
        setError(errorMessage)
        showError(errorMessage, { duration: 6000 })
        setIsSubmitting(false)
        return
      }
      
      // Success
      success('Project created successfully! Enrichment in progress...', { duration: 4000 })
      
      // Clean localStorage
      localStorage.removeItem('newProjectData')
      
      // Redirect to projects list
      router.push('/projects')
      
    } catch (err: any) {
      const errorMessage = 'Network or server error'
      setError(errorMessage)
      showError(errorMessage, { duration: 6000 })
      setIsSubmitting(false)
    }
  }

  if (!projectData) {
    return (
      <div className="w-full px-32 py-6">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  return (
    <div className="w-full px-32 py-6">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/projects')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Project Configuration</h1>
      </div>

      <div className="max-w-2xl">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Project Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <span className="font-medium">Name:</span> {projectData.name}
              </div>
              <div>
                <span className="font-medium">Description:</span> {projectData.description}
              </div>
            </div>
          </CardContent>
        </Card>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Sélection du pays */}
          <Card>
            <CardHeader>
                          <CardTitle>1. Country Selection</CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={country}
              onChange={setCountry}
              options={countries}
              placeholder="Search and select a country..."
                isSearchable
                isClearable
                className="react-select-container"
                classNamePrefix="react-select"
              />
            </CardContent>
          </Card>

          {/* Type de recherche */}
          <Card>
            <CardHeader>
                          <CardTitle>2. Search Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <Switch
                  id="search-type"
                  checked={searchType === "presence"}
                  onCheckedChange={(checked) => 
                    setSearchType(checked ? "presence" : "origin")
                  }
                />
                <div className="flex-1">
                  <label htmlFor="search-type" className="text-sm font-medium cursor-pointer">
                    {searchType === "origin" 
                      ? "Criteria originating from country only" 
                      : "Criteria originating AND present in country"
                    }
                  </label>
                  <p className="text-xs text-muted-foreground mt-1">
                    {searchType === "origin" 
                      ? "Search only criteria that were created in this country" 
                      : "Search criteria created in this country as well as those present in this country"
                    }
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sélection de la liste de catégories */}
          <Card>
            <CardHeader>
                          <CardTitle>3. Category List</CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={categoryList}
              onChange={setCategoryList}
              options={categories}
              placeholder="Select a category list..."
                isSearchable
                isClearable
                className="react-select-container"
                classNamePrefix="react-select"
              />
              {categories.length === 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  No category lists available. 
                  <Button
                    type="button"
                    variant="link"
                    className="p-0 h-auto text-xs"
                    onClick={() => router.push('/categories')}
                  >
                    Create a category list
                  </Button>
                </p>
              )}
            </CardContent>
          </Card>

          {/* Action buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/projects')}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!country || !categoryList || isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? "Creating..." : "Create Project"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
} 