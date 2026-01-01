import { getNombresProducto, getCategoriasProducto, getUnidadesMedida } from "@/app/actions/configuracion"
import { getFincas } from "@/app/actions/fincas"
import { ProductoForm } from "@/components/forms/ProductoForm"

export const dynamic = 'force-dynamic'

export default async function NewProductoPage() {
    const nombresRes = await getNombresProducto()
    const categoriasRes = await getCategoriasProducto()
    const unidadesRes = await getUnidadesMedida()
    const fincasRes = await getFincas()

    const nombres = nombresRes.data || []
    const categorias = categoriasRes.data || []
    const unidades = unidadesRes.data || []
    const fincas = fincasRes.data || []

    return <ProductoForm nombres={nombres} categorias={categorias} unidades={unidades} fincas={fincas} />
}
