import { StubPage } from "@/components/static/StubPage";

export function generateStaticParams() {
  return [{ id: "_" }];
}

export const dynamicParams = false;

export default function Page() {
  return <StubPage title="Event" />;
}
