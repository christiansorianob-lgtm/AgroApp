import { redirect } from "next/navigation"
import { getSesion } from "@/lib/auth"
import { inicioDe } from "@/lib/sesion"
import { LoginForm } from "./LoginForm"

export const metadata = { title: "Ingresar · AgroApp" }

export default async function LoginPage(props: { searchParams: Promise<{ next?: string }> }) {
    const sesion = await getSesion()
    if (sesion) redirect(inicioDe(sesion.rol))
    const { next } = await props.searchParams
    return <LoginForm next={next ?? ""} />
}
