import { ClientFicha } from "@/components/coach/ClientFicha";
export default function Page({ params }: { params: { id: string } }) { return <ClientFicha id={params.id} />; }
