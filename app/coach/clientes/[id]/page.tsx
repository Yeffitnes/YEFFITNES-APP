import { ClientFicha } from "@/components/coach/ClientFicha";
// ?tab=Entrenamiento abre la ficha directo en esa pestaña (desde "Necesitan tu atención" y las sugerencias de peso).
export default function Page({ params, searchParams }: { params: { id: string }; searchParams: { tab?: string } }) { return <ClientFicha id={params.id} tab={searchParams.tab} />; }
