'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Upload, X, Image as ImageIcon, Loader2, Star } from 'lucide-react'
import Image from 'next/image'

interface FincaImageUploaderProps {
    logo?: string | null
    fotos?: string[] | null
    onLogoChange: (url: string | null) => void
    onFotosChange: (urls: string[]) => void
    disabled?: boolean
}

export function FincaImageUploader({
    logo,
    fotos = [],
    onLogoChange,
    onFotosChange,
    disabled = false
}: FincaImageUploaderProps) {
    const [uploadingLogo, setUploadingLogo] = useState(false)
    const [uploadingFoto, setUploadingFoto] = useState(false)
    const logoInputRef = useRef<HTMLInputElement>(null)
    const fotosInputRef = useRef<HTMLInputElement>(null)

    const uploadFile = async (file: File): Promise<string> => {
        const fd = new FormData()
        fd.append('file', file)
        const res = await fetch('/api/upload', { method: 'POST', body: fd })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Error al subir imagen')
        return data.url
    }

    const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        try {
            setUploadingLogo(true)
            const url = await uploadFile(file)
            onLogoChange(url)
        } catch (err: any) {
            alert(err.message)
        } finally {
            setUploadingLogo(false)
            if (logoInputRef.current) logoInputRef.current.value = ''
        }
    }

    const handleFotosChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || [])
        if (!files.length) return
        try {
            setUploadingFoto(true)
            const urls = await Promise.all(files.map(uploadFile))
            onFotosChange([...(fotos || []), ...urls])
        } catch (err: any) {
            alert(err.message)
        } finally {
            setUploadingFoto(false)
            if (fotosInputRef.current) fotosInputRef.current.value = ''
        }
    }

    const removeFoto = (idx: number) => {
        onFotosChange((fotos || []).filter((_, i) => i !== idx))
    }

    return (
        <div className="space-y-6">
            {/* Logo Section */}
            <div className="space-y-3">
                <Label className="text-sm font-semibold flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-500" />
                    Logo de la Finca
                </Label>
                <div className="flex items-center gap-4">
                    {/* Logo Preview */}
                    <div className="relative w-24 h-24 rounded-xl border-2 border-dashed border-border bg-muted/30 flex items-center justify-center overflow-hidden shrink-0">
                        {logo ? (
                            <>
                                <img
                                    src={logo}
                                    alt="Logo de la finca"
                                    className="w-full h-full object-cover"
                                />
                                <button
                                    type="button"
                                    onClick={() => onLogoChange(null)}
                                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-red-600 transition-colors"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </>
                        ) : (
                            <div className="text-center text-muted-foreground">
                                <ImageIcon className="w-8 h-8 mx-auto mb-1 opacity-40" />
                                <span className="text-[10px]">Sin logo</span>
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={uploadingLogo || disabled}
                            onClick={() => logoInputRef.current?.click()}
                        >
                            {uploadingLogo ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Subiendo...</>
                            ) : (
                                <><Upload className="w-4 h-4 mr-2" /> {logo ? 'Cambiar Logo' : 'Subir Logo'}</>
                            )}
                        </Button>
                        <p className="text-xs text-muted-foreground">PNG, JPG o WebP. Máx 5MB.</p>
                        <input
                            ref={logoInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleLogoChange}
                        />
                    </div>
                </div>
            </div>

            {/* Fotos Section */}
            <div className="space-y-3">
                <Label className="text-sm font-semibold flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-primary" />
                    Galería de Fotos
                </Label>

                {/* Photo Grid */}
                {(fotos?.length ?? 0) > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                        {(fotos || []).map((url, idx) => (
                            <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border border-border">
                                <img
                                    src={url}
                                    alt={`Foto ${idx + 1}`}
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <button
                                        type="button"
                                        onClick={() => removeFoto(idx)}
                                        className="bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center hover:bg-red-600"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploadingFoto || disabled}
                    onClick={() => fotosInputRef.current?.click()}
                    className="w-full border-dashed"
                >
                    {uploadingFoto ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Subiendo fotos...</>
                    ) : (
                        <><Upload className="w-4 h-4 mr-2" /> Agregar Fotos de la Finca</>
                    )}
                </Button>
                <p className="text-xs text-muted-foreground">Puede seleccionar múltiples imágenes. PNG, JPG o WebP. Máx 5MB c/u.</p>
                <input
                    ref={fotosInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleFotosChange}
                />
            </div>
        </div>
    )
}
