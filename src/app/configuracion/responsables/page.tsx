"use client"

import { useState, useEffect } from "react"
import {
    getResponsables, createResponsable, updateResponsable, deleteResponsable,
    getCargos, createCargo, deleteCargo
} from "@/app/actions/configuracion"
import { ResponsablesManager } from "@/components/forms/ResponsablesManager"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function ResponsablesPage() {
    const [responsables, setResponsables] = useState<any[]>([])
    const [cargos, setCargos] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)

    const loadData = async () => {
        setIsLoading(true)
        const [resResponsables, resCargos] = await Promise.all([
            getResponsables(),
            getCargos()
        ])

        if (resResponsables.data) setResponsables(resResponsables.data)
        if (resCargos.data) setCargos(resCargos.data)
        setIsLoading(false)
    }

    const refreshCargos = async () => {
        const res = await getCargos()
        if (res.data) setCargos(res.data)
    }

    useEffect(() => {
        loadData()
    }, [])

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/configuracion">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold text-primary">Responsables</h1>
                    <p className="text-muted-foreground">Gestión del personal</p>
                </div>
            </div>

            <div className="bg-card rounded-xl border shadow-sm p-2">
                <ResponsablesManager
                    responsables={responsables}
                    cargos={cargos}
                    createAction={createResponsable}
                    updateAction={updateResponsable}
                    deleteAction={deleteResponsable}
                    createCargoAction={createCargo}
                    deleteCargoAction={deleteCargo}
                    onRefreshCargos={refreshCargos}
                    onSuccess={loadData}
                />
            </div>
        </div>
    )
}
