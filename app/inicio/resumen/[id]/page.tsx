import { WeekReportPage } from "@/components/portal/WeekReportPage";
export default function Page({ params }: { params: { id: string } }) { return <WeekReportPage id={params.id} />; }
