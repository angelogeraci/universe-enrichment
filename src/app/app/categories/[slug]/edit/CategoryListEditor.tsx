"use client"
import React, { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import DeleteConfirmModal from '@/components/DeleteConfirmModal'
import * as XLSX from 'xlsx'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'

// TODO: Permettre de modifier le nom d'une liste de catégories (comme sur les projets)
// TODO: Permettre d'éditer une catégorie (nom, path associé, critère AND)

// Types pour l'upload
interface UploadRow {
  Path: string
  Category: string
  AND?: string
}

export default function CategoryListEditor({ slug }: { slug: string }) {
  const [name, setName] = useState('')
  const [paths, setPaths] = useState([''])
  const [andCriteria, setAndCriteria] = useState<string[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // États pour l'upload
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{ current: number, total: number } | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<any | null>(null)
  const [editName, setEditName] = useState('')
  const [editPaths, setEditPaths] = useState<string[]>([''])
  const [editAndCriteria, setEditAndCriteria] = useState<string[]>([])
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  // Fetch categories
  const fetchCategories = () => {
    setLoading(true)
    setError(null)
    setSuccessMessage(null)
    fetch(`/api/categories/slug/${slug}`)
      .then(res => res.json())
      .then(data => setCategories(data.categories || []))
      .catch(() => setError('Erreur de chargement'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchCategories()
  }, [slug])

  // Fonction pour parser le fichier Excel/CSV
  const parseUploadFile = (file: File): Promise<UploadRow[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = e.target?.result
          const workbook = XLSX.read(data, { type: 'binary' })
          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
          
          if (jsonData.length < 2) {
            throw new Error('Le fichier doit contenir au moins une ligne d\'en-tête et une ligne de données')
          }

          const headers = jsonData[0] as string[]
          const rows = jsonData.slice(1) as any[][]

          // Vérifier que les colonnes requises sont présentes
          const pathIndex = headers.findIndex(h => h.toLowerCase().includes('path'))
          const categoryIndex = headers.findIndex(h => h.toLowerCase().includes('category'))
          const andIndex = headers.findIndex(h => h.toLowerCase().includes('and'))

          if (pathIndex === -1 || categoryIndex === -1) {
            throw new Error('Le fichier doit contenir les colonnes "Path" et "Category"')
          }

          const parsedRows: UploadRow[] = rows
            .filter(row => row[pathIndex] && row[categoryIndex]) // Filtrer les lignes vides
            .map(row => ({
              Path: String(row[pathIndex]).trim(),
              Category: String(row[categoryIndex]).trim(),
              AND: andIndex !== -1 && row[andIndex] ? String(row[andIndex]).trim() : undefined
            }))

          resolve(parsedRows)
        } catch (error: any) {
          reject(new Error(`Erreur lors du parsing du fichier: ${error.message}`))
        }
      }
      reader.onerror = () => reject(new Error('Erreur lors de la lecture du fichier'))
      reader.readAsBinaryString(file)
    })
  }

  // Fonction pour traiter l'upload de fichier
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Vérifier le type de fichier
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv' // .csv
    ]
    
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
      setError('Format de fichier non supporté. Utilisez .xlsx, .xls ou .csv')
      return
    }

    setUploading(true)
    setError(null)
    setUploadProgress({ current: 0, total: 0 })

    try {
      // Parser le fichier
      const rows = await parseUploadFile(file)
      
      if (rows.length === 0) {
        throw new Error('Aucune donnée valide trouvée dans le fichier')
      }

      setUploadProgress({ current: 0, total: rows.length })

      // Traiter les catégories une par une
      let successCount = 0
      let errorCount = 0
      
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        setUploadProgress({ current: i + 1, total: rows.length })

        try {
          const andCriteriaArray = row.AND ? [row.AND] : []
          
          const response = await fetch(`/api/categories/slug/${slug}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ 
              name: row.Category, 
              paths: [row.Path], 
              andCriteria: andCriteriaArray 
            })
          })

          if (response.ok) {
            successCount++
          } else {
            errorCount++
            console.warn(`Erreur pour la ligne ${i + 1}:`, await response.text())
          }
        } catch (err) {
          errorCount++
          console.warn(`Erreur pour la ligne ${i + 1}:`, err)
        }

        // Petite pause pour éviter de surcharger l'API
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      // Rafraîchir la liste des catégories
      await fetchCategories()

      // Message de succès
      if (successCount > 0) {
        setError(null)
        if (errorCount > 0) {
          setSuccessMessage(`Upload terminé : ${successCount} catégories créées avec succès, ${errorCount} erreurs`)
        } else {
          setSuccessMessage(`✅ Upload réussi : ${successCount} catégories créées avec succès !`)
        }
      } else {
        setError('Aucune catégorie n\'a pu être créée')
      }

    } catch (error: any) {
      setError(error.message || 'Erreur lors de l\'upload du fichier')
    } finally {
      setUploading(false)
      setUploadProgress(null)
      // Réinitialiser l'input file
      event.target.value = ''
    }
  }

  // Handlers for dynamic fields
  const handlePathChange = (i: number, value: string) => {
    setPaths(paths => paths.map((p, idx) => idx === i ? value : p))
  }
  const addPath = () => setPaths(paths => [...paths, ''])
  const removePath = (i: number) => setPaths(paths => paths.filter((_, idx) => idx !== i))

  const handleAndChange = (i: number, value: string) => {
    setAndCriteria(arr => arr.map((c, idx) => idx === i ? value : c))
  }
  const addAnd = () => setAndCriteria(arr => [...arr, ''])
  const removeAnd = (i: number) => setAndCriteria(arr => arr.filter((_, idx) => idx !== i))

  // Add category
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setAdding(true)
    setError(null)
    setSuccessMessage(null)
    try {
      const res = await fetch(`/api/categories/slug/${slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, paths: paths.filter(Boolean), andCriteria: andCriteria.filter(Boolean) })
      })
      if (!res.ok) throw new Error('Erreur lors de l\'ajout')
      setName('')
      setPaths([''])
      setAndCriteria([])
      setSuccessMessage('Catégorie ajoutée avec succès !')
      // Refresh categories
      await fetchCategories()
    } catch (e: any) {
      setError(e.message || 'Erreur inconnue')
    } finally {
      setAdding(false)
    }
  }

  // Delete single category
  const handleDeleteCategory = async (id: string, categoryName: string) => {
    setDeletingId(id)
    try {
      const response = await fetch(`/api/categories/slug/${slug}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id })
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression')
      }

      // Rafraîchir la liste des catégories
      await fetchCategories()
      setSelectedItems(new Set())
    } catch (error) {
      console.error('Erreur lors de la suppression de la catégorie:', error)
      setError('Erreur lors de la suppression de la catégorie')
    } finally {
      setDeletingId(null)
    }
  }

  // Delete selected categories
  const handleDeleteSelected = async () => {
    const selectedIds = Array.from(selectedItems)
    
    try {
      const response = await fetch(`/api/categories/slug/${slug}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ids: selectedIds })
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression')
      }
      
      // Rafraîchir la liste et réinitialiser la sélection
      await fetchCategories()
      setSelectedItems(new Set())
    } catch (error) {
      console.error('Erreur lors de la suppression des catégories:', error)
      setError('Erreur lors de la suppression des catégories')
    }
  }

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedItems)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedItems(newSelected)
  }

  const toggleSelectAll = () => {
    if (selectedItems.size === categories.length) {
      setSelectedItems(new Set())
    } else {
      setSelectedItems(new Set(categories.map(cat => cat.id)))
    }
  }

  // Ouvre la modal d'édition et pré-remplit les champs
  const openEditModal = (cat: any) => {
    setEditingCategory(cat)
    setEditName(cat.name || '')
    let pathArray: string[] = []
    if (Array.isArray(cat.path)) {
      pathArray = cat.path
    } else if (typeof cat.path === 'string') {
      pathArray = cat.path.split(' -- ').map((s: string) => s.trim()).filter(Boolean)
    } else {
      pathArray = ['']
    }
    setEditPaths(pathArray.length ? pathArray : [''])
    setEditAndCriteria(Array.isArray(cat.andCriteria) ? cat.andCriteria : cat.andCriteria ? [cat.andCriteria] : [])
    setEditError(null)
    setEditModalOpen(true)
  }

  // Ferme la modal et reset
  const closeEditModal = () => {
    setEditModalOpen(false)
    setEditingCategory(null)
    setEditName('')
    setEditPaths([''])
    setEditAndCriteria([])
    setEditError(null)
  }

  // Handlers pour les champs dynamiques d'édition
  const handleEditPathChange = (i: number, value: string) => {
    setEditPaths(paths => paths.map((p, idx) => idx === i ? value : p))
  }
  const addEditPath = () => setEditPaths(paths => [...paths, ''])
  const removeEditPath = (i: number) => setEditPaths(paths => paths.filter((_, idx) => idx !== i))
  const handleEditAndChange = (i: number, value: string) => {
    setEditAndCriteria(arr => arr.map((c, idx) => idx === i ? value : c))
  }
  const addEditAnd = () => setEditAndCriteria(arr => [...arr, ''])
  const removeEditAnd = (i: number) => setEditAndCriteria(arr => arr.filter((_, idx) => idx !== i))

  // Soumission de l'édition
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingCategory) return
    setEditLoading(true)
    setEditError(null)
    try {
      const res = await fetch(`/api/categories/slug/${slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          id: editingCategory.id,
          name: editName,
          paths: editPaths.filter(Boolean),
          andCriteria: editAndCriteria.filter(Boolean)
        })
      })
      if (!res.ok) throw new Error('Erreur lors de la mise à jour')
      closeEditModal()
      await fetchCategories()
    } catch (e: any) {
      setEditError(e.message || 'Erreur inconnue')
    } finally {
      setEditLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Section d'upload de fichier */}
      <div className="border rounded-lg p-6 bg-muted/30">
        <h3 className="text-lg font-semibold mb-4">📁 Import depuis un fichier</h3>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-3">
              Importez vos catégories depuis un fichier Excel (.xlsx, .xls) ou CSV avec 3 colonnes :
            </p>
            <ul className="text-xs text-muted-foreground space-y-1 mb-4 ml-4">
              <li><strong>Path</strong> : Chemin complet de la catégorie (ex: "Sports &gt; Football &gt; Équipes")</li>
              <li><strong>Category</strong> : Nom de la catégorie (ex: "Équipes")</li>
              <li><strong>AND</strong> : Critère Facebook optionnel (ex: "interests")</li>
            </ul>
          </div>
          
          <div className="flex items-center gap-4">
            <Input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              disabled={uploading}
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              disabled={uploading}
              onClick={() => {
                // Télécharger un template d'exemple
                const template = [
                  ['Path', 'Category', 'AND'],
                  ['Sports > Football', 'Football', 'interests'],
                  ['Sports > Football > Équipes', 'Équipes', ''],
                  ['Lifestyle > Mode', 'Mode', 'interests']
                ]
                const ws = XLSX.utils.aoa_to_sheet(template)
                const wb = XLSX.utils.book_new()
                XLSX.utils.book_append_sheet(wb, ws, 'Template')
                XLSX.writeFile(wb, 'categories-template.xlsx')
              }}
            >
              📥 Télécharger template
            </Button>
          </div>

          {uploading && uploadProgress && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Import en cours...</span>
                <span>{uploadProgress.current}/{uploadProgress.total}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-green-50 text-green-700 rounded-md border border-green-200">
              {successMessage}
            </div>
          )}
        </div>
      </div>

      {/* Séparateur */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">Ou ajouter manuellement</span>
        </div>
      </div>

      {/* Formulaire d'ajout manuel existant */}
      <form onSubmit={handleAdd} className="space-y-4">
        <div>
          <label className="block font-medium mb-1">Nom de la catégorie</label>
          <Input value={name} onChange={e => setName(e.target.value)} required placeholder="Nom" />
        </div>
        <div>
          <label className="block font-medium mb-1">Paths</label>
          {paths.map((path, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <Input value={path} onChange={e => handlePathChange(i, e.target.value)} required placeholder={`Path #${i+1}`} />
              {paths.length > 1 && <Button type="button" variant="destructive" size="icon" onClick={() => removePath(i)}>-</Button>}
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addPath}>Ajouter un path</Button>
        </div>
        <div>
          <label className="block font-medium mb-1">Critères AND (optionnel)</label>
          {andCriteria.map((crit, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <Input value={crit} onChange={e => handleAndChange(i, e.target.value)} placeholder={`Critère #${i+1}`} />
              <Button type="button" variant="destructive" size="icon" onClick={() => removeAnd(i)}>-</Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addAnd}>Ajouter un critère</Button>
        </div>
        {error && <div className="text-red-500 text-xs mt-1">{error}</div>}
        {successMessage && (
          <div className="p-3 bg-green-50 text-green-700 rounded-md border border-green-200 text-sm">
            {successMessage}
          </div>
        )}
        <Button type="submit" disabled={adding || !name || !paths.filter(Boolean).length}>
          {adding ? 'Ajout...' : 'Ajouter la catégorie'}
        </Button>
      </form>

      <div>
        <h2 className="text-lg font-semibold mb-4">Catégories de la liste</h2>
        
        {/* Sélection groupée */}
        {selectedItems.size > 0 && (
          <div className="mb-4">
            <DeleteConfirmModal
              title={`Supprimer ${selectedItems.size} catégorie(s)`}
              description={`Cette action supprimera définitivement ${selectedItems.size} catégorie(s) sélectionnée(s). Cette action est irréversible.`}
              onConfirm={handleDeleteSelected}
            >
              <Button variant="destructive" size="sm">
                Supprimer la sélection ({selectedItems.size})
              </Button>
            </DeleteConfirmModal>
          </div>
        )}

        {loading ? (
          <div>Chargement...</div>
        ) : categories.length === 0 ? (
          <div>Aucune catégorie.</div>
        ) : (
          <div className="rounded-lg border bg-background w-full">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="w-12 px-3 py-2 text-left font-semibold">
                    <Checkbox
                      checked={selectedItems.size === categories.length}
                      onCheckedChange={toggleSelectAll}
                      aria-label="Sélectionner tout"
                    />
                  </th>
                  <th className="px-3 py-2 text-left font-semibold">Nom</th>
                  <th className="px-3 py-2 text-left font-semibold">Path</th>
                  <th className="px-3 py-2 text-left font-semibold">Critères AND</th>
                  <th className="px-3 py-2 text-left font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <tr key={cat.id} className="border-b last:border-b-0 hover:bg-muted/40">
                    <td className="px-3 py-2 align-middle">
                      <Checkbox
                        checked={selectedItems.has(cat.id)}
                        onCheckedChange={() => toggleSelection(cat.id)}
                        aria-label="Sélectionner la ligne"
                      />
                    </td>
                    <td className="px-3 py-2 align-middle">{cat.name}</td>
                    <td className="px-3 py-2 align-middle">{cat.path}</td>
                    <td className="px-3 py-2 align-middle">{cat.andCriteria?.join(', ')}</td>
                    <td className="px-3 py-2 align-middle">
                      <DeleteConfirmModal
                        title={`Supprimer la catégorie "${cat.name}"`}
                        description="Cette action est irréversible. Cette catégorie sera définitivement supprimée."
                        onConfirm={() => handleDeleteCategory(cat.id, cat.name)}
                        isLoading={deletingId === cat.id}
                      >
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          disabled={deletingId === cat.id}
                        >
                          {deletingId === cat.id ? "Suppression..." : "Supprimer"}
                        </Button>
                      </DeleteConfirmModal>
                      <Button
                        variant="outline"
                        size="sm"
                        className="ml-2"
                        onClick={() => openEditModal(cat)}
                      >
                        Éditer
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal d'édition de catégorie */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Éditer la catégorie</DialogTitle>
            <DialogDescription>Modifiez le nom, le path et les critères AND de la catégorie.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div>
              <label className="block font-medium mb-1">Nom de la catégorie</label>
              <Input value={editName} onChange={e => setEditName(e.target.value)} required placeholder="Nom" />
            </div>
            <div>
              <label className="block font-medium mb-1">Paths</label>
              {editPaths.map((path, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <Input value={path} onChange={e => handleEditPathChange(i, e.target.value)} required placeholder={`Segment #${i+1}`} />
                  {editPaths.length > 1 && <Button type="button" variant="destructive" size="icon" onClick={() => removeEditPath(i)}>-</Button>}
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addEditPath}>Ajouter un segment</Button>
            </div>
            <div>
              <label className="block font-medium mb-1">Critères AND (optionnel)</label>
              {editAndCriteria.map((crit, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <Input value={crit} onChange={e => handleEditAndChange(i, e.target.value)} placeholder={`Critère #${i+1}`} />
                  <Button type="button" variant="destructive" size="icon" onClick={() => removeEditAnd(i)}>-</Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addEditAnd}>Ajouter un critère</Button>
            </div>
            {editError && <div className="text-red-500 text-xs mt-1">{editError}</div>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeEditModal} disabled={editLoading}>Annuler</Button>
              <Button type="submit" disabled={editLoading || !editName || !editPaths.filter(Boolean).length}>
                {editLoading ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
} 