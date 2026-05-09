import { CommodityListContent } from "./commodity-list-content";

type CommodityListPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = "force-dynamic";

export default async function CommodityListPage({
  searchParams
}: CommodityListPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  return <CommodityListContent searchParams={resolvedSearchParams} />;
}
